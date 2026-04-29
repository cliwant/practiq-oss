/**
 * /api/health regression spec.
 *
 * Covers the readiness probe:
 *   h01 — anonymous GET returns 200 + ok:true on a healthy production
 *   h02 — response shape includes checks.{db,stripe,anthropic,resend}
 *         with each having {ok, ms, detail?}
 *   h03 — db + stripe are required (ok flips to false if either fails);
 *         resend + anthropic are soft (ok:false there doesn't fail
 *         the overall probe)
 *   h04 — Cache-Control headers — default cacheable, ?fresh=1 no-store
 *   h05 — endpoint is anonymous (no auth, no secret needed) so external
 *         monitors can hit it
 */
import { test, expect } from "@playwright/test";

const BASE_URL = process.env.PRACTIQ_BASE_URL ?? "https://practiq.dev";

test.describe("/api/health readiness probe", () => {
  test("h01 — 200 + ok:true on healthy production", async ({ request }) => {
    const resp = await request.get(`${BASE_URL}/api/health`);
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.ok).toBe(true);
    expect(typeof body.checkedAt).toBe("string");
  });

  test("h02 — response shape includes all four checks", async ({ request }) => {
    const resp = await request.get(`${BASE_URL}/api/health`);
    const body = await resp.json();
    expect(body.checks).toBeDefined();
    for (const k of ["db", "stripe", "anthropic", "resend"] as const) {
      expect(body.checks[k]).toBeDefined();
      expect(typeof body.checks[k].ok).toBe("boolean");
      expect(typeof body.checks[k].ms).toBe("number");
    }
  });

  test("h03 — required checks (db + stripe) gate overall ok flag", async ({
    request,
  }) => {
    const resp = await request.get(`${BASE_URL}/api/health`);
    const body = await resp.json();
    if (body.checks.db.ok && body.checks.stripe.ok) {
      expect(body.ok).toBe(true);
    } else {
      expect(body.ok).toBe(false);
    }
  });

  test("h04 — default cacheable; ?fresh=1 no-store", async ({ request }) => {
    const cached = await request.get(`${BASE_URL}/api/health`);
    expect(cached.headers()["cache-control"] ?? "").toMatch(
      /max-age=\d+|s-maxage=\d+/,
    );
    const fresh = await request.get(`${BASE_URL}/api/health?fresh=1`);
    expect(fresh.headers()["cache-control"] ?? "").toContain("no-store");
  });

  test("h05 — endpoint is anonymous (external monitors can hit it)", async ({
    request,
  }) => {
    const resp = await request.get(`${BASE_URL}/api/health`, {
      headers: {
        // Intentionally NO auth header — should still work.
      },
    });
    // 200 (healthy) or 503 (unhealthy) — both are valid anonymous
    // responses. What we don't accept is 401/403.
    expect([200, 503]).toContain(resp.status());
  });
});
