/**
 * P5-04 — Pattern learner functional test.
 *
 * The pattern-learner is wired to fire after every approval action on
 * /api/approval-queue/[id] PATCH. Specifically, three same-shaped
 * approve actions on a given (clientIndustry, itemType, normalizedTitle)
 * triplet should:
 *
 *   1. Create one new AgentRule on the first approval (confidence 0.5,
 *      appliedCount 1).
 *   2. Reinforce the same rule on the second approval (+0.05).
 *   3. Reinforce again on the third (+0.05). After 3 approves the rule
 *      sits at confidence 0.6, appliedCount 3 — i.e. it crosses the
 *      threshold loadActiveRulesForPrompt expects (>= 0.6 + >= 2x
 *      applied).
 *
 * IMPORTANT: pattern learning is plan-gated. recordApprovalLearning()
 * skips for users without rbac=true (free / Solo). The fixture user is
 * on the free plan, so this spec creates the patterns through the
 * SOLO seeded user — but Solo *also* skips. We therefore need the
 * Practice/Firm test path. Since the seed only provisions free + Solo,
 * we ASSERT THE GATE BEHAVIOR: the test verifies that approving the
 * fixture row produces NO AgentRule for free-tier (the documented
 * skip path), then documents the Practice-tier path as a manual
 * follow-up.
 *
 * What we can verify without an upgraded fixture:
 *   - PATCH approve on the seeded fixture returns 200.
 *   - GET /api/agents/rules?clientId=... returns either an empty list
 *     (free-tier skip) OR the right rule shape if Practice/Firm has
 *     been provisioned externally.
 *
 * If a future seed adds a Practice user, set E2E_PRACTICE_EMAIL +
 * E2E_PRACTICE_PASSWORD and the spec will exercise the full
 * 3-approval reinforcement path.
 */
import { test, expect, type APIRequestContext } from "@playwright/test";
import { signIn } from "./auth-helper";

const BASE_URL = process.env.PRACTIQ_BASE_URL ?? "https://practiq.dev";
const TEST_EMAIL = process.env.E2E_TEST_EMAIL;
const PRACTICE_EMAIL = process.env.E2E_PRACTICE_EMAIL;
const PRACTICE_PASSWORD = process.env.E2E_PRACTICE_PASSWORD;

interface AgentRuleListItem {
  id: string;
  ruleType: string;
  confidence: number;
  appliedCount: number;
  condition: Record<string, unknown>;
  action: Record<string, unknown>;
}

interface ApprovalListItem {
  id: string;
  status: string;
  type: string;
  title: string;
  clientId: string;
}

/**
 * Fetch active AgentRule rows for the current user + clientId. The
 * underlying endpoint is /api/agents/rules?clientId=…; if it doesn't
 * exist yet, the test will treat any 404 as a "feature not yet wired"
 * skip rather than a hard failure.
 */
async function getRulesForClient(
  request: APIRequestContext,
  clientId: string,
): Promise<{ status: number; rules: AgentRuleListItem[] }> {
  const r = await request.get(
    `${BASE_URL}/api/agents/rules?clientId=${clientId}`,
  );
  if (r.status() === 404) {
    return { status: 404, rules: [] };
  }
  if (r.status() !== 200) {
    return { status: r.status(), rules: [] };
  }
  const body = (await r.json()) as
    | { rules: AgentRuleListItem[] }
    | AgentRuleListItem[];
  const rules = Array.isArray(body) ? body : (body.rules ?? []);
  return { status: 200, rules };
}

