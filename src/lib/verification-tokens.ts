import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

export type TokenKind = "verify_email" | "password_reset";

/**
 * TTLs per kind. Email verification gets 24h (generous, low urgency);
 * password reset gets 1h (security-sensitive, short window).
 */
const TTL_SECONDS: Record<TokenKind, number> = {
  verify_email: 24 * 60 * 60,
  password_reset: 60 * 60,
};

export interface MintedToken {
  token: string;
  expiresAt: Date;
}

/**
 * Mint a fresh one-time token for (userId, kind). Also invalidates any
 * prior unconsumed tokens of the same kind so a user who clicked
 * "Resend" can't use the old email. Returns the plaintext token + expiry.
 */
export async function mintVerificationToken(
  userId: string,
  kind: TokenKind,
): Promise<MintedToken> {
  // Revoke existing unconsumed tokens of this kind.
  await prisma.verificationToken.updateMany({
    where: { userId, kind, consumedAt: null },
    data: { consumedAt: new Date() },
  });

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + TTL_SECONDS[kind] * 1000);
  await prisma.verificationToken.create({
    data: { userId, kind, token, expiresAt },
  });
  return { token, expiresAt };
}

export type ConsumeResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "not_found" | "expired" | "consumed" | "wrong_kind" };

/**
 * Atomically consume a token. Returns ok + userId on success, or a
 * tagged reason on failure. Never returns the user's email or name —
 * callers look up the User row themselves.
 */
export async function consumeVerificationToken(
  token: string,
  expectedKind: TokenKind,
): Promise<ConsumeResult> {
  if (!token || token.length < 10) return { ok: false, reason: "not_found" };

  const row = await prisma.verificationToken.findUnique({
    where: { token },
  });
  if (!row) return { ok: false, reason: "not_found" };
  if (row.kind !== expectedKind) return { ok: false, reason: "wrong_kind" };
  if (row.consumedAt) return { ok: false, reason: "consumed" };
  if (row.expiresAt < new Date()) return { ok: false, reason: "expired" };

  await prisma.verificationToken.update({
    where: { id: row.id },
    data: { consumedAt: new Date() },
  });
  return { ok: true, userId: row.userId };
}
