#!/usr/bin/env node
/**
 * Practiq Round-2 dogfood — 2026-05-13 (auth-walled surface area)
 *
 * Round 1 (commit 5e2784d) blocked at signup combobox. That's fixed in
 * 4c414ba. This run covers everything past the auth wall plus mobile
 * dashboard rendering, /admin sanity, and the Stripe deeplink.
 *
 * Posture: discovery only. Source-verify every finding before writing
 * it. No code fixes here.
 *
 * Output: tmp/dogfood-r2-2026-05-13/<step-N>/ with screenshots + JSON
 *         tmp/dogfood-r2-2026-05-13/raw-findings.json (machine readable)
 */
import { chromium, devices } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const TARGET = "https://practiq.dev";
const ADMIN_TARGET = "https://admin.grindworks.ai";
const OUTDIR = join("tmp", "dogfood-r2-2026-05-13");
const TEST_EMAIL = `seungdo+dogfood-r2-2026-05-13@grindworks.ai`;
const TEST_PASSWORD = `DogfoodR2-2026!Strong#`;
const TEST_NAME = "Seungdo R2";
const TEST_FIRM = "Park Boutique CPA R2";

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
 * Step 01: Round-1 P0 verification — confirm fixes still live in prod
 * by reading the live HTML + page chunks.
 */
