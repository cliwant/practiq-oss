/**
 * /admin/analytics — operator dashboard for self-hosted product analytics.
 *
 * Replaces the role PostHog used to fill: a single page where the
 * operator can see signup → checkout → activation funnels, traffic
 * sources, and event volume without leaving the admin host.
 *
 * Renders ENTIRELY server-side (no client JS) so the dashboard stays
 * snappy even at high event volumes — every aggregation is a Postgres
 * SQL query against `practiq.analytics_events`. No client-side
 * pagination because we only show aggregates.
 *
 * Sections:
 *   1. Last 24h / 7d totals — pageviews, unique visitors, signups,
 *      paid signups, churn.
 *   2. Acquisition funnel — pageview → pricing CTA → signup → checkout
 *      → completed, with conversion percentages.
 *   3. Top UTM sources / campaigns — which channels are converting.
 *   4. Recent events table — last 50 events for live debugging.
 *
 * Auth: middleware enforces admin host (admin.grindworks.ai) + cookie.
 * No additional check here — the layout's `<Sidebar>` only renders for
 * authenticated admin sessions.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import type { AnalyticsEventName } from "@/lib/analytics/track";

export const metadata: Metadata = {
  title: "Analytics — Practiq Admin",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
  },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

// E2E test fixtures (Jennifer Park personas, etc.) inflate the funnel
// and create a phantom 95% drop-off because they fire $pageview but
// never sign up. Strip them at query time so the dashboard reflects
// real human traffic only. Two filter shapes:
//   - `excludeBotVisitors` — for events keyed on distinctId/userId,
//     where the e2e harness uses synthetic ids prefixed `e2e-persona-`.
//   - `excludeBotSignups` — for events tied to a real user row, where
//     the e2e harness uses the @practiq-test.cliwant.com domain.
const excludeBotVisitors = {
  OR: [
    { distinctId: null },
    { distinctId: { not: { startsWith: "e2e-persona-" } } },
  ],
};
const excludeBotSignups = {
  OR: [
    { userId: null },
    { user: { email: { not: { endsWith: "@practiq-test.cliwant.com" } } } },
  ],
};

// Funnel definition: ordered list of events that should fire in
// sequence for a successful checkout. Each step is named and queried
// with its own COUNT so we can render percentages.
const FUNNEL: { label: string; type: AnalyticsEventName }[] = [
  { label: "Pageview", type: "$pageview" },
  { label: "Pricing CTA clicked", type: "pricing_cta_clicked" },
  { label: "Signup form submitted", type: "signup_form_submitted" },
  { label: "Signup completed", type: "signup_completed" },
  { label: "Checkout initiated", type: "checkout_initiated" },
  { label: "Checkout completed", type: "checkout_completed" },
];

interface SummaryNumbers {
  pageviews24h: number;
  pageviews7d: number;
  uniqueVisitors24h: number;
  uniqueVisitors7d: number;
  signupsCompleted24h: number;
  signupsCompleted7d: number;
  checkoutCompleted24h: number;
  checkoutCompleted7d: number;
  cancellation24h: number;
  cancellation7d: number;
}

async function loadSummary(): Promise<SummaryNumbers> {
  const now = Date.now();
  const day = new Date(now - 24 * 60 * 60 * 1000);
  const week = new Date(now - 7 * 24 * 60 * 60 * 1000);

  const [pv24, pv7, sd24, sd7, sc24, sc7, cc24, cc7, cx24, cx7] =
    await Promise.all([
      prisma.analyticsEvent.count({
        where: { type: "$pageview", createdAt: { gte: day }, ...excludeBotVisitors },
      }),
      prisma.analyticsEvent.count({
        where: { type: "$pageview", createdAt: { gte: week }, ...excludeBotVisitors },
      }),
      prisma.analyticsEvent
        .groupBy({
          by: ["distinctId"],
          where: { type: "$pageview", createdAt: { gte: day }, ...excludeBotVisitors },
        })
        .then((rows) => rows.length),
      prisma.analyticsEvent
        .groupBy({
          by: ["distinctId"],
          where: { type: "$pageview", createdAt: { gte: week }, ...excludeBotVisitors },
        })
        .then((rows) => rows.length),
      prisma.analyticsEvent.count({
        where: { type: "signup_completed", createdAt: { gte: day }, ...excludeBotSignups },
      }),
      prisma.analyticsEvent.count({
        where: { type: "signup_completed", createdAt: { gte: week }, ...excludeBotSignups },
      }),
      prisma.analyticsEvent.count({
        where: { type: "checkout_completed", createdAt: { gte: day }, ...excludeBotSignups },
      }),
      prisma.analyticsEvent.count({
        where: { type: "checkout_completed", createdAt: { gte: week }, ...excludeBotSignups },
      }),
      prisma.analyticsEvent.count({
        where: { type: "subscription_canceled", createdAt: { gte: day }, ...excludeBotSignups },
      }),
      prisma.analyticsEvent.count({
        where: { type: "subscription_canceled", createdAt: { gte: week }, ...excludeBotSignups },
      }),
    ]);

  return {
    pageviews24h: pv24,
    pageviews7d: pv7,
    uniqueVisitors24h: sd24,
    uniqueVisitors7d: sd7,
    signupsCompleted24h: sc24,
    signupsCompleted7d: sc7,
    checkoutCompleted24h: cc24,
    checkoutCompleted7d: cc7,
    cancellation24h: cx24,
    cancellation7d: cx7,
  };
}

interface FunnelRow {
  label: string;
  type: AnalyticsEventName;
  count7d: number;
  pctOfPrevious: number | null;
}

async function loadFunnel(): Promise<FunnelRow[]> {
  const week = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const counts = await Promise.all(
    FUNNEL.map((step) =>
      prisma.analyticsEvent.count({
        where: {
          type: step.type,
          createdAt: { gte: week },
          // Pre-signup steps are visitor-keyed; post-signup steps are
          // user-keyed. AND both filter shapes so e2e personas drop
          // out at every stage of the funnel.
          AND: [excludeBotVisitors, excludeBotSignups],
        },
      }),
    ),
  );
  return FUNNEL.map((step, i) => {
    const count7d = counts[i];
    const prev = i === 0 ? null : counts[i - 1];
    const pctOfPrevious =
      prev && prev > 0 ? Math.round((count7d / prev) * 1000) / 10 : null;
    return { label: step.label, type: step.type, count7d, pctOfPrevious };
  });
}

interface UtmRow {
  source: string;
  campaign: string;
  visitors: number;
  signups: number;
}

async function loadUtm(): Promise<UtmRow[]> {
  const week = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  // SQL groupBy on (utmSource, utmCampaign) over $pageview, then a
  // join-like correlated subquery for signup count by the same UTM.
  // Prisma doesn't have correlated subqueries native, so we run two
  // groupBy's and merge in JS.
  const [pvByUtm, signupByUtm] = await Promise.all([
    prisma.analyticsEvent.groupBy({
      by: ["utmSource", "utmCampaign"],
      where: {
        type: "$pageview",
        createdAt: { gte: week },
        utmSource: { not: null },
        ...excludeBotVisitors,
      },
      _count: { _all: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    }),
    prisma.analyticsEvent.groupBy({
      by: ["utmSource", "utmCampaign"],
      where: {
        type: "signup_completed",
        createdAt: { gte: week },
        utmSource: { not: null },
        ...excludeBotSignups,
      },
      _count: { _all: true },
    }),
  ]);
  const signupMap = new Map<string, number>();
  for (const row of signupByUtm) {
    const k = `${row.utmSource ?? ""}::${row.utmCampaign ?? ""}`;
    signupMap.set(k, row._count._all);
  }
  return pvByUtm.map((row) => {
    const k = `${row.utmSource ?? ""}::${row.utmCampaign ?? ""}`;
    return {
      source: row.utmSource ?? "(none)",
      campaign: row.utmCampaign ?? "(none)",
      visitors: row._count._all,
      signups: signupMap.get(k) ?? 0,
    };
  });
}

interface RecentEvent {
  id: string;
  type: string;
  url: string | null;
  utmSource: string | null;
  createdAt: Date;
  userId: string | null;
  distinctId: string | null;
}

interface StripeWebhookHealth {
  total7d: number;
  processed7d: number;
  failed7d: number;
  replayRejected7d: number;
  successRatePct: number;
  p50Ms: number;
  p95Ms: number;
  available: boolean;
}

// ─── LLM spend (anonymous prospect $-budget guardrail) ───────────────
// Wave-4 P0-02. Reads practiq.anon_llm_spend (Supabase REST because
// the table lives in the `practiq` schema and isn't a Prisma model).
// Three metrics surface here:
//   - 7d total spend across all firms (operator's pulse check)
//   - Top 5 firms by 30d spend (which prospects are using us heavily)
//   - Recent ceiling hits + last-hit timestamp (abuse signal)

interface AnonSpendSection {
  available: boolean;
  total7dUsd: number;
  total7dCalls: number;
  top30d: Array<{
    firmIdentity: string;
    spentUsd: number;
    calls: number;
    endpoints: string[];
  }>;
  ceilingHits30d: number;
  lastHitAt: string | null;
}

async function loadAnonSpend(): Promise<AnonSpendSection> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    return {
      available: false,
      total7dUsd: 0,
      total7dCalls: 0,
      top30d: [],
      ceilingHits30d: 0,
      lastHitAt: null,
    };
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();

  // 7d aggregate — pull only what we need (cost_usd) to keep payload small.
  const seven = await supabase
    .schema("practiq")
    .from("anon_llm_spend")
    .select("cost_usd")
    .gte("created_at", sevenDaysAgo)
    .limit(10_000);

  if (seven.error) {
    console.warn(
      `[analytics] anon-spend 7d query failed: ${seven.error.message}`,
    );
    return {
      available: false,
      total7dUsd: 0,
      total7dCalls: 0,
      top30d: [],
      ceilingHits30d: 0,
      lastHitAt: null,
    };
  }
  const sevenRows = (seven.data ?? []) as Array<{
    cost_usd: number | string;
  }>;
  let total7dUsd = 0;
  for (const r of sevenRows) {
    const v = typeof r.cost_usd === "number" ? r.cost_usd : Number(r.cost_usd);
    if (Number.isFinite(v)) total7dUsd += v;
  }

  // 30d per-firm aggregate — pull rows and group in-process. At launch
  // scale (low thousands of rows) this is fast; if it grows we'll move
  // to a SQL view.
  const thirty = await supabase
    .schema("practiq")
    .from("anon_llm_spend")
    .select("firm_identity, endpoint, cost_usd")
    .gte("created_at", thirtyDaysAgo)
    .limit(10_000);
  if (thirty.error) {
    console.warn(
      `[analytics] anon-spend 30d query failed: ${thirty.error.message}`,
    );
  }
  const byFirm = new Map<
    string,
    { spentUsd: number; calls: number; endpoints: Set<string> }
  >();
  for (const r of (thirty.data ?? []) as Array<{
    firm_identity: string;
    endpoint: string;
    cost_usd: number | string;
  }>) {
    const id = r.firm_identity;
    const existing = byFirm.get(id) ?? {
      spentUsd: 0,
      calls: 0,
      endpoints: new Set<string>(),
    };
    const v = typeof r.cost_usd === "number" ? r.cost_usd : Number(r.cost_usd);
    if (Number.isFinite(v)) existing.spentUsd += v;
    existing.calls += 1;
    existing.endpoints.add(r.endpoint);
    byFirm.set(id, existing);
  }
  const top30d = Array.from(byFirm.entries())
    .map(([firmIdentity, v]) => ({
      firmIdentity,
      spentUsd: Math.round(v.spentUsd * 10_000) / 10_000,
      calls: v.calls,
      endpoints: Array.from(v.endpoints).sort(),
    }))
    .sort((a, b) => b.spentUsd - a.spentUsd)
    .slice(0, 5);

  // Ceiling hits — surfaced as practiq.user_errors rows with our
  // step="spend ceiling check (anon-spend)" label. user_errors is
  // Supabase-only (not in Prisma) so query via supabase-js. We sum
  // occurrence_count to count actual hits (each hit increments the
  // row by reportUserError's dedupe pipeline).
  const hitsQuery = await supabase
    .schema("practiq")
    .from("user_errors")
    .select("occurrence_count, last_seen_at")
    .eq("step", "spend ceiling check (anon-spend)")
    .gte("last_seen_at", thirtyDaysAgo)
    .order("last_seen_at", { ascending: false })
    .limit(1_000);
  let ceilingHits30d = 0;
  let lastHitAt: string | null = null;
  if (hitsQuery.error) {
    console.warn(
      `[analytics] anon-spend hits query failed: ${hitsQuery.error.message}`,
    );
  } else {
    const rows = (hitsQuery.data ?? []) as Array<{
      occurrence_count: number | null;
      last_seen_at: string;
    }>;
    for (const r of rows) {
      ceilingHits30d += r.occurrence_count ?? 1;
    }
    if (rows.length > 0) lastHitAt = rows[0].last_seen_at;
  }

  return {
    available: true,
    total7dUsd: Math.round(total7dUsd * 10_000) / 10_000,
    total7dCalls: sevenRows.length,
    top30d,
    ceilingHits30d,
    lastHitAt,
  };
}

async function loadStripeWebhookHealth(): Promise<StripeWebhookHealth> {
  // Reads practiq.stripe_webhook_events via supabase-js because the
  // table lives in the practiq schema (PostgREST + service_role
  // grants, mirror of practiq.user_errors). prisma.* would require
  // a model declaration in schema.prisma; this surface-area is fine
  // with the existing supabase client.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    return {
      total7d: 0,
      processed7d: 0,
      failed7d: 0,
      replayRejected7d: 0,
      successRatePct: 0,
      p50Ms: 0,
      p95Ms: 0,
      available: false,
    };
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .schema("practiq")
    .from("stripe_webhook_events")
    .select("status, processing_duration_ms")
    .gte("created_at", sevenDaysAgo)
    .limit(10000);
  if (error) {
    console.warn("[analytics] stripe webhook health query failed:", error);
    return {
      total7d: 0,
      processed7d: 0,
      failed7d: 0,
      replayRejected7d: 0,
      successRatePct: 0,
      p50Ms: 0,
      p95Ms: 0,
      available: false,
    };
  }
  const rows = (data ?? []) as Array<{
    status: string;
    processing_duration_ms: number | null;
  }>;
  const total = rows.length;
  const processed = rows.filter((r) => r.status === "processed").length;
  const failed = rows.filter((r) => r.status === "failed").length;
  const replay = rows.filter((r) => r.status === "replay_rejected").length;
  const durations = rows
    .map((r) => r.processing_duration_ms)
    .filter((v): v is number => typeof v === "number")
    .sort((a, b) => a - b);
  const pct = (p: number) =>
    durations.length === 0
      ? 0
      : durations[Math.min(durations.length - 1, Math.floor((p / 100) * durations.length))];
  return {
    total7d: total,
    processed7d: processed,
    failed7d: failed,
    replayRejected7d: replay,
    successRatePct: total > 0 ? Math.round((processed / total) * 1000) / 10 : 0,
    p50Ms: pct(50),
    p95Ms: pct(95),
    available: true,
  };
}

async function loadRecent(): Promise<RecentEvent[]> {
  return prisma.analyticsEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      type: true,
      url: true,
      utmSource: true,
      createdAt: true,
      userId: true,
      distinctId: true,
    },
  });
}

export default async function AnalyticsPage() {
  const [summary, funnel, utm, recent, stripeHealth, anonSpend] =
    await Promise.all([
      loadSummary(),
      loadFunnel(),
      loadUtm(),
      loadRecent(),
      loadStripeWebhookHealth(),
      loadAnonSpend(),
    ]);

  const conversionToSignup =
    funnel[0].count7d > 0
      ? ((funnel[3].count7d / funnel[0].count7d) * 100).toFixed(2)
      : "—";
  const conversionToPaid =
    funnel[3].count7d > 0
      ? ((funnel[5].count7d / funnel[3].count7d) * 100).toFixed(2)
      : "—";

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 text-zinc-100">
      <h1 className="text-2xl font-extrabold tracking-[-0.03em] mb-1">
        Product analytics
      </h1>
      <p className="text-sm text-zinc-500 mb-8">
        Self-hosted (Postgres). All data joins with billing + usage in
        the same database.
      </p>

      {/* Summary */}
      <section className="mb-10">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-4">
          Last 24h / 7d
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Stat label="Pageviews 24h" value={summary.pageviews24h} sub={`7d: ${summary.pageviews7d}`} />
          <Stat label="Unique 24h" value={summary.uniqueVisitors24h} sub={`7d: ${summary.uniqueVisitors7d}`} />
          <Stat label="Signups 24h" value={summary.signupsCompleted24h} sub={`7d: ${summary.signupsCompleted7d}`} />
          <Stat label="Checkouts 24h" value={summary.checkoutCompleted24h} sub={`7d: ${summary.checkoutCompleted7d}`} />
          <Stat
            label="Cancellations 24h"
            value={summary.cancellation24h}
            sub={`7d: ${summary.cancellation7d}`}
            danger={summary.cancellation24h > 0}
          />
        </div>
      </section>

      {/* Funnel */}
      <section className="mb-10">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-4">
          Acquisition funnel — last 7 days
        </h2>
        <div className="rounded-xl border border-zinc-800 bg-[#0a0a0a] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/40 text-[10px] uppercase tracking-widest text-zinc-400">
              <tr>
                <th className="text-left px-4 py-3 font-bold">Step</th>
                <th className="text-right px-4 py-3 font-bold">Count</th>
                <th className="text-right px-4 py-3 font-bold">% of prev</th>
              </tr>
            </thead>
            <tbody>
              {funnel.map((row) => (
                <tr key={row.type} className="border-t border-zinc-800/60">
                  <td className="px-4 py-3 text-zinc-300">{row.label}</td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-100">
                    {row.count7d}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-500">
                    {row.pctOfPrevious !== null
                      ? `${row.pctOfPrevious.toFixed(1)}%`
                      : "—"}
                  </td>
                </tr>
              ))}
              <tr className="border-t border-zinc-800 bg-zinc-900/30">
                <td className="px-4 py-3 text-zinc-400 italic" colSpan={2}>
                  Pageview → Signup conversion
                </td>
                <td className="px-4 py-3 text-right font-mono text-emerald-400">
                  {conversionToSignup}%
                </td>
              </tr>
              <tr className="border-t border-zinc-800/60 bg-zinc-900/30">
                <td className="px-4 py-3 text-zinc-400 italic" colSpan={2}>
                  Signup → Paid conversion
                </td>
                <td className="px-4 py-3 text-right font-mono text-emerald-400">
                  {conversionToPaid}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Stripe webhook reliability — 7d */}
      <section className="mb-10">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-4">
          Stripe webhook reliability — last 7 days
        </h2>
        {!stripeHealth.available ? (
          <div className="rounded-xl border border-zinc-800 bg-[#0a0a0a] p-6 text-sm text-zinc-500">
            Webhook health data unavailable. Configure Supabase env vars to
            populate practiq.stripe_webhook_events.
          </div>
        ) : stripeHealth.total7d === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-[#0a0a0a] p-6 text-sm text-zinc-500">
            No webhook deliveries in the last 7 days. Either Stripe is quiet
            or the instrumentation hasn&apos;t shipped yet.{" "}
            <Link
              href="/admin/incidents/stripe"
              className="text-zinc-300 underline hover:text-zinc-100"
            >
              Open the Stripe incident view →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <Stat label="Deliveries 7d" value={stripeHealth.total7d} />
            <Stat
              label="Processed"
              value={stripeHealth.processed7d}
              sub={`${stripeHealth.successRatePct}% success`}
            />
            <Stat
              label="Failed"
              value={stripeHealth.failed7d}
              danger={stripeHealth.failed7d > 0}
            />
            <Stat label="p50 (ms)" value={stripeHealth.p50Ms} />
            <Stat
              label="p95 (ms)"
              value={stripeHealth.p95Ms}
              danger={stripeHealth.p95Ms > 10000}
            />
          </div>
        )}
        {stripeHealth.available && stripeHealth.replayRejected7d > 0 && (
          <p className="text-xs text-zinc-500 mt-3">
            {stripeHealth.replayRejected7d} replay attempts rejected by
            idempotency check (this is the protection working — not a
            failure).{" "}
            <Link
              href="/admin/incidents/stripe?status=replay_rejected"
              className="text-zinc-400 underline hover:text-zinc-300"
            >
              View →
            </Link>
          </p>
        )}
      </section>

      {/* LLM spend — anonymous prospect $-budget guardrail (Wave-4 P0-02) */}
      <section className="mb-10">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-4">
          LLM spend — anonymous prospects
        </h2>
        {!anonSpend.available ? (
          <div className="rounded-xl border border-zinc-800 bg-[#0a0a0a] p-6 text-sm text-zinc-500">
            Spend data unavailable. Configure Supabase env vars to populate
            practiq.anon_llm_spend.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <Stat
                label="Spend 7d (USD)"
                value={Math.round(anonSpend.total7dUsd * 100)}
                sub={`$${anonSpend.total7dUsd.toFixed(2)} · ${anonSpend.total7dCalls} calls`}
              />
              <Stat
                label="Top firms (30d)"
                value={anonSpend.top30d.length}
                sub="By spend — see table"
              />
              <Stat
                label="Ceiling hits (30d)"
                value={anonSpend.ceilingHits30d}
                danger={anonSpend.ceilingHits30d > 0}
                sub={
                  anonSpend.lastHitAt
                    ? `Last: ${anonSpend.lastHitAt.slice(0, 16).replace("T", " ")}`
                    : "None yet"
                }
              />
              <Stat
                label="Ceiling ($/firm/30d)"
                value={Number(
                  process.env.LLM_SPEND_CEILING_ANON_USD ?? 5,
                )}
                sub="Anonymous tier"
              />
            </div>
            <div className="rounded-xl border border-zinc-800 bg-[#0a0a0a] overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-zinc-900/40 text-[10px] uppercase tracking-widest text-zinc-400">
                  <tr>
                    <th className="text-left px-4 py-3 font-bold">
                      Firm identity
                    </th>
                    <th className="text-left px-4 py-3 font-bold">Endpoints</th>
                    <th className="text-right px-4 py-3 font-bold">Calls</th>
                    <th className="text-right px-4 py-3 font-bold">
                      Spend 30d
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {anonSpend.top30d.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-6 text-center text-zinc-500"
                      >
                        No LLM spend recorded in the last 30 days.
                      </td>
                    </tr>
                  )}
                  {anonSpend.top30d.map((row) => (
                    <tr
                      key={row.firmIdentity}
                      className="border-t border-zinc-800/60"
                    >
                      <td className="px-4 py-3 text-zinc-300 font-mono text-xs">
                        {row.firmIdentity}
                      </td>
                      <td className="px-4 py-3 text-zinc-400 text-xs">
                        {row.endpoints.join(", ")}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {row.calls}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-400">
                        ${row.spentUsd.toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-zinc-500 mt-3">
              Per-firm 30d $-budget ceiling on the public LLM hot paths
              (workflow-audit, ai-policy-generator). Hits return HTTP 429 with
              a fair-use message + Slack ping. Override default ceiling via{" "}
              <code className="font-mono text-zinc-400">
                LLM_SPEND_CEILING_ANON_USD
              </code>
              .
            </p>
          </>
        )}
      </section>

      {/* UTM */}
      <section className="mb-10">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-4">
          Top traffic sources — 7d
        </h2>
        <div className="rounded-xl border border-zinc-800 bg-[#0a0a0a] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/40 text-[10px] uppercase tracking-widest text-zinc-400">
              <tr>
                <th className="text-left px-4 py-3 font-bold">Source</th>
                <th className="text-left px-4 py-3 font-bold">Campaign</th>
                <th className="text-right px-4 py-3 font-bold">Visitors</th>
                <th className="text-right px-4 py-3 font-bold">Signups</th>
                <th className="text-right px-4 py-3 font-bold">Conv. %</th>
              </tr>
            </thead>
            <tbody>
              {utm.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-zinc-500">
                    No UTM-tagged traffic yet.
                  </td>
                </tr>
              )}
              {utm.map((row, i) => (
                <tr key={i} className="border-t border-zinc-800/60">
                  <td className="px-4 py-3 text-zinc-300">{row.source}</td>
                  <td className="px-4 py-3 text-zinc-400">{row.campaign}</td>
                  <td className="px-4 py-3 text-right font-mono">{row.visitors}</td>
                  <td className="px-4 py-3 text-right font-mono">{row.signups}</td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-400">
                    {row.visitors > 0
                      ? `${((row.signups / row.visitors) * 100).toFixed(1)}%`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recent events */}
      <section className="mb-10">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-4">
          Recent events — last 50
        </h2>
        <div className="rounded-xl border border-zinc-800 bg-[#0a0a0a] overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-zinc-900/40 text-[10px] uppercase tracking-widest text-zinc-400">
              <tr>
                <th className="text-left px-3 py-2 font-bold">When</th>
                <th className="text-left px-3 py-2 font-bold">Event</th>
                <th className="text-left px-3 py-2 font-bold">URL</th>
                <th className="text-left px-3 py-2 font-bold">UTM source</th>
                <th className="text-left px-3 py-2 font-bold">Distinct</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((e) => (
                <tr key={e.id} className="border-t border-zinc-800/60">
                  <td className="px-3 py-2 font-mono text-zinc-500">
                    {e.createdAt.toISOString().slice(5, 16).replace("T", " ")}
                  </td>
                  <td className="px-3 py-2 font-mono text-zinc-200">{e.type}</td>
                  <td className="px-3 py-2 text-zinc-400 truncate max-w-[260px]">
                    {e.url
                      ? new URL(e.url).pathname +
                        new URL(e.url).search
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-zinc-400">{e.utmSource ?? "—"}</td>
                  <td className="px-3 py-2 font-mono text-zinc-500">
                    {e.userId ? `u:${e.userId.slice(0, 8)}` : e.distinctId?.slice(0, 12) ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  danger,
}: {
  label: string;
  value: number;
  sub?: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-[#0a0a0a] p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
        {label}
      </p>
      <p
        className={`text-2xl font-extrabold tracking-tight ${danger ? "text-red-400" : "text-zinc-100"}`}
      >
        {value.toLocaleString()}
      </p>
      {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
    </div>
  );
}
