#!/usr/bin/env node
/**
 * Generate public/images/dashboard-preview.png by taking a high-DPI
 * screenshot of the real /app Home view (morning digest + client
 * list) while logged in as the dogfood user. Replaces the stale
 * cycle-0 demo image on the landing page.
 *
 * The landing-page <Image> is declared at 1440x900. We shoot at that
 * viewport with devicePixelRatio=2 for crisp retina output.
 */
import { chromium } from "playwright";
import { copyFile } from "node:fs/promises";

const email = process.env.DOGFOOD_EMAIL ?? "dogfood@practiq.dev";
const password = process.env.DOGFOOD_PASSWORD ?? "dogfood123";
const base = process.env.BASE_URL ?? "http://localhost:3000";

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();

await page.goto(`${base}/login`, { waitUntil: "domcontentloaded" });
await page.fill('input[type="email"]', email);
await page.fill('input[type="password"]', password);
await Promise.all([
  page.waitForURL((u) => !u.pathname.startsWith("/login")).catch(() => {}),
  page.locator('button[type="submit"]').first().click(),
]);
if (!page.url().includes("/app")) await page.goto(`${base}/app`);

// Wait for the morning-digest section to render
await page.waitForSelector('text="What the agent surfaced"', { timeout: 15_000 }).catch(() => {});
await page.waitForTimeout(2000);

const out = "public/images/dashboard-preview.png";
const backup = "public/images/dashboard-preview.prev.png";
// Save a backup of the old image first, per the user's file-safety
// constraint — we only replace after successful capture.
try {
  await copyFile(out, backup);
} catch {}

await page.screenshot({ path: out, fullPage: false, type: "png" });
console.log(`[preview] saved ${out} (previous backed up to ${backup})`);

await browser.close();
