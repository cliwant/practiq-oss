import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { consumeVerificationToken } from "@/lib/verification-tokens";
import {
  checkRateLimit,
  identityFromRequest,
  rateLimitResponse,
} from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * POST /api/auth/reset-password
 * Body: { token: string, password: string }
 *
 * Consumes a password_reset token and sets a new password hash on
 * the user. One-shot — token is invalidated on success.
 */
export async function POST(request: NextRequest) {
  const rl = checkRateLimit({
    namespace: "auth/reset-password",
    identity: identityFromRequest(request),
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.allowed) return rateLimitResponse(rl);

  const body = (await request.json().catch(() => null)) as
    | { token?: string; password?: string }
    | null;
  const token = body?.token;
  const password = body?.password;
  if (!token || !password) {
    return NextResponse.json(
      { error: "token and password required" },
      { status: 400 },
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 },
    );
  }

  const result = await consumeVerificationToken(token, "password_reset");
  if (!result.ok) {
    const msg =
      result.reason === "expired"
        ? "This reset link has expired — request a new one."
        : result.reason === "consumed"
          ? "This reset link has already been used."
          : "This reset link is invalid.";
    return NextResponse.json({ error: msg, reason: result.reason }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.update({
    where: { id: result.userId },
    data: { passwordHash },
  });

  return NextResponse.json({ ok: true });
}
