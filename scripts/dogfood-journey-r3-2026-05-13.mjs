#!/usr/bin/env node
/**
 * Practiq Round-3 dogfood — 2026-05-13
 *
 * R1 blocked at signup combobox. R2 blocked at beta gate. R3 = the
 * previously-untestable surfaces now that BETA_OPEN_SIGNUP=1 + commit
 * 2d9c9a0 are live (operator-verified HTTP 201 on a fresh signup).
 *
 * Posture: discovery only. Source-verify every claim before recording.
 * No code fixes here. One-line obvious typos are fine to inline, but
 * preferred to enumerate.
 *
 * Output: tmp/dogfood-r3-2026-05-13/<step-N>/ + raw-findings.json
 */
import { chromium, devices } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const TARGET = "https://practiq.dev";
const ADMIN_TARGET = "https://admin.grindworks.ai";
const OUTDIR = join("tmp", "dogfood-r3-2026-05-13");
const TEST_EMAIL = `seungdo+dogfood-r3-2026-05-13@grindworks.ai`;
const TEST_PASSWORD = `DogfoodR3-2026!Strong#`;
const TEST_NAME = "Seungdo R3";
const TEST_FIRM = "Park Boutique CPA R3";
const POLICY_EMAIL = `seungdo+r3-policy-2026-05-13@grindworks.ai`;

const findings = [];

function record(step, severity, title, detail, screenshot = null, url = null) {
  findings.push({ step, severity, title, detail, screenshot, url, ts: new Date().toISOString() });
}

