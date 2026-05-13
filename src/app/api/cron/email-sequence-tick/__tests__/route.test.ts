/**
 * Tests for the email-sequence cron tick.
 *
 * The route fans out three day-step cohorts (day3 / day7 / day14) and
 * is gated by:
 *  - cron auth (x-vercel-cron header OR Bearer CRON_SECRET)
 *  - per-step idempotency (skip if `sequence_email_sent` already logged)
 *  - per-step engagement gates (workflow_started for day3,
 *    pageview-count for day14)
 *
 * We mock prisma + sendEmail + trackEvent and drive each scenario by
 * pre-loading the candidate list and the analyticsEvent lookups.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const mockPrisma = vi.hoisted(() => ({
  user: { findMany: vi.fn() },
  analyticsEvent: { findFirst: vi.fn(), count: vi.fn() },
}));
const mockSendEmail = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ ok: true, provider: "resend" }),
);
const mockTrackEvent = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockBuilder = vi.hoisted(() => ({
  day3: vi.fn().mockReturnValue({ subject: "d3", html: "<p/>", text: "d3" }),
  day7: vi.fn().mockReturnValue({ subject: "d7", html: "<p/>", text: "d7" }),
  day14: vi.fn().mockReturnValue({ subject: "d14", html: "<p/>", text: "d14" }),
  day21: vi.fn().mockReturnValue({ subject: "d21", html: "<p/>", text: "d21" }),
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/email/send", () => ({ sendEmail: mockSendEmail }));
vi.mock("@/lib/analytics/track", () => ({ trackEvent: mockTrackEvent }));
vi.mock("@/lib/email/sequences", () => ({
  SEQUENCE_BUILDERS: mockBuilder,
}));

import { GET } from "../route";

function cronReq(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://test.local/api/cron/email-sequence-tick", {
    headers,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default: no candidates for any cohort.
  mockPrisma.user.findMany.mockResolvedValue([]);
  mockPrisma.analyticsEvent.findFirst.mockResolvedValue(null);
  mockPrisma.analyticsEvent.count.mockResolvedValue(0);
  process.env.CRON_SECRET = "test-secret";
});

describe("email-sequence-tick auth", () => {
  it("rejects unauthenticated requests with 401", async () => {
    const res = await GET(cronReq());
    expect(res.status).toBe(401);
  });

  it("accepts x-vercel-cron header", async () => {
    const res = await GET(cronReq({ "x-vercel-cron": "1" }));
    expect(res.status).toBe(200);
  });

  it("accepts Bearer CRON_SECRET", async () => {
    const res = await GET(cronReq({ authorization: "Bearer test-secret" }));
    expect(res.status).toBe(200);
  });
});

describe("email-sequence-tick gating + idempotency", () => {
  const baseUser = {
    id: "u-1",
    email: "u@example.com",
    name: "User One",
    firmVertical: "cpa",
  };

  it("skips welcome step (welcome is fired synchronously at signup)", async () => {
    // The cron only iterates day3/day7/day14. We assert it never
    // queries SEQUENCE_BUILDERS.welcome — the absence of any
    // welcome-themed builder call (this mock has none defined) is
    // enough; the call simply must not throw.
    const res = await GET(cronReq({ "x-vercel-cron": "1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    // No "welcome" key in summary at all.
    expect(Object.keys(body.summary).some((k) => k.startsWith("welcome"))).toBe(
      false,
    );
  });

  it("skips day3 when the user has a workflow_started event", async () => {
    // Only day3 cohort returns a candidate; others empty.
    mockPrisma.user.findMany
      .mockResolvedValueOnce([baseUser]) // day3
      .mockResolvedValueOnce([]) // day7
      .mockResolvedValueOnce([]); // day14
    // Idempotency check (no sequence_email_sent) → null.
    // Then workflow_started lookup → return a row to gate out.
    mockPrisma.analyticsEvent.findFirst
      .mockResolvedValueOnce(null) // idempotency miss
      .mockResolvedValueOnce({ id: "feat-1" }); // workflow_started present
    const res = await GET(cronReq({ "x-vercel-cron": "1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.summary.day3_skipped_has_feature).toBe(1);
    expect(body.summary.day3_sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("sends day3 when user has no workflow_started event", async () => {
    mockPrisma.user.findMany
      .mockResolvedValueOnce([baseUser])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    mockPrisma.analyticsEvent.findFirst.mockResolvedValue(null);
    const res = await GET(cronReq({ "x-vercel-cron": "1" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.summary.day3_sent).toBe(1);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "sequence_email_sent",
        userId: "u-1",
        properties: { step: "day3" },
      }),
    );
  });

  it("is idempotent: skips when sequence_email_sent already logged", async () => {
    mockPrisma.user.findMany
      .mockResolvedValueOnce([baseUser])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    // First findFirst (idempotency check) returns a row → skip.
    mockPrisma.analyticsEvent.findFirst.mockResolvedValueOnce({ id: "log-1" });
    const res = await GET(cronReq({ "x-vercel-cron": "1" }));
    const body = await res.json();
    expect(body.summary.day3_skipped_already_sent).toBe(1);
    expect(body.summary.day3_sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("always sends day7 (subject only to idempotency)", async () => {
    mockPrisma.user.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([baseUser])
      .mockResolvedValueOnce([]);
    mockPrisma.analyticsEvent.findFirst.mockResolvedValue(null);
    const res = await GET(cronReq({ "x-vercel-cron": "1" }));
    const body = await res.json();
    expect(body.summary.day7_sent).toBe(1);
  });

  it("always sends day14 upgrade-soft (no pageview gate)", async () => {
    // Day 14 is now the "upgrade-soft" founding-member intro — it must
    // reach every cohort member regardless of in-app activity. The old
    // pageview gate (skip engaged users) was removed when the template
    // shifted from "re-engagement nudge" to "lock pricing" in P7-01.
    mockPrisma.user.findMany
      .mockResolvedValueOnce([]) // day3
      .mockResolvedValueOnce([]) // day7
      .mockResolvedValueOnce([baseUser]) // day14
      .mockResolvedValueOnce([]); // day21
    mockPrisma.analyticsEvent.findFirst.mockResolvedValue(null);
    // Even with high pageview count the send must still happen.
    mockPrisma.analyticsEvent.count.mockResolvedValueOnce(50);
    const res = await GET(cronReq({ "x-vercel-cron": "1" }));
    const body = await res.json();
    expect(body.summary.day14_sent).toBe(1);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ tag: "sequence-day14" }),
    );
  });

  it("always sends day21 upgrade-hard (modulo idempotency)", async () => {
    mockPrisma.user.findMany
      .mockResolvedValueOnce([]) // day3
      .mockResolvedValueOnce([]) // day7
      .mockResolvedValueOnce([]) // day14
      .mockResolvedValueOnce([baseUser]); // day21
    mockPrisma.analyticsEvent.findFirst.mockResolvedValue(null);
    const res = await GET(cronReq({ "x-vercel-cron": "1" }));
    const body = await res.json();
    expect(body.summary.day21_sent).toBe(1);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ tag: "sequence-day21" }),
    );
    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "sequence_email_sent",
        userId: "u-1",
        properties: { step: "day21" },
      }),
    );
  });

  it("skips day21 when already sent (idempotency)", async () => {
    mockPrisma.user.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([baseUser]);
    // Idempotency lookup returns a prior send → skip.
    mockPrisma.analyticsEvent.findFirst.mockResolvedValueOnce({ id: "log-21" });
    const res = await GET(cronReq({ "x-vercel-cron": "1" }));
    const body = await res.json();
    expect(body.summary.day21_skipped_already_sent).toBe(1);
    expect(body.summary.day21_sent).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("processes a batch of multiple users without cross-talk", async () => {
    const users = Array.from({ length: 5 }, (_, i) => ({
      id: `u-${i}`,
      email: `u${i}@x.com`,
      name: `U${i}`,
      firmVertical: null,
    }));
    mockPrisma.user.findMany
      .mockResolvedValueOnce(users) // day3
      .mockResolvedValueOnce([]) // day7
      .mockResolvedValueOnce([]) // day14
      .mockResolvedValueOnce([]); // day21
    mockPrisma.analyticsEvent.findFirst.mockResolvedValue(null);
    const res = await GET(cronReq({ "x-vercel-cron": "1" }));
    const body = await res.json();
    expect(body.summary.day3_sent).toBe(5);
    expect(mockSendEmail).toHaveBeenCalledTimes(5);
    // Each call routed to a different recipient.
    const recipients = mockSendEmail.mock.calls.map((c) => c[0].to).sort();
    expect(recipients).toEqual(users.map((u) => u.email).sort());
  });
});
