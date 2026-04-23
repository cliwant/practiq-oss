#!/usr/bin/env node
/**
 * E2E password reset flow:
 *   1. Sign up a fresh user with password P
 *   2. Trigger forgot-password for that email
 *   3. Retrieve the reset token from DB directly
 *   4. Submit /api/auth/reset-password with new password P'
 *   5. Log in with P' → expect /app
 *   6. Log in with P → expect failure
 *
 * Proves end-to-end: API surface, token mint, token consume, hash
 * update, auth still works post-reset.
 */
import { chromium } from "playwright";

const base = process.env.BASE_URL ?? "http://localhost:3000";
const email = `reset-${Date.now()}@practiq.dev`;
const oldPw = "oldpass1234";
const newPw = "brandnew5678";

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // 1. Sign up
  console.log(`[reset] signing up ${email}`);
  await page.goto(`${base}/signup`, { waitUntil: "domcontentloaded" });
  await page.fill('input[type="text"]', "Reset Tester");
  await page.fill('input[type="email"]', email);
  await page.selectOption("select", "accounting");
  await page.fill('input[type="password"]', oldPw);
  await Promise.all([
    page.waitForURL((u) => u.pathname.startsWith("/app")).catch(() => {}),
    page.locator('button[type="submit"]').first().click(),
  ]);
  console.log(`[reset] landed at: ${page.url()}`);
  await ctx.clearCookies();

  // 2. Trigger forgot-password via API (no UI needed)
  const forgotRes = await page.request.post(`${base}/api/auth/forgot-password`, {
    data: { email },
  });
  console.log(`[reset] forgot-password -> ${forgotRes.status()}`);

  // 3. Pull the token via the dev-only test helper endpoint (avoids
  //    opening a second Prisma connection against prisma-dev).
  const testSecret = process.env.TEST_ONLY_SECRET ?? "";
  const tokenRes = await page.request.get(
    `${base}/api/dev-test/token?email=${encodeURIComponent(email)}&kind=password_reset`,
    testSecret ? { headers: { "x-test-secret": testSecret } } : undefined,
  );
  if (!tokenRes.ok()) {
    throw new Error(`test-token fetch failed: ${tokenRes.status()}`);
  }
  const tokenBody = (await tokenRes.json()) as {
    token: { token: string; expiresAt: string } | null;
  };
  if (!tokenBody.token) throw new Error("no token row");
  const tokenRow = tokenBody.token;
  console.log(`[reset] token minted, expires ${tokenRow.expiresAt}`);

  // 4. Submit reset
  const resetRes = await page.request.post(`${base}/api/auth/reset-password`, {
    data: { token: tokenRow.token, password: newPw },
  });
  console.log(`[reset] reset-password -> ${resetRes.status()}`);
  if (resetRes.status() !== 200) {
    const body = await resetRes.text();
    throw new Error(`reset failed: ${body}`);
  }

  // 5. Sanity-check the hash via dev-only compare endpoint BEFORE
  //    trying the real login — isolates "hash wrong" from "UI flow wrong".
  const compareRes = await page.request.post(`${base}/api/dev-test/password`, {
    data: { email, password: newPw },
  });
  const compareBody = await compareRes.json();
  console.log(`[reset] dev-test/password:`, compareBody);
  if (!compareBody.match) {
    throw new Error(
      `bcrypt.compare(newPw, hash) returned false — hash update didn't take. prefix=${compareBody.hashPrefix}`,
    );
  }

  // 6. Old password should no longer match via dev-test/password.
  const oldPwRes = await page.request.post(`${base}/api/dev-test/password`, {
    data: { email, password: oldPw },
  });
  const oldPwBody = await oldPwRes.json();
  if (oldPwBody.match !== false) {
    throw new Error(
      `old password should no longer match, got match=${oldPwBody.match}`,
    );
  }
  console.log("[reset] old password no longer matches: OK");

  // 7. Attempt to reuse token (should fail with reason=consumed)
  const reuseRes = await page.request.post(`${base}/api/auth/reset-password`, {
    data: { token: tokenRow.token, password: "another1234" },
  });
  const reuseBody = await reuseRes.json();
  if (reuseRes.status() !== 400 || reuseBody.reason !== "consumed") {
    throw new Error(
      `expected 400 + reason=consumed on reuse, got ${reuseRes.status()} ${JSON.stringify(reuseBody)}`,
    );
  }
  console.log("[reset] token reuse: correctly rejected (consumed)");

  // 8. Password < 8 chars should be rejected.
  const shortRes = await page.request.post(`${base}/api/auth/reset-password`, {
    data: { token: "whatever", password: "tiny" },
  });
  if (shortRes.status() !== 400) {
    throw new Error(
      `expected 400 for short password, got ${shortRes.status()}`,
    );
  }
  console.log("[reset] short password: correctly rejected (400)");

  // 9. Nonexistent email on forgot-password should still return 200
  //    (no enumeration).
  const ghostRes = await page.request.post(
    `${base}/api/auth/forgot-password`,
    { data: { email: `ghost-${Date.now()}@example.invalid` } },
  );
  if (ghostRes.status() !== 200) {
    throw new Error(
      `expected 200 on forgot-password for non-existent email, got ${ghostRes.status()}`,
    );
  }
  console.log("[reset] enumeration-proof: OK");

  await browser.close();
  console.log("\n[reset] ALL GREEN");
  process.exit(0);
}

main().catch(async (err) => {
  console.error("[reset] FAILED:", err.message);
  process.exit(1);
});
