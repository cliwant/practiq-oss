/**
 * 5-Tier Memory Composer — Wave-4 RUN 7 (P1-06).
 *
 * Orchestrates the five tier readers (T0..T4) under a single token
 * budget so every agent + chat call gets a consistent memory shape.
 * This replaces the ad-hoc `prisma.clientContext.findMany({ take:
 * 50 })` blocks scattered across `runner.ts`, `daily-briefing.ts`,
 * `anomaly-detector.ts`, `comms-drafter.ts`, and `chat/route.ts`.
 *
 * Design covered in detail at
 * `.cycle/research/2026-04-28-memory-deep-dive.md`. Highlights:
 *
 *   - **Default budget**: 2000 tokens. Caller can shrink (chat with
 *     long tool-use loops) or grow (offline batch agent).
 *   - **Tier order in prompt**: T0 → T1 → T4 → T3 → T2. Profile
 *     and digest first because they're the lowest-cost grounding;
 *     firm patterns next because they're the strongest decision
 *     defaults; episodic timeline next; vector hits last (only
 *     when caller passed a query).
 *   - **Allocation strategy**: each tier has a "soft cap" (the
 *     numbers in the design doc). The composer fills tiers in
 *     priority order and stops adding once the running total would
 *     exceed `budgetTokens`. Tiers that can't fit at all are still
 *     reported in `tiers` with `included: false` for observability.
 *   - **Fallback**: every tier reader's failure is non-fatal. A
 *     missing T1 (no digest run yet) returns an empty TierBlock.
 *     The composer continues with the rest.
 *   - **Auth**: Caller is expected to have already verified
 *     `clientId` belongs to `userId`. We do NOT re-check ownership
 *     inside the composer — that would add a Prisma roundtrip on
 *     every chat turn for no defence-in-depth gain (every caller
 *     already does it).
 */

import { prisma } from "@/lib/prisma";
import { approxTokenCount } from "./token-counter";
import { loadT0Profile, type ProfileInputClient, type TierBlock } from "./tiers/profile";
import { loadT1Digest } from "./tiers/digest";
import { loadT2VectorHits } from "./tiers/vector-hits";
import { loadT3Episodic } from "./tiers/episodic";
import { loadT4FirmPatterns } from "./tiers/firm-patterns";

export type TierName = "T0" | "T1" | "T2" | "T3" | "T4";

export interface MemoryLoadOpts {
  clientId: string;
  userId: string;
  /** Caller's total budget for the memory block. Defaults to 2000. */
  budgetTokens?: number;
  /** Optional query that turns on T2 vector retrieval. */
  query?: string;
  /** Skip specific tiers entirely (perf testing or specialised callers). */
  skip?: ReadonlyArray<TierName>;
  /**
   * Pre-loaded client to avoid re-querying when the caller already
   * has it (chat route loads `dbClient` for ownership; agent runner
   * has it inside `ctx.client`). When omitted we fetch ourselves.
   */
  preloadedClient?: ProfileInputClient;
}

export interface MemoryLoadResult {
  /** Final formatted Markdown ready to paste into a system prompt. */
  prompt: string;
  /** Sum of `tokensApprox` across included tiers + headroom. */
  tokensApprox: number;
  /** Per-tier breakdown (whether included, token count, summary). */
  tiers: Record<TierName, {
    included: boolean;
    tokensApprox: number;
    summary: string;
    hadData: boolean;
  }>;
  /** Total budget the caller asked for. */
  budgetTokens: number;
  /** Tokens left under budget (≥ 0). */
  headroomTokens: number;
}

/**
 * Default per-tier soft cap (tokens). Composer scales these to
 * fit `budgetTokens` proportionally — the ratios stay the same.
 *
 * NB: the composer can grant *less* than the soft cap to a tier
 * if budget is tight, but never more (tiers self-clamp internally).
 */
const SOFT_CAPS: Record<TierName, number> = {
  T0: 250,
  T1: 500,
  T2: 600,
  T3: 300,
  T4: 250,
};
const HEADROOM_TOKENS = 100; // for header / separators / format
const DEFAULT_BUDGET = 2000;

/**
 * Order in which we ATTEMPT to add tiers. We always try T0 first
 * (it's the cheapest grounding and most useful when budget is
 * tight). T2 is last because it's the only optional one (caller
 * may not pass a query) and the heaviest.
 */
const COMPOSE_ORDER: TierName[] = ["T0", "T1", "T4", "T3", "T2"];

/**
 * Order in which we EMIT tiers in the final Markdown. Different
 * from compose order so the model sees a stable narrative shape:
 * profile → digest → patterns → timeline → query-specific hits.
 */
const EMIT_ORDER: TierName[] = ["T0", "T1", "T4", "T3", "T2"];

