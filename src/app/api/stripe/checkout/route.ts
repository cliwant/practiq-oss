import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe, isStripeConfigured } from "@/lib/stripe/client";
import { PLANS, type PlanKey } from "@/lib/stripe/plans";

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

  const body = (await request.json().catch(() => null)) as { plan?: string } | null;
  const plan = body?.plan as PlanKey | undefined;
  if (!plan || !PLANS[plan]) {
    return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
  }
  const priceId = PLANS[plan].stripePriceId;
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
    success_url: `${origin}/settings/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/pricing?checkout=canceled`,
    allow_promotion_codes: true,
    billing_address_collection: "required",
    client_reference_id: user.id,
    subscription_data: {
      metadata: { practiqUserId: user.id, plan },
    },
    metadata: { practiqUserId: user.id, plan },
  });

  if (!checkoutSession.url) {
    return NextResponse.json(
      { error: "Stripe did not return a checkout URL" },
      { status: 502 },
    );
  }

  return NextResponse.json({ url: checkoutSession.url });
}
