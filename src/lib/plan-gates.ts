/**
 * Plan-aware authorization helpers.
 *
 * Every paid-feature API route should call into this module before
 * doing the work — never decide based on session presence alone. The
 * gates pull the user's active subscription, fall back to the free
 * trial state for unsubscribed users, and either return capability
 * info or a structured refusal that the route layer turns into a
 * 402/403 response with an upgrade CTA.
 *
 * Plan resolution (in order of precedence):
 *   1. Active subscription with status ∈ {active, trialing, past_due}
 *      → that plan's capabilities apply.
 *   2. No subscription, signup within trial window
 *      → "free" trial caps apply (1 client, 50 chat msg/mo, no agent).
 *   3. No subscription, trial expired
 *      → all paid features blocked, only read access to existing data.
 *
 * Why a single source of truth: the audit found ~13 plan claims spread
 * across PLANS, the pricing page, and several API routes — most
 * unenforced. This module collapses every plan check to one helper so
 * adding a new gate or rebalancing the pricing tier is a one-file edit.
 */

import { prisma } from "@/lib/prisma";
import {
  PLANS,
  FREE_TRIAL,
  chatMessageCap,
  clientCeiling,
  capabilitiesForPlan,
  seatCap,
  type PlanKey,
  type PlanCapabilities,
} from "@/lib/stripe/plans";

export interface ResolvedPlan {
  /** The plan key in effect right now ("free" if no active sub). */
  planKey: PlanKey;
  /** Subscription DB row, if any. */
  subscriptionId: string | null;
  /** Stripe subscription status, or "trial" / "expired". */
  status: "active" | "trialing" | "past_due" | "trial" | "expired";
  /** Whether the user is in the 14-day free trial window. */
  inTrialWindow: boolean;
  /** ISO date string when the trial window ends. null if subscribed. */
  trialEndsAt: string | null;
  /** Whether the user is on the Founding Member discounted Practice price. */
  isFoundingMember: boolean;
  /** Number of seats actually available (Stripe quantity for paid). */
  seatCount: number;
  /** Capabilities object derived from the plan. */
  capabilities: PlanCapabilities;
}

/**
 * Resolve the effective plan for a user. Pure read; never mutates.
 * Cache the result per-request — chat / client / invite handlers all
 * call this and don't need to hit the DB twice.
 */
export async function resolveUserPlan(userId: string): Promise<ResolvedPlan> {
  const [user, sub] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, createdAt: true },
    }),
    prisma.subscription.findFirst({
      where: { userId, status: { in: ["active", "trialing", "past_due"] } },
      select: {
        id: true,
        plan: true,
        status: true,
        seatCount: true,
        stripePriceId: true,
        currentPeriodEnd: true,
      },
    }),
  ]);

  if (!user) {
    // Caller should have done the auth check first, but in case it
    // didn't — return the most-restrictive shape.
    return {
      planKey: "free",
      subscriptionId: null,
      status: "expired",
      inTrialWindow: false,
      trialEndsAt: null,
      isFoundingMember: false,
      seatCount: 0,
      capabilities: capabilitiesForPlan("free"),
    };
  }

  if (sub && (sub.status === "active" || sub.status === "trialing")) {
    const planKey = (sub.plan as PlanKey) ?? "solo";
    // Founding member detection: lazy-import the env var so the
    // check works even if the price IDs aren't loaded at module init.
    const isFounding =
      sub.stripePriceId ===
      (process.env.STRIPE_PRICE_PRACTICE_FOUNDING?.trim() || null);
    return {
      planKey,
      subscriptionId: sub.id,
      status: sub.status as "active" | "trialing",
      inTrialWindow: sub.status === "trialing",
      trialEndsAt: sub.status === "trialing" ? sub.currentPeriodEnd.toISOString() : null,
      isFoundingMember: isFounding,
      seatCount: sub.seatCount,
      capabilities: capabilitiesForPlan(planKey),
    };
  }

  // No active subscription — check if we're inside the 14-day free
  // trial window from signup.
  const trialMs = FREE_TRIAL.trialDurationDays * 24 * 60 * 60 * 1000;
  const trialEnds = new Date(user.createdAt.getTime() + trialMs);
  const inTrialWindow = Date.now() < trialEnds.getTime();

  return {
    planKey: "free",
    subscriptionId: null,
    status: inTrialWindow ? "trial" : "expired",
    inTrialWindow,
    trialEndsAt: trialEnds.toISOString(),
    isFoundingMember: false,
    seatCount: 1,
    capabilities: capabilitiesForPlan("free"),
  };
}

