/**
 * Hybrid retrieval over `practiq.client_contexts` (P1-05).
 *
 * Combines two complementary signals:
 *
 *   1. **Trigram similarity** (`pg_trgm`) — sharp on lexical overlap.
 *      Wins when the operator's query reuses the exact terminology
 *      stored in the knowledge base ("food cost variance").
 *   2. **Cosine similarity** over `content_embedding` (pgvector,
 *      cohere-embed-v3, 1024 dims) — robust to paraphrase. Wins when
 *      the query is a semantic restatement ("why is COGS up?") of a
 *      stored fact ("food cost increased 12% in March").
 *
 * Score = 0.4 × trigram + 0.6 × cosine. The cosine bias is
 * intentional: the trigram signal is already saturated by the
 * existing keyword-only `searchKnowledgeBase`, so layering vector on
 * top should pull in the recall the existing path misses. Tunable
 * via `weights` if a future eval suggests a different balance.
 *
 * Two SQL passes (intentional, not a regression):
 *
 *   - **Embedded rows pass**: rows where `content_embedding IS NOT NULL`
 *     score on the full hybrid formula.
 *   - **Unembedded rows pass**: rows where the column is NULL fall
 *     back to trigram only and get downranked by `unembeddedPenalty`
 *     (default 0.5). This keeps backfill-incomplete corpora useful
 *     instead of silently hiding rows we just haven't gotten to yet.
 *
 * The two result sets are unioned in JS (not SQL) so the raw query
 * stays simple and the test surface stays observable.
 *
 * If the embedding service is unavailable, we skip the embedded
 * pass entirely and degrade to trigram-only — never block the chat
 * flow on an embedding outage.
 */

import { prisma } from "@/lib/prisma";
import { embedText, toVectorLiteral } from "@/lib/embeddings";

export interface HybridSearchOpts {
  clientId: string;
  userId: string;
  query: string;
  /** Total result cap (across embedded + unembedded passes). */
  limit?: number;
  /**
   * Score weighting. Defaults to 0.4 trigram + 0.6 cosine — biased
   * toward semantic match because the existing keyword-only path
   * already handles strict term overlap. Must sum to 1.0.
   */
  weights?: { trigram: number; cosine: number };
  /**
   * Multiplier applied to scores from rows whose embedding is still
   * NULL. Default 0.5 — present-but-downranked. Set to 0 to hide
   * them entirely while a backfill is in progress.
   */
  unembeddedPenalty?: number;
}

export interface HybridSearchHit {
  id: string;
  title: string;
  content: string;
  category: string;
  isPinned: boolean;
  score: number;
  /** Sub-scores for observability — useful when tuning weights. */
  trigramScore: number;
  cosineScore: number;
  /** True when this row was found via trigram fallback (no embedding). */
  unembedded: boolean;
}

interface EmbeddedRow {
  id: string;
  title: string;
  content: string;
  category: string;
  is_pinned: boolean;
  trigram_score: number;
  cosine_score: number;
  hybrid_score: number;
}

interface TrigramOnlyRow {
  id: string;
  title: string;
  content: string;
  category: string;
  is_pinned: boolean;
  trigram_score: number;
}

/**
 * Run the hybrid retrieval. Always returns at most `limit` results,
 * sorted by combined score descending.
 *
 * Defense in depth: even though callers should already gate on
 * client ownership, we re-assert `userId === client.userId` here so
 * a stray internal caller can't accidentally leak across firms.
 */
export async function hybridSearchKnowledgeBase(
  opts: HybridSearchOpts,
): Promise<HybridSearchHit[]> {
  const {
    clientId,
    userId,
    query,
    limit = 5,
    weights = { trigram: 0.4, cosine: 0.6 },
    unembeddedPenalty = 0.5,
  } = opts;

  const trimmed = query.trim();
  if (!trimmed) return [];

  // Defense in depth — confirm client ownership before any read.
  const owned = await prisma.client.findFirst({
    where: { id: clientId, userId },
    select: { id: true },
  });
  if (!owned) return [];

  const cap = Math.min(Math.max(limit, 1), 20);

  // Fetch +50% slack on each branch so the JS-side merge has room
  // to dedupe and re-rank without losing high-quality hits at the
  // boundary.
  const fetchPerBranch = Math.min(cap * 2, 30);

  // ── Branch A: embedded rows, full hybrid formula ──────────────
  const embedding = await embedText(trimmed);
  let embeddedRows: EmbeddedRow[] = [];

  if (embedding) {
    const literal = toVectorLiteral(embedding);
    embeddedRows = await prisma.$queryRawUnsafe<EmbeddedRow[]>(
      `
      SELECT
        id,
        title,
        content,
        category,
        is_pinned,
        similarity(content, $2::text)                 AS trigram_score,
        1 - (content_embedding <=> $1::practiq.vector) AS cosine_score,
        (
          ${weights.trigram}::float * similarity(content, $2::text) +
          ${weights.cosine}::float  * (1 - (content_embedding <=> $1::practiq.vector))
        ) AS hybrid_score
      FROM practiq.client_contexts
      WHERE client_id = $3
        AND content_embedding IS NOT NULL
      ORDER BY hybrid_score DESC
      LIMIT $4
      `,
      literal,
      trimmed,
      clientId,
      fetchPerBranch,
    );
  }

  // ── Branch B: unembedded rows, trigram only, downranked ───────
  let trigramRows: TrigramOnlyRow[] = [];
  if (unembeddedPenalty > 0) {
    trigramRows = await prisma.$queryRawUnsafe<TrigramOnlyRow[]>(
      `
      SELECT
        id,
        title,
        content,
        category,
        is_pinned,
        GREATEST(
          similarity(title,   $1::text),
          similarity(content, $1::text)
        ) AS trigram_score
      FROM practiq.client_contexts
      WHERE client_id = $2
        AND content_embedding IS NULL
        AND (
          title   % $1::text
          OR content % $1::text
          OR title   ILIKE '%' || $1::text || '%'
          OR content ILIKE '%' || $1::text || '%'
        )
      ORDER BY trigram_score DESC
      LIMIT $3
      `,
      trimmed,
      clientId,
      fetchPerBranch,
    );
  }

  // ── Merge ─────────────────────────────────────────────────────
  // Embedded rows come pre-scored; unembedded rows we score in JS
  // using the same weighting (cosine = 0) plus the penalty.
  const merged = new Map<string, HybridSearchHit>();

  for (const r of embeddedRows) {
    const baseScore = Number(r.hybrid_score) || 0;
    const pinnedBoost = r.is_pinned ? 0.1 : 0;
    merged.set(r.id, {
      id: r.id,
      title: r.title,
      content: r.content,
      category: r.category,
      isPinned: r.is_pinned,
      score: baseScore + pinnedBoost,
      trigramScore: Number(r.trigram_score) || 0,
      cosineScore: Number(r.cosine_score) || 0,
      unembedded: false,
    });
  }

  for (const r of trigramRows) {
    if (merged.has(r.id)) continue; // can't happen given WHERE clauses, but cheap guard
    const trigramOnly = Number(r.trigram_score) || 0;
    const score = weights.trigram * trigramOnly * unembeddedPenalty;
    const pinnedBoost = r.is_pinned ? 0.1 : 0;
    merged.set(r.id, {
      id: r.id,
      title: r.title,
      content: r.content,
      category: r.category,
      isPinned: r.is_pinned,
      score: score + pinnedBoost,
      trigramScore: trigramOnly,
      cosineScore: 0,
      unembedded: true,
    });
  }

  return Array.from(merged.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, cap);
}
