/**
 * Pricing plan registry — single source of truth.
 *
 * 2026-05-14 — Stage 1 of per-client pricing rollout.
 * ─────────────────────────────────────────────────────
 * The operator locked a decision to shift from per-seat to per-client
 * pricing. This file now exports `PRICING_TIERS` as the new public-
 * facing model. The legacy `PlanDefinition` / `PLANS` exports are
 * preserved as DEPRECATED so the existing Stripe checkout webhook +
 * budget enforcement code paths keep compiling until Stage 3 migrates
 * the consumers (api/stripe/checkout, api/stripe/webhook, lib/token-
 * budget, app/settings billing UI).
 *
 * NEW (per-client) model — Stage 1 display only:
 *   Free trial         — first 3 clients × 14 days (no Stripe price)
 *   Founding member    — $10/client/month, locked for life (first 50 firms)
 *   Standard           — $15/client/month, every firm thereafter
 *
 *   Each client includes 500K tokens/month (input + output combined).
 *   Top-up credits: $10 = 1M tokens, pooled firm-wide across all clients.
 *
 * Stripe price IDs intentionally null on PRICING_TIERS — operator will
 * reconfigure products in the Stripe dashboard during Stage 3.
 *
 * ─────────────────────────────────────────────────────
 * DEPRECATED — old per-seat model, kept temporarily so checkout +
 * webhook + budget enforcer keep compiling. DO NOT consume these in
 * new code:
 *
 *   Demo (anonymous)  $0   / 5K tokens / IP / day  → hard cut-off, sign-up CTA
 *   Trial (logged in) $0   / 200K total / 14d      → hard cut-off, upgrade CTA
 *   Solo              $49  / 2M tokens / mo        → $0.012 / 1K overage
 *   Practice          $149 / 10M tokens / mo       → $0.012 / 1K overage
 *   Firm              $399 / 50M tokens / mo       → $0.010 / 1K overage
 */

export type PricingModel = "per_client_v1";

export interface PricingTier {
  key: "trial" | "founding" | "standard";
  publicName: string;
  tagline: string;
  /** USD per client per month. 0 = trial (no charge). */
  pricePerClientUsd: number;
  /** Tokens included per client per month (input + output combined). */
  tokensPerClientPerMonth: number;
  /** USD per credit pack (top-up). */
  topupCreditPriceUsd: number;
  /** Tokens granted per credit pack, pooled firm-wide. */
  topupCreditTokens: number;
  /** Free trial client allowance (only set on the "trial" tier). */
  freeTrialClients: number;
  /** Free trial duration in days (only set on the "trial" tier). */
  freeTrialDays: number;
  /** True for founding-member lock-in. */
  isFoundingMember?: boolean;
  /** Total founding slots available (50). */
  foundingSlotsTotal?: number;
  features: string[];
  ctaLabel: string;
  /** Stripe price ID for the per-client metered subscription. */
  stripePriceIdClient: string | null;
  /** Stripe price ID for the credit-pack top-up product. */
  stripePriceIdCredits: string | null;
}

export const PRICING_MODEL: PricingModel = "per_client_v1";

/**
 * Universal per-client constants — apply to both founding + standard.
 * Single source of truth for the marketing copy and the example math
 * tables on /pricing.
 */
export const PER_CLIENT_PRICING = {
  tokensPerClientPerMonth: 500_000,
  topupCreditPriceUsd: 10,
  topupCreditTokens: 1_000_000,
  freeTrialClients: 3,
  freeTrialDays: 14,
  foundingSlotsTotal: 50,
  standardPricePerClientUsd: 15,
  foundingPricePerClientUsd: 10,
} as const;

