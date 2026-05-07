/**
 * Vercel Cron — daily Practiq traffic + GEO citation Slack report.
 *
 * Schedule: 04:00 UTC daily (right before the operator's day starts in
 * KST). Calls /api/admin/traffic-summary internally for both the 1-day
 * and 7-day windows, renders a single Slack message + a markdown copy
 * to docs/observability/daily/{date}.md, and appends a `signal_observed`
 * event to the studio's .cycle/events.jsonl per the cycle-state spec.
 *
 * Auth: Vercel cron header OR x-deploy-secret.
 */
import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { safeNotify } from "@/lib/notifications/slack";

export const runtime = "nodejs";
export const maxDuration = 60;

interface SummaryShape {
  window: { start: string; end: string; days: number };
  site: {
    page_views: { total: number; unique_visitors_estimated: number; by_path: Array<{ path: string; count: number }> };
    referrers: { top: Array<{ referrer: string; count: number }> };
  };
  conversions: {
    waitlist_signups: { total: number };
    product_signups: { total: number; list_excluding_test_and_operator: Array<{ email: string }> };
  };
  vercel_analytics: { pageviews: number | null; visitors: number | null; skipped_reason?: string };
  social: { typefully: { posts_published: number | null; skipped_reason?: string } };
  geo_citations: { scans_run: number; citations_found: number };
  cycle_signal: { design_partner_conversations: number; paying_customers: number; product_signups_icp_fit: number; trajectory: string };
}

async function fetchSummary(origin: string, days: number, secret: string): Promise<SummaryShape | null> {
  try {
    const url = `${origin}/api/admin/traffic-summary?days=${days}`;
    const res = await fetch(url, {
      headers: { "x-deploy-secret": secret },
    });
    if (!res.ok) return null;
    return (await res.json()) as SummaryShape;
  } catch {
    return null;
  }
}

function renderSlackText(date: string, d1: SummaryShape | null, d7: SummaryShape | null): string {
  if (!d1 || !d7) return `📊 Practiq Traffic — ${date}\n(traffic-summary endpoint unavailable)`;
  const topRef1 = d1.site.referrers.top[0];
  return [
    `📊 *Practiq Traffic — ${date}*`,
    ``,
    `*Last 24h*`,
    `• Site visits: ${d1.site.page_views.total} (unique ~${d1.site.page_views.unique_visitors_estimated})`,
    `• Waitlist signups: ${d1.conversions.waitlist_signups.total}`,
    `• Product signups (ICP-filtered): ${d1.conversions.product_signups.total}`,
    `• Top referrer: ${topRef1 ? `${topRef1.referrer} (${topRef1.count})` : "(none)"}`,
    ``,
    `*Last 7d*`,
    `• Visits: ${d7.site.page_views.total} / Visitors: ${d7.site.page_views.unique_visitors_estimated}`,
    `• Waitlist: ${d7.conversions.waitlist_signups.total}`,
    `• Product signups: ${d7.conversions.product_signups.total}${d7.conversions.product_signups.list_excluding_test_and_operator.length ? ` (${d7.conversions.product_signups.list_excluding_test_and_operator.map((u) => u.email).slice(0, 3).join(", ")})` : ""}`,
    ``,
    `*Social (Typefully)*`,
    `• ${d7.social.typefully.posts_published !== null ? `Posts published: ${d7.social.typefully.posts_published}` : `skipped (${d7.social.typefully.skipped_reason})`}`,
    ``,
    `*GEO citations (last 7d)*`,
    `• Scans run: ${d7.geo_citations.scans_run} / Practiq cited: ${d7.geo_citations.citations_found}`,
    ``,
    `*Cycle 1 trajectory: ${d7.cycle_signal.trajectory}*`,
    `• Design-partner conversations: ${d7.cycle_signal.design_partner_conversations}`,
    `• Paying customers: ${d7.cycle_signal.paying_customers}`,
    `• Product signups (ICP-fit): ${d7.cycle_signal.product_signups_icp_fit}`,
  ].join("\n");
}

