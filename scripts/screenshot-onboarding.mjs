#!/usr/bin/env node
/**
 * Sign up a brand-new user and screenshot /app so we can see the
 * onboarding checklist from scratch (0 clients, 0 everything).
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const base = process.env.BASE_URL ?? "http://localhost:3000";
await mkdir(".debug", { recursive: true });

const email = `onboarding-${Date.now()}@practiq.dev`;
const pw = "onboarding123";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

await page.goto(`${base}/signup`, { waitUntil: "domcontentloaded" });
await page.fill('input[type="text"]', "Jennifer");
await page.fill('input[type="email"]', email);
await page.selectOption("select", "accounting");
await page.fill('input[type="password"]', pw);
await Promise.all([
  page.waitForURL((u) => u.pathname.startsWith("/app")).catch(() => {}),
  page.locator('button[type="submit"]').first().click(),
]);
await page.waitForTimeout(2500);

await page.screenshot({
  path: ".debug/onboarding-fresh.png",
  fullPage: false,
});
console.log("[onboarding] saved .debug/onboarding-fresh.png for", email);

// Also the existing dogfood user (partial progress — clients seeded).
const p2 = await ctx.newPage();
await p2.goto(`${base}/login`);
await p2.fill('input[type="email"]', "dogfood@practiq.dev");
await p2.fill('input[type="password"]', "dogfood123");
await Promise.all([
  p2.waitForURL((u) => !u.pathname.startsWith("/login")).catch(() => {}),
  p2.locator('button[type="submit"]').first().click(),
]);
await p2.waitForTimeout(2000);
await p2.screenshot({ path: ".debug/onboarding-dogfood.png", fullPage: false });
console.log("[onboarding] saved .debug/onboarding-dogfood.png");

await browser.close();
