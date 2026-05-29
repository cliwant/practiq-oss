#!/usr/bin/env node
/**
 * Mobile drawer verification — 2026-05-13
 *
 * Verifies the /app shell mobile drawer fix shipped in commit
 * "feat(facc/app): mobile drawer for authenticated /app shell".
 *
 * - Logs in with the existing R3 dogfood user (created in dogfood-journey-r3).
 * - At 1280x720 desktop: confirms the 3-column shell (rail + aside + main).
 *   The hamburger button must NOT be visible.
 * - At 390x844 iPhone 13: confirms the rail + aside are hidden, the
 *   hamburger is visible, tapping it slides in the drawer, drawer items
 *   are reachable, backdrop tap dismisses.
 * - Asserts that the heading is not stacking one-char-per-line (a P0
 *   symptom from R3 — measured by counting line wraps in the H1).
 *
 * Output: tmp/verify-mobile-drawer-2026-05-13/<step-N>/ + result.json
 */
import { chromium, devices } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const TARGET = process.env.TARGET || "https://practiq.dev";
const OUTDIR = join("tmp", "verify-mobile-drawer-2026-05-13");
const TEST_EMAIL = "seungdo+dogfood-r3-2026-05-13@grindworks.ai";
const TEST_PASSWORD = process.env.DOGFOOD_PASSWORD ?? (() => { throw new Error("DOGFOOD_PASSWORD env var is required (no hardcoded default)"); })();

const findings = [];
function record(step, severity, title, detail) {
  findings.push({ step, severity, title, detail, ts: new Date().toISOString() });
  console.log(`  [${severity}] ${title}\n        ${detail || ""}`);
}

function attachObservers(page) {
  const consoleErrors = [];
  const networkFailures = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 400));
  });
  page.on("pageerror", (err) => consoleErrors.push("pageerror: " + (err.message || String(err)).slice(0, 400)));
  page.on("response", (res) => {
    const s = res.status();
    if (s >= 500 || (s >= 400 && !res.url().includes("favicon"))) {
      networkFailures.push(`HTTP ${s} ${res.url().slice(0, 200)}`);
    }
  });
  return { consoleErrors, networkFailures };
}

async function loginAndGetStorage(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  attachObservers(page);
  await page.goto(TARGET + "/login", { waitUntil: "networkidle", timeout: 45000 });
  await page.fill('input[type="email"], input[name="email"]', TEST_EMAIL).catch(() => {});
  await page.fill('input[type="password"]', TEST_PASSWORD).catch(() => {});
  const loginBtn = page.locator('button[type="submit"]').first();
  await loginBtn.click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(4000);
  const url = page.url();
  if (!url.includes("/app")) {
    throw new Error(`Login failed — landed on ${url}`);
  }
  const storage = await ctx.storageState();
  await ctx.close();
  return storage;
}

async function stepDesktopUnchanged(browser, storage) {
  const stepDir = join(OUTDIR, "01-desktop-1280x720");
  await mkdir(stepDir, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, storageState: storage });
  const page = await ctx.newPage();
  const obs = attachObservers(page);
  const result = { step: "01-desktop-1280x720", observations: obs };

  try {
    await page.goto(TARGET + "/app", { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: join(stepDir, "app.png"), fullPage: false });

    // The hamburger button is rendered inside lg:hidden — it should NOT
    // be visible at 1280x720. We look for the menu button by aria-label.
    const hamburger = page.getByLabel("Open navigation");
    const hamburgerVisible = await hamburger.isVisible().catch(() => false);
    result.hamburgerVisible = hamburgerVisible;
    if (hamburgerVisible)
      record("01-desktop", "P0", "Hamburger button visible on desktop", "Mobile top bar should be hidden ≥1024px");

    // The rail (Home link) and client-list (Clients header) should be present.
    const railHome = await page.locator('nav[aria-label="Global navigation"] a[aria-label="Home"]').count();
    result.railRendered = railHome > 0;
    const clientsHeader = await page.locator('text=/^Clients · /').count();
    result.clientsHeaderRendered = clientsHeader > 0;
    if (!result.railRendered) record("01-desktop", "P0", "Desktop rail missing", "Global nav rail not in DOM");
    if (!result.clientsHeaderRendered) record("01-desktop", "P0", "Desktop client list missing", "Clients aside not in DOM");

    // Measure the bounding box of the rail and the main column to confirm
    // the 3-column layout is intact at 1280px.
    const railBox = await page.locator('nav[aria-label="Global navigation"]').first().boundingBox().catch(() => null);
    const mainBox = await page.locator("main").boundingBox().catch(() => null);
    result.railBox = railBox;
    result.mainBox = mainBox;
    if (mainBox && mainBox.width < 600)
      record("01-desktop", "P0", "Desktop main column narrow", `main width=${mainBox.width}px, expected ≥600px at 1280px viewport`);
  } catch (e) {
    result.error = e.message;
    record("01-desktop", "P0", "Desktop check crashed", e.message);
  } finally {
    await writeFile(join(stepDir, "result.json"), JSON.stringify(result, null, 2));
    await ctx.close();
  }
  return result;
}

