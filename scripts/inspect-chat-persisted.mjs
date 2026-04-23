#!/usr/bin/env node
/**
 * Open the chat tab and refresh to rehydrate conversation from DB.
 * If the assistant response was persisted properly (and rendered on
 * load), the issue was client-side SSE handling. If it wasn't
 * persisted, the issue is server-side stream aborting.
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const email = process.env.DOGFOOD_EMAIL ?? "dogfood@practiq.dev";
const password = process.env.DOGFOOD_PASSWORD ?? "dogfood123";
const base = process.env.BASE_URL ?? "http://localhost:3000";
await mkdir(".debug", { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

page.on("console", (msg) => {
  if (msg.type() === "error" || msg.type() === "warning") {
    console.log(`[browser.${msg.type()}] ${msg.text()}`);
  }
});

await page.goto(`${base}/login`, { waitUntil: "domcontentloaded" });
await page.fill('input[type="email"]', email);
await page.fill('input[type="password"]', password);
await Promise.all([
  page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30_000 }).catch(() => {}),
  page.locator('button[type="submit"]').first().click(),
]);
if (!page.url().includes("/app")) await page.goto(`${base}/app`);
await page.waitForTimeout(1000);
await page.locator('aside').getByText(/TechStart Inc\./).first().click();
await page.waitForTimeout(1000);
await page.getByText(/^Chat/).first().click();
await page.waitForTimeout(2500);

// If the previous stream persisted, we should see the 241-char assistant
// message from a few minutes ago. Screenshot full page to read scrollback.
await page.screenshot({ path: ".debug/chat-persisted.png", fullPage: true });
console.log("[inspect] saved .debug/chat-persisted.png");

await browser.close();
