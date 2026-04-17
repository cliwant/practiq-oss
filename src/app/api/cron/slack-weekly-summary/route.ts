/**
 * Vercel Cron — weekly Slack summary for SEO submissions.
 *
 * Schedule: Mondays (see vercel.json — 00:07 UTC Monday ≈ 09:07 KST Monday).
 * Reads the last 7 days of `seo_submissions` from Supabase, groups by
 * engine + status, and posts a single Slack message with totals.
 * Per-run failures are already pinged by /api/seo/submit (threshold 10%)
 * so this is the positive / summary signal replacing per-run success pings.
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

interface SeoSubmissionRow {
  engine: string;
  ok: boolean;
  url: string | null;
  sitemap_url: string | null;
  submitted_at?: string;
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

  const windowStart = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data, error } = await supabase
    .from("seo_submissions")
    .select("engine, ok, url, sitemap_url, submitted_at")
    .gte("submitted_at", windowStart);

  if (error) {
    return NextResponse.json(
      { error: "supabase query failed: " + error.message },
      { status: 500 },
    );
  }

  const rows = (data as SeoSubmissionRow[]) || [];

  // Per-engine tallies
  let googleOk = 0;
  let googleFail = 0;
  let bingOk = 0;
  let bingFail = 0;
  let indexnowOk = 0;
  let indexnowFail = 0;

  for (const r of rows) {
    const isGoogle =
      r.engine === "google_indexing" || r.engine === "google_sitemap";
    const isBing =
      r.engine === "bing_submit_url" || r.engine === "bing_sitemap";
    const isIndexNow = r.engine === "indexnow";

    if (isGoogle) {
      r.ok ? (googleOk += 1) : (googleFail += 1);
    } else if (isBing) {
      r.ok ? (bingOk += 1) : (bingFail += 1);
    } else if (isIndexNow) {
      r.ok ? (indexnowOk += 1) : (indexnowFail += 1);
    }
  }

  // "Runs" is a rough proxy — count distinct days with submissions.
  const runDays = new Set<string>();
  for (const r of rows) {
    if (r.submitted_at) runDays.add(r.submitted_at.slice(0, 10));
  }

  // Nothing happened this week — still post (weekly cadence is expected
  // signal, silence would be ambiguous).
  await notifySlack("seo_weekly_summary", {
    window: "최근 7일",
    runs: runDays.size,
    total_urls: rows.length,
    google_ok: googleOk,
    google_fail: googleFail,
    bing_ok: bingOk,
    bing_fail: bingFail,
    indexnow_ok: indexnowOk,
    indexnow_fail: indexnowFail,
  });

  return NextResponse.json({
    ok: true,
    window_start: windowStart,
    runs: runDays.size,
    total_urls: rows.length,
    google_ok: googleOk,
    google_fail: googleFail,
    bing_ok: bingOk,
    bing_fail: bingFail,
    indexnow_ok: indexnowOk,
    indexnow_fail: indexnowFail,
  });
}

export const GET = runCron;
export const POST = runCron;
