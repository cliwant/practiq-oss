import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: false,
  args: ["--start-maximized"],
});

const context = await browser.newContext({ viewport: null });
const page = await context.newPage();

await page.goto("http://localhost:3000/dashboard");
await page.waitForLoadState("networkidle");

console.log("Browser opened at http://localhost:3000/dashboard");
console.log("Press Ctrl+C to close.");

// Keep alive
await new Promise(() => {});
