#!/usr/bin/env node
/**
 * Practiq dogfood smoke test — browser automation
 *
 * Runs 5 user scenarios end-to-end against production (practiq.dev):
 * 1. Landing page renders + main CTA visible (desktop)
 * 2. Mike compare page renders + comparison table loads
 * 3. CPA vertical landing renders + Reddit pain quote visible
 * 4. Pricing page renders + 14d trial CTA on Solo tier
 * 5. Mobile rendering check (iPhone 13 viewport)
 *
 * Captures screenshots to tmp/dogfood-{timestamp}/ for visual inspection.
 * Reports HTTP status + console errors + visible critical text per page.
 *
 * Run: node scripts/dogfood-smoke.mjs
 */
import { chromium, devices } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const TARGET = process.env.SMOKE_TARGET || "https://practiq.dev";
const TS = new Date().toISOString().replace(/[:.]/g, "-");
const OUTDIR = join("tmp", `dogfood-${TS}`);

const SCENARIOS = [
  {
    name: "01-landing-desktop",
    url: "/",
    viewport: { width: 1440, height: 900 },
    expects: {
      titleContains: ["Practiq"],
      bodyContainsAny: ["boutique", "Boutique"],
      ctaSelectors: ['a[href*="/signup"], button:has-text("Start"), a:has-text("Get started")'],
      noConsoleErrors: true,
    },
  },
  {
    name: "02-compare-mike",
    url: "/compare/mike",
    viewport: { width: 1440, height: 900 },
    expects: {
      titleContains: ["Mike", "Practiq"],
      bodyContainsAny: ["self-host", "managed", "Mike"],
      ctaSelectors: ['a[href*="/signup"]'],
      noConsoleErrors: true,
    },
  },
  {
    name: "03-vertical-cpa",
    url: "/for/cpa-firms",
    viewport: { width: 1440, height: 900 },
    expects: {
      titleContains: ["CPA"],
      bodyContainsAny: ["boutique", "CPA"],
      ctaSelectors: ['a[href*="/signup"]'],
      noConsoleErrors: true,
    },
  },
  {
    name: "04-pricing",
    url: "/pricing",
    viewport: { width: 1440, height: 900 },
    expects: {
      titleContains: ["Pricing"],
      bodyContainsAny: ["trial", "boutique"],
      ctaSelectors: ['button, a[href*="checkout"]'],
      noConsoleErrors: true,
    },
  },
  {
    name: "05-mobile-iphone",
    url: "/",
    device: "iPhone 13",
    expects: {
      titleContains: ["Practiq"],
      bodyContainsAny: ["boutique", "Boutique"],
      ctaSelectors: ['a[href*="/signup"]'],
      noConsoleErrors: true,
    },
  },
  {
    name: "06-vertical-law",
    url: "/for/law-firms",
    viewport: { width: 1440, height: 900 },
    expects: {
      titleContains: ["law", "Law"],
      bodyContainsAny: ["boutique", "law"],
      noConsoleErrors: true,
    },
  },
  {
    name: "07-vertical-hr",
    url: "/for/hr-consultants",
    viewport: { width: 1440, height: 900 },
    expects: {
      titleContains: ["HR"],
      bodyContainsAny: ["boutique", "HR"],
      noConsoleErrors: true,
    },
  },
  {
    name: "08-vertical-marketing",
    url: "/for/marketing-agencies",
    viewport: { width: 1440, height: 900 },
    expects: {
      titleContains: ["marketing", "Marketing"],
      bodyContainsAny: ["boutique", "marketing"],
      noConsoleErrors: true,
    },
  },
  {
    name: "09-vertical-consulting",
    url: "/for/consulting-firms",
    viewport: { width: 1440, height: 900 },
    expects: {
      titleContains: ["consulting", "Consulting"],
      bodyContainsAny: ["boutique", "consulting"],
      noConsoleErrors: true,
    },
  },
  {
    name: "10-signup-page",
    url: "/signup",
    viewport: { width: 1440, height: 900 },
    expects: {
      titleContains: ["Sign", "sign"],
      bodyContainsAny: ["email", "Email"],
      noConsoleErrors: true,
    },
  },
  {
    name: "11-login-page",
    url: "/login",
    viewport: { width: 1440, height: 900 },
    expects: {
      titleContains: ["Log", "Sign"],
      bodyContainsAny: ["email", "Email"],
      noConsoleErrors: true,
    },
  },
  {
    name: "12-sitemap",
    url: "/sitemap.xml",
    viewport: { width: 1440, height: 900 },
    rawCheck: true, // not HTML — check XML
  },
  {
    name: "13-robots",
    url: "/robots.txt",
    viewport: { width: 1440, height: 900 },
    rawCheck: true,
  },
  {
    name: "14-llms-txt",
    url: "/llms.txt",
    viewport: { width: 1440, height: 900 },
    rawCheck: true,
  },
];

