/**
 * Pricing plan registry — single source of truth.
 *
 * The plans here back BOTH the public `/pricing` page AND the Stripe
 * checkout flow. Any drift between the two is a billing/legal risk
 * (customer sees one price, gets charged another), so this file is
 * the only place those numbers live. The pricing page imports from
 * here.
 *
 * 2026-04-29 (L4): pricing rebalanced to a token-allowance + metered-
 * overage model. Flat per-msg caps were a poor fit because chat turns
 * vary 10x in token cost depending on context size. Each paid plan
 * now has an inclusive monthly token allowance + a per-1K overage
 * rate that bills via Stripe metered usage records.
 *
 *   Demo (anonymous)  $0   / 5K tokens / IP / day  → hard cut-off, sign-up CTA
 *   Trial (logged in) $0   / 200K total / 14d      → hard cut-off, upgrade CTA
 *   Solo              $49  / 2M tokens / mo        → $0.012 / 1K overage
 *   Practice          $149 / 10M tokens / mo       → $0.012 / 1K overage
 *   Firm              $399 / 50M tokens / mo       → $0.010 / 1K overage
 *
 * Cost model (Sonnet 4.5 list, before margin):
 *   2M tokens ≈ $9.00 LLM cost  → Solo $49 nets ~$40 margin (82%)
 *   10M tokens ≈ $45 LLM cost   → Practice $149 nets ~$104 (70%)
 *   50M tokens ≈ $225 LLM cost  → Firm $399 nets ~$174 (44%)
 *
 * Overage is opt-in per-subscription via `Subscription.overageEnabled`;
 * by default paid users hit a hard cut-off at allowance and must
 * explicitly enable metered overage in /app/settings billing UI.
 *
 * Founding Member tier preserved on Practice — locks $49/mo for life
 * with the same 10M token allowance.
 */

export type PlanKey = "free" | "solo" | "practice" | "firm";

/**
 * Resolve Stripe price IDs from env. Missing vars return null so the
 * UI can show "Contact sales" or disable the CTA cleanly.
 */
function priceId(envVar: string): string | null {
  const v = process.env[envVar];
  return v && v.trim().length > 0 ? v.trim() : null;
}

export interface PlanDefinition {
  key: PlanKey;
  publicName: string;
  tagline: string;
  monthlyPriceUsd: number;
  /** Stripe price ID (standard pricing). null = checkout disabled. */
  stripePriceId: string | null;
  /** Stripe price ID for Founding Member tier (Practice only). */
  stripePriceIdFounding?: string | null;
  /** Stripe price ID for additional seats above the included count. */
  stripePriceIdExtraSeat?: string | null;
  /**
   * Stripe price ID for the **metered overage** line item — the recurring
   * `usage_type=metered, aggregate_usage=sum` price that we bill against
   * via `subscriptionItems.createUsageRecord`. Set null until the operator
   * creates the price in the Stripe dashboard.
   */
  stripePriceIdOverage?: string | null;
  /** Founding Member price (USD). Only set on Practice. */
  monthlyPriceFoundingUsd?: number;
  /** Additional-seat price (USD). null = seats fixed (no add-ons). */
  monthlyExtraSeatUsd?: number;
  features: string[];
  /** Hard ceiling on client workspaces. 0 = unlimited. */
  includedClients: number;
  /** Number of seats included in the base price. */
  includedSeats: number;
  /** Hard cap on chat messages per billing period. 0 = unlimited. */
  monthlyChatMessages: number;
  /**
   * Inclusive monthly token allowance (input + output, summed across
   * all callers — chat + agent + artifact). 0 = no allowance, all
   * traffic bills as overage. null = unlimited (not currently used).
   */
  monthlyIncludedTokens: number;
  /**
   * USD price per **1,000 tokens** charged once the user crosses
   * `monthlyIncludedTokens`. 0 = no overage allowed (hard cut-off).
   * Solo/Practice: $0.012 · Firm: $0.010.
   */
  overageUsdPer1k: number;
  /** Whether nightly background agent runs for this plan. */
  backgroundAgent: boolean;
  /** Whether Approval Queue routing across teammates is allowed. */
  teamRouting: boolean;
  /** Whether role-based access control is enforced (member/viewer). */
  rbac: boolean;
  /** Whether SOC 2 / dedicated onboarding / QBR are included. */
  whiteGlove: boolean;
  popular?: boolean;
}

/**
 * Free trial — no Stripe price. Auto-applied to every signup. After
 * 14 days of trial, the user must subscribe to keep using paid
 * features. Trial caps are tight on purpose: enough to evaluate the
 * UX, not enough to run a real practice.
 *
 * Token cap is 200K total across the 14-day window (NOT per month) —
 * enforced by `assertBudget` in `src/lib/token-budget.ts` rather than
 * the chat-msg gate. This is a reasonable tire-kick budget (~50 medium
 * chat turns at average context size) without bleeding cost.
 */
