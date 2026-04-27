import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/send";
import { teamInviteEmail } from "@/lib/email/templates";
import {
  checkRateLimit,
  identityFromRequest,
  rateLimitResponse,
} from "@/lib/rate-limit";
import { gateTeamInvite, gateRefusalBody } from "@/lib/plan-gates";

export const runtime = "nodejs";

const ALLOWED_ROLES = new Set(["member", "viewer"]);
const INVITE_TTL_DAYS = 14;

/**
 * GET /api/team/invites
 *
 * List the authenticated user's outstanding (not-yet-accepted, not-revoked)
 * team invitations. Used by the /settings Team tab.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const invites = await prisma.teamInvite.findMany({
    where: {
      senderId: session.user.id,
      acceptedAt: null,
      revokedAt: null,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      role: true,
      clientIds: true,
      createdAt: true,
      expiresAt: true,
      token: true,
    },
  });

  return NextResponse.json({ invites });
}

/**
 * POST /api/team/invites
 *
 * Body: { email: string, role: "member" | "viewer", clientIds?: string[] }
 *
 * Creates a pending team invite. The returned `inviteUrl` can be copied
 * to a clipboard or emailed manually (Resend wiring later). When the
 * invitee signs up with the same email, /api/auth/signup looks up
 * pending invites and creates UserClientMapping rows.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 20 invites/hour/user — generous for team rollouts but prevents
  // an account compromise from blasting spam via our domain.
  const rl = checkRateLimit({
    namespace: "team/invites",
    identity: identityFromRequest(request, session.user.id),
    limit: 20,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.allowed) return rateLimitResponse(rl);

  // Plan gate: free + Solo plans cannot invite (single seat).
  // Practice/Firm gated by seat cap (existing accepted + outstanding
  // pending invites < cap).
  const inviteGate = await gateTeamInvite(session.user.id);
  if (!inviteGate.allowed) {
    return NextResponse.json(gateRefusalBody(inviteGate), { status: 402 });
  }

  const body = (await request.json().catch(() => null)) as
    | { email?: string; role?: string; clientIds?: string[] }
    | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const role = body.role?.trim().toLowerCase() ?? "member";
  const clientIds = Array.isArray(body.clientIds)
    ? body.clientIds.filter((id): id is string => typeof id === "string")
    : [];

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }
  if (!ALLOWED_ROLES.has(role)) {
    return NextResponse.json(
      { error: "Role must be 'member' or 'viewer'" },
      { status: 400 },
    );
  }

  // If specific clientIds were passed, verify they all belong to the
  // sender — never let someone invite a peer to a client they don't own.
  if (clientIds.length > 0) {
    const owned = await prisma.client.count({
      where: {
        id: { in: clientIds },
        userId: session.user.id,
      },
    });
    if (owned !== clientIds.length) {
      return NextResponse.json(
        { error: "One or more clients not owned by you" },
        { status: 403 },
      );
    }
  }

  // Don't send two invites to the same email+sender pair simultaneously.
  const existing = await prisma.teamInvite.findFirst({
    where: {
      senderId: session.user.id,
      email,
      acceptedAt: null,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  if (existing) {
    return NextResponse.json(
      {
        error:
          "An active invite already exists for that email. Revoke it first if you need to change the terms.",
      },
      { status: 409 },
    );
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_TTL_DAYS);

  const invite = await prisma.teamInvite.create({
    data: {
      senderId: session.user.id,
      email,
      role,
      clientIds,
      token,
      expiresAt,
    },
    select: {
      id: true,
      email: true,
      role: true,
      token: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  const origin =
    request.headers.get("origin") ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://practiq.dev";
  const inviteUrl = `${origin}/signup?invite=${invite.token}`;

  // Pull the sender's name + firm for the email. Don't block the
  // response on the send — it's fire-and-forget with dev-log fallback.
  const sender = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, firmName: true },
  });

  let emailSent = false;
  if (sender) {
    const mail = teamInviteEmail({
      inviterName: sender.name,
      inviterEmail: sender.email,
      firmName: sender.firmName,
      role,
      acceptUrl: inviteUrl,
      expiresAt,
    });
    const res = await sendEmail({
      to: email,
      ...mail,
      tag: "team-invite",
    });
    emailSent = res.ok;
    if (!res.ok) {
      console.error(
        `[invite] email failed (${res.provider}): ${res.error ?? "unknown"}`,
      );
    }
  }

  return NextResponse.json({ invite, inviteUrl, emailSent }, { status: 201 });
}
