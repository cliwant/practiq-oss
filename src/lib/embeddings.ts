/**
 * Embedding helper (P1-04).
 *
 * Generates 1024-dim embeddings via OpenRouter's
 * `cohere/embed-english-v3.0` and writes them into
 * `practiq.client_contexts.content_embedding` (pgvector column with
 * an HNSW cosine index — see migration applied via Supabase Mgmt API).
 *
 * Why OpenRouter and not Anthropic: Anthropic doesn't ship an
 * embedding model. OpenRouter exposes Cohere's embed-v3 (1024 dims,
 * good for multilingual short documents) at the same gateway as our
 * Claude calls, so adding it doesn't require a second vendor account.
 *
 * Failure mode: `embedText` returns `null` on transport error or 4xx
 * from OpenRouter. Callers downgrade to trigram-only retrieval rather
 * than fail the request — embedding outages should NEVER break the
 * chat path. We log a single warn line per failure (not per row) so
 * the dev console isn't flooded during a backfill outage.
 *
 * Cost guardrail: cohere-embed-v3 is roughly $0.10 per 1M tokens, so
 * embedding the entire corpus of (say) 10K rows × 200 tokens each =
 * ~2M tokens ≈ $0.20. The default `maxItems` of 1000 keeps a single
 * backfill invocation well below the per-run $1 budget the parent
 * task imposes.
 */

import { prisma } from "@/lib/prisma";

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
// RUN 12: switched from cohere/embed-english-v3.0 (not available
// on OpenRouter — returns "Model does not exist") to OpenAI's
// text-embedding-3-small with `dimensions: 1024`. Same column
// contract on `practiq.client_contexts.content_embedding`. Cohere
// can be reintroduced later via a direct Cohere SDK if we want
// multilingual recall; for boutique-firm corpus (English) the
// OpenAI path is fine and cheaper ($0.02 / 1M tokens).
const EMBED_MODEL = "openai/text-embedding-3-small";
const EMBED_DIMS = 1024;

/**
 * Embed a single string into a 1024-dim float array.
 *
 * - Trims + collapses whitespace before sending so we don't burn
 *   tokens on whitespace-only blobs (e.g. an empty
 *   ClientContext.content row).
 * - Returns `null` (not throws) so callers can decide whether to
 *   fall back to trigram or skip.
 * - The model id (`cohere/embed-english-v3.0`) is hardcoded — if we
 *   ever swap models the dim contract on the column changes too, so
 *   this is intentionally NOT an env-var knob.
 */
export async function embedText(text: string): Promise<number[] | null> {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return null;

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.warn(
      "[embeddings] OPENROUTER_API_KEY not set — skipping embedding",
    );
    return null;
  }

  try {
    const res = await fetch(`${OPENROUTER_BASE}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: EMBED_MODEL,
        input: trimmed,
        // OpenAI text-embedding-3-small native is 1536 dims; we
        // request 1024 to match the existing pgvector(1024) column.
        // OpenAI's truncation produces a still-normalised slice.
        dimensions: EMBED_DIMS,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "<unreadable>");
      console.warn(
        `[embeddings] ${EMBED_MODEL} returned ${res.status}: ${body.slice(0, 200)}`,
      );
      return null;
    }

    const json = (await res.json()) as {
      data?: Array<{ embedding?: number[] }>;
    };
    const embedding = json?.data?.[0]?.embedding;
    if (!Array.isArray(embedding) || embedding.length !== EMBED_DIMS) {
      console.warn(
        `[embeddings] unexpected response shape (got ${
          Array.isArray(embedding) ? `${embedding.length} dims` : typeof embedding
        }, expected ${EMBED_DIMS})`,
      );
      return null;
    }
    return embedding;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[embeddings] fetch failed: ${msg}`);
    return null;
  }
}

/**
 * Render a JS number[] as a pgvector literal (e.g. "[0.1,0.2,...]").
 * pgvector parses this exactly when the column is typed `vector(N)` —
 * we use $executeRawUnsafe with `::vector` casts so the literal is
 * unambiguous on the wire.
 */
export function toVectorLiteral(embedding: number[]): string {
  // toFixed(8) — keep 8 decimals; cohere returns ~6 sig figs and
  // we don't need more for cosine. 8 decimals × 1024 dims ≈ 10 KB
  // per row, well under any practical Postgres row limit.
  const parts = embedding.map((n) => {
    if (!Number.isFinite(n)) return "0";
    return n.toFixed(8);
  });
  return `[${parts.join(",")}]`;
}

export interface BackfillOptions {
  /** Page size for one round-trip to the model. Cohere accepts ~96
   *  inputs per call but we keep it lower so a single failure
   *  doesn't waste a big batch. */
  batchSize?: number;
  /** Hard cap so a misconfigured backfill can't burn the embedding
   *  budget. Default 1000 → ≈ $0.20 with cohere-embed-v3. */
  maxItems?: number;
  /** Optional client-id filter — useful for backfilling a single
   *  customer's contexts after onboarding without touching the rest
   *  of the corpus. */
  clientId?: string;
}

export interface BackfillResult {
  considered: number;
  embedded: number;
  failed: number;
  skipped: number;
}

/**
 * Idempotent backfill: walk every `client_contexts` row whose
 * `content_embedding IS NULL`, embed its content, and write it back.
 *
 * - Embedding failures are counted, not retried — a re-invocation
 *   picks them up next time.
 * - We update via `$executeRawUnsafe` because the Prisma client doesn't
 *   know how to serialize `vector` (Unsupported type).
 * - Row-by-row update inside a single transaction is intentionally
 *   avoided; if the embedding API is slow, holding a transaction open
 *   blocks other writers. Per-row autocommit is fine: idempotent.
 */
export async function backfillContextEmbeddings(
  opts: BackfillOptions = {},
): Promise<BackfillResult> {
  const { batchSize = 50, maxItems = 1000, clientId } = opts;

  const result: BackfillResult = {
    considered: 0,
    embedded: 0,
    failed: 0,
    skipped: 0,
  };

  let cursor: string | null = null;

  while (result.considered < maxItems) {
    const remaining = maxItems - result.considered;
    const take = Math.min(batchSize, remaining);

    type Row = { id: string; content: string };
    // Prisma can't filter on Unsupported(vector) directly, so we use
    // a raw query with a NULL check. Cursor on id keeps pagination
    // stable even as embeddings get filled in.
    const rows: Row[] = await prisma.$queryRawUnsafe(
      `
      SELECT id, content
      FROM practiq.client_contexts
      WHERE content_embedding IS NULL
        ${clientId ? `AND client_id = $1` : ""}
        ${cursor ? `AND id > $${clientId ? "2" : "1"}` : ""}
      ORDER BY id ASC
      LIMIT ${take}
      `,
      ...([] as unknown[]).concat(
        clientId ? [clientId] : [],
        cursor ? [cursor] : [],
      ),
    );

    if (rows.length === 0) break;

    for (const row of rows) {
      result.considered++;
      cursor = row.id;

      if (!row.content || !row.content.trim()) {
        result.skipped++;
        continue;
      }

      const embedding = await embedText(row.content);
      if (!embedding) {
        result.failed++;
        continue;
      }

      const literal = toVectorLiteral(embedding);
      try {
        await prisma.$executeRawUnsafe(
          `
          UPDATE practiq.client_contexts
          SET content_embedding = $1::practiq.vector
          WHERE id = $2
          `,
          literal,
          row.id,
        );
        result.embedded++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn(`[embeddings] update failed for ${row.id}: ${msg}`);
        result.failed++;
      }
    }

    if (rows.length < take) break;
  }

  return result;
}
