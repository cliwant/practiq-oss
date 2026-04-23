import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * GET /api/_test/token?email=&kind=
 *
 * Dev-ONLY helper for E2E suites. Returns the newest unconsumed
 * verification token for a given (email, kind). Guarded by
 * NODE_ENV !== "production" AND the presence of the TEST_ONLY_SECRET
 * env var matching x-test-secret header. Returns 404 in production
 * regardless — the route literally doesn't exist to customers.
 *
 * This keeps scripts/e2e-password-reset.ts from having to open a
 * second Prisma connection that can collide with prisma-dev's pool.
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const secret = process.env.TEST_ONLY_SECRET?.trim();
  if (secret) {
    const header = request.headers.get("x-test-secret")?.trim();
    if (header !== secret) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  const sp = request.nextUrl.searchParams;
  const email = sp.get("email")?.trim().toLowerCase();
  const kind = sp.get("kind");
  if (!email || !kind) {
    return NextResponse.json(
      { error: "email and kind required" },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, emailVerified: true },
  });
  if (!user) {
    return NextResponse.json({ error: "user not found" }, { status: 404 });
  }

  const tokenRow = await prisma.verificationToken.findFirst({
    where: {
      userId: user.id,
      kind,
      consumedAt: null,
    },
    orderBy: { createdAt: "desc" },
    select: { token: true, expiresAt: true, createdAt: true },
  });

  return NextResponse.json({
    userId: user.id,
    emailVerified: user.emailVerified,
    token: tokenRow,
  });
}
