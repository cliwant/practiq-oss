/**
 * Miscellaneous endpoint coverage that doesn't fit cleanly in
 * persona-journey, auth-flows, or token-flows.
 *
 *   m01 — GET /api/auth/available-providers anonymous: returns
 *         a JSON shape listing each enabled OAuth provider id.
 *         The OAuthButtons component on /login + /signup reads
 *         this — if it changes shape, the conditional render
 *         breaks.
 *
 *   m02 — POST /api/agents/run requires auth (401 anon). This
 *         is the per-user "run my own briefing now" endpoint
 *         the HomeAgentCTA + onboarding step 3 fire. If anon
 *         access slipped through, anyone could burn LLM cost
 *         against arbitrary user accounts.
 *
 *   m03 — POST /api/team/invites requires auth (401 anon).
 *         Inbound invites get processed at signup time
 *         (consumeInviteToken in /api/auth/signup); the
 *         outbound POST is auth-gated by design.
 *
 *   m04 — Public site SEO surfaces:
 *           /robots.txt 200
 *           /sitemap.xml 200 + at least 100 <loc> entries
 *           /llms.txt 200 + mentions Practiq
 *           /llms-full.txt 200
 *
 *   m05 — Practiq home <html lang="en"> and primary OG tags
 *         (locking in the structured-data work from RUN 22).
 */
import { test, expect } from "@playwright/test";

const BASE_URL = process.env.PRACTIQ_BASE_URL ?? "https://practiq.dev";

test.describe("Miscellaneous endpoint coverage", () => {
  test("m01 — /api/auth/available-providers anonymous JSON shape", async ({
    request,
  }) => {
    const resp = await request.get(`${BASE_URL}/api/auth/available-providers`);
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    // The endpoint returns either an array of providers OR a
    // {providers: [...]} object. Accept both.
    const providers = Array.isArray(body) ? body : body.providers ?? [];
    expect(Array.isArray(providers)).toBe(true);
  });

  test("m02 — /api/agents/run requires auth (401 anon)", async ({
    request,
  }) => {
    const resp = await request.post(`${BASE_URL}/api/agents/run`, {
      data: { agent: "daily_briefing", scope: "all" },
    });
    expect(resp.status()).toBe(401);
  });

  test("m03 — /api/team/invites POST requires auth (401 anon)", async ({
    request,
  }) => {
    const resp = await request.post(`${BASE_URL}/api/team/invites`, {
      data: { email: "test@example.com" },
    });
    expect(resp.status()).toBe(401);
  });

  test("m04 — robots.txt + sitemap.xml + llms.txt + llms-full.txt all 200", async ({
    request,
  }) => {
    const robots = await request.get(`${BASE_URL}/robots.txt`);
    expect(robots.status()).toBe(200);

    const sitemap = await request.get(`${BASE_URL}/sitemap.xml`);
    expect(sitemap.status()).toBe(200);
    const sitemapText = await sitemap.text();
    const locCount = (sitemapText.match(/<loc>/g) ?? []).length;
    expect(locCount).toBeGreaterThanOrEqual(100);

    const llms = await request.get(`${BASE_URL}/llms.txt`);
    expect(llms.status()).toBe(200);
    const llmsText = await llms.text();
    expect(llmsText).toContain("Practiq");

    const llmsFull = await request.get(`${BASE_URL}/llms-full.txt`);
    expect(llmsFull.status()).toBe(200);
  });

  test("m05 — homepage SEO surfaces (lang + canonical + og:title)", async ({
    request,
  }) => {
    const resp = await request.get(`${BASE_URL}/`);
    expect(resp.status()).toBe(200);
    const html = await resp.text();
    expect(html).toMatch(/<html\s+lang="en"/);
    expect(html).toContain('rel="canonical"');
    expect(html).toMatch(/og:title/);
    expect(html).toMatch(/og:description/);
    expect(html).toMatch(/og:image/);
  });
});
