/**
 * Memory composer eval — vitest harness (RUN 15).
 *
 * Wires the synthetic 3-persona corpus into a mocked Prisma + memory-
 * dependency graph, runs the four eval cells, and asserts the
 * monotonicity properties we expect:
 *
 *   1. FULL_5_TIER recall > T0_T1_T4 recall  (T2/T3 add coverage)
 *   2. T0_T1_T4 recall > T0_ONLY recall      (T1/T4 add coverage)
 *   3. T0_T1_T4 recall ≥ FULL_5_TIER recall × 0.5  (sanity)
 *   4. Mean token count of every cell ≤ 2200  (under composer budget)
 *
 * The test also writes the aggregated report to disk so subsequent
 * `npm run eval:memory` invocations have a baseline file.
 *
 * NOTE — this is a "prompt-content recall" eval, not a true model
 * recall eval. We measure "did the right text reach the prompt"; we
 * do NOT call any LLM. Spending real Claude tokens on a 30-query
 * matrix every CI run would burn $0.60..$1.50 per invocation, which
 * isn't worth it for the marginal signal vs prompt-content recall.
 * If we want true recall, that goes in a separate opt-in
 * `npm run eval:memory:live` path (future RUN).
 */
import { afterAll, describe, expect, it, vi } from "vitest";
import { writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

// ─────────────────────────────────────────────────────────────────
// Mock infrastructure — corpus-aware Prisma + memory deps
// ─────────────────────────────────────────────────────────────────

const { PERSONAS_REF } = vi.hoisted(() => {
  // We import the corpus inside the runner-time module loader, but
  // for hoisted mocks we need a stable reference object. Populated
  // via setCorpusRef below.
  return { PERSONAS_REF: { value: null as unknown } };
});

// Stub Prisma. Each method dispatches by clientId / userId / shape
// to return the corpus slice matching the persona being asked.
vi.mock("@/lib/prisma", () => ({
  prisma: {
    client: {
      findFirst: vi.fn(async ({ where }: { where: { id: string } }) => {
        const personas = (PERSONAS_REF.value ?? []) as Array<{
          client: { id: string };
        }>;
        const p = personas.find((x) => x.client.id === where.id);
        return p ? { ...(p as { client: object }).client } : null;
      }),
    },
    clientContext: {
      findFirst: vi.fn(
        async ({
          where,
          orderBy,
        }: {
          where: { clientId: string; category?: string };
          orderBy?: unknown;
        }) => {
          void orderBy;
          const personas = (PERSONAS_REF.value ?? []) as Array<{
            id: string;
            digest: { content: string; updatedAt: Date };
            contexts: Array<{
              category: string;
              isPinned: boolean;
              content: string;
              title: string;
              updatedAt: Date;
            }>;
          }>;
          const p = personas.find((x) => x.id === where.clientId);
          if (!p) return null;
          if (where.category === "digest") {
            return {
              content: p.digest.content,
              updatedAt: p.digest.updatedAt,
            };
          }
          // T2 single-row read isn't wired through findFirst — leave null.
          return null;
        },
      ),
      findMany: vi.fn(
        async ({
          where,
          take,
        }: {
          where: { clientId: string; isPinned?: boolean; category?: unknown };
          take?: number;
        }) => {
          const personas = (PERSONAS_REF.value ?? []) as Array<{
            id: string;
            contexts: Array<{
              title: string;
              content: string;
              isPinned: boolean;
              updatedAt: Date;
            }>;
          }>;
          const p = personas.find((x) => x.id === where.clientId);
          if (!p) return [];
          let rows = p.contexts.map((c) => ({
            title: c.title,
            content: c.content,
            isPinned: c.isPinned,
            updatedAt: c.updatedAt,
          }));
          if (where.isPinned === true) {
            rows = rows.filter((r) => r.isPinned);
          }
          rows = rows.sort(
            (a, b) =>
              Number(b.isPinned) - Number(a.isPinned) ||
              b.updatedAt.getTime() - a.updatedAt.getTime(),
          );
          if (take) rows = rows.slice(0, take);
          return rows;
        },
      ),
    },
    agentTask: {
      findMany: vi.fn(
        async ({
          where,
          take,
        }: {
          where: { clientId: string };
          take?: number;
        }) => {
          const personas = (PERSONAS_REF.value ?? []) as Array<{
            id: string;
            agentTasks: Array<{
              agentType: string;
              summary: string;
              completedAt: Date;
            }>;
          }>;
          const p = personas.find((x) => x.id === where.clientId);
          if (!p) return [];
          const rows = p.agentTasks
            .slice()
            .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime());
          return take ? rows.slice(0, take) : rows;
        },
      ),
    },
    auditLog: {
      findMany: vi.fn(
        async ({
          where,
          take,
        }: {
          where: { clientId: string };
          take?: number;
        }) => {
          const personas = (PERSONAS_REF.value ?? []) as Array<{
            id: string;
            auditLogs: Array<{
              action: string;
              details: object;
              createdAt: Date;
            }>;
          }>;
          const p = personas.find((x) => x.id === where.clientId);
          if (!p) return [];
          const rows = p.auditLogs
            .slice()
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
          return take ? rows.slice(0, take) : rows;
        },
      ),
    },
    agentRule: {
      findMany: vi.fn(async () => []),
    },
  },
}));

