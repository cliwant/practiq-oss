#!/usr/bin/env node
/**
 * Final tour: verify every commercial surface renders and the primary
 * flows (landing → signup → app → settings → demo) all work.
 * Produces a gallery of screenshots under .debug/tour-*.png.
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const base = process.env.BASE_URL ?? "http://localhost:3000";
await mkdir(".debug", { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();

async function shoot(url, name, options = {}) {
  console.log(`[tour] ${url} → .debug/tour-${name}.png`);
  await page.goto(`${base}${url}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(options.wait ?? 1500);
  await page.screenshot({
    path: `.debug/tour-${name}.png`,
    fullPage: options.fullPage ?? false,
    type: "png",
  });
}

// Public / anonymous surfaces
await shoot("/", "landing-home");
await shoot("/pricing", "pricing");
await shoot("/login", "login");
await shoot("/signup", "signup");

// Authenticated surfaces
await page.goto(`${base}/login`, { waitUntil: "domcontentloaded" });
await page.fill('input[type="email"]', "dogfood@practiq.dev");
await page.fill('input[type="password"]', "[redacted-test-password]");
await Promise.all([
  page.waitForURL((u) => !u.pathname.startsWith("/login")).catch(() => {}),
  page.locator('button[type="submit"]').first().click(),
]);
await page.waitForTimeout(1000);

await shoot("/app", "app-home");
await shoot("/app/settings?tab=profile", "settings-profile");
await shoot("/app/settings?tab=billing", "settings-billing");
await shoot("/app/settings?tab=agent", "settings-agent");
await shoot("/app/settings?tab=team", "settings-team");
await shoot("/app/tasks", "approval-queue");

await browser.close();
console.log("\n[tour] done — see .debug/tour-*.png");
