import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Sliding-window rate limiter.
 *
 * In-memory store for dev / single-instance deploys. For horizontally
 * scaled production move to Upstash / Vercel KV by swapping the
 * `store` adapter — the public API stays identical.
 *
 * Each counted request appends a timestamp under the bucket key. On
 * check, we prune entries older than windowMs and compare count to
 * the limit. O(n) on bucket depth per check; fine for bucket sizes
 * under ~1000.
 */

interface BucketEntry {
  /** ms timestamps of recent requests */
  hits: number[];
}

const store = new Map<string, BucketEntry>();

/**
 * Garbage-collect empty buckets periodically so memory doesn't grow
 * unbounded on a public endpoint. Runs at most every 60s based on
 * lazy invocation in checkRateLimit.
 */
let lastGc = 0;
function maybeGc(now: number): void {
  if (now - lastGc < 60_000) return;
  lastGc = now;
  for (const [key, bucket] of store.entries()) {
    // Remove entries older than 1h and drop empty buckets.
    bucket.hits = bucket.hits.filter((t) => now - t < 3600_000);
    if (bucket.hits.length === 0) store.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the oldest in-window hit expires (caller should use this for Retry-After). */
  retryAfterSec: number;
  /** Remaining quota in the current window. */
  remaining: number;
  /** Limit cap for logging. */
  limit: number;
}

export interface RateLimitOptions {
  /** Unique namespace key — e.g. "auth/signup" to avoid cross-route collisions. */
  namespace: string;
  /** Per-identity key — IP for anonymous, userId for authed. */
  identity: string;
  /** Max requests allowed within the window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export function checkRateLimit(opts: RateLimitOptions): RateLimitResult {
  const { namespace, identity, limit, windowMs } = opts;
  const key = `${namespace}::${identity}`;
  const now = Date.now();
  maybeGc(now);

  const cutoff = now - windowMs;
  const bucket = store.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => t > cutoff);

  if (bucket.hits.length >= limit) {
    const oldest = bucket.hits[0];
    const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    store.set(key, bucket);
    return {
      allowed: false,
      retryAfterSec,
      remaining: 0,
      limit,
    };
  }

  bucket.hits.push(now);
  store.set(key, bucket);
  return {
    allowed: true,
    retryAfterSec: 0,
    remaining: limit - bucket.hits.length,
    limit,
  };
}

/**
 * Helper: pull a stable "identity" string off a request — authed
 * user-id from a session (caller resolves + passes in), else a best-
 * effort client IP. Falls back to "anonymous" on opaque deploys.
 */
export function identityFromRequest(
  request: NextRequest,
  override?: string,
): string {
  if (override) return `user:${override}`;
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return `ip:${fwd.split(",")[0].trim()}`;
  const real = request.headers.get("x-real-ip");
  if (real) return `ip:${real.trim()}`;
  return "anonymous";
}

/**
 * Convenience: build a 429 NextResponse with Retry-After +
 * rate-limit headers. Callers do `if (!result.allowed) return
 * rateLimitResponse(result);`
 */
export function rateLimitResponse(result: RateLimitResult): NextResponse {
  const body = {
    error: `Too many requests. Try again in ${result.retryAfterSec}s.`,
    retryAfterSec: result.retryAfterSec,
  };
  return NextResponse.json(body, {
    status: 429,
    headers: {
      "Retry-After": String(result.retryAfterSec),
      "X-RateLimit-Limit": String(result.limit),
      "X-RateLimit-Remaining": "0",
    },
  });
}

/** Test-only: reset all buckets. */
export function __resetRateLimits(): void {
  store.clear();
  lastGc = 0;
}
