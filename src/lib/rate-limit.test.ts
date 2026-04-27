import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  checkRateLimit,
  __resetRateLimits,
  rateLimitResponse,
  identityFromRequest,
} from "./rate-limit";

beforeEach(async () => {
  await __resetRateLimits();
});

describe("checkRateLimit", () => {
  it("allows requests under the limit", async () => {
    for (let i = 0; i < 5; i++) {
      const r = await checkRateLimit({
        namespace: "test",
        identity: "ip:1.2.3.4",
        limit: 5,
        windowMs: 60_000,
      });
      expect(r.allowed).toBe(true);
      expect(r.remaining).toBe(5 - i - 1);
    }
  });

  it("blocks the (limit+1)-th request within the window", async () => {
    for (let i = 0; i < 5; i++) {
      await checkRateLimit({
        namespace: "t",
        identity: "ip:x",
        limit: 5,
        windowMs: 60_000,
      });
    }
    const blocked = await checkRateLimit({
      namespace: "t",
      identity: "ip:x",
      limit: 5,
      windowMs: 60_000,
    });
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
    expect(blocked.retryAfterSec).toBeLessThanOrEqual(60);
  });

  it("scopes per-namespace (different namespaces do not collide)", async () => {
    for (let i = 0; i < 5; i++) {
      await checkRateLimit({
        namespace: "a",
        identity: "ip:x",
        limit: 5,
        windowMs: 60_000,
      });
    }
    const other = await checkRateLimit({
      namespace: "b",
      identity: "ip:x",
      limit: 5,
      windowMs: 60_000,
    });
    expect(other.allowed).toBe(true);
  });

  it("scopes per-identity (different IPs do not collide)", async () => {
    for (let i = 0; i < 5; i++) {
      await checkRateLimit({
        namespace: "t",
        identity: "ip:a",
        limit: 5,
        windowMs: 60_000,
      });
    }
    const other = await checkRateLimit({
      namespace: "t",
      identity: "ip:b",
      limit: 5,
      windowMs: 60_000,
    });
    expect(other.allowed).toBe(true);
  });

  it("old hits slide out of the window", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    for (let i = 0; i < 5; i++) {
      await checkRateLimit({
        namespace: "t",
        identity: "ip:x",
        limit: 5,
        windowMs: 60_000,
      });
    }
    expect(
      (
        await checkRateLimit({
          namespace: "t",
          identity: "ip:x",
          limit: 5,
          windowMs: 60_000,
        })
      ).allowed,
    ).toBe(false);

    // Advance past the window.
    vi.setSystemTime(new Date("2026-01-01T00:01:01Z"));
    expect(
      (
        await checkRateLimit({
          namespace: "t",
          identity: "ip:x",
          limit: 5,
          windowMs: 60_000,
        })
      ).allowed,
    ).toBe(true);
    vi.useRealTimers();
  });
});

describe("rateLimitResponse", () => {
  it("returns 429 with Retry-After and rate-limit headers", () => {
    const res = rateLimitResponse({
      allowed: false,
      retryAfterSec: 30,
      remaining: 0,
      limit: 10,
    });
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("30");
    expect(res.headers.get("X-RateLimit-Limit")).toBe("10");
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("0");
  });
});

describe("identityFromRequest", () => {
  const mkReq = (headers: Record<string, string>) =>
    ({
      headers: {
        get: (k: string) => headers[k.toLowerCase()] ?? null,
      },
    }) as unknown as import("next/server").NextRequest;

  it("prefers override (user id) when provided", () => {
    const r = mkReq({});
    expect(identityFromRequest(r, "user_123")).toBe("user:user_123");
  });

  it("uses x-forwarded-for first-hop IP otherwise", () => {
    const r = mkReq({ "x-forwarded-for": "9.9.9.9, 10.0.0.1" });
    expect(identityFromRequest(r)).toBe("ip:9.9.9.9");
  });

  it("falls back to x-real-ip", () => {
    const r = mkReq({ "x-real-ip": "8.8.8.8" });
    expect(identityFromRequest(r)).toBe("ip:8.8.8.8");
  });

  it("returns anonymous with no IP headers", () => {
    const r = mkReq({});
    expect(identityFromRequest(r)).toBe("anonymous");
  });
});
