import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { embedAndPersistContext } from "@/lib/embeddings";

type Params = { params: Promise<{ id: string }> };

const VALID_CATEGORIES = new Set([
  "decision",
  "document",
  "note",
  "meeting_summary",
  "metric",
]);

/**
 * GET /api/clients/[id]/contexts
 *
 * List contexts for a client. Query params:
 *   - category: filter by category
 *   - pinned: "true" returns only pinned
 *   - q: keyword search on title + content (case-insensitive)
 *   - limit: 1-100, default 50
 *
 * Contexts are sorted pinned-first, then newest updated.
 */
export async function GET(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Ownership check before touching sub-resources.
  const client = await prisma.client.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });
  if (!client) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const sp = request.nextUrl.searchParams;
  const category = sp.get("category");
  const pinnedOnly = sp.get("pinned") === "true";
  const query = sp.get("q")?.trim();
  const limitParam = Number(sp.get("limit"));
  const limit =
    Number.isFinite(limitParam) && limitParam > 0 && limitParam <= 100
      ? limitParam
      : 50;

  const where: {
    clientId: string;
    category?: string;
    isPinned?: boolean;
    OR?: Array<{ title?: { contains: string; mode: "insensitive" }; content?: { contains: string; mode: "insensitive" } }>;
  } = { clientId: id };
  if (category && VALID_CATEGORIES.has(category)) where.category = category;
  if (pinnedOnly) where.isPinned = true;
  if (query) {
    where.OR = [
      { title: { contains: query, mode: "insensitive" } },
      { content: { contains: query, mode: "insensitive" } },
    ];
  }

  const contexts = await prisma.clientContext.findMany({
    where,
    orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
    take: limit,
  });

  return NextResponse.json({ contexts });
}

/**
 * POST /api/clients/[id]/contexts
 *
 * Create a new context entry. Body:
 *   { title: string, content: string, category: ContextCategory,
 *     tags?: string[], isPinned?: boolean }
 */
export async function POST(request: NextRequest, { params }: Params) {
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

  let body: {
    title?: string;
    content?: string;
    category?: string;
    tags?: string[];
    isPinned?: boolean;
    createdBy?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const title = body.title?.trim();
  const content = body.content?.trim();
  const category = body.category?.trim();

  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (!content) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }
  if (!category || !VALID_CATEGORIES.has(category)) {
    return NextResponse.json(
      {
        error: `category must be one of: ${[...VALID_CATEGORIES].join(", ")}`,
      },
      { status: 400 },
    );
  }

  const tags = Array.isArray(body.tags)
    ? body.tags.filter((t) => typeof t === "string").slice(0, 20)
    : [];

  const context = await prisma.clientContext.create({
    data: {
      clientId: id,
      title,
      content,
      category,
      tags,
      isPinned: body.isPinned === true,
      // createdBy is a FK to User; default to the authed operator.
      createdBy: session.user.id,
    },
  });

  // Round 12 (L2.A): persist the embedding inline so the next chat
  // turn's T2 vector retrieval sees this row. Fire-and-forget so the
  // operator's POST response stays snappy even if OpenRouter is slow;
  // the 6-hour /api/cron/embeddings-backfill cron mops up any rows
  // this fire-and-forget call missed.
  void embedAndPersistContext(context.id, content).catch(() => {});

  return NextResponse.json({ context }, { status: 201 });
}
