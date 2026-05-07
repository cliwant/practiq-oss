/**
 * Tests for POST /api/stripe/checkout.
 *
 * Focus: the friction-reduction config (14d trial on Solo, automatic
 * tax, customer_email prefill, cancel_url session_id placeholder) and
 * funnel-instrumentation (checkout_initiated with stripeSessionId).
 *
 * Stripe SDK + Prisma + rate-limit + analytics are all mocked so the
 * route runs as a pure unit test without external services.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = vi.hoisted(() => vi.fn());
const mockPrisma = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  foundingSlot: { findUnique: vi.fn() },
}));
const mockStripeCreate = vi.hoisted(() => vi.fn());
const mockStripeExpire = vi.hoisted(() => vi.fn());
const mockTrack = vi.hoisted(() => vi.fn());
const mockFlush = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockClaimSlot = vi.hoisted(() => vi.fn());
const mockRateLimit = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ allowed: true }),
);

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/stripe/client", () => ({
  isStripeConfigured: () => true,
  getStripe: () => ({
    checkout: {
      sessions: {
        create: mockStripeCreate,
        expire: mockStripeExpire,
      },
    },
  }),
}));
vi.mock("@/lib/stripe/plans", () => {
  const PLANS = {
    solo: {
      key: "solo",
      stripePriceId: "price_solo",
      stripePriceIdFounding: null,
    },
    practice: {
      key: "practice",
      stripePriceId: "price_practice",
      stripePriceIdFounding: "price_practice_founding",
    },
    firm: { key: "firm", stripePriceId: "price_firm" },
  };
  return {
    PLANS,
    isFoundingPriceId: (id: string) => id?.includes("founding"),
    overagePriceId: () => null,
  };
});
vi.mock("@/lib/stripe/founding-slot", () => ({
  claimSlot: mockClaimSlot,
}));
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mockRateLimit,
  identityFromRequest: () => "ident",
  rateLimitResponse: () =>
    new Response(JSON.stringify({ error: "rate limited" }), { status: 429 }),
}));
vi.mock("@/lib/analytics/posthog-server", () => ({
  trackServerEvent: mockTrack,
  flushServerEvents: mockFlush,
}));

import { POST } from "../route";

function makeReq(body: unknown): NextRequest {
  return new NextRequest("http://test.local/api/stripe/checkout", {
    method: "POST",
    headers: { origin: "https://practiq.dev" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue({
    user: { id: "u-1", email: "user@example.com" },
  });
  mockPrisma.user.findUnique.mockResolvedValue({
    id: "u-1",
    email: "user@example.com",
    name: "U",
    stripeCustomerId: null,
  });
  mockStripeCreate.mockResolvedValue({
    id: "cs_test_123",
    url: "https://stripe.example/cs_test_123",
  });
  mockClaimSlot.mockResolvedValue({ claimed: true });
});

describe("POST /api/stripe/checkout", () => {
  it("attaches a 14-day trial + payment_method_collection=if_required for the Solo tier", async () => {
    const res = await POST(makeReq({ plan: "solo" }));
    expect(res.status).toBe(200);
    expect(mockStripeCreate).toHaveBeenCalledTimes(1);
    const args = mockStripeCreate.mock.calls[0][0];
    expect(args.subscription_data.trial_period_days).toBe(14);
    expect(args.payment_method_collection).toBe("if_required");
  });

  it("does NOT attach a trial for the Practice tier", async () => {
    const res = await POST(makeReq({ plan: "practice" }));
    expect(res.status).toBe(200);
    const args = mockStripeCreate.mock.calls[0][0];
    expect(args.subscription_data.trial_period_days).toBeUndefined();
    // payment_method_collection is omitted entirely (Stripe defaults to "always").
    expect(args.payment_method_collection).toBeUndefined();
  });

  it("enables Stripe Tax (automatic_tax) and prefills customer_email", async () => {
    await POST(makeReq({ plan: "solo" }));
    const args = mockStripeCreate.mock.calls[0][0];
    expect(args.automatic_tax).toEqual({ enabled: true });
    expect(args.customer_email).toBe("user@example.com");
  });

  it("includes the {CHECKOUT_SESSION_ID} placeholder in cancel_url for funnel stitching", async () => {
    await POST(makeReq({ plan: "solo" }));
    const args = mockStripeCreate.mock.calls[0][0];
    expect(args.cancel_url).toContain("session_id={CHECKOUT_SESSION_ID}");
    expect(args.success_url).toContain("session_id={CHECKOUT_SESSION_ID}");
  });

  it("fires checkout_initiated with the stripeSessionId so the funnel can stitch", async () => {
    await POST(makeReq({ plan: "solo" }));
    expect(mockTrack).toHaveBeenCalledWith(
      "u-1",
      "checkout_initiated",
      expect.objectContaining({
        plan: "solo",
        stripeSessionId: "cs_test_123",
      }),
    );
  });

  it("rejects unknown / free plan with 400", async () => {
    const res = await POST(makeReq({ plan: "free" }));
    expect(res.status).toBe(400);
  });

  it("rejects unauthenticated requests with 401", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(makeReq({ plan: "solo" }));
    expect(res.status).toBe(401);
  });
});
