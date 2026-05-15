/**
 * Token-budget enforcement (L4) — the production gate for every
 * billable LLM call once the launch-readiness pricing matrix is live.
 *
 * Complementary to `src/lib/spend-ceiling.ts`, which enforces a
 * USD-denominated worst-case cap. The spend ceiling is a **safety
 * net** ("don't let a runaway loop burn $300 in an hour"). The token
 * budget is the **product gate** ("Solo plan gets 2M tokens/month").
 *
 * Three layered budgets, evaluated in this order:
 *
 *   1. Demo (anonymous, IP-based)   — 5K tokens / IP / 24h
 *      Enforced in /api/demo/chat via `assertDemoBudget`. Returns 401
 *      with sign-up CTA on exhaustion.
 *
 *   2. Trial (no Subscription, signed up < 14d ago)
 *      Total 200K tokens across the 14-day window. Hard cut-off,
 *      no overage. Returns 402 with upgrade CTA on exhaustion.
 *
 *   3. Paid plans (Solo / Practice / Firm)
 *      Per-user, per-billing-period token allowance. When exhausted:
 *        - if `Subscription.overageEnabled = false` → 402 with
 *          /billing CTA (operator must opt in to overage)
 *        - if `Subscription.overageEnabled = true`  → call goes
 *          through and `recordOverageUsage` bills the metered
 *          Stripe price (idempotent on `sourceKey`).
 *
 * Three integration points (mirroring spend-ceiling):
 *
 *   1. `assertBudget(userId, opts)` — async guard, called BEFORE the
 *      LLM call. Throws `BudgetExceededError` with structured payload
 *      that the route layer turns into a 402 JSON response.
 *
 *   2. `recordOverageUsage({ userId, sourceKey, tokens, … })` — async
 *      idempotent write of one Stripe usage record. Caller invokes
 *      AFTER the LLM call finishes IF the call landed past the
 *      inclusive allowance AND overage was enabled. Idempotent on
 *      `sourceKey` so retries don't double-bill.
 *
 *   3. `getBudgetSnapshot(userId)` — read-only state, used by
 *      /api/chat to decorate the response with `usage` field once
 *      the user passes 80% of allowance, and by /app/settings billing
 *      page to render the usage bar.
 */

import { prisma } from "@/lib/prisma";
import { resolveUserPlan, type ResolvedPlan } from "@/lib/plan-gates";
import {
  FREE_TRIAL,
  DEMO_ZONE,
  PER_CLIENT_PRICING,
  tokenAllowance,
  overageUsdPer1k,
  overagePriceId,
  type PlanKey,
} from "@/lib/stripe/plans";
import { checkRateLimit } from "@/lib/rate-limit";

// ─── Types ─────────────────────────────────────────────────────────

export type BudgetReason =
  | "demo_exceeded"
  | "trial_exceeded"
  | "budget_exceeded"
  | "overage_unavailable";

export interface BudgetSnapshot {
  userId: string | null;
  /** "demo" for anonymous, otherwise the resolved plan key. */
  planKey: PlanKey | "demo";
  /**
   * Stage 3c per-client tier — non-null only for users on the new
   * per-client subscription (founding or standard). Legacy per-seat
   * subs and trial/demo paths leave this null. Chat / agent callers
   * branch on this to decide credit-consumption vs metered-overage.
   */
  tier: "trial" | "founding" | "standard" | null;
  /**
   * Per-client subscription quantity. Drives `baseAllowance`. 0 for
   * trial, demo, and legacy per-seat paths.
   */
  clientCount: number;
  /**
   * Per-period base allowance for per-client subs (clientCount ×
   * tokensPerClientPerMonth). 0 when `tier` is null. Distinct from
   * `allowance` which is `baseAllowance + creditBalance` for
   * per-client; the chat path uses `baseAllowance` to compute the
   * "this turn's tokens that should come from credits" math.
   */
  baseAllowance: number;
  /** Current period for paid; trial-window for free; rolling-24h for demo. */
  periodStart: Date;
  periodEnd: Date;
  /** Total tokens included in the period. 0 means "metered only". */
  allowance: number;
  /** Tokens consumed inside the window (input + output, summed). */
  used: number;
  /** Fraction of allowance consumed, capped at 1 for display. */
  fractionUsed: number;
  /** Tokens remaining inside the inclusive allowance. May go negative. */
  remaining: number;
  /** True when used >= allowance. */
  exceeded: boolean;
  /** True when paid user with overageEnabled and a configured Stripe price. */
  overageEnabled: boolean;
}

