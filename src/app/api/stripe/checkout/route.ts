import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe, isStripeConfigured } from "@/lib/stripe/client";
import { PLANS, type PlanKey, isFoundingPriceId, overagePriceId } from "@/lib/stripe/plans";
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

export const runtime = "nodejs";

/**
 * POST /api/stripe/checkout
 *
 * Body: { plan: "starter" | "team" | "pro" }
 *
 * Creates a Stripe Checkout session in subscription mode and returns
 * the session URL for the client to redirect to. Creates or reuses a
 * Stripe Customer per user so subscriptions accumulate against the
 * same customer record (clean for the customer portal later).
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

  // 10 checkout sessions/hour/user — legitimate users rarely create
  // more than 2-3 during a sign-up or plan-switch flurry.
  const rl = await checkRateLimit({
    namespace: "stripe/checkout",
    identity: identityFromRequest(request, session.user.id),
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.allowed) return rateLimitResponse(rl);

  const body = (await request.json().catch(() => null)) as
    | { plan?: string; founding?: boolean }
    | null;
  const plan = body?.plan as PlanKey | undefined;
  // Free tier doesn't go through Stripe — it's the trial state, not
  // a purchasable plan. Reject explicitly for clearer error messaging.
  if (!plan || plan === "free" || !(plan in PLANS)) {
    return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
  }
  const planDef = PLANS[plan as Exclude<PlanKey, "free">];
  // Founding member flow — only valid on Practice. The atomic claim
  // happens AFTER we've confirmed the user can purchase + AFTER we've
  // created the Stripe Checkout session, so the FoundingClaim row
  // can be keyed on the real Stripe session id. If the cohort is
  // already full or the race is lost, we fall back to standard pricing.
  //
  // The pre-Round-4 design incremented FoundingSlot.claimedCount on
  // every CTA click regardless of whether checkout completed, which
  // meant abandoned + expired sessions silently consumed cohort
  // slots. The audit on 2026-04-29 found 4 leaked slots from E2E
  // runs alone. The new flow keeps the atomic claim but ALSO writes
  // a FoundingClaim ledger row so a daily cron can reconcile against
  // Stripe and release stale claims. See src/lib/stripe/founding-slot.ts.
  const wantsFounding =
    body?.founding === true &&
    plan === "practice" &&
    Boolean(planDef.stripePriceIdFounding);
  let priceId: string | null = planDef.stripePriceId;
  let isFoundingClaim = false;
  if (wantsFounding) {
    // Snapshot read first to skip the increment when we know the
    // cohort is full (avoids touching the row at all in the steady
    // state once we hit cap).
    const snap = await prisma.foundingSlot.findUnique({
      where: { id: "singleton" },
      select: { claimedCount: true, cap: true },
    });
    if (!snap || snap.claimedCount < snap.cap) {
      // We commit the founding price now and write the ledger row
      // after Stripe.checkout.sessions.create succeeds (so the
      // ledger row carries the real session id).
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

  const stripe = getStripe();

  // We used to eagerly create a Stripe Customer here and pass
  // `customer: customerId` to checkout. Switched to `customer_email`
  // (below) so the hosted page can prefill the email field — Stripe
  // rejects both fields together. Checkout auto-creates the Customer
  // on completion; the webhook back-fills `User.stripeCustomerId` so
  // the Customer Portal still works for plan switches.
  const origin =
    request.headers.get("origin") ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://practiq.dev";

  // Round 12 (L4): when the operator has configured a metered overage
  // price for this plan in the Stripe dashboard, attach it as a second
  // line item so the new Subscription has a `subscription.items` row
  // for usage-based overage. Without this attachment, even a plan
  // marked `overageEnabled=true` would fail at recordOverageUsage time
  // because there's no metered subscription item to bill against. We
  // skip silently when the operator hasn't created the metered price
  // yet (PLANS[plan].stripePriceIdOverage is null) — the assertBudget
  // path falls through to a hard cut-off in that state, which is the
  // safe default.
  const overagePrice = overagePriceId(plan);
  const lineItems: Array<{ price: string; quantity?: number }> = [
    { price: priceId, quantity: 1 },
  ];
  if (overagePrice) {
    // Metered prices use Stripe's billing meter — quantity is omitted
    // (Stripe rejects `quantity` on metered line items) and usage is
    // emitted later via `stripe.billing.meterEvents.create` in
    // recordOverageUsage when the user spends past the included
    // allowance. The webhook handler then captures this line item's
    // `subscription.items[].id` into `Subscription.stripeOverageItemId`
    // for fast lookup.
    lineItems.push({ price: overagePrice });
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    // Stripe rejects `customer` + `customer_email` simultaneously. We
    // prefill the email so users don't have to re-type it on the
    // hosted page (one less friction step at the most expensive part
    // of the funnel). The webhook still attaches the resulting
    // subscription back to our existing Customer via client_reference_id
    // → user → stripeCustomerId, so the Customer Portal continues to
    // work for repeat plan switches.
    customer_email: user.email,
    line_items: lineItems,
    // Trial-period logic can be added here later; leave unset for now
    // so the first bill charges immediately (less ambiguity during dev).
    // success_url must point at a real route — `/settings/billing` was a
    // 404 because the actual settings page lives at /app/settings.
    // Send the session_id so the page can poll the webhook completion
    // before flipping UI to "paid" state.
    success_url: `${origin}/app/settings?tab=billing&checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/pricing?checkout=canceled`,
    allow_promotion_codes: true,
    billing_address_collection: "required",
    client_reference_id: user.id,
    subscription_data: {
      metadata: {
        practiqUserId: user.id,
        plan,
        is_founding: isFoundingClaim ? "true" : "false",
      },
    },
    metadata: {
      practiqUserId: user.id,
      plan,
      is_founding: isFoundingClaim ? "true" : "false",
    },
  });

  if (!checkoutSession.url) {
    return NextResponse.json(
      { error: "Stripe did not return a checkout URL" },
      { status: 502 },
    );
  }

  // Founding-claim ledger: now that we have a real Stripe session id,
  // atomically increment the cohort counter AND insert a pending
  // FoundingClaim row keyed on session.id. If the increment loses
  // its race against another concurrent claim, claimSlot rolls back
  // and we transparently swap to the standard price by re-creating
  // the session with the regular price id. (In practice this race
  // only matters in the very last 1-2 cohort slots — for now we
  // just downgrade silently and surface a Slack alert from the cron.)
  if (isFoundingClaim) {
    const result = await claimSlot({
      userId: user.id,
      stripeSessionId: checkoutSession.id,
    });
    if (!result.claimed) {
      // Race-lost. The Stripe session was created with the founding
      // price; cancel it and tell the client to retry. The standard
      // price is one click away (same plan, just without the
      // `founding: true` flag).
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

  // PostHog event — capturing intent before redirect to Stripe so we
  // see the funnel step regardless of whether the user completes
  // payment. The matching `checkout_completed` is fired from the
  // Stripe webhook (post-payment).
  trackServerEvent(user.id, "checkout_initiated", {
    plan,
    isFoundingMember: isFoundingPriceId(priceId),
    // Stripe session id stitches the pre-redirect intent event with
    // the post-payment `checkout_completed` event from the webhook,
    // so the analytics dashboard can compute true intent → payment
    // conversion rather than just counting both ends independently.
    stripeSessionId: checkoutSession.id,
  });
  await flushServerEvents();

  return NextResponse.json({ url: checkoutSession.url });
}