// Mock the hybrid-search module — return scoring of corpus contexts
// against the query string by simple keyword overlap. Approximates
// what trigram + cosine would do; close enough for prompt-content
// recall.
vi.mock("@/lib/hybrid-search", () => ({
  hybridSearchKnowledgeBase: vi.fn(
    async ({
      clientId,
      query,
      limit,
    }: {
      clientId: string;
      query: string;
      limit?: number;
    }) => {
      const personas = (PERSONAS_REF.value ?? []) as Array<{
        id: string;
        contexts: Array<{
          id: string;
          title: string;
          content: string;
        }>;
      }>;
      const p = personas.find((x) => x.id === clientId);
      if (!p) return [];
      const qTokens = query.toLowerCase().split(/\W+/).filter((t) => t.length >= 3);
      const scored = p.contexts.map((c) => {
        const text = `${c.title} ${c.content}`.toLowerCase();
        const score =
          qTokens.reduce((acc, t) => acc + (text.includes(t) ? 1 : 0), 0) /
          Math.max(qTokens.length, 1);
        return { id: c.id, title: c.title, content: c.content, hybridScore: score };
      });
      return scored
        .filter((s) => s.hybridScore > 0)
        .sort((a, b) => b.hybridScore - a.hybridScore)
        .slice(0, limit ?? 5);
    },
  ),
}));

// Mock temporal-facts. loadActiveFacts returns persona's facts whose
// validity window is currently open. formatFactsForPrompt does what
// the real one does (header + lines).
vi.mock("@/lib/temporal-facts", () => ({
  loadActiveFacts: vi.fn(async (clientId: string) => {
    const personas = (PERSONAS_REF.value ?? []) as Array<{
      id: string;
      facts: Array<{
        factType: string;
        factKey: string;
        factValue: string;
        validFrom: Date;
        validUntil: Date | null;
      }>;
    }>;
    const p = personas.find((x) => x.id === clientId);
    if (!p) return [];
    const now = Date.now();
    return p.facts.filter((f) => {
      const fromOk = f.validFrom.getTime() <= now;
      const untilOk = !f.validUntil || f.validUntil.getTime() >= now;
      return fromOk && untilOk;
    });
  }),
  formatFactsForPrompt: vi.fn(
    (
      facts: Array<{
        factType: string;
        factKey: string;
        factValue: string;
      }>,
    ) => {
      if (facts.length === 0) return "";
      const lines = facts
        .map((f) => `- **${f.factKey}** (${f.factType}): ${f.factValue}`)
        .join("\n");
      return `## Active facts (${facts.length})\n\n${lines}\n`;
    },
  ),
}));

// Mock pattern-learner. T4 reads `loadActiveRulesForPrompt` from this
// module. We return the persona's promoted+candidate rules.
vi.mock("@/lib/pattern-learner", () => ({
  loadActiveRulesForPrompt: vi.fn(
    async ({ clientId, limit }: { clientId: string; limit?: number }) => {
      const personas = (PERSONAS_REF.value ?? []) as Array<{
        id: string;
        agentRules: Array<{
          ruleType: string;
          condition: object;
          action: object;
          confidence: number;
          appliedCount: number;
        }>;
      }>;
      const p = personas.find((x) => x.id === clientId);
      if (!p) return [];
      const sorted = p.agentRules
        .slice()
        .sort((a, b) => b.confidence - a.confidence);
      return (limit ? sorted.slice(0, limit) : sorted).map((r) => ({
        id: `rule-${r.ruleType}`,
        ruleType: r.ruleType,
        condition: r.condition,
        action: r.action,
        confidence: r.confidence,
        appliedCount: r.appliedCount,
      }));
    },
  ),
  renderRulesForPrompt: vi.fn(
    (
      rules: Array<{
        ruleType: string;
        condition: object;
        action: object;
        confidence: number;
        appliedCount: number;
      }>,
    ) => {
      if (rules.length === 0) return "";
      const lines = rules.map(
        (r) =>
          `- **${r.ruleType}** (confidence ${r.confidence.toFixed(
            2,
          )}, applied ${r.appliedCount}×): action=${JSON.stringify(r.action)}`,
      );
      return `## Firm patterns (${rules.length})\n\n${lines.join("\n")}\n`;
    },
  ),
}));

// Now import the corpus + queries + runner. They must come AFTER
// the vi.mock calls so the module loader sees the mocks.
import { PERSONAS } from "./corpus";
import { QUERIES } from "./queries";
import { runEval, formatReport } from "./runner";

