import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/clients/[id]/activity
 *
 * Unified, time-sorted feed of everything that happened on this client:
 *   - Agent runs (AgentTask)
 *   - Approval items (created + reviewed)
 *   - Context changes (audit log)
 *   - File uploads
 *
 * The client timeline is the "audit trail" CPAs actually ask for — the
 * compliance pattern that separates a serious product from a ChatGPT
 * wrapper. We stitch it from AuditLog + AgentTask + ApprovalItem in a
 * single query per source, then merge in-memory.
 */
export async function GET(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const client = await prisma.client.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });
  if (!client) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const sp = request.nextUrl.searchParams;
  const limit = Math.max(
    1,
    Math.min(200, Number(sp.get("limit") ?? 50)),
  );

  // Serialize the 3 queries (instead of Promise.all) with a short
  // retry on transient pool errors. The prisma dev server occasionally
  // drops idle connections; parallel queries would then race and one
  // would get "Connection terminated unexpectedly" while the others
  // succeed. Serial + retry keeps the timeline loading even under a
  // flaky local pg.
  const audit = await withDbRetry(() =>
    prisma.auditLog.findMany({
      where: { clientId: id },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
  );
  const tasks = await withDbRetry(() =>
    prisma.agentTask.findMany({
      where: { clientId: id },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        agentType: true,
        status: true,
        summary: true,
        createdAt: true,
        completedAt: true,
      },
    }),
  );
  const approvals = await withDbRetry(() =>
    prisma.approvalItem.findMany({
      where: { clientId: id },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        type: true,
        title: true,
        status: true,
        priority: true,
        reviewedAt: true,
        createdAt: true,
      },
    }),
  );

  type FeedEvent = {
    id: string;
    kind:
      | "agent_run"
      | "approval_created"
      | "approval_reviewed"
      | "context_extracted"
      | "context_change"
      | "other";
    title: string;
    subtitle?: string;
    at: string;
    details?: unknown;
  };

  const events: FeedEvent[] = [];

  for (const t of tasks) {
    events.push({
      id: `task:${t.id}`,
      kind: "agent_run",
      title: labelForAgent(t.agentType, t.status),
      subtitle: t.summary ?? undefined,
      at: (t.completedAt ?? t.createdAt).toISOString(),
      details: { agentType: t.agentType, status: t.status },
    });
  }

  for (const a of approvals) {
    events.push({
      id: `approval-created:${a.id}`,
      kind: "approval_created",
      title: `Agent prepared: ${a.title}`,
      subtitle: `${a.type} · priority ${a.priority}`,
      at: a.createdAt.toISOString(),
      details: { approvalId: a.id, type: a.type, status: a.status },
    });
    if (a.reviewedAt) {
      events.push({
        id: `approval-reviewed:${a.id}`,
        kind: "approval_reviewed",
        title: `You ${a.status.replace("_", " ")}: ${a.title}`,
        at: a.reviewedAt.toISOString(),
        details: { approvalId: a.id, status: a.status },
      });
    }
  }

  for (const log of audit) {
    const action = log.action;
    if (
      action.startsWith("agent_") ||
      action.startsWith("approval_")
    ) {
      // Those are already represented by the specialized rows above, so
      // skip the duplicate to keep the feed compact.
      continue;
    }
    const kind: FeedEvent["kind"] =
      action === "context_extracted" ? "context_extracted" : "context_change";
    events.push({
      id: `audit:${log.id}`,
      kind,
      title: humanizeAuditAction(action),
      subtitle: summarizeDetails(log.details),
      at: log.createdAt.toISOString(),
      details: log.details,
    });
  }

  events.sort((a, b) => (a.at < b.at ? 1 : -1));

  return NextResponse.json({ events: events.slice(0, limit) });
}

function labelForAgent(agentType: string, status: string): string {
  const base =
    agentType === "daily_briefing"
      ? "Daily briefing"
      : agentType
          .split("_")
          .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
          .join(" ");
  if (status === "failed") return `${base} failed`;
  if (status === "completed") return `${base} ran`;
  if (status === "running") return `${base} is running`;
  return `${base} ${status}`;
}

function humanizeAuditAction(action: string): string {
  if (action === "context_extracted") return "Knowledge extracted from document";
  return action.replace(/_/g, " ");
}

/**
 * Retry a Prisma call once on transient connection errors. The
 * @prisma/adapter-pg pool occasionally sees "Connection terminated
 * unexpectedly" when the pg server closes an idle connection; the
 * second call picks up a fresh connection.
 */
async function withDbRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/connection terminated|socket|econnreset/i.test(msg)) {
      // One quick retry, no backoff — the pool reconnects immediately.
      return await fn();
    }
    throw err;
  }
}

function summarizeDetails(details: unknown): string | undefined {
  if (!details || typeof details !== "object") return undefined;
  const d = details as Record<string, unknown>;
  if (typeof d.sourceName === "string" && typeof d.entryCount === "number") {
    return `${d.entryCount} entries from ${d.sourceName}`;
  }
  if (typeof d.summary === "string") return d.summary;
  return undefined;
}
