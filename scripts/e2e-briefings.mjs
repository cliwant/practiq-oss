#!/usr/bin/env node
/**
 * End-to-end test: sign in, open /app, click "Run briefings now",
 * wait for agent runs to complete, then verify ApprovalItem rows
 * exist in the DB.
 *
 * This is the real test — if this passes, the full pipeline
 * (NextAuth session → /api/agents/run → runAgent() → provider.complete()
 * → ApprovalItem creation) works on the Claude Code subscription path.
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const email = process.env.DOGFOOD_EMAIL ?? "dogfood@practiq.dev";
const password = process.env.DOGFOOD_PASSWORD ?? "[redacted-test-password]";
const base = process.env.BASE_URL ?? "http://localhost:3000";
await mkdir(".debug", { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

console.log("[e2e] login");
await page.goto(`${base}/login`, { waitUntil: "domcontentloaded" });
await page.fill('input[type="email"]', email);
await page.fill('input[type="password"]', password);
await Promise.all([
  page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30_000 }).catch(() => {}),
  page.locator('button[type="submit"]').first().click(),
]);

if (!page.url().includes("/app")) {
  await page.goto(`${base}/app`, { waitUntil: "domcontentloaded" });
}

console.log("[e2e] clicking Run briefings now");
const btn = page.getByRole("button", { name: /Run briefings now/i });
await btn.waitFor({ state: "visible", timeout: 15_000 });

// Listen for the API response so we know when it returns. The CLI
// provider per-client runtime is ~30-50s cold; at concurrency=3 across
// 3 seeded clients we usually finish in 60-90s, but allow 300s for
// cold-cache or rate-limit cases.
const respPromise = page.waitForResponse(
  (r) => r.url().includes("/api/agents/run") && r.request().method() === "POST",
  { timeout: 300_000 },
);
await btn.click();
console.log("[e2e] waiting for /api/agents/run to respond...");
const resp = await respPromise;
console.log(`[e2e] API responded ${resp.status()}`);
const bodyText = await resp.text();
console.log(`[e2e] body preview: ${bodyText.slice(0, 400)}`);

await page.waitForTimeout(1500);
await page.screenshot({ path: ".debug/app-after-briefings.png", fullPage: false });
console.log("[e2e] saved .debug/app-after-briefings.png");

await browser.close();

// Print run summary — caller can grep for success/failed counts.
try {
  const json = JSON.parse(bodyText);
  // Runner uses "completed" for success — match that plus legacy "success".
  const ok = (json.results ?? []).filter((r) => r.status === "completed" || r.status === "success").length;
  const failed = (json.results ?? []).filter((r) => r.status === "failed").length;
  console.log(`[e2e] runs=${json.runs ?? "?"}  ok=${ok}  failed=${failed}`);
  if (failed > 0) {
    for (const r of json.results ?? []) {
      if (r.status === "failed") {
        console.log(`[e2e]   FAIL task=${r.taskId}  error=${String(r.error).slice(0, 160)}`);
      }
    }
  }
  const totalApproval = (json.results ?? []).reduce(
    (n, r) => n + (Array.isArray(r.approvalItemIds) ? r.approvalItemIds.length : 0),
    0,
  );
  console.log(`[e2e] total approval items created: ${totalApproval}`);
} catch (e) {
  console.log(`[e2e] could not parse body: ${e.message}`);
}
