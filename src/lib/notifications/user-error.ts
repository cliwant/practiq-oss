/**
 * User-facing error reporting helper.
 *
 * Goal: when a real visitor hits an error on a production surface (the
 * workflow audit form, the policy generator, the early-access waitlist,
 * a critical client-side JS error, etc.), the operator gets a Slack
 * notification with enough context to triage in under 30 seconds —
 * without opening Vercel logs.
 *
 * Pipeline:
 *   1. Fingerprint the error (surface + endpoint + first 100 chars of
 *      message + step) so the same bug doesn't spam Slack 50× when 50
 *      different visitors hit it in the same hour.
 *   2. Upsert into `practiq.user_errors` — first time we see a
 *      fingerprint we insert; subsequent occurrences bump
 *      `occurrence_count` and `last_seen_at`.
 *   3. Decide severity (5xx → critical, 4xx + client critical →
 *      warning, 429 rate limit → info).
 *   4. Decide whether to fire Slack:
 *        - 5xx (critical) → ALWAYS fire (never deduped)
 *        - warning → 60-minute dedupe window (per fingerprint)
 *        - info (429) → 24-hour dedupe window
 *      The `last_slack_at` column on the row tracks when we last
 *      pinged Slack so dedupe survives serverless cold starts (cannot
 *      use in-memory dedupe — Vercel functions are isolated).
 *   5. PII handling — Slack payload contains masked email
 *      (`j***@example.com`) and request-body *shape* (field names
 *      only). The full data lives in Supabase for the operator's later
 *      query (covered by the privacy policy 2-year retention
 *      disclosure).
 *
 * All steps are best-effort: this helper must never throw — analytics
 * + notification failures should never make a user-facing error worse
 * than it already is.
 */

import { createHash, createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import {
  safeNotify,
  type NotificationType,
  type Severity,
} from "@/lib/notifications/slack";

const ADMIN_HOST = "https://admin.grindworks.ai";

const SURFACE_LINKS: Record<string, string> = {
  "workflow-audit": "https://practiq.dev/workflow-audit",
  "policy-generator": "https://practiq.dev/tools/ai-policy-generator",
  "early-access": "https://practiq.dev/",
  "stripe-checkout": "https://practiq.dev/pricing",
  "blog-cms": "https://practiq.dev/blog",
  "client-js": "",
  other: "",
};

export type UserErrorSurface =
  | "workflow-audit"
  | "policy-generator"
  | "early-access"
  | "stripe-checkout"
  | "blog-cms"
  | "client-js"
  | "other";

export interface UserErrorContext {
  surface: UserErrorSurface;
  /** e.g. "POST /api/workflow-audit/generate" — kept stable for fingerprint. */
  endpoint?: string;
  /** HTTP status code if applicable. */
  status?: number;
  /** Short single-line summary. Stack head goes in errorStack. */
  errorMessage: string;
  /** First ~5 lines of stack trace. */
  errorStack?: string;
  /** Sanitized user context — emails are masked before this is passed in or by us. */
  userContext?: {
    email?: string | null;
    ip_country?: string | null;
    user_agent?: string | null;
    distinctId?: string | null;
  };
  /** Sanitized request body — never includes PII fields. */
  requestBody?: Record<string, unknown> | null;
  /** Sub-step within the surface — e.g. "LLM call" / "DB insert" / "PDF render". */
  stepIfApplicable?: string;
}

// ─── Severity policy ────────────────────────────────────────────────────

function severityForStatus(status: number | undefined): Severity {
  if (typeof status !== "number") return "warning";
  if (status >= 500) return "critical";
  if (status === 429) return "info";
  if (status >= 400) return "warning";
  return "warning";
}

function dedupeWindowMs(severity: Severity): number {
  if (severity === "critical") return 0; // never dedupe 5xx
  if (severity === "info") return 24 * 60 * 60 * 1000;
  return 60 * 60 * 1000; // warning default — 60 min
}

// ─── Fingerprint + sanitization ─────────────────────────────────────────

function computeFingerprint(ctx: UserErrorContext): string {
  const seed = [
    ctx.surface,
    ctx.endpoint ?? "",
    (ctx.errorMessage ?? "").slice(0, 100),
    ctx.stepIfApplicable ?? "",
  ].join("|");
  return createHash("sha256").update(seed).digest("hex").slice(0, 32);
}

const PII_FIELD_NAMES = new Set([
  "email",
  "password",
  "name",
  "first_name",
  "last_name",
  "firm_name",
  "firmname",
  "workflow_pain",
  "recent_engagement",
  "phone",
  "address",
  "credit_card",
  "card",
  "ssn",
  "contact_name",
]);

/**
 * Strip PII values from a request body, keep only field names that
 * were present (for Slack triage). The raw body is allowed to land in
 * Supabase if the caller passes it through `requestBody`; this helper
 * is for the Slack-side shape summary only.
 */
function summarizeRequestBody(
  body: Record<string, unknown> | null | undefined,
): string {
  if (!body || typeof body !== "object") return "(none)";
  const keys = Object.keys(body);
  if (keys.length === 0) return "(empty)";
  return keys
    .map((k) => (PII_FIELD_NAMES.has(k.toLowerCase()) ? `${k}=<redacted>` : k))
    .join(", ");
}

function sanitizeRequestBodyForStorage(
  body: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!body || typeof body !== "object") return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (PII_FIELD_NAMES.has(k.toLowerCase())) {
      out[k] = "<redacted>";
    } else if (typeof v === "string") {
      // Cap long strings so the row doesn't bloat.
      out[k] = v.length > 500 ? v.slice(0, 500) + "…" : v;
    } else if (
      v === null ||
      typeof v === "number" ||
      typeof v === "boolean"
    ) {
      out[k] = v;
    } else if (Array.isArray(v)) {
      out[k] = `<array(${v.length})>`;
    } else if (typeof v === "object") {
      out[k] = "<object>";
    } else {
      out[k] = String(v);
    }
  }
  return out;
}