function attachObservers(page) {
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

/**
 * Step 01: Verify R1 + R2 P0 fixes still hold.
 */
async function step01R1R2Verification(browser) {
  const stepDir = join(OUTDIR, "01-r1r2-verification");
  await mkdir(stepDir, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  attachObservers(page);
  const result = { step: "01-r1r2-verification", checks: {} };

  try {
    // 1. PPractiq scrape (R2 P0-R2-2)
    const landingRes = await page.goto(TARGET + "/", { waitUntil: "networkidle", timeout: 45000 });
    const landingHtml = await page.content();
    // Strip scripts/styles first, then HTML tags — the ::before pseudo-content lives in CSS, not text
    const stripped = landingHtml
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ");
    result.checks.scrape = {
      ppractiqCount: (stripped.match(/PPractiq/g) || []).length,
      practiqCount: (stripped.match(/(?<!P)Practiq/g) || []).length,
      method: "strip-scripts-styles-then-tags (matches what text-scrapers / email-link-previews actually do)",
    };
    await page.screenshot({ path: join(stepDir, "landing.png"), fullPage: false });
    if (result.checks.scrape.ppractiqCount > 0)
      record("01-r1r2-verification", "P0", `R2 P0-R2-2 regressed: "PPractiq" still scrapes ${result.checks.scrape.ppractiqCount}x`, "::before pseudo strategy lost", join(stepDir, "landing.png"), TARGET + "/");

    // 2. Pricing tier wording (R1 P0-1)
    await page.goto(TARGET + "/pricing", { waitUntil: "networkidle", timeout: 45000 });
    const pricingHtml = await page.content();
    result.checks.pricing = {
      has149Anchor: /\$149/.test(pricingHtml),
      hasMostPopular: /Most popular/i.test(pricingHtml),
      hasPracticeTier: /Practice tier/i.test(pricingHtml),
      hasFiftyOff: /50% off/i.test(pricingHtml),
      hasSolo: /Solo/i.test(pricingHtml),
      hasFirm: /Firm/i.test(pricingHtml),
      hasFAQAnchor: /pricing-faq/i.test(pricingHtml),
    };
    await page.screenshot({ path: join(stepDir, "pricing.png"), fullPage: false });
    if (!result.checks.pricing.has149Anchor || !result.checks.pricing.hasMostPopular || !result.checks.pricing.hasPracticeTier)
      record("01-r1r2-verification", "P0", "R1 P0-1 regressed on /pricing", JSON.stringify(result.checks.pricing), join(stepDir, "pricing.png"), TARGET + "/pricing");

    // 3. Founding deeplink — has the corrected "on the Practice tier" string
    await page.goto(TARGET + "/signup?plan=founding_member", { waitUntil: "networkidle", timeout: 45000 });
    // For a "use client" page, the strings live in the chunk
    const html = await page.content();
    const chunkMatch = html.match(/src="(\/_next\/static\/chunks\/app\/\(auth\)\/signup\/page-[a-f0-9]+\.js)"/);
    let chunkText = "";
    if (chunkMatch) {
      const chunkUrl = TARGET + chunkMatch[1];
      try {
        const r = await fetch(chunkUrl);
        chunkText = await r.text();
      } catch (e) {}
    }
    const visibleText = (await page.textContent("body")) || "";
    result.checks.foundingDeeplink = {
      chunkUrl: chunkMatch ? chunkMatch[1] : null,
      chunkHasPracticeTier: /on the Practice tier/i.test(chunkText),
      chunkHasOnPracticeBare: / on Practice"/i.test(chunkText) || / on Practice\\"/i.test(chunkText),
      visibleHasPracticeTier: /on the Practice tier/i.test(visibleText),
      visibleHasFounding: /[Ff]ounding/i.test(visibleText),
      visibleHasCounter: /of 50|50 spots|spots claimed|seats? remaining/i.test(visibleText),
    };
    await page.screenshot({ path: join(stepDir, "founding-deeplink.png"), fullPage: false });
    if (!result.checks.foundingDeeplink.chunkHasPracticeTier)
      record("01-r1r2-verification", "P0", "R1 P0-2 regressed: 'on the Practice tier' missing from signup chunk", "Founding pill copy reverted to 'on Practice'", join(stepDir, "founding-deeplink.png"), TARGET + "/signup?plan=founding_member");
    if (result.checks.foundingDeeplink.chunkHasOnPracticeBare)
      record("01-r1r2-verification", "P0", "R1 P0-2 regressed: 'on Practice' (bare) re-appeared", "Check for residual copy in signup page", join(stepDir, "founding-deeplink.png"), TARGET + "/signup?plan=founding_member");

    // 4. Signup vertical inline error (R1 P0-4) — test empty submit, verify chunk has setVerticalError handler
    await page.goto(TARGET + "/signup", { waitUntil: "networkidle", timeout: 45000 });
    const signupHtml = await page.content();
    const signupChunkMatch = signupHtml.match(/src="(\/_next\/static\/chunks\/app\/\(auth\)\/signup\/page-[a-f0-9]+\.js)"/);
    let signupChunkText = "";
    if (signupChunkMatch) {
      try {
        const r = await fetch(TARGET + signupChunkMatch[1]);
        signupChunkText = await r.text();
      } catch (e) {}
    }
    result.checks.signupVerticalError = {
      chunkHasSetVerticalError: /setVerticalError|verticalError/.test(signupChunkText),
      chunkHasChevron: /ChevronDown/i.test(signupChunkText),
      chunkSize: signupChunkText.length,
    };

    // Attempt an empty-vertical submit to confirm the inline error renders
    try {
      await page.fill("#signup-name", "EmptyVerticalProbe");
      await page.fill("#signup-email", "empty-vertical-probe-" + Date.now() + "@example.test");
      const pwInput = page.locator('input[type="password"]').first();
      await pwInput.fill("ProbePass#2026!");
      // Do NOT fill vertical. Submit.
      const submitBtn = page.locator('button[type="submit"]').first();
      await submitBtn.click({ timeout: 5000 });
      await page.waitForTimeout(2000);
      // Look for the inline error
      const verticalErrorEl = await page.locator('[role="alert"], [aria-live]').allTextContents();
      result.checks.signupVerticalError.inlineErrorAfterEmptySubmit = verticalErrorEl.filter(t => t.trim()).slice(0, 5);
      await page.screenshot({ path: join(stepDir, "signup-empty-vertical.png"), fullPage: false });
    } catch (e) {
      result.checks.signupVerticalError.error = e.message;
    }

    // 5. Workflow audit subject — source-only verify
    const auditApiRes = await page.evaluate(async () => {
      try {
        const r = await fetch("/api/workflow-audit/generate", { method: "GET" });
        return { status: r.status, ok: r.ok };
      } catch (e) { return { error: String(e) }; }
    });
    result.checks.workflowAuditEndpoint = auditApiRes;

    // 6. Founding counter API
    const foundingStatusApi = await page.evaluate(async () => {
      try {
        const r = await fetch("/api/founding/status");
        return { status: r.status, body: await r.json() };
      } catch (e) { return { error: String(e) }; }
    });
    result.checks.foundingStatus = foundingStatusApi;
  } catch (e) {
    result.error = e.message;
  } finally {
    await writeFile(join(stepDir, "result.json"), JSON.stringify(result, null, 2));
    await ctx.close();
  }
  return result;
}

/**
 * Step 02: Signup → /app for a fresh test user with beta gate now open.
 */
async function step02SignupToApp(browser) {
  const stepDir = join(OUTDIR, "02-signup-to-app");
  await mkdir(stepDir, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const obs = attachObservers(page);
  const result = { step: "02-signup-to-app", observations: obs };

  try {
    const res = await page.goto(TARGET + "/signup", { waitUntil: "networkidle", timeout: 45000 });
    result.httpStatus = res.status();
    await page.screenshot({ path: join(stepDir, "01-initial.png"), fullPage: false });

    await page.fill("#signup-name", TEST_NAME);
    await page.fill("#signup-email", TEST_EMAIL);
    await page.selectOption("#signup-vertical", "accounting");
    const pwInput = page.locator('input[type="password"]').first();
    await pwInput.fill(TEST_PASSWORD);

    await page.screenshot({ path: join(stepDir, "02-filled.png"), fullPage: false });

    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click({ timeout: 5000 });

    // Wait for the post-submit redirect
    await page.waitForURL((url) => url.toString().includes("/app") || url.toString().includes("/welcome") || url.toString().includes("/login") || url.toString().includes("/check-email"), {
      timeout: 30000,
    }).catch(() => {});

    await page.waitForTimeout(3000);
    result.urlAfterSubmit = page.url();
    await page.screenshot({ path: join(stepDir, "03-after-submit.png"), fullPage: true });

    const bodyText = (await page.textContent("body")) || "";
    result.bodyAfterSubmit = bodyText.slice(0, 800);
    result.signupReached = page.url();

    if (page.url().includes("/app")) {
      result.signupSuccessful = true;
      await ctx.storageState({ path: join(stepDir, "storage.json") });
      result.storageSaved = true;

      const heading = await page.locator("h1, h2").first().textContent().catch(() => "");
      result.appHomeHeading = (heading || "").slice(0, 150);
      result.appHomeKeywords = {
        hasGreeting: /welcome|good (morning|afternoon|evening)|hi /i.test(bodyText),
        hasSampleClient: /sample|example|demo client/i.test(bodyText),
        hasOnboardingChecklist: /onboarding|getting started|checklist|complete (your )?profile|next step/i.test(bodyText),
        hasEmptyState: /no clients|create your first|nothing yet|empty/i.test(bodyText),
      };
    } else if (page.url().includes("/check-email") || /confirm your email|check your inbox/i.test(bodyText)) {
      result.signupSuccessful = "double-opt-in-required";
      result.note = "Signup created but email confirmation gates /app — confirmation email must be clicked to proceed";
    } else if (page.url().includes("/login")) {
      result.signupSuccessful = false;
      result.note = "Submit succeeded but landed on /login — auto-login may be broken";
      record("02-signup-to-app", "P1", "Signup did not auto-login to /app", `Landed on /login after submit. Body: ${bodyText.slice(0, 200)}`, join(stepDir, "03-after-submit.png"), TARGET + "/signup");
    } else {
      result.signupSuccessful = false;
      const err = await page.locator('[role="alert"], .text-red-400, .text-red-300').first().textContent().catch(() => "");
      result.signupError = (err || "").slice(0, 300);
      record("02-signup-to-app", "P0", "Signup did not reach /app", `URL: ${page.url()}, error: ${result.signupError}, body: ${bodyText.slice(0,200)}`, join(stepDir, "03-after-submit.png"), TARGET + "/signup");
    }

    // Even if we didn't reach /app, attempt programmatic login via NextAuth's credentials route
    // to get a session for downstream steps (single source of truth = anonymous probes / signup API).
    if (!result.signupSuccessful || result.signupSuccessful === "double-opt-in-required") {
      try {
        await page.goto(TARGET + "/login", { waitUntil: "networkidle", timeout: 30000 });
        await page.fill('input[type="email"], input[name="email"]', TEST_EMAIL).catch(() => {});
        await page.fill('input[type="password"]', TEST_PASSWORD).catch(() => {});
        const loginBtn = page.locator('button[type="submit"]').first();
        await loginBtn.click({ timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(3500);
        result.urlAfterLogin = page.url();
        if (page.url().includes("/app")) {
          await ctx.storageState({ path: join(stepDir, "storage.json") });
          result.storageSaved = true;
          result.loginAfterSignup = "success";
        } else {
          result.loginAfterSignup = "failed";
          await page.screenshot({ path: join(stepDir, "04-after-login.png"), fullPage: true });
        }
      } catch (e) {
        result.loginAfterSignupError = e.message;
      }
    }

    if (obs.consoleErrors.length > 0)
      record("02-signup-to-app", "P1", `${obs.consoleErrors.length} console errors during signup`, obs.consoleErrors.slice(0, 3).join(" | "));
    if (obs.networkFailures.length > 0)
      record("02-signup-to-app", "P1", `${obs.networkFailures.length} network failures during signup`, obs.networkFailures.slice(0, 5).join(" | "));
  } catch (e) {
    result.error = e.message;
    record("02-signup-to-app", "P0", "Signup-to-app crashed", e.message, null, TARGET + "/signup");
  } finally {
    await writeFile(join(stepDir, "result.json"), JSON.stringify(result, null, 2));
    await ctx.close();
  }
  return result;
}

/**
 * Step 03: Authenticated /app tour — every dashboard surface a brand-new user sees.
 */
async function step03AppExploration(browser, storageStatePath) {
  const stepDir = join(OUTDIR, "03-app-exploration");
  await mkdir(stepDir, { recursive: true });
  const result = { step: "03-app-exploration", visits: [] };
  if (!storageStatePath) {
    result.skipped = "no storage state — signup didn't succeed";
    await writeFile(join(stepDir, "result.json"), JSON.stringify(result, null, 2));
    return result;
  }
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, storageState: storageStatePath });
  const page = await ctx.newPage();
  const obs = attachObservers(page);
  result.observations = obs;

  const routes = [
    { path: "/app", label: "app-home" },
    { path: "/app/clients", label: "clients" },
    { path: "/app/tasks", label: "tasks" },
    { path: "/app/workflows", label: "workflows" },
    { path: "/app/settings", label: "settings" },
    { path: "/app/settings/learned-patterns", label: "settings-learned-patterns" },
  ];

  for (const r of routes) {
    const visit = { path: r.path, label: r.label };
    try {
      const res = await page.goto(TARGET + r.path, { waitUntil: "networkidle", timeout: 45000 });
      visit.httpStatus = res.status();
      await page.waitForTimeout(1500);
      visit.finalUrl = page.url();
      await page.screenshot({ path: join(stepDir, `${r.label}.png`), fullPage: true });
      const heading = await page.locator("h1, h2, h3").first().textContent().catch(() => "");
      visit.heading = (heading || "").slice(0, 150);
      const bodyText = (await page.textContent("body")) || "";
      visit.bodyLength = bodyText.length;
      visit.bodyExcerpt = bodyText.slice(0, 400);

      visit.empty = /no clients|create your first|nothing yet|empty|coming soon|under construction|not available/i.test(bodyText);
      visit.hasErrorMsg = /something went wrong|server error|500|unable to load|failed to fetch/i.test(bodyText);
      visit.hasOnboardingPrompt = /getting started|next step|complete (your )?profile|connect quickbooks/i.test(bodyText);

      // Inspect interactive elements (nav, tabs, CTAs)
      const interactiveSummary = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href]')).slice(0, 30).map(a => ({
          href: a.getAttribute("href"),
          text: (a.textContent || "").trim().slice(0, 40),
        })).filter(l => l.text);
        const buttons = Array.from(document.querySelectorAll('button')).slice(0, 30).map(b => ({
          text: (b.textContent || "").trim().slice(0, 40),
          disabled: b.disabled,
        })).filter(b => b.text);
        return { linkCount: links.length, buttonCount: buttons.length, links: links.slice(0, 10), buttons: buttons.slice(0, 10) };
      });
      visit.interactive = interactiveSummary;

      if (visit.finalUrl.includes("/login")) {
        visit.redirectedToLogin = true;
        record("03-app-exploration", "P0", `Authenticated user got bounced to /login from ${r.path}`, "Session may be broken or route requires extra check", join(stepDir, `${r.label}.png`), TARGET + r.path);
      }
      if (res.status() >= 400) {
        record("03-app-exploration", "P0", `${r.path} returned HTTP ${res.status()}`, "Page failed for authenticated user", join(stepDir, `${r.label}.png`), TARGET + r.path);
      }
      if (visit.hasErrorMsg) {
        record("03-app-exploration", "P1", `${r.path} surfaced an error message`, (bodyText.match(/(?:something went wrong|server error|unable to load|failed to fetch)[^.]*\.?/i) || [""])[0].slice(0, 200), join(stepDir, `${r.label}.png`), TARGET + r.path);
      }
    } catch (e) {
      visit.error = e.message;
      record("03-app-exploration", "P0", `${r.path} crashed`, e.message, null, TARGET + r.path);
    }
    result.visits.push(visit);
  }

  if (obs.consoleErrors.length > 0)
    record("03-app-exploration", "P1", `${obs.consoleErrors.length} console errors during /app tour`, obs.consoleErrors.slice(0, 5).join(" | "));
  if (obs.networkFailures.length > 0)
    record("03-app-exploration", "P1", `${obs.networkFailures.length} network failures during /app tour`, obs.networkFailures.slice(0, 5).join(" | "));

  await writeFile(join(stepDir, "result.json"), JSON.stringify(result, null, 2));
  await ctx.close();
  return result;
}

