/**
 * scripts/eval-live.ts — RUN 20.
 *
 * Live agent-quality benchmark. The vitest harness in
 * `src/lib/memory/eval/eval.test.ts` measures **prompt-content recall**
 * (did the right text reach the prompt). This script measures
 * **model recall** — does the actual Claude model produce a useful
 * answer when given the composed prompt + the user query?
 *
 * Two experiments:
 *
 *   A. **Memory recall (live)** — for each persona, run the FULL_5_TIER
 *      composer to build a system prompt, then ask Claude the eval
 *      query as the user message. Score recall: did the answer mention
 *      the expected fact's evidence string?
 *
 *   B. **Agent quality (live)** — actually invoke
 *      `runAgent(DAILY_BRIEFING_AGENT, ...)` against each of the three
 *      personas with mocked Prisma data. Score the output against
 *      qualitative criteria: ≥1 specific summary point, ≥1 concrete
 *      action with confidence, no hallucinated metrics, schema valid.
 *
 * Cost guardrail: runs ~6 + 3 = 9 Claude calls per script invocation
 * by default. At Sonnet 4.5 prices that's roughly $0.08-0.20.
 * Output: `.cycle/research/2026-04-28-live-benchmark.md`.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=... npx tsx scripts/eval-live.ts
 *
 * Or with --quick to run only experiment B (agent quality, 3 calls):
 *   ANTHROPIC_API_KEY=... npx tsx scripts/eval-live.ts --quick
 *
 * Or --persona=kim-rest to run a single persona:
 *   ANTHROPIC_API_KEY=... npx tsx scripts/eval-live.ts --persona=kim-rest
 */

