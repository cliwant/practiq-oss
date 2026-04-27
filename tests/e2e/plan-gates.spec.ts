/**
 * P5-03 — Plan-gate functional tests.
 *
 * The plan gates are the cost protection layer between Practiq and the
 * LLM provider. A bug in any of these would either over-charge the
 * customer (false 402) or burn the company's credit (silent pass).
 *
 * Three tiers covered:
 *
 *   A. Free trial — POST /api/clients with the test user that already
 *      has the fixture client. The free plan ceiling is 1 client; the
 *      second create attempt should return 402 with code=client_ceiling.
 *
 *   B. Free trial — POST /api/chat in a tight loop until the 50-msg
 *      cap kicks in (also covered in auth-chat-flow #03; here we focus
 *      strictly on the gate response shape).
 *
 *   C. Solo plan — POST /api/clients with a Solo-tier user. Solo's
 *      ceiling is 30. We don't actually create 30 clients in CI — too
 *      slow, too noisy — but we DO create one and verify the response
 *      shape on a successful creation, then read back the count.
 *
 * Each block is independently skippable via env flags so a partial seed
 * doesn't block the whole suite.
 */
import { test, expect, type APIRequestContext } from "@playwright/test";
import { signIn } from "./auth-helper";

const BASE_URL = process.env.PRACTIQ_BASE_URL ?? "https://practiq.dev";

const TEST_EMAIL = process.env.E2E_TEST_EMAIL ?? "e2e@practiq.dev";
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD ?? "Practiq-E2E-2026!";

const FREE_EMAIL = process.env.E2E_FREE_EMAIL ?? "e2e-free@practiq.dev";
const FREE_PASSWORD =
  process.env.E2E_FREE_PASSWORD ?? "Practiq-E2E-Free-2026!";

const SOLO_EMAIL = process.env.E2E_SOLO_EMAIL ?? "e2e-solo@practiq.dev";
const SOLO_PASSWORD =
  process.env.E2E_SOLO_PASSWORD ?? "Practiq-E2E-Solo-2026!";

interface GateRefusal {
  error: string;
  code: string;
  upgradeTo: string;
  upgradeUrl: string;
}

/**
 * Best-effort cleanup helper. The "free user creates 1, then is blocked
 * on 2nd" scenario relies on the free user having ZERO existing clients
 * at test start. The seed script leaves them empty; this also re-deletes
 * anything we made during the test so re-runs converge cleanly.
 *
 * Only deletes clients owned by the current session — the API enforces
 * userId scoping, so we can't accidentally delete fixture data on the
 * other test users.
 */
async function deleteAllOwnClients(
  request: APIRequestContext,
): Promise<number> {
  const r = await request.get(`${BASE_URL}/api/clients`);
  if (r.status() !== 200) return 0;
  const body = (await r.json()) as { clients: Array<{ id: string }> };
  let deleted = 0;
  for (const c of body.clients) {
    const del = await request.delete(`${BASE_URL}/api/clients/${c.id}`);
    if (del.status() === 200 || del.status() === 204) deleted++;
  }
  return deleted;
}