export class BudgetExceededError extends Error {
  readonly reason: BudgetReason;
  readonly snapshot: BudgetSnapshot;
  readonly upgradeUrl: string;

  constructor(
    reason: BudgetReason,
    snapshot: BudgetSnapshot,
    upgradeUrl: string,
  ) {
    super(
      `Token budget reached: ${snapshot.used.toLocaleString()} / ${snapshot.allowance.toLocaleString()} (${reason})`,
    );
    this.name = "BudgetExceededError";
    this.reason = reason;
    this.snapshot = snapshot;
    this.upgradeUrl = upgradeUrl;
  }
}

/**
 * Structured 402 / 401 body for routes to return when a budget is
 * tripped. The shape is stable across reasons so the frontend can
 * render a single upgrade-modal component dispatching on `error`.
 */
export interface BudgetRefusalBody {
  error: BudgetReason | "demo_exceeded";
  message: string;
  upgradeUrl: string;
  signupUrl?: string;
  overageEnabled: boolean;
  used: number;
  allowance: number;
}

// ─── Public surface ───────────────────────────────────────────────

/**
 * Assert the user is under their token budget BEFORE the model call.
 * Throws `BudgetExceededError` for the route to catch and turn into
 * a 402. Skip when `process.env.TOKEN_BUDGET_DISABLED === "1"`
 * (emergency escape valve, mirrors spend-ceiling).
 *
 * Behaviour by plan:
 *  - free + within trial window: 200K total cap, hard cut-off
 *  - free + trial expired:       returns 402 (existing plan-gate
 *                                also catches this earlier)
 *  - solo / practice / firm:
 *      * under allowance → returns silently
 *      * at allowance + overageEnabled=true + Stripe price set → returns silently
 *      * at allowance + overageEnabled=false → throws
 *      * at allowance + overageEnabled=true + Stripe price NOT set → throws
 *        with reason `overage_unavailable` (operator misconfiguration)
 */
export async function assertBudget(userId: string): Promise<BudgetSnapshot> {
  if (process.env.TOKEN_BUDGET_DISABLED === "1") {
    // Emergency bypass — return a neutral snapshot so callers using
    // it for UI hints don't crash.
    return {
      userId,
      planKey: "free",
      tier: null,
      clientCount: 0,
      baseAllowance: 0,
      periodStart: new Date(),
      periodEnd: new Date(),
      allowance: 0,
      used: 0,
      fractionUsed: 0,
      remaining: 0,
      exceeded: false,
      overageEnabled: false,
    };
  }

  const snap = await getBudgetSnapshot(userId);

  // Free + trial window — hard cut-off at FREE_TRIAL.trialTotalTokens
  if (snap.planKey === "free") {
    if (snap.exceeded) {
      throw new BudgetExceededError("trial_exceeded", snap, "/pricing");
    }
    return snap;
  }

  // Paid plans — inclusive allowance, then optional metered overage
  if (snap.exceeded) {
    if (!snap.overageEnabled) {
      throw new BudgetExceededError("budget_exceeded", snap, "/billing");
    }
    // overageEnabled=true: only allow through if there's actually a
    // Stripe price + Subscription Item to bill against. Misconfigured
    // overage is treated as a hard cut-off — never silently absorb cost.
    // Narrow planKey: authed assertBudget is never called with a "demo"
    // snapshot (that path is `assertDemoBudget`).
    if (snap.planKey !== "demo") {
      const overagePrice = overagePriceId(snap.planKey);
      if (!overagePrice) {
        throw new BudgetExceededError(
          "overage_unavailable",
          snap,
          "/billing",
        );
      }
    }
  }
  return snap;
}