export const FREE_TRIAL: Pick<
  PlanDefinition,
  | "key"
  | "monthlyChatMessages"
  | "monthlyIncludedTokens"
  | "overageUsdPer1k"
  | "includedClients"
  | "includedSeats"
  | "backgroundAgent"
  | "teamRouting"
  | "rbac"
  | "whiteGlove"
> & { trialDurationDays: number; trialTotalTokens: number } = {
  key: "free",
  monthlyChatMessages: 50,
  monthlyIncludedTokens: 0, // tracked separately via trialTotalTokens
  overageUsdPer1k: 0, // hard cut-off
  includedClients: 1,
  includedSeats: 1,
  backgroundAgent: false,
  teamRouting: false,
  rbac: false,
  whiteGlove: false,
  trialDurationDays: 14,
  trialTotalTokens: 200_000,
};

/**
 * Demo zone (anonymous, no auth). Per-IP rolling 24h cap. Hard cut-off
 * at the cap; no overage allowed. Surfaced via /api/demo/chat with
 * sign-up CTA on exhaustion.
 */
export const DEMO_ZONE = {
  /** Rolling-window cap per IP. */
  tokensPerIpPerDay: 5_000,
  /** Window length used by the rate limiter. */
  windowMs: 24 * 60 * 60 * 1000,
} as const;

export const PLANS: Record<Exclude<PlanKey, "free">, PlanDefinition> = {
  solo: {
    key: "solo",
    publicName: "Solo",
    tagline: "For solo operators running the whole show.",
    monthlyPriceUsd: 49,
    stripePriceId: priceId("STRIPE_PRICE_SOLO"),
    stripePriceIdOverage: priceId("STRIPE_PRICE_SOLO_OVERAGE"),
    includedClients: 30,
    includedSeats: 1,
    monthlyChatMessages: 0, // unbounded — token allowance is the actual gate
    monthlyIncludedTokens: 2_000_000,
    overageUsdPer1k: 0.012,
    backgroundAgent: true,
    teamRouting: false,
    rbac: false,
    whiteGlove: false,
    features: [
      "Up to 30 client workspaces",
      "2 million AI tokens / month",
      "Overage at $0.012 per 1K tokens (opt-in)",
      "Daily AI morning briefing on every client",
      "Unlimited document generation (.xlsx, .docx)",
      "Per-client tone-aware email drafting",
      "30 days of context memory per client",
      "Email support (24h response)",
      "1 seat",
    ],
  },
  practice: {
    key: "practice",
    publicName: "Practice",
    tagline: "For 2-5 person firms pushing past the context ceiling.",
    monthlyPriceUsd: 149,
    monthlyPriceFoundingUsd: 49,
    monthlyExtraSeatUsd: 19,
    stripePriceId: priceId("STRIPE_PRICE_PRACTICE"),
    stripePriceIdFounding: priceId("STRIPE_PRICE_PRACTICE_FOUNDING"),
    stripePriceIdExtraSeat: priceId("STRIPE_PRICE_PRACTICE_SEAT"),
    stripePriceIdOverage: priceId("STRIPE_PRICE_PRACTICE_OVERAGE"),
    includedClients: 100,
    includedSeats: 5,
    monthlyChatMessages: 0, // token allowance is the actual gate
    monthlyIncludedTokens: 10_000_000,
    overageUsdPer1k: 0.012,
    backgroundAgent: true,
    teamRouting: true,
    rbac: true,
    whiteGlove: false,
    popular: true,
    features: [
      "Everything in Solo, plus:",
      "Up to 100 client workspaces",
      "10 million AI tokens / month (pooled across the team)",
      "Overage at $0.012 per 1K tokens (opt-in)",
      "Shared client memory across the team",
      "Approval Queue routing across teammates",
      "Role-based access per client (owner / member / viewer)",
      "Pattern learning from your team's decisions",
      "Unlimited context memory per client",
      "5 seats included · $19 / extra seat / mo",
      "Priority email + live chat (4h response)",
    ],
  },
  firm: {
    key: "firm",
    publicName: "Firm",
    tagline: "For 6-10 person firms at 100-200 clients.",
    monthlyPriceUsd: 399,
    monthlyExtraSeatUsd: 29,
    stripePriceId: priceId("STRIPE_PRICE_FIRM"),
    stripePriceIdExtraSeat: priceId("STRIPE_PRICE_FIRM_SEAT"),
    stripePriceIdOverage: priceId("STRIPE_PRICE_FIRM_OVERAGE"),
    includedClients: 200,
    includedSeats: 10,
    monthlyChatMessages: 0, // token allowance is the actual gate
    monthlyIncludedTokens: 50_000_000,
    overageUsdPer1k: 0.010,
    backgroundAgent: true,
    teamRouting: true,
    rbac: true,
    whiteGlove: true,
    features: [
      "Everything in Practice, plus:",
      "Up to 200 client workspaces",
      "50 million AI tokens / month (pooled)",
      "Overage at $0.010 per 1K tokens (opt-in)",
      "Advanced role permissions + audit trail export",
      "Dedicated onboarding (2 hours 1:1)",
      "Custom integrations via API",
      "SOC 2 / compliance documentation",
      "Dedicated Slack channel for support",
      "Quarterly business review",
      "10 seats included · $29 / extra seat / mo",
    ],
  },
};

