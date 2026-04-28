/**
 * POST /api/dev-test/dogfood-verify — RUN 12 debug aid.
 *
 * Header: X-Bootstrap-Secret. Body: { email, password }.
 * Returns whether the user exists, has a passwordHash set, and
 * whether bcrypt.compare succeeds. Used to confirm the dogfood
 * bootstrap actually persisted a usable hash so the Playwright
 * capture flow can log in.
 */
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const expected = (process.env.BOOTSTRAP_SECRET ?? "").trim();
  const provided = request.headers.get("x-bootstrap-secret") ?? "";
  if (!expected || provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await request.json()) as { email?: string; password?: string };
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  if (!email || !password) {
    return NextResponse.json(
      { error: "email + password required" },
      { status: 400 },
    );
  }
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      emailVerified: true,
      createdAt: true,
    },
  });
  if (!user) {
    return NextResponse.json({ exists: false });
  }
  const hash = user.passwordHash;
  const bcryptCompare =
    typeof hash === "string" && hash.length > 0
      ? await bcrypt.compare(password, hash)
      : false;
  return NextResponse.json({
    exists: true,
    id: user.id,
    email: user.email,
    hasPasswordHash: typeof hash === "string" && hash.length > 0,
    passwordHashLength: typeof hash === "string" ? hash.length : 0,
    passwordHashPrefix:
      typeof hash === "string" ? hash.slice(0, 7) : null,
    emailVerified: user.emailVerified,
    bcryptCompare,
    createdAt: user.createdAt,
  });
}