function maskEmail(email: string | null | undefined): string {
  if (!email) return "(anonymous)";
  const trimmed = email.trim();
  const at = trimmed.indexOf("@");
  if (at <= 0) return "(masked)";
  return `${trimmed[0]}***${trimmed.slice(at)}`;
}

function shortUserAgent(ua: string | null | undefined): string {
  if (!ua) return "(unknown)";
  // Extract a browser/OS hint without leaking full UA.
  const browser =
    /Chrome\/([0-9]+)/.exec(ua)?.[0] ??
    /Firefox\/([0-9]+)/.exec(ua)?.[0] ??
    /Safari\/([0-9]+)/.exec(ua)?.[0] ??
    /Edg\/([0-9]+)/.exec(ua)?.[0] ??
    ua.slice(0, 40);
  return browser;
}

function stackHead(stack: string | undefined, lines = 5): string {
  if (!stack) return "";
  return stack.split("\n").slice(0, lines).join("\n").slice(0, 1200);
}

// ─── Supabase upsert (idempotent on fingerprint) ────────────────────────

function supabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

interface UpsertResult {
  rowId: string | null;
  occurrenceCount: number;
  lastSlackAtMs: number | null;
  isNewRow: boolean;
}

async function upsertUserErrorRow(
  ctx: UserErrorContext,
  fingerprint: string,
  severity: Severity,
): Promise<UpsertResult> {
  const supabase = supabaseClient();
  if (!supabase) {
    return {
      rowId: null,
      occurrenceCount: 1,
      lastSlackAtMs: null,
      isNewRow: true,
    };
  }
  try {
    // Look for an existing row first — we need its current
    // last_slack_at + occurrence_count to make the dedupe decision.
    const { data: existing, error: selErr } = await supabase
      .schema("practiq")
      .from("user_errors")
      .select("id, occurrence_count, last_slack_at")
      .eq("fingerprint", fingerprint)
      .order("first_seen_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (selErr) {
      console.warn("[user-error] select existing failed:", selErr);
    }

    if (existing?.id) {
      const update = await supabase
        .schema("practiq")
        .from("user_errors")
        .update({
          occurrence_count: (existing.occurrence_count ?? 1) + 1,
          last_seen_at: new Date().toISOString(),
          // Keep most recent error_message visible if the caller passed
          // a new variation; safe because fingerprint locks the surface
          // shape we care about.
          error_message: ctx.errorMessage.slice(0, 2000),
          error_stack: stackHead(ctx.errorStack),
          status: ctx.status ?? null,
          step: ctx.stepIfApplicable ?? null,
        })
        .eq("id", existing.id);
      if (update.error) {
        console.warn("[user-error] update failed:", update.error);
      }
      return {
        rowId: existing.id as string,
        occurrenceCount: (existing.occurrence_count ?? 1) + 1,
        lastSlackAtMs: existing.last_slack_at
          ? new Date(existing.last_slack_at as string).getTime()
          : null,
        isNewRow: false,
      };
    }

    const insert = await supabase
      .schema("practiq")
      .from("user_errors")
      .insert({
        fingerprint,
        surface: ctx.surface,
        endpoint: ctx.endpoint ?? null,
        status: ctx.status ?? null,
        error_message: ctx.errorMessage.slice(0, 2000),
        error_stack: stackHead(ctx.errorStack),
        user_context: ctx.userContext ?? {},
        request_body: sanitizeRequestBodyForStorage(ctx.requestBody) ?? null,
        step: ctx.stepIfApplicable ?? null,
        severity,
      })
      .select("id")
      .single();
    if (insert.error) {
      console.warn("[user-error] insert failed:", insert.error);
      return {
        rowId: null,
        occurrenceCount: 1,
        lastSlackAtMs: null,
        isNewRow: true,
      };
    }
    return {
      rowId: (insert.data?.id as string) ?? null,
      occurrenceCount: 1,
      lastSlackAtMs: null,
      isNewRow: true,
    };
  } catch (err) {
    console.warn("[user-error] supabase exception:", err);
    return {
      rowId: null,
      occurrenceCount: 1,
      lastSlackAtMs: null,
      isNewRow: true,
    };
  }
}

