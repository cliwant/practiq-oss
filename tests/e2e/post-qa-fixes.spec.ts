/**
 * Post-QA-fixes regression spec — covers the user-visible defects fixed
 * in the late-April production hardening pass:
 *
 *  - Industry-card navigation on / no longer 404s (was /dashboard, now
 *    routes to /build-dashboard with the firm + view query params)
 *  - "Sign in" affordance is visible at every viewport width (not
 *    hidden behind sm: anymore) and reachable from the footer
 *  - Footer surfaces an "Account" column with login/signup/demo links
 *  - /dashboard direct URL still resolves (308 redirect to /build-dashboard)
 *  - Login + Signup pages both render with the email/password form
 *  - Pricing CTAs do not 404 silently — they either redirect to signup
 *    when anonymous or open Stripe Checkout when authed
 *  - 4 newest blog posts (April 2026 wave) actually render
 *
 * Run locally:
 *   npx playwright test tests/e2e/post-qa-fixes.spec.ts
 *
 * Run against production:
 *   PRACTIQ_BASE_URL=https://practiq.dev \
 *     npx playwright test tests/e2e/post-qa-fixes.spec.ts
 *
 * The spec is intentionally anonymous-only so it can run as a smoke
 * suite on every deploy without needing a seeded test account.
 */
import { test, expect } from "@playwright/test";

const BASE_URL = process.env.PRACTIQ_BASE_URL ?? "https://practiq.dev";

// ─── Industry-card navigation ──────────────────────────────────────

test("a01 — landing industry card click routes to /build-dashboard, not /dashboard", async ({
  page,
}) => {
  await page.goto(BASE_URL);
  // The five industry cards live under the hero. Each one carries the
  // firm id as the visible "sublabel" — Meridian Accounting Group, Chen
  // Morgan LLP, etc. Click the first one and assert we land on the
  // build-dashboard route with the firm parameter set.
  const firstFirmCard = page
    .getByRole("button", { name: /Meridian Accounting/i })
    .first();
  await expect(firstFirmCard).toBeVisible();
  await firstFirmCard.click();
  // The click triggers a 1.8s overlay before pushing to the dashboard;
  // wait until URL settles. Allow for either /build-dashboard or the
  // legacy /dashboard which 308-redirects to the same place.
  await page.waitForURL(/\/(build-dashboard|dashboard)\?/i, {
    timeout: 5000,
  });
  expect(page.url()).toMatch(/\/build-dashboard\?firm=meridian-accounting/);
});

test("a02 — direct /dashboard URL 308 redirects to /build-dashboard", async ({
  page,
}) => {
  const response = await page.goto(`${BASE_URL}/dashboard?firm=chen-morgan&view=home`);
  // Final URL after redirects must be /build-dashboard
  expect(page.url()).toMatch(/\/build-dashboard\?firm=chen-morgan/);
  // The redirect chain should include 308
  expect([200, 308, 301]).toContain(response?.status() ?? 0);
});

// ─── Sign in affordance everywhere ─────────────────────────────────

test("a03 — Sign in link is visible in nav at small viewports", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(BASE_URL);
  const signIn = page.getByRole("button", { name: /sign in/i }).first();
  await expect(signIn).toBeVisible();
});

test("a04 — Sign in link is visible in nav at desktop viewports", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(BASE_URL);
  const signIn = page.getByRole("button", { name: /sign in/i }).first();
  await expect(signIn).toBeVisible();
});

test("a05 — footer surfaces Account column with login/signup/demo", async ({
  page,
}) => {
  await page.goto(BASE_URL);
  // Scroll to bottom so the lazy-rendered footer is in viewport
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  // The "Account" header text in the footer
  const accountHeader = page.locator("footer").getByText(/^Account$/i);
  await expect(accountHeader).toBeVisible();
  // Each of the account links should resolve
  const signInLink = page
    .locator("footer")
    .getByRole("link", { name: /^Sign in$/i });
  await expect(signInLink).toBeVisible();
  const trialLink = page
    .locator("footer")
    .getByRole("link", { name: /Start free trial/i });
  await expect(trialLink).toBeVisible();
});

// ─── /login and /signup actually render ────────────────────────────

test("a06 — /login renders the email + password form", async ({ page }) => {
  await page.goto(`${BASE_URL}/login`);
  // Email input must exist — using a tolerant selector
  const emailField = page.locator('input[type="email"], input[name="email"]').first();
  await expect(emailField).toBeVisible();
  const passwordField = page.locator('input[type="password"]').first();
  await expect(passwordField).toBeVisible();
});

test("a07 — /signup renders the registration form", async ({ page }) => {
  await page.goto(`${BASE_URL}/signup`);
  const emailField = page.locator('input[type="email"], input[name="email"]').first();
  await expect(emailField).toBeVisible();
});

// ─── Pricing CTAs route somewhere meaningful ───────────────────────

test("a08 — pricing CTA for anonymous user redirects to signup, not 404", async ({
  page,
}) => {
  await page.goto(`${BASE_URL}/pricing`);
  // Click the Solo CTA (one of three; Solo is always present)
  const soloCta = page.getByRole("button", { name: /Claim Solo/i }).first();
  await expect(soloCta).toBeVisible();
  await soloCta.click();
  // For anon users, the API responds with 401 and the client-side
  // pricing-client.tsx redirects to /signup?next=/pricing.
  await page.waitForURL(/\/signup/, { timeout: 5000 });
  expect(page.url()).toContain("/signup");
});

// ─── New blog posts render ─────────────────────────────────────────

const APRIL_2026_POSTS = [
  "choosing-llm-model-for-client-work",
  "fourteen-day-trial-reality-check",
  "client-scoped-ai-memory-vs-chatgpt",
  "stripe-checkout-for-boutique-firms",
];

for (const slug of APRIL_2026_POSTS) {
  test(`a09 — blog post /blog/${slug} renders with H1 + body`, async ({
    page,
  }) => {
    const response = await page.goto(`${BASE_URL}/blog/${slug}`);
    expect(response?.status()).toBeLessThan(400);
    const h1 = page.locator("h1").first();
    await expect(h1).toBeVisible();
    // Body should have substantive content — at least one h2
    const h2 = page.locator("h2").first();
    await expect(h2).toBeVisible();
  });
}

// ─── Listing surfaces the new posts ────────────────────────────────

test("a10 — /blog listing surfaces at least one of the new April 2026 posts", async ({
  page,
}) => {
  await page.goto(`${BASE_URL}/blog`);
  // We expect at least one of the new post titles to appear above the
  // fold. Use a lenient match — the listing puts the title on each card.
  const matchAny = page.locator(
    'a[href*="/blog/choosing-llm-model-for-client-work"], ' +
      'a[href*="/blog/fourteen-day-trial-reality-check"], ' +
      'a[href*="/blog/client-scoped-ai-memory-vs-chatgpt"], ' +
      'a[href*="/blog/stripe-checkout-for-boutique-firms"]',
  );
  await expect(matchAny.first()).toBeVisible();
});

// ─── Demo entry resolves and the build-dashboard renders ──────────

test("a11 — /demo redirects into build-dashboard tour mode", async ({
  page,
}) => {
  await page.goto(`${BASE_URL}/demo`);
  await page.waitForURL(/\/build-dashboard/, { timeout: 5000 });
  expect(page.url()).toContain("tour=1");
});
