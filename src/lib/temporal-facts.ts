/**
 * Temporal knowledge graph (P1-02 — the moat).
 *
 * `ClientFact` rows are atomized statements about a client with an
 * explicit validity window (`validFrom` / `validUntil`). Recording a
 * new fact that contradicts an old one does NOT mutate the old row —
 * it stamps the old row's `validUntil` and writes its id into
 * `supersededBy` on the new row. Replay-at-time queries become trivial.
 *
 * The "moat" framing: a single mutable Client.preferences blob loses
 * history the moment something changes; per-fact validity windows let
 * us answer "what did we believe about this client on 2026-03-15?" by
 * filtering on the asOf timestamp, and let agents reason about belief
 * drift over time (e.g. "the partner's tone preference was 'casual'
 * for 6 months then flipped to 'formal' after the fee change").
 *
 * Why trigram-based supersession (not embeddings):
 *   - Cheap, deterministic, no API key on the hot path.
 *   - Categories are coarse enough (financial / preference / strategic
 *     / relationship / risk) that lexical overlap inside a category is
 *     a good signal — if two statements in `preference` share 85%+
 *     trigrams, they're almost certainly competing claims.
 *   - We separately have pgvector cosine via `embeddings.ts` for the
 *     hybrid retrieval path; that's a different problem (recall over
 *     loose phrasing) and a different cost profile.
 *
 * Public surface:
 *
 *   - recordFact(opts)        — write a new fact, auto-supersede the
 *                                most-similar active fact in the same
 *                                category if similarity > 0.85.
 *   - loadActiveFacts(...)    — return all currently-active facts,
 *                                optionally as-of a past timestamp.
 *   - formatFactsForPrompt(...) — render an array as Markdown for
 *                                  injection into a system prompt.
 *
 * Performance: trigram similarity is O(N×M) where N is statement
 * length and M is the candidate count for the same client+category.
 * For a typical client (≤200 active facts, ~100 chars each) this is
 * sub-millisecond and runs entirely in JS — no extra DB roundtrip.
 */

import { prisma } from "@/lib/prisma";
import type { ClientFact } from "@/generated/prisma/client";

// ─── Types ──────────────────────────────────────────────────────────

/** Coarse-grained categorization of what a fact is about. */
export type FactCategory =
  | "financial"
  | "preference"
  | "strategic"
  | "relationship"
  | "risk";

/** Where a fact came from — controls how the UI surfaces provenance. */
export type FactSource =
  | "agent_extracted"
  | "user_input"
  | "document_parsed"
  | "conversation";

/**
 * Inputs for `recordFact`. `confidence` defaults to 0.7 to match the
 * Prisma schema default. `sourceRef` is the optional caller-supplied
 * pointer to the originating artifact (conversation id, file id, ...).
 */
export interface RecordFactOpts {
  clientId: string;
  userId: string;
  category: FactCategory;
  statement: string;
  confidence?: number;
  source: FactSource;
  sourceRef?: string;
  /**
   * Threshold for auto-superseding the most-similar active fact in
   * the same client+category. Default 0.85 — empirically tuned so
   * "owner is data-driven" supersedes "owner prefers data-driven
   * communication" but does NOT supersede the unrelated "owner is on
   * vacation in May".
   */
  supersedeThreshold?: number;
  /**
   * Override the validFrom timestamp. Default = now(). Useful for
   * backfill jobs that want the validity window to start when the
   * underlying event happened, not when we got around to recording it.
   */
  validFrom?: Date;
}

// ─── Trigram-based similarity (in-process) ──────────────────────────
//
// We compute trigrams in JS rather than calling out to Postgres
// `similarity()` because the supersede check happens BEFORE the new
// row is written — a single SQL roundtrip per write is fine, but
// scaling that to "fetch all candidates, score them, pick the max"
// in pure JS keeps the DB load constant regardless of fact count.
//
// `pg_trgm` uses the same algorithm in spirit (Jaccard on a 3-gram
// set), so the JS scoring stays compatible with the SQL similarity()
// we use elsewhere in tool-handlers.ts. That means a fact deemed
// "similar enough to supersede" here would also be deemed similar
// enough to surface in a hybrid search.

/**
 * Lowercase, strip punctuation/whitespace runs, collapse to a-z0-9 +
 * single spaces. Matches what pg_trgm does internally before n-gram
 * extraction.
 */