/**
 * Plans in display order. Marketing UI iterates this. The free trial
 * is intentionally NOT here — it's bundled into the signup flow as a
 * "you're already on it" affordance, not a tier you select.
 */
export const PLANS_ORDERED: PlanDefinition[] = [
  PLANS.solo,
  PLANS.practice,
  PLANS.firm,
];

/**
 * Look up a plan from a Stripe price ID. Used by the webhook to
 * translate Stripe events into Practiq plan-tier updates. Handles
 * both standard prices AND the Practice founding price (both map
 * to "practice").
 */
export function planFromPriceId(stripePriceId: string): PlanKey | null {
  for (const plan of PLANS_ORDERED) {
    if (plan.stripePriceId === stripePriceId) return plan.key;
    if (plan.stripePriceIdFounding === stripePriceId) return plan.key;
    if (plan.stripePriceIdExtraSeat === stripePriceId) return plan.key;
  }
  return null;
}

/**
 * Returns whether a Stripe price ID is the founding-member discounted
 * variant. Used by the webhook to mark the Subscription with the
 * founding flag so we can surface "you're a Founding Member" in UI
 * and ensure the user keeps the discount on plan changes.
 */
export function isFoundingPriceId(stripePriceId: string): boolean {
  for (const plan of PLANS_ORDERED) {
    if (plan.stripePriceIdFounding === stripePriceId) return true;
  }
  return false;
}

/**
 * Client-access ceiling for a plan key. Returns null for "unlimited".
 */
export function clientCeiling(plan: PlanKey): number | null {
  if (plan === "free") return FREE_TRIAL.includedClients;
  const p = PLANS[plan];
  return p.includedClients === 0 ? null : p.includedClients;
}

/**
 * Monthly chat-message cap for a plan. Returns null for unlimited.
 * Enforced in /api/chat against UsageEvent rows since current period
 * start.
 */
export function chatMessageCap(plan: PlanKey): number | null {
  if (plan === "free") return FREE_TRIAL.monthlyChatMessages;
  const p = PLANS[plan];
  return p.monthlyChatMessages === 0 ? null : p.monthlyChatMessages;
}

/**
 * Inclusive monthly token allowance (input + output, summed across all
 * agent / chat / artifact callers). Returns 0 for "free" — trial users
 * are gated by the trial-window total, not a monthly allowance. Returns
 * null for unlimited (no plan currently uses this).
 */
export function tokenAllowance(plan: PlanKey): number {
  if (plan === "free") return FREE_TRIAL.monthlyIncludedTokens;
  return PLANS[plan].monthlyIncludedTokens;
}

/**
 * USD per 1K tokens charged once a paid user crosses their inclusive
 * allowance. 0 means no overage allowed (the budget enforcer will
 * return 402 instead of letting the call through).
 */
export function overageUsdPer1k(plan: PlanKey): number {
  if (plan === "free") return FREE_TRIAL.overageUsdPer1k;
  return PLANS[plan].overageUsdPer1k;
}

/**
 * Stripe metered overage price ID for a plan. null = the operator
 * hasn't created the metered price in the Stripe dashboard yet, in
 * which case overage cannot bill and the budget enforcer will
 * fall through to a hard cut-off even when the subscription has
 * `overageEnabled=true`.
 */
export function overagePriceId(plan: PlanKey): string | null {
  if (plan === "free") return null;
  return PLANS[plan].stripePriceIdOverage ?? null;
}

/**
 * Seat cap for a plan (base seats; Stripe quantity carries any
 * add-on seats). Used by /api/team/invites to gate invite creation.
 */
export function seatCap(plan: PlanKey, subscriptionSeatCount: number = 0): number {
  if (plan === "free") return FREE_TRIAL.includedSeats;
  const p = PLANS[plan];
  // Stripe-side seatCount overrides the included-seat default once
  // the subscription has been created (i.e. user is paying for
  // add-on seats). Fall back to the plan default for the trial /
  // pre-checkout state.
  return Math.max(p.includedSeats, subscriptionSeatCount);
}

export interface PlanCapabilities {
  backgroundAgent: boolean;
  teamRouting: boolean;
  rbac: boolean;
  whiteGlove: boolean;
}

export function capabilitiesForPlan(plan: PlanKey): PlanCapabilities {
  if (plan === "free") {
    return {
      backgroundAgent: FREE_TRIAL.backgroundAgent,
      teamRouting: FREE_TRIAL.teamRouting,
      rbac: FREE_TRIAL.rbac,
      whiteGlove: FREE_TRIAL.whiteGlove,
    };
  }
  const p = PLANS[plan];
  return {
    backgroundAgent: p.backgroundAgent,
    teamRouting: p.teamRouting,
    rbac: p.rbac,
    whiteGlove: p.whiteGlove,
  };
}
