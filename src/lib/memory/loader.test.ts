/**
 * Unit tests for the 5-tier memory composer (Wave-4 P1-06).
 *
 * The composer touches Prisma + hybrid-search + temporal-facts +
 * pattern-learner. To keep these tests fast and deterministic we
 * mock out the tier readers — the composer's job is *budget +
 * sequencing*, not the per-tier data fetch (those have their own
 * targeted tests where they exist). The token counter and the T0
 * profile renderer are pure functions and get exercised directly.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { approxTokenCount, truncateToTokenCap } from "./token-counter";
import { loadT0Profile, type ProfileInputClient } from "./tiers/profile";

// Mock prisma so the composer's fallback Prisma roundtrips
// (fetchClientLite, T1/T3 reader fallbacks) don't try to talk to a
// real DB during unit tests. The tier readers are exercised live in
// E2E (memory-tiering.spec.ts).
vi.mock("@/lib/prisma", () => ({
  prisma: {
    client: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
    clientContext: {
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
    },
    agentTask: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    auditLog: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    agentRule: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

// Stub out the hybrid-search + temporal-facts modules — they read
// from Prisma too. T2 returns empty for the unit test.
vi.mock("@/lib/hybrid-search", () => ({
  hybridSearchKnowledgeBase: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/lib/temporal-facts", () => ({
  loadActiveFacts: vi.fn().mockResolvedValue([]),
  formatFactsForPrompt: vi.fn().mockReturnValue(""),
}));
vi.mock("@/lib/pattern-learner", () => ({
  loadActiveRulesForPrompt: vi.fn().mockResolvedValue([]),
  renderRulesForPrompt: vi.fn().mockReturnValue(""),
}));

const baseClient: ProfileInputClient = {
  id: "cli_park",
  name: "Park CPA Group",
  industry: "accounting",
  userRole: "managing partner",
  relationshipMonths: 18,
  preferences: {
    reportTone: "data-driven",
    primaryContactRole: "owner",
    preferredFormats: ["xlsx", "docx"],
    note: "Owner reads in 5 minutes; lead with the number.",
  },
};

describe("approxTokenCount", () => {
  it("returns 0 for empty string", () => {
    expect(approxTokenCount("")).toBe(0);
  });

  it("returns 1 for a single character", () => {
    expect(approxTokenCount("x")).toBe(1);
  });

  it("approximates ~4 chars per token for English prose", () => {
    const text = "the quick brown fox jumps over the lazy dog"; // 43 chars
    // 43 / 4 = 10.75 → ceil = 11
    expect(approxTokenCount(text)).toBe(11);
  });

  it("never returns zero for non-empty input", () => {
    expect(approxTokenCount("a")).toBeGreaterThanOrEqual(1);
  });
});

describe("truncateToTokenCap", () => {
  it("returns input unchanged when under cap", () => {
    const t = "short text";
    expect(truncateToTokenCap(t, 100)).toBe(t);
  });

  it("truncates and adds the [truncated] sentinel when over cap", () => {
    const long = "a".repeat(500);
    const out = truncateToTokenCap(long, 10); // 10 tokens ≈ 40 chars
    expect(out.length).toBeLessThan(500);
    expect(out).toMatch(/\[truncated\]$/);
  });

  it("cuts at the last whitespace boundary so we don't end mid-word", () => {
    const text = "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda";
    const out = truncateToTokenCap(text, 5); // ~20 chars
    expect(out).not.toContain("delt"); // "delta" should be cut entire if mid
    expect(out.endsWith("[truncated]")).toBe(true);
  });

  it("returns empty string when cap is 0 or negative", () => {
    expect(truncateToTokenCap("anything", 0)).toBe("");
    expect(truncateToTokenCap("anything", -5)).toBe("");
  });
});

describe("loadT0Profile", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("emits client name + industry + relationship length", () => {
    const block = loadT0Profile(baseClient, 500);
    expect(block.body).toContain("Park CPA Group");
    expect(block.body).toContain("accounting");
    expect(block.body).toContain("18mo");
  });

  it("flags long-tenured (>= 12mo) clients", () => {
    const block = loadT0Profile(baseClient, 500);
    expect(block.body).toContain("long-tenured");
    const newClient = { ...baseClient, relationshipMonths: 4 };
    expect(loadT0Profile(newClient, 500).body).not.toContain("long-tenured");
  });

  it("includes operator-set preferences when present", () => {
    const block = loadT0Profile(baseClient, 500);
    expect(block.body).toContain("data-driven");
    expect(block.body).toContain("owner");
    expect(block.body).toContain("xlsx, docx");
    expect(block.body).toContain("Owner reads in 5 minutes");
  });

  it("clamps a 1000-char operator note to ~200 chars with ellipsis", () => {
    const longNote = "x".repeat(1000);
    const block = loadT0Profile(
      { ...baseClient, preferences: { note: longNote } },
      500,
    );
    expect(block.body.length).toBeLessThan(500);
    expect(block.body).toMatch(/x{197}…/);
  });

  it("falls back gracefully when preferences are null or missing fields", () => {
    const minimal: ProfileInputClient = {
      id: "x",
      name: "Sparse Co",
      industry: "retail",
      userRole: "bookkeeper",
      relationshipMonths: 1,
      preferences: null,
    };
    const block = loadT0Profile(minimal, 500);
    expect(block.body).toContain("Sparse Co");
    expect(block.body).toContain("bookkeeper");
    // No tone / no primary role lines.
    expect(block.body).not.toContain("Reporting tone");
    expect(block.body).not.toContain("Primary recipient role");
  });

  it("respects the cap parameter — never produces a body wildly over budget", () => {
    // Smallest reasonable cap. Body should still mention the client name
    // (truncation cuts at end, header is at front).
    const block = loadT0Profile(baseClient, 50);
    expect(block.tokensApprox).toBeLessThanOrEqual(60); // 10-token slack
    expect(block.body).toContain("Park CPA Group");
  });

  it("always reports hadData: true (T0 is unconditional)", () => {
    expect(loadT0Profile(baseClient, 500).hadData).toBe(true);
  });
});

/**
 * Loader-level integration: skip tiers, budget propagation. We test
 * with `skip: ["T0", "T1", "T2", "T3", "T4"]` so the composer
 * doesn't actually hit Prisma — the test verifies the composer's
 * own logic stays correct under the most extreme input.
 */
