import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/approval-queue
 *
 * Returns the operator's pending approval items across every client,
 * sorted by priority desc, then deadline asc (closer first), then newest.
 *
 * Query params:
 *   status=pending_review|approved|rejected|dismissed|all  (default pending_review)
 *   clientId=<uuid>   (optional, filter to one client)
 *   limit=<1-200>     (default 100)
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = request.nextUrl.searchParams;
  const statusParam = sp.get("status") ?? "pending_review";
  const clientId = sp.get("clientId") ?? undefined;
  const limitParam = Number(sp.get("limit") ?? 100);
  const limit = Number.isFinite(limitParam) && limitParam > 0 && limitParam <= 200
    ? limitParam
    : 100;

  const where: {
    userId: string;
    status?: string;
    clientId?: string;
  } = { userId: session.user.id };
  if (statusParam !== "all") where.status = statusParam;
  if (clientId) where.clientId = clientId;

  const items = await prisma.approvalItem.findMany({
    where,
    orderBy: [
      { priority: "desc" },
      { deadline: "asc" },
      { createdAt: "desc" },
    ],
    take: limit,
    include: {
      client: {
        select: { id: true, name: true, industry: true, preferences: true },
      },
      // RUN 14: surface the linked AgentTask so the UI can show
      // cost / version / retry attempt next to each draft. The
      // operator wants to see "this briefing cost $0.22, agent
      // v1.0.0, succeeded on first try" inline.
      agentTask: {
        select: {
          id: true,
          agentType: true,
          agentVersion: true,
          attempt: true,
          usdCost: true,
          startedAt: true,
          completedAt: true,
        },
      },
    },
  });

  return NextResponse.json({
    items: items.map((i) => ({
      id: i.id,
      clientId: i.clientId,
      clientName: i.client.name,
      clientIndustry: i.client.industry,
      clientBrandColor:
        ((i.client.preferences ?? {}) as { brandColor?: string }).brandColor ??
        null,
      type: i.type,
      title: i.title,
      status: i.status,
      priority: i.priority,
      aiConfidence: i.aiConfidence,
      content: i.content,
      aiNotes: i.aiNotes,
      reviewerNotes: i.reviewerNotes,
      reviewedAt: i.reviewedAt?.toISOString() ?? null,
      deadline: i.deadline?.toISOString() ?? null,
      createdAt: i.createdAt.toISOString(),
      // RUN 14: agent task metadata (null if approval was created by
      // a non-agent flow, e.g. manual operator entry).
      agent: i.agentTask
        ? {
            type: i.agentTask.agentType,
            version: i.agentTask.agentVersion,
            attempt: i.agentTask.attempt,
            usdCost:
              i.agentTask.usdCost !== null && i.agentTask.usdCost !== undefined
                ? Number(i.agentTask.usdCost)
                : null,
            durationMs:
              i.agentTask.startedAt && i.agentTask.completedAt
                ? i.agentTask.completedAt.getTime() -
                  i.agentTask.startedAt.getTime()
                : null,
          }
        : null,
    })),
    counts: await summarizeCounts(session.user.id),
  });
}

async function summarizeCounts(userId: string) {
  const rows = await prisma.approvalItem.groupBy({
    by: ["status"],
    where: { userId },
    _count: { _all: true },
  });
  return Object.fromEntries(
    rows.map((r) => [r.status, r._count._all] as const),
  );
}
