/**
 * POST /api/dev-test/embeddings-backfill — RUN 12.
 *
 * Production-side trigger for `backfillContextEmbeddings`. Same
 * SASL-avoidance rationale as the dogfood-bootstrap endpoint —
 * ARM64 Windows + pg-pool + Supabase pooler hits a SCRAM SASL
 * encoding bug for direct script execution; production runs
 * Linux x64 cleanly.
 *
 * Auth: BOOTSTRAP_SECRET header. Same secret reused.
 *
 * Body (JSON, optional):
 *   { batchSize?: number, maxItems?: number, clientId?: string }
 *
 * Returns: { considered, embedded, failed, skipped, durationMs }
 */
import { NextRequest, NextResponse } from "next/server";
import { backfillContextEmbeddings } from "@/lib/embeddings";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const expected = (process.env.BOOTSTRAP_SECRET ?? "").trim();
  if (!expected) {
    return NextResponse.json(
      { error: "BOOTSTRAP_SECRET not configured on the server" },
      { status: 503 },
    );
  }
  const provided = request.headers.get("x-bootstrap-secret") ?? "";
  if (provided.length === 0 || provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { batchSize?: number; maxItems?: number; clientId?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    // Empty body is fine — defaults will apply.
  }

  const start = Date.now();
  const result = await backfillContextEmbeddings({
    batchSize: body.batchSize,
    maxItems: body.maxItems,
    clientId: body.clientId,
  });

  return NextResponse.json({
    ...result,
    durationMs: Date.now() - start,
  });
}
