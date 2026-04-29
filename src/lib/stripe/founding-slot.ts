/**
 * Founding-slot lifecycle helpers.
 *
 * The Founding Member tier is capped at 50 firms (FoundingSlot.cap).
 * Without per-claim accounting, every CTA click that opened a Stripe
 * Checkout session consumed a slot regardless of whether the user
 * paid — the 4/29 audit found 4 leaked claims, all from E2E test
 * runs. This module makes the lifecycle explicit:
 *
 *   1. claimSlot()      — atomically reserve at /api/stripe/checkout time
 *   2. confirmClaim()   — finalize on webhook checkout.session.completed
 *   3. releaseStaleClaims() — cron-driven decrement for abandoned sessions
 *
 * All three operate inside a single transaction where it matters
 * (claim + insert is one transaction; release scans + per-row decrement
 * is per-row to keep partial progress safe across cron timeouts).
 */

import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe/client";

export interface ClaimSlotResult {
  claimed: boolean;
  claimedCount: number;
  cap: number;
  /** When `claimed === true` the caller should pass this to confirmClaim() once the webhook fires. */
  claimId?: string;
}

/**
 * Reserve a founding slot atomically. Returns `claimed: true` when a
 * slot was successfully secured (claimedCount <= cap after increment).
 * On race-loss the increment is rolled back so the visible counter
 * stays honest.
 *
 * Caller MUST insert a FoundingClaim row with `claimId` immediately
 * after — pass the Stripe checkout session id once it's been created.
 * That two-step pattern lets us record the increment before the
 * external API call without losing transactional consistency.
 */
export async function claimSlot(opts: {
  userId: string;
  stripeSessionId: string;
}): Promise<ClaimSlotResult> {
  // Snapshot read first to avoid a doomed increment + decrement when
  // the cohort is already obviously full.
  const slot = await prisma.foundingSlot.findUnique({
    where: { id: "singleton" },
  });
  const cap = slot?.cap ?? 50;
  const currentClaimed = slot?.claimedCount ?? 0;
  if (currentClaimed >= cap) {
    return { claimed: false, claimedCount: currentClaimed, cap };
  }

  // Atomic increment. Postgres returns the post-update row, so two
  // racing requests each get a deterministic post-increment count.
  const updated = await prisma.foundingSlot.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", claimedCount: 1, cap },
    update: { claimedCount: { increment: 1 } },
  });

  if (updated.claimedCount > updated.cap) {
    // Race lost — roll back the increment.
    await prisma.foundingSlot
      .update({
        where: { id: "singleton" },
        data: { claimedCount: { decrement: 1 } },
      })
      .catch(() => {});
    return { claimed: false, claimedCount: updated.cap, cap: updated.cap };
  }

  // Reservation succeeded — register the claim. Use upsert keyed on
  // stripe_session_id so a retried call (e.g. failed Stripe.create()
  // followed by another attempt) doesn't double-insert.
  const claim = await prisma.foundingClaim.upsert({
    where: { stripeSessionId: opts.stripeSessionId },
    create: {
      stripeSessionId: opts.stripeSessionId,
      userId: opts.userId,
      status: "pending",
    },
    update: {
      // Reset any prior status if the session id is being reused
      // (shouldn't happen — Stripe session ids are unique — but defensive).
      status: "pending",
      userId: opts.userId,
      confirmedAt: null,
      releasedAt: null,
    },
  });

  return {
    claimed: true,
    claimedCount: updated.claimedCount,
    cap: updated.cap,
    claimId: claim.id,
  };
}

/**
 * Caller hit `/api/stripe/checkout` but Stripe.checkout.sessions.create
 * itself failed AFTER claimSlot() returned `claimed: true`. Roll back
 * both the counter and the claim row so the slot returns to the pool
 * immediately.
 */
export async function abortClaim(stripeSessionId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const claim = await tx.foundingClaim
      .findUnique({ where: { stripeSessionId } })
      .catch(() => null);
    if (!claim || claim.status !== "pending") return;
    await tx.foundingSlot.update({
      where: { id: "singleton" },
      data: { claimedCount: { decrement: 1 } },
    });
    await tx.foundingClaim.update({
      where: { id: claim.id },
      data: { status: "released", releasedAt: new Date() },
    });
  });
}

/**
 * Webhook event = checkout.session.completed AND metadata.is_founding === "true".
 * Promotes the pending claim to confirmed; idempotent on repeated webhook
 * deliveries.
 */
export async function confirmClaim(
  stripeSessionId: string,
): Promise<{ confirmed: boolean }> {
  const result = await prisma.foundingClaim
    .updateMany({
      where: { stripeSessionId, status: "pending" },
      data: { status: "confirmed", confirmedAt: new Date() },
    })
    .catch(() => ({ count: 0 }));
  return { confirmed: (result.count ?? 0) > 0 };
}

/**
 * Cron entry-point: scan pending claims older than `maxAgeHours` (default
 * 25 to give Stripe's 24h session expiry a comfortable buffer) and ask
 * Stripe for the actual session state. If Stripe says expired / canceled
 * (or any non-complete terminal state), release the slot.
 *
 * Returns counts so the cron's Slack summary is meaningful.
 */
export async function releaseStaleClaims(
  opts: { maxAgeHours?: number; dryRun?: boolean } = {},
): Promise<{
  scanned: number;
  releasedExpired: number;
  reconfirmed: number;
  stillOpen: number;
  errors: number;
}> {
  const maxAgeHours = opts.maxAgeHours ?? 25;
  const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);

  const stale = await prisma.foundingClaim.findMany({
    where: { status: "pending", claimedAt: { lt: cutoff } },
    take: 200, // hard cap — the cohort is 50, so >200 stale is a different problem
  });

  let releasedExpired = 0;
  let reconfirmed = 0;
  let stillOpen = 0;
  let errors = 0;

  if (stale.length === 0) {
    return { scanned: 0, releasedExpired: 0, reconfirmed: 0, stillOpen: 0, errors: 0 };
  }

  const stripe = getStripe();

  for (const claim of stale) {
    try {
      const session = await stripe.checkout.sessions.retrieve(
        claim.stripeSessionId,
      );
      const stripeStatus = session.status; // 'open' | 'complete' | 'expired'
      const paymentStatus = session.payment_status; // 'paid' | 'unpaid' | 'no_payment_required'

      if (stripeStatus === "complete" && paymentStatus !== "unpaid") {
        // Webhook must have been lost. Reconcile by promoting the claim.
        if (!opts.dryRun) {
          await prisma.foundingClaim.update({
            where: { id: claim.id },
            data: { status: "confirmed", confirmedAt: new Date() },
          });
        }
        reconfirmed += 1;
        continue;
      }

      if (stripeStatus === "expired" || (stripeStatus === "open" && Date.now() - claim.claimedAt.getTime() > maxAgeHours * 60 * 60 * 1000)) {
        if (!opts.dryRun) {
          await prisma.$transaction([
            prisma.foundingSlot.update({
              where: { id: "singleton" },
              data: { claimedCount: { decrement: 1 } },
            }),
            prisma.foundingClaim.update({
              where: { id: claim.id },
              data: { status: "released", releasedAt: new Date() },
            }),
          ]);
        }
        releasedExpired += 1;
        continue;
      }

      stillOpen += 1;
    } catch (err) {
      console.error(
        `[founding-slot-cleanup] failed to reconcile session ${claim.stripeSessionId}:`,
        err,
      );
      errors += 1;
    }
  }

  return {
    scanned: stale.length,
    releasedExpired,
    reconfirmed,
    stillOpen,
    errors,
  };
}
