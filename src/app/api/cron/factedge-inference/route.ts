/**
 * /api/cron/factedge-inference — RUN-post-lovable polish.
 *
 * Daily cron that walks every active subscriber's clients and infers
 * FactEdges between active ClientFact rows. Closes audit finding #8
 * (FactEdge model never written by non-test code).
 *
 * Schedule: 04:00 UTC. Runs after digest-compactor (02:30) so the
 * digest has the latest facts but BEFORE nightly-briefing (17:00) so
 * the morning briefing's T2 vector tier can pick up freshly-inferred
 * relationships.
 *
 * Cost guardrail per run (10 firms × 5 clients × 1 Claude call ×
 * ~600 tokens out × Sonnet 4.5): ~$0.50/day across the whole platform.
 * Per-client `inferEdgesForClient` skips when < 5 active facts so
 * brand-new clients don't produce noise.
 *
 * Side-effect safety: failures swallow per client — one bad client
 * doesn't kill the cron. Slack agent_cron_summary / _warning fires
 * at the end with aggregate counters.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { inferEdgesForClient } from "@/lib/temporal-facts-inference";
import { notifySlack } from "@/lib/notifications/slack";
import { log } from "@/lib/observability/logger";

export const runtime = "nodejs";
export const maxDuration = 300;

interface PerClientStat {
  clientId: string;
  facts: number;
  edgesProposed: number;
  edgesWritten: number;
  edgesSkippedExisting: number;
  usdCost: number;
  durationMs: number;
  error?: string;
}

async function handle(request: NextRequest): Promise<NextResponse> {
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
    return NextResponse.json({ error: "cron-only endpoint" }, { status: 401 });
  }

  // Walk every active subscriber's clients. Filtering to the subscription
  // active/trialing population keeps the per-day cost bounded — free /
  // expired users don't trigger Claude calls.
  const users = await prisma.user.findMany({
    where: {
      subscription: { status: { in: ["active", "trialing"] } },
    },
    select: {
      id: true,
      email: true,
      clients: { select: { id: true } },
    },
  });

  const start = Date.now();
  const bailAt = start + (300 - 5) * 1000;
  const perClient: PerClientStat[] = [];
  let totalUsdCost = 0;
  let totalEdgesWritten = 0;
  let totalEdgesProposed = 0;
  let clientsProcessed = 0;
  let clientsErrored = 0;

  for (const u of users) {
    if (Date.now() >= bailAt) break;
    for (const c of u.clients) {
      if (Date.now() >= bailAt) break;
      const r = await inferEdgesForClient({
        clientId: c.id,
        userId: u.id,
      });
      clientsProcessed++;
      if (r.error) clientsErrored++;
      totalUsdCost += r.usdCost;
      totalEdgesWritten += r.edgesWritten;
      totalEdgesProposed += r.edgesProposed;
      perClient.push({
        clientId: c.id,
        facts: r.factsConsidered,
        edgesProposed: r.edgesProposed,
        edgesWritten: r.edgesWritten,
        edgesSkippedExisting: r.edgesSkippedExisting,
        usdCost: r.usdCost,
        durationMs: r.durationMs,
        ...(r.error ? { error: r.error } : {}),
      });
      log.info("factedge-inference client done", {
        cron: "factedge-inference",
        clientId: c.id,
        userId: u.id,
        facts: r.factsConsidered,
        edgesWritten: r.edgesWritten,
        edgesProposed: r.edgesProposed,
        usdCost: r.usdCost,
      });
    }
  }

  const elapsedMs = Date.now() - start;
  const isWorrying = clientsErrored > 0 || (clientsProcessed > 0 && totalEdgesWritten === 0 && totalEdgesProposed === 0);
  await notifySlack(
    isWorrying ? "agent_cron_warning" : "agent_cron_summary",
    {
      cron: "factedge-inference",
      eligibleUsers: users.length,
      processedUsers: users.length,
      totalRuns: clientsProcessed,
      succeeded: clientsProcessed - clientsErrored,
      failed: clientsErrored,
      retried: 0,
      approvals: totalEdgesWritten,
      usdCost: Math.round(totalUsdCost * 10_000) / 10_000,
      inputTokens: 0,
      outputTokens: 0,
      skippedDuplicate: 0,
      skippedSpendCeiling: 0,
      skippedBudget: 0,
      elapsedSec: Math.round(elapsedMs / 1000),
      failureRatePct:
        clientsProcessed > 0
          ? Math.round((clientsErrored / clientsProcessed) * 1000) / 10
          : 0,
    },
  );

  return NextResponse.json({
    ok: true,
    cron: "factedge-inference",
    runAt: new Date().toISOString(),
    eligibleUsers: users.length,
    clientsProcessed,
    clientsErrored,
    totalEdgesProposed,
    totalEdgesWritten,
    totalUsdCost: Math.round(totalUsdCost * 10_000) / 10_000,
    elapsedMs,
    perClient,
  });
}

export async function GET(request: NextRequest) {
  return handle(request);
}
export async function POST(request: NextRequest) {
  return handle(request);
}
