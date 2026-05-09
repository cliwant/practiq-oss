// Captures /demo flow via Playwright. Outputs WebM in recording/.
// Usage: node capture-demo.mjs
import { chromium } from 'playwright';
import { mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';

const OUT = path.resolve('recording');
mkdirSync(OUT, { recursive: true });

console.log('[capture] Launching headless chromium...');
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  recordVideo: { dir: OUT, size: { width: 1920, height: 1080 } },
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();

const URL = 'https://practiq.dev/demo';
console.log(`[capture] Goto ${URL}`);
await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(2500);

// Scroll the sample card area into nice view
console.log('[capture] Scroll to scenario card');
await page.evaluate(() => window.scrollTo({ top: 220, behavior: 'smooth' }));
await page.waitForTimeout(2500);

// Find Generate redline button
console.log('[capture] Click Generate redline');
const button = page.getByRole('button', { name: /generate redline/i });
await button.scrollIntoViewIfNeeded();
await page.waitForTimeout(800);
await button.click();

// Processing — wait up to 90s for the result to appear (look for "Redline ready").
console.log('[capture] Waiting for result...');
try {
  await page.waitForSelector('text=/Redline ready/i', { timeout: 90000 });
  console.log('[capture] Result revealed');
} catch (e) {
  console.warn('[capture] Result selector timed out — continuing anyway:', e.message);
}

// Pause briefly on the result, then scroll down through it
await page.waitForTimeout(2500);

console.log('[capture] Scroll into result body');
await page.evaluate(() => window.scrollBy({ top: 350, behavior: 'smooth' }));
await page.waitForTimeout(3000);

await page.evaluate(() => window.scrollBy({ top: 350, behavior: 'smooth' }));
await page.waitForTimeout(3000);

await page.evaluate(() => window.scrollBy({ top: 350, behavior: 'smooth' }));
await page.waitForTimeout(2500);

console.log('[capture] Closing context (saves video)');
await page.close();
await context.close();
await browser.close();

const files = readdirSync(OUT).filter((f) => f.endsWith('.webm'));
console.log('[capture] Saved files:', files);
console.log('[capture] Done');
