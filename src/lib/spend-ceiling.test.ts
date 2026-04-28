/**
 * Unit tests for the cost-pricing helper (RUN 14).
 *
 * `getCurrentSpend` and `assertSpendUnderCeiling` are integration-heavy
 * (Prisma + plan-gates) and tested implicitly via the dispatch + agent
 * E2E paths. This file pins the math of `computeUsdCost` so a future
 * PRICING table edit can't silently corrupt every Approval Queue row's
 * displayed cost.
 */
import { describe, it, expect } from "vitest";
import { computeUsdCost } from "./spend-ceiling";

describe("computeUsdCost", () => {
  it("returns 0 for zero tokens regardless of model", () => {
    expect(computeUsdCost("claude-sonnet-4-5", 0, 0)).toBe(0);
    expect(computeUsdCost(null, 0, 0)).toBe(0);
  });

  it("computes Sonnet 4.5 pricing correctly ($3 in / $15 out per 1M)", () => {
    // 1M input @ $3 + 1M output @ $15 = $18
    expect(computeUsdCost("claude-sonnet-4-5", 1_000_000, 1_000_000)).toBe(18);
    // 100k input @ $3 + 200k output @ $15 = $0.30 + $3.00 = $3.30
    expect(
      computeUsdCost("claude-sonnet-4-5", 100_000, 200_000),
    ).toBeCloseTo(3.3, 4);
  });

  it("computes Haiku pricing correctly ($0.25 in / $1.25 out per 1M)", () => {
    // 1M input @ $0.25 + 1M output @ $1.25 = $1.50
    expect(computeUsdCost("claude-haiku-4", 1_000_000, 1_000_000)).toBe(1.5);
  });

  it("computes Opus pricing correctly ($15 in / $75 out per 1M)", () => {
    // 100k input @ $15 + 100k output @ $75 = $1.50 + $7.50 = $9.00
    expect(computeUsdCost("claude-opus-4", 100_000, 100_000)).toBe(9);
  });

  it("falls back to a Sonnet-shaped price for unknown models", () => {
    // Unknown model should not return 0 (which would silently
    // under-bill); falls back to $3 in / $15 out.
    expect(
      computeUsdCost("openai/text-embedding-3-small", 1_000_000, 0),
    ).toBe(3);
    expect(computeUsdCost(null, 1_000_000, 0)).toBe(3);
  });

  it("matches model by prefix (e.g. dated suffix)", () => {
    expect(
      computeUsdCost("claude-sonnet-4-5-20250101", 1_000_000, 0),
    ).toBe(3);
  });

  it("rounds to 4 decimal places to match column precision", () => {
    // 1234 input @ $3 / 1M = $0.003702
    const cost = computeUsdCost("claude-sonnet-4-5", 1234, 0);
    expect(cost).toBe(0.0037); // truncated/rounded to 4 decimals
  });

  it("a typical agent-scale run rounds to ~$0.01..$0.50", () => {
    // 5K input + 1K output Sonnet 4.5 → ~$0.030
    const sonnet = computeUsdCost("claude-sonnet-4-5", 5_000, 1_000);
    expect(sonnet).toBeGreaterThan(0.005);
    expect(sonnet).toBeLessThan(0.5);

    // 5K input + 1K output Haiku → ~$0.0025
    const haiku = computeUsdCost("claude-haiku-4", 5_000, 1_000);
    expect(haiku).toBeGreaterThan(0);
    expect(haiku).toBeLessThan(0.01);
  });
});
