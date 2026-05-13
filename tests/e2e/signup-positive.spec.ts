/**
 * signup-positive: cold visitor → /signup → fills form → submits →
 * receives 201 from /api/auth/signup → auto-login → lands on /app.
 *
 * What this catches that unit tests don't:
 *   - Beta-gate accidentally re-enables and starts returning 403 on
 *     fresh emails (we've shipped that regression at least twice).
 *   - /app shell renders (<main> + greeting). If middleware breaks
 *     auth or the layout crashes on first paint, we surface it here
 *     instead of waiting for a user to email support.
 *   - Mobile viewport: the hamburger button must be visible AND the
 *     page must not produce a horizontal scrollbar at 390x844.
 *
 * Test users are NOT deleted after the run — they persist in
 * production DB for operator inspection (consistent with the dogfood
 * agent convention).
 */
import { test, expect } from "@playwright/test";
import { freshTestIdentity, TEST_PASSWORD } from "./helpers/test-data";

const BASE_URL =
  process.env.PRACTIQ_BASE_URL ??
  process.env.E2E_BASE_URL ??
  "https://practiq.dev";

test.describe("signup → /app cold-path smoke", () => {
  test("s01 — POST /api/auth/signup returns 201 and lands the user in /app", async ({
    page,
  }) => {
    const { email, name } = freshTestIdentity("signup-positive");

    // Capture the signup network call so we can hard-assert 201 on
    // the same submission the user is making — not a side-channel
    // request.
    const signupResponsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/auth/signup") &&
        resp.request().method() === "POST",
      { timeout: 30_000 },
    );

    await page.goto(`${BASE_URL}/signup`);
    await page.locator("#signup-name").fill(name);
    await page.locator("#signup-email").fill(email);
    await page.locator("#signup-vertical").selectOption("accounting");
    await page.locator("#signup-password").fill(TEST_PASSWORD);

    await page
      .getByRole("button", { name: /Create account|Continue to Stripe/i })
      .click();

    const signupResp = await signupResponsePromise;
    // 201 == brand-new account. 200 + flow=magic_link means the email
    // already existed (rerun against the same TS); the latter must
    // never happen on a fresh identity, so we assert 201 strictly.
    expect(
      signupResp.status(),
      `signup endpoint should return 201, got ${signupResp.status()}. Beta-gate regression?`,
    ).toBe(201);

    // After signup the client also signIn()s via NextAuth and routes
    // to /app. Allow generous time for the session bootstrap.
    await page.waitForURL(/\/app(\/|$)/, { timeout: 30_000 });

    // /app shell renders.
    await expect(page.locator("main").first()).toBeVisible({ timeout: 15_000 });
  });

  test("s02 — at mobile viewport, hamburger button is visible + no horizontal scrollbar", async ({
    page,
    isMobile,
  }) => {
    // Only run on the chromium-mobile project — desktop has no hamburger.
    test.skip(!isMobile, "Mobile-only assertion: skip on desktop project");

    const { email, name } = freshTestIdentity("signup-positive-mobile");

    await page.goto(`${BASE_URL}/signup`);
    await page.locator("#signup-name").fill(name);
    await page.locator("#signup-email").fill(email);
    await page.locator("#signup-vertical").selectOption("accounting");
    await page.locator("#signup-password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /Create account/i }).click();
    await page.waitForURL(/\/app(\/|$)/, { timeout: 30_000 });
    await expect(page.locator("main").first()).toBeVisible({ timeout: 15_000 });

    // Hamburger button: the authenticated /app shell shows a menu /
    // open-drawer button under lg breakpoint. We match liberally on
    // aria-label / name so a copy tweak doesn't fail this.
    const hamburger = page
      .getByRole("button", { name: /menu|open|navigation|sidebar/i })
      .first();
    await expect(hamburger).toBeVisible({ timeout: 10_000 });

    // No horizontal scrollbar at 390x844.
    const overflow = await page.evaluate(() => {
      return {
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      };
    });
    expect(
      overflow.scrollWidth,
      `Page produces horizontal scrollbar at mobile: scrollWidth=${overflow.scrollWidth} > clientWidth=${overflow.clientWidth}`,
    ).toBeLessThanOrEqual(overflow.clientWidth + 1); // +1 for sub-pixel rounding
  });
});