export async function loadClientMemoryForPrompt(
  opts: MemoryLoadOpts,
): Promise<MemoryLoadResult> {
  const budget = Math.max(300, opts.budgetTokens ?? DEFAULT_BUDGET);
  const skip = new Set(opts.skip ?? []);

  // 1. Resolve the caps. Sum of SOFT_CAPS is 1900 (250+500+600+300+
  //    250). Add HEADROOM (100) → 2000. If the caller's budget is
  //    smaller, scale every cap proportionally.
  const softTotal =
    SOFT_CAPS.T0 + SOFT_CAPS.T1 + SOFT_CAPS.T2 + SOFT_CAPS.T3 + SOFT_CAPS.T4 + HEADROOM_TOKENS;
  const scale = budget / softTotal;
  const caps: Record<TierName, number> = {
    T0: Math.max(80, Math.floor(SOFT_CAPS.T0 * scale)),
    T1: Math.max(150, Math.floor(SOFT_CAPS.T1 * scale)),
    T2: Math.max(180, Math.floor(SOFT_CAPS.T2 * scale)),
    T3: Math.max(100, Math.floor(SOFT_CAPS.T3 * scale)),
    T4: Math.max(80, Math.floor(SOFT_CAPS.T4 * scale)),
  };

  // 2. Resolve the client (or use the preloaded copy).
  const client = opts.preloadedClient
    ? opts.preloadedClient
    : await fetchClientLite(opts.clientId, opts.userId);
  if (!client) {
    return emptyResult(budget);
  }

  // 3. Run all tier readers in parallel. Each reader handles its
  //    own try/catch — failures return empty TierBlocks, never
  //    throw to the composer.
  const [t0, t1, t4, t3, t2] = await Promise.all([
    skip.has("T0")
      ? Promise.resolve(skippedBlock("T0"))
      : Promise.resolve(loadT0Profile(client, caps.T0)),
    skip.has("T1")
      ? Promise.resolve(skippedBlock("T1"))
      : loadT1Digest({ clientId: opts.clientId, cap: caps.T1 }).catch(() =>
          skippedBlock("T1", "load failed"),
        ),
    skip.has("T4")
      ? Promise.resolve(skippedBlock("T4"))
      : loadT4FirmPatterns({
          userId: opts.userId,
          clientId: opts.clientId,
          cap: caps.T4,
        }).catch(() => skippedBlock("T4", "load failed")),
    skip.has("T3")
      ? Promise.resolve(skippedBlock("T3"))
      : loadT3Episodic({ clientId: opts.clientId, cap: caps.T3 }).catch(() =>
          skippedBlock("T3", "load failed"),
        ),
    skip.has("T2") || !opts.query || opts.query.trim().length === 0
      ? Promise.resolve(skippedBlock("T2", "no query"))
      : loadT2VectorHits({
          clientId: opts.clientId,
          userId: opts.userId,
          query: opts.query,
          cap: caps.T2,
        }).catch(() => skippedBlock("T2", "load failed")),
  ]);

  const blocksByName: Record<TierName, TierBlock> = { T0: t0, T1: t1, T2: t2, T3: t3, T4: t4 };

  // 4. Greedy fit in COMPOSE_ORDER. Skip a tier if adding it would
  //    blow the running budget.
  let runningTotal = HEADROOM_TOKENS;
  const included = new Set<TierName>();
  for (const name of COMPOSE_ORDER) {
    const block = blocksByName[name];
    if (!block.hadData || block.tokensApprox === 0) continue;
    if (runningTotal + block.tokensApprox > budget) continue;
    included.add(name);
    runningTotal += block.tokensApprox;
  }

  // 5. Emit in EMIT_ORDER for stable prompt-cache keying.
  const sections: string[] = ["# Client memory (5-tier)"];
  for (const name of EMIT_ORDER) {
    if (!included.has(name)) continue;
    sections.push(blocksByName[name].body);
  }
  const prompt = sections.join("\n");

  // 6. Build the per-tier observability map.
  const tiers: MemoryLoadResult["tiers"] = {
    T0: tierMeta(blocksByName.T0, included.has("T0")),
    T1: tierMeta(blocksByName.T1, included.has("T1")),
    T2: tierMeta(blocksByName.T2, included.has("T2")),
    T3: tierMeta(blocksByName.T3, included.has("T3")),
    T4: tierMeta(blocksByName.T4, included.has("T4")),
  };

  return {
    prompt,
    tokensApprox: approxTokenCount(prompt),
    tiers,
    budgetTokens: budget,
    headroomTokens: Math.max(0, budget - runningTotal),
  };
}

async function fetchClientLite(
  clientId: string,
  userId: string,
): Promise<ProfileInputClient | null> {
  const row = await prisma.client.findFirst({
    where: { id: clientId, userId },
    select: {
      id: true,
      name: true,
      industry: true,
      userRole: true,
      relationshipMonths: true,
      preferences: true,
    },
  });
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    industry: row.industry,
    userRole: row.userRole,
    relationshipMonths: row.relationshipMonths,
    preferences: (row.preferences ?? null) as Record<string, unknown> | null,
  };
}

function skippedBlock(tier: TierName, reason = "skipped"): TierBlock {
  return {
    tier,
    body: "",
    tokensApprox: 0,
    summary: reason,
    hadData: false,
  };
}

function tierMeta(
  block: TierBlock,
  isIncluded: boolean,
): MemoryLoadResult["tiers"]["T0"] {
  return {
    included: isIncluded,
    tokensApprox: block.tokensApprox,
    summary: block.summary,
    hadData: block.hadData,
  };
}

function emptyResult(budget: number): MemoryLoadResult {
  const skipped = (t: TierName) => skippedBlock(t, "client not found");
  const empty = (t: TierName) => tierMeta(skipped(t), false);
  return {
    prompt: "# Client memory (5-tier)\n\n(client not found or unauthorised)\n",
    tokensApprox: 12,
    tiers: { T0: empty("T0"), T1: empty("T1"), T2: empty("T2"), T3: empty("T3"), T4: empty("T4") },
    budgetTokens: budget,
    headroomTokens: budget,
  };
}
