/**
 * Persona journey E2E — the spec that protects the user-promised flow:
 * "any target persona who arrives at the landing page can sign up,
 *  poke around the demo + dashboard, hit Settings to pick a model and
 *  see their trial state, and reach Stripe Checkout for paid plans
 *  without any error along the way."
 *
 * Run locally:
 *   PRACTIQ_BASE_URL=http://localhost:3000 \
 *     npx playwright test tests/e2e/persona-journey.spec.ts
 *
 * Run against production (spawns disposable test accounts each run):
 *   PRACTIQ_BASE_URL=https://practiq.dev \
 *     npx playwright test tests/e2e/persona-journey.spec.ts --reporter=list
 *
 * Test accounts:
 *   Each test creates its own email of the form
 *     `e2e-persona-<timestamp>-<n>@practiq-test.cliwant.com`
 *   so reruns never collide with the production users table. The
 *   accounts persist (Practiq has no admin delete UI yet) but they
 *   stay isolated from real signups thanks to the unique-prefix.
 */
import { test, expect, type Page } from "@playwright/test";

const BASE_URL = process.env.PRACTIQ_BASE_URL ?? "https://practiq.dev";

// One unique stem per test process keeps every assertion in this file
// pointed at a single fresh user so we can chain follow-up checks
// without an extra signup per test.
const TS = Date.now();
const PERSONA_EMAIL_BASE = `e2e-persona-${TS}`;
const PERSONA_PASSWORD = "PersonaJourney!2026";

function uniqueEmail(suffix: string): string {
  return `${PERSONA_EMAIL_BASE}-${suffix}@practiq-test.cliwant.com`;
}

// ──────────────────────────────────────────────────────────────────
// Persona journey — fresh signup, dashboard tour, settings, pricing
// ──────────────────────────────────────────────────────────────────

test.describe.configure({ mode: "serial" });

