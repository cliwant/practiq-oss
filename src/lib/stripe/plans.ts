/**
 * Pricing plan registry — single source of truth for the plans that
 * show on /pricing, drive the checkout session, and gate features.
 *
 * Each plan has a Stripe price ID mapped per-environment. Prices are
 * set in the Stripe dashboard; we just reference them by env var so
 * dev/staging/prod can point at different Stripe accounts safely.
 *
 * Plans map to PRD Section 9.2 (Solo / Team / Professional), renamed
 * in public-facing copy to Starter / Team / Pro for clarity.
 */

export type PlanKey = "starter" | "team" | "pro";

export interface PlanDefinition {
  key: PlanKey;
  publicName: string;
  tagline: string;
  monthlyPriceUsd: number;
  stripePriceId: string | null; // null = checkout disabled for this plan
  features: string[];
  includedClients: number; // hard ceiling (0 = unlimited)
  includedSeats: number;
  popular?: boolean;
}

/**
 * Resolve Stripe price IDs from env. Missing vars return null so the
 * UI can show "Contact sales" or disable the CTA cleanly.
 */
function priceId(envVar: string): string | null {
  const v = process.env[envVar];
  return v && v.trim().length > 0 ? v.trim() : null;
}

export const PLANS: Record<PlanKey, PlanDefinition> = {
  starter: {
    key: "starter",
    publicName: "Starter",
    tagline: "Solo practitioner",
    monthlyPriceUsd: 99,
    stripePriceId: priceId("STRIPE_PRICE_STARTER"),
    includedClients: 50,
    includedSeats: 1,
    features: [
      "Up to 50 client workspaces",
      "Daily AI briefings across every client",
      "Client-scoped chat + knowledge base",
      "Activity timeline per client",
      "Unlimited artifact generation (.docx / .xlsx)",
      "1 seat",
    ],
  },
  team: {
    key: "team",
    publicName: "Team",
    tagline: "2–10 person boutique firm",
    monthlyPriceUsd: 499,
    stripePriceId: priceId("STRIPE_PRICE_TEAM"),
    includedClients: 200,
    includedSeats: 5,
    popular: true,
    features: [
      "Everything in Starter",
      "Up to 200 client workspaces",
      "Team collaboration — shared client memory",
      "Approval queue routing across teammates",
      "Role-based access per client",
      "5 seats (add more at $79/seat/mo)",
    ],
  },
  pro: {
    key: "pro",
    publicName: "Pro",
    tagline: "Multi-partner firm, 11+ people",
    monthlyPriceUsd: 999,
    stripePriceId: priceId("STRIPE_PRICE_PRO"),
    includedClients: 0,
    includedSeats: 10,
    features: [
      "Everything in Team",
      "Unlimited client workspaces",
      "Usage-based Claude rate limits (pooled)",
      "Priority support + Slack channel",
      "SSO via Microsoft Entra or LinkedIn",
      "10 seats (add more at $99/seat/mo)",
    ],
  },
};

export const PLANS_ORDERED: PlanDefinition[] = [
  PLANS.starter,
  PLANS.team,
  PLANS.pro,
];

/**
 * Look up a plan from a Stripe price ID. Used by the webhook to
 * translate Stripe events into Practiq plan-tier updates.
 */
export function planFromPriceId(priceId: string): PlanKey | null {
  for (const plan of PLANS_ORDERED) {
    if (plan.stripePriceId === priceId) return plan.key;
  }
  return null;
}

/**
 * Client-access ceiling for a plan key. Returns null for "unlimited".
 */
export function clientCeiling(plan: PlanKey): number | null {
  const p = PLANS[plan];
  return p.includedClients === 0 ? null : p.includedClients;
}
