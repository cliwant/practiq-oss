import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/client";
import { planFromPriceId, type PlanKey } from "@/lib/stripe/plans";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
// Subscription events batch occasionally — give ourselves headroom on
// Vercel (default 30s → 60s here, well within Hobby limits).
export const maxDuration = 60;

/**
 * POST /api/stripe/webhook
 *
 * Stripe → Practiq event sink. The webhook is the authoritative source
 * of subscription state: we never trust the client redirect alone.
 *
 * Events we handle:
 *   checkout.session.completed       — first signup
 *   customer.subscription.created    — subscription provisioned
 *   customer.subscription.updated    — plan change, trial end, card
 *                                      renewal, cancel-at-period-end flag
 *   customer.subscription.deleted    — hard cancellation
 *   invoice.paid                     — renewal succeeded
 *   invoice.payment_failed           — renewal failed (trigger email later)
 *
 * The handler is intentionally idempotent — every handler upserts the
 * Subscription row by stripeSubscriptionId so replaying events is safe.
 *
 * Signature verification uses the raw request body (not request.json())
 * per Stripe's requirement. Next.js 15 doesn't strip the raw body in
 * runtime "nodejs", so `await request.text()` is the canonical way.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await request.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    console.error("[stripe-webhook] signature verify failed:", err);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        // Fetch the subscription so we have the full price/status right
        // away. The subsequent "customer.subscription.created" event
        // will also fire and upsert the same row — we tolerate both.
        if (s.subscription && s.customer) {
          const subId =
            typeof s.subscription === "string"
              ? s.subscription
              : s.subscription.id;
          const sub = await stripe.subscriptions.retrieve(subId);
          await upsertSubscription(sub);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await upsertSubscription(sub);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: { status: "canceled", cancelAtPeriodEnd: true },
        });
        break;
      }
      case "invoice.paid":
      case "invoice.payment_failed": {
        // Status flips via the accompanying subscription.updated event;
        // the invoice events will later drive email notifications.
        break;
      }
      default:
        // Unhandled event — log at debug level to keep webhook logs
        // quiet in prod but still surface surprises during dev.
        if (process.env.STRIPE_WEBHOOK_DEBUG) {
          console.log(`[stripe-webhook] ignoring ${event.type}`);
        }
    }
  } catch (err) {
    console.error(`[stripe-webhook] handler error for ${event.type}:`, err);
    // Return 200 so Stripe doesn't retry forever on a persistent bug —
    // we'll catch the drift via the reconciliation job (Phase 2).
    return NextResponse.json({ received: true, handler_error: true });
  }

  return NextResponse.json({ received: true });
}

/**
 * Idempotent upsert of Subscription from a Stripe Subscription object.
 * Looks up the Practiq user via Customer.metadata.practiqUserId (set
 * at checkout-session creation time).
 */
async function upsertSubscription(sub: Stripe.Subscription): Promise<void> {
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  // The Customer row holds the practiqUserId in metadata — look it up.
  const stripe = getStripe();
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted) {
    console.warn(`[stripe-webhook] customer ${customerId} is deleted`);
    return;
  }
  const practiqUserId = customer.metadata?.practiqUserId;
  if (!practiqUserId) {
    console.warn(
      `[stripe-webhook] customer ${customerId} has no practiqUserId metadata`,
    );
    return;
  }

  const item = sub.items.data[0];
  if (!item) {
    console.warn(`[stripe-webhook] subscription ${sub.id} has no items`);
    return;
  }
  const priceId = item.price.id;
  const plan: PlanKey = planFromPriceId(priceId) ?? "starter";

  // Stripe's typings put period bounds on the item for usage-based
  // subs and on the subscription object for flat-rate subs. Handle
  // both; fall back to now + 30d if both are missing (defensive).
  const now = Math.floor(Date.now() / 1000);
  const subObj = sub as unknown as {
    current_period_start?: number;
    current_period_end?: number;
  };
  const itemObj = item as unknown as {
    current_period_start?: number;
    current_period_end?: number;
  };
  const periodStart =
    subObj.current_period_start ?? itemObj.current_period_start ?? now;
  const periodEnd =
    subObj.current_period_end ??
    itemObj.current_period_end ??
    now + 30 * 24 * 60 * 60;

  await prisma.subscription.upsert({
    where: { stripeSubscriptionId: sub.id },
    create: {
      userId: practiqUserId,
      stripeSubscriptionId: sub.id,
      stripePriceId: priceId,
      plan,
      status: sub.status,
      currentPeriodStart: new Date(periodStart * 1000),
      currentPeriodEnd: new Date(periodEnd * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
      seatCount: item.quantity ?? 1,
    },
    update: {
      stripePriceId: priceId,
      plan,
      status: sub.status,
      currentPeriodStart: new Date(periodStart * 1000),
      currentPeriodEnd: new Date(periodEnd * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
      seatCount: item.quantity ?? 1,
    },
  });
}
