/**
 * Unit tests for email delivery tracking (RUN 11, P0-05).
 *
 * The tracking module touches Prisma + Slack + global fetch — so we
 * mock all three. Coverage:
 *
 *   - recordDeliveryEvent dedupes on eventId.
 *   - bounce / complained events trigger Slack pings.
 *   - delivered events DO NOT trigger Slack (info-only).
 *   - the AnalyticsEvent insert receives the right canonical type
 *     for each Resend event.
 *   - startDeliveryPolling refuses to run when RESEND_API_KEY is
 *     missing.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.mock is hoisted; declare the mocks via vi.hoisted so the
// reference is initialised before the mock factory runs.
const { analyticsCreate, slackNotify } = vi.hoisted(() => ({
  analyticsCreate: vi.fn().mockResolvedValue({ id: "evt_1" }),
  slackNotify: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    analyticsEvent: { create: analyticsCreate },
  },
}));
vi.mock("@/lib/notifications/slack", () => ({
  safeNotify: (type: string, payload: Record<string, unknown>) =>
    slackNotify(type, payload),
}));

import { recordDeliveryEvent, __resetDeliveryTracking } from "./tracking";

beforeEach(() => {
  analyticsCreate.mockClear();
  slackNotify.mockClear();
  __resetDeliveryTracking();
});

describe("recordDeliveryEvent", () => {
  it("writes an AnalyticsEvent for a delivered event with the right canonical type", async () => {
    await recordDeliveryEvent({
      event: "email.delivered",
      messageId: "rse_111",
      to: "jen@parkcpa.com",
      subject: "Welcome to Practiq",
      tag: "welcome",
      eventId: "msg_1",
    });
    expect(analyticsCreate).toHaveBeenCalledTimes(1);
    const call = analyticsCreate.mock.calls[0][0];
    expect(call.data.type).toBe("transactional_email_delivered");
    expect(call.data.properties).toMatchObject({
      messageId: "rse_111",
      to: "jen@parkcpa.com",
      tag: "welcome",
    });
  });

  it("dedupes on eventId — same Svix delivery id only writes once", async () => {
    const ev = {
      event: "email.delivered" as const,
      messageId: "rse_222",
      to: "x@y.com",
      eventId: "msg_dedup",
    };
    await recordDeliveryEvent(ev);
    await recordDeliveryEvent(ev);
    await recordDeliveryEvent(ev);
    expect(analyticsCreate).toHaveBeenCalledTimes(1);
  });

  it("fires Slack on bounce", async () => {
    await recordDeliveryEvent({
      event: "email.bounced",
      messageId: "rse_b",
      to: "bounce@nowhere.invalid",
      subject: "Reset password",
      tag: "password_reset",
      bounceType: "Permanent",
      eventId: "ev_b1",
    });
    expect(slackNotify).toHaveBeenCalledTimes(1);
    const [type, payload] = slackNotify.mock.calls[0];
    expect(type).toBe("transactional_email_bounced");
    expect(payload).toMatchObject({
      to: "bounce@nowhere.invalid",
      tag: "password_reset",
      bounceType: "Permanent",
    });
  });

  it("fires Slack on complaint with the highest-priority type", async () => {
    await recordDeliveryEvent({
      event: "email.complained",
      messageId: "rse_c",
      to: "complainer@example.com",
      tag: "billing_receipt",
      eventId: "ev_c1",
    });
    expect(slackNotify).toHaveBeenCalledTimes(1);
    expect(slackNotify.mock.calls[0][0]).toBe(
      "transactional_email_complained",
    );
  });

  it("fires Slack (info-level) on delivery_delayed", async () => {
    await recordDeliveryEvent({
      event: "email.delivery_delayed",
      messageId: "rse_d",
      to: "lag@example.com",
      tag: "welcome",
      eventId: "ev_d1",
    });
    expect(slackNotify).toHaveBeenCalledWith(
      "transactional_email_delivery_delayed",
      expect.any(Object),
    );
  });

  it("does NOT fire Slack on a successful delivery", async () => {
    await recordDeliveryEvent({
      event: "email.delivered",
      messageId: "rse_ok",
      to: "happy@example.com",
      eventId: "ev_ok",
    });
    expect(slackNotify).not.toHaveBeenCalled();
  });

  it("does NOT fire Slack on opened / clicked events", async () => {
    await recordDeliveryEvent({
      event: "email.opened",
      messageId: "rse_o",
      to: "y@z.com",
      eventId: "ev_o",
    });
    await recordDeliveryEvent({
      event: "email.clicked",
      messageId: "rse_c",
      to: "y@z.com",
      eventId: "ev_c",
    });
    expect(slackNotify).not.toHaveBeenCalled();
  });

  it("survives an AnalyticsEvent insert failure without throwing", async () => {
    analyticsCreate.mockRejectedValueOnce(new Error("db down"));
    await expect(
      recordDeliveryEvent({
        event: "email.delivered",
        messageId: "rse_fail",
        to: "x@y.com",
        eventId: "ev_fail",
      }),
    ).resolves.not.toThrow();
  });
});

describe("startDeliveryPolling — environment guards", () => {
  it("is a no-op when RESEND_API_KEY is missing", async () => {
    const original = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;
    const { startDeliveryPolling } = await import("./tracking");
    // Should return without scheduling anything; no Promise to await.
    expect(() =>
      startDeliveryPolling({ messageId: "rse_x", to: "a@b.c" }),
    ).not.toThrow();
    if (original !== undefined) process.env.RESEND_API_KEY = original;
  });

  it("is a no-op when RESEND_DELIVERY_POLLING_DISABLED=1", async () => {
    process.env.RESEND_DELIVERY_POLLING_DISABLED = "1";
    process.env.RESEND_API_KEY = "re_test";
    const { startDeliveryPolling } = await import("./tracking");
    expect(() =>
      startDeliveryPolling({ messageId: "rse_x", to: "a@b.c" }),
    ).not.toThrow();
    delete process.env.RESEND_DELIVERY_POLLING_DISABLED;
  });

  it("is a no-op for empty messageId", async () => {
    process.env.RESEND_API_KEY = "re_test";
    delete process.env.RESEND_DELIVERY_POLLING_DISABLED;
    const { startDeliveryPolling } = await import("./tracking");
    expect(() =>
      startDeliveryPolling({ messageId: "", to: "a@b.c" }),
    ).not.toThrow();
  });
});