import "dotenv/config";
import { writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import Anthropic from "@anthropic-ai/sdk";

import { PERSONAS, type CorpusPersona } from "../src/lib/memory/eval/corpus";
import { QUERIES, type EvalQuery } from "../src/lib/memory/eval/queries";

// ─────────────────────────────────────────────────────────────────
// CLI args
// ─────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const QUICK = argv.includes("--quick");
const PERSONA_FILTER = argv.find((a) => a.startsWith("--persona="))?.split("=")[1];

// ─────────────────────────────────────────────────────────────────
// Setup — Anthropic client + budget guard
// ─────────────────────────────────────────────────────────────────

// Prefer OpenRouter's Anthropic-shim when configured (cheaper + the key
// usually has credits). Falls back to Anthropic-direct when only that
// key is present.
const useOpenRouter = !!process.env.OPENROUTER_API_KEY?.trim();
const apiKey =
  process.env.OPENROUTER_API_KEY?.trim() ||
  process.env.ANTHROPIC_API_KEY?.trim();
if (!apiKey) {
  console.error(
    "[eval-live] Set OPENROUTER_API_KEY or ANTHROPIC_API_KEY in studio root .env.local and re-run.",
  );
  process.exit(1);
}

const client = new Anthropic({
  apiKey,
  ...(useOpenRouter
    ? {
        baseURL: "https://openrouter.ai/api",
        defaultHeaders: {
          "HTTP-Referer": "https://practiq.dev",
          "X-Title": "Practiq eval-live",
        },
      }
    : {}),
});
const MODEL = useOpenRouter
  ? "anthropic/claude-sonnet-4.5"
  : "claude-sonnet-4-5-20250929";
console.log(
  `[eval-live] Using ${useOpenRouter ? "OpenRouter" : "Anthropic-direct"} → ${MODEL}`,
);
// Per Sonnet 4.5 list pricing — used for cost reporting only.
const PRICING_INPUT_PER_1M = 3;
const PRICING_OUTPUT_PER_1M = 15;

interface LiveCallStats {
  inputTokens: number;
  outputTokens: number;
  usdCost: number;
  durationMs: number;
}

function statsForResponse(
  res: Anthropic.Messages.Message,
  startedAt: number,
): LiveCallStats {
  const inputTokens = res.usage?.input_tokens ?? 0;
  const outputTokens = res.usage?.output_tokens ?? 0;
  return {
    inputTokens,
    outputTokens,
    usdCost:
      (inputTokens * PRICING_INPUT_PER_1M) / 1_000_000 +
      (outputTokens * PRICING_OUTPUT_PER_1M) / 1_000_000,
    durationMs: Date.now() - startedAt,
  };
}

// ─────────────────────────────────────────────────────────────────
// Prompt-only composer (avoids the real loader's Prisma deps)
// ─────────────────────────────────────────────────────────────────

/**
 * Mini composer — assembles a 5-tier-shaped prompt directly from the
 * synthetic corpus rather than going through `loadClientMemoryForPrompt`
 * (which would need a fully wired Prisma + hybrid-search). This is a
 * faithful reproduction of the tier ordering so the live benchmark
 * exercises the same shape the production composer produces.
 */
function composeFullPrompt(persona: CorpusPersona, vectorQuery: string): string {
  const sections: string[] = ["# Client memory (5-tier)"];

  // T0 — profile
  sections.push(
    `## T0 Profile\n\n- **Name**: ${persona.client.name}\n- **Industry**: ${persona.client.industry}\n- **Role I play**: ${persona.client.userRole}\n- **Relationship**: ${persona.client.relationshipMonths} months\n- **Preferences**: ${JSON.stringify(persona.client.preferences)}`,
  );

  // T1 — digest
  sections.push(`## T1 Rolling digest (recent)\n\n${persona.digest.content}`);

  // T4 — firm patterns (top 4 by confidence)
  const patterns = [...persona.agentRules]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 4)
    .map(
      (r) =>
        `- **${r.ruleType}** (confidence ${r.confidence.toFixed(2)}, applied ${r.appliedCount}×): ${JSON.stringify(r.action)}`,
    )
    .join("\n");
  sections.push(`## T4 Firm patterns\n\n${patterns}`);

  // T3 — episodic (top 5 tasks + 3 decisions, newest first)
  const tasks = [...persona.agentTasks]
    .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())
    .slice(0, 5)
    .map(
      (t) => `- ${t.completedAt.toISOString().slice(0, 10)} · ${t.agentType} · ${t.summary}`,
    );
  const decisions = [...persona.auditLogs]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 3)
    .map(
      (a) => `- ${a.createdAt.toISOString().slice(0, 10)} · operator ${a.action} · ${(a.details as { itemTitle?: string }).itemTitle ?? "approval item"}`,
    );
  sections.push(
    `## T3 Episodic timeline (newest first)\n\n${tasks.concat(decisions).join("\n")}`,
  );

  // T2 — vector hits (top 5 contexts by keyword overlap to vectorQuery)
  const qTokens = vectorQuery
    .toLowerCase()
    .split(/\W+/)
    .filter((t) => t.length >= 3);
  const hits = persona.contexts
    .map((c) => {
      const text = `${c.title} ${c.content}`.toLowerCase();
      const score = qTokens.reduce(
        (acc, t) => acc + (text.includes(t) ? 1 : 0),
        0,
      );
      return { c, score };
    })
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(
      (h, i) =>
        `${i + 1}. **${h.c.title}** — ${h.c.content.length > 240 ? h.c.content.slice(0, 237).trim() + "…" : h.c.content}`,
    );
  // Active facts
  const facts = persona.facts
    .filter((f) => {
      const fromOk = f.validFrom.getTime() <= Date.now();
      const untilOk = !f.validUntil || f.validUntil.getTime() >= Date.now();
      return fromOk && untilOk;
    })
    .map((f) => `- **${f.factKey}** (${f.factType}): ${f.factValue}`);
  sections.push(
    `## T2 Vector hits + temporal facts\n\nQuery: "${vectorQuery}"\n\n### Relevant knowledge (top ${hits.length})\n${hits.join("\n")}\n\n### Active facts (bitemporal)\n${facts.join("\n")}`,
  );

  return sections.join("\n\n");
}

/**
 * Baseline render — flat 30-row dump.
 */
