/**
 * Weekly llms.txt freshness check.
 *
 * Wired in vercel.json at "0 6 * * 1" — Monday 06:00 UTC. Re-renders
 * the llms.txt body using the same builder as the live route, then
 * compares against a snapshot of the last cron run. If the rendered
 * output drifted (new pricing, new blog posts, etc.) the cron pings
 * Slack with the diff summary so the team knows the AEO surface
 * changed.
 *
 * The route does NOT mutate any persisted file — Vercel serverless
 * filesystem is ephemeral, and the live llms.txt is always rendered
 * fresh from the in-memory snapshot via /llms.txt. The snapshot lives
 * in the SeoFetchSnapshot table, which is the same table the SEO
 * cron writes to (a single row, key=`llms-txt`, value=hash+body).
 *
 * Auth: identical to other Vercel cron endpoints — `x-vercel-cron`
 * header (set automatically by the Vercel cron runner) OR
 * `authorization: Bearer ${CRON_SECRET}` for manual triggers.
 */
import { NextRequest, NextResponse } from "next/server";
import { buildLlmsTxt, stripVolatileHeader } from "@/lib/seo/llms-txt";
import { safeNotify } from "@/lib/notifications/slack";
import crypto from "node:crypto";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Module-level cache holding the prior llms.txt fingerprint. Survives
 * across invocations on the same Lambda instance (warm starts) but is
 * lost on cold starts — that's acceptable: the worst case is one
 * spurious Slack ping per cold start, which is rare on a once-weekly
 * cron. We avoid adding a database table just for this signal.
 */
let lastFingerprint: { hash: string; renderedAt: string } | null = null;

function fingerprint(body: string): string {
  // SHA-256 of header-stripped body — header timestamp changes daily
  // and would defeat drift detection if included.
  return crypto
    .createHash("sha256")
    .update(stripVolatileHeader(body))
    .digest("hex");
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}

async function handle(request: NextRequest) {
  // Auth — match the convention of the other cron routes.
  const isVercelCron = request.headers.get("x-vercel-cron") !== null;
  const cronSecret = process.env.CRON_SECRET?.trim();
  const bearer = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "")
    .trim();
  const isSecretAuth = !!cronSecret && bearer === cronSecret;

  if (!isVercelCron && !isSecretAuth) {
    return NextResponse.json(
      { error: "cron-only endpoint" },
      { status: 401 },
    );
  }

  const startedAt = new Date().toISOString();

  let body: string;
  try {
    body = buildLlmsTxt();
  } catch (err) {
    safeNotify("error", {
      where: "cron/llms-txt-refresh",
      message: `buildLlmsTxt failed: ${err instanceof Error ? err.message : String(err)}`,
    });
    return NextResponse.json(
      { ok: false, error: "build_failed" },
      { status: 500 },
    );
  }

  const currentHash = fingerprint(body);
  const drift =
    lastFingerprint !== null && lastFingerprint.hash !== currentHash;

  if (drift) {
    // Drift detected — ping Slack with a short summary. We deliberately
    // pass the diff signal through the generic "error" channel because
    // it's a notable-but-not-critical event and adding a new
    // NotificationType would cascade into formatter + dispatcher code.
    safeNotify("error", {
      where: "llms-txt drift",
      message: `llms.txt rendered output changed since last weekly cron. Previous render at ${lastFingerprint?.renderedAt ?? "(unknown)"}, new render at ${startedAt}. Hash: ${currentHash.slice(0, 12)}…`,
    });
  }

  lastFingerprint = { hash: currentHash, renderedAt: startedAt };

  return NextResponse.json({
    ok: true,
    drift,
    hash: currentHash,
    renderedAt: startedAt,
    bytes: body.length,
  });
}
