/**
 * Unit tests for temporal-facts.
 *
 * The test surface is the deterministic / pure pieces:
 *
 *   - trigramSimilarity(a, b) — n-gram Jaccard, no I/O.
 *   - formatFactsForPrompt(facts, opts) — Markdown rendering, no I/O.
 *
 * recordFact() and loadActiveFacts() touch the database, so they're
 * exercised by the integration tests under src/lib/agents/ and by the
 * shadow-audit harness — not here. The pure pieces are where the
 * subtle bugs live (off-by-one in trigram padding, leaking
 * superseded facts into the prompt, empty-input edge cases) so this
 * test file focuses on them.
 */

import { describe, expect, it } from "vitest";
import {
  formatFactsForPrompt,
  trigramSimilarity,
} from "./temporal-facts";
import type { ClientFact } from "@/generated/prisma/client";

// ─── Test helpers ───────────────────────────────────────────────────

/**
 * Build a ClientFact with sensible defaults so tests can express only
 * what's load-bearing for each case. Uses fixed timestamps so test
 * output is stable across CI runs.
 */
function makeFact(overrides: Partial<ClientFact> = {}): ClientFact {
  const base: ClientFact = {
    id: "fact_test",
    clientId: "cli_test",
    userId: "usr_test",
    category: "preference",
    statement: "Owner prefers concise summaries",
    confidence: 0.85,
    source: "user_input",
    sourceRef: null,
    validFrom: new Date("2026-01-01T00:00:00.000Z"),
    validUntil: null,
    supersededBy: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };
  return { ...base, ...overrides };
}

// ─── trigramSimilarity ─────────────────────────────────────────────

describe("trigramSimilarity", () => {
  it("returns 1 for identical normalized strings", () => {
    expect(trigramSimilarity("Hello world", "Hello world")).toBe(1);
  });

  it("is case- and punctuation-insensitive", () => {
    expect(
      trigramSimilarity("Owner prefers data!", "owner prefers data"),
    ).toBeGreaterThan(0.95);
  });

  it("returns 0 when either side normalizes to empty", () => {
    expect(trigramSimilarity("", "anything")).toBe(0);
    expect(trigramSimilarity("---", "---")).toBe(0);
  });

  it("scores related rephrasings high enough to trigger supersession", () => {
    // Default supersedeThreshold in recordFact is 0.85 — these two
    // rephrasings of the same belief MUST cross it.
    const a = "Owner is data-driven and direct";
    const b = "Owner is data driven and direct";
    expect(trigramSimilarity(a, b)).toBeGreaterThanOrEqual(0.85);
  });

  it("scores unrelated statements low enough to NOT trigger supersession", () => {
    const a = "Owner is data-driven";
    const b = "Owner is on vacation in May";
    expect(trigramSimilarity(a, b)).toBeLessThan(0.5);
  });

  it("is order-symmetric", () => {
    const a = "Q1 estimated tax due April 15";
    const b = "April 15 is the Q1 estimated tax deadline";
    expect(trigramSimilarity(a, b)).toBeCloseTo(
      trigramSimilarity(b, a),
      10,
    );
  });
});

// ─── formatFactsForPrompt ───────────────────────────────────────────

