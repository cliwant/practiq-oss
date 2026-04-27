import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

/**
 * Sliding-window rate limiter.
 *
 * Two backends, picked at module load:
 *   1. **Vercel KV** (production multi-instance) when `KV_REST_API_URL`
 *      and `KV_REST_API_TOKEN` are present. Uses a per-key sorted-set
 *      style list of recent hit timestamps. Reads + writes share the
 *      same key, so two regional functions hitting the same identity
 *      converge on a single rolling window — verified by P0-01
 *      acceptance test (2 IPs share quota).
 *   2. **In-memory** (dev / single-instance) when KV env is absent.
 *      Same semantics, no network. Cheap, but each lambda has its own
 *      counter — fine for the developer machine.
 *
 * The adapter exposes only `getBucket(key)` and `putBucket(key, hits)`,
 * so the windowing logic itself stays identical.
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

interface RateLimitStore {
  get(key: string): Promise<BucketEntry | undefined>;
  set(key: string, value: BucketEntry, ttlSec: number): Promise<void>;
  clear(): Promise<void>;
  /** True when reads/writes go to a shared remote — used by tests. */
  readonly distributed: boolean;
}

class MemoryStore implements RateLimitStore {
  private map = new Map<string, BucketEntry>();
  readonly distributed = false;

  async get(key: string): Promise<BucketEntry | undefined> {
    return this.map.get(key);
  }
  async set(key: string, value: BucketEntry, _ttlSec: number): Promise<void> {
    this.map.set(key, value);
  }
  async clear(): Promise<void> {
    this.map.clear();
  }

  /** Test-only synchronous accessor for GC inspection. */
  entries(): Map<string, BucketEntry> {
    return this.map;
  }
}

class KvStore implements RateLimitStore {
  readonly distributed = true;

  async get(key: string): Promise<BucketEntry | undefined> {
    const raw = (await kv.get<BucketEntry>(`rl:${key}`)) ?? undefined;
    return raw;
  }
  async set(key: string, value: BucketEntry, ttlSec: number): Promise<void> {
    // ex = expire-after-seconds. Use 2× window so a quiet bucket gets
    // pruned even if no eviction happens on a future read.
    await kv.set(`rl:${key}`, value, { ex: Math.max(ttlSec, 60) });
  }
  async clear(): Promise<void> {
    // KV doesn't expose a wildcard delete cheaply; tests use MemoryStore.
    // No-op intentionally.
  }
}

function pickStore(): RateLimitStore {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    return new KvStore();
  }
  return new MemoryStore();
}

let storeImpl: RateLimitStore = pickStore();

/** Test-only override. Restores at end via __resetRateLimits. */
export function __setRateLimitStore(s: RateLimitStore): void {
  storeImpl = s;
}

/**
 * Garbage-collect empty buckets periodically so memory doesn't grow
 * unbounded on a public endpoint (memory store only — KV expires
 * automatically via TTL set on each write). Runs at most every 60s.
 */
let lastGc = 0;
function maybeGc(now: number): void {
  if (now - lastGc < 60_000) return;
  lastGc = now;
  if (!(storeImpl instanceof MemoryStore)) return;
  const map = storeImpl.entries();
  for (const [key, bucket] of map.entries()) {
    bucket.hits = bucket.hits.filter((t) => now - t < 3600_000);
    if (bucket.hits.length === 0) map.delete(key);
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

/**
 * Async sliding-window check. Returns `allowed: false` with a Retry-
 * After when the bucket is full, otherwise records the hit.
 */
export async function checkRateLimit(
  opts: RateLimitOptions,
): Promise<RateLimitResult> {
  const { namespace, identity, limit, windowMs } = opts;
  const key = `${namespace}::${identity}`;
  const now = Date.now();
  maybeGc(now);

  const cutoff = now - windowMs;
  const existing = (await storeImpl.get(key)) ?? { hits: [] };
  const bucket: BucketEntry = { hits: existing.hits.filter((t) => t > cutoff) };
  const ttlSec = Math.ceil(windowMs / 1000) * 2;

  if (bucket.hits.length >= limit) {
    const oldest = bucket.hits[0];
    const retryAfterSec = Math.max(
      1,
      Math.ceil((oldest + windowMs - now) / 1000),
    );
    await storeImpl.set(key, bucket, ttlSec);
    return {
      allowed: false,
      retryAfterSec,
      remaining: 0,
      limit,
    };
  }

  bucket.hits.push(now);
  await storeImpl.set(key, bucket, ttlSec);
  return {
    allowed: true,
    retryAfterSec: 0,
    remaining: limit - bucket.hits.length,
    limit,
  };
}

/** True when the active store distributes across instances (KV). */
export function isDistributedRateLimit(): boolean {
  return storeImpl.distributed;
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
export async function __resetRateLimits(): Promise<void> {
  await storeImpl.clear();
  lastGc = 0;
}
