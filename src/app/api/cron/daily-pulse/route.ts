/**
 * Vercel Cron — daily observation-mode pulse posted to Slack.
 *
 * Schedule: 04:30 UTC daily (after daily-traffic-report at 04:00).
 * Computes the 7 observation-mode metrics + the 7 trigger evaluations
 * and emits a single Slack message via the `daily_pulse` notification
 * type.
 *
 * Mirrors scripts/daily-pulse.mjs — that script is the operator's
 * ad-hoc CLI tool; this route is the scheduled automation. Both share
 * the same SQL CTEs for operator/bot traffic filtering so the numbers
 * match.
 *
 * Auth: Vercel cron header OR x-deploy-secret header for manual runs.
 *
 * Cost: zero LLM calls. ~6 Postgres queries (parallel) + 1 Stripe API
 * call + 1 GSC API call. Typical runtime: 3-8 seconds.
 */
import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { safeNotify } from "@/lib/notifications/slack";

export const runtime = "nodejs";
export const maxDuration = 60;

// ─── Operator/test email patterns (mirrors slack.ts) ────────────
const OPERATOR_PATTERNS = [
  "%@grindworks.ai",
  "%@practiq.dev",
  "%@practiq-test.cliwant.com",
  "%@example.com",
  "%smoke-test%",
  "%+e2e-%",
  "verify@%",
];
const OPERATOR_EMAIL_NOT_LIKE = OPERATOR_PATTERNS.map(
  (p) => `email NOT ILIKE '${p}'`,
).join(" AND ");
const OPERATOR_EMAIL_ILIKE = OPERATOR_PATTERNS.map(
  (p) => `email ILIKE '${p}'`,
).join(" OR ");

// Bot UA patterns — strip these from traffic counts.
const BOT_UA_PATTERNS = [
  "%headlesschrome%",
  "%headless chrome%",
  "%bot/%",
  "%bot %",
  "%crawler%",
  "%spider%",
  "%scraper%",
  "%curl/%",
  "%playwright%",
  "%puppeteer%",
  "%selenium%",
  "%lighthouse%",
  "%googleother%",
  "%duckassistbot%",
  "%hubspot crawler%",
  "%applebot%",
  // Fake-mobile bot fleet detected 2026-05-18 — moto g power (2022)
  // UA from 8+ US cloud DCs (AWS Boydton, Azure Cheyenne, etc).
  // 96/99 workflow_audit_started events were from this fleet, 0
  // conversions of any kind. Pure noise. See scripts/daily-pulse.mjs
  // for the matching pattern + investigation notes.
  "%moto g power%",
];
const BOT_UA_NOT_LIKE = BOT_UA_PATTERNS.map(
  (p) => `user_agent NOT ILIKE '${p}'`,
).join(" AND ");

const OPERATOR_DISTINCT_CTE = `
  op_users AS (
    SELECT id FROM practiq.users WHERE ${OPERATOR_EMAIL_ILIKE}
  ),
  op_distincts AS (
    SELECT DISTINCT distinct_id
    FROM practiq.analytics_events
    WHERE user_id IN (SELECT id FROM op_users) AND distinct_id IS NOT NULL
  )
`;

const REAL_TRAFFIC_WHERE = `
  distinct_id NOT IN (SELECT distinct_id FROM op_distincts)
  AND (user_agent IS NULL OR (${BOT_UA_NOT_LIKE}))
`;

// ─── Auth gate ────────────────────────────────────────────────
function isAuthorized(request: NextRequest): boolean {
  const isVercelCron = request.headers.get("x-vercel-cron") !== null;
  if (isVercelCron) return true;
  const secret = process.env.SEO_DEPLOY_SECRET?.trim();
  const passed = request.headers.get("x-deploy-secret")?.trim();
  if (secret && passed === secret) return true;
  const auth = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (process.env.CRON_SECRET && auth === expected && expected.length > 7) return true;
  return false;
}

// ─── Metric queries (Prisma raw, matches scripts/daily-pulse.mjs) ─
interface PulseRow {
  real_signups_7d: bigint;
  real_signups_30d: bigint;
  uniq_7d_raw: bigint;
  uniq_7d: bigint;
  dau_24h: bigint;
  demo_7d: bigint;
  audit_started: bigint;
  audit_completed: bigint;
  audit_step_blocked: bigint;
  aeo_cited: bigint;
  aeo_total: bigint;
}

