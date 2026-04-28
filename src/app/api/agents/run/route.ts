import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runAgent } from "@/lib/agents/runner";
import { dispatchSingleAgentForUser } from "@/lib/agents/dispatch";
import { DAILY_BRIEFING_AGENT } from "@/lib/agents/daily-briefing";
import { ANOMALY_DETECTOR_AGENT } from "@/lib/agents/anomaly-detector";
import { COMMS_DRAFTER_AGENT } from "@/lib/agents/comms-drafter";

export const runtime = "nodejs";
// Allow up to 300s. In dev with the CLI provider, each claude-cli spawn
// takes ~30-50s cold. At concurrency=3 a 10-client firm finishes in
// ~150s; lower numbers of clients finish faster but we keep headroom
// for outliers. On Vercel this requires the Pro plan (max 300s).
export const maxDuration = 300;

// RUN 24 (audit fix #6): ANOMALY_DETECTOR_AGENT + COMMS_DRAFTER_AGENT
// were exported in RUN 4 but never registered here, so the operator-
// triggered run path silently rejected them ("agent must be one of:
// daily_briefing"). Adding them lights up the entire P2-02 + P2-03
// surface — the agents now actually run.
const AGENT_REGISTRY = {
  daily_briefing: DAILY_BRIEFING_AGENT,
  anomaly_detector: ANOMALY_DETECTOR_AGENT,
  comms_drafter: COMMS_DRAFTER_AGENT,
} as const;

type AgentKey = keyof typeof AGENT_REGISTRY;

/**
 * POST /api/agents/run
 *
 * Body:
 *   { agent: "daily_briefing", clientId?: string, scope?: "all" }
 *
 * Default scope is single-client (uses clientId). "all" fans out across
 * every client the operator owns. Auth-only; no deploy-secret path yet —
 * schedulers will hit this with the operator's own session cookie in
 * Phase F, or add a cron-secret header later.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { agent?: string; clientId?: string; scope?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const agentKey = body.agent as AgentKey | undefined;
  if (!agentKey || !(agentKey in AGENT_REGISTRY)) {
    return NextResponse.json(
      {
        error: `agent must be one of: ${Object.keys(AGENT_REGISTRY).join(", ")}`,
      },
      { status: 400 },
    );
  }
  const agent = AGENT_REGISTRY[agentKey];

  if (body.scope === "all") {
    // Operator-triggered scope=all goes through the dispatcher so the
    // per-firm spend ceiling + cumulative token budget protect us
    // against a buggy operator clicking "run on every client" twice.
    const dispatch = await dispatchSingleAgentForUser({
      userId: session.user.id,
      agent,
      concurrency: 3,
      totalTokenBudget: 80_000,
    });
    return NextResponse.json({
      runs: dispatch.attempted,
      completed: dispatch.completed,
      succeeded: dispatch.succeeded,
      failed: dispatch.failed,
      skippedBudget: dispatch.skippedBudget,
      skippedSpendCeiling: dispatch.skippedSpendCeiling,
      inputTokens: dispatch.inputTokens,
      outputTokens: dispatch.outputTokens,
      durationMs: dispatch.durationMs,
      results: dispatch.runs,
    });
  }

  if (!body.clientId) {
    return NextResponse.json(
      { error: "clientId is required unless scope=all" },
      { status: 400 },
    );
  }
  // Ownership check before handing off to the runner.
  const owns = await prisma.client.findFirst({
    where: { id: body.clientId, userId: session.user.id },
    select: { id: true },
  });
  if (!owns) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  // The AGENT_REGISTRY value is a union (Briefing | Anomaly | Comms) and
  // runAgent's `O` parameter can't be inferred against the union, so we
  // route through the dispatcher's generic-relaxed AnyAgent shape.
  // Functionally equivalent to runAgent(agent, body.clientId) — the
  // dispatcher's serialise/budget logic short-circuits when there's only
  // one task — but it lets us keep the call site type-clean.
  const { dispatchAgentTasks } = await import("@/lib/agents/dispatch");
  const dispatch = await dispatchAgentTasks(
    [{ agent, clientId: body.clientId }],
    {
      userId: session.user.id,
      // Single-client manual run gets a tight budget — the operator
      // can re-trigger if it bumps the cap.
      totalTokenBudget: 20_000,
      // Skip dedup: a manual operator-triggered run is by definition
      // "I want to run it now". Dispatcher dedup is for cron overlap.
      skipDedupCheck: true,
    },
  );
  return NextResponse.json({ result: dispatch.runs[0] ?? null });
}
