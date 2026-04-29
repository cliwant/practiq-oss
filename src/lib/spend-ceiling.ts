/**
 * Per-firm Claude / OpenRouter spend ceiling — Wave-4 P0-02.
 *
 * Stripe is in live mode. A buggy agent that fans out across 200
 * clients in a tight loop can rack up real money quickly. This module
 * sums every UsageEvent row inside the user's current billing period
 * (or trailing 30 days if free) at conservative model prices and
 * blocks new chat / agent runs once the ceiling is hit.
 *
 * The ceiling is plan-aware: solo is $20/mo (≈ enough for 12,000
 * Sonnet 4.5 chat turns), Practice $80/mo, Firm $300/mo. Free /
 * trial users get $5 — generous for tire-kicking, blocks runaway.
 *
 * Three integration points:
 *   1. `getCurrentSpend(userId)` — read-only, used by /admin/analytics
 *      to surface a per-user spend table + percent-of-cap bar.
 *   2. `assertSpendUnderCeiling(userId, opts)` — async guard, throws
 *      `SpendCeilingExceededError` when blocked. Chat / agent entry
 *      points call this BEFORE the model call, never after.
 *   3. `recordUsage(userId, …)` — convenience wrapper that writes a
 *      UsageEvent row. Existing callers can keep using prisma
 *      directly; this just centralises the kind/provider strings.
 *
 * Pricing table is intentionally conservative (Anthropic list prices,
 * not OpenRouter's discounts) so we never under-bill ourselves. If
 * actual spend on the dashboard diverges materially, update PRICING
 * and ship — this is a single source of truth.
 */

import { prisma } from "@/lib/prisma";
import { resolveUserPlan, type ResolvedPlan } from "@/lib/plan-gates";

/**
 * USD per 1M input / output tokens, indexed by **whatever model id the
 * provider records**. We accept all three forms in the wild:
 *
 *   - The catalog id from `src/lib/llm/models.ts` (e.g. `claude-haiku-4-5`)
 *   - The dated Anthropic id we ship to api.anthropic.com (e.g.
 *     `claude-haiku-4-5-20251010`)
 *   - The OpenRouter-prefixed id when traffic flows through the shim
 *     (e.g. `anthropic/claude-haiku-4.5`, `openai/gpt-4o`)
 *
 * Keeping all three keyed at the same price means the spend meter
 * stays accurate regardless of which provider served the call. Round
 * 12: GPT-4o was added to the user-selectable catalog but had no entry
 * here, so OpenRouter-routed GPT-4o calls fell through to
 * FALLBACK_PRICE ($3/$15) and over-counted cost ~4×. The launch-
 * verification report (`docs/launch/llm-verification-report.md` §8)
 * called this out as the single ship-relevant pricing gap.
 */
const PRICING: Record<string, { input: number; output: number }> = {
  // Sonnet 4.5 (flagship) — 2026 list prices
  "claude-sonnet-4-5": { input: 3, output: 15 },
  "claude-sonnet-4-5-20250929": { input: 3, output: 15 },
  "claude-sonnet-4-5-20250101": { input: 3, output: 15 }, // legacy
  "anthropic/claude-sonnet-4.5": { input: 3, output: 15 }, // OpenRouter shim
  // Sonnet 4 (legacy)
  "claude-sonnet-4": { input: 3, output: 15 },
  // Opus 4.1 (premium)
  "claude-opus-4-1": { input: 15, output: 75 },
  "claude-opus-4-1-20250805": { input: 15, output: 75 },
  "anthropic/claude-opus-4.1": { input: 15, output: 75 },
  "claude-opus-4": { input: 15, output: 75 }, // legacy id, kept for replay
  // Haiku 4.5 — cheap pre-classifier + digest compactor
  "claude-haiku-4-5": { input: 0.25, output: 1.25 },
  "claude-haiku-4-5-20251010": { input: 0.25, output: 1.25 },
  "anthropic/claude-haiku-4.5": { input: 0.25, output: 1.25 },
  "claude-haiku-4": { input: 0.25, output: 1.25 }, // legacy short alias
  // GPT-4o via OpenRouter — only catalog member that's not Claude
  "openai/gpt-4o": { input: 2.5, output: 10 },
  "gpt-4o": { input: 2.5, output: 10 }, // bare id, in case provider strips the prefix
};
const FALLBACK_PRICE = { input: 3, output: 15 };

/** Plan-keyed ceiling in USD per billing period. */
const CEILINGS_USD: Record<string, number> = {
  free: 5,
  solo: 20,
  practice: 80,
  firm: 300,
};

export interface SpendSnapshot {
  userId: string;
  planKey: string;
  ceilingUsd: number;
  spentUsd: number;
  inputTokens: number;
  outputTokens: number;
  /** Snapshot window. */
  periodStart: Date;
  periodEnd: Date;
  /** True when spent exceeds (or equals) ceiling. */
  exceeded: boolean;
  /** Fraction 0..1 of ceiling consumed, capped at 1 for display. */
  fractionUsed: number;
}

export class SpendCeilingExceededError extends Error {
  readonly snapshot: SpendSnapshot;
  constructor(snapshot: SpendSnapshot) {
    super(
      `Spend ceiling reached: $${snapshot.spentUsd.toFixed(2)} of $${snapshot.ceilingUsd.toFixed(2)} for plan ${snapshot.planKey}`,
    );
    this.name = "SpendCeilingExceededError";
    this.snapshot = snapshot;
  }
}

