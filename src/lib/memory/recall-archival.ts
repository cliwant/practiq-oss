/**
 * `recall_archival` — Letta-style LLM self-paging primitive (P1-07).
 *
 * The chat system prompt only inlines a fixed slice of the operator's
 * knowledge graph (top-N pinned ClientContext + active ClientFact). When
 * the conversation drifts into territory not covered by that preload —
 * "what did we believe about this client back in January?", "search
 * archived discussions of the Smith case", "find the food-cost note from
 * Q3" — the model used to be stuck. `recall_archival` lets it reach into
 * the archive mid-turn.
 *
 * Two underlying data sources:
 *
 *   1. Hybrid search over `practiq.client_contexts` — paraphrase-robust
 *      recall via `hybridSearchKnowledgeBase`. Trigram + cosine.
 *   2. Temporal facts (`ClientFact`) — atomized, time-windowed beliefs.
 *      Filtered by validity window intersection with the requested
 *      period so the model can rewind to a past belief state.
 *
 * Both are scoped to (clientId, userId) defense-in-depth. The caller
 * (tool dispatcher) already gated on chat-room ownership.
 *
 * Output: a single Markdown blob the model can read directly. Empty
 * result → an explicit "no matches" string instead of a silent "" so the
 * model knows the recall ran and the archive really is empty.
 */

import { hybridSearchKnowledgeBase } from "@/lib/hybrid-search";
import { loadActiveFacts, formatFactsForPrompt } from "@/lib/temporal-facts";
import type { ClientFact } from "@/generated/prisma/client";

export interface RecallArchivalOpts {
  clientId: string;
  userId: string;
  query: string;
  /**
   * Optional time window. Both bounds optional; missing `from` means
   * "since the beginning of time", missing `to` means "up to now".
   * Used to filter temporal facts by validity-window intersection.
   *
   * Knowledge-base hits ignore the period (they're append-only logs,
   * not time-windowed beliefs). If the operator wants time-scoped KB
   * recall, wave-5 will add a `recordedBetween` ClientContext filter.
   */
  period?: { from?: Date; to?: Date };
  /** Cap total hits across both sources. Default 5, hard cap 20. */
  limit?: number;
}

export interface RecallArchivalResult {
  /** Markdown blob ready for tool_result. Always non-empty. */
  markdown: string;
  /** Raw counts so the dispatcher can log structured metrics. */
  counts: {
    contextHits: number;
    factHits: number;
  };
}

/**
 * Run a self-paged archival recall. Designed to be cheap (one hybrid
 * search + one fact load per call) so the model can call it multiple
 * times in a single turn without breaking a token budget.
 */
