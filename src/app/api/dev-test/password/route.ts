import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * POST /api/dev-test/password
 * Body: { email, password }
 *
 * Dev-only helper that runs bcrypt.compare() directly so E2E tests
 * can isolate whether the Credentials authorize() path is the
 * problem vs. the DB hash. Returns { exists, match, hashPrefix } —
 * never returns the full hash.
 *
 * Guarded by NODE_ENV !== "production" + optional TEST_ONLY_SECRET.
 */
export async function POST(request: NextRequest) {
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

  const body = (await request.json().catch(() => null)) as
    | { email?: string; password?: string }
    | null;
  const email = body?.email?.trim().toLowerCase();
  const password = body?.password;
  if (!email || !password) {
    return NextResponse.json(
      { error: "email and password required" },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true },
  });
  if (!user) {
    return NextResponse.json({ exists: false, match: false });
  }
  if (!user.passwordHash) {
    return NextResponse.json({ exists: true, match: false, hashPrefix: null });
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  return NextResponse.json({
    exists: true,
    match,
    hashPrefix: user.passwordHash.slice(0, 7),
  });
}
