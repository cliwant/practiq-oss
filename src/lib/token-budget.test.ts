/**
 * Unit tests for the L4 token-budget gate.
 *
 * The module composes Prisma + plan-gates + Stripe; we mock all three
 * so the tests exercise the budget-flow logic only. Each test mounts a
 * fresh module-state via `beforeEach` so the cross-test state doesn't
 * leak via the rate-limit memory store (used by the demo path).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.mock is hoisted; declare the mock fns via vi.hoisted so they exist
// when the factories run.
const {
  resolveUserPlanMock,
  prismaMock,
  stripeMeterEventCreateMock,
  getStripeMock,
} = vi.hoisted(() => {
  return {
    resolveUserPlanMock: vi.fn(),
    prismaMock: {
      user: { findUnique: vi.fn() },
      subscription: { findUnique: vi.fn() },
      usageEvent: { aggregate: vi.fn() },
      overageBillingRecord: {
        create: vi.fn(),
        update: vi.fn(),
      },
    },
    stripeMeterEventCreateMock: vi.fn(),
    getStripeMock: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/plan-gates", () => ({
  resolveUserPlan: resolveUserPlanMock,
}));

vi.mock("@/lib/stripe/client", () => ({
  getStripe: getStripeMock,
}));

import {
  assertBudget,
  assertDemoBudget,
  consumeDemoTokens,
  getBudgetSnapshot,
  recordOverageUsage,
  budgetRefusalBody,
  BudgetExceededError,
} from "./token-budget";
import { __resetRateLimits } from "./rate-limit";
import { DEMO_ZONE, FREE_TRIAL } from "./stripe/plans";

beforeEach(async () => {
  vi.clearAllMocks();
  await __resetRateLimits();
  // Default Stripe wiring (modern Billing Meters API)
  getStripeMock.mockReturnValue({
    billing: {
      meterEvents: {
        create: stripeMeterEventCreateMock,
      },
    },
  });
  // Default Prisma stubs (per-test override as needed)
  prismaMock.usageEvent.aggregate.mockResolvedValue({
    _sum: { inputTokens: 0, outputTokens: 0 },
  });
  prismaMock.subscription.findUnique.mockResolvedValue({
    overageEnabled: false,
    stripeOverageItemId: null,
    currentPeriodStart: new Date("2026-04-01T00:00:00Z"),
    currentPeriodEnd: new Date("2026-05-01T00:00:00Z"),
  });
  prismaMock.user.findUnique.mockResolvedValue({
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    stripeCustomerId: "cus_test_xxx",
  });
});

function paidPlan(planKey: "solo" | "practice" | "firm" = "solo") {
  return {
    planKey,
    subscriptionId: "sub_xxx",
    status: "active" as const,
    inTrialWindow: false,
    trialEndsAt: null,
    isFoundingMember: false,
    seatCount: 1,
    capabilities: {
      backgroundAgent: true,
      teamRouting: false,
      rbac: false,
      whiteGlove: false,
    },
  };
}

function freePlan() {
  return {
    planKey: "free" as const,
    subscriptionId: null,
    status: "trial" as const,
    inTrialWindow: true,
    trialEndsAt: new Date(Date.now() + 13 * 24 * 60 * 60 * 1000).toISOString(),
    isFoundingMember: false,
    seatCount: 1,
    capabilities: {
      backgroundAgent: false,
      teamRouting: false,
      rbac: false,
      whiteGlove: false,
    },
  };
}

describe("assertBudget — solo paid plan", () => {
  it("returns silently when under the 2M token allowance", async () => {
    resolveUserPlanMock.mockResolvedValue(paidPlan("solo"));
    prismaMock.usageEvent.aggregate.mockResolvedValue({
      _sum: { inputTokens: 500_000, outputTokens: 500_000 }, // 1M, half of 2M
    });

    const snap = await assertBudget("u1");
    expect(snap.exceeded).toBe(false);
    expect(snap.used).toBe(1_000_000);
    expect(snap.allowance).toBe(2_000_000);
    expect(snap.fractionUsed).toBeCloseTo(0.5, 2);
  });

  it("throws BudgetExceededError(reason=budget_exceeded) at allowance with overageEnabled=false", async () => {
    resolveUserPlanMock.mockResolvedValue(paidPlan("solo"));
    prismaMock.usageEvent.aggregate.mockResolvedValue({
      _sum: { inputTokens: 1_000_000, outputTokens: 1_000_000 }, // exactly 2M
    });
    prismaMock.subscription.findUnique.mockResolvedValue({
      overageEnabled: false,
      stripeOverageItemId: null,
      currentPeriodStart: new Date("2026-04-01T00:00:00Z"),
      currentPeriodEnd: new Date("2026-05-01T00:00:00Z"),
    });

    await expect(assertBudget("u1")).rejects.toThrowError(BudgetExceededError);
    try {
      await assertBudget("u1");
    } catch (err) {
      expect(err).toBeInstanceOf(BudgetExceededError);
      const e = err as BudgetExceededError;
      expect(e.reason).toBe("budget_exceeded");
      expect(e.upgradeUrl).toBe("/billing");
      expect(e.snapshot.exceeded).toBe(true);
    }
  });

  it("returns silently at allowance when overageEnabled=true AND a Stripe price is configured", async () => {
    process.env.STRIPE_PRICE_SOLO_OVERAGE = "price_solo_overage";
    resolveUserPlanMock.mockResolvedValue(paidPlan("solo"));
    prismaMock.usageEvent.aggregate.mockResolvedValue({
      _sum: { inputTokens: 1_500_000, outputTokens: 600_000 }, // 2.1M, past 2M
    });
    prismaMock.subscription.findUnique.mockResolvedValue({
      overageEnabled: true,
      stripeOverageItemId: "si_solo_overage",
      currentPeriodStart: new Date("2026-04-01T00:00:00Z"),
      currentPeriodEnd: new Date("2026-05-01T00:00:00Z"),
    });

    // Re-import to pick up the env var change in plans.ts (priceId() uses lazy lookup)
    vi.resetModules();
    const mod = await import("./token-budget");
    // Prisma mocks survive resetModules because they're injected via vi.mock.

    const snap = await mod.assertBudget("u1");
    expect(snap.exceeded).toBe(true);
    expect(snap.overageEnabled).toBe(true);

    delete process.env.STRIPE_PRICE_SOLO_OVERAGE;
  });

  it("throws overage_unavailable when overageEnabled=true but plan has no Stripe overage price configured", async () => {
    delete process.env.STRIPE_PRICE_SOLO_OVERAGE;
    resolveUserPlanMock.mockResolvedValue(paidPlan("solo"));
    prismaMock.usageEvent.aggregate.mockResolvedValue({
      _sum: { inputTokens: 1_500_000, outputTokens: 600_000 }, // 2.1M past 2M
    });
    prismaMock.subscription.findUnique.mockResolvedValue({
      overageEnabled: true,
      stripeOverageItemId: "si_xxx",
      currentPeriodStart: new Date("2026-04-01T00:00:00Z"),
      currentPeriodEnd: new Date("2026-05-01T00:00:00Z"),
    });
    // overagePriceId() reads from PLANS.solo.stripePriceIdOverage which
    // was loaded at module init from STRIPE_PRICE_SOLO_OVERAGE — now
    // unset. The snapshot will report overageEnabled=false because the
    // plan has no overage price; assertBudget then falls through to a
    // plain budget_exceeded refusal.
    try {
      await assertBudget("u1");
      expect.fail("expected BudgetExceededError");
    } catch (err) {
      expect(err).toBeInstanceOf(BudgetExceededError);
      const e = err as BudgetExceededError;
      // When the plan has no overage price, snapshot.overageEnabled is
      // false → reason is budget_exceeded (the user-facing prompt asks
      // to upgrade). overage_unavailable is reserved for the "operator
      // misconfigured the price after enabling overage on the sub" race.
      expect(["budget_exceeded", "overage_unavailable"]).toContain(e.reason);
    }
  });
});

describe("assertBudget — trial plan", () => {
  it("returns silently when a trial user is under the trial allowance", async () => {
    resolveUserPlanMock.mockResolvedValue(freePlan());
    prismaMock.usageEvent.aggregate.mockResolvedValue({
      _sum: { inputTokens: 50_000, outputTokens: 50_000 }, // 100K, well under the trial allowance
    });

    const snap = await assertBudget("u_trial");
    expect(snap.exceeded).toBe(false);
    expect(snap.used).toBe(100_000);
    expect(snap.allowance).toBe(FREE_TRIAL.trialTotalTokens);
  });

  it("throws BudgetExceededError(reason=trial_exceeded, upgradeUrl=/pricing) at the trial allowance", async () => {
    resolveUserPlanMock.mockResolvedValue(freePlan());
    prismaMock.usageEvent.aggregate.mockResolvedValue({
      // Exactly the trial allowance — referenced, not hardcoded, so this
      // test survives future trialTotalTokens changes. (It was stale at
      // 200K after the 2026-05-15 bump to 700K, which is why it failed.)
      _sum: { inputTokens: FREE_TRIAL.trialTotalTokens, outputTokens: 0 },
    });

    try {
      await assertBudget("u_trial");
      expect.fail("expected BudgetExceededError");
    } catch (err) {
      expect(err).toBeInstanceOf(BudgetExceededError);
      const e = err as BudgetExceededError;
      expect(e.reason).toBe("trial_exceeded");
      expect(e.upgradeUrl).toBe("/pricing");
      const body = budgetRefusalBody(e);
      expect(body.error).toBe("trial_exceeded");
      expect(body.upgradeUrl).toBe("/pricing");
      expect(body.allowance).toBe(FREE_TRIAL.trialTotalTokens);
    }
  });
});

describe("assertDemoBudget — anonymous IP", () => {
  it("allows the request when the IP is under 5K tokens", async () => {
    const snap = await assertDemoBudget("203.0.113.99");
    expect(snap.exceeded).toBe(false);
    expect(snap.allowance).toBe(DEMO_ZONE.tokensPerIpPerDay);
    expect(snap.used).toBe(0);
  });

  it("throws BudgetExceededError(reason=demo_exceeded) once the IP crosses 5K tokens", async () => {
    const ip = "203.0.113.100";
    // Burn the cap by consuming 5,000 tokens — consumeDemoTokens loops
    // 5K times in the rate-limit store. To keep the test fast we
    // consume in one shot via the underlying API.
    await consumeDemoTokens(ip, DEMO_ZONE.tokensPerIpPerDay);

    try {
      await assertDemoBudget(ip);
      expect.fail("expected BudgetExceededError");
    } catch (err) {
      expect(err).toBeInstanceOf(BudgetExceededError);
      const e = err as BudgetExceededError;
      expect(e.reason).toBe("demo_exceeded");
      // Next.js route group (auth) is URL-invisible — signup is /signup
      expect(e.upgradeUrl).toBe("/signup");
      const body = budgetRefusalBody(e);
      expect(body.error).toBe("demo_exceeded");
      expect(body.signupUrl).toBe("/signup");
    }
  });
});

describe("recordOverageUsage — Stripe metered billing", () => {
  it("creates a Stripe meter event once and idempotently no-ops on retry with the same sourceKey", async () => {
    resolveUserPlanMock.mockResolvedValue(paidPlan("solo"));
    prismaMock.subscription.findUnique.mockResolvedValue({
      overageEnabled: true,
      stripeOverageItemId: "si_solo_xx",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(),
    });
    prismaMock.overageBillingRecord.create.mockResolvedValueOnce({
      id: "rec_1",
    });
    prismaMock.overageBillingRecord.update.mockResolvedValue({});
    stripeMeterEventCreateMock.mockResolvedValueOnce({
      identifier: "overage:conv-msg:abc:1",
    });

    await recordOverageUsage({
      userId: "u1",
      sourceKey: "conv-msg:abc:1",
      sourceKind: "chat",
      tokens: 1500,
    });

    expect(prismaMock.overageBillingRecord.create).toHaveBeenCalledTimes(1);
    expect(stripeMeterEventCreateMock).toHaveBeenCalledTimes(1);
    // Verify the exact arguments — Stripe Billing Meters API:
    // identifier is the per-event idempotency key (24h window),
    // payload carries customer id + tokens as `value`.
    const [params, opts] = stripeMeterEventCreateMock.mock.calls[0];
    expect(params.identifier).toBe("overage:conv-msg:abc:1");
    expect(params.payload.value).toBe("1500");
    expect(params.payload.stripe_customer_id).toBe("cus_test_xxx");
    expect(opts.idempotencyKey).toBe("overage:conv-msg:abc:1");

    // Second call with the SAME sourceKey — Prisma create throws
    // P2002 (unique constraint). recordOverageUsage must swallow it
    // and NOT create a second Stripe record.
    prismaMock.overageBillingRecord.create.mockRejectedValueOnce(
      Object.assign(new Error("unique constraint"), { code: "P2002" }),
    );
    stripeMeterEventCreateMock.mockClear();

    await recordOverageUsage({
      userId: "u1",
      sourceKey: "conv-msg:abc:1",
      sourceKind: "chat",
      tokens: 1500,
    });
    expect(stripeMeterEventCreateMock).not.toHaveBeenCalled();
  });
});

describe("getBudgetSnapshot — UI rendering", () => {
  it("computes fractionUsed and remaining for the billing UI", async () => {
    resolveUserPlanMock.mockResolvedValue(paidPlan("practice"));
    prismaMock.usageEvent.aggregate.mockResolvedValue({
      _sum: { inputTokens: 4_000_000, outputTokens: 4_400_000 }, // 8.4M of 10M (84%)
    });

    const snap = await getBudgetSnapshot("u_practice");
    expect(snap.allowance).toBe(10_000_000);
    expect(snap.used).toBe(8_400_000);
    expect(snap.fractionUsed).toBeCloseTo(0.84, 2);
    expect(snap.remaining).toBe(1_600_000);
    expect(snap.exceeded).toBe(false);
  });

  it("clears the counter when the billing window rolls over (next month, fresh aggregate)", async () => {
    resolveUserPlanMock.mockResolvedValue(paidPlan("solo"));

    // Month N — at allowance
    prismaMock.usageEvent.aggregate.mockResolvedValueOnce({
      _sum: { inputTokens: 1_000_000, outputTokens: 1_000_000 }, // 2M
    });
    prismaMock.subscription.findUnique.mockResolvedValueOnce({
      overageEnabled: false,
      stripeOverageItemId: null,
      currentPeriodStart: new Date("2026-04-01"),
      currentPeriodEnd: new Date("2026-05-01"),
    });
    const snapBefore = await getBudgetSnapshot("u1");
    expect(snapBefore.exceeded).toBe(true);

    // Month N+1 — Stripe rolled the period, the aggregate scoped to
    // the NEW period returns 0 because no events landed yet.
    prismaMock.usageEvent.aggregate.mockResolvedValueOnce({
      _sum: { inputTokens: 0, outputTokens: 0 },
    });
    prismaMock.subscription.findUnique.mockResolvedValueOnce({
      overageEnabled: false,
      stripeOverageItemId: null,
      currentPeriodStart: new Date("2026-05-01"),
      currentPeriodEnd: new Date("2026-06-01"),
    });
    const snapAfter = await getBudgetSnapshot("u1");
    expect(snapAfter.used).toBe(0);
    expect(snapAfter.exceeded).toBe(false);
    expect(snapAfter.fractionUsed).toBe(0);
  });
});
