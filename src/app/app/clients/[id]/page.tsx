import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ClientWorkspace } from "@/components/workspace/client-workspace";

export const dynamic = "force-dynamic";

/**
 * /app/clients/[id] — the actual work happens here.
 *
 * Loads the client, pinned contexts first, the most recent conversation
 * (if any) plus its tail, and the brand color. Hands the whole dossier
 * to ClientWorkspace which handles the tabbed UX.
 */
export default async function ClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) notFound();

  const client = await prisma.client.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!client) notFound();

  const contexts = await prisma.clientContext.findMany({
    where: { clientId: client.id },
    orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
    take: 100,
  });

  // Most recent conversation is where the operator is likely to continue.
  const recentConversation = await prisma.conversation.findFirst({
    where: { clientId: client.id, userId: session.user.id },
    orderBy: { updatedAt: "desc" },
  });
  const recentMessages = recentConversation
    ? await prisma.conversationMessage.findMany({
        where: { conversationId: recentConversation.id },
        orderBy: { createdAt: "asc" },
        take: 50,
      })
    : [];

  // ── AI priorities — pending approval items the agent surfaced for
  // this specific client. The Overview tab shows the top 3 so the
  // operator immediately sees "what the agent thinks I should do here"
  // without having to open the global Approval Queue.
  const pendingForClient = await prisma.approvalItem.findMany({
    where: {
      clientId: client.id,
      userId: session.user.id,
      status: "pending_review",
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    take: 5,
  });

  // ── Recent AI activity — interleaves last few agent runs with
  // operator decisions. Keep the lookup small (8 of each at most) and
  // merge/sort in memory; this beats a UNION query for code clarity
  // and the volume is tiny per client.
  const [recentTasks, recentDecisions] = await Promise.all([
    prisma.agentTask.findMany({
      where: { clientId: client.id, userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        agentType: true,
        status: true,
        summary: true,
        confidence: true,
        completedAt: true,
        createdAt: true,
      },
    }),
    prisma.approvalItem.findMany({
      where: {
        clientId: client.id,
        userId: session.user.id,
        status: { in: ["approved", "rejected", "modified", "dismissed"] },
      },
      orderBy: { reviewedAt: "desc" },
      take: 8,
      select: {
        id: true,
        type: true,
        title: true,
        status: true,
        aiConfidence: true,
        reviewedAt: true,
        createdAt: true,
      },
    }),
  ]);

  const prefs = (client.preferences ?? {}) as {
    brandColor?: string;
    reportTone?: string;
    preferredFormats?: string[];
    contactEmail?: string;
  };

  // Merge agent runs + operator decisions into a single time-sorted feed,
  // then trim to the most recent 6 events. The Overview shows this as a
  // 1-screen "what's been happening here" timeline.
  const activity = [
    ...recentTasks.map((t) => ({
      id: `task:${t.id}`,
      kind: "task_run" as const,
      label: agentLabel(t.agentType),
      detail: t.summary,
      status: t.status,
      confidence: t.confidence,
      occurredAt: (t.completedAt ?? t.createdAt).toISOString(),
    })),
    ...recentDecisions.map((d) => ({
      id: `appr:${d.id}`,
      kind: "approval" as const,
      label: d.title,
      detail: null,
      status: d.status,
      confidence: d.aiConfidence,
      occurredAt: (d.reviewedAt ?? d.createdAt).toISOString(),
    })),
  ]
    .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1))
    .slice(0, 6);

  return (
    <ClientWorkspace
      client={{
        id: client.id,
        name: client.name,
        industry: client.industry,
        userRole: client.userRole,
        relationshipMonths: client.relationshipMonths,
        brandColor: prefs.brandColor ?? "#3b82f6",
        reportTone: prefs.reportTone ?? "professional",
        preferredFormats: prefs.preferredFormats ?? ["docx", "xlsx"],
        contactEmail: prefs.contactEmail ?? null,
        updatedAt: client.updatedAt.toISOString(),
      }}
      contexts={contexts.map((c) => ({
        id: c.id,
        title: c.title,
        content: c.content,
        category: c.category,
        tags: c.tags,
        isPinned: c.isPinned,
        updatedAt: c.updatedAt.toISOString(),
      }))}
      priorities={pendingForClient.slice(0, 3).map((p) => ({
        id: p.id,
        type: p.type,
        title: p.title,
        priority: p.priority,
        aiConfidence: p.aiConfidence,
        aiNotes: p.aiNotes,
        createdAt: p.createdAt.toISOString(),
      }))}
      activity={activity}
      initialConversation={
        recentConversation
          ? {
              id: recentConversation.id,
              title: recentConversation.title ?? "Conversation",
              messages: recentMessages.map((m) => ({
                id: m.id,
                role: m.role as "user" | "assistant",
                content: m.content,
                createdAt: m.createdAt.toISOString(),
              })),
            }
          : null
      }
    />
  );
}

function agentLabel(agentType: string): string {
  switch (agentType) {
    case "daily_briefing":
      return "Daily briefing";
    case "anomaly_detector":
      return "Anomaly scan";
    case "close_prep":
      return "Close prep";
    case "comms_drafter":
      return "Comms drafter";
    case "context_extractor":
      return "Knowledge extraction";
    default:
      return agentType.replace(/_/g, " ");
  }
}
