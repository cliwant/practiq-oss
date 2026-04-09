import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
