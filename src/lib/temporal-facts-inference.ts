/**
 * FactEdge inference — RUN-post-lovable polish (audit fix #8).
 *
 * The audit found `FactEdge` was a 6-week-old dead schema: writers
 * existed in test fixtures but no production code ever wrote a row.
 * This module is the missing inference engine — it reads recent
 * ClientFact rows, asks Claude to propose relationships, and writes
 * the result as FactEdge rows. Runs from the
 * `/api/cron/factedge-inference` cron route on a daily cadence.
 *
 * Why we need the graph: T2 vector hits give the model "passages
 * relevant to your query" but don't capture "fact A causes fact B".
 * Without the graph, the model has to re-derive temporal +
 * causal relationships every chat turn. With the graph, the T2
 * tier (or a future T2.5 tier) can surface "this fact's predecessor
 * + successor" in one query, saving tokens AND giving the model
 * grounding for the kind of cause-effect reasoning that distinguishes
 * a junior associate from a senior partner.
 *
 * Cost guardrail:
 *   - Only walks facts with `validUntil` null (currently active) so
 *     historical facts that won't influence today's reasoning don't
 *     consume tokens.
 *   - Caps at 30 facts per client per run; if a client has more,
 *     we sample by recency. The aim is high-value edges, not
 *     completeness.
 *   - One Claude call per client. Skip clients with < 5 active
 *     facts (graph is uninteresting at that size).
 *
 * Side-effect safety: writes are upsert-via-unique-constraint
 * `@@unique([fromFactId, toFactId, relation])` so re-running the
 * cron is idempotent. Failures swallow — DB AuditLog records the
 * outcome, never throws to the cron handler.
 */

import { prisma } from "@/lib/prisma";
import { getClaudeProvider } from "@/lib/claude/provider";
import { computeUsdCost } from "@/lib/spend-ceiling";
import { log } from "@/lib/observability/logger";

const VALID_RELATIONS = [
  "causes",
  "contradicts",
  "refines",
  "depends_on",
  "follows",
] as const;
export type FactEdgeRelation = (typeof VALID_RELATIONS)[number];

const MAX_FACTS_PER_CLIENT = 30;
const MIN_FACTS_TO_INFER = 5;
const MAX_EDGES_PER_RUN = 20;
const MIN_EDGE_WEIGHT = 0.55;

export interface InferenceResult {
  clientId: string;
  factsConsidered: number;
  edgesProposed: number;
  edgesWritten: number;
  edgesSkippedExisting: number;
  edgesSkippedLowConfidence: number;
  inputTokens: number;
  outputTokens: number;
  usdCost: number;
  durationMs: number;
  error?: string;
}

interface ProposedEdge {
  fromFactId: string;
  toFactId: string;
  relation: FactEdgeRelation;
  weight: number;
  reason?: string;
}

const SCHEMA = {
  type: "object" as const,
  properties: {
    edges: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          fromFactId: { type: "string" as const },
          toFactId: { type: "string" as const },
          relation: {
            type: "string" as const,
            enum: VALID_RELATIONS as unknown as string[],
          },
          weight: { type: "number" as const, minimum: 0, maximum: 1 },
          reason: { type: "string" as const },
        },
        required: ["fromFactId", "toFactId", "relation", "weight"],
      },
    },
    overallConfidence: { type: "number" as const, minimum: 0, maximum: 1 },
  },
  required: ["edges", "overallConfidence"],
};

/**
 * Run inference for ONE client. Returns counters for the cron
 * handler's aggregate. Never throws; failures land in `error` so
 * the cron can keep walking the user's other clients.
 */