/**
 * Read-only budget snapshot for a user. Used by:
 *  - /api/chat to add `usage` field to the response when fractionUsed > 0.8
 *  - /app/settings billing page to render the usage bar
 *  - Admin analytics view
 */
export async function getBudgetSnapshot(userId: string): Promise<BudgetSnapshot> {
  const plan = await resolveUserPlan(userId);

  if (plan.planKey === "free") {
    return await snapshotForTrial(userId, plan);
  }
  return await snapshotForPaid(userId, plan);
}

/**
 * Idempotent metered-overage write to Stripe. Call AFTER a successful
 * LLM call IF the call exhausted the inclusive allowance AND the
 * subscription has `overageEnabled=true`. Caller passes a stable
 * `sourceKey` (e.g. ConversationMessage id, AgentTask id) so retries
 * are no-ops.
 *
 * Two-phase write:
 *   1. INSERT OverageBillingRecord(status='pending'). The
 *      `sourceKey` unique index makes this a no-op for retries —
 *      the second insert hits the constraint and we return early.
 *   2. POST /v1/subscription_items/:id/usage_records to Stripe.
 *      On success: UPDATE row with stripeUsageRecordId + status='billed'.
 *      On failure: UPDATE row with errorMessage + status='failed' so a
 *      reconcile cron can retry.
 *
 * Stripe-side idempotency is also keyed on `sourceKey` via the
 * `Idempotency-Key` HTTP header so a partial-failure retry within
 * a small window is also safe at the Stripe API level.
 *
 * @deprecated Stage 3c replaced metered overage with one-time
 * `consumeCredits` against the firm's Credit pool. recordOverageUsage
 * remains for any legacy per-seat subs still on the metered price
 * until Stage 3f deletes both. New code should call `consumeCredits`.
 */
