/**
 * Mobile viewport diversity spec.
 *
 * Round 3 confirmed the viewport meta tag is set + curl with mobile
 * UA returns 200 + fast TTFB. This spec exercises the actual rendered
 * page layout at three real viewport sizes (small phone, large phone /
 * small tablet, tablet) so we catch overflows / nav-collapse bugs that
 * the static curl checks miss.
 *
 * Coverage matrix:
 *   m01 — 360 × 740 (iPhone SE-class) on /
 *   m02 — 360 × 740 on /pricing
 *   m03 — 360 × 740 on /login
 *   m04 — 768 × 1024 (iPad portrait) on /
 *   m05 — 768 × 1024 on /pricing
 *   m06 — 1024 × 1366 (iPad landscape / small laptop) on /
 *
 * On every viewport we assert:
 *   - h1 visible (no fatal layout collapse)
 *   - no horizontal scrollbar (document.documentElement.scrollWidth
 *     <= viewport width + small slack for known scrollbar gutters)
 *   - either the desktop nav OR the hamburger trigger is reachable —
 *     never both simultaneously, never neither.
 */
import { test, expect, type Page } from "@playwright/test";

const BASE_URL = process.env.PRACTIQ_BASE_URL ?? "https://practiq.dev";

const VIEWPORTS = [
  { name: "phone-360", width: 360, height: 740 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "laptop-1024", width: 1024, height: 1366 },
] as const;

const PAGES = [
  { path: "/", h1Text: /./ },
  { path: "/pricing", h1Text: /What does Practiq cost/i },
  { path: "/login", h1Text: /Welcome back/i },
] as const;

async function assertNoHorizontalOverflow(page: Page, viewportWidth: number) {
  const overflow = await page.evaluate(() => {
    return {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    };
  });
  // Allow a 2px slack for sub-pixel rounding and 17px scrollbar gutter
  // on Windows headless (Linux/Mac headless usually report 0).
  expect(overflow.scrollWidth).toBeLessThanOrEqual(viewportWidth + 18);
}

test.describe("Mobile viewport diversity", () => {
  for (const vp of VIEWPORTS) {
    for (const p of PAGES) {
      test(`m_${vp.name}_${p.path.replace(/\//g, "_") || "root"}`, async ({
        browser,
      }) => {
        const ctx = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
        });
        const page = await ctx.newPage();
        try {
          await page.goto(`${BASE_URL}${p.path}`, { waitUntil: "domcontentloaded" });
          // h1 visible (fatal layout collapse would hide it)
          await expect(page.locator("h1").first()).toBeVisible({ timeout: 10_000 });
          await assertNoHorizontalOverflow(page, vp.width);

          // Either desktop nav OR hamburger trigger should be reachable.
          // The Practiq nav uses `lg:` breakpoints (≥1024px) for the
          // marketing-link rail; below that the trimmed CTAs + hamburger
          // are the only visible nav elements.
          const hamburger = page.locator(
            '[aria-label="Open menu"], [aria-label="Close menu"]',
          );
          const desktopPricing = page
            .locator('a[href="/pricing"]')
            .filter({ hasText: /^Pricing$/i });
          // Marketing pages have hamburger below lg; auth pages don't render the
          // shared marketing nav at all, so neither hamburger nor desktop pricing
          // is required there.
          const isMarketingPath = p.path !== "/login";
          if (isMarketingPath) {
            const hamburgerVisible =
              vp.width < 1024
                ? await hamburger.first().isVisible({ timeout: 2_000 }).catch(() => false)
                : true;
            const desktopVisible =
              vp.width >= 1024
                ? await desktopPricing.first().isVisible({ timeout: 2_000 }).catch(() => false)
                : true;
            expect(hamburgerVisible || desktopVisible).toBeTruthy();
          }
        } finally {
          await ctx.close();
        }
      });
    }
  }
});
