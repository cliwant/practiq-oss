/**
 * Playwright configuration for Practiq E2E tests.
 *
 * The default base URL is set via PRACTIQ_BASE_URL (preferred) or
 * E2E_BASE_URL (alias) — ALL tests in tests/e2e/ run against whatever
 * URL that points to. This makes the suite trivially repointable:
 *
 *   PRACTIQ_BASE_URL=http://localhost:3000 npx playwright test
 *   PRACTIQ_BASE_URL=https://practiq.dev npx playwright test
 *   PRACTIQ_BASE_URL=https://fractional-…vercel.app npx playwright test
 *
 * Two projects ship:
 *   - chromium-desktop  (Desktop Chrome viewport)
 *   - chromium-mobile   (Pixel 5 viewport, chromium-based, mobile UA)
 *
 * Mobile coverage exists because Practiq's hamburger nav / drawer +
 * the dark-theme form layouts are easy to regress in. The Lighthouse
 * job already audits mobile rendering for perf/a11y; the e2e mobile
 * project audits *behavior* (form submit, alert rendering, etc.).
 *
 * Timeout 60s per test: the LLM-backed routes (workflow-audit,
 * ai-policy-generator) take ~35s end-to-end against OpenRouter and a
 * cold Vercel function can add another 10-15s on top of that.
 *
 * No `webServer` config — these tests don't spin up a dev server;
 * they hit whatever URL is provided. That keeps the suite usable
 * against production deployments and CI Vercel previews identically.
 */
import { defineConfig, devices } from "@playwright/test";

const BASE_URL =
  process.env.PRACTIQ_BASE_URL ??
  process.env.E2E_BASE_URL ??
  "https://practiq.dev";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false, // tests share state-aware actions (signup races)
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]]
    : "list",
  // 60s per test — LLM-backed routes (workflow-audit /
  // ai-policy-generator) routinely run 30 – 45s end-to-end, and a
  // cold Vercel serverless function adds another 5 – 10s.
  timeout: 60_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium-mobile",
      // Use Pixel 5 (chromium-based) instead of iPhone 13 (webkit-based)
      // so we don't need to install the webkit browser binary just to
      // probe mobile viewport behavior. The 393×851 viewport is close
      // enough to iPhone 13's 390×844 for the regression checks the
      // mobile project actually targets (hamburger visibility, no
      // horizontal scroll). If we ever need true Safari-only behavior
      // (ITP cookies, etc.) we add a webkit project then.
      use: { ...devices["Pixel 5"] },
    },
  ],
});
