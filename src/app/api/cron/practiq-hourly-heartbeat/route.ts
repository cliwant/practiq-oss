/**
 * Vercel Cron — hourly Practiq outreach heartbeat.
 *
 * Schedule: every hour at :17 (see vercel.json).
 * Purpose: surface last-hour campaign velocity so the operator doesn't have
 * to refresh Instantly to see whether sends are happening.
 *
 * Logic:
 * 1. Query `instantly_events` Supabase table for events captured in last
 *    hour. These are created by /api/webhooks/instantly for every
 *    Instantly event (sent, opened, clicked, replied, bounced, unsubscribed).
 * 2. Fetch current campaign analytics from Instantly API for both
 *    active campaigns (Michigan + Batch 2).
 * 3. Compare to the most recent row in `campaign_snapshots` to compute
 *    hour-over-hour delta.
 * 4. Persist current snapshot.
 * 5. If any events in last hour OR campaign contacted_count increased,
 *    post Slack heartbeat. Otherwise silent (zero activity outside
 *    Detroit 09-17 business hours is expected).
 *
 * Auth: Vercel `x-vercel-cron` header. Manual test via SEO_DEPLOY_SECRET.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { notifySlack } from "@/lib/notifications/slack";

export const runtime = "nodejs";
export const maxDuration = 30;

// Active campaign IDs (hardcoded for simplicity; move to env if more churn).
// 2026-04-20: swapped from the two paused pilot batches (Michigan CPA Batch 1
// + CPA Batch 2 - Nationwide) to the current active+draft v1 campaigns. Old
// campaign_snapshots rows remain in the table untouched — the delta comparator
// just won't update them further.
const CAMPAIGNS = [
  {
    id: "409f337c-bf78-4c49-afb9-977ccc9b161d",
    name: "Practiq CPA v1 (DRAFT)",
  },
  {
    id: "24829397-5ec0-4072-94da-c4a945cb5142",
    name: "Practiq Law v1 (DRAFT)",
  },
];

interface CampaignAnalytics {
  campaign_name?: string;
  leads_count?: number;
  contacted_count?: number;
  emails_sent_count?: number;
  open_count?: number;
  reply_count?: number;
  link_click_count?: number;
  bounced_count?: number;
  unsubscribed_count?: number;
}

async function fetchCampaignAnalytics(
  id: string,
  apiKey: string,
): Promise<CampaignAnalytics | null> {
  try {
    const res = await fetch(
      `https://api.instantly.ai/api/v2/campaigns/analytics?id=${id}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "User-Agent": "practiq-heartbeat/1.0",
        },
      },
    );
    if (!res.ok) return null;
    const arr = (await res.json()) as CampaignAnalytics[];
    return Array.isArray(arr) && arr.length > 0 ? arr[0] : null;
  } catch {
    return null;
  }
}

async function runCron(request: NextRequest) {
  const isVercelCron = request.headers.get("x-vercel-cron") !== null;
  const secret = process.env.SEO_DEPLOY_SECRET?.trim();
  const passedSecret = request.headers.get("x-deploy-secret")?.trim();
  if (!isVercelCron && !(secret && passedSecret === secret)) {
    return NextResponse.json({ error: "cron-only endpoint" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY;
  const instantlyKey = process.env.INSTANTLY_API_KEY;
  if (!supabaseUrl || !supabaseKey || !instantlyKey) {
    return NextResponse.json(
      { error: "required env missing" },
      { status: 500 },
    );
  }
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  // ─── 1. Last-hour instantly_events aggregate ──────────────────────────
  const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data: eventRows, error: eventErr } = await supabase
    .from("instantly_events")
    .select("event_type")
    .gte("captured_at", windowStart);

  if (eventErr) {
    return NextResponse.json(
      { error: "instantly_events query failed: " + eventErr.message },
      { status: 500 },
    );
  }

  let sent = 0;
  let opened = 0;
  let clicks = 0;
  let replies = 0;
  let bounces = 0;
  let unsubscribes = 0;
  for (const r of (eventRows as { event_type: string }[]) || []) {
    switch (r.event_type) {
      case "instantly_email_sent":
        sent += 1;
        break;
      case "instantly_email_opened":
        opened += 1;
        break;
      case "instantly_email_clicked":
        clicks += 1;
        break;
      case "instantly_reply":
        replies += 1;
        break;
      case "instantly_email_bounced":
        bounces += 1;
        break;
      case "instantly_unsubscribed":
        unsubscribes += 1;
        break;
    }
  }
  const eventsTotal = eventRows?.length || 0;

  // ─── 2. Current campaign snapshots + delta vs previous ────────────────
  const campaignResults: Array<{
    id: string;
    name: string;
    leads: number;
    contacted: number;
    sent: number;
    delta_contacted: number;
    delta_sent: number;
  }> = [];

  for (const c of CAMPAIGNS) {
    const current = await fetchCampaignAnalytics(c.id, instantlyKey);
    if (!current) continue;

    // Fetch most recent prior snapshot
    const { data: priorRows } = await supabase
      .from("campaign_snapshots")
      .select("contacted_count, emails_sent_count")
      .eq("campaign_id", c.id)
      .order("snapshot_at", { ascending: false })
      .limit(1);

    const prior = priorRows && priorRows[0] ? priorRows[0] : null;
    const curContacted = current.contacted_count ?? 0;
    const curSent = current.emails_sent_count ?? 0;
    const deltaContacted = prior
      ? curContacted - (prior.contacted_count ?? 0)
      : 0;
    const deltaSent = prior ? curSent - (prior.emails_sent_count ?? 0) : 0;

    campaignResults.push({
      id: c.id,
      name: c.name,
      leads: current.leads_count ?? 0,
      contacted: curContacted,
      sent: curSent,
      delta_contacted: Math.max(0, deltaContacted),
      delta_sent: Math.max(0, deltaSent),
    });

    // Persist new snapshot
    await supabase.from("campaign_snapshots").insert({
      campaign_id: c.id,
      campaign_name: c.name,
      leads_count: current.leads_count ?? 0,
      contacted_count: curContacted,
      emails_sent_count: curSent,
      open_count: current.open_count ?? 0,
      reply_count: current.reply_count ?? 0,
      click_count: current.link_click_count ?? 0,
      bounced_count: current.bounced_count ?? 0,
      unsubscribed_count: current.unsubscribed_count ?? 0,
    });
  }

  // ─── 3. Decide whether to ping Slack ─────────────────────────────────
  const anyEvents = eventsTotal > 0;
  const anyCampaignDelta = campaignResults.some(
    (c) => c.delta_contacted > 0 || c.delta_sent > 0,
  );

  if (!anyEvents && !anyCampaignDelta) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "no_activity",
      window_start: windowStart,
      campaigns: campaignResults,
    });
  }

  await notifySlack("practiq_hourly_heartbeat", {
    window: "최근 1시간",
    events_total: eventsTotal,
    sent,
    opened,
    clicks,
    replies,
    bounces,
    unsubscribes,
    campaigns: campaignResults,
  });

  return NextResponse.json({
    ok: true,
    window_start: windowStart,
    events_total: eventsTotal,
    sent,
    opened,
    clicks,
    replies,
    bounces,
    unsubscribes,
    campaigns: campaignResults,
  });
}

export const GET = runCron;
export const POST = runCron;
