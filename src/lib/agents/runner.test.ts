/**
 * Unit tests for runner.ts helpers (RUN 14).
 *
 * `runAgent` itself is integration-heavy (Prisma + Claude provider) so
 * we don't unit test it here — the dispatcher tests cover the contract
 * via mocks. This file exercises the pure functions added in RUN 14:
 *
 *   - PermanentAgentError class (instanceof + name)
 *   - isTransientAgentError classifier — covering each major
 *     transient pattern AND each permanent pattern, plus the
 *     "unknown error" → transient default.
 */
import { describe, it, expect } from "vitest";
import { PermanentAgentError, isTransientAgentError } from "./runner";

describe("PermanentAgentError", () => {
  it("inherits Error and carries the message + name", () => {
    const e = new PermanentAgentError("Client xyz not found");
    expect(e).toBeInstanceOf(Error);
    expect(e).toBeInstanceOf(PermanentAgentError);
    expect(e.message).toBe("Client xyz not found");
    expect(e.name).toBe("PermanentAgentError");
  });
});

describe("isTransientAgentError", () => {
  it("returns false for PermanentAgentError instances", () => {
    expect(isTransientAgentError(new PermanentAgentError("nope"))).toBe(false);
  });

  // ── Permanent patterns ─────────────────────────────────────
  it.each([
    "Agent daily_briefing output parse failed: bad JSON",
    "Output parse failed at offset 23",
    "Client abc-123 not found",
    "401 Invalid API key",
    "Unauthorized — re-authenticate",
    "401 authentication required",
    "schema mismatch on field X",
    "invalid_request_error: bad model",
  ])("classifies '%s' as permanent", (msg) => {
    expect(isTransientAgentError(new Error(msg))).toBe(false);
  });

  // ── Transient patterns ─────────────────────────────────────
  it.each([
    "rate limit exceeded — retry in 30s",
    "rate_limit_error: too many requests",
    "HTTP 429 too many requests",
    "Anthropic responded with 503 service overloaded",
    "Internal server error from upstream",
    "502 bad gateway",
    "504 gateway timeout",
    "ECONNREFUSED 127.0.0.1:443",
    "ETIMEDOUT after 60000ms",
    "fetch failed: network unreachable",
    "Request timeout after 30s",
  ])("classifies '%s' as transient", (msg) => {
    expect(isTransientAgentError(new Error(msg))).toBe(true);
  });

  it("defaults to transient on unknown / empty errors (be liberal, retry is bounded)", () => {
    expect(isTransientAgentError(undefined)).toBe(true);
    expect(isTransientAgentError("")).toBe(true);
    expect(isTransientAgentError(new Error("some weird thing"))).toBe(true);
  });

  it("short-circuits on permanent patterns even when transient keywords appear in the same message", () => {
    // A parse-error message that mentions "rate" embedded in JSON
    // should still be classified permanent.
    expect(
      isTransientAgentError(
        new Error('Agent output parse failed: invalid "rate_limit": 429'),
      ),
    ).toBe(false);
  });
});
