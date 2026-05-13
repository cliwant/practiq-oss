#!/usr/bin/env node
/**
 * Mobile /app inner-views verification — 2026-05-13 (Wave 15)
 *
 * The shell mobile fix (commit 00d4959) gave inner views actual viewport
 * space at <1024px for the first time. This script audits each inner
 * view at 390x844 (iPhone 13 viewport) AND at 1280x720 (desktop sanity)
 * with the dogfood-r3 test user.
 *
 * Views audited:
 *   /app                   — Home
 *   /app/tasks             — Approval Queue
 *   /app/workflows         — Workflows gallery
 *   /app/clients/{id}      — Client Workspace
 *   /app/settings          — Settings (profile/billing/team)
 *
 * Output: tmp/verify-mobile-app-views-2026-05-13/<step>/{*.png,result.json}
 */
import { chromium, devices } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const TARGET = process.env.TARGET || "https://practiq.dev";
const OUTDIR = join("tmp", "verify-mobile-app-views-2026-05-13");
const TEST_EMAIL = "seungdo+dogfood-r3-2026-05-13@grindworks.ai";
const TEST_PASSWORD = "DogfoodR3-2026!Strong#";

const findings = [];
function record(view, severity, title, detail) {
  findings.push({ view, severity, title, detail, ts: new Date().toISOString() });
  console.log(`  [${severity}] ${view} — ${title}`);
  if (detail) console.log(`         ${detail}`);
}

function observers(page) {
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 300));
  });
  page.on("pageerror", (err) => consoleErrors.push("pageerror: " + (err.message || String(err)).slice(0, 300)));
  return { consoleErrors };
}

async function login(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  observers(page);
  await page.goto(TARGET + "/login", { waitUntil: "networkidle", timeout: 45000 });
  await page.fill('input[type="email"], input[name="email"]', TEST_EMAIL).catch(() => {});
  await page.fill('input[type="password"]', TEST_PASSWORD).catch(() => {});
  await page.locator('button[type="submit"]').first().click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(4000);
  const url = page.url();
  if (!url.includes("/app")) throw new Error(`Login failed — landed on ${url}`);
  const storage = await ctx.storageState();
  await ctx.close();
  return storage;
}

