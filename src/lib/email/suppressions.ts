/**
 * Email deliverability suppression ledger (Wave 16 / P0-05 extension).
 *
 * Sits beside src/lib/email/tracking.ts:
 *
 *   - tracking.ts records every Resend delivery event into
 *     practiq.analytics_events (append-only transport log).
 *
 *   - suppressions.ts maintains the small projection of "recipients we
 *     should not keep alerting on" — written once per address, with
 *     repeat bounces/complaints bumping last_seen_at + bounce_count
 *     instead of creating a new row.
 *
 * The intent is two-fold:
 *
 *   1. **Dedupe Slack** — without this, every send to a known-bad
 *      address fires a Slack ping. recordSuppression() returns
 *      `isFirstAlert=true` only on the FIRST bounce per address, OR
 *      when it's been > 24h since the last alert fired for that row.
 *
 *   2. **Paying-customer escalation** — bounce on a paying customer's
 *      address means we're failing to deliver their welcome / receipt /
 *      reset emails. Caller flips severity to `critical` based on
 *      `isPayingCustomer` returned here.
 *
 * Best-effort writes: if Supabase env is missing or DB is down we
 * return a degraded result (`isFirstAlert=true`, `isPayingCustomer=false`)
 * so the alert pipeline keeps working — better to over-alert than to
 * silently drop bounces.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";

export type SuppressionReason = "bounce" | "complaint";

interface RecordSuppressionInput {
  recipient: string;
  reason: SuppressionReason;
  bounceType?: string | null;
  tag?: string | null;
  messageId?: string | null;
}

export interface RecordSuppressionResult {
  /** True when this is the FIRST alert for this address (or > 24h dedupe). */
  isFirstAlert: boolean;
  /** True when the recipient's lowercased email matches an existing User row OR shares a domain with one. */
  isPayingCustomer: boolean;
  /** Row id when the upsert succeeded; null on degraded paths. */
  rowId: string | null;
  /** True when this row was newly inserted (vs bumped). */
  isNewRow: boolean;
}

interface SuppressionRowSnapshot {
  id: string | null;
  last_slack_at: string | null;
  bounce_count: number;
  complaint_count: number;
  status: string;
}

const SLACK_DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h

function supabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function normalize(recipient: string): { lower: string; domain: string } {
  const lower = recipient.trim().toLowerCase();
  const at = lower.indexOf("@");
  const domain = at >= 0 ? lower.slice(at + 1) : "";
  return { lower, domain };
}

/**
 * Check whether the recipient's email — exact match — already has a
 * User row. We treat any registered (signed-up) user as a paying
 * customer for alert-priority purposes. Workflow_audit / policy_generator
 * one-off submitters land in early_access tables and do NOT trip this.
 *
 * Implementation note: Prisma is the canonical source for User. We
 * also check the recipient's domain as a softer signal — if at least
 * one User exists at the same domain, treat the recipient as
 * paying-customer-adjacent (typical when a firm has multiple seats).
 */
async function isPayingCustomerRecipient(
  lowerRecipient: string,
  domain: string,
): Promise<boolean> {
  try {
    // Exact-match first — cheapest.
    const user = await prisma.user.findUnique({
      where: { email: lowerRecipient },
      select: { id: true },
    });
    if (user) return true;

    // Domain-match second — only count real domains (skip common
    // freemail to avoid false positives).
    if (!domain || isFreemailDomain(domain)) return false;
    const sibling = await prisma.user.findFirst({
      where: { email: { endsWith: `@${domain}` } },
      select: { id: true },
    });
    return Boolean(sibling);
  } catch (err) {
    console.warn("[email-suppressions] paying-customer check failed:", err);
    return false;
  }
}