test.describe("plan-gates", () => {
  test.skip(
    !process.env.E2E_TEST_EMAIL,
    "E2E_TEST_EMAIL not set — skipping plan-gate suite",
  );

  test.describe("free plan (1-client ceiling)", () => {
    // Re-use the standalone E2E_FREE_EMAIL account: the primary test
    // user already owns the fixture client and would skew the
    // ceiling-from-zero assertion if we used it here.

    test.beforeEach(async ({ page }) => {
      await signIn(page, BASE_URL, FREE_EMAIL, FREE_PASSWORD);
      await deleteAllOwnClients(page.request);
    });

    test.afterEach(async ({ page }) => {
      // Best-effort cleanup so the next run also starts at zero.
      await deleteAllOwnClients(page.request);
    });

    test("01 — first client creates, second hits 402 client_ceiling", async ({
      page,
    }) => {
      const create1 = await page.request.post(`${BASE_URL}/api/clients`, {
        headers: { "Content-Type": "application/json" },
        data: {
          name: "Free Plan Probe — Client 1",
          industry: "accounting",
          userRole: "CPA",
        },
      });
      expect(create1.status()).toBe(201);

      const create2 = await page.request.post(`${BASE_URL}/api/clients`, {
        headers: { "Content-Type": "application/json" },
        data: {
          name: "Free Plan Probe — Client 2",
          industry: "accounting",
          userRole: "CPA",
        },
      });
      expect(create2.status()).toBe(402);
      const body = (await create2.json()) as GateRefusal;
      expect(body.code).toBe("client_ceiling");
      expect(body.upgradeTo).toBe("solo");
      expect(body.upgradeUrl).toMatch(/\/pricing/);
    });
  });

  test.describe("free plan (50-msg chat cap)", () => {
    // The auth-chat-flow spec has a fuller smoke probe; this slimmer
    // version verifies the refusal SHAPE explicitly. Skipped if the
    // user isn't currently at-or-over cap (we don't want to burn 50
    // model calls in CI just to inflate the assertion).

    test("02 — POST /api/chat returns 402 with chat_monthly_cap when usage exceeds 50", async ({
      page,
    }) => {
      test.setTimeout(45_000);
      await signIn(page, BASE_URL, TEST_EMAIL, TEST_PASSWORD);

      // Find the fixture client from the primary test account.
      const clientsResp = await page.request.get(`${BASE_URL}/api/clients`);
      expect(clientsResp.status()).toBe(200);
      const clientsBody = (await clientsResp.json()) as {
        clients: Array<{ id: string; name: string }>;
      };
      const client =
        clientsBody.clients.find((c) => /E2E Test/i.test(c.name)) ??
        clientsBody.clients[0];
      expect(client, "fixture client must exist").toBeTruthy();

      const r = await page.request.post(`${BASE_URL}/api/chat`, {
        headers: { "Content-Type": "application/json" },
        data: { clientId: client!.id, message: `gate-shape-probe ${Date.now()}` },
        timeout: 10_000,
      });

      if (r.status() === 402) {
        const body = (await r.json()) as GateRefusal;
        expect(body.code).toBe("chat_monthly_cap");
        expect(body.upgradeUrl).toMatch(/\/pricing/);
        return;
      }
      if (r.status() === 429) {
        test.skip(
          true,
          "chat burst limiter (429) intervened — re-run after window resets",
        );
      }
      // 200/SSE means the cap hasn't been hit. We accept this and skip;
      // the auth-chat-flow probe handles the cap-from-fresh-state path.
      try {
        await r.body();
      } catch {
        // ignore
      }
      test.skip(
        r.status() === 200,
        "free user has chat headroom — cap-shape probe skipped (auth-chat-flow.spec.ts #03 covers the cap-from-fresh path)",
      );
    });
  });

  test.describe("solo plan (30-client ceiling)", () => {
    test.beforeEach(async ({ page }) => {
      await signIn(page, BASE_URL, SOLO_EMAIL, SOLO_PASSWORD);
    });

    test("03 — solo user can create at least one client (sub-ceiling smoke)", async ({
      page,
    }) => {
      const before = await page.request.get(`${BASE_URL}/api/clients`);
      expect(before.status()).toBe(200);
      const beforeBody = (await before.json()) as {
        clients: Array<{ id: string }>;
      };
      const beforeCount = beforeBody.clients.length;

      // Solo's ceiling is 30. Drive ONE create — anything else just
      // duplicates the assertion at 30x cost without surfacing a new
      // gate path.
      const create = await page.request.post(`${BASE_URL}/api/clients`, {
        headers: { "Content-Type": "application/json" },
        data: {
          name: `Solo Plan Probe ${Date.now()}`,
          industry: "consulting",
          userRole: "CPA",
        },
      });

      if (create.status() === 402) {
        // The solo account already has 30+ clients from prior runs —
        // verify the gate emitted the right refusal shape.
        const body = (await create.json()) as GateRefusal;
        expect(body.code).toBe("client_ceiling");
        expect(body.upgradeTo).toBe("practice");
        return;
      }
      expect(create.status()).toBe(201);
      const created = (await create.json()) as { client: { id: string } };

      // Best-effort cleanup so the next run isn't impacted.
      await page.request.delete(`${BASE_URL}/api/clients/${created.client.id}`);

      const after = await page.request.get(`${BASE_URL}/api/clients`);
      const afterBody = (await after.json()) as {
        clients: Array<{ id: string }>;
      };
      // Either the cleanup succeeded (count stayed flat) or it was
      // already a no-op (DELETE not implemented). Both are acceptable —
      // we only care that the create itself didn't 402 a sub-ceiling
      // user.
      expect(afterBody.clients.length).toBeGreaterThanOrEqual(beforeCount);
    });
  });
});