describe("loadClientMemoryForPrompt — composer-only behaviour", () => {
  it("returns an empty-prompt result when client lookup fails", async () => {
    // Use a clientId that definitely doesn't exist + a userId that
    // doesn't either. The fetchClientLite will return null and the
    // composer should return an empty-but-well-formed result.
    const { loadClientMemoryForPrompt } = await import("./loader");
    const result = await loadClientMemoryForPrompt({
      clientId: "00000000-0000-0000-0000-000000000000",
      userId: "00000000-0000-0000-0000-000000000000",
    });
    expect(result.prompt).toContain("Client memory");
    expect(result.tiers.T0.included).toBe(false);
    expect(result.tiers.T1.included).toBe(false);
    expect(result.tiers.T2.included).toBe(false);
    expect(result.tiers.T3.included).toBe(false);
    expect(result.tiers.T4.included).toBe(false);
    expect(result.headroomTokens).toBe(result.budgetTokens);
  });

  it("respects budget bounds — clamps absurd low budgets to 300", async () => {
    const { loadClientMemoryForPrompt } = await import("./loader");
    const result = await loadClientMemoryForPrompt({
      clientId: "00000000-0000-0000-0000-000000000000",
      userId: "00000000-0000-0000-0000-000000000000",
      budgetTokens: 10,
    });
    expect(result.budgetTokens).toBeGreaterThanOrEqual(300);
  });

  it("respects skip parameter — all tiers skipped means empty included set", async () => {
    const { loadClientMemoryForPrompt } = await import("./loader");
    const result = await loadClientMemoryForPrompt({
      clientId: "00000000-0000-0000-0000-000000000000",
      userId: "00000000-0000-0000-0000-000000000000",
      skip: ["T0", "T1", "T2", "T3", "T4"],
    });
    for (const t of ["T0", "T1", "T2", "T3", "T4"] as const) {
      expect(result.tiers[t].included).toBe(false);
    }
  });

  it("uses preloadedClient when provided to avoid Prisma hit", async () => {
    const { loadClientMemoryForPrompt } = await import("./loader");
    const result = await loadClientMemoryForPrompt({
      clientId: baseClient.id,
      userId: "test_user_id",
      preloadedClient: baseClient,
      // Skip everything except T0 so we don't need real DB rows.
      skip: ["T1", "T2", "T3", "T4"],
    });
    // T0 should have rendered from the preloaded client.
    expect(result.tiers.T0.included).toBe(true);
    expect(result.tiers.T0.hadData).toBe(true);
    expect(result.prompt).toContain("Park CPA Group");
  });
});
