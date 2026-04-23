#!/usr/bin/env node
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const email = process.env.DOGFOOD_EMAIL ?? "dogfood@practiq.dev";
const password = process.env.DOGFOOD_PASSWORD ?? "dogfood123";
const base = process.env.BASE_URL ?? "http://localhost:3000";
await mkdir(".debug", { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

await page.goto(`${base}/login`, { waitUntil: "domcontentloaded" });
await page.fill('input[type="email"]', email);
await page.fill('input[type="password"]', password);
await Promise.all([
  page.waitForURL((u) => !u.pathname.startsWith("/login")).catch(() => {}),
  page.locator('button[type="submit"]').first().click(),
]);
if (!page.url().includes("/app")) await page.goto(`${base}/app`);
await page.waitForTimeout(1000);

await page.locator("aside").getByText(/TechStart Inc\./).first().click();
await page.waitForTimeout(1500);

for (const tab of ["Overview", "Knowledge", "Activity"]) {
  console.log(`[tabs] clicking ${tab}`);
  await page.getByText(new RegExp(`^${tab}`)).first().click();
  // Wait for any "Loading..." placeholder to clear before snapshot.
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(500);
    const stillLoading = await page.getByText(/Loading/i).count().catch(() => 0);
    if (stillLoading === 0) break;
  }
  const name = tab.toLowerCase();
  await page.screenshot({ path: `.debug/tab-${name}.png`, fullPage: false });
  console.log(`[tabs] saved .debug/tab-${name}.png`);
}

await browser.close();
