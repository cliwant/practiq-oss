import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe, isStripeConfigured } from "@/lib/stripe/client";
import {
  PRICING_TIERS,
  PER_CLIENT_PRICING,
  isFoundingClientPriceId,
  // Legacy helpers kept for one cycle — Stage 3f deletes the call sites
  // along with the deprecated PLANS / PlanKey registry.
  PLANS,
  type PlanKey,
  isFoundingPriceId,
  overagePriceId,
} from "@/lib/stripe/plans";
import { claimSlot } from "@/lib/stripe/founding-slot";
import {
  checkRateLimit,
  identityFromRequest,
  rateLimitResponse,
} from "@/lib/rate-limit";
import {
  trackServerEvent,
  flushServerEvents,
} from "@/lib/analytics/posthog-server";
import { reportUserError } from "@/lib/notifications/user-error";

export const runtime = "nodejs";

// ─── Request body discriminator (Stage 3c, 2026-05-16) ───────────────
//
// The new per-client pricing model exposes two checkout flows:
//
//   subscription — recurring per-client price, quantity = clientCount.
//                  The single-item line replaces the legacy multi-item
//                  (per-seat + metered overage) shape.
//   credit_pack  — one-time charge for $10 = 1M-token credit packs,
//                  firm-wide shared pool. Routed to handleCreditPackCompleted
//                  in the webhook via session.metadata.flow.
//
// The legacy shape { plan: "solo"|"practice"|"firm", founding?: boolean }
// is still accepted for one cycle so the existing signup founding-flow
// in src/app/(auth)/signup/page.tsx keeps working until 3f cleanup.
// New code should send the discriminated `mode` shape.
type CheckoutBody =
  | { mode: "subscription"; founding?: boolean }
  | { mode: "credit_pack"; quantity: number }
  // Legacy — kept until Stage 3f deletes the deprecated PLANS registry.
  | { plan?: string; founding?: boolean; mode?: undefined };

/**
 * POST /api/stripe/checkout
 *
 * Two modes:
 *
 *   { mode: "subscription", founding?: boolean }
 *     → Creates a recurring subscription with the per-client price
 *       (founding $10 if `founding=true` and slot available, else
 *       standard $15). Quantity is read from Subscription.clientCount
 *       or defaults to PER_CLIENT_PRICING.freeTrialClients (3) for
 *       initial subscribe.
 *
 *   { mode: "credit_pack", quantity }
 *     → Creates a one-time payment-mode session for `quantity` packs
 *       of $10/1M-tokens credits. The webhook's
 *       handleCreditPackCompleted inserts a Credit row keyed on the
 *       payment_intent_id (idempotent on webhook replay).
 *
 *   { plan: "solo"|"practice"|"firm", founding?: boolean }
 *     → Legacy per-seat path. Preserved one cycle so signup's
 *       founding-flow still works. 3f deletes.
 *
 * Both new modes preserve the FoundingClaim ledger flow.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isStripeConfigured()) {
    return NextResponse.json(
      {
        error:
          "Billing is not configured yet. Contact support to reserve a plan.",
      },
      { status: 503 },
    );
  }

  // Stable step identifier for reportUserError dedupe.
  let step = "init";
  try {
    // 10 checkout sessions/hour/user — legitimate users rarely create
    // more than 2-3 during a sign-up or plan-switch flurry.
    const rl = await checkRateLimit({
      namespace: "stripe/checkout",
      identity: identityFromRequest(request, session.user.id),
      limit: 10,
      windowMs: 60 * 60 * 1000,
    });
    if (!rl.allowed) return rateLimitResponse(rl);

    const body = (await request.json().catch(() => null)) as CheckoutBody | null;
    if (!body) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        stripeCustomerId: true,
      },
    });
    if (!user) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const origin =
      request.headers.get("origin") ??
      process.env.NEXT_PUBLIC_SITE_URL ??
      "https://practiq.dev";

    // Dispatch by body shape. The new modes win when explicit;
    // legacy `{ plan: ... }` falls through to the per-seat path.
    if (body.mode === "subscription") {
      step = "subscription-checkout";
      return await handleSubscriptionMode({
        body,
        user,
        origin,
      });
    }
    if (body.mode === "credit_pack") {
      step = "credit-pack-checkout";
      return await handleCreditPackMode({
        body,
        user,
        origin,
      });
    }

    // Legacy per-seat path (Stage 3f will delete).
    step = "legacy-plan-checkout";
    return await handleLegacyPlanMode({
      body,
      user,
      origin,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorStack = err instanceof Error ? err.stack : undefined;
    void reportUserError({
      surface: "stripe-checkout",
      endpoint: "POST /api/stripe/checkout",
      status: 500,
      errorMessage,
      errorStack,
      stepIfApplicable: step,
      userContext: {
        email: session.user.email,
        distinctId: session.user.id,
      },
    });
    return NextResponse.json(
      { error: "Couldn't start checkout. Our team has been notified." },
      { status: 500 },
    );
  }
}

// ─── Subscription mode (per-client, Stage 3c) ────────────────────────

/**
 * New per-client subscription checkout. Single line item with
 * `quantity = clientCount`. Trial conversion does NOT pass
 * `trial_period_days` because the trial was consumed outside Stripe
 * (per D3 in .cycle/plans/stage-3-per-client-billing.md).
 */
