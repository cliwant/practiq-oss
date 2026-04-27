import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe, isStripeConfigured } from "@/lib/stripe/client";
import { PLANS, type PlanKey, isFoundingPriceId } from "@/lib/stripe/plans";
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
  // Founding member flow — only valid on Practice. Atomically claim a
  // slot from FoundingSlot (cap=50). If the slot pool is exhausted,
  // gracefully fall back to standard pricing instead of erroring out
  // (the user still gets to subscribe, just at $99 not $49).
  let priceId: string | null = planDef.stripePriceId;
  let isFoundingClaim = false;
  if (
    body?.founding === true &&
    plan === "practice" &&
    planDef.stripePriceIdFounding
  ) {
    const slot = await prisma.foundingSlot.findUnique({
      where: { id: "singleton" },
    });
    const cap = slot?.cap ?? 50;
    const claimed = slot?.claimedCount ?? 0;
    if (claimed < cap) {
      // Atomic increment — Postgres returns the updated row, so two
      // concurrent claims can't both pass the cap check.
      const updated = await prisma.foundingSlot.upsert({
        where: { id: "singleton" },
        create: { id: "singleton", claimedCount: 1, cap },
        update: { claimedCount: { increment: 1 } },
      });
      if (updated.claimedCount <= updated.cap) {
        priceId = planDef.stripePriceIdFounding;
        isFoundingClaim = true;
      } else {
        // Race lost — roll the increment back so the count stays
        // honest. Best-effort; if this fails the cap is exceeded
        // by 1 which is acceptable given the loss leader framing.
        await prisma.foundingSlot
          .update({
            where: { id: "singleton" },
            data: { claimedCount: { decrement: 1 } },
          })
          .catch(() => {});
      }
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

  // Create or reuse the Stripe Customer.
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name ?? undefined,
      metadata: { practiqUserId: user.id },
    });
    customerId = customer.id;
    await prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const origin =
    request.headers.get("origin") ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://practiq.dev";

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
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

  // PostHog event — capturing intent before redirect to Stripe so we
  // see the funnel step regardless of whether the user completes
  // payment. The matching `checkout_completed` is fired from the
  // Stripe webhook (post-payment).
  trackServerEvent(user.id, "checkout_initiated", {
    plan,
    isFoundingMember: isFoundingPriceId(priceId),
  });
  await flushServerEvents();

  return NextResponse.json({ url: checkoutSession.url });
}
