/**
 * GET /api/healthz
 *
 * Liveness probe for container orchestration — Docker `healthcheck`, the
 * self-host smoke-test matrix, Kubernetes, and external uptime monitors.
 *
 * This is deliberately DISTINCT from GET /api/health:
 *   - /api/health  is a *readiness* probe. It checks all 5 production
 *     dependencies (db, resend, openrouter, storage, stripe) and returns
 *     503 if any paid integration is down. Right for the cloud status page.
 *   - /api/healthz is a *liveness* probe. It answers the only two questions
 *     that decide whether a self-host deployment is alive: "is the web
 *     server responding?" and "can it reach its own Postgres?".
 *
 * A self-hoster who has not configured Stripe / Resend / OpenRouter is
 * still perfectly healthy, so those are intentionally NOT probed here.
 * Probing them would make `docker compose up --wait` never go healthy on a
 * minimal install — which is exactly the false-negative we are avoiding.
 *
 *   200 {"status":"ok","db":"ok"}            server up, Postgres reachable
 *   503 {"status":"down","db":"down",...}    Postgres unreachable
 *
 * Anonymous, uncached, nodejs runtime (needs the pg driver).
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();
  try {
    // Cheapest possible round-trip that proves the connection + a live
    // session. Prisma's tagged-template form is parameter-safe.
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      {
        status: "ok",
        db: "ok",
        duration_ms: Date.now() - startedAt,
        ts: new Date().toISOString(),
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return NextResponse.json(
      {
        status: "down",
        db: "down",
        detail: err instanceof Error ? err.message : String(err),
        duration_ms: Date.now() - startedAt,
        ts: new Date().toISOString(),
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
