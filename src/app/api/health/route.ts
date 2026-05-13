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
 * Each probe is wrapped in a 3s timeout and runs in parallel via
 * Promise.allSettled. Overall status is:
 *   - ok       — all 5 ok
 *   - degraded — exactly 1 down
 *   - down     — 2 or more down
 *
 * Probes:
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
 * Anonymous + uncached by default. Pass `?fresh=1` to force-bypass
 * any upstream CDN cache during one-off operator checks.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CheckStatus = "ok" | "down";

export interface CheckResult {
  status: CheckStatus;
  duration_ms: number;
  detail?: string;
}

export interface HealthChecks {
  db: CheckResult;
  resend: CheckResult;
  openrouter: CheckResult;
  storage: CheckResult;
  stripe: CheckResult;
}

export type OverallStatus = "ok" | "degraded" | "down";

export interface HealthResponse {
  status: OverallStatus;
  checks: HealthChecks;
  ts: string;
  commit: string;
}

const CHECK_TIMEOUT_MS = 3_000;

/**
 * Wrap a probe in a timeout. Resolves with `ok=true` on success,
 * `ok=false` on timeout / thrown error. Never throws.
 */
async function withTimeout<T>(
  promise: Promise<T>,
  label: string,
  timeoutMs = CHECK_TIMEOUT_MS,
): Promise<CheckResult> {
  const start = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label} timeout after ${timeoutMs}ms`)),
          timeoutMs,
        );
      }),
    ]);
    if (timer) clearTimeout(timer);
    return { status: "ok", duration_ms: Date.now() - start };
  } catch (err) {
    if (timer) clearTimeout(timer);
    return {
      status: "down",
      duration_ms: Date.now() - start,
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

async function probeDb(): Promise<CheckResult> {
  return withTimeout(prisma.$queryRaw`SELECT 1 AS ok`, "db");
}

async function probeResend(): Promise<CheckResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return {
      status: "down",
      duration_ms: 0,
      detail: "RESEND_API_KEY not set",
    };
  }
  return withTimeout(
    (async () => {
      const res = await fetch("https://api.resend.com/domains", {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (res.status < 200 || res.status >= 500) {
        throw new Error(`HTTP ${res.status}`);
      }
    })(),
    "resend",
  );
}

async function probeOpenRouter(): Promise<CheckResult> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    return {
      status: "down",
      duration_ms: 0,
      detail: "OPENROUTER_API_KEY not set",
    };
  }
  return withTimeout(
    (async () => {
      const res = await fetch("https://openrouter.ai/api/v1/models", {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (res.status < 200 || res.status >= 500) {
        throw new Error(`HTTP ${res.status}`);
      }
    })(),
    "openrouter",
  );
}

async function probeStorage(): Promise<CheckResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    return {
      status: "down",
      duration_ms: 0,
      detail: "NEXT_PUBLIC_SUPABASE_URL not set",
    };
  }
  // Use a HEAD against the storage bucket listing endpoint via the
  // public Supabase storage URL. Resolving the host + responding with
  // any 2xx/3xx/4xx (not 5xx, not network error) means Supabase
  // Storage is reachable. We deliberately don't authenticate here —
  // unauthenticated 401 is still "reachable", and the auth posture is
  // already covered by the db check (same Supabase project).
  const probeUrl = `${url.replace(/\/$/, "")}/storage/v1/bucket`;
  return withTimeout(
    (async () => {
      const res = await fetch(probeUrl, { method: "HEAD" });
      if (res.status >= 500) {
        throw new Error(`HTTP ${res.status}`);
      }
    })(),
    "storage",
  );
}

async function probeStripe(): Promise<CheckResult> {
  if (!process.env.STRIPE_SECRET_KEY) {
    return {
      status: "down",
      duration_ms: 0,
      detail: "STRIPE_SECRET_KEY not set",
    };
  }
  return withTimeout(
    (async () => {
      const stripe = getStripe();
      await stripe.balance.retrieve();
    })(),
    "stripe",
  );
}

function rollUpStatus(checks: HealthChecks): OverallStatus {
  const downCount = (Object.values(checks) as CheckResult[]).filter(
    (c) => c.status === "down",
  ).length;
  if (downCount === 0) return "ok";
  if (downCount === 1) return "degraded";
  return "down";
}

function getCommitSha(): string {
  return (
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.GITHUB_SHA ||
    process.env.COMMIT_SHA ||
    "unknown"
  );
}

export async function GET(request: NextRequest) {
  const fresh = request.nextUrl.searchParams.get("fresh") === "1";

  // Run all five probes in parallel. Promise.allSettled never throws,
  // and withTimeout itself never rejects — so this resolves with five
  // CheckResult objects no matter what.
  const [db, resend, openrouter, storage, stripe] = await Promise.all([
    probeDb(),
    probeResend(),
    probeOpenRouter(),
    probeStorage(),
    probeStripe(),
  ]);

  const checks: HealthChecks = { db, resend, openrouter, storage, stripe };
  const status = rollUpStatus(checks);
  const httpStatus = status === "ok" ? 200 : 503;

  const body: HealthResponse = {
    status,
    checks,
    ts: new Date().toISOString(),
    commit: getCommitSha(),
  };

  return NextResponse.json(body, {
    status: httpStatus,
    headers: {
      "Cache-Control": fresh ? "no-store" : "no-store",
      "Content-Type": "application/json",
    },
  });
}
