/**
 * /api/csp-report regression spec.
 *
 * The endpoint accepts CSP violation reports browsers POST when the
 * page's Content-Security-Policy-Report-Only header is violated. After
 * the 4/29 incident where novel-violation Slack pings flooded the
 * operator's channel (per-instance dedup + Report-Only volume), the
 * endpoint is now log-only with rate-limit + 400/429 boundary cases
 * still in place. This spec locks those behaviors in.
 *
 * Coverage:
 *   r01 — empty body returns 400
 *   r02 — invalid JSON returns 400
 *   r03 — JSON without csp-report key returns 400
 *   r04 — well-formed report returns 200 (and the response is just
 *         { ok: true }, no payload echo, no Slack signal)
 *   r05 — endpoint exists in the prod CSP header's report-uri so
 *         browsers actually POST here (sanity check on the wiring,
 *         not just on the endpoint itself).
 */
import { test, expect } from "@playwright/test";

const BASE_URL = process.env.PRACTIQ_BASE_URL ?? "https://practiq.dev";

test.describe("CSP report endpoint", () => {
  test("r01 — empty body returns 400", async ({ request }) => {
    const resp = await request.post(`${BASE_URL}/api/csp-report`, {
      data: "",
      headers: { "Content-Type": "application/json" },
    });
    expect(resp.status()).toBe(400);
  });

  test("r02 — invalid JSON returns 400", async ({ request }) => {
    const resp = await request.post(`${BASE_URL}/api/csp-report`, {
      data: "not valid json {",
      headers: { "Content-Type": "application/json" },
    });
    expect(resp.status()).toBe(400);
  });

  test("r03 — JSON without csp-report key returns 400", async ({ request }) => {
    const resp = await request.post(`${BASE_URL}/api/csp-report`, {
      data: JSON.stringify({ unrelated: true }),
      headers: { "Content-Type": "application/json" },
    });
    expect(resp.status()).toBe(400);
  });

  test("r04 — well-formed report returns 200 with minimal body", async ({
    request,
  }) => {
    const resp = await request.post(`${BASE_URL}/api/csp-report`, {
      data: JSON.stringify({
        "csp-report": {
          "document-uri": "https://practiq.dev/test-from-spec",
          "violated-directive": "script-src",
          "blocked-uri": "https://example.com/test.js",
        },
      }),
      headers: { "Content-Type": "application/json" },
    });
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body).toEqual({ ok: true });
  });

  test("r05 — production CSP header points to /api/csp-report", async ({
    request,
  }) => {
    const resp = await request.get(`${BASE_URL}/`);
    expect(resp.status()).toBe(200);
    const csp =
      resp.headers()["content-security-policy-report-only"] ??
      resp.headers()["content-security-policy"] ??
      "";
    expect(csp).toContain("report-uri /api/csp-report");
  });
});