export async function recordOverageUsage(opts: {
  userId: string;
  sourceKey: string;
  sourceKind: "chat" | "agent_run" | "artifact_generate" | "context_extract";
  tokens: number;
}): Promise<void> {
  if (opts.tokens <= 0) return;

  const plan = await resolveUserPlan(opts.userId);
  if (plan.planKey === "free") return; // never bill trial users

  const sub = plan.subscriptionId
    ? await prisma.subscription.findUnique({
        where: { id: plan.subscriptionId },
        select: {
          overageEnabled: true,
          stripeOverageItemId: true,
        },
      })
    : null;

  if (!sub?.overageEnabled || !sub.stripeOverageItemId) {
    // Should never reach here in practice — assertBudget throws
    // when overage is disabled or unconfigured. Log for ops and
    // bail out so we never silently accept tokens we can't bill.
    console.warn(
      `[overage] skipped sourceKey=${opts.sourceKey} reason=overage-not-enabled`,
    );
    return;
  }

  const usdPer1k = overageUsdPer1k(plan.planKey);
  const usdBilled = Math.round((opts.tokens / 1000) * usdPer1k * 10_000) / 10_000;

  // Phase 1: idempotency ledger row. Unique on sourceKey — repeated
  // attempts no-op on the constraint violation.
  let record;
  try {
    record = await prisma.overageBillingRecord.create({
      data: {
        userId: opts.userId,
        sourceKey: opts.sourceKey,
        sourceKind: opts.sourceKind,
        tokens: opts.tokens,
        usdBilled,
        stripeSubscriptionItemId: sub.stripeOverageItemId,
        status: "pending",
      },
    });
  } catch (err) {
    // P2002 (unique constraint) → already billed. Treat as success.
    if (err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "P2002") {
      return;
    }
    throw err;
  }

  // Phase 2: post the Stripe meter event. Failure leaves the row
  // as `pending` for the reconciliation cron to retry. We do NOT
  // bubble this up — the user already got their model response and
  // billing fail-stop should not break their session.
  //
  // Stripe SDK 22.x replaced `subscriptionItems.createUsageRecord`
  // with the new Billing Meters API. The price configured against
  // the user's subscription item carries the meter `event_name`
  // (e.g. `practiq_overage_tokens`); we look it up via env so
  // operators can configure it without a code change. The
  // `identifier` field is what Stripe uses for idempotency over a
  // 24h window — pairing it with `sourceKey` ensures that a single
  // logical operation never double-bills even across retries.
  try {
    const { getStripe } = await import("@/lib/stripe/client");
    const stripe = getStripe();
    const eventName =
      process.env.STRIPE_OVERAGE_METER_EVENT ?? "practiq_overage_tokens";
    const customerId = await resolveStripeCustomerId(opts.userId);
    if (!customerId) {
      throw new Error(`no stripe_customer_id for user`);
    }
    const meterEvent = await stripe.billing.meterEvents.create(
      {
        event_name: eventName,
        identifier: `overage:${opts.sourceKey}`,
        timestamp: Math.floor(Date.now() / 1000),
        payload: {
          stripe_customer_id: customerId,
          value: String(opts.tokens),
        },
      },
      {
        // Belt-and-braces: SDK-level idempotency in addition to the
        // event identifier so a TCP-retry within milliseconds doesn't
        // even reach the meter.
        idempotencyKey: `overage:${opts.sourceKey}`,
      },
    );

    await prisma.overageBillingRecord.update({
      where: { id: record.id },
      data: {
        stripeUsageRecordId: meterEvent.identifier,
        status: "billed",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Don't include the userId or stripeSubscriptionItemId in
    // operator-visible error messages — those leak across our log
    // pipelines. The DB row already has them.
    console.warn(
      `[overage] stripe write failed sourceKey=${opts.sourceKey} reason=${message.slice(0, 200)}`,
    );
    await prisma.overageBillingRecord.update({
      where: { id: record.id },
      data: {
        status: "failed",
        errorMessage: message.slice(0, 1000),
      },
    });
  }
}

/**
 * Stage 3c (2026-05-16) — firm-wide Credit pool consumption.
 *
 * Decrement the user's Credit rows in FIFO order (oldest pack first)
 * by `tokens`. Idempotent on `sourceKey` via the CreditLedger UNIQUE
 * constraint: a retried call with the same source key returns the
 * prior consumed count without touching the Credit rows.
 *
 * Use this AFTER a billable LLM call lands when the per-client
 * subscription allowance is exhausted but credits remain. The base
 * allowance (clientCount × tokensPerClientPerMonth) is consumed
 * automatically via UsageEvent rows; consumeCredits only fires for
 * tokens beyond that allowance.
 *
 * Returns:
 *   - consumed: tokens actually deducted from Credit rows
 *   - shortfall: tokens NOT covered (allowance + credits both
 *     exhausted) — caller decides whether to hard-stop or grace
 *
 * Transaction safety: SELECT ... FOR UPDATE serializes concurrent
 * consumers on the same firm. The ledger row is always inserted
 * (even when consumed=0) so retries collapse on the unique
 * constraint and the caller's bookkeeping stays clean.
 */
export async function consumeCredits(opts: {
  userId: string;
  sourceKey: string;
  sourceKind: "chat" | "agent_run" | "artifact_generate" | "context_extract";
  tokens: number;
}): Promise<{ consumed: number; shortfall: number }> {
  if (opts.tokens <= 0) return { consumed: 0, shortfall: 0 };

  // Idempotency pre-check: if we've already written a ledger row for
  // this sourceKey, return what was consumed before without touching
  // Credit rows again.
  const existing = await prisma.creditLedger.findUnique({
    where: { sourceKey: opts.sourceKey },
    select: { tokens: true },
  });
  if (existing) {
    return {
      consumed: existing.tokens,
      shortfall: Math.max(0, opts.tokens - existing.tokens),
    };
  }

  return await prisma.$transaction(async (tx) => {
    // FIFO consume via SELECT ... FOR UPDATE. Postgres locks the
    // selected Credit rows for the duration of the transaction so a
    // concurrent caller for the same firm waits rather than racing.
    const rows = await tx.$queryRaw<
      Array<{ id: string; tokens_remaining: bigint }>
    >`
      SELECT id, tokens_remaining FROM practiq.credits
      WHERE user_id = ${opts.userId} AND tokens_remaining > 0
      ORDER BY purchased_at ASC
      FOR UPDATE
    `;

    let remaining = opts.tokens;
    const consumedFrom: Array<{ creditId: string; tokens: number }> = [];
    for (const c of rows) {
      if (remaining <= 0) break;
      const available = Number(c.tokens_remaining);
      const take = Math.min(remaining, available);
      await tx.credit.update({
        where: { id: c.id },
        data: { tokensRemaining: { decrement: BigInt(take) } },
      });
      consumedFrom.push({ creditId: c.id, tokens: take });
      remaining -= take;
    }

    const consumed = opts.tokens - remaining;

    // Always write the ledger row, even when consumed=0 (e.g. firm
    // has zero credit packs). The UNIQUE on sourceKey makes a retry
    // a no-op so the caller's accounting is consistent.
    await tx.creditLedger.create({
      data: {
        userId: opts.userId,
        sourceKey: opts.sourceKey,
        sourceKind: opts.sourceKind,
        tokens: consumed,
        consumedFrom,
      },
    });

    return { consumed, shortfall: remaining };
  });
}

/**
 * Demo-zone (anonymous) check. IP-based, rolling 24h window. Used
 * by /api/demo/chat. Returns the snapshot when the request is
 * allowed; throws `BudgetExceededError` with `reason="demo_exceeded"`
 * when the IP has exhausted its 5K-token-per-day cap.
 *
 * NOTE: this routes through the existing `checkRateLimit` sliding-
 * window store (KV in prod, memory in dev). The "limit" passed to
 * checkRateLimit is the SUM of token quantities consumed so far,
 * which we approximate by calling `consumeDemoTokens` after the
 * model call lands. The check here is a pre-flight that enforces
 * "this IP has not exhausted its daily allowance".
 */
export async function assertDemoBudget(ip: string): Promise<BudgetSnapshot> {
  // Pre-flight: peek at current consumption without incrementing.
  const used = await readDemoUsage(ip);
  const allowance = DEMO_ZONE.tokensPerIpPerDay;
  const exceeded = used >= allowance;

  const now = new Date();
  const periodStart = new Date(now.getTime() - DEMO_ZONE.windowMs);
  const snap: BudgetSnapshot = {
    userId: null,
    planKey: "demo",
    tier: null,
    clientCount: 0,
    baseAllowance: 0,
    periodStart,
    periodEnd: now,
    allowance,
    used,
    fractionUsed: Math.min(1, allowance > 0 ? used / allowance : 0),
    remaining: Math.max(0, allowance - used),
    exceeded,
    overageEnabled: false,
  };

  if (exceeded) {
    // Next.js App Router route group (auth) is invisible in URLs, so
    // the signup page URL is /signup (not /auth/signup which would 404).
    throw new BudgetExceededError("demo_exceeded", snap, "/signup");
  }
  return snap;
}

/**
 * Increment the demo-zone token counter for an IP after a successful
 * model call. The counter is stored in the rate-limit KV store under
 * a dedicated namespace so it doesn't collide with the request-rate
 * limiter for the same endpoint.
 */
export async function consumeDemoTokens(ip: string, tokens: number): Promise<void> {
  if (tokens <= 0) return;
  // The shared store represents counts as a list of recent timestamps.
  // We append `tokens` synthetic hits so a 1500-token call advances
  // the bucket by 1500. checkRateLimit's allowance check then enforces
  // the per-day total naturally.
  for (let i = 0; i < tokens; i++) {
    // We deliberately don't read the result — checkRateLimit will
    // happily exceed the limit on a single call. The pre-flight
    // assertDemoBudget catches the over-cap state on the NEXT
    // request. This is fine: the demo cap is a soft fence (small
    // overshoot is acceptable) and a hard fence at the model level
    // is provided by the per-call max-tokens cap.
    await checkRateLimit({
      namespace: "demo/tokens",
      identity: `ip:${ip}`,
      limit: DEMO_ZONE.tokensPerIpPerDay,
      windowMs: DEMO_ZONE.windowMs,
    });
  }
}

// ─── Internals ────────────────────────────────────────────────────

async function readDemoUsage(ip: string): Promise<number> {
  // checkRateLimit doesn't expose a peek primitive, so we do a
  // dry-run check with a limit set to 1 above the cap and read
  // the `remaining` field to reverse-engineer the count. This is
  // a small wart but keeps the sliding-window semantics exactly
  // aligned with the limiter the rest of the app uses.
  const result = await checkRateLimit({
    namespace: "demo/tokens",
    identity: `ip:${ip}`,
    limit: DEMO_ZONE.tokensPerIpPerDay + 1,
    windowMs: DEMO_ZONE.windowMs,
  });
  // After the dry-run, remaining = (allowance + 1) - hitsInWindow,
  // and the dry-run added one hit. So used = allowance - remaining.
  return Math.max(0, DEMO_ZONE.tokensPerIpPerDay - result.remaining);
}

async function snapshotForTrial(
  userId: string,
  plan: ResolvedPlan,
): Promise<BudgetSnapshot> {
  // Trial window: 14 days from User.createdAt
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { createdAt: true },
  });
  const now = new Date();
  const periodStart = user?.createdAt ?? now;
  const periodEnd = new Date(
    periodStart.getTime() + FREE_TRIAL.trialDurationDays * 24 * 60 * 60 * 1000,
  );

  // If trial expired, still report a snapshot so the route can decide
  // (the plan-gate already returns "trial_expired" earlier).
  const allowance = FREE_TRIAL.trialTotalTokens;
  const used = await sumTokensInWindow(userId, periodStart, now);
  return {
    userId,
    planKey: "free",
    // Stage 3c: trial users get tier='trial' (inside window) or null
    // (expired). Plan-gate already enforces the 3-client trial cap;
    // credits don't apply to trial users (D8).
    tier: plan.tier,
    clientCount: 0,
    baseAllowance: 0,
    periodStart,
    periodEnd,
    allowance,
    used,
    fractionUsed: Math.min(1, allowance > 0 ? used / allowance : 0),
    remaining: Math.max(0, allowance - used),
    exceeded: used >= allowance,
    overageEnabled: false,
  };
}

async function snapshotForPaid(
  userId: string,
  plan: ResolvedPlan,
): Promise<BudgetSnapshot> {
  const { periodStart, periodEnd } = await resolveBillingWindow(userId, plan);
  const used = await sumTokensInWindow(userId, periodStart, periodEnd);

  // Stage 3c (2026-05-16) — per-client allowance branch.
  // When `tier !== null` (sub on the new per-client price), allowance is
  // `clientCount × tokensPerClientPerMonth` PLUS the firm-wide credit
  // pool sum. Credits never expire and don't reset with the billing
  // period, so they sit on top of the monthly per-client allowance.
  // The legacy `overage_enabled / stripeOverageItemId / Stripe billing
  // meter events` path is dead for per-client subs — credits replace it.
  if (plan.tier === "founding" || plan.tier === "standard") {
    const baseAllowance =
      plan.clientCount * PER_CLIENT_PRICING.tokensPerClientPerMonth;
    const creditBalance = await sumCreditBalance(userId);
    const totalAllowance = baseAllowance + Number(creditBalance);
    return {
      userId,
      planKey: plan.planKey,
      tier: plan.tier,
      clientCount: plan.clientCount,
      baseAllowance,
      periodStart,
      periodEnd,
      allowance: totalAllowance,
      used,
      fractionUsed: Math.min(1, totalAllowance > 0 ? used / totalAllowance : 0),
      remaining: Math.max(0, totalAllowance - used),
      exceeded: used >= totalAllowance,
      // For per-client subs, "overage" doesn't apply — credits are an
      // explicit pre-purchase. `overageEnabled` stays false; the
      // caller-facing path is `consumeCredits` (idempotent FIFO) after
      // the base allowance is exhausted, which assertBudget handles
      // by *not* throwing when totalAllowance is still positive.
      overageEnabled: false,
    };
  }

  // Legacy per-seat path (tier=null on active legacy sub). Drops in 3f.
  const allowance = tokenAllowance(plan.planKey);

  // Overage availability: subscription must have overageEnabled AND a
  // stripeOverageItemId AND the plan must declare an overage price.
  let overageEnabled = false;
  if (plan.subscriptionId) {
    const sub = await prisma.subscription.findUnique({
      where: { id: plan.subscriptionId },
      select: {
        overageEnabled: true,
        stripeOverageItemId: true,
      },
    });
    overageEnabled = Boolean(
      sub?.overageEnabled &&
        sub.stripeOverageItemId &&
        overagePriceId(plan.planKey),
    );
  }

  return {
    userId,
    planKey: plan.planKey,
    // Legacy per-seat path: tier stays null, clientCount/baseAllowance
    // zero. New code branching on tier never enters credit-consumption
    // logic here.
    tier: null,
    clientCount: 0,
    baseAllowance: 0,
    periodStart,
    periodEnd,
    allowance,
    used,
    fractionUsed: Math.min(1, allowance > 0 ? used / allowance : 0),
    remaining: Math.max(0, allowance - used),
    exceeded: used >= allowance,
    overageEnabled,
  };
}

/**
 * Sum the firm's remaining credit balance (BigInt → number for
 * snapshot math). 50 stacked $10 packs = 50M tokens fits in a JS
 * Number; we coerce after the SUM aggregation rather than carrying
 * BigInt through all the budget math.
 */
async function sumCreditBalance(userId: string): Promise<bigint> {
  const agg = await prisma.credit.aggregate({
    where: { userId },
    _sum: { tokensRemaining: true },
  });
  // BigInt(0) instead of `0n` literal — the tsconfig target predates
  // ES2020 BigInt literal syntax, so the constructor form is required.
  return agg._sum.tokensRemaining ?? BigInt(0);
}

async function sumTokensInWindow(
  userId: string,
  start: Date,
  end: Date,
): Promise<number> {
  const agg = await prisma.usageEvent.aggregate({
    where: {
      userId,
      createdAt: { gte: start, lte: end },
    },
    _sum: {
      inputTokens: true,
      outputTokens: true,
    },
  });
  return (agg._sum.inputTokens ?? 0) + (agg._sum.outputTokens ?? 0);
}

async function resolveStripeCustomerId(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });
  return user?.stripeCustomerId ?? null;
}

