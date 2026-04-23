import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { mintVerificationToken } from "@/lib/verification-tokens";
import { sendEmail } from "@/lib/email/send";
import { verifyEmail as verifyEmailTemplate } from "@/lib/email/templates";
import { getSiteUrl } from "@/lib/email/client";

export const runtime = "nodejs";

/**
 * POST /api/auth/resend-verification
 *
 * Authenticated. Sends a fresh verification email to the current
 * user's email address. No-op (ok:true) if the user is already
 * verified, so UI clients can call safely.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, emailVerified: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (user.emailVerified) {
    return NextResponse.json({ ok: true, alreadyVerified: true });
  }

  const { token, expiresAt } = await mintVerificationToken(
    user.id,
    "verify_email",
  );
  const verifyUrl = `${getSiteUrl()}/verify-email/${token}`;
  const mail = verifyEmailTemplate({ verifyUrl, expiresAt });
  const res = await sendEmail({
    to: user.email,
    ...mail,
    tag: "verify-email",
  });
  return NextResponse.json({ ok: true, sent: res.ok });
}
