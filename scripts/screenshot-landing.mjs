#!/usr/bin/env node
/**
 * Take a full-page screenshot of the landing at localhost:3000/ so
 * the operator (or agent loop) can eyeball the new positioning.
 *
 * Run:
 *   node scripts/screenshot-landing.mjs [url] [out]
 *
 * Defaults: url=http://localhost:3000/, out=./.debug/landing.png
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const url = process.argv[2] ?? "http://localhost:3000/";
const out = process.argv[3] ?? ".debug/landing.png";

await mkdir(dirname(out), { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
const page = await ctx.newPage();

console.log(`[screenshot] navigating to ${url}`);
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });

// Wait for the hero H1 to render and motion animations to settle.
await page.waitForSelector("h1", { timeout: 15_000 });
await page.waitForTimeout(2500);

console.log(`[screenshot] saving full page → ${out}`);
await page.screenshot({ path: out, fullPage: true, type: "png" });

// Also capture above-the-fold
const aboveFold = out.replace(/\.png$/, ".hero.png");
await page.screenshot({ path: aboveFold, fullPage: false, type: "png" });
console.log(`[screenshot] saving above-fold → ${aboveFold}`);

await browser.close();
console.log("[screenshot] done");
