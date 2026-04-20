/**
 * POST /api/webhooks/instantly?type=<event_type>
 *
 * Receives webhook events from Instantly.ai (cold email automation).
 *
 * Behavior (per 2026-04-14 Slack redesign):
 *   1. Every event is normalized + persisted to Supabase `instantly_events`
 *      so the daily/weekly cron jobs can aggregate.
 *   2. Per-event Slack pings ONLY for the "customer reaction" events —
 *      reply, bounce, unsubscribe, click, campaign_completed.
 *   3. Aggregated-only events (email_sent, email_opened) are stored but
 *      NOT pinged. The daily cron at /api/cron/slack-daily-summary emits
 *      one consolidated message per day.
 *
 * Auth: shared-secret via `?secret=...` query param OR `x-webhook-secret`
 *       header matching INSTANTLY_WEBHOOK_SECRET. If the env var is unset,
 *       we soft-launch (accept but log the mismatch) so we can cut over
 *       without a race. Still returns `{ ok: true }` even on auth miss so
 *       Instantly doesn't retry-storm.
 *
 * Bug history: prior version extracted lead/campaign via helper functions
 * but then passed the raw payload unchanged to notifySlack — formatters
 * looked for `p.lead` while Instantly sends `p.lead_email`, so Slack
 * messages showed "—" for every field. Fixed by building a normalized
 * payload object and passing THAT to notifySlack.
 *
 * Runtime: nodejs.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { notifySlack, type NotificationType } from "@/lib/notifications/slack";

export const runtime = "nodejs";

// ─── Known Instantly event types → our NotificationType map ─────────────

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

// Events that trigger immediate Slack — customer reactions only.
// email_sent / email_opened are aggregated into the daily summary instead.
const IMMEDIATE_SLACK_TYPES = new Set<NotificationType>([
  "instantly_reply",
  "instantly_email_bounced",
  "instantly_unsubscribed",
  "instantly_email_clicked",
  "instantly_campaign_completed",
]);

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
  // Try top-level — lead_email is what Instantly actually sends
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

function extractReplyText(body: Record<string, unknown>): string | undefined {
  // Instantly's reply payload may embed the text under different keys depending
  // on event variant. Try top-level first, then nested under reply/email.
  const direct = pickString(body, [
    "reply_text",
    "reply_body",
    "reply_text_snippet",
    "text",
    "body",
    "message",
    "plain_text",
  ]);
  if (direct) return direct;

  const nested =
    pickObject(body, ["reply", "email", "message"]) ||
    (pickObject(body, ["data"])?.reply as Record<string, unknown> | undefined);
  if (nested) {
    return pickString(nested, [
      "text",
      "body",
      "plain_text",
      "snippet",
      "content",
    ]);
  }
  return undefined;
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

function extractStats(
  body: Record<string, unknown>,
): Record<string, unknown> | undefined {
  // Campaign-completion payloads usually carry aggregate counts.
  const stats = pickObject(body, ["stats", "summary", "metrics"]);
  if (stats) return stats;
  // Fall back: flatten top-level count-ish fields if present.
  const counts: Record<string, unknown> = {};
  for (const k of ["sent", "opened", "clicked", "bounced", "replied"]) {
    if (k in body) counts[k] = body[k];
  }
  return Object.keys(counts).length > 0 ? counts : undefined;
}

// ─── Auth ────────────────────────────────────────────────────────────────

function checkAuth(request: NextRequest): { ok: boolean; reason: string } {
  const expected = process.env.INSTANTLY_WEBHOOK_SECRET?.trim();
  if (!expected) {
    return { ok: true, reason: "soft_launch_no_secret" };
  }
  const qp = request.nextUrl.searchParams.get("secret")?.trim();
  const header = request.headers.get("x-webhook-secret")?.trim();
  if (qp === expected || header === expected) {
    return { ok: true, reason: "authed" };
  }
  return { ok: false, reason: "bad_secret" };
}

// ─── Supabase logger ────────────────────────────────────────────────────

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function logEvent(row: {
  event_type: string;
  lead_email?: string;
  campaign?: string;
  step?: string;
  subject?: string;
  reason?: string;
  url?: string;
  stats?: Record<string, unknown> | null;
  raw: Record<string, unknown>;
}) {
  const supabase = getSupabase();
  if (!supabase) {
    console.warn(
      "[instantly-webhook] supabase env missing — event not persisted",
    );
    return;
  }
  const { error } = await supabase.from("instantly_events").insert({
    event_type: row.event_type,
    lead_email: row.lead_email ?? null,
    campaign: row.campaign ?? null,
    step: row.step ?? null,
    subject: row.subject ?? null,
    reason: row.reason ?? null,
    url: row.url ?? null,
    stats: row.stats ?? null,
    raw: row.raw,
  });
  if (error) {
    console.warn("[instantly-webhook] supabase insert failed:", error.message);
  }
}

// ─── Handler ─────────────────────────────────────────────────────────────

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

  const typeParam =
    request.nextUrl.searchParams.get("type")?.trim() ||
    pickString(body, ["event_type", "event", "type"]) ||
    "";

  const normalized = typeParam.toLowerCase().replace(/[\s-]/g, "_");
  const slackType = EVENT_MAP[normalized];

  // Always persist the raw event — even if we don't recognize it, so we
  // can triage unknown types later.
  const lead = extractLead(body);
  const campaign = extractCampaign(body);
  const step = extractStep(body);
  const subject = extractSubject(body);
  const reason = extractBounceReason(body);
  const url = extractClickedUrl(body);
  const stats = extractStats(body);
  const replyText = extractReplyText(body);

  await logEvent({
    event_type: slackType || `unknown:${normalized}` || "unknown",
    lead_email: lead,
    campaign,
    step,
    subject,
    reason,
    url,
    stats: stats ?? null,
    raw: body,
  });

  if (!slackType) {
    console.warn(
      `[instantly-webhook] unknown event type: "${typeParam}" (normalized: "${normalized}")`,
    );
    return NextResponse.json({
      ok: true,
      handled: false,
      reason: "unknown_type",
    });
  }

  // Only customer-reaction events trigger per-event Slack.
  // Sent/opened are aggregated into the daily summary cron.
  if (!IMMEDIATE_SLACK_TYPES.has(slackType)) {
    return NextResponse.json({
      ok: true,
      handled: true,
      type: slackType,
      slack: "aggregated_only",
    });
  }

  // Build the normalized payload (fixes the pre-2026-04-14 bug where
  // raw body was passed to formatters expecting .lead but Instantly
  // sent .lead_email).
  const payload: Record<string, unknown> = {
    lead: lead ?? "—",
    campaign: campaign ?? "—",
    step: step ?? "—",
    subject: subject ?? "—",
    reason: reason ?? "—",
    url: url ?? "—",
    stats: stats
      ? JSON.stringify(stats).slice(0, 500)
      : "—",
    replyText: replyText ?? undefined,
  };

  void notifySlack(slackType, payload).catch(() => {});

  return NextResponse.json({
    ok: true,
    handled: true,
    type: slackType,
    slack: "sent",
  });
}

// Healthcheck (Instantly doesn't use GET, but useful when testing).
export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "webhooks/instantly",
    method: "POST required",
  });
}
