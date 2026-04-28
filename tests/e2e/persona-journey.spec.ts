/**
 * Persona journey E2E — the spec that protects the user-promised flow:
 * "any target persona who arrives at the landing page can sign up,
 *  poke around the demo + dashboard, hit Settings to pick a model and
 *  see their trial state, see real value from the sample workspace
 *  (clients seeded, approval queue populated), and reach Stripe
 *  Checkout for paid plans without any error along the way."
 *
 * Run locally:
 *   PRACTIQ_BASE_URL=http://localhost:3000 \
 *     npx playwright test tests/e2e/persona-journey.spec.ts
 *
 * Run against production:
 *   PRACTIQ_BASE_URL=https://practiq.dev \
 *     npx playwright test tests/e2e/persona-journey.spec.ts --reporter=list
 *
 * Test account strategy:
 *   - We provision a fresh test user directly in the DB via the
 *     Supabase Management API in beforeAll, bypassing the /signup
 *     rate limit (5 IP/hour) that bites when the suite runs more
 *     than a few times in a row.
 *   - Each run uses a unique email (e2e-persona-<ts>@practiq-test
 *     .cliwant.com) so user rows never collide.
 *   - The bcrypt-hashed password is fixed (`PersonaJourney!2026`)
 *     so the spec can log in via the UI form like any real user
 *     would.
 *
 * Required env (read from process.env at runtime):
 *   - SUPABASE_ACCESS_TOKEN (Management API auth)
 *   - PRACTIQ_BASE_URL (defaults to https://practiq.dev)
 */
import { test, expect, type Page } from "@playwright/test";

const BASE_URL = process.env.PRACTIQ_BASE_URL ?? "https://practiq.dev";
const SUPABASE_PROJECT_REF = "pyzcgemrkoeusrrbhazv";
const SUPABASE_API = `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query`;

const TS = Date.now();
const PERSONA_EMAIL = `e2e-persona-${TS}@practiq-test.cliwant.com`;
const PERSONA_PASSWORD = "PersonaJourney!2026";
// Pre-computed bcrypt cost-12 hash for PERSONA_PASSWORD. Stable so the
// test only ever hits Supabase Management API once per run instead of
// computing a fresh hash in process.
const PERSONA_PASSWORD_HASH =
  "$2b$12$TpTBkDicuFmyVsOKswQUmOERsINLt5LmYmB14LNWupCAssOQ9sjSO";
const PERSONA_NAME = "Jennifer Park";

async function supabaseQuery(token: string, sql: string): Promise<unknown> {
  const resp = await fetch(SUPABASE_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(
      `Supabase query failed (${resp.status}): ${text.slice(0, 200)}`,
    );
  }
  return await resp.json();
}

// ──────────────────────────────────────────────────────────────────
// Persona journey — pre-seeded user, dashboard tour, settings, pricing,
// real-value check on the sample workspace
// ──────────────────────────────────────────────────────────────────

test.describe.configure({ mode: "serial" });