async function handleSubscriptionMode(opts: {
  body: { mode: "subscription"; founding?: boolean };
  user: { id: string; email: string; name: string | null; stripeCustomerId: string | null };
  origin: string;
}): Promise<NextResponse> {
  const { body, user, origin } = opts;

  // Determine the price. Founding flag now applies to ANY subscription
  // (not just legacy Practice). Atomic slot claim happens AFTER session
  // creation so the FoundingClaim row carries the real session id.
  const standardPriceId = PRICING_TIERS.standard.stripePriceIdClient;
  const foundingPriceId = PRICING_TIERS.founding.stripePriceIdClient;

  if (!standardPriceId) {
    return NextResponse.json(
      {
        error:
          "Per-client pricing is not configured yet. The operator must " +
          "set STRIPE_PRICE_PER_CLIENT_STANDARD in the Stripe dashboard.",
      },
      { status: 503 },
    );
  }

  let priceId: string = standardPriceId;
  let isFoundingClaim = false;
  if (body.founding === true && foundingPriceId) {
    // Snapshot read first to skip the increment when the cohort is full.
    const snap = await prisma.foundingSlot.findUnique({
      where: { id: "singleton" },
      select: { claimedCount: true, cap: true },
    });
    if (!snap || snap.claimedCount < snap.cap) {
      priceId = foundingPriceId;
      isFoundingClaim = true;
    }
  }

  // Quantity defaults to the trial-cap (3 clients) for first-time
  // subscribers. Existing subs override via Subscription.clientCount.
  const existingSub = await prisma.subscription.findUnique({
    where: { userId: user.id },
    select: { clientCount: true, status: true },
  });
  const quantity =
    existingSub && existingSub.clientCount > 0
      ? existingSub.clientCount
      : PER_CLIENT_PRICING.freeTrialClients;

  const stripe = getStripe();
  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: user.email,
    line_items: [{ price: priceId, quantity }],
    // Founding-claim sessions land on /welcome (the SSR welcome page
    // owns the 4-step onboarding for first-time founding signups).
    success_url: isFoundingClaim
      ? `${origin}/welcome?session_id={CHECKOUT_SESSION_ID}`
      : `${origin}/app/settings?tab=billing&checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/pricing?checkout=canceled&session_id={CHECKOUT_SESSION_ID}`,
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    automatic_tax: { enabled: true },
    client_reference_id: user.id,
    subscription_data: {
      metadata: {
        practiqUserId: user.id,
        flow: "subscription",
        tier: isFoundingClaim ? "founding" : "standard",
        is_founding: isFoundingClaim ? "true" : "false",
        initial_client_count: String(quantity),
      },
    },
    metadata: {
      practiqUserId: user.id,
      flow: "subscription",
      tier: isFoundingClaim ? "founding" : "standard",
      is_founding: isFoundingClaim ? "true" : "false",
      initial_client_count: String(quantity),
    },
  });

  if (!checkoutSession.url) {
    return NextResponse.json(
      { error: "Stripe did not return a checkout URL" },
      { status: 502 },
    );
  }

  // Founding-claim ledger: now that the Stripe session exists, atomically
  // increment cohort counter + insert a pending FoundingClaim row keyed
  // on session.id. Race-lost path expires the session and asks the client
  // to retry with the standard price (one click away).
  if (isFoundingClaim) {
    const result = await claimSlot({
      userId: user.id,
      stripeSessionId: checkoutSession.id,
    });
    if (!result.claimed) {
      await stripe.checkout.sessions
        .expire(checkoutSession.id)
        .catch(() => {});
      return NextResponse.json(
        {
          error:
            "Founding cohort just filled. Refresh the page to take the standard plan, " +
            "or contact us if you'd like a hand.",
        },
        { status: 409 },
      );
    }
  }

  trackServerEvent(user.id, "checkout_initiated", {
    flow: "subscription",
    tier: isFoundingClaim ? "founding" : "standard",
    clientCount: quantity,
    isFoundingMember: isFoundingClientPriceId(priceId),
    stripeSessionId: checkoutSession.id,
  });
  await flushServerEvents();

  return NextResponse.json({ url: checkoutSession.url });
}

