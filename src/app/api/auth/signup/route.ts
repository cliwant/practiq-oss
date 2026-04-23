import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { consumeInviteToken } from "@/lib/team-invites";

const ALLOWED_VERTICALS = new Set([
  "accounting",
  "law",
  "consulting",
  "hr",
  "agency",
  "advisory",
  "other",
]);

/**
 * POST /api/auth/signup
 *
 * Creates a new User row with hashed password + optional firmVertical
 * seeded from the signup form. Returns 201 on success, 400/409 on
 * validation/dup, 500 on server error. Post-creation the client side
 * calls next-auth's signIn("credentials") for the session bootstrap.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as
      | {
          email?: string;
          password?: string;
          name?: string;
          firmVertical?: string;
          firmName?: string;
          inviteToken?: string;
        }
      | null;
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const email = body.email?.trim().toLowerCase();
    const password = body.password;
    const name = body.name?.trim() || null;
    const firmVertical = body.firmVertical?.trim() || null;
    const firmName = body.firmName?.trim() || null;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Enter a valid email address" },
        { status: 400 },
      );
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }
    if (firmVertical && !ALLOWED_VERTICALS.has(firmVertical)) {
      return NextResponse.json(
        { error: "Unknown firm vertical" },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with that email already exists" },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        firmName,
        firmVertical,
      },
      select: { id: true, email: true, name: true, firmVertical: true },
    });

    // Consume a team invite token if one was passed. Silently no-ops
    // on invalid / expired / email-mismatch so the signup itself still
    // succeeds — the user can request a fresh invite afterward.
    let invite = null;
    if (body.inviteToken) {
      invite = await consumeInviteToken(body.inviteToken, user.id, email);
    }

    return NextResponse.json({ user, invite }, { status: 201 });
  } catch (error) {
    console.error("[signup] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
