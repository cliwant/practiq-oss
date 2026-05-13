/**
 * GET /api/health
 *
 * Tier-3 operational hardening: structured 5-dependency readiness probe.
 *
 * Public endpoint. Returns JSON of the shape:
 *   {
 *     "status": "ok" | "degraded" | "down",
 *     "checks": {
 *       "db":         { "status": "ok" | "down", "duration_ms": <n>, "detail"?: <s> },
 *       "resend":     { ... },
 *       "openrouter": { ... },
 *       "storage":    { ... },
 *       "stripe":     { ... }
 *     },
 *     "ts": "<iso>",
 *     "commit": "<git-sha>"
 *   }
 *
 * HTTP status:
 *   - 200 when overall status is ok (all 5 green)
 *   - 503 when overall status is degraded or down (≥1 check down)
 *
 * Each probe is wrapped in a 3s timeout and runs in parallel. Overall
 * status is:
 *   - ok       — all 5 ok
 *   - degraded — exactly 1 down
 *   - down     — 2 or more down
 *
 * Probes (defined in src/lib/health/probes.ts so the cron route at
 * /api/cron/health-check can re-use them without a second HTTP hop):
 *   - db          SELECT 1 via Prisma (~5ms expected)
 *   - resend      GET /domains (auth-only, no email sent)
 *   - openrouter  GET /api/v1/models (auth + list, no LLM call)
 *   - storage     HEAD on a known public Supabase storage URL
 *   - stripe      GET /v1/balance (auth-only, cheap)
 *
 * Why we have a health endpoint at all: production-tier expectation —
 * every paid SaaS exposes one for status pages, external monitors, and
 * incident response. A partial outage (DB up, Stripe down) should
 * surface here before a user hits checkout and sees a 5xx.
 *
 * Anonymous + uncached by default. Pass `?fresh=1` to force-bypass any
 * upstream CDN cache during one-off operator checks.
 */

import { NextRequest, NextResponse } from "next/server";
import { runHealthProbes } from "@/lib/health/probes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const fresh = request.nextUrl.searchParams.get("fresh") === "1";
  const { body, httpStatus } = await runHealthProbes();

  return NextResponse.json(body, {
    status: httpStatus,
    headers: {
      "Cache-Control": fresh ? "no-store" : "no-store",
      "Content-Type": "application/json",
    },
  });
}