// ─── Credit pack mode (one-time, Stage 3c) ───────────────────────────

/**
 * Credit pack checkout. mode='payment', single line item with the
 * $10/1M-tokens credit-pack price and `quantity` packs. Webhook
 * routes the completion event to handleCreditPackCompleted via
 * session.metadata.flow='credit_pack'.
 *
 * D8 enforcement: trial users (no active Subscription) cannot buy
 * credit packs. They're routed to the founding-member CTA instead
 * because if they're considering top-up, they're in conversion
 * territory.
 */
async function handleCreditPackMode(opts: {
  body: { mode: "credit_pack"; quantity: number };
  user: { id: string; email: string; name: string | null; stripeCustomerId: string | null };
  origin: string;
}): Promise<NextResponse> {
  const { body, user, origin } = opts;

  if (typeof body.quantity !== "number" || body.quantity <= 0 || body.quantity > 100) {
    return NextResponse.json(
      { error: "quantity must be a positive integer between 1 and 100" },
      { status: 400 },
    );
  }

  const creditPriceId = PRICING_TIERS.standard.stripePriceIdCredits;
  if (!creditPriceId) {
    return NextResponse.json(
      {
        error:
          "Credit packs are not configured yet. The operator must set " +
          "STRIPE_PRICE_CREDIT_PACK_1M in the Stripe dashboard.",
      },
      { status: 503 },
    );
  }

  // D8: trial users hit conversion CTA, not top-up.
  const activeSub = await prisma.subscription.findUnique({
    where: { userId: user.id },
    select: { status: true, tier: true },
  });
  const isPaidSubscriber =
    activeSub &&
    (activeSub.status === "active" || activeSub.status === "trialing");
  if (!isPaidSubscriber) {
    return NextResponse.json(
      {
        error:
          "Credit packs are available to paying subscribers. Start a per-client " +
          "subscription first — credits work on top of your monthly allowance.",
        upgradeUrl: "/pricing",
      },
      { status: 402 },
    );
  }

  const stripe = getStripe();
  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: user.email,
    line_items: [{ price: creditPriceId, quantity: body.quantity }],
    payment_method_collection: "always",
    success_url: `${origin}/app/settings?tab=billing&credit=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/app/settings?tab=billing&credit=canceled`,
    automatic_tax: { enabled: true },
    billing_address_collection: "auto",
    client_reference_id: user.id,
    metadata: {
      practiqUserId: user.id,
      flow: "credit_pack",
      quantity: String(body.quantity),
      // Stuff the price ID into metadata so the webhook doesn't need
      // an `expand: ['line_items']` round-trip to look it up.
      stripePriceId: creditPriceId,
    },
  });

  if (!checkoutSession.url) {
    return NextResponse.json(
      { error: "Stripe did not return a checkout URL" },
      { status: 502 },
    );
  }

  trackServerEvent(user.id, "checkout_initiated", {
    flow: "credit_pack",
    quantity: body.quantity,
    tokensGranted: body.quantity * PER_CLIENT_PRICING.topupCreditTokens,
    amountUsd: body.quantity * PER_CLIENT_PRICING.topupCreditPriceUsd,
    stripeSessionId: checkoutSession.id,
  });
  await flushServerEvents();

  return NextResponse.json({ url: checkoutSession.url });
}

