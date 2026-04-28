/**
 * 5-tier memory eval runner — RUN 15.
 *
 * Glues the synthetic corpus (corpus.ts) and queries (queries.ts) to
 * the composer (loader.ts) and runs four cells:
 *
 *   - BASELINE_FLAT : raw flat ClientContext list (the pre-composer
 *                     "concat the latest 30 rows" path the project
 *                     used before RUN 7).
 *   - T0_ONLY       : composer with only T0 enabled (skip 1, 2, 3, 4).
 *   - T0_T1_T4      : composer with T0 + T1 + T4 (skip 2, 3) — what
 *                     a "lite" deployment without vector / episodic
 *                     would produce.
 *   - FULL_5_TIER   : composer with all five tiers active.
 *
 * For each query we measure:
 *
 *   - **tokensIn** : approxTokenCount of the composed prompt.
 *   - **recall@k**: of the query's expected fact keys, how many are
 *                   present in the prompt? Evidence-string substring
 *                   match (≥ 25 chars contiguous, case-insensitive).
 *
 * Cells aggregate recall and tokens across queries. The script does
 * NOT call any LLM — recall is purely "did the right text reach the
 * prompt"; modelling whether the model would actually use it is a
 * different (more expensive) experiment we'd run separately.
 *
 * The runner is dependency-injected: the caller passes the mocked
 * Prisma + hybrid-search + temporal-facts + pattern-learner shims.
 * This keeps `runner.ts` a pure function of (corpus, queries, cells)
 * → result, and makes it equally usable from a vitest test or a
 * standalone `npm run eval:memory` script.
 */

import {
  loadClientMemoryForPrompt,
  type TierName,
} from "../loader";
import { approxTokenCount } from "../token-counter";
import type { CorpusPersona } from "./corpus";
import type { EvalQuery } from "./queries";

// ─────────────────────────────────────────────────────────────────
// Cell definitions
// ─────────────────────────────────────────────────────────────────

export type CellId = "BASELINE_FLAT" | "T0_ONLY" | "T0_T1_T4" | "FULL_5_TIER";

const CELL_SKIP: Record<CellId, ReadonlyArray<TierName>> = {
  BASELINE_FLAT: ["T0", "T1", "T2", "T3", "T4"], // unused — baseline doesn't use composer
  T0_ONLY: ["T1", "T2", "T3", "T4"],
  T0_T1_T4: ["T2", "T3"],
  FULL_5_TIER: [],
};

// ─────────────────────────────────────────────────────────────────
// Recall scoring
// ─────────────────────────────────────────────────────────────────

/**
 * Walk the corpus once and build a map of `factKey → evidence
 * sentences`. We use this to decide whether a composed prompt
 * exposes a given fact: "does the prompt contain any substantial
 * substring of any evidence sentence for this key?"
 */
function buildEvidenceIndex(
  persona: CorpusPersona,
): Map<string, string[]> {
  const idx = new Map<string, string[]>();
  const push = (key: string, evidence: string) => {
    const arr = idx.get(key) ?? [];
    arr.push(evidence);
    idx.set(key, arr);
  };

  for (const c of persona.contexts) {
    for (const k of c.factKeys) push(k, c.content);
  }
  for (const f of persona.facts) {
    for (const k of f.factKeysExposed) push(k, f.factValue);
  }
  for (const t of persona.agentTasks) {
    for (const k of t.factKeysExposed) push(k, t.summary);
  }
  for (const a of persona.auditLogs) {
    for (const k of a.factKeysExposed) push(k, JSON.stringify(a.details));
  }
  for (const r of persona.agentRules) {
    for (const k of r.factKeysExposed) push(k, JSON.stringify(r.action));
  }
  // Digest also exposes fact keys via its content.
  for (const k of persona.digest.factKeysExposed) push(k, persona.digest.content);
  return idx;
}

/**
 * Quick contiguous-substring recall test: given an evidence string
 * and a prompt, walk the evidence in N-character windows (default
 * 25) and check whether any window appears in the prompt as a
 * substring. We collapse whitespace and lowercase both sides so
 * minor formatting changes don't tank recall.
 *
 * Why 25 chars: short enough to be robust to truncation / paraphrase,
 * long enough that random word collisions ("the", "and", "a") don't
 * count as positive recall.
 */
const WINDOW_CHARS = 25;

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function evidenceMentioned(evidence: string, prompt: string): boolean {
  const ev = normalize(evidence);
  const pm = normalize(prompt);
  if (ev.length <= WINDOW_CHARS) {
    return pm.includes(ev);
  }
  for (let i = 0; i <= ev.length - WINDOW_CHARS; i++) {
    if (pm.includes(ev.slice(i, i + WINDOW_CHARS))) return true;
  }
  return false;
}

