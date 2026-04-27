/**
 * Shared sign-in helpers for authenticated Playwright specs.
 *
 * Every authenticated test does the same dance — visit /login, fill the
 * email + password fields, click sign-in, wait for the /app redirect.
 * Centralising it here means a UI tweak (selector change, redirect path
 * shift) is a one-file fix instead of a sweep across every spec.
 *
 * Usage:
 *   await signIn(page, BASE_URL, TEST_EMAIL, TEST_PASSWORD);
 *
 * On a successful sign-in the helper asserts:
 *   - Page URL has navigated under /app/...
 *   - The session cookie set by NextAuth is present
 *
 * If the credential pair is bad the helper throws — tests should
 * pre-validate the env before calling, or accept the failure as the
 * symptom they care about.
 */
import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export interface SignInOpts {
  /** Maximum total time to allow for the navigation chain. */
  timeoutMs?: number;
  /** Where to land after sign-in. Some tests navigate through /signup
   *  → /app first; supplying a custom matcher avoids a flaky default. */
  expectUrl?: RegExp;
}

export async function signIn(
  page: Page,
  baseUrl: string,
  email: string,
  password: string,
  opts: SignInOpts = {},
): Promise<void> {
  const timeoutMs = opts.timeoutMs ?? 20_000;
  const expectUrl = opts.expectUrl ?? /\/app(\/|$)/;

  await page.goto(`${baseUrl}/login`);

  const emailField = page.locator('input[type="email"]').first();
  const passwordField = page.locator('input[type="password"]').first();
  await expect(emailField).toBeVisible({ timeout: 10_000 });
  await expect(passwordField).toBeVisible();

  await emailField.fill(email);
  await passwordField.fill(password);

  // The button label ranges over "Sign in" / "Log in" / "Continue" depending
  // on the variant on prod — match loosely so a marketing tweak doesn't
  // break the suite.
  const signInBtn = page
    .getByRole("button", { name: /sign in|log in|continue/i })
    .first();
  await signInBtn.click();

  await page.waitForURL(expectUrl, { timeout: timeoutMs });

  // Sanity: NextAuth drops a session cookie on successful credentials
  // sign-in. We don't assert on the exact cookie name (varies between
  // prod = "__Secure-authjs.session-token" and local = "authjs.session-token"),
  // we just verify SOME auth-shaped cookie exists.
  const cookies = await page.context().cookies();
  const hasSession = cookies.some((c) =>
    /authjs\.session-token$/i.test(c.name),
  );
  if (!hasSession) {
    throw new Error(
      "signIn(): no NextAuth session cookie present after redirect — credentials likely rejected.",
    );
  }
}

/**
 * Convenience wrapper: read the test credentials from the standard
 * E2E_TEST_EMAIL / E2E_TEST_PASSWORD env vars (or their fallbacks)
 * and sign in. Centralises the fallback contract so each spec doesn't
 * duplicate it.
 */
export async function signInAsTestUser(
  page: Page,
  baseUrl: string,
  opts: SignInOpts = {},
): Promise<{ email: string }> {
  const email = process.env.E2E_TEST_EMAIL ?? "e2e@practiq.dev";
  const password = process.env.E2E_TEST_PASSWORD ?? "Practiq-E2E-2026!";
  await signIn(page, baseUrl, email, password, opts);
  return { email };
}
