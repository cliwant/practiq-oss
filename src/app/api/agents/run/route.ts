import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runAgent, runAgentForUser } from "@/lib/agents/runner";
import { DAILY_BRIEFING_AGENT } from "@/lib/agents/daily-briefing";

export const runtime = "nodejs";
// Allow up to 120s — one Claude call takes ~5s and we may fan out across
// a handful of clients in a single request.
export const maxDuration = 120;

const AGENT_REGISTRY = {
  daily_briefing: DAILY_BRIEFING_AGENT,
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
    const results = await runAgentForUser(agent, session.user.id);
    return NextResponse.json({
      runs: results.length,
      results,
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

  const result = await runAgent(agent, body.clientId);
  return NextResponse.json({ result });
}
