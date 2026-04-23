import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * DELETE /api/team/invites/{id}
 *
 * Revokes a pending invite. Only the sender can revoke.
 */
export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const result = await prisma.teamInvite.updateMany({
    where: {
      id,
      senderId: session.user.id,
      acceptedAt: null,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });

  if (result.count === 0) {
    return NextResponse.json(
      { error: "Invite not found or already resolved" },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true });
}
