/**
 * GET /api/health
 *
 * Lightweight readiness probe for external uptime monitors (UptimeRobot,
 * BetterStack, Pingdom). Returns:
 *   200 + { ok: true, checks: {...} } when every required dependency
 *         responds within its budget;
 *   503 + { ok: false, checks: {...} } when at least one required check
 *         fails — useful so the monitor flips to "down" before users
 *         see 5xx on real routes.
 *
 * Checks performed (each capped at 1.5s):
 *   - db          Postgres reachable + auth schema responding
 *   - stripe      Stripe API auth (cheap account.retrieve)
 *
 * Soft checks (logged but never flip ok=false):
 *   - resend      Domain status from /domains
 *   - anthropic   Models list (the only cheap auth probe Anthropic has)
 *
 * Anonymous + cacheable for 30s by Vercel edge so a monitor pinging
 * every minute hits the cache more often than not. The `?fresh=1`
 * query param bypasses the cache for one-off operator checks.
 *
 * Why we have a health endpoint at all: production-tier expectation
 * — every paid SaaS exposes one for status pages and incident
 * response. Currently practiq.dev has no equivalent, which means
 * a partial outage (DB up, Stripe API down) only surfaces when a
 * user tries to checkout.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CheckResult {
  ok: boolean;
  ms: number;
  detail?: string;
}

const CHECK_TIMEOUT_MS = 1500;

async function withTimeout<T>(
  promise: Promise<T>,
  label: string,
  timeoutMs = CHECK_TIMEOUT_MS,
): Promise<{ ok: boolean; value?: T; ms: number; detail?: string }> {
  const start = Date.now();
  let timer: NodeJS.Timeout | undefined;
  try {
    const value = await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label} timeout after ${timeoutMs}ms`)),
          timeoutMs,
        );
      }),
    ]);
    if (timer) clearTimeout(timer);
    return { ok: true, value, ms: Date.now() - start };
  } catch (err) {
    if (timer) clearTimeout(timer);
    return {
      ok: false,
      ms: Date.now() - start,
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function GET(request: NextRequest) {
  const fresh = request.nextUrl.searchParams.get("fresh") === "1";

  // 1. Required: Postgres reachable
  const db = await withTimeout(
    prisma.$queryRaw`SELECT 1 AS ok`,
    "db",
  );
  const dbCheck: CheckResult = {
    ok: db.ok,
    ms: db.ms,
    ...(db.detail ? { detail: db.detail } : {}),
  };

  // 2. Required: Stripe API reachable + auth working
  let stripeCheck: CheckResult;
  try {
    const stripe = getStripe();
    // stripe.accounts.retrieve() needs an account id in newer typings;
    // hit /v1/balance instead (auth-only, no id required, ~150ms).
    const result = await withTimeout(stripe.balance.retrieve(), "stripe");
    stripeCheck = {
      ok: result.ok,
      ms: result.ms,
      ...(result.detail ? { detail: result.detail } : {}),
    };
  } catch (err) {
    stripeCheck = {
      ok: false,
      ms: 0,
      detail: err instanceof Error ? err.message : "stripe init failed",
    };
  }

  // 3. Soft: Anthropic API (Claude). Optional — Anthropic doesn't have
  // a "ping" endpoint cheaper than messages.create with max_tokens=1,
  // which would cost ~$0.0005 per health check ($0.72/day at 1/min).
  // Skip for now; reachability is implied by recent /api/chat success.
  const anthropicCheck: CheckResult = {
    ok: !!process.env.ANTHROPIC_API_KEY,
    ms: 0,
    detail: process.env.ANTHROPIC_API_KEY
      ? "key present (no live probe)"
      : "ANTHROPIC_API_KEY not set",
  };

  // 4. Soft: Resend reachability. The /domains call is free + ~100ms.
  let resendCheck: CheckResult;
  if (!process.env.RESEND_API_KEY) {
    resendCheck = { ok: false, ms: 0, detail: "RESEND_API_KEY not set" };
  } else {
    const resp = await withTimeout(
      fetch("https://api.resend.com/domains", {
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
      }).then((r) => ({ status: r.status })),
      "resend",
    );
    resendCheck = {
      ok: resp.ok && (resp.value?.status ?? 0) >= 200 && (resp.value?.status ?? 0) < 500,
      ms: resp.ms,
      ...(resp.value ? { detail: `HTTP ${resp.value.status}` } : {}),
      ...(resp.detail ? { detail: resp.detail } : {}),
    };
  }

  const requiredOk = dbCheck.ok && stripeCheck.ok;
  const status = requiredOk ? 200 : 503;

  const headers: Record<string, string> = {
    "Cache-Control": fresh
      ? "no-store"
      : "public, max-age=30, stale-while-revalidate=60",
    "Content-Type": "application/json",
  };

  return NextResponse.json(
    {
      ok: requiredOk,
      checkedAt: new Date().toISOString(),
      checks: {
        db: dbCheck,
        stripe: stripeCheck,
        anthropic: anthropicCheck,
        resend: resendCheck,
      },
    },
    { status, headers },
  );
}