function composeBaselinePrompt(persona: CorpusPersona): string {
  const top = [...persona.contexts]
    .sort(
      (a, b) =>
        Number(b.isPinned) - Number(a.isPinned) ||
        b.updatedAt.getTime() - a.updatedAt.getTime(),
    )
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
// Recall scorer — same evidence-substring approach as RUN 15
// ─────────────────────────────────────────────────────────────────

const WINDOW_CHARS = 25;

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function evidenceMentioned(evidence: string, target: string): boolean {
  const ev = normalize(evidence);
  const pm = normalize(target);
  if (ev.length <= WINDOW_CHARS) return pm.includes(ev);
  for (let i = 0; i <= ev.length - WINDOW_CHARS; i++) {
    if (pm.includes(ev.slice(i, i + WINDOW_CHARS))) return true;
  }
  return false;
}

function buildEvidenceIndex(persona: CorpusPersona): Map<string, string[]> {
  const idx = new Map<string, string[]>();
  const push = (key: string, e: string) => {
    const arr = idx.get(key) ?? [];
    arr.push(e);
    idx.set(key, arr);
  };
  for (const c of persona.contexts)
    for (const k of c.factKeys) push(k, c.content);
  for (const f of persona.facts)
    for (const k of f.factKeysExposed) push(k, f.factValue);
  for (const t of persona.agentTasks)
    for (const k of t.factKeysExposed) push(k, t.summary);
  for (const a of persona.auditLogs)
    for (const k of a.factKeysExposed) push(k, JSON.stringify(a.details));
  for (const r of persona.agentRules)
    for (const k of r.factKeysExposed) push(k, JSON.stringify(r.action));
  for (const k of persona.digest.factKeysExposed)
    push(k, persona.digest.content);
  return idx;
}

function scoreAnswer(
  answer: string,
  expectedFactKeys: string[],
  evidence: Map<string, string[]>,
): { matched: number; expected: number; missingKeys: string[] } {
  let matched = 0;
  const missingKeys: string[] = [];
  for (const key of expectedFactKeys) {
    const evs = evidence.get(key) ?? [];
    const found = evs.some((e) => evidenceMentioned(e, answer));
    if (found) matched++;
    else missingKeys.push(key);
  }
  return { matched, expected: expectedFactKeys.length, missingKeys };
}

// ─────────────────────────────────────────────────────────────────
// Experiment A — live memory recall on selected queries
// ─────────────────────────────────────────────────────────────────

interface QueryRunResult {
  personaId: string;
  question: string;
  cell: "FULL_5_TIER" | "BASELINE_FLAT";
  answer: string;
  matched: number;
  expected: number;
  recall: number;
  missingKeys: string[];
  stats: LiveCallStats;
}

async function runMemoryRecall(): Promise<QueryRunResult[]> {
  console.log("\n=== Experiment A: live memory recall ===");
  const results: QueryRunResult[] = [];
  // Sample 6 queries (2 per persona) so the run stays cheap.
  const sampled = sampleQueries(6);
  for (const q of sampled) {
    const persona = PERSONAS.find((p) => p.id === q.personaId)!;
    const evidence = buildEvidenceIndex(persona);
    for (const cell of ["FULL_5_TIER", "BASELINE_FLAT"] as const) {
      const startedAt = Date.now();
      const systemPrompt =
        cell === "FULL_5_TIER"
          ? composeFullPrompt(persona, q.vectorQuery ?? q.question)
          : composeBaselinePrompt(persona);
      const userMessage = `${q.question}\n\nAnswer concisely. Cite specific facts from the memory above. If you don't have enough information, say so.`;
      const res = await client.messages.create({
        model: MODEL,
        max_tokens: 600,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      });
      const stats = statsForResponse(res, startedAt);
      const answer = res.content
        .map((b) => (b.type === "text" ? b.text : ""))
        .join("");
      const score = scoreAnswer(answer, q.expectedFactKeys, evidence);
      results.push({
        personaId: q.personaId,
        question: q.question,
        cell,
        answer,
        ...score,
        recall: score.expected === 0 ? 1 : score.matched / score.expected,
        stats,
      });
      console.log(
        `[A][${cell}] ${persona.client.name} :: "${q.question.slice(0, 50)}…" — recall ${score.matched}/${score.expected} (${stats.durationMs}ms, $${stats.usdCost.toFixed(4)})`,
      );
    }
  }
  return results;
}

function sampleQueries(n: number): EvalQuery[] {
  const byPersona = new Map<string, EvalQuery[]>();
  for (const q of QUERIES) {
    const arr = byPersona.get(q.personaId) ?? [];
    arr.push(q);
    byPersona.set(q.personaId, arr);
  }
  const perPersona = Math.ceil(n / byPersona.size);
  const result: EvalQuery[] = [];
  for (const [, qs] of byPersona) {
    // Take queries that span tiers — skip the most trivial T0-only ones.
    result.push(...qs.slice(2, 2 + perPersona));
  }
  return PERSONA_FILTER
    ? result.filter((q) => q.personaId === PERSONA_FILTER)
    : result.slice(0, n);
}

// ─────────────────────────────────────────────────────────────────
// Experiment B — daily-briefing agent quality on each persona
// ─────────────────────────────────────────────────────────────────

interface AgentQualityResult {
  personaId: string;
  schemaValid: boolean;
  summaryPoints: number;
  actionsCount: number;
  hasConcreteAction: boolean;
  meanActionConfidence: number;
  hallucinationCheck: {
    suspectedHallucinations: number;
    examples: string[];
  };
  rawJson: unknown;
  stats: LiveCallStats;
}

const BRIEFING_TOOL_NAME = "submit_daily_briefing";
const BRIEFING_TOOL_INPUT_SCHEMA = {
  type: "object" as const,
  properties: {
    summary: { type: "array" as const, items: { type: "string" as const } },
    actions: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          title: { type: "string" as const },
          reason: { type: "string" as const },
          priority: {
            type: "string" as const,
            enum: ["high", "medium", "low"],
          },
          dueHint: { type: "string" as const },
          confidence: { type: "number" as const, minimum: 0, maximum: 1 },
        },
        required: ["title", "reason", "priority", "confidence"],
      },
    },
    watch: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          topic: { type: "string" as const },
          note: { type: "string" as const },
        },
        required: ["topic", "note"],
      },
    },
    confidence: { type: "number" as const, minimum: 0, maximum: 1 },
  },
  required: ["summary", "actions", "watch", "confidence"],
};

