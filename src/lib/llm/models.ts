/**
 * User-selectable LLM model catalog.
 *
 * Practiq routes Claude calls through either the Anthropic-direct API
 * (when `ANTHROPIC_API_KEY` is set + `CLAUDE_PROVIDER=anthropic`) or
 * OpenRouter's Anthropic-compatible shim. Both providers accept the
 * same Tool Use contract, so adding new models is a UI-only change
 * once the slug is in this catalog.
 *
 * Each entry carries:
 * - `id`           : the catalog key persisted on `User.preferredModel`
 * - `label`        : human-friendly name shown in the UI
 * - `tier`         : "fast" | "balanced" | "max" — describes latency
 *                    vs. capability tradeoff for the picker
 * - `anthropicModel`: model id when calling Anthropic-direct
 * - `openRouterModel`: model id when calling OpenRouter
 * - `costClass`   : rough cost band shown to the user ("$" / "$$" / "$$$")
 * - `availableOnPlans`: which Practiq plan keys can use this model
 *                       (free trial gets fast-tier only; paid plans get
 *                        balanced; max-tier is gated behind Practice+)
 *
 * The default routes to Sonnet 4.5 — same as `DEFAULT_MODEL` in
 * provider.ts — so existing behavior is unchanged for users who never
 * touch the picker.
 */
export type ModelTier = "fast" | "balanced" | "max";
export type CostClass = "$" | "$$" | "$$$";
export type ModelPlanGate = "free" | "solo" | "practice" | "firm";

export interface ModelOption {
  id: string;
  label: string;
  tagline: string;
  tier: ModelTier;
  costClass: CostClass;
  anthropicModel: string;
  openRouterModel: string;
  availableOnPlans: ModelPlanGate[];
}

export const MODEL_CATALOG: ModelOption[] = [
  {
    id: "claude-haiku-4-5",
    label: "Claude Haiku 4.5",
    tagline:
      "Fastest. Best for short briefings, classification, and high-volume agent runs.",
    tier: "fast",
    costClass: "$",
    anthropicModel: "claude-haiku-4-5-20251010",
    openRouterModel: "anthropic/claude-haiku-4.5",
    availableOnPlans: ["free", "solo", "practice", "firm"],
  },
  {
    id: "claude-sonnet-4-5",
    label: "Claude Sonnet 4.5",
    tagline:
      "Balanced. Default for client briefings, drafting, and approvals.",
    tier: "balanced",
    costClass: "$$",
    anthropicModel: "claude-sonnet-4-5-20250929",
    openRouterModel: "anthropic/claude-sonnet-4.5",
    availableOnPlans: ["free", "solo", "practice", "firm"],
  },
  {
    id: "claude-opus-4-1",
    label: "Claude Opus 4.1",
    tagline:
      "Highest reasoning. Reach for it on multi-client synthesis and firm-wide analysis.",
    tier: "max",
    costClass: "$$$",
    anthropicModel: "claude-opus-4-1-20250805",
    openRouterModel: "anthropic/claude-opus-4.1",
    availableOnPlans: ["practice", "firm"],
  },
  {
    id: "gpt-4o",
    label: "GPT-4o",
    tagline:
      "OpenAI's multimodal generalist via OpenRouter. Use when you want a non-Claude opinion.",
    tier: "balanced",
    costClass: "$$",
    anthropicModel: "claude-sonnet-4-5-20250929", // fallback if Anthropic-direct routing
    openRouterModel: "openai/gpt-4o",
    availableOnPlans: ["solo", "practice", "firm"],
  },
];

/**
 * The catalog id used when a User has no preference set, when the
 * persisted preference is missing from the catalog, or when the
 * user's plan no longer includes their previously-chosen model.
 */
export const DEFAULT_MODEL_ID = "claude-sonnet-4-5";

export function isValidModelId(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return MODEL_CATALOG.some((m) => m.id === value);
}

export function getModelOption(
  id: string | null | undefined,
): ModelOption {
  if (!id) return MODEL_CATALOG.find((m) => m.id === DEFAULT_MODEL_ID)!;
  return (
    MODEL_CATALOG.find((m) => m.id === id) ??
    MODEL_CATALOG.find((m) => m.id === DEFAULT_MODEL_ID)!
  );
}

/**
 * Resolve the right provider-specific model id for the user's selected
 * catalog entry. The provider is decided by the runtime — Anthropic-
 * direct when `process.env.CLAUDE_PROVIDER === "anthropic"` and a key
 * is present, otherwise OpenRouter.
 */
export function resolveModelForProvider(
  catalogId: string | null | undefined,
  provider: "anthropic" | "openrouter",
): string {
  const opt = getModelOption(catalogId);
  return provider === "anthropic" ? opt.anthropicModel : opt.openRouterModel;
}

/**
 * Filter the catalog down to options the user's plan can use. Free
 * trial gets fast-tier only; paid plans get balanced; max-tier is
 * Practice+/Firm.
 */
export function modelsForPlan(plan: ModelPlanGate): ModelOption[] {
  return MODEL_CATALOG.filter((m) => m.availableOnPlans.includes(plan));
}

/**
 * Server helper: given a User row, return the catalog id that should
 * actually be used for outbound requests (taking plan gating into
 * account). Falls back to DEFAULT_MODEL_ID if the persisted preference
 * is no longer allowed under the user's current plan.
 */
export function effectiveModelId(
  preferred: string | null | undefined,
  plan: ModelPlanGate = "free",
): string {
  const allowed = modelsForPlan(plan).map((m) => m.id);
  if (preferred && allowed.includes(preferred)) return preferred;
  return DEFAULT_MODEL_ID;
}
