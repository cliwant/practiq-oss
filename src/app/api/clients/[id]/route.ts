import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { adjustSubscriptionClientCount } from "@/lib/stripe/per-client-subscription";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/clients/[id]
 */
export async function GET(_request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const client = await prisma.client.findFirst({
    where: { id, userId: session.user.id },
    include: {
      contexts: { orderBy: { updatedAt: "desc" }, take: 10 },
      conversations: { orderBy: { updatedAt: "desc" }, take: 5 },
      outputs: {
        where: { isLatest: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  if (!client) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ client });
}

/**
 * PUT /api/clients/[id]
 */
export async function PUT(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // 소유권 확인
  const existing = await prisma.client.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const client = await prisma.client.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.industry && { industry: body.industry }),
        ...(body.userRole && { userRole: body.userRole }),
        ...(body.preferences && { preferences: body.preferences }),
        ...(body.relationshipMonths !== undefined && {
          relationshipMonths: body.relationshipMonths,
        }),
      },
    });

    return NextResponse.json({ client });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/clients/[id]
 */
export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.client.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.client.delete({ where: { id } });

  // Stage 3b billing hook (2026-05-15): decrement the Stripe per-client
  // subscription quantity. Trial users are no-ops. When clientCount
  // drops to 0 the subscription stays at quantity=0 (per D2 in
  // .cycle/plans/stage-3-per-client-billing.md) — leaves founding lock
  // intact and lets the user re-add a client later with no friction.
  try {
    await adjustSubscriptionClientCount({
      userId: session.user.id,
      delta: -1,
      clientId: id,
    });
  } catch (hookErr) {
    console.error(
      "[clients-delete] billing hook crashed:",
      hookErr instanceof Error ? hookErr.message : String(hookErr),
    );
  }

  return NextResponse.json({ success: true });
}