async function stepMobileDrawer(browser, storage) {
  const stepDir = join(OUTDIR, "02-mobile-390x844");
  await mkdir(stepDir, { recursive: true });
  // iPhone 13 device
  const iphone = { ...devices["iPhone 13"], storageState: storage };
  const ctx = await browser.newContext(iphone);
  const page = await ctx.newPage();
  const obs = attachObservers(page);
  const result = { step: "02-mobile-390x844", observations: obs };

  try {
    await page.goto(TARGET + "/app", { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: join(stepDir, "01-app-closed.png"), fullPage: false });

    // Desktop chrome should be hidden via lg:flex / lg:block. We probe by
    // checking the bounding box of nav[aria-label="Global navigation"]:
    // if it exists in DOM, its width should be 0 (display:none) on mobile.
    const railBox = await page.locator('nav[aria-label="Global navigation"]').first().boundingBox().catch(() => null);
    result.railBoxClosed = railBox;
    if (railBox && railBox.width > 0)
      record("02-mobile", "P0", "Desktop rail still visible on mobile", `width=${railBox.width}px at 390px viewport — lg:block gate broken`);

    // Hamburger button must be visible and have correct ARIA.
    const hamburger = page.getByLabel("Open navigation");
    const hamburgerVisible = await hamburger.isVisible().catch(() => false);
    result.hamburgerVisible = hamburgerVisible;
    if (!hamburgerVisible)
      record("02-mobile", "P0", "Hamburger button not visible on mobile", "Mobile top bar should show hamburger <1024px");

    // Mobile top bar title — should not be a single-char-per-line hero
    // wrap. The mobile top-bar title is short (e.g. "Home") so the
    // bounding box height should be ≈14-20px not 200+px.
    const mobileTitle = page.locator("header").first();
    const headerBox = await mobileTitle.boundingBox().catch(() => null);
    result.mobileHeaderBox = headerBox;
    if (headerBox && headerBox.height > 80)
      record("02-mobile", "P0", "Mobile top bar excessively tall", `height=${headerBox.height}px — possible text wrap regression`);

    // Tap the hamburger.
    await hamburger.tap();
    await page.waitForTimeout(400); // wait for the 200ms drawer slide + buffer
    await page.screenshot({ path: join(stepDir, "02-drawer-open.png"), fullPage: false });

    // Drawer should now be in DOM with role="dialog" + aria-modal="true".
    const drawer = page.locator('div[role="dialog"][aria-modal="true"]');
    const drawerVisible = await drawer.isVisible().catch(() => false);
    result.drawerVisible = drawerVisible;
    if (!drawerVisible)
      record("02-mobile", "P0", "Drawer did not open on hamburger tap", "Drawer dialog not visible");

    const drawerBox = await drawer.boundingBox().catch(() => null);
    result.drawerBox = drawerBox;
    if (drawerBox) {
      // Drawer should be left-anchored (x === 0) and reasonably wide.
      if (drawerBox.x > 5)
        record("02-mobile", "P0", "Drawer not left-anchored", `x=${drawerBox.x}, expected 0`);
      if (drawerBox.width < 200 || drawerBox.width > 340)
        record("02-mobile", "P1", "Drawer width unusual", `width=${drawerBox.width}, expected 200-340`);
    }

    // Drawer must contain the rail icons + client list. Test the Home
    // link from the rail and the Clients · N header from the list.
    const drawerHomeLink = await drawer.locator('a[aria-label="Home"]').count();
    const drawerClientsHeader = await drawer.locator('text=/^Clients · /').count();
    result.drawerHomeLink = drawerHomeLink;
    result.drawerClientsHeader = drawerClientsHeader;
    if (drawerHomeLink === 0) record("02-mobile", "P0", "Drawer missing rail Home link", "Drawer content broken");
    if (drawerClientsHeader === 0) record("02-mobile", "P0", "Drawer missing client-list header", "Drawer content broken");

    // Verify the close button (X) is present in the drawer.
    const closeBtn = drawer.getByLabel("Close navigation");
    const closeBtnVisible = await closeBtn.isVisible().catch(() => false);
    result.closeBtnVisible = closeBtnVisible;
    if (!closeBtnVisible) record("02-mobile", "P1", "Close button missing inside drawer", "User stuck if backdrop tap fails");

    // Backdrop tap should dismiss the drawer. Click far-right of viewport
    // where the backdrop sits but the drawer panel doesn't.
    await page.mouse.click(370, 400);
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(stepDir, "03-drawer-dismissed.png"), fullPage: false });
    const drawerStillVisible = await drawer.isVisible().catch(() => false);
    result.drawerStillVisibleAfterBackdrop = drawerStillVisible;
    if (drawerStillVisible)
      record("02-mobile", "P1", "Drawer did not dismiss on backdrop tap", "User can still see drawer after tapping outside");

    // ESC key dismiss — reopen the drawer then press ESC.
    await hamburger.tap();
    await page.waitForTimeout(300);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    const drawerVisibleAfterEsc = await drawer.isVisible().catch(() => false);
    result.drawerVisibleAfterEsc = drawerVisibleAfterEsc;
    if (drawerVisibleAfterEsc)
      record("02-mobile", "P1", "Drawer did not dismiss on ESC", "Keyboard accessibility gap");

    // Verify main column heading is normal — not 1 char per line.
    // Greeting/heading should fit in a sensible bbox.
    const mainHeading = page.locator("main h1, main h2").first();
    const mainHeadingBox = await mainHeading.boundingBox().catch(() => null);
    const mainHeadingText = await mainHeading.textContent().catch(() => "");
    result.mainHeadingText = (mainHeadingText || "").trim().slice(0, 100);
    result.mainHeadingBox = mainHeadingBox;
    if (mainHeadingBox && mainHeadingText) {
      const chars = mainHeadingText.trim().length;
      // If every char wraps to its own line, height ≈ chars * line-height.
      // Even at line-height 64px, 10 chars would be 640px. Reasonable
      // heading should be ≤ ~200px tall on mobile.
      if (mainHeadingBox.height > 220 && chars < 60)
        record("02-mobile", "P0", "Main heading appears to wrap excessively", `text="${result.mainHeadingText}" height=${mainHeadingBox.height}px chars=${chars}`);
    }

    // Main column width should be close to viewport width — drawer
    // overlay must NOT push it.
    const mainBox = await page.locator("main").boundingBox().catch(() => null);
    result.mainBox = mainBox;
    if (mainBox && mainBox.width < 360)
      record("02-mobile", "P0", "Main column too narrow on mobile", `width=${mainBox.width}px at 390px viewport`);
  } catch (e) {
    result.error = e.message;
    record("02-mobile", "P0", "Mobile drawer check crashed", e.message);
  } finally {
    await writeFile(join(stepDir, "result.json"), JSON.stringify(result, null, 2));
    await ctx.close();
  }
  return result;
}