export const PRICING_TIERS: Record<PricingTier["key"], PricingTier> = {
  trial: {
    key: "trial",
    publicName: "Free trial",
    tagline: "Try Practiq with 3 clients for 14 days. No card required.",
    pricePerClientUsd: 0,
    tokensPerClientPerMonth: PER_CLIENT_PRICING.tokensPerClientPerMonth,
    topupCreditPriceUsd: PER_CLIENT_PRICING.topupCreditPriceUsd,
    topupCreditTokens: PER_CLIENT_PRICING.topupCreditTokens,
    freeTrialClients: PER_CLIENT_PRICING.freeTrialClients,
    freeTrialDays: PER_CLIENT_PRICING.freeTrialDays,
    features: [
      "3 client workspaces · 14 days",
      "500K tokens included per client",
      "Full agent stack — no feature gating",
      "Unlimited team seats",
      "Export your data anytime",
      "No credit card required",
    ],
    ctaLabel: "Start free trial",
    stripePriceIdClient: null,
    stripePriceIdCredits: null,
  },
  founding: {
    key: "founding",
    publicName: "Founding member",
    tagline:
      "First 50 firms lock in $10/client/month — for life. Pay-per-client, no seat fees, full feature access.",
    pricePerClientUsd: PER_CLIENT_PRICING.foundingPricePerClientUsd,
    tokensPerClientPerMonth: PER_CLIENT_PRICING.tokensPerClientPerMonth,
    topupCreditPriceUsd: PER_CLIENT_PRICING.topupCreditPriceUsd,
    topupCreditTokens: PER_CLIENT_PRICING.topupCreditTokens,
    freeTrialClients: PER_CLIENT_PRICING.freeTrialClients,
    freeTrialDays: PER_CLIENT_PRICING.freeTrialDays,
    isFoundingMember: true,
    foundingSlotsTotal: PER_CLIENT_PRICING.foundingSlotsTotal,
    features: [
      "$10/client/month — locked for life",
      "500K tokens included per client",
      "$10 = 1M tokens top-up (firm-wide pool)",
      "Unlimited team seats",
      "Full feature access — agent stack, RBAC, exports",
      "Direct line to founders for product feedback",
      "Cancel anytime · export your data",
    ],
    ctaLabel: "Request founding member access",
    stripePriceIdClient: null,
    stripePriceIdCredits: null,
  },
  standard: {
    key: "standard",
    publicName: "Standard",
    tagline:
      "Pay for the clients you serve. $15/client/month, no seat limits, no annual contract.",
    pricePerClientUsd: PER_CLIENT_PRICING.standardPricePerClientUsd,
    tokensPerClientPerMonth: PER_CLIENT_PRICING.tokensPerClientPerMonth,
    topupCreditPriceUsd: PER_CLIENT_PRICING.topupCreditPriceUsd,
    topupCreditTokens: PER_CLIENT_PRICING.topupCreditTokens,
    freeTrialClients: PER_CLIENT_PRICING.freeTrialClients,
    freeTrialDays: PER_CLIENT_PRICING.freeTrialDays,
    features: [
      "$15/client/month — linear scaling",
      "500K tokens included per client",
      "$10 = 1M tokens top-up (firm-wide pool)",
      "Unlimited team seats",
      "Full feature access — agent stack, RBAC, exports",
      "14-day free trial · 3 clients",
      "Cancel anytime · export your data",
    ],
    ctaLabel: "Request access",
    stripePriceIdClient: null,
    stripePriceIdCredits: null,
  },
};

/**
 * Example monthly cost table — drives the "do the math" section on
 * /pricing. Keep the entries in display order. Numbers derive from
 * PER_CLIENT_PRICING.* so editing one constant updates every surface.
 */
export const PRICING_EXAMPLES: ReadonlyArray<{
  label: string;
  clients: number;
  standardMonthlyUsd: number;
  foundingMonthlyUsd: number;
}> = [
  { label: "Solo, 10 clients", clients: 10 },
  { label: "5-person firm, 50 clients", clients: 50 },
  { label: "Boutique, 100 clients", clients: 100 },
  { label: "Larger boutique, 200 clients", clients: 200 },
].map((row) => ({
  ...row,
  standardMonthlyUsd: row.clients * PER_CLIENT_PRICING.standardPricePerClientUsd,
  foundingMonthlyUsd: row.clients * PER_CLIENT_PRICING.foundingPricePerClientUsd,
}));

// ─────────────────────────────────────────────────────────────────────
// DEPRECATED — legacy per-seat plan registry. Preserved so existing
// checkout / webhook / budget code keeps compiling until Stage 3 of
// the per-client migration. Do NOT consume in new code. All call sites
// will be replaced when the Stripe products are reconfigured.
// ─────────────────────────────────────────────────────────────────────

/** @deprecated Use PricingTier instead. Removed in Stage 3 rewrite. */
export type PlanKey = "free" | "solo" | "practice" | "firm";

/**
 * Resolve Stripe price IDs from env. Missing vars return null so the
 * UI can show "Contact sales" or disable the CTA cleanly.
 */
function priceId(envVar: string): string | null {
  const v = process.env[envVar];
  return v && v.trim().length > 0 ? v.trim() : null;
}

/** @deprecated Per-seat schema. Use PricingTier. Removed in Stage 3. */
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
/** @deprecated Per-seat trial. Use PRICING_TIERS.trial. Removed in Stage 3. */
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
 * Demo zone throttle constants — relocated to `src/lib/limits/demo.ts`
 * in Stage 3a (2026-05-15) so the demo throttle no longer depends on
 * the legacy per-seat PLANS registry. The re-export below keeps the
 * `@/lib/stripe/plans` import stable for downstream code; we move
 * direct consumers (`token-budget.ts`, `/api/demo/chat/route.ts`) onto
 * the new path in Stage 3d.
 */
export { DEMO_ZONE } from "@/lib/limits/demo";

/** @deprecated Per-seat plan registry. Use PRICING_TIERS. Removed in Stage 3. */
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