test.describe("pattern-learner", () => {
  test.skip(
    !TEST_EMAIL,
    "E2E_TEST_EMAIL not set — skipping pattern-learner suite",
  );

  test("01 — free-tier approve does NOT create an AgentRule (plan-skip path)", async ({
    page,
  }) => {
    test.setTimeout(45_000);

    await signIn(
      page,
      BASE_URL,
      TEST_EMAIL!,
      process.env.E2E_TEST_PASSWORD ?? "Practiq-E2E-2026!",
    );

    // Find the seeded fixture approval row.
    const list = await page.request.get(
      `${BASE_URL}/api/approval-queue?status=pending_review`,
    );
    expect(list.status()).toBe(200);
    const listBody = (await list.json()) as { items: ApprovalListItem[] };
    const fixture =
      listBody.items.find((i) => /E2E briefing fixture/i.test(i.title)) ??
      listBody.items[0];
    if (!fixture) {
      test.skip(true, "no pending approval items to drive the learner with");
      return;
    }

    const clientId = fixture.clientId;

    // Snapshot the rule count before. The endpoint may not be deployed
    // — treat 404 as "skip rule-side assertions".
    const rulesBeforeResp = await getRulesForClient(page.request, clientId);
    if (rulesBeforeResp.status === 404) {
      test.skip(
        true,
        "/api/agents/rules endpoint not deployed — pattern-learner read-side cannot be verified",
      );
      return;
    }
    const rulesBefore = rulesBeforeResp.rules.length;

    // Approve the fixture row.
    const patch = await page.request.patch(
      `${BASE_URL}/api/approval-queue/${fixture.id}`,
      {
        headers: { "Content-Type": "application/json" },
        data: { action: "approve", reviewerNotes: "pattern-learner probe" },
      },
    );
    expect(patch.status()).toBe(200);

    // Wait briefly so the post-tx fire-and-forget learner write
    // has a chance to commit (it's `void recordApprovalLearning(...)`).
    await page.waitForTimeout(2_000);

    // Reset for the next run.
    await page.request.patch(
      `${BASE_URL}/api/approval-queue/${fixture.id}`,
      {
        headers: { "Content-Type": "application/json" },
        data: { action: "reset" },
      },
    );

    const rulesAfterResp = await getRulesForClient(page.request, clientId);
    expect(rulesAfterResp.status).toBe(200);
    const rulesAfter = rulesAfterResp.rules.length;

    // Free-tier users SHOULD NOT accumulate rules. The plan-gate inside
    // recordApprovalLearning() returns "skipped" without touching
    // AgentRule. Verify the count stayed flat.
    expect(rulesAfter).toBe(rulesBefore);
  });

  test("02 — practice-tier 3 approvals create + reinforce an AgentRule", async ({
    page,
  }) => {
    test.skip(
      !PRACTICE_EMAIL || !PRACTICE_PASSWORD,
      "E2E_PRACTICE_EMAIL + E2E_PRACTICE_PASSWORD not set — practice-tier learner path requires the upgraded fixture user",
    );
    test.setTimeout(60_000);

    await signIn(page, BASE_URL, PRACTICE_EMAIL!, PRACTICE_PASSWORD!);

    // The Practice user needs at least one client + a path to spawn
    // pending approval items. We try the approval-queue listing first;
    // if it's empty we skip rather than synthesize a fake item from
    // the spec (we explicitly said no API extensions).
    const list = await page.request.get(
      `${BASE_URL}/api/approval-queue?status=pending_review`,
    );
    expect(list.status()).toBe(200);
    const listBody = (await list.json()) as { items: ApprovalListItem[] };

    if (listBody.items.length < 3) {
      test.skip(
        true,
        `practice user has ${listBody.items.length} pending approvals — need ≥ 3 same-shape items to drive the learner`,
      );
      return;
    }

    // Group items by (clientId, type, normalized-title-prefix) so we
    // pick three that the buildPatternKey() collapser will treat as
    // the same rule. If we can't find three same-shaped, skip.
    type Key = string;
    const groups = new Map<Key, ApprovalListItem[]>();
    for (const item of listBody.items) {
      const key = `${item.clientId}::${item.type}::${item.title.split(" ")[0]}`;
      const arr = groups.get(key) ?? [];
      arr.push(item);
      groups.set(key, arr);
    }
    const sameShape = [...groups.values()].find((arr) => arr.length >= 3);
    if (!sameShape) {
      test.skip(
        true,
        "no group of 3+ same-shape pending approvals available on practice user — cannot drive reinforcement",
      );
      return;
    }
    const trio = sameShape.slice(0, 3);
    const clientId = trio[0].clientId;

    const before = await getRulesForClient(page.request, clientId);
    expect(before.status).toBe(200);

    for (const item of trio) {
      const patch = await page.request.patch(
        `${BASE_URL}/api/approval-queue/${item.id}`,
        {
          headers: { "Content-Type": "application/json" },
          data: { action: "approve" },
        },
      );
      expect(patch.status()).toBe(200);
      // Give the fire-and-forget learner a moment between approvals so
      // the rule is found by the next run instead of double-created.
      await page.waitForTimeout(500);
    }

    const after = await getRulesForClient(page.request, clientId);
    expect(after.status).toBe(200);

    // We expect at least one approval_pattern rule whose appliedCount
    // grew by ≥3 (or one new rule if no matching one existed before).
    const matchingRules = after.rules.filter(
      (r) => r.ruleType === "approval_pattern",
    );
    expect(matchingRules.length).toBeGreaterThan(0);

    // Strictest assertion: the highest-applied rule should be at
    // appliedCount ≥ 3 and confidence ≥ 0.6 (the threshold the prompt
    // injection check uses).
    const top = matchingRules.reduce((acc, r) =>
      r.appliedCount > acc.appliedCount ? r : acc,
    );
    expect(top.appliedCount).toBeGreaterThanOrEqual(3);
    expect(top.confidence).toBeGreaterThanOrEqual(0.6);
  });
});
