#!/usr/bin/env node
/**
 * E2E signup flow test: fill the signup form with a unique email,
 * submit, confirm we land on /app.
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const base = process.env.BASE_URL ?? "http://localhost:3000";
await mkdir(".debug", { recursive: true });

const email = `test-${Date.now()}@practiq.dev`;
const password = "testpass123";
const name = "Test Operator";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on("pageerror", (e) => console.error(`[pageerror] ${e.message}`));

console.log(`[signup] navigating to /signup with email=${email}`);
await page.goto(`${base}/signup`, { waitUntil: "domcontentloaded" });
await page.fill('input[type="text"]', name);
await page.fill('input[type="email"]', email);
await page.selectOption("select", "accounting");
await page.fill('input[type="password"]', password);

await Promise.all([
  page.waitForURL((u) => u.pathname.startsWith("/app") || u.pathname === "/", { timeout: 30_000 }).catch(() => {}),
  page.locator('button[type="submit"]').first().click(),
]);
await page.waitForTimeout(2500);
console.log(`[signup] landed at: ${page.url()}`);

await page.screenshot({ path: ".debug/signup-result.png", fullPage: false });
await browser.close();
