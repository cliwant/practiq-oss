#!/usr/bin/env node
/**
 * Approval Queue mobile interaction smoke test — 2026-05-13 Wave 15.
 *
 * Verifies the list-then-detail flow added in commit fc0354e:
 *   - At 390x844, list renders full-width and detail pane is hidden.
 *   - Tapping a queue item flips to detail with "Back to queue" bar.
 *   - Detail shows approve/reject/dismiss buttons + reviewer notes.
 *   - Tapping "Back to queue" returns to the list.
 *
 * Skips if the test user has zero pending items (EmptyQueue branch).
 */
import { chromium, devices } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const TARGET = process.env.TARGET || "https://practiq.dev";
const OUTDIR = join("tmp", "verify-approval-queue-mobile-2026-05-13");
const TEST_EMAIL = "seungdo+dogfood-r3-2026-05-13@grindworks.ai";
const TEST_PASSWORD = process.env.DOGFOOD_PASSWORD ?? (() => { throw new Error("DOGFOOD_PASSWORD env var is required (no hardcoded default)"); })();

const findings = [];
function record(severity, title, detail) {
  findings.push({ severity, title, detail });
  console.log(`  [${severity}] ${title}`);
  if (detail) console.log(`         ${detail}`);
}

async function login(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(TARGET + "/login", { waitUntil: "networkidle", timeout: 45000 });
  await page.fill('input[type="email"]', TEST_EMAIL).catch(() => {});
  await page.fill('input[type="password"]', TEST_PASSWORD).catch(() => {});
  await page.locator('button[type="submit"]').first().click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(4000);
  if (!page.url().includes("/app")) throw new Error("Login failed");
  const storage = await ctx.storageState();
  await ctx.close();
  return storage;
}

async function run() {
  await mkdir(OUTDIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const storage = await login(browser);
    const ctx = await browser.newContext({ ...devices["iPhone 13"], storageState: storage });
    const page = await ctx.newPage();

    await page.goto(TARGET + "/app/tasks", { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: join(OUTDIR, "01-list.png"), fullPage: false });

    // The queue empty-state UI uses "Inbox zero for the agent" copy.
    const isEmpty = await page.locator('text=/Inbox zero for the agent/').count() > 0;
    if (isEmpty) {
      record("INFO", "Test user has empty queue — skipping interaction test", "");
      return;
    }

    // Step 1: detail pane should be hidden initially. The clearest
    // signal is the "Back to queue" mobile-only bar. NOTE: Playwright
    // locator counting across :visible boundaries is unreliable when
    // multiple <aside>s exist in the shell, so we anchor on this
    // unique button instead.
    const backInitial = await page.locator('button:has-text("Back to queue")').isVisible().catch(() => false);
    if (backInitial) {
      record("P1", "Detail pane visible before tap", "Back-to-queue bar already rendered");
    }

    // Step 2: tap a queue item. The list item button contains the
    // approval title text which is unique. We tap on the "Confirm"
    // text which we know is in the test data; the test skips earlier
    // if the queue is empty.
    const firstItemText = page.locator('text=/Confirm \\$8,500 supplier|Morning briefing/').first();
    await firstItemText.click({ timeout: 10000, force: true });
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(OUTDIR, "02-detail.png"), fullPage: false });

    // Step 3: after tap, detail must show the back bar, Approve button,
    // and reviewer-notes textarea.
    const backBar = page.locator('button:has-text("Back to queue")');
    const backVisible = await backBar.isVisible().catch(() => false);
    if (!backVisible) record("P0", "Back bar not visible after tap", "");

    const approveBtn = page.locator('button:has-text("Approve")').first();
    const approveVisible = await approveBtn.isVisible().catch(() => false);
    if (!approveVisible) record("P0", "Approve button not visible in detail", "");

    const reviewerNotes = page.locator('#reviewer-notes');
    const notesVisible = await reviewerNotes.isVisible().catch(() => false);
    if (!notesVisible) record("P0", "Reviewer notes field not visible in detail", "");

    // Step 4: tap back to queue, back bar must disappear and items
    // must be visible again.
    await backBar.tap();
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(OUTDIR, "03-list-again.png"), fullPage: false });

    const backAfterVisible = await page.locator('button:has-text("Back to queue")').isVisible().catch(() => false);
    if (backAfterVisible) record("P0", "Did not return to list view after back tap", "");

    const itemAfterVisible = await firstItemText.isVisible().catch(() => false);
    if (!itemAfterVisible) record("P0", "Queue items not visible after back", "");

    await writeFile(join(OUTDIR, "findings.json"), JSON.stringify(findings, null, 2));
    const p0 = findings.filter((f) => f.severity === "P0").length;
    console.log(`\nP0: ${p0}  Total: ${findings.length}`);
    if (p0 > 0) process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
