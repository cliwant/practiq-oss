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

  const prefs = (client.preferences ?? {}) as {
    brandColor?: string;
    reportTone?: string;
    preferredFormats?: string[];
    contactEmail?: string;
  };

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
