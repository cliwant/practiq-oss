import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/client";
import {
  planFromPriceId,
  isFoundingPriceId,
  type PlanKey,
} from "@/lib/stripe/plans";
import { confirmClaim } from "@/lib/stripe/founding-slot";
import { prisma } from "@/lib/prisma";
import { safeNotify } from "@/lib/notifications/slack";
import {
  trackServerEvent,
  flushServerEvents,
} from "@/lib/analytics/posthog-server";
import {
  checkExistingEvent,
  recordReceived,
  markOutcome,
  recordReplayRejected,
  pingWebhookFailure,
} from "@/lib/stripe/instrumentation";

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
  const startedAt = Date.now();
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
    // Signature failures don't carry a Stripe event_id (we can't trust
    // anything in the body before verification). We can't write a row
    // to practiq.stripe_webhook_events because event_id is the PK and
    // we have nothing safe to put there — so we log + slack-ping +
    // return 400, same shape as before, plus the new failure type.
    console.error("[stripe-webhook] signature verify failed:", err);
    const errMsg = err instanceof Error ? err.message : String(err);
    safeNotify(
      "error",
      {
        where: "stripe:webhook:signature",
        message: errMsg,
      },
      { severity: "critical" },
    );
    pingWebhookFailure({
      eventId: "<signature-failed>",
      eventType: "<unknown>",
      livemode: false,
      errorStep: "signature_verify",
      errorMessage: errMsg,
    });
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 },
    );
  }

  // Idempotency: Stripe re-delivers the same event_id on retry. If we
  // already processed it, return 200 immediately and record the
  // replay attempt — never re-run side effects (charge customer,
  // send welcome email, etc.).
  const existing = await checkExistingEvent(event.id);
  if (existing && existing.status === "processed") {
    await recordReplayRejected(event.id, existing.status);
    await flushServerEvents().catch(() => {});
    return NextResponse.json({ received: true, replay: true });
  }
  if (existing && existing.status === "received") {
    // Previous delivery is in-flight (rare — race between two webhook
    // workers). Don't double-process; let the first one finish.
    await recordReplayRejected(event.id, existing.status);
    await flushServerEvents().catch(() => {});
    return NextResponse.json({ received: true, in_flight: true });
  }

  // First-time delivery (or retry of a failed prior delivery). Stamp
  // the audit row before we run handler logic so even a crash leaves
  // a 'received' row visible in /admin/incidents/stripe.
  await recordReceived({
    eventId: event.id,
    eventType: event.type,
    livemode: event.livemode,
    payloadSize: rawBody.length,
    signatureVerified: true,
  });

  let errorStep: string | null = null;
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        // Promote the FoundingClaim ledger row from `pending` to
        // `confirmed` if this checkout was claiming a founding slot.
        // Idempotent on retried webhook deliveries — confirmClaim
        // only updates rows where status='pending'.
        if (s.metadata?.is_founding === "true") {
          await confirmClaim(s.id).catch((err) =>
            console.error("[stripe-webhook] confirmClaim failed:", err),
          );
        }
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

          // PostHog conversion — server-side because Stripe redirects
          // to /app/settings AFTER the webhook fires, and we want the
          // event to land regardless of whether the user actually
          // hits the success page (some pay then close the tab).
          await trackCheckoutCompleted(sub);
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
        await trackSubscriptionCanceled(sub);
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
    errorStep = event.type;
    const errMsg = err instanceof Error ? err.message : String(err);
    const errStack = err instanceof Error ? err.stack : undefined;
    console.error(`[stripe-webhook] handler error for ${event.type}:`, err);
    safeNotify(
      "error",
      {
        where: `stripe:webhook:${event.type}`,
        message: errMsg,
      },
      { severity: "critical" },
    );
    pingWebhookFailure({
      eventId: event.id,
      eventType: event.type,
      livemode: event.livemode,
      errorStep: event.type,
      errorMessage: errMsg,
    });
    await markOutcome({
      eventId: event.id,
      status: "failed",
      errorMessage: errStack ? errStack.slice(0, 2000) : errMsg.slice(0, 2000),
      errorStep: event.type,
      processingDurationMs: Date.now() - startedAt,
    });
    // Return 200 so Stripe doesn't retry forever on a persistent bug —
    // we'll catch the drift via the reconciliation job (Phase 2).
    await flushServerEvents().catch(() => {});
    return NextResponse.json({ received: true, handler_error: true });
  }

  // Drain PostHog before returning. Vercel serverless functions exit
  // shortly after the response is sent; without this flush, captured
  // events can be dropped on cold-shutdown.
  await flushServerEvents();
  // Stamp the row as 'processed' last — once we return Stripe stops
  // retrying. If this update fails the row stays at 'received' which
  // looks like an in-flight delivery and surfaces as a soft alert on
  // /admin/incidents/stripe.
  await markOutcome({
    eventId: event.id,
    status: "processed",
    errorStep,
    processingDurationMs: Date.now() - startedAt,
  });
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
  // The Customer row carries practiqUserId in metadata when we
  // eagerly created it. After the 2026-05-06 friction-reduction
  // change, the checkout route stopped pre-creating customers and
  // instead relies on `customer_email` to prefill the hosted page.
  // Stripe auto-creates a Customer at checkout completion in that
  // path — no metadata. Fall back to subscription_data.metadata,
  // which we always set in the checkout route. As a side-effect we
  // also back-fill the auto-created customer's metadata + the
  // user's stripeCustomerId so the Customer Portal works on the
  // first plan switch.
  let practiqUserId = customer.metadata?.practiqUserId;
  if (!practiqUserId) {
    const subMeta = (sub.metadata ?? {}) as Record<string, string>;
    practiqUserId = subMeta.practiqUserId ?? undefined;
    if (practiqUserId) {
      // Best-effort back-fill — failures are non-fatal; the
      // subsequent webhook event will retry.
      try {
        await stripe.customers.update(customerId, {
          metadata: { practiqUserId },
        });
        await prisma.user.update({
          where: { id: practiqUserId },
          data: { stripeCustomerId: customerId },
        });
      } catch (err) {
        console.warn(`[stripe-webhook] back-fill failed for ${customerId}:`, err);
      }
    }
  }
  if (!practiqUserId) {
    console.warn(
      `[stripe-webhook] customer ${customerId} has no practiqUserId metadata`,
    );
    return;
  }

  // Round 12 (L4): a subscription created via checkout that
  // attached a metered overage price will carry TWO items —
  //   [0] base seat-priced item (recurring.usage_type = "licensed")
  //   [1] metered overage item (recurring.usage_type = "metered")
  // We need to identify both: `baseItem` carries the price + seat
  // count for plan resolution, `overageItem.id` is the
  // subscription-item id we'll later pass to
  // stripe.billing.meterEvents.create / recordOverageUsage.
  type StripeUsageType = "licensed" | "metered" | undefined;
  const isMetered = (i: typeof sub.items.data[number]) =>
    (i.price.recurring?.usage_type as StripeUsageType) === "metered";
  const baseItem = sub.items.data.find((i) => !isMetered(i)) ?? sub.items.data[0];
  const overageItem = sub.items.data.find(isMetered) ?? null;

  if (!baseItem) {
    console.warn(`[stripe-webhook] subscription ${sub.id} has no items`);
    return;
  }
  const priceId = baseItem.price.id;
  const plan: PlanKey = planFromPriceId(priceId) ?? "solo";

  // Stripe's typings put period bounds on the item for usage-based
  // subs and on the subscription object for flat-rate subs. Handle
  // both; fall back to now + 30d if both are missing (defensive).
  const now = Math.floor(Date.now() / 1000);
  const subObj = sub as unknown as {
    current_period_start?: number;
    current_period_end?: number;
  };
  const itemObj = baseItem as unknown as {
    current_period_start?: number;
    current_period_end?: number;
  };
  const periodStart =
    subObj.current_period_start ?? itemObj.current_period_start ?? now;
  const periodEnd =
    subObj.current_period_end ??
    itemObj.current_period_end ??
    now + 30 * 24 * 60 * 60;

  // Auto-enable overage when (and only when) a metered item is
  // attached. This keeps the safe-default property: if the operator
  // hasn't created the metered Stripe price yet, overageEnabled stays
  // false and assertBudget hard cuts off at allowance — rather than
  // silently letting a paid plan run unbounded against an
  // unconfigured meter.
  const overageEnabled = overageItem !== null;

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
      seatCount: baseItem.quantity ?? 1,
      overageEnabled,
      stripeOverageItemId: overageItem?.id ?? null,
    },
    update: {
      stripePriceId: priceId,
      plan,
      status: sub.status,
      currentPeriodStart: new Date(periodStart * 1000),
      currentPeriodEnd: new Date(periodEnd * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
      seatCount: baseItem.quantity ?? 1,
      overageEnabled,
      stripeOverageItemId: overageItem?.id ?? null,
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
  const plan = planFromPriceId(priceId) ?? "solo";
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

/**
 * PostHog: checkout_completed. Resolves the practiqUserId via Stripe
 * customer metadata so this stitches to the user's PostHog person
 * profile (whose distinct_id is the same DB user id).
 */
async function trackCheckoutCompleted(sub: Stripe.Subscription): Promise<void> {
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const { practiqUserId } = await resolveCustomer(customerId);
  if (!practiqUserId) return;
  const item = sub.items.data[0];
  const priceId = item?.price.id ?? "";
  const plan: PlanKey = planFromPriceId(priceId) ?? "solo";
  const amountCents = item?.price.unit_amount ?? 0;
  trackServerEvent(practiqUserId, "checkout_completed", {
    plan,
    amountUsd: Number((amountCents / 100).toFixed(2)),
    isFoundingMember: priceId ? isFoundingPriceId(priceId) : false,
    seatCount: item?.quantity ?? 1,
    stripeSubscriptionId: sub.id,
  });
}

/**
 * PostHog: subscription_canceled. Computes daysSinceSignup using the
 * Practiq User.createdAt (NOT the Stripe customer.created — the user
 * may have been on a free trial before subscribing).
 */
async function trackSubscriptionCanceled(sub: Stripe.Subscription): Promise<void> {
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const { practiqUserId } = await resolveCustomer(customerId);
  if (!practiqUserId) return;
  const item = sub.items.data[0];
  const priceId = item?.price.id ?? "";
  const plan: PlanKey = planFromPriceId(priceId) ?? "solo";
  // Fetch user.createdAt for tenure calc. Best-effort — if the user
  // was hard-deleted, fall back to null and let the analytics side
  // report tenure as missing.
  let daysSinceSignup: number | null = null;
  try {
    const user = await prisma.user.findUnique({
      where: { id: practiqUserId },
      select: { createdAt: true },
    });
    if (user?.createdAt) {
      const ms = Date.now() - user.createdAt.getTime();
      daysSinceSignup = Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
    }
  } catch {
    // ignore — analytics side can compute tenure from PostHog itself
    // by joining $first_seen, this is just a convenience property.
  }
  trackServerEvent(practiqUserId, "subscription_canceled", {
    plan,
    daysSinceSignup,
    cancelReason: sub.cancellation_details?.reason ?? null,
    stripeSubscriptionId: sub.id,
  });
}
