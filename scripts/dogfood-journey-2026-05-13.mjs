#!/usr/bin/env node
/**
 * Practiq full prospect → customer journey dogfood — 2026-05-13
 *
 * Tier-3 QA / discovery. Surfaces every UX crack, copy bug, dead link,
 * layout issue, or confusing state a real cold-traffic prospect would hit.
 *
 * Output: tmp/dogfood-2026-05-13/<step-N>/ with screenshots + step JSON
 *         tmp/dogfood-2026-05-13/raw-findings.json (machine readable)
 */
import { chromium, devices } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const TARGET = "https://practiq.dev";
const OUTDIR = join("tmp", "dogfood-2026-05-13");
const TEST_EMAIL = `seungdo+dogfood-2026-05-13@grindworks.ai`;
const TEST_PASSWORD = `Dogfood2026!Strong#`;
const TEST_NAME = "Seungdo Test";

const findings = [];

function record(step, severity, title, detail, screenshot = null, url = null) {
  findings.push({ step, severity, title, detail, screenshot, url, ts: new Date().toISOString() });
}

async function captureConsoleAndNet(page, stepDir, label) {
  const consoleErrors = [];
  const consoleWarnings = [];
  const networkFailures = [];
  page.on("console", (msg) => {
    const t = msg.type();
    if (t === "error") consoleErrors.push(msg.text().slice(0, 400));
    else if (t === "warning") consoleWarnings.push(msg.text().slice(0, 400));
  });
  page.on("pageerror", (err) => consoleErrors.push("pageerror: " + (err.message || String(err)).slice(0, 400)));
  page.on("requestfailed", (req) => {
    const f = req.failure();
    if (f) networkFailures.push(`${req.method()} ${req.url().slice(0, 200)} — ${f.errorText}`);
  });
  page.on("response", (res) => {
    const s = res.status();
    if (s >= 500 || (s >= 400 && !res.url().includes("favicon"))) {
      networkFailures.push(`HTTP ${s} ${res.url().slice(0, 200)}`);
    }
  });
  return { consoleErrors, consoleWarnings, networkFailures };
}