async function stepSettingsMobile(browser, storage) {
  const stepDir = join(OUTDIR, "03-mobile-settings");
  await mkdir(stepDir, { recursive: true });
  const iphone = { ...devices["iPhone 13"], storageState: storage };
  const ctx = await browser.newContext(iphone);
  const page = await ctx.newPage();
  const obs = attachObservers(page);
  const result = { step: "03-mobile-settings", observations: obs };

  try {
    await page.goto(TARGET + "/app/settings", { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: join(stepDir, "settings.png"), fullPage: true });

    const hamburger = page.getByLabel("Open navigation");
    result.hamburgerVisible = await hamburger.isVisible().catch(() => false);
    if (!result.hamburgerVisible)
      record("03-settings", "P0", "Settings missing mobile top bar", "Hamburger not visible on /app/settings");

    const mainBox = await page.locator("main").boundingBox().catch(() => null);
    result.mainBox = mainBox;
    if (mainBox && mainBox.width < 360)
      record("03-settings", "P0", "Settings main column too narrow", `width=${mainBox.width}px`);
  } catch (e) {
    result.error = e.message;
    record("03-settings", "P0", "Settings mobile check crashed", e.message);
  } finally {
    await writeFile(join(stepDir, "result.json"), JSON.stringify(result, null, 2));
    await ctx.close();
  }
  return result;
}

async function main() {
  await mkdir(OUTDIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    console.log(`[1/4] Login as ${TEST_EMAIL}`);
    const storage = await loginAndGetStorage(browser);
    console.log("  → session saved");

    console.log("[2/4] Desktop 1280x720 — confirm 3-column unchanged");
    await stepDesktopUnchanged(browser, storage);

    console.log("[3/4] Mobile 390x844 — drawer behavior");
    await stepMobileDrawer(browser, storage);

    console.log("[4/4] Mobile /app/settings — inherits shell");
    await stepSettingsMobile(browser, storage);

    await writeFile(join(OUTDIR, "raw-findings.json"), JSON.stringify(findings, null, 2));

    const p0 = findings.filter((f) => f.severity === "P0").length;
    const p1 = findings.filter((f) => f.severity === "P1").length;
    console.log(`\n=== SUMMARY ===`);
    console.log(`P0: ${p0}  P1: ${p1}  Total: ${findings.length}`);
    console.log(`Output: ${OUTDIR}/`);
    if (p0 > 0) process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