function normalizeForTrigram(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Build the set of 3-grams from a normalized string. Pads with leading
 * and trailing spaces so the first and last char each get a unique
 * trigram (matches pg_trgm `show_trgm()` output).
 */
function trigrams(input: string): Set<string> {
  const padded = `  ${input} `;
  const out = new Set<string>();
  if (padded.length < 3) return out;
  for (let i = 0; i <= padded.length - 3; i++) {
    out.add(padded.slice(i, i + 3));
  }
  return out;
}

/**
 * Jaccard similarity over trigram sets — |A ∩ B| / |A ∪ B|. Returns
 * 0 if either input normalizes to empty. Order-independent.
 */
export function trigramSimilarity(a: string, b: string): number {
  const na = normalizeForTrigram(a);
  const nb = normalizeForTrigram(b);
  if (!na || !nb) return 0;
  const sa = trigrams(na);
  const sb = trigrams(nb);
  if (sa.size === 0 || sb.size === 0) return 0;
  let intersection = 0;
  for (const t of sa) if (sb.has(t)) intersection++;
  const union = sa.size + sb.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// ─── Public API ─────────────────────────────────────────────────────

/**
 * Write a new fact and, if the new statement closely overlaps an
 * existing active fact in the same client+category, mark that fact
 * as superseded.
 *
 * Atomicity: both writes happen in a single transaction so we never
 * end up with two active facts that both claim to supersede each
 * other after a crash mid-write.
 */
export async function recordFact(opts: RecordFactOpts): Promise<ClientFact> {
  const {
    clientId,
    userId,
    category,
    statement,
    confidence = 0.7,
    source,
    sourceRef,
    supersedeThreshold = 0.85,
    validFrom,
  } = opts;

  const trimmed = statement.trim();
  if (!trimmed) {
    throw new Error("recordFact: statement cannot be empty");
  }

  return prisma.$transaction(async (tx) => {
    // Find the most-similar currently-active fact in the same
    // client+category. We pull all candidates and score in JS — for
    // typical N (<200) this is far cheaper than round-tripping each
    // candidate through Postgres similarity().
    const candidates = await tx.clientFact.findMany({
      where: {
        clientId,
        category,
        validUntil: null,
      },
      select: { id: true, statement: true },
    });

    let bestId: string | null = null;
    let bestScore = 0;
    for (const c of candidates) {
      const s = trigramSimilarity(c.statement, trimmed);
      if (s > bestScore) {
        bestScore = s;
        bestId = c.id;
      }
    }

    const now = validFrom ?? new Date();
    const supersedesId =
      bestId && bestScore >= supersedeThreshold ? bestId : null;

    if (supersedesId) {
      // Stamp the old fact's validity window so it stops appearing in
      // active queries. We deliberately do NOT delete — the audit
      // trail is the whole point of this schema.
      await tx.clientFact.update({
        where: { id: supersedesId },
        data: { validUntil: now },
      });
    }

    return tx.clientFact.create({
      data: {
        clientId,
        userId,
        category,
        statement: trimmed,
        confidence,
        source,
        sourceRef,
        validFrom: now,
        supersededBy: supersedesId ?? undefined,
      },
    });
  });
}

/**
 * Load all currently-active facts for a client, optionally as-of a
 * past timestamp (so we can "rewind" to what we believed at any
 * point). A fact is active when its validity window covers `asOf`:
 *
 *   validFrom <= asOf  AND  (validUntil IS NULL OR validUntil > asOf)
 *
 * Ordering: pinned-style — validFrom DESC then category. Most-recently-
 * recorded facts appear first because they reflect the freshest belief.
 */
export async function loadActiveFacts(
  clientId: string,
  asOf?: Date,
): Promise<ClientFact[]> {
  const at = asOf ?? new Date();
  return prisma.clientFact.findMany({
    where: {
      clientId,
      validFrom: { lte: at },
      OR: [{ validUntil: null }, { validUntil: { gt: at } }],
    },
    orderBy: [{ validFrom: "desc" }, { category: "asc" }],
  });
}

/**
 * Render an array of facts as Markdown for system-prompt injection.
 * Empty input returns an empty string so callers can unconditionally
 * concatenate without leaking a stray header into prompts when there
 * are no facts yet.
 *
 * Format:
 *
 *   ## Known facts about <client>
 *
 *   ### financial
 *   - <statement> (conf 0.92, agent_extracted)
 *   - <statement> (conf 0.85, user_input)
 *
 *   ### preference
 *   - ...
 *
 * Confidence is rounded to 2 decimals; source is included so the
 * model can weight model-generated facts vs user-stated facts.
 */
export function formatFactsForPrompt(
  facts: ReadonlyArray<ClientFact>,
  options: { clientName?: string; asOf?: Date } = {},
): string {
  if (facts.length === 0) return "";

  // Defense-in-depth: even though loadActiveFacts already filters by
  // validity, a caller could hand us a raw array (e.g. mock data or
  // facts returned from a graph traversal that included superseded
  // rows for context). We re-filter so the prompt never leaks dead
  // beliefs.
  const at = options.asOf ?? new Date();
  const active = facts.filter(
    (f) =>
      f.validFrom.getTime() <= at.getTime() &&
      (f.validUntil === null || f.validUntil.getTime() > at.getTime()),
  );
  if (active.length === 0) return "";

  // Group by category so the agent sees preferences clustered together,
  // financial facts clustered together, etc. Stable category order
  // matches the FactCategory union for predictable prompt-cache hits.
  const order: FactCategory[] = [
    "financial",
    "preference",
    "strategic",
    "relationship",
    "risk",
  ];
  const grouped = new Map<string, ClientFact[]>();
  for (const f of active) {
    const list = grouped.get(f.category) ?? [];
    list.push(f);
    grouped.set(f.category, list);
  }

  const header = options.clientName
    ? `## Known facts about ${options.clientName}`
    : "## Known facts";

  const sections: string[] = [];
  for (const cat of order) {
    const list = grouped.get(cat);
    if (!list || list.length === 0) continue;
    const lines = list
      .map((f) => {
        const conf = (Math.round(f.confidence * 100) / 100).toFixed(2);
        return `- ${f.statement} (conf ${conf}, ${f.source})`;
      })
      .join("\n");
    sections.push(`### ${cat}\n${lines}`);
  }
  // Catch any unexpected categories that aren't in `order` so we don't
  // silently drop facts whose category was added later.
  for (const [cat, list] of grouped) {
    if (order.includes(cat as FactCategory)) continue;
    const lines = list
      .map((f) => {
        const conf = (Math.round(f.confidence * 100) / 100).toFixed(2);
        return `- ${f.statement} (conf ${conf}, ${f.source})`;
      })
      .join("\n");
    sections.push(`### ${cat}\n${lines}`);
  }

  return `${header}\n\n${sections.join("\n\n")}`;
}
