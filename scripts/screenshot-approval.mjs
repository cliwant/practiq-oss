#!/usr/bin/env node
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

// Find the Tasks / Approval queue link. Heuristic: icon with "tasks" route.
console.log("[approval] navigating to /app/tasks");
await page.goto(`${base}/app/tasks`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2000);

await page.screenshot({ path: ".debug/approval-queue.png", fullPage: false });
console.log("[approval] saved .debug/approval-queue.png");

// Full page too for the longer queue
await page.screenshot({ path: ".debug/approval-queue-full.png", fullPage: true });
console.log("[approval] saved .debug/approval-queue-full.png");

await browser.close();