describe("formatFactsForPrompt", () => {
  it("returns empty string for empty input", () => {
    expect(formatFactsForPrompt([])).toBe("");
  });

  it("emits the default header when no clientName given", () => {
    const md = formatFactsForPrompt([
      makeFact({ statement: "Owner is data-driven" }),
    ]);
    expect(md.startsWith("## Known facts\n\n")).toBe(true);
  });

  it("includes the clientName in the header when provided", () => {
    const md = formatFactsForPrompt(
      [makeFact({ statement: "Owner is data-driven" })],
      { clientName: "Kim's Restaurant" },
    );
    expect(md.startsWith("## Known facts about Kim's Restaurant\n\n")).toBe(
      true,
    );
  });

  it("groups facts by category in canonical order", () => {
    const md = formatFactsForPrompt([
      makeFact({
        id: "f1",
        category: "preference",
        statement: "Owner prefers terse",
      }),
      makeFact({
        id: "f2",
        category: "financial",
        statement: "Q1 revenue $145K",
      }),
      makeFact({
        id: "f3",
        category: "risk",
        statement: "Cash runway 3 months",
      }),
    ]);
    // financial must come before preference, which must come before risk.
    const finIdx = md.indexOf("### financial");
    const prefIdx = md.indexOf("### preference");
    const riskIdx = md.indexOf("### risk");
    expect(finIdx).toBeGreaterThan(-1);
    expect(prefIdx).toBeGreaterThan(finIdx);
    expect(riskIdx).toBeGreaterThan(prefIdx);
  });

  it("renders confidence rounded to 2 decimals plus source", () => {
    const md = formatFactsForPrompt([
      makeFact({
        confidence: 0.9234,
        source: "agent_extracted",
        statement: "Owner pays invoices on time",
      }),
    ]);
    expect(md).toContain(
      "- Owner pays invoices on time (conf 0.92, agent_extracted)",
    );
  });

  it("filters out superseded facts even when caller hands them in", () => {
    const stillActive = makeFact({
      id: "active",
      statement: "Active belief",
      validUntil: null,
    });
    const expired = makeFact({
      id: "expired",
      statement: "Old superseded belief",
      validFrom: new Date("2025-01-01T00:00:00.000Z"),
      validUntil: new Date("2025-12-01T00:00:00.000Z"),
    });
    const md = formatFactsForPrompt([stillActive, expired]);
    expect(md).toContain("Active belief");
    expect(md).not.toContain("Old superseded belief");
  });

  it("respects asOf to render historical state", () => {
    const wasTrueIn2025 = makeFact({
      id: "old",
      statement: "Owner prefers email",
      validFrom: new Date("2025-01-01T00:00:00.000Z"),
      validUntil: new Date("2025-12-31T00:00:00.000Z"),
    });
    const trueNow = makeFact({
      id: "new",
      statement: "Owner prefers Slack",
      validFrom: new Date("2026-01-01T00:00:00.000Z"),
      validUntil: null,
    });

    // As-of mid-2025: only the old fact is active.
    const past = formatFactsForPrompt([wasTrueIn2025, trueNow], {
      asOf: new Date("2025-06-01T00:00:00.000Z"),
    });
    expect(past).toContain("Owner prefers email");
    expect(past).not.toContain("Owner prefers Slack");

    // As-of present: only the new fact is active.
    const now = formatFactsForPrompt([wasTrueIn2025, trueNow], {
      asOf: new Date("2026-04-28T00:00:00.000Z"),
    });
    expect(now).toContain("Owner prefers Slack");
    expect(now).not.toContain("Owner prefers email");
  });

  it("returns empty string when every input fact is inactive at asOf", () => {
    const expired = makeFact({
      validFrom: new Date("2025-01-01T00:00:00.000Z"),
      validUntil: new Date("2025-06-01T00:00:00.000Z"),
    });
    const md = formatFactsForPrompt([expired], {
      asOf: new Date("2026-04-28T00:00:00.000Z"),
    });
    expect(md).toBe("");
  });

  it("preserves unknown categories at the tail rather than dropping them", () => {
    // If a category is added to the schema but not to the canonical
    // order list, we still want the fact to surface — silent drop is
    // worse than out-of-order rendering.
    const facts = [
      makeFact({
        category: "unknown_future_category",
        statement: "Future fact",
      }),
      makeFact({
        category: "financial",
        statement: "Known fact",
      }),
    ];
    const md = formatFactsForPrompt(facts);
    expect(md).toContain("### financial");
    expect(md).toContain("### unknown_future_category");
    expect(md).toContain("Future fact");
    // Known categories should still come first.
    expect(md.indexOf("### financial")).toBeLessThan(
      md.indexOf("### unknown_future_category"),
    );
  });
});
