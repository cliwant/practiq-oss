#!/usr/bin/env node
/**
 * Sign in, open /app, click the first seeded client (e.g. Kim's
 * Restaurant), screenshot the client workspace — the place the AI
 * and the human collaborate per-client.
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const email = process.env.DOGFOOD_EMAIL ?? "dogfood@practiq.dev";
const password = process.env.DOGFOOD_PASSWORD ?? "[redacted-test-password]";
const base = process.env.BASE_URL ?? "http://localhost:3000";
await mkdir(".debug", { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

await page.goto(`${base}/login`, { waitUntil: "domcontentloaded" });
await page.fill('input[type="email"]', email);
await page.fill('input[type="password"]', password);
await Promise.all([
  page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30_000 }).catch(() => {}),
  page.locator('button[type="submit"]').first().click(),
]);

if (!page.url().includes("/app")) await page.goto(`${base}/app`);
await page.waitForTimeout(1500);

// Click the first client card
console.log("[client] clicking first client in sidebar");
const firstClient = page.locator('aside button, aside a').filter({ hasText: /Kim|TechStart|Downtown|Restaurant|Medical|Inc/ }).first();
if (await firstClient.count()) {
  await firstClient.click();
} else {
  // fallback: first main-area card
  await page.locator('main >> text=Kim').first().click().catch(() => {});
}
await page.waitForTimeout(2500);

console.log(`[client] url=${page.url()}`);
await page.screenshot({ path: ".debug/client-workspace.png", fullPage: false });
console.log("[client] saved .debug/client-workspace.png");
await page.screenshot({ path: ".debug/client-workspace-full.png", fullPage: true });

await browser.close();
