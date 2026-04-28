/**
 * Shared agent-cron runner — RUN 24 (audit fixes #2 + #6 + #13).
 *
 * Three nightly agents (daily_briefing, anomaly_detector, comms_drafter)
 * each had their own cron route copy-pasting the same auth + bail-out
 * + per-user dispatch loop. The audit found:
 *
 *   #2 Slack alerts missing on cron completion / failure
 *   #6 Anomaly + Comms agents NEVER scheduled in vercel.json
 *  #13 Other crons exist but not in vercel.json
 *
 * This module centralises the cron handler so every nightly agent uses
 * the same auth path, bail timer, dispatcher options, summary shape,
 * and Slack alert. Adding a new nightly agent is now one route file
 * + one vercel.json entry.
 */
import { NextRequest, NextResponse } from "next/server";
import type { AgentDefinition } from "./runner";
import { dispatchSingleAgentForUser } from "./dispatch";
import { prisma } from "@/lib/prisma";
import { notifySlack } from "@/lib/notifications/slack";

export interface AgentCronOptions {
  /** Agent definition to fan out across each eligible user's clients. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  agent: AgentDefinition<unknown, any>;
  /** Per-user token budget the dispatcher enforces. Default 80K. */
  totalTokenBudget?: number;
  /** Concurrency across (clientId × agentType) keys. Default 3. */
  concurrency?: number;
  /** maxDuration the calling route declares — used for the bail-out timer. */
  maxDurationSec: number;
  /** Logical name surfaced in the Slack notification + JSON response. */
  cronName: string;
  /** When true, skip nightly run if the user opted out via briefingEnabled=false.
   *  daily_briefing uses this; anomaly_detector + comms_drafter run on every
   *  active subscriber regardless of the briefing toggle. */
  respectBriefingEnabled?: boolean;
}

interface UserResult {
  email: string;
  runs: number;
  completed: number;
  succeeded: number;
  failed: number;
  approvals: number;
  inputTokens: number;
  outputTokens: number;
  usdCost: number;
  skippedBudget: number;
  skippedSpendCeiling: number;
  skippedDuplicate: number;
  retried: number;
  durationMs: number;
  skipped?: "no_clients" | "timed_out";
}

/**
 * Execute an agent cron with the unified shape every nightly agent
 * uses. Returns a NextResponse the route handler can return verbatim.
 */
export async function runAgentCronHandler(
  request: NextRequest,
  opts: AgentCronOptions,
): Promise<NextResponse> {
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

  const userWhere = opts.respectBriefingEnabled
    ? {
        briefingEnabled: true,
        subscription: { status: { in: ["active", "trialing"] } },
      }
    : { subscription: { status: { in: ["active", "trialing"] } } };

  const users = await prisma.user.findMany({
    where: userWhere,
    orderBy: { updatedAt: "desc" },
    select: { id: true, email: true },
  });

  const perUser: UserResult[] = [];
  const start = Date.now();
  const bailAt = start + (opts.maxDurationSec - 5) * 1000;

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
        usdCost: 0,
        skippedBudget: 0,
        skippedSpendCeiling: 0,
        skippedDuplicate: 0,
        retried: 0,
        durationMs: 0,
        skipped: "timed_out",
      });
      continue;
    }
    const dispatch = await dispatchSingleAgentForUser({
      userId: u.id,
      agent: opts.agent,
      concurrency: opts.concurrency ?? 3,
      totalTokenBudget: opts.totalTokenBudget ?? 80_000,
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
        usdCost: 0,
        skippedBudget: 0,
        skippedSpendCeiling: 0,
        skippedDuplicate: 0,
        retried: 0,
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
      usdCost: dispatch.usdCost,
      skippedBudget: dispatch.skippedBudget,
      skippedSpendCeiling: dispatch.skippedSpendCeiling,
      skippedDuplicate: dispatch.skippedDuplicate,
      retried: dispatch.retried,
      durationMs: dispatch.durationMs,
    });
  }

  // Aggregate totals
  const totals = perUser.reduce(
    (acc, u) => {
      acc.runs += u.runs;
      acc.completed += u.completed;
      acc.succeeded += u.succeeded;
      acc.failed += u.failed;
      acc.approvals += u.approvals;
      acc.inputTokens += u.inputTokens;
      acc.outputTokens += u.outputTokens;
      acc.usdCost += u.usdCost;
      acc.skippedBudget += u.skippedBudget;
      acc.skippedSpendCeiling += u.skippedSpendCeiling;
      acc.skippedDuplicate += u.skippedDuplicate;
      acc.retried += u.retried;
      return acc;
    },
    {
      runs: 0,
      completed: 0,
      succeeded: 0,
      failed: 0,
      approvals: 0,
      inputTokens: 0,
      outputTokens: 0,
      usdCost: 0,
      skippedBudget: 0,
      skippedSpendCeiling: 0,
      skippedDuplicate: 0,
      retried: 0,
    },
  );

  const elapsedMs = Date.now() - start;

  // RUN 24 audit fix #2: emit Slack notification on cron completion
  // so silent partial outages (e.g. all users hit spend ceiling) are
  // visible to the operator. Use a quality-graded type so non-trivial
  // failures stand out.
  const failureRate =
    totals.runs > 0 ? totals.failed / totals.runs : 0;
  const isWorrying =
    totals.failed > 0 ||
    totals.skippedSpendCeiling > 0 ||
    totals.skippedBudget > 0 ||
    failureRate > 0.05;
  await notifySlack(
    isWorrying ? "agent_cron_warning" : "agent_cron_summary",
    {
      cron: opts.cronName,
      eligibleUsers: users.length,
      processedUsers: perUser.filter((u) => !u.skipped).length,
      totalRuns: totals.runs,
      succeeded: totals.succeeded,
      failed: totals.failed,
      retried: totals.retried,
      approvals: totals.approvals,
      usdCost: Math.round(totals.usdCost * 10_000) / 10_000,
      inputTokens: totals.inputTokens,
      outputTokens: totals.outputTokens,
      skippedDuplicate: totals.skippedDuplicate,
      skippedSpendCeiling: totals.skippedSpendCeiling,
      skippedBudget: totals.skippedBudget,
      elapsedSec: Math.round(elapsedMs / 1000),
      failureRatePct: Math.round(failureRate * 1000) / 10,
    },
  );

  return NextResponse.json({
    ok: true,
    cron: opts.cronName,
    runAt: new Date().toISOString(),
    eligibleUsers: users.length,
    processedUsers: perUser.filter((u) => !u.skipped).length,
    users: perUser,
    totals,
    elapsedMs,
  });
}