async function writeMarkdownReport(date: string, body: string): Promise<void> {
  const candidates = [
    path.resolve(process.cwd(), "..", "..", "ventures", "fractional-ai-command-center", "docs", "observability", "daily", `${date}.md`),
    path.resolve(process.cwd(), "docs", "observability", "daily", `${date}.md`),
  ];
  for (const c of candidates) {
    try {
      await fs.mkdir(path.dirname(c), { recursive: true });
      await fs.writeFile(c, body);
      return;
    } catch {
      continue;
    }
  }
}

async function appendCycleEvent(payload: Record<string, unknown>): Promise<void> {
  const candidates = [
    path.resolve(process.cwd(), "..", "..", ".cycle", "events.jsonl"),
    path.resolve(process.cwd(), ".cycle", "events.jsonl"),
  ];
  const event = {
    ts: new Date().toISOString(),
    type: "signal_observed",
    actor: "design-engineer",
    payload,
  };
  for (const c of candidates) {
    try {
      await fs.access(path.dirname(c));
      await fs.appendFile(c, JSON.stringify(event) + "\n");
      return;
    } catch {
      continue;
    }
  }
}

async function runCron(request: NextRequest) {
  const isVercelCron = request.headers.get("x-vercel-cron") !== null;
  const secret = process.env.SEO_DEPLOY_SECRET?.trim();
  const passed = request.headers.get("x-deploy-secret")?.trim();
  if (!isVercelCron && !(secret && passed === secret)) {
    return NextResponse.json({ error: "cron-only" }, { status: 401 });
  }
  if (!secret) {
    return NextResponse.json(
      { error: "SEO_DEPLOY_SECRET missing — internal fetch to traffic-summary cannot authenticate" },
      { status: 500 },
    );
  }

  const origin = (() => {
    const proto = request.headers.get("x-forwarded-proto") ?? "https";
    const host = request.headers.get("host") ?? "practiq.dev";
    return `${proto}://${host}`;
  })();

  let d1: SummaryShape | null;
  let d7: SummaryShape | null;
  try {
    [d1, d7] = await Promise.all([
      fetchSummary(origin, 1, secret),
      fetchSummary(origin, 7, secret),
    ]);
  } catch (err) {
    safeNotify(
      "error",
      {
        where: "cron:daily-traffic-report",
        message: err instanceof Error ? err.message : String(err),
      },
      { severity: "critical" },
    );
    console.error("[daily-traffic-report] fatal:", err);
    return NextResponse.json({ ok: false, error: "internal" }, { status: 500 });
  }
  if (!d1 && !d7) {
    safeNotify(
      "error",
      {
        where: "cron:daily-traffic-report",
        message: "Both 1d and 7d traffic summaries returned null",
      },
      { severity: "warning" },
    );
  }

  const date = new Date().toISOString().slice(0, 10);
  const slackText = renderSlackText(date, d1, d7);

  // Write to markdown file (best-effort — Vercel serverless is RO).
  await writeMarkdownReport(date, slackText);

  // Append signal_observed event to events.jsonl (best-effort — same RO caveat).
  if (d1) {
    await appendCycleEvent({
      source: "daily_traffic_report",
      date,
      site_visits_24h: d1.site.page_views.total,
      waitlist_signups_24h: d1.conversions.waitlist_signups.total,
      product_signups_24h: d1.conversions.product_signups.total,
      geo_citations_24h: d1.geo_citations.citations_found,
      trajectory: d1.cycle_signal.trajectory,
    });
  }

  // Slack ping — single fenced message.
  safeNotify("agent_cron_summary", {
    window: `Daily traffic report ${date}`,
    summary: slackText,
  });

  return NextResponse.json({ ok: true, date, d1: !!d1, d7: !!d7 });
}

export const GET = runCron;
export const POST = runCron;
