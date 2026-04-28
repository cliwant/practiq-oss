/**
 * GET /api/dev-test/memory-snapshot?clientId=...&query=...
 *
 * Manual probe for the 5-tier memory composer (Wave-4 P1-06). Returns
 * the rendered prompt + per-tier breakdown so an operator can verify
 * what their agents are actually seeing.
 *
 * Auth: standard NextAuth session — the underlying composer
 * re-checks `clientId` ownership when no preloaded client is passed,
 * but we ALSO verify here at the route layer (defense-in-depth).
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loadClientMemoryForPrompt } from "@/lib/memory/loader";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const clientId = url.searchParams.get("clientId");
  const query = url.searchParams.get("query") ?? undefined;
  const budgetParam = url.searchParams.get("budget");
  const budgetTokens = budgetParam
    ? Math.max(300, Math.min(8000, Number.parseInt(budgetParam, 10)))
    : undefined;

  if (!clientId) {
    return NextResponse.json(
      { error: "clientId query parameter required" },
      { status: 400 },
    );
  }

  // Defense-in-depth ownership check.
  const client = await prisma.client.findFirst({
    where: { id: clientId, userId: session.user.id },
    select: { id: true },
  });
  if (!client) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = await loadClientMemoryForPrompt({
    clientId,
    userId: session.user.id,
    query,
    budgetTokens,
  });
  return NextResponse.json(result);
}
