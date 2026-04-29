/**
 * Slack hygiene gates — Round 12 launch readiness (L6.A-C).
 *
 * These tests pin the three behaviors we depend on to keep the
 * #us-market-validation channel quiet in production:
 *
 *   1. Severity gate (info-level pings drop under default warning floor)
 *   2. Test-recipient suppression (E2E test addresses don't ping)
 *   3. Noise window (>5 of the same gated type in 60s collapses)
 *
 * We mock global.fetch so the test asserts whether the webhook was
 * actually called, not the response payload. SLACK_WEBHOOK_URL is
 * stubbed to a non-empty value to prevent the early-return branch.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// Lazy-import so env mutations land before the module evaluates.
async function loadSlack() {
  vi.resetModules();
  return await import("./slack");
}

describe("notifySlack — Round 12 hygiene gates", () => {
  const ORIGINAL_ENV = { ...process.env };
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    process.env.SLACK_WEBHOOK_URL = "https://example.test/hook";
    delete process.env.SLACK_MIN_SEVERITY;
    fetchSpy = vi.fn(async () => new Response("ok", { status: 200 }));
    globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.restoreAllMocks();
  });

  test("severity gate — info-tier types drop at default warning floor", async () => {
    const { notifySlack } = await loadSlack();
    // admin_login_ok is info-tier; default min is warning → suppressed.
    await notifySlack("admin_login_ok", { admin: "alice@example.com" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test("severity gate — info passes when SLACK_MIN_SEVERITY=info", async () => {
    process.env.SLACK_MIN_SEVERITY = "info";
    const { notifySlack } = await loadSlack();
    await notifySlack("admin_login_ok", { admin: "alice@example.com" });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  test("severity override — caller can demote a normally-warning ping to info", async () => {
    const { notifySlack } = await loadSlack();
    // newsletter is warning by default. Override to info under default min=warning → suppressed.
    await notifySlack(
      "newsletter",
      { email: "user@example.com" },
      { severity: "info" },
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test("test-recipient gate — practiq-test.cliwant.com bounces are dropped", async () => {
    const { notifySlack } = await loadSlack();
    await notifySlack("transactional_email_bounced", {
      to: "e2e-persona-1777395605833@practiq-test.cliwant.com",
      subject: "Welcome to Practiq",
      tag: "welcome",
      bounceType: "unknown",
      messageId: "msg_1",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test("test-recipient gate — real users still ping", async () => {
    const { notifySlack } = await loadSlack();
    await notifySlack("transactional_email_bounced", {
      to: "real.user@gmail.com",
      subject: "Welcome to Practiq",
      tag: "welcome",
      bounceType: "Permanent",
      messageId: "msg_2",
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  test("test-recipient gate — payload.email also suppressed (chat quota / admin event shape)", async () => {
    // Round-12 follow-up: the chat-quota notification uses `email`
    // not `to`, and the AI eval sub-agent flooded the channel with
    // those before this branch landed. Keep the test pinned so we
    // don't regress.
    const { notifySlack } = await loadSlack();
    await notifySlack("practiq_chat_quota_exceeded", {
      email: "eval-ai-quality-1777447853406@practiq-test.cliwant.com",
      userId: "u_test_id",
      tokens: "50/50",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test("test-recipient gate — .test TLD and e2e-test domain also suppressed", async () => {
    const { notifySlack } = await loadSlack();
    await notifySlack("transactional_email_bounced", {
      to: "ci@runner.test",
      subject: "x",
      bounceType: "x",
      messageId: "m1",
    });
    await notifySlack("transactional_email_bounced", {
      to: "loadtest@e2e-test.example",
      subject: "x",
      bounceType: "x",
      messageId: "m2",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test("noise window — 6th csp_violation with same signature within 60s collapses", async () => {
    const { notifySlack } = await loadSlack();
    for (let i = 0; i < 5; i++) {
      await notifySlack("csp_violation", {
        directive: "img-src",
        documentPath: "/app",
        blockedUri: "https://attacker.example",
      });
    }
    expect(fetchSpy).toHaveBeenCalledTimes(5);
    // 6th in window — suppressed.
    await notifySlack("csp_violation", {
      directive: "img-src",
      documentPath: "/app",
      blockedUri: "https://attacker.example",
    });
    expect(fetchSpy).toHaveBeenCalledTimes(5);
  });

  test("noise window — different signature is its own bucket", async () => {
    const { notifySlack } = await loadSlack();
    // 5 of directive A
    for (let i = 0; i < 5; i++) {
      await notifySlack("csp_violation", {
        directive: "img-src",
        documentPath: "/app",
      });
    }
    // 1 of directive B — same type, different signature, should fire.
    await notifySlack("csp_violation", {
      directive: "script-src",
      documentPath: "/app",
    });
    expect(fetchSpy).toHaveBeenCalledTimes(6);
  });

  test("ungated types — practiq_signup is not in the noise gate", async () => {
    const { notifySlack } = await loadSlack();
    for (let i = 0; i < 10; i++) {
      await notifySlack("practiq_signup", {
        email: `user${i}@example.com`,
        plan: "trial",
      });
    }
    expect(fetchSpy).toHaveBeenCalledTimes(10);
  });

  test("missing webhook — silent no-op regardless of severity", async () => {
    delete process.env.SLACK_WEBHOOK_URL;
    const { notifySlack } = await loadSlack();
    await notifySlack("practiq_payment_failed", {
      reason: "card_declined",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
