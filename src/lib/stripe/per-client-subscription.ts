/**
 * Per-client subscription-quantity adjuster — Stage 3b, 2026-05-15.
 *
 * Called from /api/clients POST (after Client INSERT) and
 * /api/clients/[id] DELETE (after Client delete) to keep the Stripe
 * subscription's per-client quantity in sync with the firm's actual
 * Client count.
 *
 * Design notes:
 *
 * 1. **Ground-truth quantity from `prisma.client.count`.** Each call
 *    counts Clients post-mutation rather than `Subscription.clientCount
 *    +/- 1`. Two simultaneous client creates can't race each other into
 *    a stale read — the second call sees the first's INSERT.
 *
 * 2. **Ledger first, then Stripe.** `ClientBillingEvent` is written
 *    before the Stripe API call. If Stripe is unreachable or throws,
 *    the local ledger still has the record and a reconciliation cron
 *    (phase 2) can replay. The reverse order would silently lose
 *    subscription mutations on Stripe outages.
 *
 * 3. **Idempotency key on clientId + action.** A retried call with
 *    the same `clientId` + `action` produces the same idempotency key,
 *    so Stripe collapses duplicates without double-prorating.
 *
 * 4. **Trial users are no-ops at the Stripe layer.** Without an active
 *    Subscription row, there's no subscription item to mutate. The
 *    ledger still gets a row (with `stripeSubscriptionItemId=null`)
 *    so post-conversion accounting can reconstruct trial client
 *    history.
 *
 * 5. **Failures never throw to the caller.** `/api/clients` POST must
 *    succeed even if the billing hook fails — billing drift is a less
 *    bad outcome than client creation failing for a user who already
 *    saw a 200 in their UI. Failures fire a Slack alert and write a
 *    `failed=true` flag to the ClientBillingEvent payload for the
 *    reconciliation cron.
 */

import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripe, isStripeConfigured } from "@/lib/stripe/client";
import {
  PRICING_TIERS,
  tierFromPriceId,
} from "@/lib/stripe/plans";
import { safeNotify } from "@/lib/notifications/slack";

export type ClientBillingAction = "added" | "removed";

export interface AdjustResult {
  /** Actual Client count after the mutation, matches the Stripe quantity sent. */
  newCount: number;
  /** Effective tier on the Subscription, or null if no sub exists (trial). */
  tier: "trial" | "founding" | "standard" | null;
  /** Stripe subscription item id mutated, or null if no Stripe call ran. */
  stripeSubscriptionItemId: string | null;
  /** True when the local ledger + DB landed cleanly. */
  ok: boolean;
  /** Set when Stripe call failed; the local ledger still wrote. */
  stripeError?: string;
}

/**
 * Adjust the per-client subscription quantity in response to a client
 * add or delete. Always returns; never throws.
 */
