/**
 * Nightly digest compactor cron — Wave-4 P1-03.
 *
 * Vercel cron hits this once a day. Auth: header
 * `Authorization: Bearer <CRON_SECRET>`. Vercel auto-attaches its
 * own header `x-vercel-cron: 1` for scheduled invocations.
 *
 * Returns a structured summary so the cron log is grep-able.
 */
import { NextRequest, NextResponse } from "next/server";
import { compactAllActiveClients } from "@/lib/memory/digest-compactor";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min — concurrency=3 fans out OK

export async function GET(request: NextRequest) {
  // Vercel-cron requests carry the x-vercel-cron header. Manual /
  // dev-test invocations need a Bearer token.
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
    const results = await compactAllActiveClients();
    const ok = results.filter((r) => r.status === "ok").length;
    const skipped = results.filter((r) => r.status === "skipped").length;
    const failed = results.filter((r) => r.status === "error").length;
    return NextResponse.json({
      total: results.length,
      ok,
      skipped,
      failed,
      durationMs: Date.now() - start,
      // Don't echo the full digest text in the cron response — too
      // much. Just per-client status + length.
      perClient: results.map((r) => ({
        clientId: r.clientId,
        status: r.status,
        digestLength: r.digestLength,
        error: r.error,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "compactor failed",
        message: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - start,
      },
      { status: 500 },
    );
  }
}
