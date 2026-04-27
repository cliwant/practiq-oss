/**
 * Pricing plan registry — single source of truth.
 *
 * The plans here back BOTH the public `/pricing` page AND the Stripe
 * checkout flow. Any drift between the two is a billing/legal risk
 * (customer sees one price, gets charged another), so this file is
 * the only place those numbers live. The pricing page imports from
 * here.
 *
 * Three plan tiers + one founding-member price discount:
 *
 *   Solo      $39 / mo  (1 seat,  30 clients,   500 chat msg/mo)
 *   Practice  $99 / mo  (5 seats, 100 clients,  2,000 chat msg/mo)
 *     ↳ Founding $49/mo (50 spots, lifetime 50% off Practice)
 *   Firm      $299 / mo (10 seats, 200 clients, 8,000 chat msg/mo)
 *
 * Cost model (per user/mo, OpenRouter Sonnet 4.5):
 *   chat 1 msg ≈ $0.012 · agent run 1 ≈ $0.05
 *   Solo cost ~ $14 (margin 64%)
 *   Practice cost ~ $49 (margin 50%)
 *   Founding cost ~ $49 (margin 0% — strategic loss leader, capped at 50 firms)
 *   Firm cost ~ $146 (margin 51%)
 *
 * Add-on seats (charged via Stripe metered-quantity on the same price):
 *   Practice extra seat: $19/mo  (cost ~$2 for marginal user)
 *   Firm extra seat:     $29/mo  (cost ~$3)
 *
 * Hard limits below the inclusive caps trigger the upgrade CTA;
 * we don't auto-overage-bill in cycle-1 (defer metered billing to
 * Phase-2 once we see real usage patterns).
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
 */
export const FREE_TRIAL: Pick<
  PlanDefinition,
  | "key"
  | "monthlyChatMessages"
  | "includedClients"
  | "includedSeats"
  | "backgroundAgent"
  | "teamRouting"
  | "rbac"
  | "whiteGlove"
> & { trialDurationDays: number } = {
  key: "free",
  monthlyChatMessages: 50,
  includedClients: 1,
  includedSeats: 1,
  backgroundAgent: false,
  teamRouting: false,
  rbac: false,
  whiteGlove: false,
  trialDurationDays: 14,
};

export const PLANS: Record<Exclude<PlanKey, "free">, PlanDefinition> = {
  solo: {
    key: "solo",
    publicName: "Solo",
    tagline: "For solo operators running the whole show.",
    monthlyPriceUsd: 39,
    stripePriceId: priceId("STRIPE_PRICE_SOLO"),
    includedClients: 30,
    includedSeats: 1,
    monthlyChatMessages: 500,
    backgroundAgent: true,
    teamRouting: false,
    rbac: false,
    whiteGlove: false,
    features: [
      "Up to 30 client workspaces",
      "Daily AI morning briefing on every client",
      "Unlimited document generation (.xlsx, .docx)",
      "Per-client tone-aware email drafting",
      "30 days of context memory per client",
      "500 AI chat messages / month",
      "Email support (24h response)",
      "1 seat",
    ],
  },
  practice: {
    key: "practice",
    publicName: "Practice",
    tagline: "For 2-5 person firms pushing past the context ceiling.",
    monthlyPriceUsd: 99,
    monthlyPriceFoundingUsd: 49,
    monthlyExtraSeatUsd: 19,
    stripePriceId: priceId("STRIPE_PRICE_PRACTICE"),
    stripePriceIdFounding: priceId("STRIPE_PRICE_PRACTICE_FOUNDING"),
    stripePriceIdExtraSeat: priceId("STRIPE_PRICE_PRACTICE_SEAT"),
    includedClients: 100,
    includedSeats: 5,
    monthlyChatMessages: 2000,
    backgroundAgent: true,
    teamRouting: true,
    rbac: true,
    whiteGlove: false,
    popular: true,
    features: [
      "Everything in Solo, plus:",
      "Up to 100 client workspaces",
      "Shared client memory across the team",
      "Approval Queue routing across teammates",
      "Role-based access per client (owner / member / viewer)",
      "Pattern learning from your team's decisions",
      "Unlimited context memory per client",
      "2,000 AI chat messages / month (pooled)",
      "5 seats included · $19 / extra seat / mo",
      "Priority email + live chat (4h response)",
    ],
  },
  firm: {
    key: "firm",
    publicName: "Firm",
    tagline: "For 6-10 person firms at 100-200 clients.",
    monthlyPriceUsd: 299,
    monthlyExtraSeatUsd: 29,
    stripePriceId: priceId("STRIPE_PRICE_FIRM"),
    stripePriceIdExtraSeat: priceId("STRIPE_PRICE_FIRM_SEAT"),
    includedClients: 200,
    includedSeats: 10,
    monthlyChatMessages: 8000,
    backgroundAgent: true,
    teamRouting: true,
    rbac: true,
    whiteGlove: true,
    features: [
      "Everything in Practice, plus:",
      "Up to 200 client workspaces",
      "Advanced role permissions + audit trail export",
      "Dedicated onboarding (2 hours 1:1)",
      "Custom integrations via API",
      "SOC 2 / compliance documentation",
      "Dedicated Slack channel for support",
      "Quarterly business review",
      "8,000 AI chat messages / month (pooled)",
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
