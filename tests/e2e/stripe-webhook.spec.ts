/**
 * Stripe webhook integration spec.
 *
 * Stripe CLI is NOT installed in CI / dev shells, so we sign the
 * webhook payload ourselves using `stripe.webhooks.generateTestHeaderString`
 * (which uses STRIPE_WEBHOOK_SECRET). The webhook endpoint runs the
 * normal signature check + invokes `confirmClaim` on
 * `checkout.session.completed` events whose metadata.is_founding === "true".
 *
 * What we cover:
 *  s01 — webhook rejects requests without a signature (400)
 *  s02 — webhook rejects requests with a bad signature (400)
 *  s03 — webhook accepts a properly-signed payload (200) and FOR a
 *        non-founding event leaves the FoundingClaim ledger untouched
 *  s04 — webhook accepts a founding event and flips the matching
 *        FoundingClaim from `pending` → `confirmed`
 *
 * The spec talks to Supabase Management API for ledger inspection, so
 * we don't need a Postgres connection in the test environment.
 *
 * Run:
 *   PRACTIQ_BASE_URL=https://practiq.dev \
 *     npx dotenv -o -e ../../.env.local -- \
 *     npx playwright test tests/e2e/stripe-webhook.spec.ts --reporter=list
 */
import { test, expect } from "@playwright/test";
import Stripe from "stripe";

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

interface StripeMockSession {
  id: string;
  metadata: Record<string, string>;
  // Stripe.Checkout.Session has many fields; we only stuff in what
  // the webhook handler actually reads.
  subscription: null; // null = no subscription branch in handler
  customer: null;
}

function buildEvent(session: StripeMockSession): Stripe.Event {
  // Cast through unknown — the test event isn't a "real" Stripe.Event
  // (it lacks half of Stripe's required fields) but the webhook handler
  // only reads `event.type` + `event.data.object.{id, metadata,
  // subscription, customer}`, so this is a sufficient stub.
  return {
    id: `evt_test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    object: "event",
    api_version: "2026-03-25",
    created: Math.floor(Date.now() / 1000),
    data: { object: session as unknown as Stripe.Checkout.Session },
    livemode: false,
    pending_webhooks: 0,
    request: { id: null, idempotency_key: null },
    type: "checkout.session.completed",
  } as unknown as Stripe.Event;
}

test.describe.configure({ mode: "serial" });

test.describe("Stripe webhook integration", () => {
  let webhookSecret: string;
  let supabaseToken: string;
  let stripe: Stripe;

  test.beforeAll(() => {
    const ws = process.env.STRIPE_WEBHOOK_SECRET;
    const sk = process.env.STRIPE_SECRET_KEY;
    const sb = process.env.SUPABASE_ACCESS_TOKEN;
    if (!ws || !sk || !sb) {
      throw new Error(
        "STRIPE_WEBHOOK_SECRET / STRIPE_SECRET_KEY / SUPABASE_ACCESS_TOKEN " +
          "all required. Run with `dotenv -o -e ../../.env.local -- ...`.",
      );
    }
    webhookSecret = ws;
    supabaseToken = sb;
    stripe = new Stripe(sk, { apiVersion: "2026-03-25.dahlia" });
  });

  test("s01 — webhook rejects request without signature header (400)", async ({ request }) => {
    const resp = await request.post(`${BASE_URL}/api/stripe/webhook`, {
      data: JSON.stringify({ type: "checkout.session.completed" }),
      headers: { "Content-Type": "application/json" },
    });
    expect(resp.status()).toBe(400);
  });

  test("s02 — webhook rejects request with bad signature (400)", async ({ request }) => {
    const payload = JSON.stringify({ type: "checkout.session.completed" });
    const resp = await request.post(`${BASE_URL}/api/stripe/webhook`, {
      data: payload,
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": "t=0,v1=deadbeef",
      },
    });
    expect(resp.status()).toBe(400);
  });

  test("s03 — webhook accepts properly-signed non-founding event (200) without touching ledger", async ({
    request,
  }) => {
    const sessionId = `cs_test_nonfounding_${Date.now()}`;
    const event = buildEvent({
      id: sessionId,
      metadata: { is_founding: "false", plan: "solo" },
      subscription: null,
      customer: null,
    });
    const payload = JSON.stringify(event);
    const sigHeader = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: webhookSecret,
    });

    const resp = await request.post(`${BASE_URL}/api/stripe/webhook`, {
      data: payload,
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": sigHeader,
      },
    });
    expect(resp.status()).toBe(200);

    // No FoundingClaim row should exist for this session id.
    const rows = (await supabaseQuery(
      supabaseToken,
      `SELECT id FROM practiq.founding_claims WHERE stripe_session_id = '${sessionId}';`,
    )) as Array<{ id: string }>;
    expect(rows).toHaveLength(0);
  });

  test("s04 — founding event flips FoundingClaim pending → confirmed", async ({
    request,
  }) => {
    const sessionId = `cs_test_founding_${Date.now()}`;

    // Pre-seed a `pending` FoundingClaim so the webhook has something
    // to confirm. In production this row is written by claimSlot()
    // inside /api/stripe/checkout right after the Stripe session is
    // created. We mimic that here.
    const claimId = `clm_test_${Date.now()}`;
    await supabaseQuery(
      supabaseToken,
      `INSERT INTO practiq.founding_claims (id, stripe_session_id, status, claimed_at)
       VALUES ('${claimId}', '${sessionId}', 'pending', now());`,
    );

    const event = buildEvent({
      id: sessionId,
      metadata: { is_founding: "true", plan: "practice" },
      subscription: null,
      customer: null,
    });
    const payload = JSON.stringify(event);
    const sigHeader = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: webhookSecret,
    });

    const resp = await request.post(`${BASE_URL}/api/stripe/webhook`, {
      data: payload,
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": sigHeader,
      },
    });
    expect(resp.status()).toBe(200);

    const rows = (await supabaseQuery(
      supabaseToken,
      `SELECT status, confirmed_at FROM practiq.founding_claims WHERE stripe_session_id = '${sessionId}';`,
    )) as Array<{ status: string; confirmed_at: string | null }>;
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("confirmed");
    expect(rows[0].confirmed_at).not.toBeNull();

    // Cleanup so reruns don't leave permanent test rows.
    await supabaseQuery(
      supabaseToken,
      `DELETE FROM practiq.founding_claims WHERE stripe_session_id = '${sessionId}';`,
    );
  });
});