/**
 * Step 04: AI Policy Generator end-to-end CPA flow.
 */
async function step04PolicyGenerator(browser) {
  const stepDir = join(OUTDIR, "04-policy-generator");
  await mkdir(stepDir, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const obs = attachObservers(page);
  const result = { step: "04-policy-generator", observations: obs };

  try {
    const res = await page.goto(TARGET + "/tools/ai-policy-generator", { waitUntil: "networkidle", timeout: 45000 });
    result.httpStatus = res.status();
    await page.screenshot({ path: join(stepDir, "01-initial.png"), fullPage: true });

    // Pick CPA vertical
    const verticalCandidates = [
      'button:has-text("Accounting / Tax")',
      'button:has-text("Accounting")',
      'button:has-text("CPA")',
      'label:has-text("Accounting")',
    ];
    let pickedVia = null;
    for (const sel of verticalCandidates) {
      const c = page.locator(sel).first();
      if ((await c.count()) > 0) {
        await c.click({ timeout: 4000 }).catch(() => {});
        pickedVia = sel;
        break;
      }
    }
    result.pickedVerticalVia = pickedVia;
    await page.waitForTimeout(800);

    // Multi-step iteration
    for (let step = 0; step < 8; step++) {
      await page.waitForTimeout(1200);
      await page.screenshot({ path: join(stepDir, `step-${step + 2}.png`), fullPage: true });

      // Fill inputs
      const inputs = await page.locator('input:visible, textarea:visible').all();
      for (const inp of inputs) {
        try {
          const type = await inp.getAttribute("type").catch(() => "text");
          const name = (await inp.getAttribute("name").catch(() => "")) || "";
          const ph = (await inp.getAttribute("placeholder").catch(() => "")) || "";
          const lbl = (name + " " + ph).toLowerCase();
          const val = await inp.inputValue().catch(() => "");
          if (val) continue;

          if (type === "email" || lbl.includes("email")) await inp.fill(POLICY_EMAIL).catch(() => {});
          else if (lbl.includes("firm") || lbl.includes("company")) await inp.fill(TEST_FIRM).catch(() => {});
          else if (lbl.includes("name") && !lbl.includes("firm")) await inp.fill(TEST_NAME).catch(() => {});
          else if (lbl.includes("state")) await inp.fill("California").catch(() => {});
          else if (lbl.includes("size") || lbl.includes("how many") || lbl.includes("staff") || lbl.includes("clients")) await inp.fill("50").catch(() => {});
        } catch (e) {}
      }

      // If the early-access "Managing 50+ clients?" modal intercepts, dismiss it
      const closeBtn = await page.locator('button[aria-label*="close" i], button:has-text("Close"), button:has-text("Generate anyway"), button:has-text("Continue without")').first();
      if (await closeBtn.count() > 0) {
        await closeBtn.click({ force: true, timeout: 1500 }).catch(() => {});
        result.dismissedModal = true;
      }

      // Click first radio
      const radios = await page.locator('[role="radio"]:visible, input[type="radio"]:visible').all();
      if (radios.length > 0) {
        for (const r of radios.slice(0, 1)) {
          await r.click({ force: true, timeout: 1500 }).catch(() => {});
        }
      }

      // Try to advance
      const advanced = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button:not([disabled])'));
        const target = buttons.find((b) => /^(generate my|generate|continue|next|create|build|start)/i.test((b.textContent || "").trim()));
        if (target) {
          target.click();
          return (target.textContent || "").trim();
        }
        return null;
      });
      if (!advanced) {
        result.lastStep = step;
        break;
      }
      if (/^generate(\s+my)?(\s+policy)?/i.test(advanced)) {
        result.generateClicked = true;
        result.generateButtonText = advanced;
        break;
      }
    }

    // Wait for LLM generation
    await page.waitForTimeout(45000);
    await page.screenshot({ path: join(stepDir, "after-generate.png"), fullPage: true });

    // Look for download/PDF affordance
    const dlBtns = await page.locator('a:has-text("Download"), button:has-text("Download"), a[href*=".pdf"], a:has-text("PDF"), button:has-text("Get PDF"), a:has-text("Save as PDF")').all();
    result.downloadCount = dlBtns.length;

    if (dlBtns.length === 0) {
      await page.waitForTimeout(30000);
      await page.screenshot({ path: join(stepDir, "after-second-wait.png"), fullPage: true });
      const dl2 = await page.locator('a:has-text("Download"), button:has-text("Download"), a[href*=".pdf"], button:has-text("Save as PDF")').all();
      result.downloadCountAfter75s = dl2.length;
      if (dl2.length === 0) {
        record("04-policy-generator", "P1", "Policy generator never surfaced a download / PDF link", "Waited 75s after Generate click", join(stepDir, "after-second-wait.png"), TARGET + "/tools/ai-policy-generator");
      } else {
        // Try clicking it
        try {
          const dl = dl2[0];
          const href = await dl.getAttribute("href").catch(() => null);
          result.downloadHref = href;
          if (href && href.endsWith(".pdf")) {
            const status = await page.evaluate(async (h) => {
              try {
                const r = await fetch(h, { method: "HEAD" });
                return { status: r.status, contentType: r.headers.get("content-type"), contentLength: r.headers.get("content-length") };
              } catch (e) { return { error: String(e) }; }
            }, href.startsWith("http") ? href : new URL(href, TARGET).toString());
            result.pdfHeadCheck = status;
            if (status.status >= 400) {
              record("04-policy-generator", "P0", `PDF link returns HTTP ${status.status}`, `Download endpoint broken: ${href}`, join(stepDir, "after-generate.png"), TARGET + "/tools/ai-policy-generator");
            }
          }
        } catch (e) {
          result.downloadCheckError = e.message;
        }
      }
    } else {
      // Try clicking the first download link
      try {
        const dl = dlBtns[0];
        const href = await dl.getAttribute("href").catch(() => null);
        result.downloadHref = href;
        if (href && href.endsWith(".pdf")) {
          const status = await page.evaluate(async (h) => {
            try {
              const r = await fetch(h, { method: "HEAD" });
              return { status: r.status, contentType: r.headers.get("content-type"), contentLength: r.headers.get("content-length") };
            } catch (e) { return { error: String(e) }; }
          }, href.startsWith("http") ? href : new URL(href, TARGET).toString());
          result.pdfHeadCheck = status;
          if (status.status >= 400) {
            record("04-policy-generator", "P0", `PDF link returns HTTP ${status.status}`, `Download endpoint broken: ${href}`, join(stepDir, "after-generate.png"), TARGET + "/tools/ai-policy-generator");
          }
        }
      } catch (e) {
        result.downloadCheckError = e.message;
      }
    }

    // Capture body excerpt around any policy content
    const policyText = (await page.textContent("body")) || "";
    result.policyBodyLength = policyText.length;
    result.policyBodyExcerpt = policyText.slice(0, 600);

    if (obs.consoleErrors.length > 0)
      record("04-policy-generator", "P1", `${obs.consoleErrors.length} console errors during policy generation`, obs.consoleErrors.slice(0, 3).join(" | "));
    if (obs.networkFailures.length > 0)
      record("04-policy-generator", "P1", `${obs.networkFailures.length} network failures during policy generation`, obs.networkFailures.slice(0, 5).join(" | "));
  } catch (e) {
    result.error = e.message;
    record("04-policy-generator", "P0", "Policy generator crashed", e.message, null, TARGET + "/tools/ai-policy-generator");
  } finally {
    await writeFile(join(stepDir, "result.json"), JSON.stringify(result, null, 2));
    await ctx.close();
  }
  return result;
}

