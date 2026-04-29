/**
 * Embeddings backfill cron — Round 12 (L2.A).
 *
 * The 2026-04-29 launch-readiness audit caught a pipeline gap:
 * `ClientContext.content_embedding` was 4.2% populated in production.
 * Insert-time hooks now populate it on every write path
 * (onboarding sample, the /api/clients/[id]/contexts POST handler,
 * context-extractor's persistExtraction). This cron is the safety net
 * — it sweeps any rows the fire-and-forget hooks missed (transient
 * OpenRouter outage, manual SQL inserts, future write paths someone
 * forgets to wire) and embeds them in a small bounded batch.
 *
 * Schedule: every 6 hours (cron expression `0` minute, hour `0,6,12,18`).
 * Bounded `maxItems: 200` keeps a single run under ~$0.01 / 30 s.
 * Concurrent runs are not a concern — UPDATE on
 * `content_embedding IS NULL` is idempotent and the cursor-based scan
 * inside `backfillContextEmbeddings` handles an in-flight UPDATE
 * gracefully (SELECT misses a row that another run already filled,
 * then both proceed without conflict).
 *
 * Auth: same dual mode as every other cron route — Vercel's
 * `x-vercel-cron: 1` header for scheduled invocations, or
 * `Authorization: Bearer <CRON_SECRET>` for manual operator fires.
 */

import { NextRequest, NextResponse } from "next/server";
import { backfillContextEmbeddings } from "@/lib/embeddings";
import { safeNotify } from "@/lib/notifications/slack";

export const dynamic = "force-dynamic";
export const maxDuration = 180; // 3 minutes — well above the 30 s typical run

export async function GET(request: NextRequest) {
  const isVercelCron = request.headers.get("x-vercel-cron") === "1";
  const auth = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  const authedManual =
    process.env.CRON_SECRET && auth === expected && expected.length > 7;
  if (!isVercelCron && !authedManual) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const start = Date.now();
  try {
    const result = await backfillContextEmbeddings({
      // Bounded so a single misconfiguration can't burn the embedding
      // budget. 200 rows × ~150 tokens × $0.02/1M ≈ $0.0006 per run.
      maxItems: 200,
      batchSize: 25,
    });
    const durationMs = Date.now() - start;

    // Slack heartbeat — only when the run actually had work to do.
    // Steady-state with insert-time hooks active, this should normally
    // be `embedded: 0, considered: 0` (no-op). A non-zero embedded
    // count means a write path skipped the hook — operator wants to
    // know so they can wire it.
    if (result.embedded > 0 || result.failed > 0) {
      safeNotify(
        "agent_cron_summary",
        {
          cron: "embeddings-backfill",
          considered: result.considered,
          embedded: result.embedded,
          failed: result.failed,
          skipped: result.skipped,
          durationMs,
        },
        // Demoted to info — backfill activity is not a critical
        // operator alert. Visible only when SLACK_MIN_SEVERITY=info,
        // recoverable from the response body or Vercel logs otherwise.
        { severity: "info" },
      );
    }

    return NextResponse.json({
      ok: true,
      cron: "embeddings-backfill",
      runAt: new Date().toISOString(),
      durationMs,
      ...result,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "backfill failed",
        message: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - start,
      },
      { status: 500 },
    );
  }
}
