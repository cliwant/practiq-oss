import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string; contextId: string }> };

const VALID_CATEGORIES = new Set([
  "decision",
  "document",
  "note",
  "meeting_summary",
  "metric",
]);

// All three handlers start the same way: verify session, verify the client
// belongs to the user, verify the context belongs to the client.
async function authorize(
  clientId: string,
  contextId: string,
  userId: string,
) {
  const client = await prisma.client.findFirst({
    where: { id: clientId, userId },
    select: { id: true },
  });
  if (!client) return { ok: false as const, status: 404 };

  const context = await prisma.clientContext.findFirst({
    where: { id: contextId, clientId },
  });
  if (!context) return { ok: false as const, status: 404 };

  return { ok: true as const, context };
}

/** GET /api/clients/[id]/contexts/[contextId] */
export async function GET(_request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id, contextId } = await params;
  const res = await authorize(id, contextId, session.user.id);
  if (!res.ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ context: res.context });
}

/**
 * PUT /api/clients/[id]/contexts/[contextId]
 *
 * Partial update. Only fields present in the body are applied.
 * Body: { title?, content?, category?, tags?, isPinned? }
 */
export async function PUT(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id, contextId } = await params;
  const res = await authorize(id, contextId, session.user.id);
  if (!res.ok) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: {
    title?: string;
    content?: string;
    category?: string;
    tags?: string[];
    isPinned?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const data: {
    title?: string;
    content?: string;
    category?: string;
    tags?: string[];
    isPinned?: boolean;
  } = {};
  if (typeof body.title === "string") data.title = body.title.trim();
  if (typeof body.content === "string") data.content = body.content.trim();
  if (typeof body.category === "string") {
    if (!VALID_CATEGORIES.has(body.category)) {
      return NextResponse.json(
        {
          error: `category must be one of: ${[...VALID_CATEGORIES].join(", ")}`,
        },
        { status: 400 },
      );
    }
    data.category = body.category;
  }
  if (Array.isArray(body.tags)) {
    data.tags = body.tags.filter((t) => typeof t === "string").slice(0, 20);
  }
  if (typeof body.isPinned === "boolean") data.isPinned = body.isPinned;

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "no updatable fields supplied" },
      { status: 400 },
    );
  }

  const context = await prisma.clientContext.update({
    where: { id: contextId },
    data,
  });
  return NextResponse.json({ context });
}

/** DELETE /api/clients/[id]/contexts/[contextId] */
export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id, contextId } = await params;
  const res = await authorize(id, contextId, session.user.id);
  if (!res.ok) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.clientContext.delete({ where: { id: contextId } });
  return NextResponse.json({ success: true });
}