/**
 * Read the user's current-period spend. Returns a SpendSnapshot.
 * Period:
 *   - Subscribed users: from `subscription.currentPeriodStart` (DB) to
 *     `currentPeriodEnd`. Stripe billing period.
 *   - Free / trial users: trailing 30 days.
 */
export async function getCurrentSpend(userId: string): Promise<SpendSnapshot> {
  const plan = await resolveUserPlan(userId);
  const ceilingUsd = CEILINGS_USD[plan.planKey] ?? CEILINGS_USD.free;
  const { periodStart, periodEnd } = await resolveBillingWindow(userId, plan);

  const events = await prisma.usageEvent.findMany({
    where: {
      userId,
      createdAt: { gte: periodStart, lte: periodEnd },
    },
    select: {
      inputTokens: true,
      outputTokens: true,
      model: true,
    },
  });

  let spentUsd = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  for (const e of events) {
    inputTokens += e.inputTokens ?? 0;
    outputTokens += e.outputTokens ?? 0;
    const price = priceForModel(e.model);
    spentUsd +=
      ((e.inputTokens ?? 0) * price.input) / 1_000_000 +
      ((e.outputTokens ?? 0) * price.output) / 1_000_000;
  }

  return {
    userId,
    planKey: plan.planKey,
    ceilingUsd,
    spentUsd: round2(spentUsd),
    inputTokens,
    outputTokens,
    periodStart,
    periodEnd,
    exceeded: spentUsd >= ceilingUsd,
    fractionUsed: Math.min(1, ceilingUsd > 0 ? spentUsd / ceilingUsd : 0),
  };
}

/**
 * Throw `SpendCeilingExceededError` if the user is at or above their
 * ceiling. Caller wraps in try/catch to translate to a 402 response.
 *
 * Skip when `process.env.SPEND_CEILING_DISABLED === "1"` — emergency
 * escape valve for prod.
 */
export async function assertSpendUnderCeiling(userId: string): Promise<void> {
  if (process.env.SPEND_CEILING_DISABLED === "1") return;
  const snap = await getCurrentSpend(userId);
  if (snap.exceeded) throw new SpendCeilingExceededError(snap);
}

/**
 * Aggregate snapshot for an admin view — top N spenders this period.
 * Reads UsageEvent grouped by user. Useful in /admin/analytics.
 */
export async function getTopSpendersThisPeriod(
  limit = 25,
): Promise<SpendSnapshot[]> {
  // Trailing 30d window — admin view needs cross-user comparison even
  // when individual periods differ. Per-user accuracy is in
  // /admin/analytics/[userId] using getCurrentSpend.
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const rows = await prisma.usageEvent.groupBy({
    by: ["userId"],
    where: { createdAt: { gte: since } },
    _sum: {
      inputTokens: true,
      outputTokens: true,
    },
  });

  const snapshots = await Promise.all(
    rows.map(async (r) => getCurrentSpend(r.userId)),
  );
  return snapshots
    .sort((a, b) => b.spentUsd - a.spentUsd)
    .slice(0, limit);
}

async function resolveBillingWindow(
  userId: string,
  plan: ResolvedPlan,
): Promise<{ periodStart: Date; periodEnd: Date }> {
  if (plan.subscriptionId) {
    const sub = await prisma.subscription.findUnique({
      where: { id: plan.subscriptionId },
      select: { currentPeriodStart: true, currentPeriodEnd: true },
    });
    if (sub) {
      return {
        periodStart: sub.currentPeriodStart,
        periodEnd: sub.currentPeriodEnd,
      };
    }
  }
  const now = new Date();
  return {
    periodStart: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    periodEnd: now,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Resolve the per-million-token price tuple for a given model id.
 * Falls back to a conservative Sonnet-shaped price when the model
 * isn't in the table or is null. Pulled out of the main loop so the
 * type narrows cleanly (Object.entries().find() returns optional).
 */
function priceForModel(model: string | null): { input: number; output: number } {
  if (!model) return FALLBACK_PRICE;
  if (model in PRICING) return PRICING[model];
  for (const [prefix, price] of Object.entries(PRICING)) {
    if (model.startsWith(prefix)) return price;
  }
  return FALLBACK_PRICE;
}

/**
 * Compute the USD cost for one (model, inputTokens, outputTokens) tuple
 * using the same conservative PRICING table that the spend-ceiling
 * snapshot uses. Exported so the agent runner can persist `usdCost`
 * directly on the `AgentTask` row at completion — surfaces in the
 * approval queue + activity feed so operators can see "this run cost
 * $0.22" without an extra DB roundtrip per render.
 *
 * Rounded to 4 decimals (~ $0.0001 granularity) which is plenty for
 * agent-scale tasks (~$0.01..$0.50 each) and matches the
 * `Decimal(10, 4)` precision on `AgentTask.usdCost`. Models we don't
 * know about fall back to a conservative Sonnet-shaped price.
 */
export function computeUsdCost(
  model: string | null,
  inputTokens: number,
  outputTokens: number,
): number {
  const price = priceForModel(model);
  const usd =
    (inputTokens * price.input) / 1_000_000 +
    (outputTokens * price.output) / 1_000_000;
  return Math.round(usd * 10_000) / 10_000;
}
