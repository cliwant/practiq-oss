/**
 * POST /api/webhooks/instantly?type=<event_type>
 *
 * Receives webhook events from Instantly.ai (cold email automation) and
 * routes them through our unified Slack notifier so every touchpoint
 * shares a formatting vocabulary. Previously Instantly posted directly to
 * the Slack webhook for a subset of events (bounce / opened / reply); now
 * it posts to this endpoint for all interesting events.
 *
 * Auth: shared-secret via `?secret=...` query param OR `x-webhook-secret`
 *       header matching INSTANTLY_WEBHOOK_SECRET. If the env var is unset,
 *       we soft-launch (accept but log the mismatch) so we can cut over
 *       without a race. Still returns `{ ok: true }` even on auth miss so
 *       Instantly doesn't retry-storm.
 *
 * Instantly payload: the shape is not formally documented in our reference
 * materials. We defensively probe a handful of likely field names for each
 * datum (lead email, campaign id, subject, reply content, reason, URL).
 * Missing fields show up as "—" in the Slack message — callers can refine
 * the mapping once we see real payloads.
 *
 * Runtime: nodejs.
 */
import { NextRequest, NextResponse } from "next/server";
import { notifySlack, type NotificationType } from "@/lib/notifications/slack";

export const runtime = "nodejs";

// ─── Known Instantly event types → our NotificationType map ─────────────
//
// Sources: Instantly docs + dashboard event feed. We accept a few likely
// variants per event so the caller has flexibility.

const EVENT_MAP: Record<string, NotificationType> = {
  email_sent: "instantly_email_sent",
  emails_sent: "instantly_email_sent",
  email_opened: "instantly_email_opened",
  email_open: "instantly_email_opened",
  opened: "instantly_email_opened",
  email_link_clicked: "instantly_email_clicked",
  email_click: "instantly_email_clicked",
  link_click: "instantly_email_clicked",
  email_bounced: "instantly_email_bounced",
  bounced: "instantly_email_bounced",
  bounce: "instantly_email_bounced",
  reply_received: "instantly_reply",
  reply: "instantly_reply",
  email_reply: "instantly_reply",
  lead_unsubscribed: "instantly_unsubscribed",
  unsubscribed: "instantly_unsubscribed",
  unsubscribe: "instantly_unsubscribed",
  campaign_completed: "instantly_campaign_completed",
  campaign_finished: "instantly_campaign_completed",
};

// ─── Defensive field extraction ──────────────────────────────────────────

function pickString(
  obj: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim().length > 0) return v;
    if (typeof v === "number") return String(v);
  }
  return undefined;
}

function pickObject(
  obj: Record<string, unknown>,
  keys: string[],
): Record<string, unknown> | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (v && typeof v === "object" && !Array.isArray(v)) {
      return v as Record<string, unknown>;
    }
  }
  return undefined;
}

function extractLead(body: Record<string, unknown>): string | undefined {
  // Try top-level
  const direct = pickString(body, [
    "lead_email",
    "email",
    "lead",
    "recipient",
    "to",
  ]);
  if (direct) return direct;

  // Nested under `lead` / `recipient` / `to`
  const nested =
    pickObject(body, ["lead", "recipient", "to"]) ||
    (pickObject(body, ["data"])?.lead as Record<string, unknown> | undefined);
  if (nested) {
    return pickString(nested, ["email", "address", "lead_email"]);
  }

  return undefined;
}

function extractCampaign(body: Record<string, unknown>): string | undefined {
  const direct = pickString(body, [
    "campaign_name",
    "campaign",
    "campaign_id",
    "sequence_name",
  ]);
  if (direct) return direct;

  const nested = pickObject(body, ["campaign", "sequence"]);
  if (nested) {
    return pickString(nested, ["name", "id", "title"]);
  }

  return undefined;
}

function extractStep(body: Record<string, unknown>): string | undefined {
  return pickString(body, [
    "step",
    "step_number",
    "sequence_step",
    "email_number",
  ]);
}