function scoreRecall(
  prompt: string,
  expectedFactKeys: string[],
  evidenceIdx: Map<string, string[]>,
): { matched: number; expected: number; missingKeys: string[] } {
  let matched = 0;
  const missingKeys: string[] = [];
  for (const key of expectedFactKeys) {
    const evidences = evidenceIdx.get(key) ?? [];
    if (evidences.length === 0) {
      // Annotation bug — fact key has no evidence in corpus. Fail-safe:
      // count as miss but flag for ops.
      missingKeys.push(`${key} (no evidence)`);
      continue;
    }
    const found = evidences.some((e) => evidenceMentioned(e, prompt));
    if (found) matched++;
    else missingKeys.push(key);
  }
  return { matched, expected: expectedFactKeys.length, missingKeys };
}

// ─────────────────────────────────────────────────────────────────
// Baseline: raw flat ClientContext list
// ─────────────────────────────────────────────────────────────────

/**
 * Baseline render: take the latest 30 ClientContext rows + 5 most-
 * recent agent tasks summaries + the digest, dump as a flat list
 * with no tier structure. Approximates what a pre-RUN-7 prompt
 * looked like.
 */
function renderBaselineFlat(persona: CorpusPersona): string {
  const top = [...persona.contexts]
    .sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 30)
    .map((c) => `- **${c.title}** (${c.category}): ${c.content}`)
    .join("\n");
  const tasks = persona.agentTasks
    .slice(0, 5)
    .map((t) => `  • ${t.agentType}: ${t.summary}`)
    .join("\n");
  return [
    `# Memory for ${persona.client.name}`,
    `Industry: ${persona.client.industry}`,
    `Role: ${persona.client.userRole}`,
    `Relationship months: ${persona.client.relationshipMonths}`,
    "",
    "## Contexts",
    top,
    "",
    "## Recent agent runs",
    tasks,
  ].join("\n");
}

// ─────────────────────────────────────────────────────────────────
// Per-cell evaluation
// ─────────────────────────────────────────────────────────────────

export interface QueryEvalResult {
  personaId: string;
  question: string;
  expectedFactKeys: string[];
  cells: Record<
    CellId,
    {
      tokens: number;
      matched: number;
      expected: number;
      recall: number; // matched / expected, or 1 when expected = 0
      missingKeys: string[];
    }
  >;
}

export interface CellSummary {
  /** Mean recall across all queries (range 0..1). */
  recall: number;
  /** Mean tokens of the composed prompt across all queries. */
  meanTokens: number;
  /** P95 tokens. */
  p95Tokens: number;
  /** Sum of all tokens across all queries — useful for total cost. */
  totalTokens: number;
}

export interface EvalReport {
  perQuery: QueryEvalResult[];
  perCell: Record<CellId, CellSummary>;
  /**
   * Pairwise comparison: how much does the bigger cell improve over
   * the smaller? Expressed as percentage point delta in recall and
   * percentage delta in tokens.
   */
  comparisons: Array<{
    label: string;
    recallDelta: number;
    tokenDeltaPct: number;
  }>;
}

/**
 * Hook the runner uses to ask the composer to load memory under a
 * specific cell's skip configuration. The caller (vitest or script)
 * is responsible for installing module-level mocks before calling
 * `runEval`.
 */
async function loadCellPrompt(
  cell: CellId,
  persona: CorpusPersona,
  query: EvalQuery,
): Promise<string> {
  if (cell === "BASELINE_FLAT") {
    return renderBaselineFlat(persona);
  }
  const result = await loadClientMemoryForPrompt({
    clientId: persona.client.id,
    userId: persona.userId,
    query: query.vectorQuery ?? query.question,
    budgetTokens: 2000,
    skip: CELL_SKIP[cell] as ReadonlyArray<TierName>,
    preloadedClient: persona.client,
  });
  return result.prompt;
}

