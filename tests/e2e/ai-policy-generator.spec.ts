/**
 * ai-policy-generator: API happy-path against
 * POST /api/ai-policy-generator/generate.
 *
 * Same logic as workflow-audit.spec.ts: we drive the API directly
 * instead of clicking through the multi-step form because the form is
 * exercised by humans and the form-side logic is unit-tested. What CI
 * needs to catch is:
 *   - LLM call regressions (max_tokens budget reverts → truncated
 *     tool_use → "LLM response missing required fields"). See memory:
 *     policy_generator_budget_tuning.md.
 *   - The Anthropic tool_use array-shape regression (memory:
 *     anthropic_tool_use_array_shape.md) — sections / key_obligations
 *     get coerced post-parse; this test asserts they end up as arrays
 *     in the response so a future schema-only fix would catch the gap.
 *   - Lazy PDF URL contract: route returns `pdf_url: null` and the
 *     download endpoint generates the PDF on first request. We do NOT
 *     actually download the PDF here (separate route, would slow CI).
 *
 * No DB cross-check needed — the workflow-audit spec already exercises
 * the practiq schema/grants path, so this spec stays focused on the
 * LLM + shape contract.
 */
import { test, expect } from "@playwright/test";
import { freshTestIdentity } from "./helpers/test-data";

const BASE_URL =
  process.env.PRACTIQ_BASE_URL ??
  process.env.E2E_BASE_URL ??
  "https://practiq.dev";

interface PolicySection {
  heading: string;
  body: string;
  applies_to?: string;
}

interface PolicyShape {
  policy_title: string;
  preamble: string;
  sections: PolicySection[];
  key_obligations: string[];
  review_cycle: string;
  footer_disclaimer: string;
}

test.describe("ai-policy-generator API", () => {
  // Retry once + initial LLM call ~45s on cold-start = bound at 120s.
  test.setTimeout(120_000);

  // LLM-paid endpoint — chromium-desktop only.
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium-desktop",
      "LLM-paid endpoint: run once per CI pass (desktop project only).",
    );
  });

  test("p01 — POST /api/ai-policy-generator/generate returns 200 + structured policy", async ({
    request,
  }) => {
    const ident = freshTestIdentity("policy");

    const body = {
      responses: {
        vertical: "cpa",
        firmName: ident.firmName,
        firmSize: "6-10 people",
        states: ["CA", "NY"],
        licenseType: "CPA, EA",
        aiUsage: ["chatgpt", "copilot"],
        sensitiveData: ["client_financial", "pii"],
        approvalWorkflow: "partner_approved",
        disclosurePreference: "on_request",
        name: ident.name,
        email: ident.email,
      },
      attribution: {
        landing_slug: "e2e",
        source_platform: "e2e",
        lane: "e2e",
        campaign: "e2e",
      },
      page_url: `${BASE_URL}/tools/ai-policy-generator?src=e2e`,
    };

    const resp = await request.post(
      `${BASE_URL}/api/ai-policy-generator/generate`,
      { data: body, timeout: 110_000 },
    );

    expect(
      resp.status(),
      `Expected 200, got ${resp.status()}. Body: ${(await resp.text()).slice(0, 400)}`,
    ).toBe(200);

    const json = (await resp.json()) as {
      id: string;
      policy: PolicyShape;
      pdf_url: string | null;
    };

    // pdf_url MUST be null — PDF is generated lazily on first download.
    // If this flips to non-null someone re-enabled eager generation,
    // which doubles average response time. Catch the regression early.
    expect(
      json.pdf_url,
      "pdf_url should be null (PDF is generated lazily on first download)",
    ).toBeNull();

    expect(typeof json.id).toBe("string");
    expect(json.id.length).toBeGreaterThan(0);

    // Policy structural contract. Most of this is also enforced by
    // coercePolicyShape() — but we want to know if the upstream output
    // shape changes shape (string / object instead of array) so we can
    // pre-emptively tighten the prompt or budget.
    const p = json.policy;
    expect(typeof p.policy_title).toBe("string");
    expect(p.policy_title.length).toBeGreaterThan(0);
    expect(typeof p.preamble).toBe("string");
    expect(typeof p.review_cycle).toBe("string");
    expect(typeof p.footer_disclaimer).toBe("string");

    expect(
      Array.isArray(p.sections),
      "policy.sections must be an array — coercion failed?",
    ).toBe(true);
    expect(p.sections.length).toBeGreaterThanOrEqual(3);
    for (const s of p.sections) {
      expect(typeof s.heading).toBe("string");
      expect(s.heading.length).toBeGreaterThan(0);
      expect(typeof s.body).toBe("string");
      expect(s.body.length).toBeGreaterThan(0);
    }

    expect(
      Array.isArray(p.key_obligations),
      "policy.key_obligations must be an array — coercion failed?",
    ).toBe(true);
    expect(p.key_obligations.length).toBeGreaterThanOrEqual(1);
    for (const o of p.key_obligations) {
      expect(typeof o).toBe("string");
      expect(o.length).toBeGreaterThan(0);
    }
  });
});