export interface GateResult {
  allowed: boolean;
  /** Human-readable reason. Surface to UI when allowed=false. */
  reason?: string;
  /** Stable error code for UI dispatch (e.g. show specific upgrade modal). */
  code?:
    | "trial_expired"
    | "client_ceiling"
    | "chat_monthly_cap"
    | "seat_cap"
    | "feature_not_in_plan";
  /** Suggested upgrade target plan, when applicable. */
  upgradeTo?: PlanKey;
}

/**
 * Standard refusal shape for API routes — turns a GateResult into a
 * JSON body suitable for the client to render an upgrade CTA.
 */
export function gateRefusalBody(g: GateResult): Record<string, unknown> {
  return {
    error: g.reason ?? "Plan limit reached",
    code: g.code ?? "feature_not_in_plan",
    upgradeTo: g.upgradeTo ?? "practice",
    upgradeUrl: g.upgradeTo
      ? `/pricing?upgrade=${g.upgradeTo}`
      : "/pricing",
  };
}

// ─── Specific gates ─────────────────────────────────────────────────────

/**
 * Gate for creating a new Client workspace. Counts user's existing
 * clients and compares to plan ceiling.
 */
export async function gateClientCreation(
  userId: string,
  resolved?: ResolvedPlan,
): Promise<GateResult> {
  const plan = resolved ?? (await resolveUserPlan(userId));

  if (plan.status === "expired") {
    return {
      allowed: false,
      reason:
        "Your free trial has ended. Subscribe to add more clients.",
      code: "trial_expired",
      upgradeTo: "solo",
    };
  }

  const ceiling = clientCeiling(plan.planKey);
  if (ceiling === null) return { allowed: true };

  const existing = await prisma.client.count({ where: { userId } });
  if (existing >= ceiling) {
    const upgradeTo: PlanKey =
      plan.planKey === "free"
        ? "solo"
        : plan.planKey === "solo"
          ? "practice"
          : plan.planKey === "practice"
            ? "firm"
            : "firm";
    return {
      allowed: false,
      reason: `Your ${plan.planKey} plan is capped at ${ceiling} clients.`,
      code: "client_ceiling",
      upgradeTo,
    };
  }

  return { allowed: true };
}

/**
 * Gate for sending a chat message. Counts UsageEvent rows of kind
 * "chat" within the current billing period (or last 30d for free
 * trial) and compares to plan cap.
 *
 * Returning `allowed: true` does NOT consume the quota — the caller
 * must write a UsageEvent after the chat completes (so cancelled or
 * errored requests don't burn the cap).
 */
export async function gateChatMessage(
  userId: string,
  resolved?: ResolvedPlan,
): Promise<GateResult & { usage?: number; cap?: number }> {
  const plan = resolved ?? (await resolveUserPlan(userId));

  if (plan.status === "expired") {
    return {
      allowed: false,
      reason: "Your free trial has ended. Subscribe to keep chatting.",
      code: "trial_expired",
      upgradeTo: "solo",
    };
  }

  const cap = chatMessageCap(plan.planKey);
  if (cap === null) return { allowed: true };

  // Period start: subscription's current_period_start if subscribed,
  // else 30 days ago for trial users (rolling window).
  const periodStart = await getCurrentPeriodStart(userId, plan);
  const usage = await prisma.usageEvent.count({
    where: {
      userId,
      kind: "chat",
      createdAt: { gte: periodStart },
    },
  });

  if (usage >= cap) {
    const upgradeTo: PlanKey =
      plan.planKey === "free"
        ? "solo"
        : plan.planKey === "solo"
          ? "practice"
          : plan.planKey === "practice"
            ? "firm"
            : "firm";
    return {
      allowed: false,
      reason: `You've used ${usage} of ${cap} chat messages this period.`,
      code: "chat_monthly_cap",
      upgradeTo,
      usage,
      cap,
    };
  }

  return { allowed: true, usage, cap };
}

/**
 * Gate for inviting a new teammate. Counts existing UserClientMapping
 * rows + outstanding TeamInvite rows and compares to plan seat cap.
 *
 * NOTE: this counts ANY mapping the inviting user owns, since seat
 * billing is per-firm not per-client in this product. Refining
 * "firm membership" requires a Firm/Tenant model, which is a Phase-2
 * lift; for cycle-1, "all of an owner's invites" approximates a firm.
 */
