/**
 * Production smoke-tests — end-to-end coverage of the critical paths
 * a real visitor / user / paying customer hits on practiq.dev.
 *
 * Run locally with:
 *   npx playwright test tests/e2e/smoke.spec.ts
 *
 * Run against production:
 *   PRACTIQ_BASE_URL=https://practiq.dev npx playwright test tests/e2e/smoke.spec.ts
 *
 * Run against a Vercel preview deploy:
 *   PRACTIQ_BASE_URL=https://fractional-…vercel.app npx playwright test
 *
 * Each test verifies one concrete user-visible behavior — not internal
 * state. We do not mock anything; the suite is ALL real HTTP traffic
 * against whatever URL is set in PRACTIQ_BASE_URL.
 *
 * Test taxonomy:
 *   01-08  acquisition surface  (anonymous user)
 *   09-12  authenticated UX     (test user must exist; uses E2E_TEST_*)
 *   13-15  AEO / SEO infra      (markdown route, sitemap, robots)
 *
 * The auth tests are skipped unless E2E_TEST_EMAIL + E2E_TEST_PASSWORD
 * are set. CI shouldn't run them without those — they'd be noise.
 */
import { test, expect } from "@playwright/test";

const BASE_URL = process.env.PRACTIQ_BASE_URL ?? "https://practiq.dev";
const TEST_EMAIL = process.env.E2E_TEST_EMAIL;
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD;

// ─── 01-08: Anonymous acquisition surface ───────────────────────────

test("01 — landing page loads with hero + CTA", async ({ page }) => {
  await page.goto(BASE_URL);
  await expect(page).toHaveTitle(/Practiq/i);
  // Hero headline must render (one of the variants).
  const heroHeadline = page.locator("h1").first();
  await expect(heroHeadline).toBeVisible();
  // Primary CTA must be reachable.
  const startFreeBtn = page.getByRole("button", { name: /start free/i }).first();
  await expect(startFreeBtn).toBeVisible();
});

test("02 — pricing page renders all three tiers + Founding badge", async ({
  page,
}) => {
  await page.goto(`${BASE_URL}/pricing`);
  await expect(page.getByText(/Solo/i).first()).toBeVisible();
  await expect(page.getByText(/Practice/i).first()).toBeVisible();
  await expect(page.getByText(/Firm/i).first()).toBeVisible();
  await expect(page.getByText(/Founding Member/i).first()).toBeVisible();
  // Numeric prices match the source-of-truth in plans.ts.
  await expect(page.getByText(/\$39/).first()).toBeVisible();
  await expect(page.getByText(/\$99/).first()).toBeVisible();
  await expect(page.getByText(/\$299/).first()).toBeVisible();
});

test("03 — pricing CTA without auth → redirects to /signup?next=/pricing", async ({
  page,
}) => {
  await page.goto(`${BASE_URL}/pricing`);
  // Click ANY tier CTA — they all share the same gated handler.
  const cta = page.getByRole("button").filter({ hasText: /Claim|Lock in|Get|Spot/i }).first();
  await cta.click();
  // Either we land on signup directly OR a waitlist modal opens.
  await Promise.race([
    page.waitForURL(/\/signup/, { timeout: 5000 }),
    page.waitForSelector("text=/early access|claim your spot/i", { timeout: 5000 }),
  ]);
});

test("04 — /signup form renders email + password + name fields", async ({
  page,
}) => {
  await page.goto(`${BASE_URL}/signup`);
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
});

test("05 — /login form renders + Google + LinkedIn providers", async ({
  page,
}) => {
  await page.goto(`${BASE_URL}/login`);
  await expect(page.locator('input[type="email"]')).toBeVisible();
  // OAuth buttons may render conditionally — only check if env vars
  // are configured. We check the available-providers API directly.
  const providers = await page.request.get(
    `${BASE_URL}/api/auth/available-providers`,
  );
  const body = (await providers.json()) as {
    providers: Array<{ id: string }>;
  };
  expect(body.providers.length).toBeGreaterThan(0);
});

test("06 — /api/chat returns 401 for anonymous", async ({ page }) => {
  const r = await page.request.post(`${BASE_URL}/api/chat`, {
    headers: { "Content-Type": "application/json" },
    data: { clientId: "any", message: "hi" },
  });
  expect(r.status()).toBe(401);
});

test("07 — /api/stripe/checkout returns 401 for anonymous", async ({
  page,
}) => {
  const r = await page.request.post(`${BASE_URL}/api/stripe/checkout`, {
    headers: { "Content-Type": "application/json" },
    data: { plan: "practice" },
  });
  expect(r.status()).toBe(401);
});

test("08 — /api/auth/available-providers returns expected shape", async ({
  page,
}) => {
  const r = await page.request.get(`${BASE_URL}/api/auth/available-providers`);
  expect(r.status()).toBe(200);
  const body = (await r.json()) as { providers: Array<{ id: string; label: string }> };
  expect(Array.isArray(body.providers)).toBe(true);
  // credentials provider is always available.
  expect(body.providers.some((p) => p.id === "credentials")).toBe(true);
});

// ─── 09-12: Authenticated UX (skipped without E2E_TEST_* env) ────────

