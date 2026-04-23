import { prisma } from "@/lib/prisma";

/**
 * Consume a team-invite token for a freshly-signed-up user.
 *
 * - Looks up the invite by token.
 * - Verifies it's not expired / revoked / already accepted.
 * - Verifies the invite email matches the signup email (case-insensitive).
 * - Creates UserClientMapping rows for every clientId in the invite
 *   (or for every client the sender owns, if clientIds is empty — "invite
 *   to the whole firm" mode).
 * - Marks the invite accepted.
 *
 * Silent no-op on any failure — the signup itself already succeeded;
 * a bad invite shouldn't block account creation. Returns the accepted
 * invite info on success for UI messaging.
 */
export async function consumeInviteToken(
  token: string,
  userId: string,
  userEmail: string,
): Promise<{ clientCount: number; role: string; senderId: string } | null> {
  try {
    const invite = await prisma.teamInvite.findUnique({ where: { token } });
    if (!invite) return null;
    if (invite.acceptedAt) return null;
    if (invite.revokedAt) return null;
    if (invite.expiresAt < new Date()) return null;
    if (invite.email.toLowerCase() !== userEmail.toLowerCase()) return null;

    // Resolve the concrete client list. Empty clientIds in the invite
    // means "all of the sender's current clients" (whole-firm access).
    const rawIds = invite.clientIds as unknown;
    const explicitIds = Array.isArray(rawIds)
      ? (rawIds as unknown[]).filter(
          (x): x is string => typeof x === "string",
        )
      : [];

    let clientIds: string[];
    if (explicitIds.length > 0) {
      // Double-check ownership — the sender may have lost access since
      // the invite was created.
      const owned = await prisma.client.findMany({
        where: { id: { in: explicitIds }, userId: invite.senderId },
        select: { id: true },
      });
      clientIds = owned.map((c) => c.id);
    } else {
      const all = await prisma.client.findMany({
        where: { userId: invite.senderId },
        select: { id: true },
      });
      clientIds = all.map((c) => c.id);
    }

    // Create the mappings. Skip duplicates defensively — the unique
    // index on (userId, clientId) guarantees no double-writes.
    if (clientIds.length > 0) {
      await prisma.userClientMapping.createMany({
        data: clientIds.map((clientId) => ({
          userId,
          clientId,
          role: invite.role,
        })),
        skipDuplicates: true,
      });
    }

    await prisma.teamInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });

    return {
      clientCount: clientIds.length,
      role: invite.role,
      senderId: invite.senderId,
    };
  } catch (err) {
    console.error("[invite] consume failed:", err);
    return null;
  }
}