export async function gateTeamInvite(
  userId: string,
  resolved?: ResolvedPlan,
): Promise<GateResult> {
  const plan = resolved ?? (await resolveUserPlan(userId));

  if (plan.planKey === "free" || plan.planKey === "solo") {
    return {
      allowed: false,
      reason:
        plan.planKey === "free"
          ? "Team invites require a paid plan. Upgrade to Practice to add teammates."
          : "Solo plan is single-seat. Upgrade to Practice to add teammates.",
      code: "feature_not_in_plan",
      upgradeTo: "practice",
    };
  }

  const cap = seatCap(plan.planKey, plan.seatCount);
  // Existing accepted mappings + pending invites count toward cap.
  const [accepted, pending] = await Promise.all([
    prisma.userClientMapping.count({
      where: { client: { userId } },
    }),
    prisma.teamInvite.count({
      where: {
        senderId: userId,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    }),
  ]);
  const used = accepted + pending;

  if (used >= cap) {
    return {
      allowed: false,
      reason: `Your ${plan.planKey} plan covers ${cap} seats. Add another seat from settings.`,
      code: "seat_cap",
      upgradeTo: plan.planKey === "practice" ? "firm" : "firm",
    };
  }

  return { allowed: true };
}

/**
 * Gate for the nightly background-agent cron. Returns true only if the
 * user has an active paid subscription with `backgroundAgent` enabled
 * for that plan. Free-trial and expired users are NEVER auto-run —
 * paid users opt in via `briefingEnabled`.
 */
export async function gateBackgroundAgent(userId: string): Promise<boolean> {
  const plan = await resolveUserPlan(userId);
  if (plan.status !== "active" && plan.status !== "trialing") return false;
  return plan.capabilities.backgroundAgent === true;
}

/**
 * Gate for "team routing" features (Approval Queue assignment,
 * cross-teammate notifications). Truthy on Practice and above.
 */
export function gateTeamRouting(plan: ResolvedPlan): GateResult {
  if (plan.capabilities.teamRouting) return { allowed: true };
  return {
    allowed: false,
    reason: "Approval routing requires the Practice plan or higher.",
    code: "feature_not_in_plan",
    upgradeTo: "practice",
  };
}

/**
 * Gate for RBAC enforcement (member/viewer roles on UserClientMapping
 * are honored). On Solo/free this returns false and we treat every
 * mapping as full-access.
 */
export function gateRbac(plan: ResolvedPlan): boolean {
  return plan.capabilities.rbac;
}

// ─── Helpers ────────────────────────────────────────────────────────────

/**
 * Resolve the start of the current billing period for usage gates.
 * For paid users: the active subscription's current_period_start.
 * For trial / free / expired: a rolling 30-day window from now.
 */
async function getCurrentPeriodStart(
  userId: string,
  plan: ResolvedPlan,
): Promise<Date> {
  if (plan.subscriptionId) {
    const sub = await prisma.subscription.findUnique({
      where: { id: plan.subscriptionId },
      select: { currentPeriodStart: true },
    });
    if (sub) return sub.currentPeriodStart;
  }
  return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
}

/**
 * Cost-aware UsageEvent writer. Call this AFTER a chat / agent / artifact
 * Claude call completes (success OR error if any tokens were charged).
 * Idempotent only by primary key — caller must not double-write.
 */
export async function recordUsage(opts: {
  userId: string;
  kind: "chat" | "agent_run" | "artifact_generate" | "context_extract";
  agentType?: string;
  clientId?: string;
  inputTokens?: number;
  outputTokens?: number;
  provider: "sdk" | "openrouter" | "cli";
  model?: string;
}): Promise<void> {
  try {
    await prisma.usageEvent.create({
      data: {
        userId: opts.userId,
        kind: opts.kind,
        agentType: opts.agentType,
        clientId: opts.clientId,
        inputTokens: opts.inputTokens ?? 0,
        outputTokens: opts.outputTokens ?? 0,
        provider: opts.provider,
        model: opts.model,
      },
    });
  } catch (err) {
    // Ops-side recording must never break user flow.
    console.warn("[usage] recordUsage failed:", err);
  }
}

/**
 * Helper: load the plan + remaining-quota fields the front-end shows
 * on /app/settings billing page. Rolled into one trip to avoid a
 * waterfall.
 */
export async function loadPlanForUi(userId: string): Promise<{
  plan: ResolvedPlan;
  usage: { chat: number; clients: number; teammates: number };
  limits: {
    chat: number | null;
    clients: number | null;
    seats: number;
  };
}> {
  const plan = await resolveUserPlan(userId);
  const periodStart = await getCurrentPeriodStart(userId, plan);
  const [chatUsage, clientCount, teammateCount] = await Promise.all([
    prisma.usageEvent.count({
      where: { userId, kind: "chat", createdAt: { gte: periodStart } },
    }),
    prisma.client.count({ where: { userId } }),
    prisma.userClientMapping.count({ where: { client: { userId } } }),
  ]);
  return {
    plan,
    usage: { chat: chatUsage, clients: clientCount, teammates: teammateCount },
    limits: {
      chat: chatMessageCap(plan.planKey),
      clients: clientCeiling(plan.planKey),
      seats:
        plan.planKey === "free"
          ? FREE_TRIAL.includedSeats
          : seatCap(plan.planKey, plan.seatCount),
    },
  };
}