async function stampSlackSent(rowId: string): Promise<void> {
  const supabase = supabaseClient();
  if (!supabase || !rowId) return;
  try {
    await supabase
      .schema("practiq")
      .from("user_errors")
      .update({ last_slack_at: new Date().toISOString() })
      .eq("id", rowId);
  } catch (err) {
    console.warn("[user-error] last_slack_at stamp failed:", err);
  }
}

// ─── Public entry point ─────────────────────────────────────────────────

export async function reportUserError(ctx: UserErrorContext): Promise<void> {
  try {
    if (!ctx || typeof ctx !== "object") return;
    if (!ctx.errorMessage || typeof ctx.errorMessage !== "string") return;

    const severity = severityForStatus(ctx.status);
    const fingerprint = computeFingerprint(ctx);
    const { rowId, occurrenceCount, lastSlackAtMs, isNewRow } =
      await upsertUserErrorRow(ctx, fingerprint, severity);

    // Decide if we should fire Slack.
    const window = dedupeWindowMs(severity);
    const now = Date.now();
    const withinDedupeWindow =
      window > 0 &&
      lastSlackAtMs !== null &&
      now - lastSlackAtMs < window;
    const shouldFire = severity === "critical" || !withinDedupeWindow;

    if (!shouldFire) {
      // Row counter is bumped; Slack stays quiet.
      return;
    }

    const surfaceLink = SURFACE_LINKS[ctx.surface] ?? "";
    const adminLink = `${ADMIN_HOST}/admin/incidents`;

    const userEmailMasked = maskEmail(ctx.userContext?.email ?? null);
    const userCountry = ctx.userContext?.ip_country ?? "(unknown)";
    const userAgentShort = shortUserAgent(ctx.userContext?.user_agent ?? null);
    const requestBodyShape = summarizeRequestBody(ctx.requestBody ?? null);

    const firstTimeNote = isNewRow
      ? "처음 발견됨."
      : `반복 ${occurrenceCount}회.`;

    safeNotify(
      "user_error_critical",
      {
        surface: ctx.surface,
        endpoint: ctx.endpoint ?? "(n/a)",
        status: ctx.status ?? "(n/a)",
        step: ctx.stepIfApplicable ?? "(n/a)",
        errorMessage: ctx.errorMessage,
        stackHead: stackHead(ctx.errorStack),
        userEmailMasked,
        userCountry,
        userAgentShort,
        requestBodyShape,
        surfaceLink,
        adminLink,
        firstTimeNote,
        severity,
      },
      { severity },
    );

    if (rowId) {
      // Don't await — Slack already fired and stamping is best-effort.
      void stampSlackSent(rowId);
    }
  } catch (err) {
    console.warn("[user-error] reportUserError swallowed:", err);
  }
}

// ─── Internal: shared HMAC for client→server signing ───────────────────
//
// Used by /api/report-user-error to validate the lightweight client
// beacon. The shared secret is the studio's NEXTAUTH_SECRET (already
// rotated through the studio root). This isn't security-grade
// authentication — it's spam mitigation on a public endpoint so
// random bots can't flood the user_errors table.
//
// Kept here, not exported as a separate module, so the helper has a
// single source of truth for both write paths.

export function signClientErrorBeacon(payload: string): string {
  const secret = process.env.NEXTAUTH_SECRET ?? "";
  if (!secret) return "";
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function verifyClientErrorBeacon(
  payload: string,
  signature: string,
): boolean {
  const expected = signClientErrorBeacon(payload);
  if (!expected || !signature) return false;
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}