async function queryAll(): Promise<PulseRow> {
  // One round-trip — every metric in a single query so the cron stays
  // fast and consistent (no time skew between sub-queries).
  const rows = await prisma.$queryRawUnsafe<PulseRow[]>(
    `WITH ${OPERATOR_DISTINCT_CTE}
    SELECT
      (SELECT COUNT(*) FROM practiq.users
        WHERE created_at > NOW() - INTERVAL '7 days' AND ${OPERATOR_EMAIL_NOT_LIKE})::bigint AS real_signups_7d,
      (SELECT COUNT(*) FROM practiq.users
        WHERE created_at > NOW() - INTERVAL '30 days' AND ${OPERATOR_EMAIL_NOT_LIKE})::bigint AS real_signups_30d,
      (SELECT COUNT(DISTINCT distinct_id) FROM practiq.analytics_events
        WHERE type = '$pageview' AND created_at > NOW() - INTERVAL '7 days')::bigint AS uniq_7d_raw,
      (SELECT COUNT(DISTINCT distinct_id) FROM practiq.analytics_events
        WHERE type = '$pageview' AND created_at > NOW() - INTERVAL '7 days' AND ${REAL_TRAFFIC_WHERE})::bigint AS uniq_7d,
      (SELECT COUNT(DISTINCT distinct_id) FROM practiq.analytics_events
        WHERE type = '$pageview' AND created_at > NOW() - INTERVAL '1 day' AND ${REAL_TRAFFIC_WHERE})::bigint AS dau_24h,
      (SELECT COUNT(DISTINCT distinct_id) FROM practiq.analytics_events
        WHERE type = '$pageview' AND url LIKE '%/demo%' AND created_at > NOW() - INTERVAL '7 days' AND ${REAL_TRAFFIC_WHERE})::bigint AS demo_7d,
      (SELECT COUNT(DISTINCT distinct_id) FROM practiq.analytics_events
        WHERE type = 'workflow_audit_started' AND created_at > NOW() - INTERVAL '7 days' AND ${REAL_TRAFFIC_WHERE})::bigint AS audit_started,
      (SELECT COUNT(DISTINCT distinct_id) FROM practiq.analytics_events
        WHERE type = 'workflow_audit_completed' AND created_at > NOW() - INTERVAL '7 days' AND ${REAL_TRAFFIC_WHERE})::bigint AS audit_completed,
      (SELECT COUNT(DISTINCT distinct_id) FROM practiq.analytics_events
        WHERE type = 'workflow_audit_step_blocked' AND created_at > NOW() - INTERVAL '7 days' AND ${REAL_TRAFFIC_WHERE})::bigint AS audit_step_blocked,
      (SELECT COUNT(*) FILTER (WHERE cited_practiq) FROM public.geo_citations
        WHERE scanned_at > NOW() - INTERVAL '7 days')::bigint AS aeo_cited,
      (SELECT COUNT(*) FROM public.geo_citations
        WHERE scanned_at > NOW() - INTERVAL '7 days')::bigint AS aeo_total
  `,
  );
  return rows[0];
}

// ─── Stripe (real paid checkouts only) ────────────────────────
async function queryStripeRealPaid(): Promise<{ paid_7d: number; paid_30d: number }> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return { paid_7d: 0, paid_30d: 0 };
  const isOperator = (e?: string | null): boolean => {
    if (!e) return false;
    const x = e.toLowerCase();
    return (
      x.endsWith("@grindworks.ai") ||
      x.endsWith("@practiq.dev") ||
      x.endsWith("@practiq-test.cliwant.com") ||
      x.endsWith("@example.com") ||
      x.includes("smoke-test") ||
      x.includes("+e2e-") ||
      x.startsWith("verify@")
    );
  };
  const auth = `Basic ${Buffer.from(`${key}:`).toString("base64")}`;
  const fetchSessions = async (sinceUnix: number) => {
    const url = `https://api.stripe.com/v1/checkout/sessions?limit=100&created[gte]=${sinceUnix}`;
    const r = await fetch(url, { headers: { Authorization: auth } });
    if (!r.ok) return [];
    const j = (await r.json()) as { data?: Array<{ status: string; payment_status: string; customer_email?: string | null; customer_details?: { email?: string | null } | null }> };
    return j.data ?? [];
  };
  const now = Math.floor(Date.now() / 1000);
  const [s7, s30] = await Promise.all([
    fetchSessions(now - 7 * 86400),
    fetchSessions(now - 30 * 86400),
  ]);
  const realPaid = (arr: Awaited<ReturnType<typeof fetchSessions>>) =>
    arr.filter(
      (s) =>
        s.status === "complete" &&
        s.payment_status === "paid" &&
        !isOperator(s.customer_email ?? s.customer_details?.email ?? null),
    ).length;
  return { paid_7d: realPaid(s7), paid_30d: realPaid(s30) };
}