async function resolveBillingWindow(
  userId: string,
  plan: ResolvedPlan,
): Promise<{ periodStart: Date; periodEnd: Date }> {
  if (plan.subscriptionId) {
    const sub = await prisma.subscription.findUnique({
      where: { id: plan.subscriptionId },
      select: { currentPeriodStart: true, currentPeriodEnd: true },
    });
    if (sub) {
      return {
        periodStart: sub.currentPeriodStart,
        periodEnd: sub.currentPeriodEnd,
      };
    }
  }
  // Fallback: rolling 30 days. Used for paid users whose Stripe sync
  // hasn't landed yet (rare race during checkout).
  const now = new Date();
  return {
    periodStart: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    periodEnd: now,
  };
}

/**
 * Build the JSON refusal body for routes to return when a budget is
 * tripped. Keeps the shape consistent across demo/trial/budget/overage
 * variants so the frontend dispatches on `error` only.
 */
export function budgetRefusalBody(err: BudgetExceededError): BudgetRefusalBody {
  const isDemo = err.reason === "demo_exceeded";
  return {
    error: err.reason,
    message: messageForReason(err),
    upgradeUrl: err.upgradeUrl,
    signupUrl: isDemo ? "/signup" : undefined,
    overageEnabled: err.snapshot.overageEnabled,
    used: err.snapshot.used,
    allowance: err.snapshot.allowance,
  };
}

function messageForReason(err: BudgetExceededError): string {
  switch (err.reason) {
    case "demo_exceeded":
      return "Sign up to continue exploring.";
    case "trial_exceeded":
      return `Your 14-day trial allowance (${err.snapshot.allowance.toLocaleString()} tokens) is exhausted. Upgrade to keep going.`;
    case "budget_exceeded":
      return `You've used your monthly token allowance. Enable overage in /billing or upgrade your plan.`;
    case "overage_unavailable":
      return `Overage billing is not configured for your plan. Contact support to enable.`;
  }
}