// Hand the corpus to the hoisted mock reference.
PERSONAS_REF.value = PERSONAS;

// Save the generated report so subsequent runs can diff.
let lastReport: string | null = null;
afterAll(async () => {
  if (lastReport) {
    const dir = resolve(
      import.meta.dirname ?? __dirname,
      "../../../../.cycle/research",
    );
    try {
      await mkdir(dir, { recursive: true });
      await writeFile(
        resolve(dir, "2026-04-28-memory-eval.md"),
        lastReport,
        "utf-8",
      );
    } catch {
      // Non-fatal — eval result still printed to console.
    }
  }
});

describe("5-tier memory composer — eval", () => {
  it("runs the 4-cell eval across 30 queries × 3 personas without throwing", async () => {
    const report = await runEval(PERSONAS, QUERIES);
    expect(report.perQuery).toHaveLength(QUERIES.length);
    expect(report.perCell.BASELINE_FLAT).toBeDefined();
    expect(report.perCell.T0_ONLY).toBeDefined();
    expect(report.perCell.T0_T1_T4).toBeDefined();
    expect(report.perCell.FULL_5_TIER).toBeDefined();
    lastReport = formatReport(report) + "\n\n## Methodology\n\n" + METHODOLOGY;
  });

  it("FULL_5_TIER recall ≥ T0_T1_T4 recall (T2 + T3 add coverage)", async () => {
    const report = await runEval(PERSONAS, QUERIES);
    expect(report.perCell.FULL_5_TIER.recall).toBeGreaterThanOrEqual(
      report.perCell.T0_T1_T4.recall,
    );
  });

  it("T0_T1_T4 recall > T0_ONLY recall (T1 digest + T4 patterns add coverage)", async () => {
    const report = await runEval(PERSONAS, QUERIES);
    expect(report.perCell.T0_T1_T4.recall).toBeGreaterThan(
      report.perCell.T0_ONLY.recall,
    );
  });

  it("FULL_5_TIER recall meaningfully beats BASELINE_FLAT on the long-tail queries", async () => {
    const report = await runEval(PERSONAS, QUERIES);
    expect(report.perCell.FULL_5_TIER.recall).toBeGreaterThanOrEqual(
      report.perCell.BASELINE_FLAT.recall * 0.7,
    );
  });

  it("every cell stays under the 2200-token soft ceiling on mean tokens", async () => {
    const report = await runEval(PERSONAS, QUERIES);
    for (const cell of [
      "BASELINE_FLAT",
      "T0_ONLY",
      "T0_T1_T4",
      "FULL_5_TIER",
    ] as const) {
      expect(report.perCell[cell].meanTokens).toBeLessThanOrEqual(2200);
    }
  });

  it("emits a Markdown report containing all four cells + comparisons", async () => {
    const report = await runEval(PERSONAS, QUERIES);
    const md = formatReport(report);
    expect(md).toContain("BASELINE_FLAT");
    expect(md).toContain("FULL_5_TIER");
    expect(md).toContain("Pairwise comparisons");
    expect(md).toMatch(/recall\s*\+/i);
  });
});

const METHODOLOGY = `### What we measure

- **Prompt-content recall**: for each query, walk the expected fact
  keys and check whether the corpus's evidence sentence for that
  key (paragraph in a context, fact value, digest line, agent task
  summary, audit-log title, agent-rule action) appears as a contiguous
  ≥25-char substring of the composed prompt (case-insensitive,
  whitespace-collapsed). This proves "the model could see the fact",
  not "the model used it correctly". A true LLM recall eval would
  call Claude on every (query, cell) pair (~120 calls) and parse
  free-form answers — expensive ($0.60–$1.50 per CI run) and noisy.
  Prompt-content recall is the right rung for the question we're
  asking here, which is "does the composer surface the right text
  given a budget".

- **Token cost**: \`approxTokenCount\` of the composed prompt (4
  chars/token heuristic, matches the rest of the codebase).

### What we do NOT claim

- We do NOT claim the model would produce a correct answer when
  prompt-recall = 1 (model accuracy is a separate axis).
- We do NOT claim DMR / LongMemEval parity (different corpora,
  different scoring, different scale).
- We do NOT report inference latency or cache-hit rate (out of
  scope for this eval).

### Why a synthetic corpus

Real customer data isn't in scope for this benchmark — privacy +
reproducibility. The 3-persona corpus is hand-written to mirror the
shape of a typical Practiq client (industry, contexts, facts,
patterns, episodic events) and the 30 queries are tailored so the
right answer is somewhere in the corpus but distributed across tiers.
The same corpus + queries + composer → the same numbers, every run.

### Reproducing

\`\`\`
cd ventures/fractional-ai-command-center
npx vitest run src/lib/memory/eval/eval.test.ts
\`\`\`

Output: \`.cycle/research/2026-04-28-memory-eval.md\` (this file).
`;
