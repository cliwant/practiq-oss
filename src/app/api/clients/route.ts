import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { gateClientCreation, gateRefusalBody } from "@/lib/plan-gates";

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
    // error toast.
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

    return NextResponse.json({ client }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