function isFreemailDomain(domain: string): boolean {
  // Conservative list — covers ~95% of consumer mailbox traffic.
  // Anything else is treated as a firm domain.
  const freemail = new Set([
    "gmail.com",
    "googlemail.com",
    "yahoo.com",
    "ymail.com",
    "outlook.com",
    "hotmail.com",
    "live.com",
    "msn.com",
    "icloud.com",
    "me.com",
    "mac.com",
    "aol.com",
    "proton.me",
    "protonmail.com",
    "pm.me",
    "fastmail.com",
    "zoho.com",
    "duck.com",
  ]);
  return freemail.has(domain);
}

/**
 * Fast suppression-list lookup. True when this recipient has at least
 * one open bounce/complaint row. Callers in send paths can use this to
 * skip sending to known-bad addresses (Wave 17+; currently advisory).
 *
 * Returns false on any error so we never silently block a real send.
 */
export async function isSuppressed(recipient: string): Promise<boolean> {
  const supabase = supabaseClient();
  if (!supabase) return false;
  if (!recipient) return false;
  const { lower } = normalize(recipient);
  try {
    const { data, error } = await supabase
      .schema("practiq")
      .from("email_suppressions")
      .select("id, status")
      .eq("recipient", lower)
      .eq("status", "open")
      .limit(1)
      .maybeSingle();
    if (error) {
      console.warn("[email-suppressions] isSuppressed select failed:", error);
      return false;
    }
    return Boolean(data?.id);
  } catch (err) {
    console.warn("[email-suppressions] isSuppressed exception:", err);
    return false;
  }
}

/**
 * Persist a suppression row (or bump the existing one) and return the
 * dedupe + escalation flags the Slack pipeline needs.
 *
 * Semantics:
 *   - First bounce/complaint per recipient → `isFirstAlert=true`,
 *     row inserted, last_slack_at stamped.
 *   - Repeat within 24h → `isFirstAlert=false`, counters bumped.
 *   - Repeat after 24h → `isFirstAlert=true` (re-fire so ops can
 *     see persistent issues), last_slack_at re-stamped.
 *
 * Degraded path (no Supabase env, DB error): returns
 * `isFirstAlert=true` so Slack still fires — over-alerting is safer
 * than silent drops.
 */
export async function recordSuppression(
  input: RecordSuppressionInput,
): Promise<RecordSuppressionResult> {
  const recipient = (input.recipient ?? "").trim();
  if (!recipient) {
    return {
      isFirstAlert: false,
      isPayingCustomer: false,
      rowId: null,
      isNewRow: false,
    };
  }
  const { lower, domain } = normalize(recipient);

  // Paying-customer check runs in parallel with the DB write — both
  // are independent and both feed the final result.
  const payingPromise = isPayingCustomerRecipient(lower, domain);

  const supabase = supabaseClient();
  if (!supabase) {
    return {
      isFirstAlert: true,
      isPayingCustomer: await payingPromise,
      rowId: null,
      isNewRow: true,
    };
  }

  try {
    const existing = await fetchExisting(supabase, lower);
    if (existing?.id) {
      return await bumpExisting(supabase, existing, input, await payingPromise);
    }
    return await insertNew(
      supabase,
      lower,
      domain,
      input,
      await payingPromise,
    );
  } catch (err) {
    console.warn("[email-suppressions] recordSuppression exception:", err);
    return {
      isFirstAlert: true,
      isPayingCustomer: await payingPromise,
      rowId: null,
      isNewRow: true,
    };
  }
}

async function fetchExisting(
  supabase: SupabaseClient,
  lower: string,
): Promise<SuppressionRowSnapshot | null> {
  const { data, error } = await supabase
    .schema("practiq")
    .from("email_suppressions")
    .select("id, last_slack_at, bounce_count, complaint_count, status")
    .eq("recipient", lower)
    .limit(1)
    .maybeSingle();
  if (error) {
    console.warn("[email-suppressions] select existing failed:", error);
    return null;
  }
  return (data as SuppressionRowSnapshot | null) ?? null;
}