/**
 * Step 05: Demo workspace — nav links + a11y attrs.
 */
async function step05DemoWorkspace(browser) {
  const stepDir = join(OUTDIR, "05-demo-workspace");
  await mkdir(stepDir, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const obs = attachObservers(page);
  const result = { step: "05-demo-workspace", observations: obs, navTours: [] };

  try {
    const res = await page.goto(TARGET + "/demo/workspace", { waitUntil: "networkidle", timeout: 45000 });
    result.httpStatus = res.status();
    await page.screenshot({ path: join(stepDir, "01-initial.png"), fullPage: true });

    // Inventory all top-level nav links
    const navInventory = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="/demo/workspace"]')).map(a => ({
        href: a.getAttribute("href"),
        text: (a.textContent || "").trim().slice(0, 60),
        ariaLabel: a.getAttribute("aria-label"),
      }));
      return links.slice(0, 30);
    });
    result.navInventory = navInventory;

    // Tour each demo route
    const demoRoutes = [
      "/demo/workspace",
      "/demo/workspace/approval-queue",
      "/demo/workspace/clients",
    ];
    for (const route of demoRoutes) {
      const visit = { route };
      try {
        await page.goto(TARGET + route, { waitUntil: "networkidle", timeout: 30000 });
        await page.waitForTimeout(1500);
        const safeName = "tour" + route.replace(/\//g, "_");
        await page.screenshot({ path: join(stepDir, `${safeName}.png`), fullPage: true });
        const bodyText = (await page.textContent("body")) || "";
        visit.bodyLength = bodyText.length;
        visit.bodyExcerpt = bodyText.slice(0, 300);

        // Check that every interactive in this view has accessible name
        const a11yIssues = await page.evaluate(() => {
          const issues = [];
          // Buttons without text/aria-label
          document.querySelectorAll('button:not([aria-label]):not([aria-labelledby])').forEach((b) => {
            if (!(b.textContent || "").trim()) {
              issues.push({ tag: "button", html: (b.outerHTML || "").slice(0, 200), reason: "no text + no aria-label" });
            }
          });
          // Links without text/aria-label
          document.querySelectorAll('a:not([aria-label]):not([aria-labelledby])').forEach((a) => {
            if (!(a.textContent || "").trim()) {
              issues.push({ tag: "a", href: a.getAttribute("href"), html: (a.outerHTML || "").slice(0, 200), reason: "no text + no aria-label" });
            }
          });
          // Icon-only links/buttons (text length 1-2 chars only — often badge count text leaking through)
          document.querySelectorAll('a, button').forEach((el) => {
            const t = (el.textContent || "").trim();
            if (t.length > 0 && t.length <= 2 && !el.getAttribute("aria-label") && !el.getAttribute("aria-labelledby") && !el.getAttribute("title")) {
              issues.push({ tag: el.tagName.toLowerCase(), text: t, html: (el.outerHTML || "").slice(0, 200), reason: "short text without aria-label" });
            }
          });
          return issues.slice(0, 20);
        });
        visit.a11yIssues = a11yIssues;
        if (a11yIssues.length > 0) {
          record("05-demo-workspace", "P2", `Demo route ${route} has ${a11yIssues.length} interactives without accessible names`, JSON.stringify(a11yIssues.slice(0, 3)), join(stepDir, `${safeName}.png`), TARGET + route);
        }
      } catch (e) {
        visit.error = e.message;
      }
      result.navTours.push(visit);
    }

    // Trigger upgrade modal — click on any locked / Pro / Upgrade CTA
    await page.goto(TARGET + "/demo/workspace", { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(1000);
    const upgradeCandidates = [
      'button:has-text("Upgrade")',
      'a:has-text("Upgrade")',
      'button:has-text("Get full access")',
      '[data-locked]',
    ];
    let triggered = null;
    for (const sel of upgradeCandidates) {
      const c = page.locator(sel).first();
      if ((await c.count()) > 0) {
        await c.click({ timeout: 3000 }).catch(() => {});
        triggered = sel;
        await page.waitForTimeout(1500);
        await page.screenshot({ path: join(stepDir, "upgrade-modal.png"), fullPage: false });
        break;
      }
    }
    result.upgradeModalTriggered = triggered;

    if (obs.consoleErrors.length > 0)
      record("05-demo-workspace", "P2", `${obs.consoleErrors.length} console errors on demo workspace`, obs.consoleErrors.slice(0, 3).join(" | "));
  } catch (e) {
    result.error = e.message;
  } finally {
    await writeFile(join(stepDir, "result.json"), JSON.stringify(result, null, 2));
    await ctx.close();
  }
  return result;
}

/**
 * Step 06: Mobile (iPhone 13) — including authenticated /app.
 */
async function step06Mobile(browser, storageStatePath) {
  const stepDir = join(OUTDIR, "06-mobile");
  await mkdir(stepDir, { recursive: true });
  const result = { step: "06-mobile", visits: [] };

  const anonRoutes = ["/", "/pricing", "/workflow-audit", "/signup", "/demo/workspace"];
  for (const route of anonRoutes) {
    const ctx = await browser.newContext({ ...devices["iPhone 13"] });
    const page = await ctx.newPage();
    const obs = attachObservers(page);
    const visit = { route, auth: false, observations: obs };
    try {
      const res = await page.goto(TARGET + route, { waitUntil: "networkidle", timeout: 45000 });
      visit.httpStatus = res.status();
      await page.waitForTimeout(2500);
      const safeName = "anon" + route.replace(/\//g, "_");
      await page.screenshot({ path: join(stepDir, `${safeName}.png`), fullPage: true });

      const overflow = await page.evaluate(() => {
        const docW = document.documentElement.scrollWidth;
        const winW = window.innerWidth;
        return { docW, winW, hasOverflow: docW > winW + 2 };
      });
      visit.overflow = overflow;
      if (overflow.hasOverflow) {
        record("06-mobile", "P1", `Horizontal overflow on mobile ${route}`, `scrollWidth=${overflow.docW}, innerWidth=${overflow.winW}`, join(stepDir, `${safeName}.png`), TARGET + route);
      }

      const ctaSize = await page.evaluate(() => {
        const ctas = Array.from(document.querySelectorAll('a, button')).slice(0, 30);
        return ctas.map((el) => {
          const r = el.getBoundingClientRect();
          return { text: (el.textContent || "").trim().slice(0, 40), w: Math.round(r.width), h: Math.round(r.height) };
        }).filter((c) => c.text.length > 1 && c.h > 0);
      });
      visit.ctaSize = ctaSize;

      if (obs.consoleErrors.length > 0)
        record("06-mobile", "P2", `${obs.consoleErrors.length} console errors on mobile ${route}`, obs.consoleErrors.slice(0, 2).join(" | "));
    } catch (e) {
      visit.error = e.message;
    } finally {
      await ctx.close();
      result.visits.push(visit);
    }
  }

  // Authenticated mobile routes
  if (storageStatePath) {
    const authRoutes = ["/app", "/app/clients", "/app/settings"];
    for (const route of authRoutes) {
      const ctx = await browser.newContext({ ...devices["iPhone 13"], storageState: storageStatePath });
      const page = await ctx.newPage();
      const obs = attachObservers(page);
      const visit = { route, auth: true, observations: obs };
      try {
        const res = await page.goto(TARGET + route, { waitUntil: "networkidle", timeout: 45000 });
        visit.httpStatus = res.status();
        visit.finalUrl = page.url();
        await page.waitForTimeout(2500);
        const safeName = "auth" + route.replace(/\//g, "_");
        await page.screenshot({ path: join(stepDir, `${safeName}.png`), fullPage: true });

        if (visit.finalUrl.includes("/login")) {
          visit.redirectedToLogin = true;
        }

        const overflow = await page.evaluate(() => {
          const docW = document.documentElement.scrollWidth;
          const winW = window.innerWidth;
          return { docW, winW, hasOverflow: docW > winW + 2 };
        });
        visit.overflow = overflow;
        if (overflow.hasOverflow && !visit.redirectedToLogin) {
          record("06-mobile", "P1", `Horizontal overflow on authenticated mobile ${route}`, `scrollWidth=${overflow.docW}, innerWidth=${overflow.winW}`, join(stepDir, `${safeName}.png`), TARGET + route);
        }

        const navStructure = await page.evaluate(() => {
          const hamburger = document.querySelector('[aria-label*="menu" i], button[aria-expanded]');
          const sidebar = document.querySelector('aside, nav[aria-label*="primary" i]');
          return {
            hasHamburger: !!hamburger,
            hasSidebar: !!sidebar,
            sidebarVisible: sidebar ? window.getComputedStyle(sidebar).display !== "none" : false,
          };
        });
        visit.navStructure = navStructure;

        if (obs.consoleErrors.length > 0)
          record("06-mobile", "P2", `${obs.consoleErrors.length} console errors on authenticated mobile ${route}`, obs.consoleErrors.slice(0, 2).join(" | "));
      } catch (e) {
        visit.error = e.message;
      } finally {
        await ctx.close();
        result.visits.push(visit);
      }
    }
  } else {
    result.authMobileSkipped = "no storage state";
  }

  await writeFile(join(stepDir, "result.json"), JSON.stringify(result, null, 2));
  return result;
}

/**
 * Step 07: Founding/pricing visual + Stripe deep-link safety (capture URL, never complete).
 */
async function step07StripeDeepLink(browser, storageStatePath) {
  const stepDir = join(OUTDIR, "07-stripe-deeplink");
  await mkdir(stepDir, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, storageState: storageStatePath || undefined });
  const page = await ctx.newPage();
  const obs = attachObservers(page);
  const result = { step: "07-stripe-deeplink", observations: obs };

  try {
    // Founding deeplink visual
    await page.goto(TARGET + "/signup?plan=founding_member", { waitUntil: "networkidle", timeout: 45000 });
    await page.screenshot({ path: join(stepDir, "01-founding.png"), fullPage: false });
    const bodyText = (await page.textContent("body")) || "";
    result.foundingVisual = {
      hasMostPopular: /Most popular/i.test(bodyText),
      hasFoundingBadge: /Founding Member/i.test(bodyText),
      hasCounter: /of 50|0 of 50|spots? claimed|seats? remaining|spots? remaining/i.test(bodyText),
      hasPracticeTier: /on the Practice tier/i.test(bodyText),
      hasStripeButton: /[Cc]ontinue to [Ss]tripe|[Ll]ock in/i.test(bodyText),
    };

    // Probe /api/stripe/checkout anonymously vs authenticated
    const anonProbe = await page.evaluate(async () => {
      try {
        const r = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: "practice", founding: true }),
        });
        let body = null;
        try { body = await r.json(); } catch (e) {}
        return { status: r.status, body, location: r.headers.get("location") };
      } catch (e) { return { error: String(e) }; }
    });
    result.anonCheckoutProbe = anonProbe;

    // /pricing → click Solo $49 tier — capture the next URL but DO NOT complete
    await page.goto(TARGET + "/pricing", { waitUntil: "networkidle", timeout: 45000 });
    await page.screenshot({ path: join(stepDir, "02-pricing.png"), fullPage: false });

    // Find any tier CTA that flows to Stripe — capture the href / data-attrs
    const tierCtas = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('a, button')).slice(0, 30);
      return buttons.map((el) => ({
        tag: el.tagName.toLowerCase(),
        text: (el.textContent || "").trim().slice(0, 60),
        href: el.getAttribute("href"),
        formAction: el.getAttribute("formaction"),
        dataTier: el.getAttribute("data-tier"),
      })).filter((b) => /start|continue|solo|practice|firm|founding|claim|lock/i.test(b.text || ""));
    });
    result.tierCtas = tierCtas;

    if (obs.consoleErrors.length > 0)
      record("07-stripe-deeplink", "P2", `${obs.consoleErrors.length} console errors`, obs.consoleErrors.slice(0, 3).join(" | "));
  } catch (e) {
    result.error = e.message;
  } finally {
    await writeFile(join(stepDir, "result.json"), JSON.stringify(result, null, 2));
    await ctx.close();
  }
  return result;
}

