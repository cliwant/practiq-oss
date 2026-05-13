/**
 * Health-check probes for the 5 production dependencies.
 *
 * Shared by:
 *   - GET /api/health (public readiness probe + 503 mapping)
 *   - GET /api/cron/health-check (5-minute Vercel cron — writes a
 *     practiq.health_checks row + fires Slack on ok → down transitions)
 *
 * Lives in src/lib/health/ so it can be imported from anywhere. Next.js
 * App Router rejects non-HTTP exports from route files, so the cron
 * route can't import directly from the /api/health route module — this
 * module is the canonical home for the probe logic.
 *
 * Each probe:
 *   - Runs in parallel with the others (Promise.all in runHealthProbes)
 *   - Is wrapped in a 3s timeout (withTimeout never throws)
 *   - Returns { status, duration_ms, detail? }
 *
 * Roll-up:
 *   - ok       — all 5 ok
 *   - degraded — exactly 1 down
 *   - down     — 2 or more down
 *   - HTTP status: 200 when ok, 503 otherwise
 */

import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe/client";

export type CheckStatus = "ok" | "down";

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
  // HEAD against the storage bucket listing endpoint via the public
  // Supabase storage URL. Resolving the host + responding with any
  // 2xx/3xx/4xx (not 5xx, not network error) means Supabase Storage
  // is reachable. We deliberately don't authenticate here —
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

/**
 * Run all five probes in parallel and return the rolled-up health body.
 *
 * Never throws — every probe is wrapped in withTimeout which catches
 * its own failures.
 */
export async function runHealthProbes(): Promise<{
  body: HealthResponse;
  httpStatus: number;
}> {
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

  return { body, httpStatus };
}