async function runAgentQuality(): Promise<AgentQualityResult[]> {
  console.log("\n=== Experiment B: live daily-briefing agent quality ===");
  const results: AgentQualityResult[] = [];
  const personasToRun = PERSONA_FILTER
    ? PERSONAS.filter((p) => p.id === PERSONA_FILTER)
    : PERSONAS;
  for (const persona of personasToRun) {
    const startedAt = Date.now();
    const today = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const systemPrompt = `You are the morning briefing agent inside Practiq. Today is ${today}. Produce a concise briefing for the operator (${persona.client.userRole}). Tone: ${(persona.client.preferences as { reportTone?: string }).reportTone ?? "professional"}. Output via the submit_daily_briefing tool only.\n\n${composeFullPrompt(persona, "morning briefing daily client review")}`;
    const userPrompt = `Produce today's briefing for ${persona.client.name}. Be concrete, cite specific facts, and don't invent numbers. The system prompt contains the 5-tier client memory.`;
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      tools: [
        {
          name: BRIEFING_TOOL_NAME,
          description: "Submit the morning client briefing.",
          input_schema: BRIEFING_TOOL_INPUT_SCHEMA,
        },
      ],
      tool_choice: { type: "tool", name: BRIEFING_TOOL_NAME },
    });
    const stats = statsForResponse(res, startedAt);
    const tu = res.content.find(
      (b): b is Extract<typeof b, { type: "tool_use" }> =>
        b.type === "tool_use" && b.name === BRIEFING_TOOL_NAME,
    );
    if (!tu) {
      console.warn(
        `[B] ${persona.client.name} — schema mismatch (no tool_use) — skipping`,
      );
      continue;
    }
    const json = tu.input as {
      summary: string[];
      actions: Array<{ title: string; reason: string; confidence: number }>;
      watch: Array<{ topic: string; note: string }>;
      confidence: number;
    };
    const allText =
      [
        ...(json.summary ?? []),
        ...(json.actions ?? []).flatMap((a) => [a.title, a.reason]),
        ...(json.watch ?? []).flatMap((w) => [w.topic, w.note]),
      ].join(" ") ?? "";
    const evidence = buildEvidenceIndex(persona);
    // "Hallucination" probe: extract dollar figures + dates that the
    // model produced and check whether each appears anywhere in the
    // corpus's evidence pool. Anything not found we flag as suspect.
    const numericMentions =
      allText.match(/\$[\d,]+(?:\.\d{2})?|\d+\s?%|\d{4}-\d{2}-\d{2}/g) ?? [];
    const corpusBlob = [
      ...persona.contexts.map((c) => c.content),
      ...persona.facts.map((f) => f.factValue),
      ...persona.agentTasks.map((t) => t.summary),
      persona.digest.content,
    ].join("\n");
    const suspect = numericMentions.filter(
      (m) => !corpusBlob.toLowerCase().includes(m.toLowerCase()),
    );
    void evidence; // (kept for symmetry with experiment A)

    const result: AgentQualityResult = {
      personaId: persona.id,
      schemaValid: true,
      summaryPoints: (json.summary ?? []).length,
      actionsCount: (json.actions ?? []).length,
      hasConcreteAction: (json.actions ?? []).some(
        (a) =>
          typeof a.title === "string" &&
          a.title.length > 8 &&
          typeof a.confidence === "number" &&
          a.confidence >= 0.5,
      ),
      meanActionConfidence:
        (json.actions ?? []).length > 0
          ? (json.actions ?? []).reduce((s, a) => s + (a.confidence ?? 0), 0) /
            (json.actions ?? []).length
          : 0,
      hallucinationCheck: {
        suspectedHallucinations: suspect.length,
        examples: suspect.slice(0, 5),
      },
      rawJson: json,
      stats,
    };
    results.push(result);
    console.log(
      `[B] ${persona.client.name} — summary=${result.summaryPoints} actions=${result.actionsCount} concrete=${result.hasConcreteAction} confidence=${result.meanActionConfidence.toFixed(2)} suspectFigures=${result.hallucinationCheck.suspectedHallucinations} ($${stats.usdCost.toFixed(4)}, ${stats.durationMs}ms)`,
    );
  }
  return results;
}

