import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mintVerificationToken } from "@/lib/verification-tokens";
import { sendEmail } from "@/lib/email/send";
import { passwordResetEmail } from "@/lib/email/templates";
import { getSiteUrl } from "@/lib/email/client";

export const runtime = "nodejs";

/**
 * POST /api/auth/forgot-password
 * Body: { email: string }
 *
 * Sends a password reset email IFF the email belongs to a user who
 * has a passwordHash (i.e. credentials-auth users only — OAuth-only
 * users reset at their provider).
 *
 * Response is always {ok: true} regardless of whether the email
 * exists — we don't leak account existence through this endpoint.
 * The actual email only sends if the user is eligible.
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | { email?: string }
    | null;
  const email = body?.email?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true },
  });

  // Only send a reset email if a user with a password exists. Always
  // return success to prevent enumeration.
  if (user?.passwordHash) {
    const { token, expiresAt } = await mintVerificationToken(
      user.id,
      "password_reset",
    );
    const resetUrl = `${getSiteUrl()}/reset-password/${token}`;
    const mail = passwordResetEmail({ resetUrl, expiresAt });
    await sendEmail({ to: email, ...mail, tag: "password-reset" }).catch(
      (err) => console.error("[forgot-password] email failed:", err),
    );
  }

  return NextResponse.json({ ok: true });
}