function extractSubject(body: Record<string, unknown>): string | undefined {
  return pickString(body, ["subject", "email_subject", "reply_subject"]);
}

function extractBounceReason(
  body: Record<string, unknown>,
): string | undefined {
  return pickString(body, [
    "bounce_reason",
    "reason",
    "error",
    "message",
    "description",
  ]);
}

function extractClickedUrl(
  body: Record<string, unknown>,
): string | undefined {
  return pickString(body, ["url", "link", "clicked_url", "href"]);
}

function extractStats(body: Record<string, unknown>): string | undefined {
  // Campaign-completion payloads usually carry aggregate counts.
  const stats = pickObject(body, ["stats", "summary", "metrics"]);
  if (stats) {
    try {
      return JSON.stringify(stats).slice(0, 500);
    } catch {
      return undefined;
    }
  }
  // Fall back: flatten top-level count-ish fields if present.
  const counts: Record<string, unknown> = {};
  for (const k of ["sent", "opened", "clicked", "bounced", "replied"]) {
    if (k in body) counts[k] = body[k];
  }
  if (Object.keys(counts).length > 0) return JSON.stringify(counts);
  return undefined;
}

// ─── Handler ─────────────────────────────────────────────────────────────

function checkAuth(request: NextRequest): { ok: boolean; reason: string } {
  const expected = process.env.INSTANTLY_WEBHOOK_SECRET?.trim();
  if (!expected) {
    // Soft launch: env not set yet. Accept but flag in logs.
    return { ok: true, reason: "soft_launch_no_secret" };
  }
  const qp = request.nextUrl.searchParams.get("secret")?.trim();
  const header = request.headers.get("x-webhook-secret")?.trim();
  if (qp === expected || header === expected) {
    return { ok: true, reason: "authed" };
  }
  return { ok: false, reason: "bad_secret" };
}

export async function POST(request: NextRequest) {
  const auth = checkAuth(request);
  if (!auth.ok) {
    console.warn(
      `[instantly-webhook] auth mismatch — ${auth.reason}. Still returning ok:true to avoid retry storm.`,
    );
    return NextResponse.json({ ok: true, accepted: false });
  }
  if (auth.reason !== "authed") {
    console.warn(`[instantly-webhook] ${auth.reason} — accepting anyway`);
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    console.warn("[instantly-webhook] invalid JSON body");
    return NextResponse.json({ ok: true, accepted: false });
  }

  // Event-type resolution: query param is canonical, but also accept a
  // body field as fallback (Instantly can be configured either way).
  const typeParam =
    request.nextUrl.searchParams.get("type")?.trim() ||
    pickString(body, ["event_type", "event", "type"]) ||
    "";

  const normalized = typeParam.toLowerCase().replace(/[\s-]/g, "_");
  const slackType = EVENT_MAP[normalized];

  if (!slackType) {
    console.warn(
      `[instantly-webhook] unknown event type: "${typeParam}" (normalized: "${normalized}")`,
    );
    return NextResponse.json({ ok: true, handled: false, reason: "unknown_type" });
  }

  // Build a consistent payload across all event types — the formatter
  // will pick the fields it cares about.
  const payload: Record<string, unknown> = {
    lead: extractLead(body) ?? "—",
    campaign: extractCampaign(body) ?? "—",
    step: extractStep(body) ?? "—",
    subject: extractSubject(body) ?? "—",
    reason: extractBounceReason(body) ?? "—",
    url: extractClickedUrl(body) ?? "—",
    stats: extractStats(body) ?? "—",
  };

  // Fire but don't block the response — Instantly expects a quick 200.
  void notifySlack(slackType, payload).catch(() => {});

  return NextResponse.json({ ok: true, handled: true, type: slackType });
}

// Healthcheck (Instantly doesn't use GET, but useful when testing).
export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "webhooks/instantly",
    method: "POST required",
  });
}
