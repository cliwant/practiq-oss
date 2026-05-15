import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { gateClientCreation, gateRefusalBody } from "@/lib/plan-gates";
import { adjustSubscriptionClientCount } from "@/lib/stripe/per-client-subscription";

/**
 * GET /api/clients
 * Returns all clients for the authenticated user.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clients = await prisma.client.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ clients });
}

/**
 * POST /api/clients
 * Creates a new client.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, industry, userRole, preferences } = await request.json();

    if (!name || !industry || !userRole) {
      return NextResponse.json(
        { error: "name, industry, and userRole are required" },
        { status: 400 },
      );
    }

    // Plan gate: enforce per-plan client ceiling. Free trial = 1,
    // Solo = 30, Practice = 100, Firm = 200. Trial-expired users
    // hit a 402 with an upgradeUrl pointing at /pricing — the UI
    // should render an inline upgrade panel instead of a generic
    // error toast. Stage 3d rewrites this to enforce the new trial
    // cap of 3 clients via PER_CLIENT_PRICING.freeTrialClients.
    const gate = await gateClientCreation(session.user.id);
    if (!gate.allowed) {
      return NextResponse.json(gateRefusalBody(gate), { status: 402 });
    }

    const client = await prisma.client.create({
      data: {
        userId: session.user.id,
        name,
        industry,
        userRole,
        preferences: preferences ?? {},
      },
    });

    // Stage 3b billing hook (2026-05-15): keep Stripe per-client
    // subscription quantity in sync with the firm's actual Client
    // count. Trial users are no-ops at the Stripe layer; paid users
    // get a `subscriptionItems.update` call with proration. Wrap
    // the awaited call so DB-layer errors in the hook never block
    // client creation — the user already saw the new client land in
    // their UI; billing drift is recoverable, broken client creation
    // is not.
    try {
      await adjustSubscriptionClientCount({
        userId: session.user.id,
        delta: 1,
        clientId: client.id,
      });
    } catch (hookErr) {
      console.error(
        "[clients-post] billing hook crashed:",
        hookErr instanceof Error ? hookErr.message : String(hookErr),
      );
    }

    return NextResponse.json({ client }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