test.describe("persona journey on production", () => {
  let page: Page;
  const accountEmail = uniqueEmail("primary");

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    page.on("pageerror", (err) => {
      console.error(`[pageerror on ${page.url()}]:`, err.message);
    });
  });

  test.afterAll(async () => {
    await page.close();
  });

  test("p01 — landing page paints + primary CTAs visible", async () => {
    await page.goto(BASE_URL);
    await expect(page.getByRole("button", { name: /start free/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i }).first()).toBeVisible();
    // Hero headline (one of the variants) is the visible h1
    const heroH1 = page.locator("h1").first();
    await expect(heroH1).toBeVisible();
  });

  test("p02 — fresh signup completes + lands user in /app", async () => {
    await page.goto(`${BASE_URL}/signup`);
    // Wait for the form
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    await expect(emailInput).toBeVisible();
    await emailInput.fill(accountEmail);

    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill(PERSONA_PASSWORD);

    // The signup form may also have firmName / firmVertical fields — fill if present
    const firmName = page.locator('input[name="firmName"], input[placeholder*="firm" i]').first();
    if (await firmName.count()) {
      await firmName.fill("Persona Test Firm");
    }
    const firmVertical = page.locator('select[name="firmVertical"]').first();
    if (await firmVertical.count()) {
      await firmVertical.selectOption({ value: "accounting" }).catch(() => undefined);
    }

    // Submit — try multiple ways the button might be labeled
    const submitButton = page
      .getByRole("button", { name: /create account|sign up|get started|start free/i })
      .first();
    await submitButton.click();

    // After signup the app should land on /app (with sample seeded) OR /verify-email.
    // Either is acceptable — both are valid onboarding states.
    await page.waitForURL(/\/(app|verify-email)/, { timeout: 15_000 });
    expect(page.url()).toMatch(/\/(app|verify-email)/);
  });

  test("p03 — /app home renders + plan-usage meter shows trial + sample client", async () => {
    // If we were sent to /verify-email, hop directly to /app — the
    // current production flow does NOT gate /app on emailVerified
    // (NextAuth credentials provider doesn't check that field).
    await page.goto(`${BASE_URL}/app`);
    // Greeting header
    await expect(page.locator("h1").first()).toBeVisible();
    // Plan usage meter renders for trial users
    const meter = page.getByText(/free trial — usage today|usage this period/i).first();
    await expect(meter).toBeVisible({ timeout: 10_000 });
    // Sample client banner OR onboarding checklist should be present
    const hasOnboarding = await page
      .getByText(/Add your first client|sample client|seeded with one sample/i)
      .first()
      .isVisible()
      .catch(() => false);
    expect(hasOnboarding).toBeTruthy();
  });

  test("p04 — /app/settings profile tab loads (no 500)", async () => {
    await page.goto(`${BASE_URL}/app/settings`);
    await expect(page.getByRole("heading", { name: /^Settings$/ })).toBeVisible();
    // Profile tab default
    await expect(page.getByRole("button", { name: /Profile/i }).first()).toBeVisible();
    // Email field shows the signup email
    await expect(page.getByText(accountEmail).first()).toBeVisible();
  });

  test("p05 — /app/settings Agent tab exposes the LLM model picker (this is the schema bug detector)", async () => {
    // Click Agent tab. If preferred_model column missing on prod,
    // settings page would have already 500'd on p04 — but the model
    // picker UI only renders inside this tab.
    await page.goto(`${BASE_URL}/app/settings?tab=agent`);
    await expect(page.getByText(/Default model/i).first()).toBeVisible({ timeout: 10_000 });
    // Catalog labels should appear
    await expect(page.getByText(/Claude Sonnet 4\.5/i).first()).toBeVisible();
    await expect(page.getByText(/Claude Haiku 4\.5/i).first()).toBeVisible();
    // Locked option for free tier
    await expect(page.getByText(/Practice\+/i).first()).toBeVisible();
  });

  test("p06 — model picker save round-trips through PATCH /api/users/me", async () => {
    await page.goto(`${BASE_URL}/app/settings?tab=agent`);
    // Click Haiku 4.5 button (allowed on free tier)
    const haikuBtn = page.getByRole("button", { name: /Claude Haiku 4\.5/i }).first();
    await haikuBtn.click();
    // Save changes
    const saveBtn = page.getByRole("button", { name: /Save changes/i }).first();
    await saveBtn.click();
    // Expect a "Saved" indicator within 5s
    await expect(page.getByText(/^Saved$/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test("p07 — Billing tab shows free-trial state without a Stripe customer", async () => {
    await page.goto(`${BASE_URL}/app/settings?tab=billing`);
    await expect(page.locator("body")).not.toContainText("500");
    // Either an active subscription block OR a "no plan / start a plan" CTA must be present
    const hasFreeOrUpgrade = await page
      .getByText(/Free trial|Choose a plan|Upgrade|Solo|Practice/i)
      .first()
      .isVisible();
    expect(hasFreeOrUpgrade).toBeTruthy();
  });

  test("p08 — Team tab loads (invite form visible)", async () => {
    await page.goto(`${BASE_URL}/app/settings?tab=team`);
    await expect(page.getByText(/Invite a teammate|colleague@firm.com/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("p09 — pricing CTAs route to Stripe Checkout (Solo plan)", async () => {
    await page.goto(`${BASE_URL}/pricing`);
    const soloCta = page.getByRole("button", { name: /Claim Solo/i }).first();
    await expect(soloCta).toBeVisible();
    // Click and watch the network — pricing-client.tsx redirects via window.location
    // when the API returns { url }. We listen for that navigation.
    const navPromise = page.waitForURL(/checkout\.stripe\.com|\/login|\/signup/, { timeout: 20_000 });
    await soloCta.click();
    await navPromise;
    // For an authenticated test account (which is what we are post-p02),
    // the API should return a Stripe Checkout URL — anything else
    // means the checkout flow is broken for paying users.
    expect(page.url()).toMatch(/checkout\.stripe\.com/);
  });

  test("p10 — pricing Practice founding CTA also reaches Stripe", async () => {
    await page.goto(`${BASE_URL}/pricing`);
    const practiceCta = page
      .getByRole("button", { name: /Lock in Founding|Founding/i })
      .first();
    await expect(practiceCta).toBeVisible();
    const navPromise = page.waitForURL(/checkout\.stripe\.com/, { timeout: 20_000 });
    await practiceCta.click();
    await navPromise;
    expect(page.url()).toMatch(/checkout\.stripe\.com/);
  });

  test("p11 — Firm CTA also reaches Stripe", async () => {
    await page.goto(`${BASE_URL}/pricing`);
    const firmCta = page.getByRole("button", { name: /Claim Firm/i }).first();
    await expect(firmCta).toBeVisible();
    const navPromise = page.waitForURL(/checkout\.stripe\.com/, { timeout: 20_000 });
    await firmCta.click();
    await navPromise;
    expect(page.url()).toMatch(/checkout\.stripe\.com/);
  });
});