export async function runEval(
  personas: readonly CorpusPersona[],
  queries: readonly EvalQuery[],
  cells: readonly CellId[] = ["BASELINE_FLAT", "T0_ONLY", "T0_T1_T4", "FULL_5_TIER"],
): Promise<EvalReport> {
  const personaById = new Map(personas.map((p) => [p.id, p]));
  const evidenceByPersona = new Map(
    personas.map((p) => [p.id, buildEvidenceIndex(p)]),
  );

  const perQuery: QueryEvalResult[] = [];
  for (const q of queries) {
    const persona = personaById.get(q.personaId);
    if (!persona) {
      throw new Error(`Persona ${q.personaId} not in corpus`);
    }
    const evidence = evidenceByPersona.get(q.personaId)!;
    const cellResults: QueryEvalResult["cells"] = {} as QueryEvalResult["cells"];
    for (const cell of cells) {
      const prompt = await loadCellPrompt(cell, persona, q);
      const { matched, expected, missingKeys } = scoreRecall(
        prompt,
        q.expectedFactKeys,
        evidence,
      );
      cellResults[cell] = {
        tokens: approxTokenCount(prompt),
        matched,
        expected,
        recall: expected === 0 ? 1 : matched / expected,
        missingKeys,
      };
    }
    perQuery.push({
      personaId: q.personaId,
      question: q.question,
      expectedFactKeys: [...q.expectedFactKeys],
      cells: cellResults,
    });
  }

  // Aggregate per cell.
  const perCell = {} as Record<CellId, CellSummary>;
  for (const cell of cells) {
    const recallVals = perQuery.map((r) => r.cells[cell].recall);
    const tokenVals = perQuery.map((r) => r.cells[cell].tokens);
    perCell[cell] = {
      recall: mean(recallVals),
      meanTokens: mean(tokenVals),
      p95Tokens: percentile(tokenVals, 0.95),
      totalTokens: tokenVals.reduce((a, b) => a + b, 0),
    };
  }

  const comparisons: EvalReport["comparisons"] = [];
  if (cells.includes("BASELINE_FLAT") && cells.includes("FULL_5_TIER")) {
    comparisons.push({
      label: "FULL_5_TIER vs BASELINE_FLAT",
      recallDelta: perCell.FULL_5_TIER.recall - perCell.BASELINE_FLAT.recall,
      tokenDeltaPct:
        ((perCell.FULL_5_TIER.meanTokens - perCell.BASELINE_FLAT.meanTokens) /
          perCell.BASELINE_FLAT.meanTokens) *
        100,
    });
  }
  if (cells.includes("T0_ONLY") && cells.includes("FULL_5_TIER")) {
    comparisons.push({
      label: "FULL_5_TIER vs T0_ONLY",
      recallDelta: perCell.FULL_5_TIER.recall - perCell.T0_ONLY.recall,
      tokenDeltaPct:
        ((perCell.FULL_5_TIER.meanTokens - perCell.T0_ONLY.meanTokens) /
          perCell.T0_ONLY.meanTokens) *
        100,
    });
  }
  if (cells.includes("T0_T1_T4") && cells.includes("FULL_5_TIER")) {
    comparisons.push({
      label: "FULL_5_TIER vs T0_T1_T4",
      recallDelta: perCell.FULL_5_TIER.recall - perCell.T0_T1_T4.recall,
      tokenDeltaPct:
        ((perCell.FULL_5_TIER.meanTokens - perCell.T0_T1_T4.meanTokens) /
          perCell.T0_T1_T4.meanTokens) *
        100,
    });
  }

  return { perQuery, perCell, comparisons };
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(p * sorted.length));
  return sorted[idx];
}

/**
 * Pretty-print the eval report as a Markdown table — same shape we
 * write to .cycle/research/. Used by both the script and the tests'
 * console.log when debugging.
 */
export function formatReport(report: EvalReport): string {
  const cells: CellId[] = ["BASELINE_FLAT", "T0_ONLY", "T0_T1_T4", "FULL_5_TIER"];
  const lines: string[] = [];
  lines.push("# 5-tier memory eval — recall vs token cost\n");
  lines.push(
    "| Cell | Recall (mean) | Mean tokens | P95 tokens | Total tokens |",
  );
  lines.push(
    "|------|---------------|-------------|------------|--------------|",
  );
  for (const c of cells) {
    const s = report.perCell[c];
    if (!s) continue;
    lines.push(
      `| ${c} | ${(s.recall * 100).toFixed(1)}% | ${s.meanTokens.toFixed(
        0,
      )} | ${s.p95Tokens} | ${s.totalTokens} |`,
    );
  }
  lines.push("");
  if (report.comparisons.length > 0) {
    lines.push("## Pairwise comparisons");
    for (const cmp of report.comparisons) {
      lines.push(
        `- **${cmp.label}**: recall +${(cmp.recallDelta * 100).toFixed(
          1,
        )} pp · tokens ${
          cmp.tokenDeltaPct > 0 ? "+" : ""
        }${cmp.tokenDeltaPct.toFixed(1)}%`,
      );
    }
    lines.push("");
  }
  // Per-query detail (truncated to first 6 for the at-a-glance summary).
  lines.push("## Sample per-query detail (first 6)");
  for (const q of report.perQuery.slice(0, 6)) {
    lines.push(`### ${q.personaId} — "${q.question}"`);
    lines.push("");
    lines.push("| Cell | Recall | Tokens | Missing keys |");
    lines.push("|------|--------|--------|--------------|");
    for (const c of cells) {
      const r = q.cells[c];
      if (!r) continue;
      const missing =
        r.missingKeys.length > 0
          ? r.missingKeys.slice(0, 3).join(", ")
          : "—";
      lines.push(
        `| ${c} | ${r.matched}/${r.expected} | ${r.tokens} | ${missing} |`,
      );
    }
    lines.push("");
  }
  return lines.join("\n");
}
