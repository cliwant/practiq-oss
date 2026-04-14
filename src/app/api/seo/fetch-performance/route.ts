/**
 * POST /api/seo/fetch-performance — nightly SEO data harvest.
 *
 * Auth (same as /api/seo/submit):
 *   - x-deploy-secret header matching SEO_DEPLOY_SECRET → CI/CD + Vercel Cron
 *   - else valid admin session cookie → dashboard "Refresh now"
 *
 * What it does:
 *   - For YESTERDAY (Google SC has a ~3 day lag; we still fetch a rolling window):
 *       - Pulls site totals from Google Search Console
 *       - Pulls top queries from GSC
 *       - Pulls top pages from GSC
 *       - Upserts into search_performance / search_queries / search_pages
 *   - Pulls Bing crawl stats, query stats, rank/traffic stats, upserts same.
 *
 * Safe to rerun — upsert on (engine, day) for aggregates, and we simply
 * delete yesterday's rows and re-insert for queries/pages.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { searchAnalytics } from "@/lib/seo/google-sc";
import {
  getCrawlStats,
  getQueryStats,
  getRankAndTrafficStats,
  parseBingDate,
} from "@/lib/seo/bing-webmaster";
import { verifySession } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const maxDuration = 60;

function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

export async function POST(request: NextRequest) {
  const deploySecret = request.headers.get("x-deploy-secret")?.trim();
  const expectedSecret = process.env.SEO_DEPLOY_SECRET?.trim();
  const secretMatches = expectedSecret && deploySecret === expectedSecret;

  if (!secretMatches) {
    const cookie = request.cookies.get("practiq_admin_session")?.value;
    const session = await verifySession(cookie);
    if (!session) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "supabase env missing" }, { status: 500 });
  }
  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  const summary: Record<string, unknown> = {};

  // ───── Google Search Console ─────
  // Window: yesterday to 3 days ago (GSC has ~3 day lag)
  const endDate = daysAgo(2);
  const startDate = daysAgo(10);

  try {
    // Site-total rows by date
    const siteByDate = await searchAnalytics({
      startDate,
      endDate,
      dimensions: ["date"],
      rowLimit: 100,
    });
    for (const row of siteByDate) {
      const day = row.keys?.[0];
      if (!day) continue;
      await supabase.from("search_performance").upsert(
        {
          engine: "google",
          day,
          clicks: row.clicks,
          impressions: row.impressions,
          ctr: row.ctr,
          avg_position: row.position,
          queries_count: 0,
          captured_at: new Date().toISOString(),
        },
        { onConflict: "engine,day" }
      );
    }
    summary.google_site_rows = siteByDate.length;

    // Top queries
    const queries = await searchAnalytics({
      startDate: endDate,
      endDate,
      dimensions: ["query"],
      rowLimit: 1000,
    });
    if (queries.length) {
      // Replace yesterday's rows
      await supabase.from("search_queries").delete().eq("engine", "google").eq("day", endDate);
      const rows = queries.map((r) => ({
        engine: "google",
        day: endDate,
        query: r.keys?.[0] ?? "",
        clicks: r.clicks,
        impressions: r.impressions,
        ctr: r.ctr,
        avg_position: r.position,
      }));
      await supabase.from("search_queries").insert(rows);
    }
    summary.google_queries = queries.length;

    // Top pages
    const pages = await searchAnalytics({
      startDate: endDate,
      endDate,
      dimensions: ["page"],
      rowLimit: 1000,
    });
    if (pages.length) {
      await supabase.from("search_pages").delete().eq("engine", "google").eq("day", endDate);
      const rows = pages.map((r) => ({
        engine: "google",
        day: endDate,
        page_url: r.keys?.[0] ?? "",
        clicks: r.clicks,
        impressions: r.impressions,
        ctr: r.ctr,
        avg_position: r.position,
      }));
      await supabase.from("search_pages").insert(rows);
    }
    summary.google_pages = pages.length;
  } catch (e) {
    summary.google_error = (e as Error).message;
  }

  // ───── Bing Webmaster ─────
  try {
    const crawl = await getCrawlStats();
    summary.bing_crawl_rows = crawl.length;

    const rank = await getRankAndTrafficStats();
    // Each entry is per-day aggregate
    for (const r of rank) {
      const d = parseBingDate(r.Date);
      if (!d) continue;
      const day = d.toISOString().slice(0, 10);
      const imps = r.Impressions ?? 0;
      const clicks = r.Clicks ?? 0;
      const ctr = imps > 0 ? clicks / imps : 0;
      await supabase.from("search_performance").upsert(
        {
          engine: "bing",
          day,
          clicks,
          impressions: imps,
          ctr,
          avg_position: r.AvgImpressionPosition ?? r.AvgClickPosition ?? null,
          queries_count: 0,
          captured_at: new Date().toISOString(),
        },
        { onConflict: "engine,day" }
      );
    }
    summary.bing_rank_rows = rank.length;

    const q = await getQueryStats();
    if (q.length) {
      // Bing query stats don't have an explicit date per row — we snapshot under today
      const today = daysAgo(0);
      await supabase.from("search_queries").delete().eq("engine", "bing").eq("day", today);
      const rows = q.map((x) => ({
        engine: "bing",
        day: today,
        query: x.Query ?? "",
        clicks: x.Clicks ?? 0,
        impressions: x.Impressions ?? 0,
        ctr: x.Impressions ? (x.Clicks ?? 0) / x.Impressions : 0,
        avg_position: x.Position ?? x.AvgImpressionPosition ?? null,
      }));
      await supabase.from("search_queries").insert(rows);
    }
    summary.bing_queries = q.length;
  } catch (e) {
    summary.bing_error = (e as Error).message;
  }

  return NextResponse.json({ ok: true, summary });
}

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "seo/fetch-performance", method: "POST required" });
}
