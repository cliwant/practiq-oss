/**
 * Cron-driven Founding-slot reconciliation.
 *
 * Runs daily at 02:30 UTC. Walks every FoundingClaim row that's been
 * `pending` for >25 hours and reconciles against Stripe:
 *
 *   - Stripe says the session 'expired' or stayed 'open' past 24h with
 *     no subscription:  release the slot (decrement counter, mark
 *     claim as 'released').
 *   - Stripe says the session 'complete' and paid:  webhook must have
 *     been lost (rare). Promote the claim to 'confirmed' as fallback.
 *
 * Auth: same three-way check the other crons use (x-vercel-cron header,
 * x-deploy-secret matches SEO_DEPLOY_SECRET, or Authorization Bearer
 * matching CRON_SECRET).
 *
 * Side-effect safety: every release runs as a single Prisma transaction
 * so the FoundingSlot decrement and the FoundingClaim status flip
 * are atomic. If the cron times out mid-loop, partially processed rows
 * stay in their already-finalized state and the next run picks up
 * the rest.
 */

import { NextRequest, NextResponse } from "next/server";
import { releaseStaleClaims } from "@/lib/stripe/founding-slot";
import { safeNotify } from "@/lib/notifications/slack";

export const runtime = "nodejs";
// Each pending claim costs one stripe.checkout.sessions.retrieve()
// round-trip (~200-400ms in practice). With the cohort capped at 50
// and a hard 200-row scan limit, the worst-case loop is 50-200 rows
// at ~400ms each = 20-80s. Round 6 bumped from 60s to 120s to give
// the loop headroom on Pro plan; the existing per-row try/catch
// already handles individual Stripe API errors so a slow tail
// doesn't blow up the whole run.
export const maxDuration = 120;

function isAuthorized(request: NextRequest): boolean {
  if (request.headers.get("x-vercel-cron")) return true;
  const expected = process.env.CRON_SECRET?.trim();
  if (expected) {
    const auth = request.headers.get("authorization") ?? "";
    if (auth === `Bearer ${expected}`) return true;
  }
  const deploySecret = process.env.SEO_DEPLOY_SECRET?.trim();
  if (deploySecret) {
    const headerSecret = request.headers.get("x-deploy-secret") ?? "";
    if (headerSecret === deploySecret) return true;
  }
  return false;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "cron-only endpoint" }, { status: 401 });
  }

  const dryRun = request.nextUrl.searchParams.get("dryRun") === "1";

  try {
    const result = await releaseStaleClaims({ dryRun });

    if (result.scanned > 0) {
      // Slack ping so the operator sees systematic abandonment patterns
      // (e.g. someone running scripted CTA clicks). Skip on the trivial
      // "0 scanned" path to keep the channel quiet.
      await safeNotify("agent_cron_summary", {
        cron: "founding-slot-cleanup",
        scanned: result.scanned,
        releasedExpired: result.releasedExpired,
        reconfirmed: result.reconfirmed,
        stillOpen: result.stillOpen,
        errors: result.errors,
        dryRun,
      });
    }

    return NextResponse.json({
      ok: true,
      cron: "founding-slot-cleanup",
      runAt: new Date().toISOString(),
      ...result,
    });
  } catch (err) {
    console.error("[founding-slot-cleanup] failed:", err);
    await safeNotify("agent_cron_warning", {
      cron: "founding-slot-cleanup",
      error: String(err),
    });
    return NextResponse.json(
      { error: "cleanup failed" },
      { status: 500 },
    );
  }
}
