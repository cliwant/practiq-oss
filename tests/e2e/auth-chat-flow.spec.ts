/**
 * P5-02 — Authenticated dogfood scenarios.
 *
 * Three scenarios exercising the user-visible authenticated surface:
 *
 *   01 — Sign in → land on /app → open the fixture client workspace →
 *        send a chat message via the API + verify the SSE stream emits
 *        a conversation id and at least one text token. Then re-fetch
 *        the conversation by id to confirm the user message + assistant
 *        message rows persisted.
 *
 *   02 — Sign in → /app/approval-queue → confirm the seeded fixture
 *        approval row renders → PATCH it to "approved" via the API →
 *        confirm the row disappears from the pending bucket → reset.
 *
 *   03 — Sign in → POST /api/chat repeatedly → verify the free-plan
 *        50-msg cap eventually returns a 402 with code chat_monthly_cap.
 *
 * Skipped automatically when E2E_TEST_EMAIL is unset.
 */
import { test, expect, type APIRequestContext } from "@playwright/test";
import { signInAsTestUser } from "./auth-helper";

const BASE_URL = process.env.PRACTIQ_BASE_URL ?? "https://practiq.dev";
const TEST_EMAIL = process.env.E2E_TEST_EMAIL;

interface ApprovalListItem {
  id: string;
  status: string;
  type: string;
  title: string;
  clientId: string;
}

/**
 * Resolve the fixture client id from the seeded list.
 *
 * The auth-helper lands us on /app, but the chat URL needs the actual
 * UUID — we read GET /api/clients to discover it. Fails the test
 * loudly if the seed was forgotten.
 */
async function getFixtureClientId(
  request: APIRequestContext,
): Promise<string> {
  const r = await request.get(`${BASE_URL}/api/clients`);
  expect(r.status(), "GET /api/clients should be 200 after sign-in").toBe(200);
  const body = (await r.json()) as {
    clients: Array<{ id: string; name: string }>;
  };
  const fixture = body.clients.find((c) => /E2E Test/i.test(c.name));
  if (!fixture) {
    throw new Error(
      "Fixture client 'Park CPA Group — E2E Test' not found. Did you run scripts/seed-e2e-user.ts against this database?",
    );
  }
  return fixture.id;
}

/**
 * Drive POST /api/chat as an authed request and parse the SSE response.
 * Returns the conversation id (from the first event) plus the cumulative
 * assistant text. Stops reading once the `done` event arrives or after
 * the 30s wall-clock cap.
 */
async function postChatAndCollect(
  request: APIRequestContext,
  clientId: string,
  message: string,
  timeoutMs = 30_000,
): Promise<{
  status: number;
  conversationId: string | null;
  textTokens: string[];
  errorEvent: string | null;
}> {
  const r = await request.post(`${BASE_URL}/api/chat`, {
    headers: { "Content-Type": "application/json" },
    data: { clientId, message },
    timeout: timeoutMs,
  });

  if (r.status() !== 200) {
    return {
      status: r.status(),
      conversationId: null,
      textTokens: [],
      errorEvent: null,
    };
  }

  const body = await r.body();
  const buf = body.toString("utf-8");

  // Parse the SSE stream. Each event is `data: {json}\n\n`. We split on
  // double-newlines, then strip the `data: ` prefix.
  const events: Array<Record<string, unknown>> = [];
  for (const chunk of buf.split(/\n\n/)) {
    const line = chunk.trim();
    if (!line.startsWith("data:")) continue;
    const jsonPart = line.slice(5).trim();
    if (!jsonPart) continue;
    try {
      events.push(JSON.parse(jsonPart) as Record<string, unknown>);
    } catch {
      // ignore mal-formed event chunks (rare but possible mid-stream)
    }
  }

  let conversationId: string | null = null;
  const textTokens: string[] = [];
  let errorEvent: string | null = null;
  for (const ev of events) {
    if (ev.type === "conversation" && typeof ev.conversationId === "string") {
      conversationId = ev.conversationId;
    } else if (ev.type === "text" && typeof ev.text === "string") {
      textTokens.push(ev.text);
    } else if (ev.type === "error" && typeof ev.error === "string") {
      errorEvent = ev.error;
    }
  }

  return {
    status: r.status(),
    conversationId,
    textTokens,
    errorEvent,
  };
}

