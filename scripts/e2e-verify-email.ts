#!/usr/bin/env node
/**
 * E2E email verification flow:
 *   1. Sign up a fresh user → session alive at /app, emailVerified: null
 *   2. POST /api/auth/resend-verification → ok + email minted
 *   3. Retrieve token via /api/dev-test/token → verify_email kind
 *   4. POST /api/auth/verify-email with token → ok
 *   5. Confirm emailVerified: <Date> on the user
 *   6. Reuse token → 200 alreadyVerified:true (friendly reply)
 *   7. Bad token → 400 with reason
 */
import { chromium } from "playwright";

const base = process.env.BASE_URL ?? "http://localhost:3000";
const email = `verify-${Date.now()}@practiq.dev`;
const pw = "verifyme1234";

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await ctx.newPage();

  // 1. Sign up
  console.log(`[verify] signing up ${email}`);
  await page.goto(`${base}/signup`, { waitUntil: "domcontentloaded" });
  await page.fill('input[type="text"]', "Verify Tester");
  await page.fill('input[type="email"]', email);
  await page.selectOption("select", "consulting");
  await page.fill('input[type="password"]', pw);
  await Promise.all([
    page.waitForURL((u) => u.pathname.startsWith("/app")).catch(() => {}),
    page.locator('button[type="submit"]').first().click(),
  ]);
  console.log(`[verify] landed at: ${page.url()}`);

  // Confirm user exists + unverified.
  const initial = await page.request.get(
    `${base}/api/dev-test/token?email=${encodeURIComponent(email)}&kind=verify_email`,
  );
  const initialBody = await initial.json();
  if (initialBody.emailVerified) {
    throw new Error("user should start with emailVerified=null");
  }
  console.log("[verify] signup ok, user emailVerified=null");

  // 2. Request a fresh verification email (requires authed session)
  const resendRes = await page.request.post(
    `${base}/api/auth/resend-verification`,
    {},
  );
  const resendBody = await resendRes.json();
  if (resendRes.status() !== 200 || !resendBody.ok) {
    throw new Error(
      `resend failed: ${resendRes.status()} ${JSON.stringify(resendBody)}`,
    );
  }
  console.log(`[verify] resend-verification -> ${resendRes.status()}`);

  // 3. Retrieve token
  const tokenRes = await page.request.get(
    `${base}/api/dev-test/token?email=${encodeURIComponent(email)}&kind=verify_email`,
  );
  const tokenBody = await tokenRes.json();
  if (!tokenBody.token) throw new Error("no verify_email token minted");
  console.log(
    `[verify] token minted, expires ${tokenBody.token.expiresAt}`,
  );

  // 4. Verify
  const verifyRes = await page.request.post(`${base}/api/auth/verify-email`, {
    data: { token: tokenBody.token.token },
  });
  const verifyBody = await verifyRes.json();
  if (verifyRes.status() !== 200 || !verifyBody.ok) {
    throw new Error(
      `verify failed: ${verifyRes.status()} ${JSON.stringify(verifyBody)}`,
    );
  }
  console.log("[verify] verify-email -> 200 ok");

  // 5. Confirm emailVerified is set (via dev-test/token which returns it)
  const afterRes = await page.request.get(
    `${base}/api/dev-test/token?email=${encodeURIComponent(email)}&kind=verify_email`,
  );
  const afterBody = await afterRes.json();
  if (!afterBody.emailVerified) {
    throw new Error("user.emailVerified not set after verify-email");
  }
  console.log(`[verify] emailVerified = ${afterBody.emailVerified}`);

  // 6. Reuse token — friendly alreadyVerified:true response
  const reuseRes = await page.request.post(`${base}/api/auth/verify-email`, {
    data: { token: tokenBody.token.token },
  });
  const reuseBody = await reuseRes.json();
  if (reuseRes.status() !== 200 || !reuseBody.alreadyVerified) {
    throw new Error(
      `expected 200 + alreadyVerified=true on reuse, got ${reuseRes.status()} ${JSON.stringify(reuseBody)}`,
    );
  }
  console.log("[verify] token reuse: friendly alreadyVerified:true");

  // 7. Bad token
  const badRes = await page.request.post(`${base}/api/auth/verify-email`, {
    data: { token: "definitely-not-real-xxxxxxxxxxxxx" },
  });
  const badBody = await badRes.json();
  if (badRes.status() !== 400 || !badBody.reason) {
    throw new Error(
      `expected 400 + reason on bad token, got ${badRes.status()} ${JSON.stringify(badBody)}`,
    );
  }
  console.log("[verify] bad token: correctly rejected (400)");

  await browser.close();
  console.log("\n[verify] ALL GREEN");
  process.exit(0);
}

main().catch((err) => {
  console.error("[verify] FAILED:", err.message);
  process.exit(1);
});
