#!/usr/bin/env node
/**
 * Screenshot a specific section of the landing page by CSS selector.
 *
 * Run:
 *   node scripts/screenshot-section.mjs '#why' .debug/why.png
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const selector = process.argv[2] ?? "#why";
const out = process.argv[3] ?? ".debug/section.png";
const url = process.argv[4] ?? "http://localhost:3000/";

await mkdir(dirname(out), { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
await page.waitForSelector(selector, { timeout: 15_000 });
await page.waitForTimeout(1500);

const el = await page.$(selector);
if (!el) {
  console.error(`[screenshot-section] selector not found: ${selector}`);
  process.exit(1);
}
await el.scrollIntoViewIfNeeded();
await page.waitForTimeout(400);
await el.screenshot({ path: out, type: "png" });
console.log(`[screenshot-section] saved ${selector} → ${out}`);

await browser.close();