async function step01Landing(browser) {
  const stepDir = join(OUTDIR, "01-landing");
  await mkdir(stepDir, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const obs = await captureConsoleAndNet(page, stepDir, "landing");
  const result = { step: "01-landing", url: TARGET + "/", httpStatus: null, observations: obs, notes: [] };

  try {
    const res = await page.goto(TARGET + "/", { waitUntil: "networkidle", timeout: 45000 });
    result.httpStatus = res.status();
    if (res.status() !== 200) record("01-landing", "P0", `Landing returned HTTP ${res.status()}`, `Expected 200, got ${res.status()}`, null, TARGET + "/");

    const title = await page.title();
    result.title = title;
    const heroText = await page.locator("h1").first().textContent().catch(() => "");
    result.heroText = heroText;
    await page.screenshot({ path: join(stepDir, "hero-above-fold.png"), fullPage: false });
    await page.screenshot({ path: join(stepDir, "full-page.png"), fullPage: true });

    // Click all visible CTAs and links to verify they don't crash
    const ctaLinks = await page.locator("a[href], button").all();
    result.linkCount = ctaLinks.length;

    // Collect all links and analyze
    const anchors = await page.$$eval("a[href]", (els) =>
      els.map((a) => ({ href: a.getAttribute("href"), text: (a.textContent || "").trim().slice(0, 80) }))
    );
    result.anchors = anchors;

    // Check for empty hrefs, # anchors, broken targets
    for (const a of anchors) {
      if (!a.href) continue;
      if (a.href === "#" || a.href === "") {
        record("01-landing", "P2", `Dead anchor: "${a.text}"`, `href="${a.href}" — clicks nothing`, null, TARGET + "/");
      }
    }

    // Body text check
    const bodyText = (await page.textContent("body")) || "";
    result.bodyLength = bodyText.length;
    if (!bodyText.toLowerCase().includes("boutique") && !bodyText.toLowerCase().includes("practiq")) {
      record("01-landing", "P1", "Hero copy missing brand", "Body lacks 'Practiq' or 'boutique' keywords", null, TARGET + "/");
    }

    if (obs.consoleErrors.length > 0) {
      record("01-landing", "P1", `${obs.consoleErrors.length} console errors on landing`, obs.consoleErrors.slice(0, 3).join(" | "), join(stepDir, "full-page.png"), TARGET + "/");
    }
    if (obs.networkFailures.length > 0) {
      record("01-landing", "P1", `${obs.networkFailures.length} network failures on landing`, obs.networkFailures.slice(0, 3).join(" | "), null, TARGET + "/");
    }
  } catch (err) {
    result.error = err.message;
    record("01-landing", "P0", "Landing page crashed loading", err.message, null, TARGET + "/");
  } finally {
    await writeFile(join(stepDir, "result.json"), JSON.stringify(result, null, 2));
    await ctx.close();
  }
  return result;
}

async function step02WorkflowAudit(browser) {
  const stepDir = join(OUTDIR, "02-workflow-audit");
  await mkdir(stepDir, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const obs = await captureConsoleAndNet(page, stepDir, "audit");
  const result = { step: "02-workflow-audit", url: TARGET + "/workflow-audit", observations: obs, notes: [] };

  try {
    const res = await page.goto(TARGET + "/workflow-audit", { waitUntil: "networkidle", timeout: 45000 });
    result.httpStatus = res.status();
    await page.screenshot({ path: join(stepDir, "step-1-initial.png"), fullPage: true });

    if (res.status() !== 200) {
      record("02-workflow-audit", "P0", `Workflow audit page HTTP ${res.status()}`, `Cannot start free tool`, null, TARGET + "/workflow-audit");
      return result;
    }

    // Try to detect the 8-step form structure
    const buttons = await page.$$eval("button", (els) => els.map((b) => (b.textContent || "").trim().slice(0, 60)));
    result.firstScreenButtons = buttons;

    // Realistic boutique-firm answers — try filling step by step
    const stepsCompleted = [];

    // Try multiple input strategies
    for (let i = 0; i < 12; i++) {
      const inputs = await page.locator("input:visible, textarea:visible, select:visible").all();
      const radios = await page.locator("input[type='radio']:visible, [role='radio']:visible").all();
      const checkboxes = await page.locator("input[type='checkbox']:visible").all();
      const buttonsNow = await page.locator("button:visible").all();

      // Capture this step screenshot before interaction
      await page.screenshot({ path: join(stepDir, `step-${String(i + 1).padStart(2, "0")}-before.png`), fullPage: true });

      const stepInfo = { idx: i, inputs: inputs.length, radios: radios.length, checkboxes: checkboxes.length, buttons: buttonsNow.length };

      // Fill any visible text/number inputs
      for (const inp of inputs) {
        try {
          const tag = await inp.evaluate((el) => el.tagName.toLowerCase());
          const type = await inp.getAttribute("type").catch(() => "text");
          const name = (await inp.getAttribute("name").catch(() => "")) || "";
          const placeholder = (await inp.getAttribute("placeholder").catch(() => "")) || "";
          const ariaLabel = (await inp.getAttribute("aria-label").catch(() => "")) || "";
          const hint = (name + " " + placeholder + " " + ariaLabel).toLowerCase();

          if (tag === "select") {
            // pick the 2nd option to skip empty default
            await inp.selectOption({ index: 1 }).catch(() => {});
            continue;
          }
          if (type === "checkbox" || type === "radio") continue;
          if (type === "email" || hint.includes("email")) {
            await inp.fill(TEST_EMAIL).catch(() => {});
          } else if (type === "number" || hint.includes("client") || hint.includes("how many")) {
            await inp.fill("120").catch(() => {});
          } else if (hint.includes("name") && hint.includes("firm")) {
            await inp.fill("Park Boutique Accounting").catch(() => {});
          } else if (hint.includes("name") || hint.includes("first")) {
            await inp.fill(TEST_NAME).catch(() => {});
          } else if (tag === "textarea") {
            await inp.fill("Monthly close, quarterly tax estimates, client communication, AR followup.").catch(() => {});
          } else {
            await inp.fill("6").catch(() => {});
          }
        } catch (e) {
          // ignore
        }
      }

      // Click first radio of each group
      const radioGroups = new Set();
      for (const r of radios) {
        try {
          const name = await r.getAttribute("name").catch(() => "");
          if (name && radioGroups.has(name)) continue;
          if (name) radioGroups.add(name);
          await r.click({ force: true, timeout: 1500 }).catch(() => {});
        } catch (e) {}
      }

      // Capture after fill
      await page.screenshot({ path: join(stepDir, `step-${String(i + 1).padStart(2, "0")}-after.png`), fullPage: true });

      // Try to advance
      let advanced = false;
      for (const sel of [
        'button:has-text("Next")',
        'button:has-text("Continue")',
        'button:has-text("Submit")',
        'button[type="submit"]',
        'button:has-text("See my report")',
        'button:has-text("See My Report")',
        'button:has-text("Get my")',
      ]) {
        try {
          const btn = page.locator(sel).first();
          if ((await btn.count()) > 0) {
            await btn.click({ timeout: 3000 });
            advanced = true;
            stepInfo.clickedSelector = sel;
            break;
          }
        } catch (e) {}
      }

      stepInfo.advanced = advanced;
      stepsCompleted.push(stepInfo);

      if (!advanced) {
        // try clicking any large primary-looking button
        const primaryBtns = await page.locator('button.bg-blue-600, button.bg-blue-500, [class*="primary"]:not([disabled])').all();
        if (primaryBtns.length > 0) {
          await primaryBtns[0].click({ timeout: 2000 }).catch(() => {});
          advanced = true;
          stepInfo.clickedFallback = true;
        }
      }

      if (!advanced) {
        result.notes.push(`Stuck at step ${i + 1} — no advance button found`);
        break;
      }
      // Wait for navigation/animation
      await page.waitForTimeout(1500);
      // Check if URL changed (might be a results page)
      const url = page.url();
      stepInfo.urlAfter = url;
      if (url.includes("/audit/") || url.includes("/result")) {
        result.notes.push(`Reached results URL at step ${i + 1}: ${url}`);
        break;
      }
    }

    result.stepsCompleted = stepsCompleted;
    await page.screenshot({ path: join(stepDir, "final-state.png"), fullPage: true });

    const finalText = (await page.textContent("body")) || "";
    result.finalHasReportLanguage = /report|recommendation|score|finding|next step/i.test(finalText);

    if (obs.consoleErrors.length > 0) {
      record("02-workflow-audit", "P1", `${obs.consoleErrors.length} console errors in workflow-audit funnel`, obs.consoleErrors.slice(0, 3).join(" | "), join(stepDir, "final-state.png"));
    }
    if (obs.networkFailures.length > 0) {
      record("02-workflow-audit", "P1", `${obs.networkFailures.length} network failures in workflow-audit funnel`, obs.networkFailures.slice(0, 3).join(" | "));
    }
  } catch (err) {
    result.error = err.message;
    record("02-workflow-audit", "P0", "Workflow audit funnel crashed", err.message, null, TARGET + "/workflow-audit");
  } finally {
    await writeFile(join(stepDir, "result.json"), JSON.stringify(result, null, 2));
    await ctx.close();
  }
  return result;
}

async function step03PolicyGenerator(browser) {
  const stepDir = join(OUTDIR, "03-policy-generator");
  await mkdir(stepDir, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const obs = await captureConsoleAndNet(page, stepDir, "policy-gen");
  const result = { step: "03-policy-generator", url: TARGET + "/tools/ai-policy-generator", observations: obs, notes: [] };

  try {
    const res = await page.goto(TARGET + "/tools/ai-policy-generator", { waitUntil: "networkidle", timeout: 45000 });
    result.httpStatus = res.status();
    await page.screenshot({ path: join(stepDir, "initial.png"), fullPage: true });

    if (res.status() !== 200) {
      record("03-policy-generator", "P0", `Policy generator page HTTP ${res.status()}`, `Cannot reach free tool`, null, TARGET + "/tools/ai-policy-generator");
      return result;
    }

    // Pick CPA vertical — try select / dropdown / radio
    const selects = await page.locator("select:visible").all();
    if (selects.length > 0) {
      try {
        await selects[0].selectOption({ label: "CPA" }).catch(async () => {
          await selects[0].selectOption({ value: "cpa" }).catch(async () => {
            await selects[0].selectOption({ index: 1 });
          });
        });
        result.notes.push("Selected vertical via <select>");
      } catch (e) {
        result.notes.push("Failed to select vertical: " + e.message);
      }
    } else {
      // try radio/button labels
      const cpaBtns = await page.locator('button:has-text("CPA"), [role="radio"]:has-text("CPA"), label:has-text("CPA")').all();
      if (cpaBtns.length > 0) {
        await cpaBtns[0].click().catch(() => {});
        result.notes.push("Clicked CPA via button");
      } else {
        const legalBtns = await page.locator('button:has-text("Legal"), label:has-text("Legal")').all();
        if (legalBtns.length > 0) {
          await legalBtns[0].click().catch(() => {});
          result.notes.push("Fell back to legal vertical");
        } else {
          result.notes.push("Could not find vertical picker");
        }
      }
    }

    // Fill firm fields if visible
    const inputs = await page.locator("input:visible, textarea:visible").all();
    for (const inp of inputs) {
      try {
        const type = await inp.getAttribute("type").catch(() => "text");
        const ph = ((await inp.getAttribute("placeholder").catch(() => "")) || "").toLowerCase();
        const name = ((await inp.getAttribute("name").catch(() => "")) || "").toLowerCase();
        const hint = ph + " " + name;
        if (type === "email" || hint.includes("email")) {
          await inp.fill(TEST_EMAIL).catch(() => {});
        } else if (hint.includes("firm") || hint.includes("company") || hint.includes("organization")) {
          await inp.fill("Park Boutique CPA").catch(() => {});
        } else if (hint.includes("name")) {
          await inp.fill(TEST_NAME).catch(() => {});
        }
      } catch (e) {}
    }

    await page.screenshot({ path: join(stepDir, "filled.png"), fullPage: true });

    // Click Generate / Continue
    let generateClicked = false;
    for (const sel of [
      'button:has-text("Generate")',
      'button:has-text("Create")',
      'button:has-text("Build")',
      'button[type="submit"]',
      'button:has-text("Continue")',
    ]) {
      const b = page.locator(sel).first();
      if ((await b.count()) > 0) {
        await b.click({ timeout: 3000 }).catch(() => {});
        generateClicked = true;
        result.notes.push(`Clicked: ${sel}`);
        break;
      }
    }

    if (!generateClicked) {
      record("03-policy-generator", "P0", "No Generate button found", "Could not trigger policy generation flow", join(stepDir, "filled.png"));
    }

    // Wait for generation
    await page.waitForTimeout(8000);
    await page.screenshot({ path: join(stepDir, "after-generate.png"), fullPage: true });

    // Look for download link / PDF button
    const dlBtns = await page.locator('a:has-text("Download"), button:has-text("Download"), a[href$=".pdf"], a[href*=".pdf"]').all();
    result.downloadCount = dlBtns.length;
    if (dlBtns.length === 0) {
      // wait longer
      await page.waitForTimeout(15000);
      await page.screenshot({ path: join(stepDir, "after-wait.png"), fullPage: true });
      const dlAfter = await page.locator('a:has-text("Download"), button:has-text("Download"), a[href$=".pdf"]').all();
      result.downloadCountAfterWait = dlAfter.length;
      if (dlAfter.length === 0) {
        record("03-policy-generator", "P1", "No download link surfaced after generation", "Waited 23s, no Download CTA appeared", join(stepDir, "after-wait.png"));
      }
    }

    if (obs.consoleErrors.length > 0) {
      record("03-policy-generator", "P1", `${obs.consoleErrors.length} console errors during policy generation`, obs.consoleErrors.slice(0, 3).join(" | "));
    }
    if (obs.networkFailures.length > 0) {
      record("03-policy-generator", "P1", `${obs.networkFailures.length} network failures in policy generator`, obs.networkFailures.slice(0, 5).join(" | "));
    }
  } catch (err) {
    result.error = err.message;
    record("03-policy-generator", "P0", "Policy generator crashed", err.message, null, TARGET + "/tools/ai-policy-generator");
  } finally {
    await writeFile(join(stepDir, "result.json"), JSON.stringify(result, null, 2));
    await ctx.close();
  }
  return result;
}

async function step04DemoWorkspace(browser) {
  const stepDir = join(OUTDIR, "04-demo-workspace");
  await mkdir(stepDir, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const obs = await captureConsoleAndNet(page, stepDir, "demo");
  const result = { step: "04-demo-workspace", url: TARGET + "/demo/workspace", observations: obs, notes: [] };

  try {
    const res = await page.goto(TARGET + "/demo/workspace", { waitUntil: "networkidle", timeout: 45000 });
    result.httpStatus = res.status();
    await page.screenshot({ path: join(stepDir, "initial.png"), fullPage: true });

    if (res.status() !== 200) {
      record("04-demo-workspace", "P0", `Demo workspace HTTP ${res.status()}`, `Cannot reach demo`, null, TARGET + "/demo/workspace");
      return result;
    }

    // Find nav links inside demo (sidebar)
    const navLinks = await page.$$eval('nav a, aside a, [role="navigation"] a', (els) =>
      els.map((a) => ({ href: a.getAttribute("href"), text: (a.textContent || "").trim().slice(0, 50) }))
    );
    result.navLinks = navLinks;

    const visited = [];
    for (const t of ["clients", "approval", "knowledge", "thread", "settings", "billing", "team", "profile", "firm", "learned"]) {
      try {
        const link = page.locator(`a:has-text("${t}"), button:has-text("${t}")`).first();
        if ((await link.count()) > 0) {
          await link.click({ timeout: 4000 }).catch(() => {});
          await page.waitForTimeout(1500);
          await page.screenshot({ path: join(stepDir, `nav-${t}.png`), fullPage: true });
          visited.push({ target: t, url: page.url(), ok: true });
        } else {
          visited.push({ target: t, ok: false, reason: "not found" });
        }
      } catch (e) {
        visited.push({ target: t, ok: false, reason: e.message });
      }
    }
    result.visited = visited;

    // Try to trigger upgrade CTA
    for (const sel of [
      'button:has-text("Upgrade")',
      'a:has-text("Upgrade")',
      'button:has-text("Start free trial")',
      'button:has-text("Get started")',
      'a:has-text("Start free trial")',
    ]) {
      const b = page.locator(sel).first();
      if ((await b.count()) > 0) {
        await b.click({ timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(2000);
        await page.screenshot({ path: join(stepDir, "after-upgrade-click.png"), fullPage: true });
        result.upgradeClicked = sel;
        result.upgradeUrlAfter = page.url();
        break;
      }
    }

    if (obs.consoleErrors.length > 0) {
      record("04-demo-workspace", "P1", `${obs.consoleErrors.length} console errors in demo workspace`, obs.consoleErrors.slice(0, 5).join(" | "));
    }
    if (obs.networkFailures.length > 0) {
      record("04-demo-workspace", "P1", `${obs.networkFailures.length} network failures in demo workspace`, obs.networkFailures.slice(0, 5).join(" | "));
    }
  } catch (err) {
    result.error = err.message;
    record("04-demo-workspace", "P0", "Demo workspace crashed", err.message, null, TARGET + "/demo/workspace");
  } finally {
    await writeFile(join(stepDir, "result.json"), JSON.stringify(result, null, 2));
    await ctx.close();
  }
  return result;
}

async function step05Signup(browser) {
  const stepDir = join(OUTDIR, "05-signup");
  await mkdir(stepDir, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const obs = await captureConsoleAndNet(page, stepDir, "signup");
  const result = { step: "05-signup", url: TARGET + "/signup", observations: obs, notes: [] };

  try {
    const res = await page.goto(TARGET + "/signup", { waitUntil: "networkidle", timeout: 45000 });
    result.httpStatus = res.status();
    await page.screenshot({ path: join(stepDir, "initial.png"), fullPage: true });

    if (res.status() !== 200) {
      record("05-signup", "P0", `Signup page HTTP ${res.status()}`, `Cannot reach signup`, null, TARGET + "/signup");
      return result;
    }

    // Identify fields
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const pwInput = page.locator('input[type="password"]').first();
    const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();

    if ((await emailInput.count()) > 0) await emailInput.fill(TEST_EMAIL);
    if ((await pwInput.count()) > 0) await pwInput.fill(TEST_PASSWORD);
    if ((await nameInput.count()) > 0) await nameInput.fill(TEST_NAME);
    await page.screenshot({ path: join(stepDir, "filled.png"), fullPage: true });

    // Submit
    const submitCandidates = ['button[type="submit"]', 'button:has-text("Sign up")', 'button:has-text("Create account")', 'button:has-text("Get started")'];
    let submitted = false;
    for (const s of submitCandidates) {
      const b = page.locator(s).first();
      if ((await b.count()) > 0) {
        await b.click({ timeout: 3000 }).catch(() => {});
        submitted = true;
        result.notes.push(`submit via ${s}`);
        break;
      }
    }
    if (!submitted) record("05-signup", "P0", "No signup submit button found", "Cannot complete signup", join(stepDir, "filled.png"));

    await page.waitForTimeout(5000);
    await page.screenshot({ path: join(stepDir, "after-submit.png"), fullPage: true });
    result.urlAfterSubmit = page.url();

    // Check for error message
    const errorTexts = await page.$$eval('[role="alert"], .text-red-500, .text-red-600, [class*="error" i]', (els) =>
      els.map((e) => (e.textContent || "").trim()).filter((t) => t.length > 0 && t.length < 200)
    );
    result.errorTexts = errorTexts;
    if (errorTexts.length > 0) {
      record("05-signup", "P1", "Signup surfaced error on submit", errorTexts.slice(0, 3).join(" | "), join(stepDir, "after-submit.png"));
    }

    if (obs.consoleErrors.length > 0) {
      record("05-signup", "P1", `${obs.consoleErrors.length} console errors during signup`, obs.consoleErrors.slice(0, 3).join(" | "));
    }
    if (obs.networkFailures.length > 0) {
      record("05-signup", "P1", `${obs.networkFailures.length} network failures during signup`, obs.networkFailures.slice(0, 5).join(" | "));
    }

    // Save storage state in case we need to reuse the session
    if (result.urlAfterSubmit && (result.urlAfterSubmit.includes("/app") || result.urlAfterSubmit.includes("/verify"))) {
      await ctx.storageState({ path: join(stepDir, "storage.json") });
      result.storageSaved = true;
    }
  } catch (err) {
    result.error = err.message;
    record("05-signup", "P0", "Signup flow crashed", err.message, null, TARGET + "/signup");
  } finally {
    await writeFile(join(stepDir, "result.json"), JSON.stringify(result, null, 2));
    await ctx.close();
  }
  return result;
}

async function step06FoundingDeeplink(browser) {
  const stepDir = join(OUTDIR, "06-founding-deeplink");
  await mkdir(stepDir, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const obs = await captureConsoleAndNet(page, stepDir, "founding");
  const result = { step: "06-founding-deeplink", url: TARGET + "/signup?plan=founding_member", observations: obs, notes: [] };
  const founderEmail = `seungdo+dogfood-founder-2026-05-13@grindworks.ai`;

  try {
    const res = await page.goto(TARGET + "/signup?plan=founding_member", { waitUntil: "networkidle", timeout: 45000 });
    result.httpStatus = res.status();
    await page.screenshot({ path: join(stepDir, "initial.png"), fullPage: true });

    if (res.status() !== 200) {
      record("06-founding-deeplink", "P0", `Founding signup HTTP ${res.status()}`, "Deep-link broken", null, TARGET + "/signup?plan=founding_member");
      return result;
    }

    // Check if "founding" or "founding member" badge renders
    const bodyText = (await page.textContent("body")) || "";
    const hasFoundingBadge = /founding/i.test(bodyText);
    result.hasFoundingBadge = hasFoundingBadge;
    if (!hasFoundingBadge) {
      record("06-founding-deeplink", "P1", "Founding member badge missing on signup", "Body text has no 'founding' keyword — deep-link state not surfaced", join(stepDir, "initial.png"));
    }

    // Fill signup
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const pwInput = page.locator('input[type="password"]').first();
    const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
    if ((await emailInput.count()) > 0) await emailInput.fill(founderEmail);
    if ((await pwInput.count()) > 0) await pwInput.fill(TEST_PASSWORD);
    if ((await nameInput.count()) > 0) await nameInput.fill("Founder Test");
    await page.screenshot({ path: join(stepDir, "filled.png"), fullPage: true });

    for (const s of ['button[type="submit"]', 'button:has-text("Sign up")', 'button:has-text("Create account")']) {
      const b = page.locator(s).first();
      if ((await b.count()) > 0) {
        await b.click({ timeout: 3000 }).catch(() => {});
        result.notes.push(`submit via ${s}`);
        break;
      }
    }

    await page.waitForTimeout(8000);
    result.urlAfterSubmit = page.url();
    await page.screenshot({ path: join(stepDir, "after-submit.png"), fullPage: true });

    if (page.url().includes("checkout.stripe.com") || page.url().includes("/api/stripe/checkout")) {
      result.reachedStripe = true;
      result.stripeUrl = page.url();
      record("06-founding-deeplink", "INFO", "Founding deeplink → Stripe Checkout reached", `URL: ${page.url().slice(0, 200)}`, join(stepDir, "after-submit.png"));
    } else {
      record("06-founding-deeplink", "P1", "Founding deeplink did not reach Stripe", `Ended at: ${page.url()}`, join(stepDir, "after-submit.png"));
    }

    if (obs.consoleErrors.length > 0) {
      record("06-founding-deeplink", "P1", `${obs.consoleErrors.length} console errors during founding signup`, obs.consoleErrors.slice(0, 3).join(" | "));
    }
    if (obs.networkFailures.length > 0) {
      record("06-founding-deeplink", "P1", `${obs.networkFailures.length} network failures during founding signup`, obs.networkFailures.slice(0, 5).join(" | "));
    }
  } catch (err) {
    result.error = err.message;
    record("06-founding-deeplink", "P0", "Founding deeplink crashed", err.message);
  } finally {
    await writeFile(join(stepDir, "result.json"), JSON.stringify(result, null, 2));
    await ctx.close();
  }
  return result;
}

async function step07Pricing(browser) {
  const stepDir = join(OUTDIR, "07-pricing");
  await mkdir(stepDir, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const obs = await captureConsoleAndNet(page, stepDir, "pricing");
  const result = { step: "07-pricing", url: TARGET + "/pricing", observations: obs, notes: [] };

  try {
    const res = await page.goto(TARGET + "/pricing", { waitUntil: "networkidle", timeout: 45000 });
    result.httpStatus = res.status();
    await page.screenshot({ path: join(stepDir, "initial.png"), fullPage: true });

    if (res.status() !== 200) {
      record("07-pricing", "P0", `Pricing HTTP ${res.status()}`, "Cannot reach pricing", null, TARGET + "/pricing");
      return result;
    }

    const bodyText = (await page.textContent("body")) || "";
    const hasSolo = /solo/i.test(bodyText);
    const hasPrice = /\$99|99\/mo|99 \/ mo|\$199|\$499/.test(bodyText);
    result.hasSolo = hasSolo;
    result.hasPrice = hasPrice;
    if (!hasSolo) record("07-pricing", "P1", "Pricing missing 'Solo' tier label", "Expected $99 Solo tier text", join(stepDir, "initial.png"));

    // Click first checkout-y button
    for (const s of [
      'a:has-text("Solo")',
      'button:has-text("Solo")',
      'a:has-text("Start free trial")',
      'button:has-text("Start free trial")',
      'a:has-text("Get started")',
      'a[href*="checkout"]',
      'button:has-text("Choose")',
    ]) {
      const b = page.locator(s).first();
      if ((await b.count()) > 0) {
        await b.click({ timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(4000);
        await page.screenshot({ path: join(stepDir, "after-click.png"), fullPage: true });
        result.afterClickUrl = page.url();
        result.clickSelector = s;
        break;
      }
    }

    if (obs.consoleErrors.length > 0) {
      record("07-pricing", "P1", `${obs.consoleErrors.length} console errors on pricing`, obs.consoleErrors.slice(0, 3).join(" | "));
    }
    if (obs.networkFailures.length > 0) {
      record("07-pricing", "P1", `${obs.networkFailures.length} network failures on pricing`, obs.networkFailures.slice(0, 5).join(" | "));
    }
  } catch (err) {
    result.error = err.message;
    record("07-pricing", "P0", "Pricing page crashed", err.message);
  } finally {
    await writeFile(join(stepDir, "result.json"), JSON.stringify(result, null, 2));
    await ctx.close();
  }
  return result;
}

async function step10Mobile(browser) {
  const stepDir = join(OUTDIR, "10-mobile");
  await mkdir(stepDir, { recursive: true });
  const out = [];

  for (const route of ["/", "/pricing", "/workflow-audit", "/demo/workspace"]) {
    const ctx = await browser.newContext({ ...devices["iPhone 13"] });
    const page = await ctx.newPage();
    const obs = await captureConsoleAndNet(page, stepDir, "mobile-" + route);
    const r = { route, observations: obs };
    try {
      const res = await page.goto(TARGET + route, { waitUntil: "networkidle", timeout: 45000 });
      r.httpStatus = res.status();
      await page.waitForTimeout(2000);
      const safeName = route.replace(/\//g, "_") || "_root";
      await page.screenshot({ path: join(stepDir, `${safeName}.png`), fullPage: true });

      // Check for horizontal overflow
      const overflow = await page.evaluate(() => {
        const docW = document.documentElement.scrollWidth;
        const winW = window.innerWidth;
        return { docW, winW, hasOverflow: docW > winW + 2 };
      });
      r.overflow = overflow;
      if (overflow.hasOverflow) {
        record("10-mobile", "P2", `Horizontal overflow on mobile route ${route}`, `scrollWidth=${overflow.docW}, innerWidth=${overflow.winW}`, join(stepDir, `${safeName}.png`), TARGET + route);
      }

      if (obs.consoleErrors.length > 0) {
        record("10-mobile", "P2", `${obs.consoleErrors.length} console errors on mobile ${route}`, obs.consoleErrors.slice(0, 2).join(" | "));
      }
    } catch (e) {
      r.error = e.message;
      record("10-mobile", "P1", `Mobile route ${route} crashed`, e.message);
    } finally {
      await ctx.close();
      out.push(r);
    }
  }
  await writeFile(join(stepDir, "result.json"), JSON.stringify(out, null, 2));
  return out;
}

async function main() {
  await mkdir(OUTDIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  console.log(`\n=== Practiq Dogfood Journey 2026-05-13 ===`);
  console.log(`Target: ${TARGET}`);
  console.log(`Output: ${OUTDIR}\n`);

  const allResults = {};
  console.log("Step 01: Landing");
  allResults.landing = await step01Landing(browser);
  console.log("Step 02: Workflow Audit");
  allResults.workflowAudit = await step02WorkflowAudit(browser);
  console.log("Step 03: AI Policy Generator");
  allResults.policyGen = await step03PolicyGenerator(browser);
  console.log("Step 04: Demo Workspace");
  allResults.demoWorkspace = await step04DemoWorkspace(browser);
  console.log("Step 05: Signup");
  allResults.signup = await step05Signup(browser);
  console.log("Step 06: Founding deep-link");
  allResults.founding = await step06FoundingDeeplink(browser);
  console.log("Step 07: Pricing → checkout");
  allResults.pricing = await step07Pricing(browser);
  console.log("Step 10: Mobile rendering");
  allResults.mobile = await step10Mobile(browser);

  await browser.close();

  await writeFile(join(OUTDIR, "all-results.json"), JSON.stringify(allResults, null, 2));
  await writeFile(join(OUTDIR, "raw-findings.json"), JSON.stringify(findings, null, 2));

  // Summary
  const counts = { P0: 0, P1: 0, P2: 0, P3: 0, INFO: 0 };
  for (const f of findings) counts[f.severity] = (counts[f.severity] || 0) + 1;
  console.log(`\n=== Findings Summary ===`);
  for (const [k, v] of Object.entries(counts)) console.log(`  ${k}: ${v}`);
  console.log(`\nTotal findings: ${findings.length}`);
  console.log(`Output dir: ${OUTDIR}`);
}

main().catch((err) => {
  console.error("Dogfood journey crashed:", err);
  process.exit(2);
});
