/**
 * Vercel Cron — daily Slack summary for aggregated Instantly events.
 *
 * Schedule: runs once a day (see vercel.json — 03:15 UTC ≈ 12:15 KST).
 * Reads the last 24 hours of `instantly_events` from Supabase, aggregates
 * email_sent / email_opened per campaign, and posts a single Slack message.
 * Reply / bounce / click / unsubscribe events are already pinged per-event
 * by /api/webhooks/instantly so they are intentionally excluded here
 * (summary would double-notify).
 *
 * Auth: Vercel sets `x-vercel-cron` header. Manual runs can pass the deploy
 * secret for testing.
 *
 * Runtime: nodejs (Supabase client + Slack fetch).
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { notifySlack } from "@/lib/notifications/slack";

export const runtime = "nodejs";
export const maxDuration = 30;

interface InstantlyEventRow {
  event_type: string;
  campaign: string | null;
  captured_at: string;
}

async function runCron(request: NextRequest) {
  const isVercelCron = request.headers.get("x-vercel-cron") !== null;
  const secret = process.env.SEO_DEPLOY_SECRET?.trim();
  const passedSecret = request.headers.get("x-deploy-secret")?.trim();
  if (!isVercelCron && !(secret && passedSecret === secret)) {
    return NextResponse.json({ error: "cron-only endpoint" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: "supabase env missing" },
      { status: 500 },
    );
  }
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("instantly_events")
    .select("event_type, campaign, captured_at")
    .gte("captured_at", windowStart);

  if (error) {
    return NextResponse.json(
      { error: "supabase query failed: " + error.message },
      { status: 500 },
    );
  }

  const rows = (data as InstantlyEventRow[]) || [];

  // Overall counts
  let sent = 0;
  let opened = 0;
  let replies = 0;
  let clicks = 0;
  let bounces = 0;
  let unsubscribes = 0;

  // Per-campaign aggregation (sent/opened only — others are per-event already)
  const byCampaign: Record<
    string,
    { sent: number; opened: number }
  > = {};

  for (const r of rows) {
    const campaign = r.campaign ?? "(unknown)";
    switch (r.event_type) {
      case "instantly_email_sent":
        sent += 1;
        byCampaign[campaign] = byCampaign[campaign] ?? { sent: 0, opened: 0 };
        byCampaign[campaign].sent += 1;
        break;
      case "instantly_email_opened":
        opened += 1;
        byCampaign[campaign] = byCampaign[campaign] ?? { sent: 0, opened: 0 };
        byCampaign[campaign].opened += 1;
        break;
      case "instantly_reply":
        replies += 1;
        break;
      case "instantly_email_clicked":
        clicks += 1;
        break;
      case "instantly_email_bounced":
        bounces += 1;
        break;
      case "instantly_unsubscribed":
        unsubscribes += 1;
        break;
    }
  }

  // Skip Slack entirely if nothing happened — no point in noise.
  if (rows.length === 0 || (sent === 0 && opened === 0 && replies === 0)) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "no_activity",
      rows: rows.length,
    });
  }

  await notifySlack("instantly_daily_summary", {
    window: "최근 24시간",
    sent,
    opened,
    replies,
    clicks,
    bounces,
    unsubscribes,
    by_campaign: byCampaign,
  });

  return NextResponse.json({
    ok: true,
    window_start: windowStart,
    rows: rows.length,
    sent,
    opened,
    replies,
    by_campaign: byCampaign,
  });
}

export const GET = runCron;
export const POST = runCron;
