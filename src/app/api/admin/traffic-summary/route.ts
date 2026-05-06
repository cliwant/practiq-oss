/**
 * GET /api/admin/traffic-summary?days=7
 *
 * Aggregates the last N days of traffic + conversion + social + GEO
 * citation signals into one JSON blob the operator can read directly
 * (Slack daily report, future admin dashboard, manual debugging).
 *
 * Auth: admin host + cookie session, same pattern as the rest of /admin.
 * The cron route consumes this via internal fetch; cron uses its own
 * x-deploy-secret check so it bypasses cookie auth.
 *
 * Data sources, in order of trust:
 *   1. practiq.analytics_events (own DB)  — ground truth
 *   2. public.geo_citations (own DB)      — ground truth
 *   3. Vercel Web Analytics REST          — second opinion on PV/visitors
 *   4. Typefully REST                     — social signal (skip if no key)
 *   5. .cycle/state.json signal_target    — cycle trajectory KPI
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/admin-auth";
import fs from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const maxDuration = 30;

const ADMIN_COOKIE = "practiq_admin_session";

interface TrafficSummary {
  window: { start: string; end: string; days: number };
  site: {
    page_views: {
      total: number;
      unique_visitors_estimated: number;
      by_path: Array<{ path: string; count: number }>;
      by_country: Array<{ country: string; count: number }>;
    };
    referrers: {
      top: Array<{ referrer: string; count: number }>;
      by_utm_source: Array<{ utm_source: string; count: number }>;
    };
  };
  conversions: {
    waitlist_signups: { total: number; list: unknown[] };
    product_signups: {
      total: number;
      list_excluding_test_and_operator: Array<{ id: string; email: string; createdAt: string }>;
    };
    newsletter: number;
  };
  vercel_analytics: {
    pageviews: number | null;
    visitors: number | null;
    top_pages: Array<{ path: string; count: number }>;
    top_referrers: Array<{ referrer: string; count: number }>;
    skipped_reason?: string;
  };
  social: {
    typefully: {
      posts_published: number | null;
      impressions_total: number | null;
      engagement_total: number | null;
      by_platform: Record<string, unknown>;
      skipped_reason?: string;
    };
  };
  geo_citations: {
    scans_run: number;
    citations_found: number;
    queries_with_citation: Array<{ query: string; source: string; cited_url: string | null }>;
  };
  cycle_signal: {
    design_partner_conversations: number;
    paying_customers: number;
    product_signups_icp_fit: number;
    trajectory: "KILL" | "ITERATE" | "SCALE" | "UNKNOWN";
  };
}

function isOperatorOrTestEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const e = email.toLowerCase();
  if (
    e.includes("seungdo") ||
    e.includes("keum") ||
    e.includes("cliwant") ||
    e.endsWith("@example.com") ||
    e.endsWith("@test.com")
  )
    return true;
  return false;
}

async function fetchVercelAnalytics(days: number): Promise<TrafficSummary["vercel_analytics"]> {
  const token = process.env.VERCEL_TOKEN?.trim();
  const teamId = process.env.VERCEL_TEAM_ID?.trim();
  const projectId = process.env.VERCEL_PROJECT_ID?.trim();
  if (!token) {
    return {
      pageviews: null,
      visitors: null,
      top_pages: [],
      top_referrers: [],
      skipped_reason: "VERCEL_TOKEN missing",
    };
  }
  if (!projectId) {
    return {
      pageviews: null,
      visitors: null,
      top_pages: [],
      top_referrers: [],
      skipped_reason: "VERCEL_PROJECT_ID missing",
    };
  }
  try {
    const since = Date.now() - days * 24 * 60 * 60 * 1000;
    const until = Date.now();
    const teamQs = teamId ? `&teamId=${encodeURIComponent(teamId)}` : "";
    const url = `https://vercel.com/api/web/insights/views?projectId=${encodeURIComponent(
      projectId,
    )}&from=${since}&to=${until}${teamQs}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      return {
        pageviews: null,
        visitors: null,
        top_pages: [],
        top_referrers: [],
        skipped_reason: `vercel_http_${res.status}`,
      };
    }
    const json = (await res.json()) as Record<string, unknown>;
    // Vercel Insights JSON shape varies by tier; defensively read.
    const total = (json["total"] as Record<string, number> | undefined) ?? {};
    return {
      pageviews: (total.views as number | undefined) ?? null,
      visitors: (total.visitors as number | undefined) ?? null,
      top_pages: [],
      top_referrers: [],
    };
  } catch (err) {
    return {
      pageviews: null,
      visitors: null,
      top_pages: [],
      top_referrers: [],
      skipped_reason: `vercel_exception: ${String(err).slice(0, 80)}`,
    };
  }
}

async function fetchTypefullyAnalytics(): Promise<TrafficSummary["social"]["typefully"]> {
  const apiKey = process.env.TYPEFULLY_API_KEY?.trim();
  if (!apiKey) {
    return {
      posts_published: null,
      impressions_total: null,
      engagement_total: null,
      by_platform: {},
      skipped_reason: "TYPEFULLY_API_KEY missing",
    };
  }
  try {
    const res = await fetch("https://api.typefully.com/v1/drafts/recently-published/", {
      headers: { "X-API-KEY": apiKey },
    });
    if (!res.ok) {
      return {
        posts_published: null,
        impressions_total: null,
        engagement_total: null,
        by_platform: {},
        skipped_reason: `typefully_http_${res.status}`,
      };
    }
    const json = (await res.json()) as Array<Record<string, unknown>>;
    return {
      posts_published: Array.isArray(json) ? json.length : null,
      impressions_total: null,
      engagement_total: null,
      by_platform: {},
    };
  } catch (err) {
    return {
      posts_published: null,
      impressions_total: null,
      engagement_total: null,
      by_platform: {},
      skipped_reason: `typefully_exception: ${String(err).slice(0, 80)}`,
    };
  }
}

async function loadCycleSignal(): Promise<TrafficSummary["cycle_signal"]> {
  // Resolve the venture's .cycle path from this file outward.
  // The traffic-summary route lives at:
  //   ventures/fractional-ai-command-center/src/app/api/admin/traffic-summary/route.ts
  // The state file lives at:
  //   ventures/fractional-ai-command-center/.cycle/state.json
  // (5 levels up from `src/app/api/admin/traffic-summary/`)
  const stateCandidates = [
    path.resolve(process.cwd(), ".cycle", "state.json"),
    path.resolve(process.cwd(), "ventures", "fractional-ai-command-center", ".cycle", "state.json"),
  ];
  for (const candidate of stateCandidates) {
    try {
      const raw = await fs.readFile(candidate, "utf-8");
      const json = JSON.parse(raw) as Record<string, unknown>;
      const signalTarget = (json.signal_target ?? {}) as Record<string, number>;
      const observed = (json.signal_observed ?? signalTarget) as Record<string, number>;
      const partners = Number(observed.design_partner_conversations ?? 0);
      const paying = Number(observed.paying_customers ?? 0);
      const icpSignups = Number(
        observed.product_signups_icp_fit ?? observed.product_signups ?? 0,
      );
      const trajectory =
        paying > 0 || partners >= 3
          ? "SCALE"
          : icpSignups >= 3 || partners >= 1
            ? "ITERATE"
            : "KILL";
      return {
        design_partner_conversations: partners,
        paying_customers: paying,
        product_signups_icp_fit: icpSignups,
        trajectory,
      };
    } catch {
      continue;
    }
  }
  return {
    design_partner_conversations: 0,
    paying_customers: 0,
    product_signups_icp_fit: 0,
    trajectory: "UNKNOWN",
  };
}

async function loadGeoCitations(days: number): Promise<TrafficSummary["geo_citations"]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!url || !key) {
    return { scans_run: 0, citations_found: 0, queries_with_citation: [] };
  }
  try {
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("geo_citations")
      .select("source, query, cited_practiq, cited_url")
      .gte("scanned_at", since);
    if (error || !data) return { scans_run: 0, citations_found: 0, queries_with_citation: [] };
    const cited = data.filter((r: { cited_practiq: boolean }) => r.cited_practiq);
    return {
      scans_run: data.length,
      citations_found: cited.length,
      queries_with_citation: cited.map((r: { source: string; query: string; cited_url: string | null }) => ({
        query: r.query,
        source: r.source,
        cited_url: r.cited_url,
      })),
    };
  } catch {
    return { scans_run: 0, citations_found: 0, queries_with_citation: [] };
  }
}

async function buildSummary(days: number): Promise<TrafficSummary> {
  const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const end = new Date();

  // ── Site analytics (own data) ──
  const events = await prisma.analyticsEvent.findMany({
    where: { type: "$pageview", createdAt: { gte: start } },
    select: { url: true, referrer: true, ipHash: true, utmSource: true, properties: true },
    take: 10_000,
  });

  const pageViews = events.length;
  const uniqueVisitors = new Set(events.map((e) => e.ipHash).filter(Boolean)).size;

  const byPath = new Map<string, number>();
  const byCountry = new Map<string, number>();
  const byReferrer = new Map<string, number>();
  const byUtmSource = new Map<string, number>();

  for (const e of events) {
    if (e.url) {
      try {
        const u = new URL(e.url);
        byPath.set(u.pathname, (byPath.get(u.pathname) ?? 0) + 1);
      } catch {}
    }
    if (e.referrer) {
      try {
        const r = new URL(e.referrer);
        const host = r.host;
        byReferrer.set(host, (byReferrer.get(host) ?? 0) + 1);
      } catch {
        byReferrer.set(e.referrer, (byReferrer.get(e.referrer) ?? 0) + 1);
      }
    }
    if (e.utmSource) byUtmSource.set(e.utmSource, (byUtmSource.get(e.utmSource) ?? 0) + 1);
    const props = (e.properties ?? {}) as Record<string, unknown>;
    const country = typeof props.ip_country === "string" ? (props.ip_country as string) : null;
    if (country) byCountry.set(country, (byCountry.get(country) ?? 0) + 1);
  }

  const sortMap = (m: Map<string, number>) =>
    [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([k, v]) => ({ count: v, key: k }));

  // ── Conversions ──
  const productSignups = await prisma.user.findMany({
    where: { createdAt: { gte: start } },
    select: { id: true, email: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const productSignupsFiltered = productSignups
    .filter((u) => !isOperatorOrTestEmail(u.email))
    .map((u) => ({ id: u.id, email: u.email ?? "", createdAt: u.createdAt.toISOString() }));

  // Waitlist: read from analytics_events of type signup_form_submitted as a proxy
  const waitlistEvents = await prisma.analyticsEvent.count({
    where: { type: "signup_form_submitted", createdAt: { gte: start } },
  });

  // ── Vercel + Typefully + GEO + cycle (parallel) ──
  const [vercel, typefully, geo, cycleSignal] = await Promise.all([
    fetchVercelAnalytics(days),
    fetchTypefullyAnalytics(),
    loadGeoCitations(days),
    loadCycleSignal(),
  ]);

  return {
    window: { start: start.toISOString(), end: end.toISOString(), days },
    site: {
      page_views: {
        total: pageViews,
        unique_visitors_estimated: uniqueVisitors,
        by_path: sortMap(byPath).map((x) => ({ path: x.key, count: x.count })),
        by_country: sortMap(byCountry).map((x) => ({ country: x.key, count: x.count })),
      },
      referrers: {
        top: sortMap(byReferrer).map((x) => ({ referrer: x.key, count: x.count })),
        by_utm_source: sortMap(byUtmSource).map((x) => ({ utm_source: x.key, count: x.count })),
      },
    },
    conversions: {
      waitlist_signups: { total: waitlistEvents, list: [] },
      product_signups: {
        total: productSignupsFiltered.length,
        list_excluding_test_and_operator: productSignupsFiltered,
      },
      newsletter: 0,
    },
    vercel_analytics: vercel,
    social: { typefully },
    geo_citations: geo,
    cycle_signal: cycleSignal,
  };
}

export async function GET(request: NextRequest) {
  // Cron / internal callers may pass x-deploy-secret to bypass the
  // admin cookie check.
  const deploySecret = process.env.SEO_DEPLOY_SECRET?.trim();
  const headerSecret = request.headers.get("x-deploy-secret")?.trim();
  const isInternal = deploySecret && headerSecret === deploySecret;
  const isVercelCron = request.headers.get("x-vercel-cron") !== null;

  if (!isInternal && !isVercelCron) {
    const cookie = request.cookies.get(ADMIN_COOKIE)?.value;
    const session = await verifySession(cookie);
    if (!session) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const url = new URL(request.url);
  const daysParam = parseInt(url.searchParams.get("days") ?? "7", 10);
  const days = Number.isFinite(daysParam) && daysParam > 0 && daysParam <= 90 ? daysParam : 7;

  const summary = await buildSummary(days);
  return NextResponse.json(summary);
}
