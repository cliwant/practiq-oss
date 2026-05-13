/**
 * Per-model pricing table for Claude / OpenRouter LLM calls.
 *
 * Centralised so every code path that needs to convert (model,
 * inputTokens, outputTokens) → USD does it the same way. Three callers
 * today:
 *   1. `lib/spend-ceiling.ts` — authenticated-user spend caps. Reads
 *      `priceForModel` indirectly via `computeUsdCost` (re-exported
 *      below for back-compat).
 *   2. `lib/claude/anon-spend.ts` — anonymous-prospect $-budget guard
 *      on the public LLM hot paths (workflow-audit, ai-policy-generator).
 *   3. `lib/agents/*` — records each AgentTask's `usdCost` at completion.
 *
 * The PRICING table is intentionally conservative (Anthropic list
 * prices, not OpenRouter's slight discounts) so we never under-bill
 * ourselves into surprise overage. If actual spend on the dashboard
 * diverges materially, update PRICING and ship — this is the single
 * source of truth.
 *
 * Keep it keyed at three name shapes so the spend meter is accurate
 * regardless of which provider served the call:
 *   - Catalog id  (e.g. `claude-haiku-4-5`)
 *   - Dated Anthropic id  (e.g. `claude-haiku-4-5-20251010`)
 *   - OpenRouter-prefixed id  (e.g. `anthropic/claude-haiku-4.5`,
 *     `openai/gpt-4o`)
 *
 * Round-12 incident note: GPT-4o was added to the user-selectable
 * catalog but had no PRICING entry, so OpenRouter-routed GPT-4o calls
 * fell through to FALLBACK_PRICE ($3/$15) and over-counted cost ~4×.
 * That was the single ship-relevant pricing gap flagged by the
 * launch-verification report; the table below has it covered.
 */

export interface ModelPrice {
  /** USD per 1,000,000 input tokens. */
  input: number;
  /** USD per 1,000,000 output tokens. */
  output: number;
}

export const PRICING: Record<string, ModelPrice> = {
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

/** Conservative Sonnet-shaped price for unknown models. */
export const FALLBACK_PRICE: ModelPrice = { input: 3, output: 15 };

/**
 * Resolve the per-million-token price tuple for a given model id. Falls
 * back to FALLBACK_PRICE when the model isn't in the table or is null /
 * undefined. Accepts both bare and dated / vendor-prefixed forms via the
 * second-pass `startsWith` scan.
 */
export function priceForModel(model: string | null | undefined): ModelPrice {
  if (!model) return FALLBACK_PRICE;
  if (model in PRICING) return PRICING[model];
  for (const [prefix, price] of Object.entries(PRICING)) {
    if (model.startsWith(prefix)) return price;
  }
  return FALLBACK_PRICE;
}

/**
 * Convert one (model, inputTokens, outputTokens) tuple into USD cost
 * using the conservative PRICING table. Rounded to 4 decimals
 * (~ $0.0001) which is plenty for agent-scale tasks ($0.01..$0.50 each)
 * and matches the `Decimal(10, 4)` precision on `AgentTask.usdCost`.
 */
export function costForCall(
  model: string | null | undefined,
  inputTokens: number,
  outputTokens: number,
): number {
  const price = priceForModel(model);
  const usd =
    (inputTokens * price.input) / 1_000_000 +
    (outputTokens * price.output) / 1_000_000;
  return Math.round(usd * 10_000) / 10_000;
}
