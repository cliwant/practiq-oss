/**
 * workflow-audit: API happy-path against POST /api/workflow-audit/generate.
 *
 * The 8-step UI is exercised by humans + the dogfood agent — what we
 * want CI to catch is a regression that breaks the API contract or
 * the Supabase write path. We hit the endpoint directly with a
 * minimally valid body, assert 200 + a sane report shape, then (if
 * SUPABASE_ACCESS_TOKEN is present) read the practiq.workflow_audits
 * table to confirm the row actually landed with the email we sent.
 *
 * Why this matters in CI:
 *   - The LLM is the slowest leg (~35s on OpenRouter). If we ship a
 *     budget/maxToken regression, the route flips to 502 silently
 *     and the only signal today is a missing Slack notification —
 *     by which time a real prospect has already bounced.
 *   - The Supabase write was buggy for weeks before practiq.* schema
 *     grants were patched (see memory: supabase_schema_for_api.md).
 *     The DB-side assertion catches a recurrence of that pattern.
 *
 * Skipped automatically when SUPABASE_ACCESS_TOKEN is absent (still
 * runs the 200 + shape assertion — just no DB-side cross-check).
 */
import { test, expect } from "@playwright/test";
import { freshTestIdentity } from "./helpers/test-data";
import {
  supabaseQuery,
  sqlEscape,
  hasSupabaseToken,
} from "./helpers/supabase-query";

const BASE_URL =
  process.env.PRACTIQ_BASE_URL ??
  process.env.E2E_BASE_URL ??
  "https://practiq.dev";

interface ReportShape {
  headline: string;
  primary_gap: string;
  diagnosis_paragraphs: string[];
  specific_examples: string[];
  recommendations: Array<{
    title: string;
    body: string;
    applicable_before_practiq: boolean;
  }>;
  vertical_specific_note: string;
}

test.describe("workflow-audit API", () => {
  // LLM call routinely runs ~35s; 90s ceiling covers cold-start + retry.
  test.setTimeout(90_000);

  // Only run on chromium-desktop — re-running the LLM-paid endpoint
  // on both mobile and desktop projects doubles the bill for zero
  // additional signal. The route response is viewport-independent.
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium-desktop",
      "LLM-paid endpoint: run once per CI pass (desktop project only).",
    );
  });

  test("w01 — POST /api/workflow-audit/generate returns 200 + structured report", async ({
    request,
  }) => {
    const ident = freshTestIdentity("workflow");

    const body = {
      contact: {
        name: ident.name,
        email: ident.email,
        firm_name: ident.firmName,
      },
      responses: {
        firm_vertical: "cpa",
        firm_size: "6-20",
        client_count: "50-100",
        recent_engagement:
          "Q1 close for a 30-employee restaurant group — partner had to re-do the consolidating entries because the senior couldn't tell which trial balance was the latest from the prior reviewer's notes.",
        current_ai_usage: ["chatgpt_or_claude", "embedded_copilot"],
        current_ai_usage_specify: "",
        handoff_gaps: ["review_state", "source"],
        repeat_frequency: "monthly",
        reviewer_pain: "partner_redoes",
        compliance_concerns: ["aicpa_ssts", "irs_circular_230"],
      },
      attribution: {
        landing_slug: "e2e",
        source_platform: "e2e",
        source_post_id: null,
        lane: "e2e",
        campaign: "e2e",
        topic: null,
      },
      page_url: `${BASE_URL}/workflow-audit?src=e2e`,
    };

    const resp = await request.post(
      `${BASE_URL}/api/workflow-audit/generate`,
      { data: body, timeout: 80_000 },
    );

    expect(
      resp.status(),
      `POST /api/workflow-audit/generate: expected 200, got ${resp.status()}.` +
        ` Body: ${(await resp.text()).slice(0, 300)}`,
    ).toBe(200);

    const json = (await resp.json()) as {
      id: string;
      report: ReportShape;
    };

    // Top-level shape — these are the fields the UI binds to.
    expect(typeof json.id).toBe("string");
    expect(json.id.length).toBeGreaterThan(0);
    expect(typeof json.report.headline).toBe("string");
    expect(
      [
        "source",
        "review_state",
        "client_context",
        "handoff",
        "multiple",
      ].includes(json.report.primary_gap),
    ).toBe(true);
    expect(Array.isArray(json.report.diagnosis_paragraphs)).toBe(true);
    expect(json.report.diagnosis_paragraphs.length).toBeGreaterThanOrEqual(3);
    expect(Array.isArray(json.report.recommendations)).toBe(true);
    expect(json.report.recommendations.length).toBeGreaterThanOrEqual(3);
    for (const rec of json.report.recommendations) {
      expect(typeof rec.title).toBe("string");
      expect(typeof rec.body).toBe("string");
      expect(typeof rec.applicable_before_practiq).toBe("boolean");
    }

    // DB-side cross-check. If the route returned 200 but the Supabase
    // insert dropped (the practiq schema regression we already shipped
    // once), the API would still appear healthy — but no row would
    // exist. Confirm the row landed and the report column matches.
    if (!hasSupabaseToken()) {
      test.info().annotations.push({
        type: "skip-db-check",
        description:
          "SUPABASE_ACCESS_TOKEN not set — skipping practiq.workflow_audits row verification.",
      });
      return;
    }

    // Allow up to 3s for the row to be visible (the route inserts
    // BEFORE returning the response, so this should be instant in
    // practice, but Supabase replication on the Management API has
    // occasionally taken a beat).
    let rows: unknown[] = [];
    for (let attempt = 0; attempt < 5; attempt++) {
      const result = await supabaseQuery<unknown[]>(
        `SELECT id, email, firm_vertical, report
           FROM practiq.workflow_audits
          WHERE email = '${sqlEscape(ident.email)}'
          ORDER BY created_at DESC
          LIMIT 1;`,
      );
      if (Array.isArray(result) && result.length > 0) {
        rows = result;
        break;
      }
      await new Promise((r) => setTimeout(r, 600));
    }

    expect(
      rows.length,
      `practiq.workflow_audits row not found for ${ident.email} — schema/grants regression?`,
    ).toBeGreaterThan(0);
    const row = rows[0] as {
      id: string;
      email: string;
      firm_vertical: string;
      report: unknown;
    };
    expect(row.email).toBe(ident.email);
    expect(row.firm_vertical).toBe("cpa");
    expect(row.report).toBeTruthy();
  });
});