// ─── Legacy per-seat mode (Stage 3f deletes) ─────────────────────────

/**
 * @deprecated Legacy per-seat checkout. Preserved one cycle so the
 * existing signup founding-flow keeps working until callers are
 * migrated to the new `mode: 'subscription', founding: true` shape.
 * Stage 3f deletes this function along with the PLANS registry.
 */
async function handleLegacyPlanMode(opts: {
  body: { plan?: string; founding?: boolean };
  user: { id: string; email: string; name: string | null; stripeCustomerId: string | null };
  origin: string;
}): Promise<NextResponse> {
  const { body, user, origin } = opts;
  const plan = body?.plan as PlanKey | undefined;
  if (!plan || plan === "free" || !(plan in PLANS)) {
    return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
  }
  const planDef = PLANS[plan as Exclude<PlanKey, "free">];
  const wantsFounding =
    body?.founding === true &&
    plan === "practice" &&
    Boolean(planDef.stripePriceIdFounding);
  let priceId: string | null = planDef.stripePriceId;
  let isFoundingClaim = false;
  if (wantsFounding) {
    const snap = await prisma.foundingSlot.findUnique({
      where: { id: "singleton" },
      select: { claimedCount: true, cap: true },
    });
    if (!snap || snap.claimedCount < snap.cap) {
      priceId = planDef.stripePriceIdFounding!;
      isFoundingClaim = true;
    }
  }
  if (!priceId) {
    return NextResponse.json(
      { error: "That plan is not purchasable yet. Contact sales." },
      { status: 400 },
    );
  }

  const stripe = getStripe();

  const overagePrice = overagePriceId(plan);
  const lineItems: Array<{ price: string; quantity?: number }> = [
    { price: priceId, quantity: 1 },
  ];
  if (overagePrice) {
    lineItems.push({ price: overagePrice });
  }

  const trialEligible = plan === "solo";
  const trialPeriodDays = trialEligible ? 14 : undefined;

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: user.email,
    line_items: lineItems,
    success_url: isFoundingClaim
      ? `${origin}/welcome?session_id={CHECKOUT_SESSION_ID}`
      : `${origin}/app/settings?tab=billing&checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/pricing?checkout=canceled&session_id={CHECKOUT_SESSION_ID}`,
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    automatic_tax: { enabled: true },
    ...(trialEligible
      ? { payment_method_collection: "if_required" as const }
      : {}),
    client_reference_id: user.id,
    subscription_data: {
      ...(trialPeriodDays ? { trial_period_days: trialPeriodDays } : {}),
      metadata: {
        practiqUserId: user.id,
        plan,
        flow: "subscription_legacy",
        is_founding: isFoundingClaim ? "true" : "false",
        trial_period_days: trialPeriodDays ? String(trialPeriodDays) : "0",
      },
    },
    metadata: {
      practiqUserId: user.id,
      plan,
      flow: "subscription_legacy",
      is_founding: isFoundingClaim ? "true" : "false",
      trial_period_days: trialPeriodDays ? String(trialPeriodDays) : "0",
    },
  });

  if (!checkoutSession.url) {
    return NextResponse.json(
      { error: "Stripe did not return a checkout URL" },
      { status: 502 },
    );
  }

  if (isFoundingClaim) {
    const result = await claimSlot({
      userId: user.id,
      stripeSessionId: checkoutSession.id,
    });
    if (!result.claimed) {
      await stripe.checkout.sessions
        .expire(checkoutSession.id)
        .catch(() => {});
      return NextResponse.json(
        {
          error:
            "Founding cohort just filled. Refresh the page to take the standard plan, " +
            "or contact us if you'd like a hand.",
        },
        { status: 409 },
      );
    }
  }

  trackServerEvent(user.id, "checkout_initiated", {
    plan,
    flow: "subscription_legacy",
    isFoundingMember: isFoundingPriceId(priceId),
    stripeSessionId: checkoutSession.id,
  });
  await flushServerEvents();

  return NextResponse.json({ url: checkoutSession.url });
}

// Reference to Stripe type kept so the import is non-redundant even
// when only the legacy path uses it. Drops in 3f.
type _StripeSubscriptionRef = Stripe.Subscription;
