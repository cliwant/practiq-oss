#!/usr/bin/env node
/**
 * Sign in as the dogfood user and screenshot the /app workspace.
 *
 * Env:
 *   DOGFOOD_EMAIL    default dogfood@practiq.dev
 *   DOGFOOD_PASSWORD default dogfood123
 *
 * Run:
 *   DOGFOOD_EMAIL=you@x DOGFOOD_PASSWORD=y node scripts/screenshot-app.mjs
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const email = process.env.DOGFOOD_EMAIL ?? "dogfood@practiq.dev";
const password = process.env.DOGFOOD_PASSWORD ?? "dogfood123";
const base = process.env.BASE_URL ?? "http://localhost:3000";
const outDir = ".debug";
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

console.log(`[app] → ${base}/login`);
await page.goto(`${base}/login`, { waitUntil: "domcontentloaded", timeout: 30_000 });
await page.waitForSelector('input[type="email"]', { timeout: 10_000 });

console.log(`[app] filling login form`);
await page.fill('input[type="email"]', email);
await page.fill('input[type="password"]', password);

// Submit and wait for navigation away from /login.
const submit = page.locator('button[type="submit"]').first();
await Promise.all([
  page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30_000 }).catch(() => {}),
  submit.click(),
]);

console.log(`[app] landed at: ${page.url()}`);

// Navigate explicitly to /app in case the default post-login target differs.
if (!page.url().includes("/app")) {
  console.log(`[app] navigating to /app`);
  await page.goto(`${base}/app`, { waitUntil: "domcontentloaded", timeout: 30_000 });
}

// Let the workspace render.
await page.waitForTimeout(2500);

const out = `${outDir}/app.png`;
await page.screenshot({ path: out, fullPage: false, type: "png" });
console.log(`[app] saved → ${out}`);

await browser.close();
