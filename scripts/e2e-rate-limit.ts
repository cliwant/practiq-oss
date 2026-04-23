#!/usr/bin/env node
/**
 * E2E rate-limit enforcement. Fires N requests to /api/auth/signup
 * with intentionally-bad bodies (which would normally be 400s) and
 * asserts the Nth request flips to 429 with a Retry-After header.
 *
 * Running locally the signup namespace was reset on every dev restart
 * (in-memory store), so this test is self-contained per dev server
 * instance.
 */
import { request as pwRequest } from "playwright";

const base = process.env.BASE_URL ?? "http://localhost:3000";
const LIMIT = 5;

async function main() {
  const api = await pwRequest.newContext({
    extraHTTPHeaders: {
      // Use a unique IP-ish identity so this test doesn't collide with
      // whatever the dev server has been handling lately.
      "x-forwarded-for": `203.0.113.${Math.floor(Math.random() * 200) + 50}`,
    },
  });

  let blockedStatus = 0;
  let retryAfter: string | null = null;
  let successCount = 0;

  for (let i = 0; i < LIMIT + 2; i++) {
    const res = await api.post(`${base}/api/auth/signup`, {
      data: { email: "bad", password: "short" },
    });
    if (res.status() === 429) {
      blockedStatus = 429;
      retryAfter = res.headers()["retry-after"] ?? null;
      console.log(
        `[rl] request #${i + 1} → 429, retry-after=${retryAfter}`,
      );
      break;
    }
    successCount++;
    console.log(`[rl] request #${i + 1} → ${res.status()}`);
  }

  await api.dispose();

  if (blockedStatus !== 429) {
    throw new Error(
      `expected request #${LIMIT + 1} to be rate-limited, got status ${blockedStatus} after ${successCount} non-limited responses`,
    );
  }
  if (!retryAfter || Number(retryAfter) <= 0) {
    throw new Error(
      `429 response missing Retry-After header (got "${retryAfter}")`,
    );
  }
  if (successCount !== LIMIT) {
    throw new Error(
      `expected exactly ${LIMIT} requests before the block, got ${successCount}`,
    );
  }

  console.log("\n[rl] ALL GREEN — sliding window limits sigg-up to 5/hr/IP");
  process.exit(0);
}

main().catch((err) => {
  console.error("[rl] FAILED:", err.message);
  process.exit(1);
});
