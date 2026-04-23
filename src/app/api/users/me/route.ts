import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const ALLOWED_VERTICALS = new Set([
  "accounting",
  "law",
  "consulting",
  "hr",
  "agency",
  "advisory",
  "other",
]);

// IANA timezone identifiers — we don't validate against the full list
// (thousands of entries), just a defensive length + shape check. Invalid
// values fall back to the existing value on the PATCH.
function looksLikeTimezone(v: string): boolean {
  return (
    typeof v === "string" &&
    v.length > 0 &&
    v.length <= 64 &&
    /^[A-Za-z_\-/+0-9]+$/.test(v)
  );
}

/**
 * GET /api/users/me
 *
 * Returns the authenticated user's profile + subscription + firm
 * metadata for settings page hydration.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      firmName: true,
      firmVertical: true,
      timezone: true,
      briefingEnabled: true,
      briefingHour: true,
      stripeCustomerId: true,
      createdAt: true,
      subscription: {
        select: {
          plan: true,
          status: true,
          currentPeriodEnd: true,
          cancelAtPeriodEnd: true,
          seatCount: true,
        },
      },
      _count: {
        select: { clients: true, contexts: true, approvalItems: true },
      },
    },
  });
  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ user });
}

/**
 * PATCH /api/users/me
 *
 * Update a subset of the authenticated user's own profile + agent
 * preferences. Accepts only whitelisted fields; ignores unknown keys.
 */
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | Record<string, unknown>
    | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};

  if (typeof body.name === "string") {
    patch.name = body.name.trim() || null;
  }
  if (typeof body.firmName === "string") {
    patch.firmName = body.firmName.trim() || null;
  }
  if (typeof body.firmVertical === "string") {
    const v = body.firmVertical.trim().toLowerCase();
    if (v === "" || ALLOWED_VERTICALS.has(v)) {
      patch.firmVertical = v === "" ? null : v;
    } else {
      return NextResponse.json(
        { error: "Unknown firm vertical" },
        { status: 400 },
      );
    }
  }
  if (typeof body.timezone === "string" && looksLikeTimezone(body.timezone)) {
    patch.timezone = body.timezone;
  }
  if (typeof body.briefingEnabled === "boolean") {
    patch.briefingEnabled = body.briefingEnabled;
  }
  if (typeof body.briefingHour === "number") {
    const h = Math.floor(body.briefingHour);
    if (h >= 0 && h <= 23) {
      patch.briefingHour = h;
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: "No updatable fields provided" },
      { status: 400 },
    );
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: patch,
    select: {
      id: true,
      email: true,
      name: true,
      firmName: true,
      firmVertical: true,
      timezone: true,
      briefingEnabled: true,
      briefingHour: true,
    },
  });
  return NextResponse.json({ user });
}
