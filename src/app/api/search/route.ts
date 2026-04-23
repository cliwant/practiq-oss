import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/search?q=...
 *
 * Unified keyword search across the operator's data:
 *   - clients (name, industry)
 *   - contexts (title, content, tags)
 *   - conversations (title)
 *   - approval items (title, aiNotes)
 *
 * Returns top results per bucket. The command palette uses this for
 * the ⌘K "global search" section so the operator can jump straight
 * to a fact or draft without first picking a client.
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = request.nextUrl.searchParams;
  const q = sp.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({
      clients: [],
      contexts: [],
      conversations: [],
      approvals: [],
    });
  }
  const limit = 6;

  const userId = session.user.id;

  const [clients, contexts, conversations, approvals] = await Promise.all([
    prisma.client.findMany({
      where: {
        userId,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { industry: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, industry: true, preferences: true },
      take: limit,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.clientContext.findMany({
      where: {
        client: { userId },
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { content: { contains: q, mode: "insensitive" } },
          { tags: { hasSome: [q.toLowerCase()] } },
        ],
      },
      select: {
        id: true,
        title: true,
        content: true,
        category: true,
        clientId: true,
        client: { select: { name: true, preferences: true } },
      },
      take: limit,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.conversation.findMany({
      where: {
        userId,
        title: { contains: q, mode: "insensitive" },
      },
      select: {
        id: true,
        title: true,
        clientId: true,
        client: { select: { name: true, preferences: true } },
      },
      take: limit,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.approvalItem.findMany({
      where: {
        userId,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { aiNotes: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        clientId: true,
        client: { select: { name: true, preferences: true } },
      },
      take: limit,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    }),
  ]);

  const pickColor = (prefs: unknown) =>
    ((prefs ?? {}) as { brandColor?: string }).brandColor ?? "#3b82f6";

  return NextResponse.json({
    clients: clients.map((c) => ({
      id: c.id,
      name: c.name,
      industry: c.industry,
      brandColor: pickColor(c.preferences),
    })),
    contexts: contexts.map((c) => ({
      id: c.id,
      title: c.title,
      snippet: c.content.slice(0, 120),
      category: c.category,
      clientId: c.clientId,
      clientName: c.client.name,
      clientBrandColor: pickColor(c.client.preferences),
    })),
    conversations: conversations.map((c) => ({
      id: c.id,
      title: c.title ?? "Untitled",
      clientId: c.clientId,
      clientName: c.client.name,
      clientBrandColor: pickColor(c.client.preferences),
    })),
    approvals: approvals.map((a) => ({
      id: a.id,
      title: a.title,
      type: a.type,
      status: a.status,
      clientId: a.clientId,
      clientName: a.client.name,
      clientBrandColor: pickColor(a.client.preferences),
    })),
  });
}