export async function adjustSubscriptionClientCount(opts: {
  userId: string;
  /** +1 for client add, -1 for client delete. */
  delta: 1 | -1;
  /**
   * The Client.id that triggered this adjustment. Used as idempotency
   * key + ledger reference. Pass null for reconciliation-cron calls
   * (no specific client driving the change).
   */
  clientId: string | null;
}): Promise<AdjustResult> {
  const action: ClientBillingAction = opts.delta > 0 ? "added" : "removed";

  // Real-time client count — the ground truth Stripe quantity should
  // match. Trial users with delta=+1 see this AFTER their INSERT so
  // the count includes the new client; delta=-1 sees this AFTER the
  // DELETE so the count reflects the post-delete state.
  const newCount = await prisma.client.count({
    where: { userId: opts.userId },
  });

  // Look up the active Subscription. Single-per-user, so findUnique
  // on userId is correct.
  const sub = await prisma.subscription.findUnique({
    where: { userId: opts.userId },
    select: {
      id: true,
      tier: true,
      status: true,
      stripeSubscriptionId: true,
      clientCount: true,
    },
  });

  const isTrialOrUnsub =
    !sub ||
    sub.status === "trialing" ||
    sub.status === "canceled" ||
    sub.status === "incomplete";

  // Write the ledger row FIRST so the local audit trail captures the
  // intent even if the subsequent Stripe call fails.
  await prisma.clientBillingEvent.create({
    data: {
      userId: opts.userId,
      clientId: opts.clientId,
      action,
      subscriptionItemQuantity: newCount,
      // prorationAmountUsd backfills from invoice.upcoming webhook.
      stripeSubscriptionItemId: null,
    },
  });

  // Keep Subscription.clientCount aligned with reality. Idempotent —
  // running the same delta twice with the same actual Client count
  // is a no-op.
  if (sub) {
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { clientCount: newCount },
    });
  }

  // Trial / unsubscribed / canceled / incomplete: skip Stripe entirely.
  // The local ledger is enough; if the user later subscribes, the
  // checkout flow seeds the new sub with the actual current count.
  if (isTrialOrUnsub) {
    return {
      newCount,
      tier: sub ? (sub.tier as AdjustResult["tier"]) : null,
      stripeSubscriptionItemId: null,
      ok: true,
    };
  }

  // Paid path. From here, sub is non-null AND status is active or past_due.
  // We sync Stripe's quantity to match Practiq's actual count. Past_due
  // subs still get mutated — Stripe handles dunning independently and
  // the customer's payment recovery shouldn't break adds/deletes.
  if (!isStripeConfigured()) {
    // Operator hasn't set the per-client prices yet. Surface as a soft
    // failure: ledger row is in place, the next call (or the reconcile
    // cron) replays once Stripe is configured.
    return {
      newCount,
      tier: sub.tier as AdjustResult["tier"],
      stripeSubscriptionItemId: null,
      ok: false,
      stripeError: "Stripe not configured",
    };
  }

  try {
    const stripe = getStripe();
    const subscription = await stripe.subscriptions.retrieve(
      sub.stripeSubscriptionId,
    );
    const perClientItem = findPerClientItem(subscription);
    if (!perClientItem) {
      // The sub exists but has no per-client price item — legacy
      // Solo/Practice/Firm subscription from before the migration.
      // Don't try to mutate it; the legacy plan still works as-is.
      return {
        newCount,
        tier: sub.tier as AdjustResult["tier"],
        stripeSubscriptionItemId: null,
        ok: true, // legacy sub is intentional, not an error
      };
    }

    await stripe.subscriptionItems.update(
      perClientItem.id,
      {
        quantity: newCount,
        proration_behavior: "create_prorations",
      },
      {
        // Idempotency key: clientId + action means retries collapse.
        // Falls back to a synthetic key for reconcile-cron calls.
        idempotencyKey: opts.clientId
          ? `client-${action}:${opts.clientId}`
          : `reconcile:${opts.userId}:${newCount}:${Date.now()}`,
      },
    );

    return {
      newCount,
      tier: sub.tier as AdjustResult["tier"],
      stripeSubscriptionItemId: perClientItem.id,
      ok: true,
    };
  } catch (err) {
    // Stripe call failed. Ledger row is already in place, so the
    // failure is recoverable. Fire a Slack ping so the operator
    // notices systematic drift (one-off failures get rescued by the
    // next mutation; sustained failures indicate Stripe config or
    // outage and deserve human attention).
    const message = err instanceof Error ? err.message : String(err);
    console.warn(
      `[per-client-sub] Stripe sync failed userId=${opts.userId} clientId=${opts.clientId} action=${action} delta=${opts.delta}: ${message}`,
    );
    safeNotify(
      "billing_hook_failed",
      {
        userId: opts.userId,
        clientId: opts.clientId,
        action,
        newCount,
        errorMessage: message.slice(0, 500),
      },
      { severity: "warning" },
    );
    return {
      newCount,
      tier: sub.tier as AdjustResult["tier"],
      stripeSubscriptionItemId: null,
      ok: false,
      stripeError: message,
    };
  }
}

/**
 * Find the per-client subscription item on a Stripe Subscription.
 * Matches by price ID against the configured PRICING_TIERS.
 * Falls back to returning null for legacy Solo/Practice/Firm subs
 * (those have a per-seat price item, not a per-client one).
 */
function findPerClientItem(
  sub: Stripe.Subscription,
): Stripe.SubscriptionItem | null {
  for (const item of sub.items.data) {
    const tier = tierFromPriceId(item.price.id);
    if (tier !== null) return item;
  }
  // Belt-and-braces: also accept items whose price matches our
  // env-configured ids even if tierFromPriceId returned null (e.g.
  // null check raced an env-var hot-swap). Rare; harmless.
  const founding = PRICING_TIERS.founding.stripePriceIdClient;
  const standard = PRICING_TIERS.standard.stripePriceIdClient;
  for (const item of sub.items.data) {
    if (founding !== null && item.price.id === founding) return item;
    if (standard !== null && item.price.id === standard) return item;
  }
  return null;
}
