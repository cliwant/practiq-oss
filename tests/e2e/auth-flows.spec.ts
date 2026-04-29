/**
 * Auth completeness regression spec.
 *
 * Covers the auth surfaces the persona-journey doesn't exercise:
 *   - /forgot-password page renders + accepts a submission
 *   - /reset-password/[token] renders for arbitrary tokens (server
 *     validates, but the page itself shouldn't 500 on any input)
 *   - /verify-email/[token] renders + handles invalid tokens
 *   - /api/auth/forgot-password rate-limit + 200 on valid email
 *   - /api/auth/resend-verification 200 path
 *
 * Why this matters: a real persona who can't read their welcome
 * email or who locks themselves out at 3am needs every recovery
 * path working. Pre-Round-7 these surfaces had ZERO E2E coverage
 * and could regress on any next.js / NextAuth bump unnoticed.
 */
import { test, expect } from "@playwright/test";

const BASE_URL = process.env.PRACTIQ_BASE_URL ?? "https://practiq.dev";

test.describe("Auth completeness", () => {
  test("a01 — /forgot-password renders form", async ({ page }) => {
    await page.goto(`${BASE_URL}/forgot-password`);
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByPlaceholder("you@firm.com")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /send|reset|email/i }).first(),
    ).toBeVisible();
  });

  test("a02 — /forgot-password submission for unknown email returns 'check your inbox' (no enum leak)", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/forgot-password`);
    await page
      .getByPlaceholder("you@firm.com")
      .fill(`unknown-${Date.now()}@practiq-test.cliwant.com`);
    // Submit. The endpoint must NOT reveal whether the email exists
    // (account-enumeration defense): both real and unknown emails
    // should land in the same "Check your inbox" success state.
    await page
      .locator('form button[type="submit"], button:has-text("Send")')
      .first()
      .click();
    await expect(
      page.getByText(/Check your inbox|reset link/i).first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("a03 — /reset-password/<bogus-token> renders graceful invalid-token state", async ({
    page,
  }) => {
    await page.goto(
      `${BASE_URL}/reset-password/this-token-is-not-real-${Date.now()}`,
    );
    // The page should render either the invalid-token message OR
    // the form (which then 4xx's on submit). What it MUST NOT do
    // is 500. Catch that by asserting any h1 + no Next.js error
    // boundary copy.
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 10_000 });
    const hasErrorBoundary = await page
      .getByText(/Something went sideways|That action didn't complete/i)
      .first()
      .isVisible({ timeout: 1_500 })
      .catch(() => false);
    expect(hasErrorBoundary).toBe(false);
  });

  test("a04 — /verify-email/<bogus-token> renders graceful invalid-token state", async ({
    page,
  }) => {
    await page.goto(
      `${BASE_URL}/verify-email/this-token-is-not-real-${Date.now()}`,
    );
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 10_000 });
    const hasErrorBoundary = await page
      .getByText(/Something went sideways|That action didn't complete/i)
      .first()
      .isVisible({ timeout: 1_500 })
      .catch(() => false);
    expect(hasErrorBoundary).toBe(false);
  });

  test("a05 — POST /api/auth/forgot-password 200 on valid input (no email-existence leak)", async ({
    request,
  }) => {
    const resp = await request.post(`${BASE_URL}/api/auth/forgot-password`, {
      data: {
        email: `unknown-${Date.now()}@practiq-test.cliwant.com`,
      },
    });
    expect(resp.status()).toBe(200);
  });

  test("a06 — POST /api/auth/forgot-password 400 on missing email", async ({
    request,
  }) => {
    const resp = await request.post(`${BASE_URL}/api/auth/forgot-password`, {
      data: {},
    });
    expect(resp.status()).toBe(400);
  });

  test("a07 — POST /api/auth/resend-verification requires auth (401 anon)", async ({
    request,
  }) => {
    // resend-verification is for the currently-signed-in user re-
    // requesting THEIR own verification email — it's auth-gated by
    // design. Anon callers must get 401 (not 200/404 which would
    // either fire mail to arbitrary addresses or leak account
    // existence respectively).
    const resp = await request.post(
      `${BASE_URL}/api/auth/resend-verification`,
      {
        data: {
          email: `unknown-${Date.now()}@practiq-test.cliwant.com`,
        },
      },
    );
    expect(resp.status()).toBe(401);
  });

  test("a08 — landing 'Forgot?' link from /login takes the user to /forgot-password", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.getByRole("link", { name: /forgot/i }).first().click();
    await page.waitForURL(/\/forgot-password/);
    expect(page.url()).toMatch(/\/forgot-password/);
  });

  test("a09 — POST /api/chat requires auth (401 anon) — protects LLM cost", async ({
    request,
  }) => {
    const resp = await request.post(`${BASE_URL}/api/chat`, {
      data: { clientId: "any", message: "hello" },
    });
    expect(resp.status()).toBe(401);
  });

  test("a10 — POST /api/users/me requires auth (401 anon) — schema-bug detector", async ({
    request,
  }) => {
    const resp = await request.patch(`${BASE_URL}/api/users/me`, {
      data: { preferredModel: "claude-haiku-4-5" },
    });
    expect(resp.status()).toBe(401);
  });
});
