import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { consumeVerificationToken } from "@/lib/verification-tokens";
import {
  checkRateLimit,
  identityFromRequest,
  rateLimitResponse,
} from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * POST /api/auth/verify-email
 * Body: { token: string }
 *
 * Consumes a verify_email token, marks User.emailVerified to now().
 * Called by the client-side /verify-email/[token] page; if the token
 * was already consumed we still return ok so a refresh of the
 * verification URL doesn't scare the user.
 */
export async function POST(request: NextRequest) {
  // 10 verify attempts/hour/IP. Higher than forgot since legitimate
  // users may click a stale link, get error, request new one, etc.
  const rl = await checkRateLimit({
    namespace: "auth/verify-email",
    identity: identityFromRequest(request),
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.allowed) return rateLimitResponse(rl);

  const body = (await request.json().catch(() => null)) as
    | { token?: string }
    | null;
  const token = body?.token;
  if (!token) {
    return NextResponse.json({ error: "token required" }, { status: 400 });
  }

  const result = await consumeVerificationToken(token, "verify_email");
  if (!result.ok) {
    if (result.reason === "consumed") {
      // Friendly: tell the client it was already verified.
      return NextResponse.json({ ok: true, alreadyVerified: true });
    }
    const msg =
      result.reason === "expired"
        ? "This verification link has expired — resend from Settings."
        : "This verification link is invalid.";
    return NextResponse.json({ error: msg, reason: result.reason }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: result.userId },
    data: { emailVerified: new Date() },
  });

  return NextResponse.json({ ok: true });
}