// ─── GSC (28d aggregate) ─────────────────────────────────────
function b64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function queryGSC(): Promise<{ clicks: number; imp: number; ctr_pct: number } | null> {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const key = JSON.parse(raw);
    const now = Math.floor(Date.now() / 1000);
    const claim = {
      iss: key.client_email,
      scope: "https://www.googleapis.com/auth/webmasters.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3500,
    };
    const header = { alg: "RS256", typ: "JWT", kid: key.private_key_id };
    const signing = `${b64url(Buffer.from(JSON.stringify(header)))}.${b64url(Buffer.from(JSON.stringify(claim)))}`;
    const signer = crypto.createSign("RSA-SHA256");
    signer.update(signing);
    signer.end();
    const jwt = `${signing}.${b64url(signer.sign(key.private_key))}`;
    const tokenR = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });
    if (!tokenR.ok) return null;
    const { access_token } = (await tokenR.json()) as { access_token: string };
    const today = new Date().toISOString().slice(0, 10);
    const start = new Date(Date.now() - 28 * 86400_000).toISOString().slice(0, 10);
    const r = await fetch(
      `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent("https://practiq.dev/")}/searchAnalytics/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ startDate: start, endDate: today, dimensions: [] }),
      },
    );
    if (!r.ok) return null;
    const j = (await r.json()) as { rows?: Array<{ clicks: number; impressions: number; ctr: number }> };
    const row = j.rows?.[0];
    if (!row) return null;
    return {
      clicks: row.clicks,
      imp: row.impressions,
      ctr_pct: row.ctr * 100,
    };
  } catch {
    return null;
  }
}

// ─── Trigger evaluation (mirrors CLI) ────────────────────────
function evaluateTriggers(
  d: ReturnType<typeof toNumbers>,
  gsc: { clicks: number; imp: number; ctr_pct: number } | null,
): string[] {
  const triggers: string[] = [];
  if (d.real_signups_7d >= 1)
    triggers.push("🚨 1+ real signup in 7d → activation analysis");
  if (d.real_paid_7d >= 1)
    triggers.push("🎉 1+ real paid checkout in 7d → onboarding focus");
  if (d.aeo_total > 0 && d.aeo_cited === 0)
    triggers.push("⚠ 0/N AEO citations → content gap deeper");
  if (gsc && gsc.ctr_pct < 0.3 && gsc.imp > 1000)
    triggers.push(
      `⚠ CTR ${gsc.ctr_pct.toFixed(2)}% on ${gsc.imp} imp → title rewrites not landing`,
    );
  if (d.audit_step_blocked > 10)
    triggers.push(
      `⚠ ${d.audit_step_blocked} step_blocked → audit form friction`,
    );
  if (d.audit_started >= 10 && d.audit_completed / d.audit_started < 0.3)
    triggers.push(
      `⚠ ${Math.round((d.audit_completed / Math.max(1, d.audit_started)) * 100)}% audit completion at ${d.audit_started} starts → form drop-off`,
    );
  return triggers;
}

function toNumbers(row: PulseRow, paid: { paid_7d: number; paid_30d: number }) {
  return {
    real_signups_7d: Number(row.real_signups_7d),
    real_signups_30d: Number(row.real_signups_30d),
    real_paid_7d: paid.paid_7d,
    real_paid_30d: paid.paid_30d,
    uniq_7d_raw: Number(row.uniq_7d_raw),
    uniq_7d: Number(row.uniq_7d),
    dau_24h: Number(row.dau_24h),
    demo_7d: Number(row.demo_7d),
    audit_started: Number(row.audit_started),
    audit_completed: Number(row.audit_completed),
    audit_step_blocked: Number(row.audit_step_blocked),
    aeo_cited: Number(row.aeo_cited),
    aeo_total: Number(row.aeo_total),
  };
}

// ─── Handler ──────────────────────────────────────────────────
async function handle(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "cron-only" }, { status: 401 });
  }
  try {
    const [row, paid, gsc] = await Promise.all([
      queryAll(),
      queryStripeRealPaid(),
      queryGSC(),
    ]);
    const d = toNumbers(row, paid);
    const triggers = evaluateTriggers(d, gsc);
    const date = new Date().toISOString().slice(0, 10);

    safeNotify("daily_pulse", {
      date,
      ...d,
      gsc_clicks_28d: gsc?.clicks ?? 0,
      gsc_imp_28d: gsc?.imp ?? 0,
      gsc_ctr_pct: gsc?.ctr_pct ?? 0,
      triggers,
    });

    return NextResponse.json({
      ok: true,
      date,
      metrics: d,
      gsc,
      triggers_count: triggers.length,
      triggers,
    });
  } catch (err) {
    console.error("[daily-pulse cron] error:", err);
    return NextResponse.json(
      { error: "internal", message: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