export async function recallArchival(
  opts: RecallArchivalOpts,
): Promise<RecallArchivalResult> {
  const { clientId, userId, query, period, limit = 5 } = opts;

  const trimmed = query.trim();
  if (!trimmed) {
    return {
      markdown: "(empty query — refine and try again)",
      counts: { contextHits: 0, factHits: 0 },
    };
  }

  const cap = Math.min(Math.max(limit, 1), 20);

  // Split the budget: 60% to context (paraphrase recall is the bigger
  // win), 40% to facts. Always at least 1 of each so a query that
  // matches a single high-signal fact still surfaces.
  const contextLimit = Math.max(1, Math.ceil(cap * 0.6));
  const factLimit = Math.max(1, Math.floor(cap * 0.4));

  // ── Hybrid search over ClientContext ───────────────────────────
  const contextHits = await hybridSearchKnowledgeBase({
    clientId,
    userId,
    query: trimmed,
    limit: contextLimit,
  });

  // ── Time-filtered ClientFact load ──────────────────────────────
  // Use the period's upper bound (or now) as the "asOf" anchor for
  // active-fact filtering; then post-filter by lower bound to keep
  // facts whose validity window intersects [from, to].
  const asOf = period?.to ?? new Date();
  const allActive = await loadActiveFacts(clientId, asOf);
  const factsInWindow = filterFactsByPeriod(allActive, period);

  // Score facts by trigram-style overlap so we don't dump all of them.
  // Cheap inline scoring — no need to round-trip the DB. We use the
  // statement length × shared-token ratio as a proxy; for short
  // statements (<10 tokens) this is virtually identical to Jaccard.
  const scoredFacts = factsInWindow
    .map((f) => ({ fact: f, score: lexicalOverlap(f.statement, trimmed) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, factLimit)
    .map((s) => s.fact);

  // ── Render combined Markdown ───────────────────────────────────
  const sections: string[] = [];
  sections.push(`## Archival recall for "${trimmed}"`);

  if (contextHits.length > 0) {
    const lines = contextHits.map((h) => {
      const pinned = h.isPinned ? " (pinned)" : "";
      const scorePct = Math.round(h.score * 100);
      const snippet = h.content.slice(0, 400);
      return `- [${h.category}${pinned} · ~${scorePct}%] **${h.title}**\n  ${snippet}`;
    });
    sections.push(`### Knowledge base (${contextHits.length})\n${lines.join("\n")}`);
  } else {
    sections.push("### Knowledge base\n(no matches)");
  }

  if (scoredFacts.length > 0) {
    // Re-use the fact formatter so output stays consistent with the
    // system-prompt-injected facts the model already knows how to read.
    const factMd = formatFactsForPrompt(scoredFacts, { asOf });
    // Strip the "## Known facts" header — we add our own scoped one
    // ("Temporal facts") so the model can tell archival recall from
    // preloaded facts.
    const stripped = factMd.replace(/^## [^\n]+\n+/, "");
    const periodLabel = describePeriod(period);
    sections.push(`### Temporal facts ${periodLabel}\n${stripped}`);
  } else {
    sections.push("### Temporal facts\n(no matches in window)");
  }

  return {
    markdown: sections.join("\n\n"),
    counts: {
      contextHits: contextHits.length,
      factHits: scoredFacts.length,
    },
  };
}

/**
 * Keep facts whose validity window intersects the requested [from, to].
 * Either bound can be missing.
 *
 * Intersection rule: a fact is in the window iff
 *   validFrom <= to  AND  (validUntil IS NULL OR validUntil > from)
 *
 * When `from` is undefined we treat it as -∞ (kept by default), and
 * when `to` is undefined we treat it as +∞.
 */
export function filterFactsByPeriod(
  facts: ReadonlyArray<ClientFact>,
  period?: { from?: Date; to?: Date },
): ClientFact[] {
  if (!period || (!period.from && !period.to)) return [...facts];

  const from = period.from?.getTime() ?? Number.NEGATIVE_INFINITY;
  const to = period.to?.getTime() ?? Number.POSITIVE_INFINITY;

  return facts.filter((f) => {
    const start = f.validFrom.getTime();
    const end = f.validUntil ? f.validUntil.getTime() : Number.POSITIVE_INFINITY;
    return start <= to && end > from;
  });
}

/**
 * Cheap lexical overlap score: |intersection of normalized tokens| /
 * |query tokens|. Returns a value in [0, 1]. Symmetric in spirit but
 * biased toward query coverage so a short fact that hits all query
 * terms still scores 1.0. We deliberately do NOT use trigram here —
 * facts are typically short and trigram noise dominates.
 */
function lexicalOverlap(statement: string, query: string): number {
  const stmt = tokenize(statement);
  const q = tokenize(query);
  if (stmt.size === 0 || q.size === 0) return 0;
  let hit = 0;
  for (const t of q) if (stmt.has(t)) hit++;
  return hit / q.size;
}

function tokenize(s: string): Set<string> {
  const out = new Set<string>();
  const norm = s
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, " ")
    .trim();
  if (!norm) return out;
  for (const tok of norm.split(/\s+/)) {
    if (tok.length >= 2) out.add(tok);
  }
  return out;
}

function describePeriod(period?: { from?: Date; to?: Date }): string {
  if (!period || (!period.from && !period.to)) return "(all time)";
  const fmt = (d?: Date) => (d ? d.toISOString().slice(0, 10) : "…");
  return `(${fmt(period.from)} → ${fmt(period.to)})`;
}