async function bumpExisting(
  supabase: SupabaseClient,
  row: SuppressionRowSnapshot,
  input: RecordSuppressionInput,
  isPayingCustomer: boolean,
): Promise<RecordSuppressionResult> {
  const now = Date.now();
  const lastSlackMs = row.last_slack_at
    ? new Date(row.last_slack_at).getTime()
    : null;
  const beyondDedupeWindow =
    lastSlackMs === null || now - lastSlackMs > SLACK_DEDUPE_WINDOW_MS;
  // We re-fire when:
  //   - This is a complaint (always — sender-reputation risk overrides dedupe)
  //   - OR > 24h since last_slack_at (persistent issue)
  const isComplaint = input.reason === "complaint";
  const isFirstAlert = isComplaint || beyondDedupeWindow;

  const update: Record<string, unknown> = {
    last_seen_at: new Date().toISOString(),
    last_tag: input.tag ?? null,
    last_message_id: input.messageId ?? null,
    bounce_type: input.bounceType ?? null,
    is_paying_customer: isPayingCustomer,
    // status STAYS 'open' on bump — only the operator resolves
    // (via the admin UI's "mark resolved" action).
    status: row.status === "resolved" ? "open" : row.status,
  };
  if (input.reason === "bounce") {
    update.bounce_count = row.bounce_count + 1;
  } else {
    update.complaint_count = row.complaint_count + 1;
    // Once a complaint is recorded, reason on the row reflects the
    // worst-known outcome.
    update.reason = "complaint";
  }
  if (isFirstAlert) {
    update.last_slack_at = new Date().toISOString();
  }

  const { error } = await supabase
    .schema("practiq")
    .from("email_suppressions")
    .update(update)
    .eq("id", row.id!);
  if (error) {
    console.warn("[email-suppressions] update failed:", error);
  }
  return {
    isFirstAlert,
    isPayingCustomer,
    rowId: row.id,
    isNewRow: false,
  };
}

async function insertNew(
  supabase: SupabaseClient,
  lower: string,
  domain: string,
  input: RecordSuppressionInput,
  isPayingCustomer: boolean,
): Promise<RecordSuppressionResult> {
  const nowIso = new Date().toISOString();
  const insert = await supabase
    .schema("practiq")
    .from("email_suppressions")
    .insert({
      recipient: lower,
      recipient_domain: domain,
      reason: input.reason,
      bounce_type: input.bounceType ?? null,
      last_tag: input.tag ?? null,
      last_message_id: input.messageId ?? null,
      bounce_count: input.reason === "bounce" ? 1 : 0,
      complaint_count: input.reason === "complaint" ? 1 : 0,
      is_paying_customer: isPayingCustomer,
      status: "open",
      first_seen_at: nowIso,
      last_seen_at: nowIso,
      last_slack_at: nowIso,
    })
    .select("id")
    .maybeSingle();
  if (insert.error) {
    // UNIQUE constraint race — another concurrent recordSuppression
    // beat us. Fall through to bump.
    if (insert.error.code === "23505") {
      const fresh = await fetchExisting(supabase, lower);
      if (fresh) {
        return await bumpExisting(supabase, fresh, input, isPayingCustomer);
      }
    }
    console.warn("[email-suppressions] insert failed:", insert.error);
    return {
      isFirstAlert: true,
      isPayingCustomer,
      rowId: null,
      isNewRow: true,
    };
  }
  return {
    isFirstAlert: true,
    isPayingCustomer,
    rowId: (insert.data?.id as string | undefined) ?? null,
    isNewRow: true,
  };
}

/**
 * Operator action — mark a suppression row resolved (manual triage
 * complete; future sends to this address should reset alerting). Used
 * by /admin/incidents/email-deliverability resolve action.
 */
export async function markSuppressionResolved(rowId: string): Promise<boolean> {
  const supabase = supabaseClient();
  if (!supabase || !rowId) return false;
  try {
    const { error } = await supabase
      .schema("practiq")
      .from("email_suppressions")
      .update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
      })
      .eq("id", rowId);
    if (error) {
      console.warn("[email-suppressions] resolve failed:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[email-suppressions] resolve exception:", err);
    return false;
  }
}
