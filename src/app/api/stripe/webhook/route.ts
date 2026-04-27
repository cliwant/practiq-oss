import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/client";
import { planFromPriceId, type PlanKey } from "@/lib/stripe/plans";
import { prisma } from "@/lib/prisma";
import { safeNotify } from "@/lib/notifications/slack";

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

          // Slack ping — first conversion. checkout.session.completed
          // fires once per checkout, so this is the cleanest "new
          // paying customer" signal Stripe gives us.
          await notifyPaymentSuccess(sub, "checkout.session.completed");
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
        await notifySubscriptionCanceled(sub);
        break;
      }
      case "invoice.paid": {
        // Renewal succeeded — fire a softer "renewal" Slack so we can
        // see retention is working without the noise of "new customer."
        const inv = event.data.object as Stripe.Invoice;
        await notifyRenewalPaid(inv);
        break;
      }
      case "invoice.payment_failed": {
        // High-priority signal: card declined / insufficient funds /
        // subscription canceled mid-cycle. Don't ever miss this — it's
        // a customer about to churn.
        const inv = event.data.object as Stripe.Invoice;
        await notifyPaymentFailed(inv);
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

/**
 * Resolve the practiqUserId + email for a given Stripe customer. Used
 * by the Slack notifiers below — keeping the lookup in one place so the
 * webhook handler stays readable.
 */
async function resolveCustomer(
  customerId: string,
): Promise<{ practiqUserId: string | null; email: string | null }> {
  try {
    const stripe = getStripe();
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) return { practiqUserId: null, email: null };
    const practiqUserId = customer.metadata?.practiqUserId ?? null;
    const email = customer.email ?? null;
    return { practiqUserId, email };
  } catch {
    return { practiqUserId: null, email: null };
  }
}

async function notifyPaymentSuccess(
  sub: Stripe.Subscription,
  event: string,
): Promise<void> {
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const { email } = await resolveCustomer(customerId);
  const item = sub.items.data[0];
  const priceId = item?.price.id ?? "";
  const plan = planFromPriceId(priceId) ?? "starter";
  const amountCents = item?.price.unit_amount ?? 0;
  safeNotify("practiq_payment_success", {
    email,
    plan,
    amountUsd: (amountCents / 100).toFixed(2),
    seatCount: item?.quantity ?? 1,
    event,
    stripeSubscriptionId: sub.id,
  });
}

async function notifyRenewalPaid(inv: Stripe.Invoice): Promise<void> {
  const customerId =
    typeof inv.customer === "string" ? inv.customer : inv.customer?.id;
  if (!customerId) return;
  // First invoice (initial signup) is already handled by checkout.session
  // .completed — only fire renewal Slack for follow-ups (billing_reason
  // = "subscription_cycle").
  if (inv.billing_reason !== "subscription_cycle") return;
  const { email } = await resolveCustomer(customerId);
  // The subscription_id on Invoice is typed loosely — pull it via
  // the lines (every renewal invoice has at least one subscription
  // line item).
  const lineSub = inv.lines.data[0]?.subscription;
  const subId =
    typeof lineSub === "string" ? lineSub : (lineSub?.id ?? "unknown");
  const amountCents = inv.amount_paid ?? 0;
  safeNotify("practiq_payment_success", {
    email,
    plan: "—",
    amountUsd: (amountCents / 100).toFixed(2),
    seatCount: "—",
    event: "invoice.paid",
    stripeSubscriptionId: subId,
  });
}

async function notifyPaymentFailed(inv: Stripe.Invoice): Promise<void> {
  const customerId =
    typeof inv.customer === "string" ? inv.customer : inv.customer?.id;
  if (!customerId) return;
  const { email } = await resolveCustomer(customerId);
  const lineSub = inv.lines.data[0]?.subscription;
  const subId =
    typeof lineSub === "string" ? lineSub : (lineSub?.id ?? "unknown");
  // Stripe surfaces the failure reason in last_finalization_error or
  // lines[0].description; fall back to status.
  const reason =
    inv.last_finalization_error?.message ??
    inv.status_transitions?.finalized_at
      ? `status=${inv.status}`
      : "unknown";
  safeNotify("practiq_payment_failed", {
    email,
    plan: "—",
    reason,
    attemptCount: inv.attempt_count ?? 0,
    stripeSubscriptionId: subId,
  });
}

async function notifySubscriptionCanceled(sub: Stripe.Subscription): Promise<void> {
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const { email } = await resolveCustomer(customerId);
  const item = sub.items.data[0];
  const priceId = item?.price.id ?? "";
  const plan = planFromPriceId(priceId) ?? "—";
  const subObj = sub as unknown as { current_period_end?: number };
  const periodEndUnix = subObj.current_period_end ?? 0;
  safeNotify("practiq_subscription_canceled", {
    email,
    plan,
    cancelReason: sub.cancellation_details?.reason ?? "—",
    currentPeriodEnd: periodEndUnix
      ? new Date(periodEndUnix * 1000).toISOString().slice(0, 10)
      : "—",
    stripeSubscriptionId: sub.id,
  });
}