async function step01R1Verification(browser) {
  const stepDir = join(OUTDIR, "01-r1-verification");
  await mkdir(stepDir, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  attachObservers(page);
  const result = { step: "01-r1-verification", checks: {} };

  try {
    // Check 1: Pricing — "$149" anchor + "Most popular" badge + "Practice tier" wording
    await page.goto(TARGET + "/pricing", { waitUntil: "networkidle", timeout: 45000 });
    const pricingText = (await page.textContent("body")) || "";
    result.checks.pricing = {
      has149Anchor: /\$149/.test(pricingText),
      hasMostPopular: /Most popular/i.test(pricingText),
      hasPracticeTier: /Practice tier|Practice \(Founding/i.test(pricingText),
      hasFifty: /50% off/i.test(pricingText),
    };
    await page.screenshot({ path: join(stepDir, "pricing.png"), fullPage: false });
    if (!result.checks.pricing.has149Anchor)
      record("01-r1-verification", "P0", "R1 P0-1 regressed: $149 anchor missing on /pricing", "Verify pricing tier labels", join(stepDir, "pricing.png"), TARGET + "/pricing");
    if (!result.checks.pricing.hasMostPopular)
      record("01-r1-verification", "P0", "R1 P1-1 regressed: 'Most popular' badge missing", "Practice tier needs the ribbon", join(stepDir, "pricing.png"), TARGET + "/pricing");

    // Check 2: Founding deeplink — should render "on the Practice tier" not "on Practice"
    await page.goto(TARGET + "/signup?plan=founding_member", { waitUntil: "networkidle", timeout: 45000 });
    const founderText = (await page.textContent("body")) || "";
    result.checks.foundingDeeplink = {
      hasPracticeTier: /on the Practice tier/i.test(founderText),
      hasOnPracticeBare: / on Practice(?!\s*tier)/i.test(founderText),
      hasFoundingBadge: /founding/i.test(founderText),
      has50Off: /50% off/i.test(founderText),
    };
    await page.screenshot({ path: join(stepDir, "founding-deeplink.png"), fullPage: false });
    if (!result.checks.foundingDeeplink.hasPracticeTier)
      record("01-r1-verification", "P0", "R1 P0-2 regressed: founding pill missing 'Practice tier' wording", "Check signup ?plan=founding_member layout", join(stepDir, "founding-deeplink.png"), TARGET + "/signup?plan=founding_member");
    if (result.checks.foundingDeeplink.hasOnPracticeBare)
      record("01-r1-verification", "P0", "R1 P0-2 regressed: 'on Practice' (bare, no 'tier') still in copy", "Inspect founding deeplink — typo-look returned", join(stepDir, "founding-deeplink.png"), TARGET + "/signup?plan=founding_member");

    // Check 3: PPractiq scrape — landing page nav should NOT scrape as "PPractiq"
    await page.goto(TARGET + "/", { waitUntil: "networkidle", timeout: 45000 });
    const landingText = (await page.textContent("body")) || "";
    result.checks.scrape = {
      ppractiqCount: (landingText.match(/PPractiq/g) || []).length,
      practiqCount: (landingText.match(/(?<!P)Practiq/g) || []).length,
    };
    if (result.checks.scrape.ppractiqCount > 0)
      record("01-r1-verification", "P0", `R1 P2-1 regressed: "PPractiq" appears ${result.checks.scrape.ppractiqCount}x in scraped body`, "Brand mark aria-hidden lost", join(stepDir, "pricing.png"), TARGET + "/");

    // Check 4: workflow-audit subject line — verify source has word-boundary trim
    // (We can't easily test the email subject without firing a real audit;
    //  we'll just verify the source pattern is in place by checking that the
    //  generate route module is reachable + 405-rejects GET.)
    const auditApiRes = await page.evaluate(async () => {
      try {
        const r = await fetch("/api/workflow-audit/generate", { method: "GET" });
        return { status: r.status, ok: r.ok };
      } catch (e) {
        return { error: String(e) };
      }
    });
    result.checks.workflowAuditEndpoint = auditApiRes;
  } catch (e) {
    result.error = e.message;
  } finally {
    await writeFile(join(stepDir, "result.json"), JSON.stringify(result, null, 2));
    await ctx.close();
  }
  return result;
}

/**
 * Step 02: Signup → auto-login → /app.
 * Now that the combobox surfaces inline error, the form should
 * actually advance. We sign up a NEW user and ride the session
 * cookie into /app.
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

    // Fill the form using the field IDs from the source
    await page.fill("#signup-name", TEST_NAME);
    await page.fill("#signup-email", TEST_EMAIL);
    // The select is a real <select>, so selectOption is the right primitive
    await page.selectOption("#signup-vertical", "accounting");

    // Find password input (probably #signup-password)
    const pwInput = page.locator('input[type="password"]').first();
    await pwInput.fill(TEST_PASSWORD);

    await page.screenshot({ path: join(stepDir, "02-filled.png"), fullPage: false });

    // Submit
    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click({ timeout: 5000 });

    // Wait for navigation
    await page.waitForURL((url) => url.toString().includes("/app") || url.toString().includes("/welcome") || url.toString().includes("/login"), {
      timeout: 30000,
    }).catch(() => {});

    await page.waitForTimeout(2500);
    result.urlAfterSubmit = page.url();
    await page.screenshot({ path: join(stepDir, "03-after-submit.png"), fullPage: true });

    if (page.url().includes("/app")) {
      result.signupSuccessful = true;
      // Save storage state — used by mobile step + admin step
      await ctx.storageState({ path: join(stepDir, "storage.json") });
      result.storageSaved = true;

      // Capture /app home page details
      const heading = await page.locator("h1, h2").first().textContent().catch(() => "");
      result.appHomeHeading = (heading || "").slice(0, 150);
      const bodyText = (await page.textContent("body")) || "";
      result.appHomeKeywords = {
        hasGreeting: /welcome|good (morning|afternoon|evening)|hi /i.test(bodyText),
        hasSampleClient: /sample|example|demo client/i.test(bodyText),
        hasOnboardingChecklist: /onboarding|getting started|checklist|complete (your )?profile/i.test(bodyText),
      };
    } else {
      result.signupSuccessful = false;
      // Check error message
      const err = await page.locator('[role="alert"], .text-red-400, .text-red-300').first().textContent().catch(() => "");
      result.signupError = (err || "").slice(0, 300);
      record("02-signup-to-app", "P0", "Signup did not reach /app", `URL: ${page.url()}, error: ${result.signupError}`, join(stepDir, "03-after-submit.png"), TARGET + "/signup");
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
 * Step 03: Authenticated /app — explore tabs (clients, tasks, workflows, settings).
 * Uses storage state from step 02.
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

      // Detect empty states / "coming soon" stubs
      visit.empty = /no clients|create your first|nothing yet|empty|coming soon|under construction|not available/i.test(bodyText);
      visit.hasErrorMsg = /something went wrong|server error|500|unable to load/i.test(bodyText);
      // Detect if route silently redirected to login
      if (visit.finalUrl.includes("/login")) {
        visit.redirectedToLogin = true;
        record("03-app-exploration", "P0", `Authenticated user got bounced to /login from ${r.path}`, "Session may be broken or route requires extra check", join(stepDir, `${r.label}.png`), TARGET + r.path);
      }
      if (res.status() >= 400) {
        record("03-app-exploration", "P0", `${r.path} returned HTTP ${res.status()}`, "Page failed for authenticated user", join(stepDir, `${r.label}.png`), TARGET + r.path);
      }
      if (visit.hasErrorMsg) {
        record("03-app-exploration", "P1", `${r.path} surfaced an error message`, (bodyText.match(/(?:something went wrong|server error|unable to load)[^.]*\./i) || [""])[0].slice(0, 200), join(stepDir, `${r.label}.png`), TARGET + r.path);
      }
    } catch (e) {
      visit.error = e.message;
      record("03-app-exploration", "P0", `${r.path} crashed`, e.message, null, TARGET + r.path);
    }
    result.visits.push(visit);
  }

  // Console / network errors after the full tour
  if (obs.consoleErrors.length > 0)
    record("03-app-exploration", "P1", `${obs.consoleErrors.length} console errors during /app tour`, obs.consoleErrors.slice(0, 5).join(" | "));
  if (obs.networkFailures.length > 0)
    record("03-app-exploration", "P1", `${obs.networkFailures.length} network failures during /app tour`, obs.networkFailures.slice(0, 5).join(" | "));

  await writeFile(join(stepDir, "result.json"), JSON.stringify(result, null, 2));
  await ctx.close();
  return result;
}

/**
 * Step 04: Policy Generator full generation — actually run an
 * end-to-end CPA-vertical generation.
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

    // The tool is multi-step. Step 1: vertical pick.
    // Look for the visible CPA option button/card
    const cpaCandidates = [
      'button:has-text("CPA")',
      'label:has-text("CPA")',
      '[role="radio"]:has-text("CPA")',
      'button:has-text("Accounting")',
      'button:has-text("Accounting / Tax")',
    ];
    let pickedVertical = false;
    for (const sel of cpaCandidates) {
      const c = page.locator(sel).first();
      if ((await c.count()) > 0) {
        await c.click({ timeout: 4000 }).catch(() => {});
        pickedVertical = sel;
        break;
      }
    }
    result.pickedVerticalVia = pickedVertical;

    // Advance to next step (Continue / Next button)
    for (let step = 0; step < 6; step++) {
      await page.waitForTimeout(1200);
      await page.screenshot({ path: join(stepDir, `step-${step + 2}.png`), fullPage: true });

      // Fill any visible inputs (email, firm name, states, etc)
      const inputs = await page.locator("input:visible, textarea:visible").all();
      for (const inp of inputs) {
        try {
          const type = await inp.getAttribute("type").catch(() => "text");
          const name = (await inp.getAttribute("name").catch(() => "")) || "";
          const ph = (await inp.getAttribute("placeholder").catch(() => "")) || "";
          const hint = (name + " " + ph).toLowerCase();
          const val = await inp.inputValue().catch(() => "");
          if (val) continue; // skip already filled

          if (type === "email" || hint.includes("email")) {
            await inp.fill(TEST_EMAIL).catch(() => {});
          } else if (hint.includes("firm") || hint.includes("company")) {
            await inp.fill(TEST_FIRM).catch(() => {});
          } else if (hint.includes("name") && !hint.includes("firm")) {
            await inp.fill(TEST_NAME).catch(() => {});
          } else if (hint.includes("state")) {
            await inp.fill("California").catch(() => {});
          } else if (hint.includes("size") || hint.includes("how many") || hint.includes("staff")) {
            await inp.fill("6").catch(() => {});
          }
        } catch (e) {}
      }

      // Click any visible checkbox/radio that hasn't been picked
      const radios = await page.locator('[role="radio"]:visible, input[type="radio"]:visible').all();
      if (radios.length > 0) {
        for (const r of radios.slice(0, 1)) {
          await r.click({ force: true, timeout: 1500 }).catch(() => {});
        }
      }

      // Try to find Generate / Continue / Next
      const advanced = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button:not([disabled])'));
        const target = buttons.find((b) => /^(generate|continue|next|create|build)/i.test((b.textContent || "").trim()));
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
      if (/generate/i.test(advanced)) {
        result.generateClicked = true;
        break;
      }
    }

    // Wait for generation (LLM call)
    await page.waitForTimeout(30000);
    await page.screenshot({ path: join(stepDir, "after-generate.png"), fullPage: true });

    // Look for download / PDF link
    const dlBtns = await page.locator('a:has-text("Download"), button:has-text("Download"), a[href*=".pdf"], a:has-text("PDF")').all();
    result.downloadCount = dlBtns.length;

    if (dlBtns.length === 0) {
      // Wait more — LLM may be slow
      await page.waitForTimeout(30000);
      await page.screenshot({ path: join(stepDir, "after-second-wait.png"), fullPage: true });
      const dl2 = await page.locator('a:has-text("Download"), button:has-text("Download"), a[href*=".pdf"]').all();
      result.downloadCountAfter60s = dl2.length;
      if (dl2.length === 0) {
        record("04-policy-generator", "P1", "Policy generator never surfaced a download / PDF link", "Waited 60s after generate click", join(stepDir, "after-second-wait.png"), TARGET + "/tools/ai-policy-generator");
      }
    } else {
      // Try clicking the first download link
      try {
        const dl = dlBtns[0];
        const href = await dl.getAttribute("href").catch(() => null);
        result.downloadHref = href;
        if (href && href.endsWith(".pdf")) {
          // HEAD request to verify the PDF exists
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
 * Step 05: Mobile rendering — /app, /app/settings on iPhone 13 viewport
 * (authenticated). Plus /pricing, /workflow-audit, /tools/ai-policy-generator
 * on mobile (anonymous).
 */
async function step05Mobile(browser, storageStatePath) {
  const stepDir = join(OUTDIR, "05-mobile");
  await mkdir(stepDir, { recursive: true });
  const result = { step: "05-mobile", visits: [] };

  // Anonymous mobile routes
  const anonRoutes = ["/pricing", "/workflow-audit", "/tools/ai-policy-generator"];
  for (const route of anonRoutes) {
    const ctx = await browser.newContext({ ...devices["iPhone 13"] });
    const page = await ctx.newPage();
    const obs = attachObservers(page);
    const visit = { route, auth: false, observations: obs };
    try {
      const res = await page.goto(TARGET + route, { waitUntil: "networkidle", timeout: 45000 });
      visit.httpStatus = res.status();
      await page.waitForTimeout(2000);
      const safeName = "anon" + route.replace(/\//g, "_");
      await page.screenshot({ path: join(stepDir, `${safeName}.png`), fullPage: true });

      const overflow = await page.evaluate(() => {
        const docW = document.documentElement.scrollWidth;
        const winW = window.innerWidth;
        return { docW, winW, hasOverflow: docW > winW + 2 };
      });
      visit.overflow = overflow;
      if (overflow.hasOverflow) {
        record("05-mobile", "P1", `Horizontal overflow on mobile ${route}`, `scrollWidth=${overflow.docW}, innerWidth=${overflow.winW}`, join(stepDir, `${safeName}.png`), TARGET + route);
      }

      // Tap target check — measure first few CTAs
      const ctaSize = await page.evaluate(() => {
        const ctas = Array.from(document.querySelectorAll('a, button')).slice(0, 20);
        return ctas.map((el) => {
          const r = el.getBoundingClientRect();
          return {
            text: (el.textContent || "").trim().slice(0, 40),
            w: Math.round(r.width),
            h: Math.round(r.height),
          };
        }).filter((c) => c.text.length > 0 && c.h > 0);
      });
      visit.ctaSize = ctaSize;
      const tinyCTAs = ctaSize.filter((c) => c.h < 36 && c.w >= 40 && c.text.length > 2);
      if (tinyCTAs.length > 3) {
        record("05-mobile", "P2", `Mobile route ${route} has ${tinyCTAs.length} CTAs under 36px tall`, "WCAG target size minimum is 44x44px; iOS HIG is 44x44", join(stepDir, `${safeName}.png`), TARGET + route);
      }

      if (obs.consoleErrors.length > 0) {
        record("05-mobile", "P2", `${obs.consoleErrors.length} console errors on mobile ${route}`, obs.consoleErrors.slice(0, 2).join(" | "));
      }
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
        await page.waitForTimeout(2000);
        const safeName = "auth" + route.replace(/\//g, "_");
        await page.screenshot({ path: join(stepDir, `${safeName}.png`), fullPage: true });

        if (visit.finalUrl.includes("/login")) {
          visit.redirectedToLogin = true;
          // Not a finding — common pattern if mobile session storage failed
        }

        const overflow = await page.evaluate(() => {
          const docW = document.documentElement.scrollWidth;
          const winW = window.innerWidth;
          return { docW, winW, hasOverflow: docW > winW + 2 };
        });
        visit.overflow = overflow;
        if (overflow.hasOverflow && !visit.redirectedToLogin) {
          record("05-mobile", "P1", `Horizontal overflow on authenticated mobile ${route}`, `scrollWidth=${overflow.docW}, innerWidth=${overflow.winW}`, join(stepDir, `${safeName}.png`), TARGET + route);
        }

        // Check for sidebar collapse / hamburger nav on mobile
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

        if (obs.consoleErrors.length > 0) {
          record("05-mobile", "P2", `${obs.consoleErrors.length} console errors on authenticated mobile ${route}`, obs.consoleErrors.slice(0, 2).join(" | "));
        }
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
 * Step 06: Stripe checkout deeplink shape — /signup?plan=founding_member,
 * verify the visual + verify the next-step redirect target is shaped like
 * Stripe Checkout. STOP before completing payment.
 */
async function step06FoundingStripeShape(browser) {
  const stepDir = join(OUTDIR, "06-founding-stripe");
  await mkdir(stepDir, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const obs = attachObservers(page);
  const result = { step: "06-founding-stripe", observations: obs };

  try {
    await page.goto(TARGET + "/signup?plan=founding_member", { waitUntil: "networkidle", timeout: 45000 });
    await page.screenshot({ path: join(stepDir, "01-initial.png"), fullPage: false });

    // Inspect the founding pill structure
    const pillInfo = await page.evaluate(() => {
      // Look for elements containing "Founding Member"
      const all = Array.from(document.querySelectorAll("*"));
      const pill = all.find((el) => /founding member/i.test(el.textContent || "") && el.children.length < 10);
      if (!pill) return null;
      const rect = pill.getBoundingClientRect();
      const styles = window.getComputedStyle(pill);
      return {
        text: (pill.textContent || "").trim().slice(0, 300),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        border: styles.borderColor,
        background: styles.backgroundColor,
      };
    });
    result.pill = pillInfo;

    // Check that the founding counter renders (P1-9 fix)
    const counterText = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll("*"));
      const counter = all.find((el) => /of 50|seats? remaining|spots? remaining|spots? left/i.test(el.textContent || "") && el.children.length < 5);
      return counter ? (counter.textContent || "").trim().slice(0, 200) : null;
    });
    result.counterText = counterText;
    if (!counterText) {
      record("06-founding-stripe", "P2", "Founding counter not visible on deeplink", "P1-9 fix may have regressed or not loaded yet (60s edge cache)", join(stepDir, "01-initial.png"), TARGET + "/signup?plan=founding_member");
    }

    // Capture the planned redirect URL by inspecting fetch behavior
    // (without completing signup). We can't fire signup without a real
    // user/password; instead test that /api/stripe/checkout is reachable
    // (will 401 for anonymous — that's the expected guard).
    const stripeCheckoutShape = await page.evaluate(async () => {
      try {
        const r = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: "practice", founding: true }),
        });
        let body = null;
        try { body = await r.json(); } catch (e) {}
        return { status: r.status, body };
      } catch (e) {
        return { error: String(e) };
      }
    });
    result.stripeCheckoutEndpoint = stripeCheckoutShape;
    if (stripeCheckoutShape.status === 401) {
      // expected — anonymous probe rejected. Good guard.
    } else if (stripeCheckoutShape.status === 503) {
      record("06-founding-stripe", "P0", "Stripe checkout endpoint returns 503", "Stripe misconfigured in prod — founding signups will fall back to waitlist", null, TARGET + "/api/stripe/checkout");
    } else if (stripeCheckoutShape.status >= 500) {
      record("06-founding-stripe", "P0", `Stripe checkout endpoint returns ${stripeCheckoutShape.status}`, JSON.stringify(stripeCheckoutShape.body || {}), null, TARGET + "/api/stripe/checkout");
    }

    if (obs.consoleErrors.length > 0)
      record("06-founding-stripe", "P2", `${obs.consoleErrors.length} console errors on /signup?plan=founding_member`, obs.consoleErrors.slice(0, 3).join(" | "));
    if (obs.networkFailures.length > 0)
      record("06-founding-stripe", "P2", `${obs.networkFailures.length} network failures on /signup?plan=founding_member`, obs.networkFailures.slice(0, 3).join(" | "));
  } catch (e) {
    result.error = e.message;
  } finally {
    await writeFile(join(stepDir, "result.json"), JSON.stringify(result, null, 2));
    await ctx.close();
  }
  return result;
}

/**
 * Step 07: /admin sanity — admin.grindworks.ai/admin/leads and
 * /admin/analytics/email-engagement. These require operator session.
 * Anonymous probe should 401/redirect — we just record the gate.
 */
async function step07AdminSanity(browser) {
  const stepDir = join(OUTDIR, "07-admin");
  await mkdir(stepDir, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const obs = attachObservers(page);
  const result = { step: "07-admin", observations: obs, visits: [] };

  const adminRoutes = [
    { path: "/admin/leads", label: "admin-leads" },
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
      v.isLogin = /sign in|log in|password|admin login/i.test(bodyText) && bodyText.length < 3000;
      v.has500 = /500|internal server error|something went wrong/i.test(bodyText);

      if (res.status() >= 500) {
        record("07-admin", "P0", `${r.path} on admin.grindworks.ai returned ${res.status()}`, "Admin route 5xx for anonymous probe", join(stepDir, `${r.label}.png`), ADMIN_TARGET + r.path);
      }

      // If the route is at admin.grindworks.ai and surfaces a login page,
      // that's the expected guard; not a finding.
      // We CAN'T verify the test users from R1+R2 appear in the leads
      // table without operator credentials.
      v.expectedLoginGate = v.isLogin;
    } catch (e) {
      v.error = e.message;
    }
    result.visits.push(v);
  }

  await writeFile(join(stepDir, "result.json"), JSON.stringify(result, null, 2));
  await ctx.close();
  return result;
}

async function main() {
  await mkdir(OUTDIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  console.log(`\n=== Practiq Dogfood R2 — 2026-05-13 ===`);
  console.log(`Target: ${TARGET}`);
  console.log(`Admin:  ${ADMIN_TARGET}`);
  console.log(`Output: ${OUTDIR}\n`);

  const allResults = {};
  console.log("Step 01: Round-1 P0 fix verification");
  allResults.r1Verification = await step01R1Verification(browser);
  console.log("Step 02: Signup → /app");
  allResults.signupToApp = await step02SignupToApp(browser);
  const storagePath = allResults.signupToApp.storageSaved ? join(OUTDIR, "02-signup-to-app", "storage.json") : null;
  console.log("Step 03: Authenticated /app exploration");
  allResults.appExploration = await step03AppExploration(browser, storagePath);
  console.log("Step 04: Policy generator full generation");
  allResults.policyGen = await step04PolicyGenerator(browser);
  console.log("Step 05: Mobile rendering");
  allResults.mobile = await step05Mobile(browser, storagePath);
  console.log("Step 06: Founding Stripe deeplink shape");
  allResults.foundingStripe = await step06FoundingStripeShape(browser);
  console.log("Step 07: Admin sanity probes");
  allResults.admin = await step07AdminSanity(browser);

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
  console.error("Dogfood R2 crashed:", err);
  process.exit(2);
});