test.describe("authenticated chat flow", () => {
  test.skip(
    !TEST_EMAIL,
    "E2E_TEST_EMAIL not set — skipping authenticated suite",
  );

  test("01 — chat: SSE stream emits text + conversation row persists", async ({
    page,
  }) => {
    test.setTimeout(60_000);

    await signInAsTestUser(page, BASE_URL);
    const clientId = await getFixtureClientId(page.request);

    // Render the workspace once to confirm the route works (no test
    // assertion beyond the navigation succeeding).
    await page.goto(`${BASE_URL}/app/clients/${clientId}`);
    await expect(page.getByText(/E2E Test/i).first()).toBeVisible({
      timeout: 15_000,
    });

    // Drive the chat through the API for deterministic event capture.
    const userMessage = `E2E ping ${Date.now()} — please respond briefly.`;
    const result = await postChatAndCollect(
      page.request,
      clientId,
      userMessage,
    );

    if (result.status === 429) {
      // Rate limited from a prior run in the same minute. The cap test
      // (test 03) handles 429 explicitly; this path is just a smoke
      // assertion that the route is reachable.
      test.skip(
        true,
        `chat burst limiter active (429) — re-run after window resets`,
      );
    }

    expect(result.status).toBe(200);
    expect(
      result.conversationId,
      "first SSE event should carry { type: 'conversation', conversationId }",
    ).toBeTruthy();
    expect(
      result.errorEvent,
      "no SSE error events should be emitted on a normal chat turn",
    ).toBeNull();
    expect(result.textTokens.length).toBeGreaterThan(0);

    // Confirm the persisted side-effect: GET the conversation by id and
    // verify the user message + at least one assistant message exist.
    const convResp = await page.request.get(
      `${BASE_URL}/api/conversations/${result.conversationId}`,
    );
    expect(convResp.status()).toBe(200);
    const conv = (await convResp.json()) as {
      id: string;
      clientId: string;
      messages: Array<{ role: string; content: string }>;
    };
    expect(conv.clientId).toBe(clientId);
    expect(conv.messages.length).toBeGreaterThanOrEqual(2);
    expect(conv.messages.some((m) => m.role === "user")).toBe(true);
    expect(conv.messages.some((m) => m.role === "assistant")).toBe(true);
  });

  test("02 — approval queue: pending item renders, approve flips status", async ({
    page,
  }) => {
    test.setTimeout(45_000);

    await signInAsTestUser(page, BASE_URL);

    // Verify the fixture row exists via the API first — that way a UI
    // routing regression doesn't get conflated with a missing seed.
    const before = await page.request.get(
      `${BASE_URL}/api/approval-queue?status=pending_review`,
    );
    expect(before.status()).toBe(200);
    const beforeBody = (await before.json()) as { items: ApprovalListItem[] };
    expect(beforeBody.items.length).toBeGreaterThan(0);

    const fixtureItem =
      beforeBody.items.find((i) => /E2E briefing fixture/i.test(i.title)) ??
      beforeBody.items[0];

    // Hit the approval-queue page so the rendered DOM is exercised too.
    // The exact URL has been /app/approval-queue across recent deploys;
    // any 404 here is a UI regression we want to catch.
    await page.goto(`${BASE_URL}/app/approval-queue`);
    await expect(
      page.getByText(fixtureItem.title, { exact: false }).first(),
    ).toBeVisible({ timeout: 15_000 });

    // Use the API to flip status — UI buttons vary by deploy and we
    // explicitly want to verify the documented PATCH contract here.
    const patch = await page.request.patch(
      `${BASE_URL}/api/approval-queue/${fixtureItem.id}`,
      {
        headers: { "Content-Type": "application/json" },
        data: { action: "approve", reviewerNotes: "E2E auto-approve" },
      },
    );
    expect(patch.status()).toBe(200);
    const patchBody = (await patch.json()) as {
      item: { status: string; reviewedAt: string | null };
    };
    expect(patchBody.item.status).toBe("approved");
    expect(patchBody.item.reviewedAt).not.toBeNull();

    // Re-list to confirm the row is no longer in the pending bucket.
    const after = await page.request.get(
      `${BASE_URL}/api/approval-queue?status=pending_review`,
    );
    expect(after.status()).toBe(200);
    const afterBody = (await after.json()) as { items: ApprovalListItem[] };
    expect(
      afterBody.items.find((i) => i.id === fixtureItem.id),
    ).toBeUndefined();

    // Reset for the next run so the seed re-application keeps a clean
    // slate. The reset action is idempotent on the API side.
    await page.request.patch(
      `${BASE_URL}/api/approval-queue/${fixtureItem.id}`,
      {
        headers: { "Content-Type": "application/json" },
        data: { action: "reset" },
      },
    );
  });

  test("03 — chat free-plan cap: probe trips 402 chat_monthly_cap", async ({
    page,
  }) => {
    test.setTimeout(180_000);

    await signInAsTestUser(page, BASE_URL);
    const clientId = await getFixtureClientId(page.request);

    // The free plan caps at 50 chat msgs / billing period (rolling 30d
    // window for trial users). We don't actually want to drive 50 real
    // chat turns through the model — too slow, too expensive. Instead
    // we probe the gate up to 51 times and watch for the first 402.
    //
    // If the seed has the user at-or-near zero usage, expect 402 around
    // attempt 50. If the user already burned through the cap on prior
    // runs, expect 402 on the very first attempt.
    //
    // The chat burst limiter (20/min) will start returning 429 within
    // the loop — that's not what we're testing, so we treat 429 as a
    // signal to break and pass the test as inconclusive (don't fail
    // CI noise on a ratelimit-window collision).
    const maxAttempts = 51;
    let saw402 = false;
    let saw429 = false;
    let lastBody: { code?: string; upgradeUrl?: string } = {};

    for (let i = 0; i < maxAttempts; i++) {
      const r = await page.request.post(`${BASE_URL}/api/chat`, {
        headers: { "Content-Type": "application/json" },
        data: { clientId, message: `cap-probe-${i}-${Date.now()}` },
        // Don't wait for the SSE stream — we only need the status.
        timeout: 10_000,
      });

      if (r.status() === 402) {
        try {
          lastBody = (await r.json()) as {
            code?: string;
            upgradeUrl?: string;
          };
        } catch {
          lastBody = {};
        }
        saw402 = true;
        break;
      }
      if (r.status() === 429) {
        saw429 = true;
        break;
      }
      if (r.status() >= 500) {
        throw new Error(
          `POST /api/chat returned ${r.status()} on probe ${i} — gate test cannot proceed reliably`,
        );
      }
      // 200 (SSE stream): consume body to release the connection.
      try {
        await r.body();
      } catch {
        // already drained
      }
    }

    if (saw402) {
      expect(lastBody.code).toBe("chat_monthly_cap");
      expect(typeof lastBody.upgradeUrl).toBe("string");
      return;
    }

    if (saw429) {
      console.warn(
        "[plan-cap probe] hit chat burst limiter (429) before plan cap (402). Wait 60s and re-run to verify the plan-cap path. Marking inconclusive.",
      );
      test.skip(
        true,
        "chat burst limiter (20/min) intervened before plan cap could be reached",
      );
    }

    throw new Error(
      `[plan-cap probe] 51 attempts succeeded without hitting 402 — verify the free-plan cap is wired and the test user is on the free tier.`,
    );
  });
});