export async function inferEdgesForClient(opts: {
  clientId: string;
  userId: string;
}): Promise<InferenceResult> {
  const startedAt = Date.now();
  const result: InferenceResult = {
    clientId: opts.clientId,
    factsConsidered: 0,
    edgesProposed: 0,
    edgesWritten: 0,
    edgesSkippedExisting: 0,
    edgesSkippedLowConfidence: 0,
    inputTokens: 0,
    outputTokens: 0,
    usdCost: 0,
    durationMs: 0,
  };

  try {
    // Walk active facts, newest first. Cap at MAX_FACTS_PER_CLIENT
    // to bound prompt size + cost.
    const facts = await prisma.clientFact.findMany({
      where: {
        clientId: opts.clientId,
        validUntil: null,
      },
      orderBy: { updatedAt: "desc" },
      take: MAX_FACTS_PER_CLIENT,
      select: {
        id: true,
        category: true,
        statement: true,
        confidence: true,
        validFrom: true,
      },
    });
    result.factsConsidered = facts.length;
    if (facts.length < MIN_FACTS_TO_INFER) {
      result.durationMs = Date.now() - startedAt;
      return result;
    }

    const factListText = facts
      .map(
        (f, i) =>
          `${i + 1}. id=${f.id} · ${f.category} · "${f.statement}" (confidence ${f.confidence.toFixed(2)}, validFrom ${f.validFrom.toISOString().slice(0, 10)})`,
      )
      .join("\n");

    const systemPrompt = `You are a fact-graph inference agent inside Practiq. Your job: identify directed relationships between active facts about ONE client.

Only propose an edge when there is concrete evidence the relationship holds. Do NOT propose edges for "interesting but speculative" pairs. Most fact pairs have NO meaningful relation; an empty edges array is the correct answer when nothing rises above ~0.55 weight.

Edge relations:
- "causes": fact A's existence causes / triggers fact B (e.g. "filing deadline" causes "estimated tax payment").
- "contradicts": A and B can't both be true at the same time.
- "refines": B is a more specific version of A (e.g. "owner birthday" refines "owner attribute").
- "depends_on": A is only meaningful if B holds.
- "follows": A came chronologically after B and they're related (use sparingly — temporal alone is weak signal).

Weight 0..1. >= 0.85 = obvious. 0.55-0.84 = plausible. < 0.55 = drop.

For each edge, reference the EXACT fact ids from the input. Don't invent ids.`;

    const userPrompt = `Client active facts (${facts.length}):\n\n${factListText}\n\nReturn the inferred edges. Up to ${MAX_EDGES_PER_RUN} edges. Empty array is fine when there's no strong signal.`;

    const provider = getClaudeProvider();
    const completion = await provider.complete({
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      maxTokens: 1200,
      outputSchema: {
        name: "submit_factedge_inference",
        description:
          "Submit the inferred fact-graph edges for this client. Return edges only when concrete evidence supports the relation; empty array is the correct answer when nothing rises above weight 0.55.",
        schema: SCHEMA,
      },
    });

    const inputTokens = completion.inputTokens ?? 0;
    const outputTokens = completion.outputTokens ?? 0;
    result.inputTokens = inputTokens;
    result.outputTokens = outputTokens;
    // We don't have a guaranteed `model` from the provider response,
    // so use a Sonnet-shaped fallback in computeUsdCost.
    result.usdCost = computeUsdCost(null, inputTokens, outputTokens);

    let parsed: { edges?: ProposedEdge[] };
    try {
      parsed = JSON.parse(completion.text) as { edges?: ProposedEdge[] };
    } catch {
      result.error = "parse failed";
      result.durationMs = Date.now() - startedAt;
      return result;
    }

    const proposed = (parsed.edges ?? []).slice(0, MAX_EDGES_PER_RUN);
    result.edgesProposed = proposed.length;

    const validFactIds = new Set(facts.map((f) => f.id));

    for (const edge of proposed) {
      if (
        !VALID_RELATIONS.includes(edge.relation as FactEdgeRelation) ||
        !validFactIds.has(edge.fromFactId) ||
        !validFactIds.has(edge.toFactId) ||
        edge.fromFactId === edge.toFactId
      ) {
        continue;
      }
      const weight = Math.max(0, Math.min(1, Number(edge.weight) || 0));
      if (weight < MIN_EDGE_WEIGHT) {
        result.edgesSkippedLowConfidence++;
        continue;
      }
      try {
        // Idempotent upsert via the unique constraint
        // @@unique([fromFactId, toFactId, relation]). On conflict,
        // refresh the weight if the new value is higher.
        const existing = await prisma.factEdge.findFirst({
          where: {
            fromFactId: edge.fromFactId,
            toFactId: edge.toFactId,
            relation: edge.relation,
          },
          select: { id: true, weight: true },
        });
        if (existing) {
          if (weight > existing.weight) {
            await prisma.factEdge.update({
              where: { id: existing.id },
              data: { weight },
            });
          }
          result.edgesSkippedExisting++;
          continue;
        }
        await prisma.factEdge.create({
          data: {
            fromFactId: edge.fromFactId,
            toFactId: edge.toFactId,
            relation: edge.relation,
            weight,
          },
        });
        result.edgesWritten++;
      } catch (e) {
        log.warn("factedge-inference write failed", {
          clientId: opts.clientId,
          fromFactId: edge.fromFactId,
          toFactId: edge.toFactId,
          relation: edge.relation,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err);
  }
  result.durationMs = Date.now() - startedAt;
  return result;
}
