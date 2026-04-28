/**
 * T2 — Vector / hybrid retrieval hits + active temporal facts.
 *
 * Only fires when the caller passes a `query`. Background agents
 * doing a full scan don't get T2 (it'd just be noise without a
 * specific question). Chat does, anomaly-detector does (with a
 * synthetic query like "anomaly out-of-pattern"), comms-drafter
 * does (with "pending action items requiring outbound nudge").
 *
 * **Two combined sources**:
 *
 *   1. `hybridSearchKnowledgeBase` — paraphrase-robust recall over
 *      ClientContext via 0.4×trigram + 0.6×cosine on the
 *      `content_embedding` column. Already shipped (P1-05).
 *   2. `loadActiveFacts` — bitemporal `ClientFact` rows currently
 *      in their validity window. Mem0g-style structured beliefs
 *      that complement the paragraph-shaped vector hits.
 *
 * The combined output gives the model both **passages** (vector
 * hits, useful for grounding citations) and **propositions**
 * (facts, useful for direct factual answers). Zep's paper showed
 * this combination beats either alone on LongMemEval.
 *
 * **Fallback**: if `embedText` is unavailable (no
 * `OPENROUTER_API_KEY`, transient outage), `hybridSearchKnowledgeBase`
 * already degrades to trigram-only. We don't need to handle that
 * here — we just propagate whatever it returns.
 */

import { hybridSearchKnowledgeBase } from "@/lib/hybrid-search";
import {
  loadActiveFacts,
  formatFactsForPrompt,
} from "@/lib/temporal-facts";
import { approxTokenCount, truncateToTokenCap } from "../token-counter";
import type { TierBlock } from "./profile";

export interface VectorHitsOpts {
  clientId: string;
  userId: string;
  query: string;
  cap: number;
  /** How many hybrid hits to fetch. Defaults to 5. */
  hitsLimit?: number;
}

export async function loadT2VectorHits(
  opts: VectorHitsOpts,
): Promise<TierBlock> {
  const trimmedQuery = opts.query.trim();
  if (!trimmedQuery) {
    return {
      tier: "T2",
      body: "",
      tokensApprox: 0,
      summary: "skipped (empty query)",
      hadData: false,
    };
  }

  // Run both reads in parallel — they're independent.
  const [hits, facts] = await Promise.all([
    hybridSearchKnowledgeBase({
      clientId: opts.clientId,
      userId: opts.userId,
      query: trimmedQuery,
      limit: opts.hitsLimit ?? 5,
    }).catch(() => []),
    loadActiveFacts(opts.clientId).catch(() => []),
  ]);

  const sections: string[] = [];

  if (hits.length > 0) {
    const lines = hits.map((h, i) => {
      // Hybrid search returns {id, title, content, hybridScore}. We
      // truncate content here per-row so a single huge ClientContext
      // doesn't dominate the tier even before we cap the whole tier.
      const snippet =
        h.content.length > 240 ? h.content.slice(0, 237).trim() + "…" : h.content;
      return `${i + 1}. **${h.title}** — ${snippet}`;
    });
    sections.push(`### Relevant knowledge (top ${hits.length})\n${lines.join("\n")}`);
  }

  if (facts.length > 0) {
    // formatFactsForPrompt returns its own header — strip it so we
    // can put both sections under one shared T2 H2.
    const factsBody = formatFactsForPrompt(facts).replace(
      /^##\s.+\n\n?/,
      "",
    );
    if (factsBody.trim().length > 0) {
      sections.push(`### Active facts (bitemporal)\n${factsBody.trim()}`);
    }
  }

  if (sections.length === 0) {
    return {
      tier: "T2",
      body: "",
      tokensApprox: 0,
      summary: `no hits or facts for "${trimmedQuery.slice(0, 40)}"`,
      hadData: false,
    };
  }

  const raw = `## T2 Vector hits + temporal facts\n\nQuery: "${trimmedQuery.slice(0, 80)}"\n\n${sections.join("\n\n")}\n`;
  const body = truncateToTokenCap(raw, opts.cap);
  return {
    tier: "T2",
    body,
    tokensApprox: approxTokenCount(body),
    summary: `hits=${hits.length}, facts=${facts.length}`,
    hadData: true,
  };
}
