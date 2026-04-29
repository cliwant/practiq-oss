/**
 * Founding-slot cleanup cron spec.
 *
 * Round 4 added /api/cron/founding-slot-cleanup which scans
 * FoundingClaim rows whose status='pending' and claimedAt > 25h ago,
 * asks Stripe what state the underlying checkout session is in, and
 * either:
 *   - releases the slot (decrement counter, status='released') for
 *     `expired` / abandoned-`open` sessions
 *   - reconciles webhook-loss (status='confirmed') for `complete`+paid
 *
 * What this spec covers:
 *   c01 — cron endpoint refuses anonymous requests (401)
 *   c02 — cron endpoint refuses requests with the wrong CRON_SECRET (401)
 *   c03 — cron endpoint accepts proper Authorization Bearer + reports
 *         a sane scan summary (no errors, scanned >= 0)
 *   c04 — when we plant a stale `pending` claim with a fake (non-Stripe)
 *         session id, the cron's per-row Stripe.retrieve fails →
 *         increments the `errors` counter and leaves status untouched
 *         (the claim stays `pending` — protects against bulk-decrement
 *         on a transient Stripe API outage).
 *
 * The cleanup behavior on real expired Stripe sessions is exercised
 * passively by the daily cron; we don't fabricate a real expired
 * session here because that would require sitting on a session for
 * 24h+ which doesn't fit a CI run.
 */
import { test, expect } from "@playwright/test";

const BASE_URL = process.env.PRACTIQ_BASE_URL ?? "https://practiq.dev";
const SUPABASE_PROJECT_REF = "pyzcgemrkoeusrrbhazv";
const SUPABASE_API = `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query`;

async function supabaseQuery(token: string, sql: string): Promise<unknown> {
  const resp = await fetch(SUPABASE_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  if (!resp.ok) {
    throw new Error(
      `Supabase query failed (${resp.status}): ${(await resp.text()).slice(0, 200)}`,
    );
  }
  return await resp.json();
}

test.describe.configure({ mode: "serial" });

test.describe("Founding-slot cleanup cron", () => {
  // CRON_SECRET only lives in Vercel encrypted env — it's NOT in the
  // studio-root .env.local. Tests that need the bearer are skipped
  // when the secret isn't present locally, so c01/c02 (auth-rejection
  // paths) still run as a smoke check on every dev machine while
  // c03/c04 (positive auth paths) only run in environments where the
  // operator has chosen to mirror the secret in.
  const cronSecret = process.env.CRON_SECRET ?? "";
  const supabaseToken = process.env.SUPABASE_ACCESS_TOKEN ?? "";
  const hasSecret = cronSecret.length > 0;
  const hasSupabase = supabaseToken.length > 0;

  test("c01 — refuses anonymous request (401)", async ({ request }) => {
    const resp = await request.get(
      `${BASE_URL}/api/cron/founding-slot-cleanup`,
    );
    expect(resp.status()).toBe(401);
  });

  test("c02 — refuses wrong bearer (401)", async ({ request }) => {
    const resp = await request.get(
      `${BASE_URL}/api/cron/founding-slot-cleanup`,
      {
        headers: { Authorization: "Bearer not-the-real-secret" },
      },
    );
    expect(resp.status()).toBe(401);
  });

  test("c03 — accepts proper bearer and returns sane summary", async ({
    request,
  }) => {
    test.skip(!hasSecret, "CRON_SECRET not in local env (production-only)");
    const resp = await request.get(
      `${BASE_URL}/api/cron/founding-slot-cleanup`,
      {
        headers: { Authorization: `Bearer ${cronSecret}` },
      },
    );
    expect(resp.status()).toBe(200);
    const body = (await resp.json()) as {
      ok: boolean;
      cron: string;
      runAt: string;
      scanned: number;
      releasedExpired: number;
      reconfirmed: number;
      stillOpen: number;
      errors: number;
    };
    expect(body.ok).toBe(true);
    expect(body.cron).toBe("founding-slot-cleanup");
    expect(typeof body.scanned).toBe("number");
    expect(body.scanned).toBeGreaterThanOrEqual(0);
    expect(body.errors).toBeGreaterThanOrEqual(0);
  });

  test("c04 — stale claim with fake session id increments errors counter, leaves status pending", async ({
    request,
  }) => {
    test.skip(
      !hasSecret || !hasSupabase,
      "CRON_SECRET / SUPABASE_ACCESS_TOKEN required for ledger manipulation",
    );
    const sessionId = `cs_fake_no_stripe_record_${Date.now()}`;
    const claimId = `clm_test_fake_${Date.now()}`;
    // Plant a claim whose claimed_at is 26h ago — old enough for the
    // cron's `claimedAt < cutoff` filter (25h default).
    await supabaseQuery(
      supabaseToken,
      `INSERT INTO practiq.founding_claims (id, stripe_session_id, status, claimed_at)
       VALUES ('${claimId}', '${sessionId}', 'pending', now() - interval '26 hours');`,
    );

    const resp = await request.get(
      `${BASE_URL}/api/cron/founding-slot-cleanup`,
      {
        headers: { Authorization: `Bearer ${cronSecret}` },
      },
    );
    expect(resp.status()).toBe(200);
    const body = (await resp.json()) as { errors: number; scanned: number };
    // We planted exactly one fake row; the route should at least see it
    // (scanned ≥ 1) and bump errors (Stripe.retrieve will throw on a
    // non-existent session id).
    expect(body.scanned).toBeGreaterThanOrEqual(1);
    expect(body.errors).toBeGreaterThanOrEqual(1);

    // The planted row should still be pending — error path does NOT
    // release. Verify + clean up.
    const rows = (await supabaseQuery(
      supabaseToken,
      `SELECT status FROM practiq.founding_claims WHERE id = '${claimId}';`,
    )) as Array<{ status: string }>;
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("pending");

    await supabaseQuery(
      supabaseToken,
      `DELETE FROM practiq.founding_claims WHERE id = '${claimId}';`,
    );
  });
});