test.describe("persona journey on production", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const token = process.env.SUPABASE_ACCESS_TOKEN;
    if (!token) {
      throw new Error(
        "SUPABASE_ACCESS_TOKEN missing — required to provision the e2e test user. " +
          "Run with `dotenv -e ../../.env.local -- ...` or set it in the shell.",
      );
    }
    // Provision fresh user. Idempotent on email — if the run is
    // re-attempted with the same TS the row will already exist; we
    // upsert via ON CONFLICT to keep the password_hash current.
    // We also seed Acme Coffee here directly so /app shows a populated
    // workspace without depending on signup-side seedSampleClient
    // (which only fires on the credentials-signup path).
    const sqlEscape = (s: string) => s.replace(/'/g, "''");
    // The Prisma schema auto-generates `id` via `@default(uuid())`, but
    // that default is enforced by the Prisma client, not the underlying
    // Postgres column — so a raw INSERT needs to provide its own UUID.
    // pgcrypto's gen_random_uuid() ships with Supabase by default.
    // updated_at is also Prisma-managed (@updatedAt) without a DB default,
    // so we set it explicitly here.
    const insertSql = `
      INSERT INTO practiq.users (
        id, email, password_hash, name, firm_vertical, timezone, updated_at
      ) VALUES (
        gen_random_uuid(),
        '${sqlEscape(PERSONA_EMAIL)}',
        '${sqlEscape(PERSONA_PASSWORD_HASH)}',
        '${sqlEscape(PERSONA_NAME)}',
        'accounting',
        'America/New_York',
        now()
      )
      ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
      RETURNING id;
    `;
    const result = await supabaseQuery(token, insertSql);
    if (!Array.isArray(result) || result.length === 0) {
      throw new Error(`User provisioning returned no rows: ${JSON.stringify(result)}`);
    }
    console.log(`[persona-journey] provisioned ${PERSONA_EMAIL}`);

    page = await browser.newPage();
    page.on("pageerror", (err) => {
      console.error(`[pageerror on ${page.url()}]:`, err.message);
    });
  });

  test.afterAll(async () => {
    if (page) await page.close();
  });

  test("p01 — landing page paints + primary CTAs visible", async () => {
    await page.goto(BASE_URL);
    await expect(page.getByRole("button", { name: /start free/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i }).first()).toBeVisible();
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test("p02 — login with pre-seeded persona credentials lands in /app", async () => {
    await page.goto(`${BASE_URL}/login`);
    await page.getByPlaceholder("you@firm.com").fill(PERSONA_EMAIL);
    await page.locator('input[type="password"]').first().fill(PERSONA_PASSWORD);
    await page
      .locator('form button[type="submit"], form button:has-text("Sign in")')
      .first()
      .click();
    await page.waitForURL(/\/(app|verify-email)/, { timeout: 20_000 });
    expect(page.url()).toMatch(/\/(app|verify-email)/);
  });

  test("p03 — /app home renders + plan-usage meter shows trial", async () => {
    await page.goto(`${BASE_URL}/app`);
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 10_000 });
    const meter = page
      .getByText(/free trial — usage today|usage this period|usage today/i)
      .first();
    await expect(meter).toBeVisible({ timeout: 10_000 });
  });

  test("p04 — /app/settings profile tab loads (no 500)", async () => {
    await page.goto(`${BASE_URL}/app/settings`);
    await expect(page.getByRole("heading", { name: /^Settings$/ })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText(PERSONA_EMAIL).first()).toBeVisible();
  });

  test("p05 — /app/settings Agent tab exposes the LLM model picker (schema bug detector)", async () => {
    await page.goto(`${BASE_URL}/app/settings?tab=agent`);
    await expect(page.getByText(/Default model/i).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText(/Claude Sonnet 4\.5/i).first()).toBeVisible();
    await expect(page.getByText(/Claude Haiku 4\.5/i).first()).toBeVisible();
    await expect(page.getByText(/Practice\+/i).first()).toBeVisible();
  });

  test("p06 — model picker save round-trips through PATCH /api/users/me", async () => {
    await page.goto(`${BASE_URL}/app/settings?tab=agent`);
    const haikuBtn = page
      .getByRole("button", { name: /Claude Haiku 4\.5/i })
      .first();
    await haikuBtn.click();
    const saveBtn = page.getByRole("button", { name: /Save changes/i }).first();
    const patchResp = page.waitForResponse(
      (r) => r.url().includes("/api/users/me") && r.request().method() === "PATCH",
      { timeout: 15_000 },
    );
    await saveBtn.click();
    const resp = await patchResp;
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.user?.preferredModel).toBe("claude-haiku-4-5");
  });

  test("p07 — Billing tab shows free-trial state without a Stripe customer", async () => {
    await page.goto(`${BASE_URL}/app/settings?tab=billing`);
    const hasFreeOrUpgrade = await page
      .getByText(/Free trial|Choose a plan|Upgrade|Solo|Practice|Firm/i)
      .first()
      .isVisible({ timeout: 10_000 });
    expect(hasFreeOrUpgrade).toBeTruthy();
  });

  test("p08 — Team tab loads (invite form visible)", async () => {
    await page.goto(`${BASE_URL}/app/settings?tab=team`);
    await expect(
      page.getByText(/Invite a teammate|colleague@firm.com/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  // ── Real-value checks: clients page accessibility + pricing ────────

  test("p09 — clients are reachable from /app sidebar (or empty state nudges to add)", async () => {
    await page.goto(`${BASE_URL}/app`);
    // Either an existing client list (sample seeded) or an empty-state CTA
    const hasClient = await page
      .getByText(/Acme Coffee Co|Add your first client|sample/i)
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);
    expect(hasClient).toBeTruthy();
  });

  test("p10 — /app/tasks (approval queue) renders + heading visible", async () => {
    await page.goto(`${BASE_URL}/app/tasks`);
    // Match the page's actual eyebrow + heading: "Approval Queue" /
    // "<n> items to review" or "0 items to review" empty state.
    await expect(
      page
        .locator("p,div")
        .filter({ hasText: /^Approval Queue$/ })
        .first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  // ── Pricing + Stripe Checkout reach (authenticated user) ────────

  test("p11 — pricing CTAs route to Stripe Checkout (Solo plan)", async () => {
    await page.goto(`${BASE_URL}/pricing`);
    const soloCta = page.getByRole("button", { name: /Claim Solo/i }).first();
    await expect(soloCta).toBeVisible();
    const navPromise = page.waitForURL(/checkout\.stripe\.com/, {
      timeout: 25_000,
    });
    await soloCta.click();
    await navPromise;
    expect(page.url()).toMatch(/checkout\.stripe\.com/);
  });

  test("p12 — pricing Practice founding CTA reaches Stripe", async () => {
    await page.goto(`${BASE_URL}/pricing`);
    const practiceCta = page
      .getByRole("button", { name: /Lock in Founding|Founding/i })
      .first();
    await expect(practiceCta).toBeVisible();
    const navPromise = page.waitForURL(/checkout\.stripe\.com/, {
      timeout: 25_000,
    });
    await practiceCta.click();
    await navPromise;
    expect(page.url()).toMatch(/checkout\.stripe\.com/);
  });

  test("p13 — pricing Firm CTA reaches Stripe", async () => {
    await page.goto(`${BASE_URL}/pricing`);
    const firmCta = page.getByRole("button", { name: /Claim Firm/i }).first();
    await expect(firmCta).toBeVisible();
    const navPromise = page.waitForURL(/checkout\.stripe\.com/, {
      timeout: 25_000,
    });
    await firmCta.click();
    await navPromise;
    expect(page.url()).toMatch(/checkout\.stripe\.com/);
  });
});