// ─────────────────────────────────────────────────────────────────
// Report
// ─────────────────────────────────────────────────────────────────

function formatReport(
  recall: QueryRunResult[],
  quality: AgentQualityResult[],
): string {
  const lines: string[] = [];
  lines.push("# Live agent benchmark — RUN 20\n");
  lines.push(`Model: \`${MODEL}\` · ${new Date().toISOString()}\n`);
  lines.push(
    `Total cost: $${(recall.reduce((s, r) => s + r.stats.usdCost, 0) + quality.reduce((s, r) => s + r.stats.usdCost, 0)).toFixed(4)} across ${recall.length + quality.length} Claude calls\n`,
  );

  if (recall.length > 0) {
    lines.push("## Experiment A — Live memory recall (FULL_5_TIER vs BASELINE_FLAT)");
    lines.push("");
    const byCell = { FULL_5_TIER: [] as QueryRunResult[], BASELINE_FLAT: [] as QueryRunResult[] };
    for (const r of recall) byCell[r.cell].push(r);
    for (const cell of ["FULL_5_TIER", "BASELINE_FLAT"] as const) {
      const arr = byCell[cell];
      const meanRecall =
        arr.length > 0
          ? arr.reduce((s, r) => s + r.recall, 0) / arr.length
          : 0;
      const meanCost =
        arr.length > 0
          ? arr.reduce((s, r) => s + r.stats.usdCost, 0) / arr.length
          : 0;
      const meanIn =
        arr.length > 0
          ? arr.reduce((s, r) => s + r.stats.inputTokens, 0) / arr.length
          : 0;
      const meanOut =
        arr.length > 0
          ? arr.reduce((s, r) => s + r.stats.outputTokens, 0) / arr.length
          : 0;
      lines.push(
        `**${cell}**: recall ${(meanRecall * 100).toFixed(1)}% · mean input ${meanIn.toFixed(0)} tokens · mean output ${meanOut.toFixed(0)} tokens · mean $${meanCost.toFixed(4)}/query`,
      );
    }
    lines.push("");
    lines.push("### Per-query");
    lines.push("");
    lines.push(
      "| Persona | Question | Cell | Recall | Tokens (in/out) | Cost |",
    );
    lines.push(
      "|---------|----------|------|--------|-----------------|------|",
    );
    for (const r of recall) {
      lines.push(
        `| ${r.personaId} | ${r.question.slice(0, 50).replace(/\|/g, "\\|")} | ${r.cell} | ${r.matched}/${r.expected} | ${r.stats.inputTokens}/${r.stats.outputTokens} | $${r.stats.usdCost.toFixed(4)} |`,
      );
    }
    lines.push("");
  }

  if (quality.length > 0) {
    lines.push("## Experiment B — Live daily-briefing agent quality\n");
    lines.push(
      "| Persona | Schema valid | Summary | Actions | Concrete | Mean conf | Suspect figures |",
    );
    lines.push(
      "|---------|--------------|---------|---------|----------|-----------|-----------------|",
    );
    for (const r of quality) {
      lines.push(
        `| ${r.personaId} | ${r.schemaValid ? "✓" : "✗"} | ${r.summaryPoints} | ${r.actionsCount} | ${r.hasConcreteAction ? "✓" : "✗"} | ${r.meanActionConfidence.toFixed(2)} | ${r.hallucinationCheck.suspectedHallucinations}${r.hallucinationCheck.examples.length > 0 ? " (" + r.hallucinationCheck.examples.join(", ") + ")" : ""} |`,
      );
    }
    lines.push("");

    // Full sample output for one persona for human spot-check.
    if (quality[0]) {
      lines.push("### Sample output — " + quality[0].personaId);
      lines.push("```json");
      lines.push(JSON.stringify(quality[0].rawJson, null, 2));
      lines.push("```");
    }
  }

  // Notes / methodology
  lines.push("\n## Methodology\n");
  lines.push(
    "- **Experiment A**: same corpus + queries as the deterministic prompt-content recall benchmark (RUN 15). Rather than substring-checking the prompt, we send it to Claude as the system prompt + ask the question, then substring-check the model's answer. This measures **model recall** vs **prompt recall**.\n",
  );
  lines.push(
    "- **Experiment B**: forces a real `submit_daily_briefing` tool call and inspects the structured output. `hasConcreteAction` requires action.title.length > 8 + confidence ≥ 0.5. `suspectFigures` is a numeric-mention check: every $/percent/date the model produces is searched against the entire corpus blob; non-matches are flagged for human review (NOT a guaranteed hallucination, just a tripwire).\n",
  );
  lines.push(
    "- Run is opt-in (`npm run eval:live` requires `ANTHROPIC_API_KEY`). NOT included in CI.\n",
  );
  return lines.join("\n");
}

// ─────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────

async function main() {
  const recall = QUICK ? [] : await runMemoryRecall();
  const quality = await runAgentQuality();

  const report = formatReport(recall, quality);
  const outPath = resolve(
    __dirname,
    "..",
    ".cycle/research/2026-04-28-live-benchmark.md",
  );
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, report, "utf-8");
  console.log(`\n[eval-live] Report saved to ${outPath}`);

  const totalCost =
    recall.reduce((s, r) => s + r.stats.usdCost, 0) +
    quality.reduce((s, r) => s + r.stats.usdCost, 0);
  console.log(
    `[eval-live] Total cost: $${totalCost.toFixed(4)} across ${recall.length + quality.length} Claude calls`,
  );
}

main().catch((err) => {
  console.error("[eval-live] FAILED:", err);
  process.exit(1);
});