async function auditView(browser, storage, viewport, viewName, urlPath, screenshotName) {
  const isMobile = viewport.width < 1024;
  const stepDir = join(OUTDIR, `${viewName}-${isMobile ? "mobile" : "desktop"}`);
  await mkdir(stepDir, { recursive: true });
  const opts = isMobile
    ? { ...devices["iPhone 13"], storageState: storage }
    : { viewport, storageState: storage };
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  const obs = observers(page);
  const result = { view: viewName, viewport, isMobile, observations: obs };

  try {
    await page.goto(TARGET + urlPath, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: join(stepDir, `${screenshotName}.png`), fullPage: true });

    // 1. Horizontal scroll: compare document.scrollWidth vs viewport width.
    const sizes = await page.evaluate(() => ({
      docW: document.documentElement.scrollWidth,
      bodyW: document.body.scrollWidth,
      winW: window.innerWidth,
    }));
    result.sizes = sizes;
    const hasHScroll = sizes.docW > sizes.winW + 1;
    if (hasHScroll && isMobile) {
      record(viewName, "P0", "Horizontal scroll at 390px", `document scrollWidth=${sizes.docW}px, viewport=${sizes.winW}px (excess ${sizes.docW - sizes.winW}px)`);
    }

    // 2. Main column width — should fill the viewport on mobile (minus shell rail/aside which are display:none).
    const mainBox = await page.locator("main").first().boundingBox().catch(() => null);
    result.mainBox = mainBox;
    if (isMobile && mainBox && mainBox.width < 360) {
      record(viewName, "P0", "Main column too narrow", `main width=${mainBox.width}px at 390px viewport`);
    }
    if (!isMobile && mainBox && mainBox.width < 700) {
      record(viewName, "P0", "Main column too narrow at desktop", `main width=${mainBox.width}px at ${viewport.width}px viewport`);
    }

    // 3. Find any element that overflows the viewport horizontally.
    const overflowing = await page.evaluate(() => {
      const candidates = Array.from(document.querySelectorAll("main *"));
      const viewW = window.innerWidth;
      const offenders = [];
      for (const el of candidates) {
        const r = el.getBoundingClientRect();
        if (r.right > viewW + 2 && r.width > 0) {
          offenders.push({
            tag: el.tagName,
            cls: (el.className || "").toString().slice(0, 100),
            right: Math.round(r.right),
            width: Math.round(r.width),
          });
          if (offenders.length > 8) break;
        }
      }
      return offenders;
    });
    result.overflowing = overflowing;
    if (isMobile && overflowing.length > 0) {
      record(viewName, "P1", `${overflowing.length} element(s) overflow viewport`, JSON.stringify(overflowing.slice(0, 3)));
    }

    // 4. Headline / heading height — guard against the R3 one-char-per-line wrap bug
    const heading = page.locator("main h1, main h2").first();
    const headingBox = await heading.boundingBox().catch(() => null);
    const headingText = await heading.textContent().catch(() => "");
    result.headingText = (headingText || "").trim().slice(0, 80);
    result.headingBox = headingBox;
    if (isMobile && headingBox && headingText) {
      const chars = headingText.trim().length;
      if (headingBox.height > 220 && chars < 60) {
        record(viewName, "P0", "Heading appears to wrap excessively", `text="${result.headingText}" height=${headingBox.height}px chars=${chars}`);
      }
    }

    // 5. Console errors check
    if (obs.consoleErrors.length > 0) {
      result.consoleErrors = obs.consoleErrors.slice(0, 5);
      record(viewName, "P2", `${obs.consoleErrors.length} console errors`, obs.consoleErrors[0]);
    }
  } catch (e) {
    result.error = e.message;
    record(viewName, "P0", "View load crashed", e.message);
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
    console.log(`[1/N] Login as ${TEST_EMAIL}`);
    const storage = await login(browser);
    console.log("  → session saved");

    // Discover the user's first client id for the Client Workspace audit.
    const probeCtx = await browser.newContext({ viewport: { width: 1280, height: 800 }, storageState: storage });
    const probePage = await probeCtx.newPage();
    await probePage.goto(TARGET + "/app", { waitUntil: "networkidle", timeout: 45000 });
    await probePage.waitForTimeout(2000);
    const clientLink = await probePage
      .locator('a[href^="/app/clients/"]:not([href="/app/clients/new"])')
      .first()
      .getAttribute("href")
      .catch(() => null);
    await probeCtx.close();
    const clientUrl = clientLink || null;
    console.log(`  → first client URL: ${clientUrl || "(none — Client Workspace audit skipped)"}`);

    const views = [
      { name: "01-home", path: "/app", screenshot: "home" },
      { name: "02-tasks", path: "/app/tasks", screenshot: "approval-queue" },
      { name: "03-workflows", path: "/app/workflows", screenshot: "workflows" },
      { name: "04-settings-profile", path: "/app/settings", screenshot: "settings-profile" },
      { name: "05-settings-billing", path: "/app/settings?tab=billing", screenshot: "settings-billing" },
      { name: "06-settings-team", path: "/app/settings?tab=team", screenshot: "settings-team" },
    ];
    if (clientUrl) {
      views.push({ name: "07-client-workspace", path: clientUrl, screenshot: "client-workspace" });
    }

    for (const v of views) {
      console.log(`\n[${v.name}] Auditing ${v.path}`);
      console.log("  desktop 1280x720…");
      await auditView(browser, storage, { width: 1280, height: 720 }, v.name, v.path, v.screenshot);
      console.log("  mobile 390x844 (iPhone 13)…");
      await auditView(browser, storage, { width: 390, height: 844 }, v.name, v.path, v.screenshot);
    }

    await writeFile(join(OUTDIR, "raw-findings.json"), JSON.stringify(findings, null, 2));

    const p0 = findings.filter((f) => f.severity === "P0").length;
    const p1 = findings.filter((f) => f.severity === "P1").length;
    const p2 = findings.filter((f) => f.severity === "P2").length;
    console.log(`\n=== SUMMARY ===`);
    console.log(`P0: ${p0}  P1: ${p1}  P2: ${p2}  Total: ${findings.length}`);
    console.log(`Output: ${OUTDIR}/`);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