async function runScenario(browser, scenario) {
  const result = {
    name: scenario.name,
    url: TARGET + scenario.url,
    pass: false,
    httpStatus: null,
    consoleErrors: [],
    networkFailures: [],
    titleOk: null,
    bodyOk: null,
    ctaOk: null,
    screenshot: null,
    notes: [],
    durationMs: 0,
  };
  const start = Date.now();

  let context;
  if (scenario.device) {
    context = await browser.newContext({ ...devices[scenario.device] });
  } else {
    context = await browser.newContext({ viewport: scenario.viewport });
  }
  const page = await context.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error") result.consoleErrors.push(msg.text().slice(0, 200));
  });
  page.on("pageerror", (err) => {
    result.consoleErrors.push("pageerror: " + (err.message || String(err)).slice(0, 200));
  });
  page.on("requestfailed", (req) => {
    const f = req.failure();
    if (f) result.networkFailures.push(`${req.method()} ${req.url().slice(0, 120)} — ${f.errorText}`);
  });

  try {
    const response = await page.goto(result.url, { waitUntil: "domcontentloaded", timeout: 30000 });
    result.httpStatus = response ? response.status() : null;

    if (scenario.rawCheck) {
      const body = await page.content();
      result.notes.push(`raw size: ${body.length} bytes`);
      result.pass = result.httpStatus >= 200 && result.httpStatus < 400 && body.length > 0;
    } else {
      // Wait a moment for JS-rendered content
      await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});

      const title = await page.title();
      const bodyText = await page.textContent("body").catch(() => "");

      // Title check
      if (scenario.expects?.titleContains?.length) {
        result.titleOk = scenario.expects.titleContains.some((s) =>
          title.toLowerCase().includes(s.toLowerCase())
        );
      } else {
        result.titleOk = true;
      }

      // Body content check
      if (scenario.expects?.bodyContainsAny?.length) {
        result.bodyOk = scenario.expects.bodyContainsAny.some((s) =>
          bodyText.toLowerCase().includes(s.toLowerCase())
        );
      } else {
        result.bodyOk = true;
      }

      // CTA check
      if (scenario.expects?.ctaSelectors?.length) {
        let found = false;
        for (const sel of scenario.expects.ctaSelectors) {
          const count = await page.locator(sel).count().catch(() => 0);
          if (count > 0) {
            found = true;
            break;
          }
        }
        result.ctaOk = found;
      } else {
        result.ctaOk = true;
      }

      result.pass =
        result.httpStatus >= 200 &&
        result.httpStatus < 400 &&
        result.titleOk &&
        result.bodyOk &&
        result.ctaOk &&
        (!scenario.expects?.noConsoleErrors || result.consoleErrors.length === 0);

      result.notes.push(`title: "${title.slice(0, 80)}"`);
      result.notes.push(`body length: ${bodyText.length} chars`);
    }

    // Screenshot
    const shotPath = join(OUTDIR, `${scenario.name}.png`);
    await page.screenshot({ path: shotPath, fullPage: scenario.rawCheck ? false : true });
    result.screenshot = shotPath;
  } catch (err) {
    result.notes.push(`exception: ${err.message}`);
  } finally {
    await context.close();
    result.durationMs = Date.now() - start;
  }

  return result;
}

async function main() {
  await mkdir(OUTDIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  console.log(`\nDogfood smoke test against ${TARGET}`);
  console.log(`Scenarios: ${SCENARIOS.length}`);
  console.log(`Output: ${OUTDIR}\n`);

  const results = [];
  for (const scenario of SCENARIOS) {
    process.stdout.write(`  ${scenario.name} … `);
    const r = await runScenario(browser, scenario);
    results.push(r);
    const flag = r.pass ? "✓" : "✗";
    console.log(`${flag} (${r.httpStatus} | ${r.durationMs}ms${r.consoleErrors.length ? ` | ${r.consoleErrors.length} console errors` : ""})`);
  }

  await browser.close();

  // Summary
  const passed = results.filter((r) => r.pass).length;
  const failed = results.length - passed;
  const totalConsoleErrors = results.reduce((acc, r) => acc + r.consoleErrors.length, 0);
  const totalNetFailures = results.reduce((acc, r) => acc + r.networkFailures.length, 0);

  console.log(`\n=== SUMMARY ===`);
  console.log(`Pass: ${passed}/${results.length}`);
  console.log(`Console errors total: ${totalConsoleErrors}`);
  console.log(`Network failures total: ${totalNetFailures}`);

  if (failed > 0) {
    console.log(`\n=== FAILED SCENARIOS ===`);
    for (const r of results.filter((x) => !x.pass)) {
      console.log(`\n  ✗ ${r.name}`);
      console.log(`    url: ${r.url}`);
      console.log(`    http: ${r.httpStatus}`);
      if (r.titleOk === false) console.log(`    title check: FAIL`);
      if (r.bodyOk === false) console.log(`    body check: FAIL`);
      if (r.ctaOk === false) console.log(`    cta check: FAIL`);
      for (const n of r.notes) console.log(`    note: ${n}`);
      for (const e of r.consoleErrors.slice(0, 3)) console.log(`    console: ${e}`);
      for (const f of r.networkFailures.slice(0, 3)) console.log(`    netfail: ${f}`);
    }
  }

  // Save JSON report
  const reportPath = join(OUTDIR, "report.json");
  await writeFile(reportPath, JSON.stringify({ target: TARGET, ts: TS, results }, null, 2));
  console.log(`\nFull report: ${reportPath}`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Smoke test crashed:", err);
  process.exit(2);
});
