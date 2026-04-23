import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ApprovalQueueScreen } from "@/components/workspace/approval-queue-screen";

export const dynamic = "force-dynamic";

/**
 * /app/tasks — the Approval Queue.
 *
 * This is the primary surface for the AI-Native interaction loop:
 * the operator opens this, sees everything the agent prepared
 * overnight, and dispatches each item in under 90 seconds.
 *
 * Server renders the initial snapshot for instant load; the client
 * component hydrates and handles the review ⌨ flow from there.
 */
export default async function ApprovalQueuePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/app/tasks");

  const items = await prisma.approvalItem.findMany({
    where: { userId: session.user.id, status: "pending_review" },
    orderBy: [
      { priority: "desc" },
      { deadline: "asc" },
      { createdAt: "desc" },
    ],
    take: 200,
    include: {
      client: {
        select: { id: true, name: true, industry: true, preferences: true },
      },
    },
  });

  const serialized = items.map((i) => {
    const prefs = (i.client.preferences ?? {}) as { brandColor?: string };
    return {
      id: i.id,
      clientId: i.clientId,
      clientName: i.client.name,
      clientIndustry: i.client.industry,
      clientBrandColor: prefs.brandColor ?? "#3b82f6",
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
    };
  });

  // Historical summary counters so the top of the screen has honest numbers
  // even when the pending queue is empty.
  const counts = await prisma.approvalItem.groupBy({
    by: ["status"],
    where: { userId: session.user.id },
    _count: { _all: true },
  });
  const countMap = Object.fromEntries(
    counts.map((c) => [c.status, c._count._all]),
  );

  return <ApprovalQueueScreen initialItems={serialized} counts={countMap} />;
}
