import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dispatchSingleAgentForUser } from "@/lib/agents/dispatch";
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
    succeeded: number;
    failed: number;
    approvals: number;
    inputTokens: number;
    outputTokens: number;
    skippedBudget: number;
    skippedSpendCeiling: number;
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
        succeeded: 0,
        failed: 0,
        approvals: 0,
        inputTokens: 0,
        outputTokens: 0,
        skippedBudget: 0,
        skippedSpendCeiling: 0,
        durationMs: 0,
        skipped: "timed_out",
      });
      continue;
    }

    // Dispatcher with budget + per-(client × agentType) serialisation.
    // 80K-token cap per user · per night is generous: a single firm
    // running ~10 clients × 4–6K tokens/run still has headroom 2× over
    // a typical run. Spend-ceiling pre-check inside the dispatcher
    // cuts off any user whose plan budget is already burned through.
    const dispatch = await dispatchSingleAgentForUser({
      userId: u.id,
      agent: DAILY_BRIEFING_AGENT,
      concurrency: 3,
      totalTokenBudget: 80_000,
    });
    if (dispatch.attempted === 0) {
      perUser.push({
        email: u.email,
        runs: 0,
        completed: 0,
        succeeded: 0,
        failed: 0,
        approvals: 0,
        inputTokens: 0,
        outputTokens: 0,
        skippedBudget: 0,
        skippedSpendCeiling: 0,
        durationMs: 0,
        skipped: "no_clients",
      });
      continue;
    }
    perUser.push({
      email: u.email,
      runs: dispatch.attempted,
      completed: dispatch.completed,
      succeeded: dispatch.succeeded,
      failed: dispatch.failed,
      approvals: dispatch.runs.reduce(
        (sum, r) => sum + r.approvalItemIds.length,
        0,
      ),
      inputTokens: dispatch.inputTokens,
      outputTokens: dispatch.outputTokens,
      skippedBudget: dispatch.skippedBudget,
      skippedSpendCeiling: dispatch.skippedSpendCeiling,
      durationMs: dispatch.durationMs,
    });
  }

  return NextResponse.json({
    ok: true,
    runAt: new Date().toISOString(),
    eligibleUsers: users.length,
    processedUsers: perUser.filter((u) => !u.skipped).length,
    users: perUser,
    totalRuns: perUser.reduce((s, u) => s + u.runs, 0),
    totalCompleted: perUser.reduce((s, u) => s + u.completed, 0),
    totalApprovals: perUser.reduce((s, u) => s + u.approvals, 0),
    totalInputTokens: perUser.reduce((s, u) => s + u.inputTokens, 0),
    totalOutputTokens: perUser.reduce((s, u) => s + u.outputTokens, 0),
    totalSkippedBudget: perUser.reduce((s, u) => s + u.skippedBudget, 0),
    totalSkippedSpendCeiling: perUser.reduce(
      (s, u) => s + u.skippedSpendCeiling,
      0,
    ),
    elapsedMs: Date.now() - start,
  });
}
