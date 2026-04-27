/**
 * Playwright configuration for Practiq E2E tests.
 *
 * The default base URL is set via PRACTIQ_BASE_URL — ALL tests in
 * tests/e2e/ run against whatever URL that points to. This makes the
 * suite trivially repointable:
 *
 *   PRACTIQ_BASE_URL=http://localhost:3000 npx playwright test
 *   PRACTIQ_BASE_URL=https://practiq.dev npx playwright test
 *   PRACTIQ_BASE_URL=https://fractional-…vercel.app npx playwright test
 *
 * Production smoke runs intentionally use chromium-only — we want
 * fast cross-deploy validation, not a full cross-browser matrix.
 * If we add browser-specific code (Safari ITP cookie issues, e.g.)
 * we can grow into webkit + firefox here without touching tests.
 *
 * No `webServer` config — these tests don't spin up a dev server;
 * they hit whatever URL is provided. That keeps the suite usable
 * against production deployments and CI staging deploys identically.
 */
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false, // tests share state-aware actions (signup races)
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "list" : "list",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: process.env.PRACTIQ_BASE_URL ?? "https://practiq.dev",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    // 30s per page nav — accounts for cold serverless functions on
    // production deployments that haven't warmed yet.
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
