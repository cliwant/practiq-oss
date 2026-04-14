/**
 * POST /api/seo/submit — automated SEO submission for the latest sitemap.
 *
 * Triggered in three ways:
 *   1. Post-deploy: manual `curl -X POST -H "x-deploy-secret: $SEO_DEPLOY_SECRET" https://practiq.dev/api/seo/submit`
 *   2. Vercel Cron: once per day to re-ping engines (see vercel.json)
 *   3. Admin: authenticated dashboard "Refresh now" button
 *
 * What it does:
 *   - Fetches our live sitemap.xml
 *   - Submits sitemap to Google Search Console (PUT)
 *   - Calls Google Indexing API on every URL (batched, rate-limited)
 *   - Calls Bing SubmitUrlBatch
 *   - Pings IndexNow (Bing + Yandex + Seznam)
 *   - Logs each engine's response into `seo_submissions` for the dashboard
 *
 * Auth:
 *   - If `x-deploy-secret` header matches SEO_DEPLOY_SECRET env → accepted (CI/CD).
 *   - Else if admin cookie session → accepted (dashboard button).
 *   - Else 401.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { submitSitemap, indexingNotify, SITE_URL } from "@/lib/seo/google-sc";
import { submitUrl as bingSubmitUrl, getUrlSubmissionQuota, submitFeed as bingSubmitFeed } from "@/lib/seo/bing-webmaster";
import { indexNowSubmit } from "@/lib/seo/indexnow";
import { verifySession } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const maxDuration = 60; // seconds — Vercel Hobby cap

const SITEMAP_URL = "https://practiq.dev/sitemap.xml";

interface SubmissionRow {
  engine: string;
  url?: string | null;
  sitemap_url?: string | null;
  status_code: number;
  ok: boolean;
  response_body?: string | null;
}

export async function POST(request: NextRequest) {
  // ───── Auth ─────
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

  // ───── Supabase client for logging ─────
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase =
    supabaseUrl && supabaseKey
      ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
      : null;

  async function log(row: SubmissionRow) {
    if (!supabase) return;
    await supabase.from("seo_submissions").insert(row);
  }

  const summary: Record<string, { ok: boolean; status: number; count?: number }> = {};

  // ───── 1. Fetch sitemap URLs ─────
  let urls: string[] = [];
  try {
    const smRes = await fetch(SITEMAP_URL);
    const xml = await smRes.text();
    const matches = xml.match(/<loc>(https:\/\/practiq\.dev[^<]+)<\/loc>/g) || [];
    urls = matches.map((m) => m.replace(/<\/?loc>/g, ""));
  } catch (e) {
    return NextResponse.json({ error: "sitemap fetch failed: " + (e as Error).message }, { status: 500 });
  }

  if (urls.length === 0) {
    return NextResponse.json({ error: "sitemap had zero URLs" }, { status: 500 });
  }

  // ───── 2. IndexNow (Bing + Yandex + Seznam, one call) ─────
  try {
    const res = await indexNowSubmit([SITE_URL, ...urls]);
    summary.indexnow = { ok: res.ok, status: res.status, count: urls.length + 1 };
    await log({
      engine: "indexnow",
      url: null,
      sitemap_url: SITEMAP_URL,
      status_code: res.status,
      ok: res.ok,
      response_body: res.body || null,
    });
  } catch (e) {
    summary.indexnow = { ok: false, status: 0 };
    await log({
      engine: "indexnow",
      status_code: 0,
      ok: false,
      response_body: (e as Error).message,
    });
  }

  // ───── 3. Google: sitemap submit ─────
  try {
    const res = await submitSitemap(SITEMAP_URL);
    summary.google_sitemap = { ok: res.ok, status: res.status };
    await log({
      engine: "google_sitemap",
      sitemap_url: SITEMAP_URL,
      status_code: res.status,
      ok: res.ok,
      response_body: res.body || null,
    });
  } catch (e) {
    summary.google_sitemap = { ok: false, status: 0 };
    await log({
      engine: "google_sitemap",
      sitemap_url: SITEMAP_URL,
      status_code: 0,
      ok: false,
      response_body: (e as Error).message,
    });
  }

  // ───── 4. Google Indexing API — one call per URL ─────
  //    (200 URL/day quota; cap batch size and track success/fail count)
  const GOOGLE_INDEX_CAP = 100;
  const indexUrls = urls.slice(0, GOOGLE_INDEX_CAP);
  let googleOk = 0;
  let googleFail = 0;
  for (const url of indexUrls) {
    try {
      const r = await indexingNotify(url, "URL_UPDATED");
      if (r.ok) googleOk += 1;
      else googleFail += 1;
      await log({
        engine: "google_indexing",
        url,
        status_code: r.status,
        ok: r.ok,
        response_body: r.body || null,
      });
    } catch (e) {
      googleFail += 1;
      await log({
        engine: "google_indexing",
        url,
        status_code: 0,
        ok: false,
        response_body: (e as Error).message,
      });
    }
  }
  summary.google_indexing = {
    ok: googleFail === 0,
    status: googleOk,
    count: indexUrls.length,
  };

  // ───── 4b. Bing: submit sitemap (feed) so Bing discovers ALL pages ─────
  try {
    const res = await bingSubmitFeed(SITEMAP_URL);
    summary.bing_sitemap = { ok: res.ok, status: res.status };
    await log({
      engine: "bing_sitemap",
      sitemap_url: SITEMAP_URL,
      status_code: res.status,
      ok: res.ok,
      response_body: res.body || null,
    });
  } catch (e) {
    summary.bing_sitemap = { ok: false, status: 0 };
    await log({
      engine: "bing_sitemap",
      sitemap_url: SITEMAP_URL,
      status_code: 0,
      ok: false,
      response_body: (e as Error).message,
    });
  }

  // ───── 5. Bing: check quota, then SubmitUrl for each (respect 99/day) ─────
  let bingOk = 0;
  let bingFail = 0;
  let bingQuotaLeft = 0;
  try {
    const quota = await getUrlSubmissionQuota();
    bingQuotaLeft = quota.daily;
  } catch {
    // Fall back to a conservative cap if quota call fails
    bingQuotaLeft = 10;
  }

  const bingCap = Math.min(bingQuotaLeft, 50); // leave headroom for other calls
  const bingUrls = urls.slice(0, bingCap);
  for (const url of bingUrls) {
    const r = await bingSubmitUrl(url);
    if (r.ok) bingOk += 1;
    else bingFail += 1;
    await log({
      engine: "bing_submit_url",
      url,
      status_code: r.status,
      ok: r.ok,
      response_body: r.body || null,
    });
  }
  summary.bing_submit_url = {
    ok: bingFail === 0,
    status: bingOk,
    count: bingUrls.length,
  };

  return NextResponse.json({
    ok: true,
    total_urls: urls.length,
    summary,
  });
}

// Healthcheck for cron / external pingers.
export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "seo/submit", method: "POST required" });
}