/**
 * Step 08: Admin sanity (anonymous probes only — we don't have admin creds here).
 */
async function step08AdminSanity(browser) {
  const stepDir = join(OUTDIR, "08-admin");
  await mkdir(stepDir, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const obs = attachObservers(page);
  const result = { step: "08-admin", observations: obs, visits: [] };

  const adminRoutes = [
    { path: "/admin/leads", label: "admin-leads" },
    { path: "/admin/incidents", label: "admin-incidents" },
    { path: "/admin/health", label: "admin-health" },
    { path: "/admin/incidents/billing", label: "admin-incidents-billing" },
    { path: "/admin/incidents/stripe", label: "admin-incidents-stripe" },
    { path: "/admin/analytics", label: "admin-analytics" },
    { path: "/admin/analytics/email-engagement", label: "admin-email-engagement" },
    { path: "/admin/signups", label: "admin-signups" },
  ];

  for (const r of adminRoutes) {
    const v = { path: r.path };
    try {
      const res = await page.goto(ADMIN_TARGET + r.path, { waitUntil: "networkidle", timeout: 45000 });
      v.httpStatus = res.status();
      v.finalUrl = page.url();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: join(stepDir, `${r.label}.png`), fullPage: true });

      const bodyText = (await page.textContent("body")) || "";
      v.bodyLength = bodyText.length;
      v.isLogin = /sign in|log in|password|admin login/i.test(bodyText) && bodyText.length < 5000;
      v.has500 = /500|internal server error|something went wrong/i.test(bodyText);
      v.expiredFlag = /expired/i.test(v.finalUrl || "");

      if (res.status() >= 500) {
        record("08-admin", "P0", `${r.path} on admin.grindworks.ai returned ${res.status()}`, "Admin route 5xx for anonymous probe", join(stepDir, `${r.label}.png`), ADMIN_TARGET + r.path);
      } else if (res.status() === 404) {
        record("08-admin", "P1", `${r.path} returned 404 (admin route may not exist)`, "Confirm the route was created and exported", join(stepDir, `${r.label}.png`), ADMIN_TARGET + r.path);
      }
      v.expectedLoginGate = v.isLogin;
    } catch (e) {
      v.error = e.message;
    }
    result.visits.push(v);
  }

  // Capture the noisy /api/auth/session 404 issue that R2 P0-R2-3 flagged
  result.adminAuthSessionProbe = await page.evaluate(async () => {
    try {
      const r = await fetch("/api/auth/session");
      return { status: r.status, contentType: r.headers.get("content-type") };
    } catch (e) { return { error: String(e) }; }
  });

  await writeFile(join(stepDir, "result.json"), JSON.stringify(result, null, 2));
  await ctx.close();
  return result;
}

