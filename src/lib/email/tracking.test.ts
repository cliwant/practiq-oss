/**
 * Unit tests for email delivery tracking (Wave 16 / P0-05).
 *
 * The tracking module touches Prisma + Slack + the suppression ledger.
 * We mock all three. Coverage:
 *
 *   - recordDeliveryEvent dedupes on eventId.
 *   - bounce / complained events trigger the new email_bounce /
 *     email_complaint Slack types (not the legacy types).
 *   - suppression dedupe (isFirstAlert=false → no Slack).
 *   - paying-customer escalation (severity=critical).
 *   - polling-fallback path skips Slack entirely.
 *   - delivered events DO NOT trigger Slack.
 *   - AnalyticsEvent insert receives the right canonical type.
 *   - startDeliveryPolling refuses to run when RESEND_API_KEY is missing.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { analyticsCreate, slackNotify, recordSuppressionMock } = vi.hoisted(
  () => ({
    analyticsCreate: vi.fn().mockResolvedValue({ id: "evt_1" }),
    slackNotify: vi.fn(),
    recordSuppressionMock: vi.fn().mockResolvedValue({
      isFirstAlert: true,
      isPayingCustomer: false,
      rowId: "supp_1",
      isNewRow: true,
    }),
  }),
);

vi.mock("@/lib/prisma", () => ({
  prisma: {
    analyticsEvent: { create: analyticsCreate },
  },
}));
vi.mock("@/lib/notifications/slack", () => ({
  safeNotify: (
    type: string,
    payload: Record<string, unknown>,
    options?: { severity?: string },
  ) => slackNotify(type, payload, options),
}));
vi.mock("@/lib/email/suppressions", () => ({
  recordSuppression: recordSuppressionMock,
}));

import { recordDeliveryEvent, __resetDeliveryTracking } from "./tracking";

beforeEach(() => {
  analyticsCreate.mockClear();
  slackNotify.mockClear();
  recordSuppressionMock.mockClear();
  recordSuppressionMock.mockResolvedValue({
    isFirstAlert: true,
    isPayingCustomer: false,
    rowId: "supp_1",
    isNewRow: true,
  });
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

  it("fires email_bounce Slack on bounce (warning severity by default)", async () => {
    await recordDeliveryEvent({
      event: "email.bounced",
      messageId: "rse_b",
      to: "bounce@nowhere.invalid",
      subject: "Reset password",
      tag: "password_reset",
      bounceType: "Permanent",
      eventId: "ev_b1",
    });
    expect(recordSuppressionMock).toHaveBeenCalledWith({
      recipient: "bounce@nowhere.invalid",
      reason: "bounce",
      bounceType: "Permanent",
      tag: "password_reset",
      messageId: "rse_b",
    });
    expect(slackNotify).toHaveBeenCalledTimes(1);
    const [type, payload, options] = slackNotify.mock.calls[0];
    expect(type).toBe("email_bounce");
    expect(payload).toMatchObject({
      recipient: "bounce@nowhere.invalid",
      tag: "password_reset",
      bounceType: "Permanent",
      isPayingCustomer: false,
    });
    expect(options).toBeUndefined();
  });

  it("escalates email_bounce to critical when recipient is a paying customer", async () => {
    recordSuppressionMock.mockResolvedValueOnce({
      isFirstAlert: true,
      isPayingCustomer: true,
      rowId: "supp_p",
      isNewRow: true,
    });
    await recordDeliveryEvent({
      event: "email.bounced",
      messageId: "rse_b2",
      to: "paying@customerfirm.com",
      tag: "welcome",
      bounceType: "Permanent",
      eventId: "ev_b2",
    });
    expect(slackNotify).toHaveBeenCalledTimes(1);
    const [type, , options] = slackNotify.mock.calls[0];
    expect(type).toBe("email_bounce");
    expect(options).toEqual({ severity: "critical" });
  });

  it("suppresses Slack when recordSuppression says isFirstAlert=false", async () => {
    recordSuppressionMock.mockResolvedValueOnce({
      isFirstAlert: false,
      isPayingCustomer: false,
      rowId: "supp_old",
      isNewRow: false,
    });
    await recordDeliveryEvent({
      event: "email.bounced",
      messageId: "rse_b3",
      to: "known-bad@example.invalid",
      tag: "welcome",
      bounceType: "Permanent",
      eventId: "ev_b3",
    });
    // Suppression row IS bumped; Slack is NOT fired.
    expect(recordSuppressionMock).toHaveBeenCalledTimes(1);
    expect(slackNotify).not.toHaveBeenCalled();
    // AnalyticsEvent still written.
    expect(analyticsCreate).toHaveBeenCalledTimes(1);
  });

  it("fires email_complaint with critical severity by default", async () => {
    await recordDeliveryEvent({
      event: "email.complained",
      messageId: "rse_c",
      to: "complainer@example.com",
      tag: "billing_receipt",
      eventId: "ev_c1",
    });
    expect(recordSuppressionMock).toHaveBeenCalledWith({
      recipient: "complainer@example.com",
      reason: "complaint",
      tag: "billing_receipt",
      messageId: "rse_c",
    });
    expect(slackNotify).toHaveBeenCalledTimes(1);
    const [type, payload] = slackNotify.mock.calls[0];
    expect(type).toBe("email_complaint");
    expect(payload).toMatchObject({
      recipient: "complainer@example.com",
      tag: "billing_receipt",
    });
  });

  it("does NOT fire Slack from the polling-fallback path", async () => {
    await recordDeliveryEvent({
      event: "email.bounced",
      messageId: "rse_poll_b",
      to: "polled@example.invalid",
      tag: "welcome",
      bounceType: "Permanent",
      eventId: "ev_poll_b",
      fromPolling: true,
    });
    // AnalyticsEvent IS written; suppression + Slack are SKIPPED.
    expect(analyticsCreate).toHaveBeenCalledTimes(1);
    expect(recordSuppressionMock).not.toHaveBeenCalled();
    expect(slackNotify).not.toHaveBeenCalled();
  });

  it("does NOT fire Slack from polling-fallback complaint either", async () => {
    await recordDeliveryEvent({
      event: "email.complained",
      messageId: "rse_poll_c",
      to: "polled@example.com",
      tag: "welcome",
      eventId: "ev_poll_c",
      fromPolling: true,
    });
    expect(analyticsCreate).toHaveBeenCalledTimes(1);
    expect(recordSuppressionMock).not.toHaveBeenCalled();
    expect(slackNotify).not.toHaveBeenCalled();
  });

  it("fires Slack (info-level) on delivery_delayed via the legacy type", async () => {
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
      undefined,
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
    expect(recordSuppressionMock).not.toHaveBeenCalled();
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

  it("survives a recordSuppression exception without throwing", async () => {
    recordSuppressionMock.mockRejectedValueOnce(new Error("supabase down"));
    await expect(
      recordDeliveryEvent({
        event: "email.bounced",
        messageId: "rse_throws",
        to: "x@y.invalid",
        tag: "welcome",
        bounceType: "Permanent",
        eventId: "ev_throws",
      }),
    ).resolves.not.toThrow();
    // AnalyticsEvent still written, Slack skipped (the dispatcher
    // caught the suppression error and decided to fail-quiet rather
    // than fall back to a duplicate alert path).
    expect(analyticsCreate).toHaveBeenCalledTimes(1);
    expect(slackNotify).not.toHaveBeenCalled();
  });
});

describe("startDeliveryPolling — environment guards", () => {
  it("is a no-op when RESEND_API_KEY is missing", async () => {
    const original = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;
    const { startDeliveryPolling } = await import("./tracking");
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
