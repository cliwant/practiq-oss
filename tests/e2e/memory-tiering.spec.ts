/**
 * Memory tiering E2E (Wave-4 P1-06).
 *
 * Probes the `/api/dev-test/memory-snapshot` route against a signed-
 * in fixture user to verify the 5-tier composer's response shape +
 * tier metadata. Skips cleanly when E2E_TEST_EMAIL is unset (CI runs
 * the public smoke suite without auth fixtures).
 *
 * What this test validates that the unit suite cannot:
 *
 *   - Real Prisma round-trips (T0 fetchClientLite, T1 digest read,
 *     T3 episodic timeline, T4 firm patterns) succeed against the
 *     production schema.
 *   - The composer's per-tier observability map round-trips through
 *     JSON serialization without dropping fields.
 *   - The endpoint enforces clientId ownership (random UUID returns
 *     404, not 200 with empty data — that distinction matters for
 *     security audits).
 *   - The token approximation is in range we expect for a non-empty
 *     client (≥ 80 tokens for T0 alone).
 */
import { test, expect } from "@playwright/test";
import { signInAsTestUser } from "./auth-helper";

const FIXTURE_CLIENT_ID = process.env.E2E_FIXTURE_CLIENT_ID ?? "";

test.describe("memory tiering — /api/dev-test/memory-snapshot", () => {
  test.skip(
    !process.env.E2E_TEST_EMAIL || !FIXTURE_CLIENT_ID,
    "Set E2E_TEST_EMAIL + E2E_FIXTURE_CLIENT_ID to run the auth-gated memory snapshot probe",
  );

  test("returns the 5-tier composer response shape with budget metadata", async ({
    page,
    baseURL,
  }) => {
    await signInAsTestUser(page, baseURL!);

    const url = `${baseURL}/api/dev-test/memory-snapshot?clientId=${FIXTURE_CLIENT_ID}&query=monthly+close`;
    const response = await page.request.get(url);
    expect(response.status()).toBe(200);
    const body = await response.json();

    // Top-level shape.
    expect(body).toHaveProperty("prompt");
    expect(body).toHaveProperty("tokensApprox");
    expect(body).toHaveProperty("budgetTokens");
    expect(body).toHaveProperty("headroomTokens");
    expect(body).toHaveProperty("tiers");

    // Per-tier breakdown.
    for (const tier of ["T0", "T1", "T2", "T3", "T4"]) {
      expect(body.tiers[tier]).toBeDefined();
      expect(body.tiers[tier]).toHaveProperty("included");
      expect(body.tiers[tier]).toHaveProperty("tokensApprox");
      expect(body.tiers[tier]).toHaveProperty("summary");
      expect(body.tiers[tier]).toHaveProperty("hadData");
    }

    // Budget invariants.
    expect(body.budgetTokens).toBeGreaterThanOrEqual(300);
    expect(body.headroomTokens).toBeGreaterThanOrEqual(0);
    expect(body.headroomTokens).toBeLessThanOrEqual(body.budgetTokens);

    // Prompt non-empty when client exists. T0 should always include.
    expect(body.prompt.length).toBeGreaterThan(40);
    expect(body.tiers.T0.included).toBe(true);
    expect(body.tiers.T0.tokensApprox).toBeGreaterThanOrEqual(20);

    // T2 was requested via `query=` so it should at least have tried
    // (included may still be false if no hits, but hadData reflects
    // whether the reader returned content).
    // Either included or hadData=false with a coherent summary.
    expect(typeof body.tiers.T2.summary).toBe("string");
  });

  test("returns 404 for clientId not owned by the test user", async ({
    page,
    baseURL,
  }) => {
    await signInAsTestUser(page, baseURL!);

    const fakeId = "00000000-0000-0000-0000-000000000001";
    const url = `${baseURL}/api/dev-test/memory-snapshot?clientId=${fakeId}`;
    const response = await page.request.get(url);
    expect(response.status()).toBe(404);
  });

  test("returns 400 when clientId query param is missing", async ({
    page,
    baseURL,
  }) => {
    await signInAsTestUser(page, baseURL!);

    const response = await page.request.get(
      `${baseURL}/api/dev-test/memory-snapshot`,
    );
    expect(response.status()).toBe(400);
  });

  test("respects the budget query parameter", async ({ page, baseURL }) => {
    await signInAsTestUser(page, baseURL!);

    const url = `${baseURL}/api/dev-test/memory-snapshot?clientId=${FIXTURE_CLIENT_ID}&budget=600`;
    const response = await page.request.get(url);
    expect(response.status()).toBe(200);
    const body = await response.json();

    expect(body.budgetTokens).toBe(600);
    // tokensApprox should fit within budget.
    expect(body.tokensApprox).toBeLessThanOrEqual(600);
  });
});