async function main() {
  await mkdir(OUTDIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  console.log(`\n=== Practiq Dogfood R3 — 2026-05-13 ===`);
  console.log(`Target: ${TARGET}`);
  console.log(`Admin:  ${ADMIN_TARGET}`);
  console.log(`Output: ${OUTDIR}\n`);

  const allResults = {};
  console.log("Step 01: R1 + R2 P0 fix verification");
  allResults.verification = await step01R1R2Verification(browser);
  console.log("Step 02: Signup → /app (full journey)");
  allResults.signupToApp = await step02SignupToApp(browser);
  const storagePath = allResults.signupToApp.storageSaved ? join(OUTDIR, "02-signup-to-app", "storage.json") : null;
  console.log("Step 03: Authenticated /app exploration");
  allResults.appExploration = await step03AppExploration(browser, storagePath);
  console.log("Step 04: Policy generator full generation");
  allResults.policyGen = await step04PolicyGenerator(browser);
  console.log("Step 05: Demo workspace nav + a11y");
  allResults.demoWorkspace = await step05DemoWorkspace(browser);
  console.log("Step 06: Mobile (anon + auth)");
  allResults.mobile = await step06Mobile(browser, storagePath);
  console.log("Step 07: Founding/pricing visual + Stripe deeplink safety");
  allResults.stripeDeeplink = await step07StripeDeepLink(browser, storagePath);
  console.log("Step 08: Admin sanity (anonymous probes)");
  allResults.admin = await step08AdminSanity(browser);

  await browser.close();

  await writeFile(join(OUTDIR, "all-results.json"), JSON.stringify(allResults, null, 2));
  await writeFile(join(OUTDIR, "raw-findings.json"), JSON.stringify(findings, null, 2));

  const counts = { P0: 0, P1: 0, P2: 0, P3: 0, INFO: 0 };
  for (const f of findings) counts[f.severity] = (counts[f.severity] || 0) + 1;
  console.log(`\n=== Findings Summary ===`);
  for (const [k, v] of Object.entries(counts)) console.log(`  ${k}: ${v}`);
  console.log(`\nTotal findings: ${findings.length}`);
  console.log(`Output dir: ${OUTDIR}`);
}

main().catch((err) => {
  console.error("Dogfood R3 crashed:", err);
  process.exit(2);
});