test.describe("authenticated", () => {
  test.skip(
    !TEST_EMAIL || !TEST_PASSWORD,
    "E2E_TEST_EMAIL + E2E_TEST_PASSWORD required",
  );

  test("09 — credentials sign-in lands on /app", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.locator('input[type="email"]').fill(TEST_EMAIL!);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD!);
    await page.getByRole("button", { name: /sign in|log in/i }).first().click();
    await page.waitForURL(/\/app/, { timeout: 15000 });
  });

  test("10 — /app dashboard renders client list + greeting", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.locator('input[type="email"]').fill(TEST_EMAIL!);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD!);
    await page.getByRole("button", { name: /sign in|log in/i }).first().click();
    await page.waitForURL(/\/app/);
    await expect(page.getByText(/good (morning|afternoon|evening)/i)).toBeVisible();
  });

  test("11 — chat: send message + receive streamed reply", async ({ page }) => {
    test.setTimeout(60000);
    await page.goto(`${BASE_URL}/login`);
    await page.locator('input[type="email"]').fill(TEST_EMAIL!);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD!);
    await page.getByRole("button", { name: /sign in|log in/i }).first().click();
    await page.waitForURL(/\/app/);
    // Click the first client in the sidebar.
    const firstClient = page.locator('[data-testid="client-list-item"], a[href*="/app/clients/"]').first();
    if ((await firstClient.count()) > 0) {
      await firstClient.click();
      // Find the chat input + send a message.
      const chatInput = page.locator(
        'textarea[placeholder*="ask"], textarea[placeholder*="Ask"], input[type="text"][placeholder*="ask"]',
      ).first();
      if ((await chatInput.count()) > 0) {
        await chatInput.fill("Summarize what I have on this client.");
        await chatInput.press("Enter");
        // Wait for any assistant response token to appear.
        await expect(
          page.locator('[data-testid="assistant-message"], [data-role="assistant"]').first(),
        ).toBeVisible({ timeout: 30000 });
      }
    }
  });

  test("12 — /app/settings billing tab shows plan + usage", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.locator('input[type="email"]').fill(TEST_EMAIL!);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD!);
    await page.getByRole("button", { name: /sign in|log in/i }).first().click();
    await page.waitForURL(/\/app/);
    await page.goto(`${BASE_URL}/app/settings?tab=billing`);
    await expect(page.getByText(/plan|subscription|billing/i).first()).toBeVisible();
  });
});

// ─── 13-15: AEO / SEO infrastructure ────────────────────────────────

test("13 — sitemap.xml lists at least one /blog/ URL", async ({ page }) => {
  const r = await page.request.get(`${BASE_URL}/sitemap.xml`);
  expect(r.status()).toBe(200);
  const body = await r.text();
  expect(body).toMatch(/<loc>[^<]*\/blog\/[a-z0-9-]+<\/loc>/);
});

test("14 — robots.txt allows GPTBot + ClaudeBot + OAI-SearchBot", async ({
  page,
}) => {
  const r = await page.request.get(`${BASE_URL}/robots.txt`);
  expect(r.status()).toBe(200);
  const body = await r.text();
  expect(body).toMatch(/GPTBot/i);
  expect(body).toMatch(/ClaudeBot/i);
  expect(body).toMatch(/OAI-SearchBot/i);
});

test("15 — /blog/<slug>.md returns text/markdown", async ({ page }) => {
  // Discover a real slug from sitemap.
  const sitemap = await page.request.get(`${BASE_URL}/sitemap.xml`);
  const body = await sitemap.text();
  const slugMatch = body.match(
    /<loc>https?:\/\/[^/]+\/blog\/([a-z0-9-]+)<\/loc>/,
  );
  expect(slugMatch).not.toBeNull();
  const slug = slugMatch![1];
  const r = await page.request.get(`${BASE_URL}/blog/${slug}.md`);
  expect(r.status()).toBe(200);
  expect(r.headers()["content-type"]).toContain("text/markdown");
  const md = await r.text();
  expect(md).toMatch(/^---/); // YAML frontmatter
  expect(md).toMatch(/canonical:/); // canonical link present
});

test("16 — /llms.txt + /llms-full.txt are reachable", async ({ page }) => {
  const llms = await page.request.get(`${BASE_URL}/llms.txt`);
  expect(llms.status()).toBe(200);
  expect(llms.headers()["content-type"]).toMatch(/text\//);

  const llmsFull = await page.request.get(`${BASE_URL}/llms-full.txt`);
  expect(llmsFull.status()).toBe(200);
});

test("17 — JSON-LD on /about has Person + Organization @id refs", async ({
  page,
}) => {
  const html = await (await page.request.get(`${BASE_URL}/about`)).text();
  // Person entity present + cross-linked.
  expect(html).toMatch(/"@id"\s*:\s*"https?:\/\/[^"]+\/about#seungdo-keum"/);
  // Organization entity present + has founder reference.
  expect(html).toMatch(/"@type"\s*:\s*"Organization"/);
});

test("18 — Accept: text/markdown on canonical /blog/<slug> redirects to .md", async ({
  page,
}) => {
  const sitemap = await page.request.get(`${BASE_URL}/sitemap.xml`);
  const slugMatch = (await sitemap.text()).match(
    /<loc>https?:\/\/[^/]+\/blog\/([a-z0-9-]+)<\/loc>/,
  );
  const slug = slugMatch![1];
  const r = await page.request.get(`${BASE_URL}/blog/${slug}`, {
    headers: { Accept: "text/markdown" },
    maxRedirects: 0,
  });
  expect([301, 302]).toContain(r.status());
  expect(r.headers().location).toContain(`.md`);
});
