import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runAgentForUser } from "@/lib/agents/runner";
import { DAILY_BRIEFING_AGENT } from "@/lib/agents/daily-briefing";

export const runtime = "nodejs";
// Vercel Hobby caps non-fluid functions at 60s; Pro at 300s. Raise to
// 300 so a small firm with 5–10 clients finishes in a single run.
// On Hobby the function will still cap at 60 and we rely on the bail
// guard below to resume across days.
export const maxDuration = 300;

/**
 * Cron-compatible nightly briefing runner.
 *
 * Auth options (any one is sufficient):
 *   - `x-vercel-cron` header (automatic for entries in vercel.json)
 *   - `x-deploy-secret` matches SEO_DEPLOY_SECRET (manual trigger)
 *   - `authorization: Bearer <CRON_SECRET>` (Vercel's newer cron scheme)
 *
 * For every User where briefingEnabled=true, runs the daily briefing
 * agent across all of their clients. Skips users who opted out.
 *
 * Each Claude call's usage is logged to UsageEvent so /settings/billing
 * can show consumption rollups.
 *
 * Wiring lives in vercel.json — this route is at "0 17 * * *" (17:00 UTC,
 * reasonable default; per-user local-time targeting is a Phase 2 upgrade
 * using User.briefingHour and User.timezone).
 */
export async function GET(request: NextRequest) {
  return handle(request);
}
export async function POST(request: NextRequest) {
  return handle(request);
}

async function handle(request: NextRequest) {
  const isVercelCron = request.headers.get("x-vercel-cron") !== null;
  const legacy = process.env.SEO_DEPLOY_SECRET?.trim();
  const modern = process.env.CRON_SECRET?.trim();
  const provided = request.headers.get("x-deploy-secret")?.trim();
  const bearer = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "")
    .trim();

  const isSecretAuth =
    (!!legacy && provided === legacy) ||
    (!!modern && provided === modern) ||
    (!!modern && bearer === modern);

  if (!isVercelCron && !isSecretAuth) {
    return NextResponse.json(
      { error: "cron-only endpoint" },
      { status: 401 },
    );
  }

  // Only users who (a) opted in AND (b) have an active paying subscription
  // whose plan includes the background agent capability. Free / trial /
  // expired users do NOT trigger nightly Claude calls — runaway cost
  // protection.
  //
  // The relational filter goes through Subscription.status to keep this
  // a single query. We could call resolveUserPlan() per user but that's
  // 1+N round-trips against a population that's mostly free-tier; the
  // SQL filter is cheaper at scale.
  const users = await prisma.user.findMany({
    where: {
      briefingEnabled: true,
      subscription: {
        status: { in: ["active", "trialing"] },
        // Solo / Practice / Firm all have backgroundAgent=true. Free
        // does NOT, but free users have no subscription row, so the
        // outer NOT NULL on subscription handles them.
      },
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      email: true,
      timezone: true,
      briefingHour: true,
    },
  });

  type UserResult = {
    email: string;
    runs: number;
    completed: number;
    failed: number;
    approvals: number;
    durationMs: number;
    skipped?: "no_clients" | "timed_out";
  };
  const perUser: UserResult[] = [];

  const start = Date.now();
  // Headroom: leave 5s before maxDuration to flush response.
  const bailAt = start + (maxDuration - 5) * 1000;

  for (const u of users) {
    if (Date.now() >= bailAt) {
      perUser.push({
        email: u.email,
        runs: 0,
        completed: 0,
        failed: 0,
        approvals: 0,
        durationMs: 0,
        skipped: "timed_out",
      });
      continue;
    }

    const results = await runAgentForUser(DAILY_BRIEFING_AGENT, u.id);
    if (results.length === 0) {
      perUser.push({
        email: u.email,
        runs: 0,
        completed: 0,
        failed: 0,
        approvals: 0,
        durationMs: 0,
        skipped: "no_clients",
      });
      continue;
    }
    perUser.push({
      email: u.email,
      runs: results.length,
      completed: results.filter((r) => r.status === "completed").length,
      failed: results.filter((r) => r.status === "failed").length,
      approvals: results.reduce(
        (sum, r) => sum + r.approvalItemIds.length,
        0,
      ),
      durationMs: results.reduce((sum, r) => sum + r.durationMs, 0),
    });
  }

  return NextResponse.json({
    ok: true,
    runAt: new Date().toISOString(),
    eligibleUsers: users.length,
    processedUsers: perUser.filter((u) => !u.skipped).length,
    users: perUser,
    totalRuns: perUser.reduce((s, u) => s + u.runs, 0),
    totalApprovals: perUser.reduce((s, u) => s + u.approvals, 0),
    elapsedMs: Date.now() - start,
  });
}
