/**
 * POST /api/ai-policy-generator/generate
 *
 * Generates a vertical-specific AI usage policy via the studio's
 * unified Claude provider (OpenRouter primary, per CLAUDE.md mandate),
 * persists the row to practiq.policy_generations, and fires Slack +
 * analytics. PDF rendering is deliberately deferred to
 * GET /api/ai-policy-generator/[id]/pdf so the visitor sees the policy
 * preview inline in ~25-30s instead of waiting 30-50s (sometimes >60s
 * and timing out) for the @react-pdf/renderer + Supabase Storage round
 * trip on the critical path.
 *
 * The lazy-PDF route handles render-on-first-download, uploads to
 * Storage, updates the row's pdf_url, and sends the SES email.
 *
 * Public endpoint — no auth. Anonymous visitors (especially law /
 * accounting firm visitors arriving from ABA Opinion 512 and AICPA AI
 * guidance content) generate a draft they can take to their counsel.
 *
 * Anti-abuse: 5 generations / 10 min / IP. The LLM round-trip is the
 * expensive step; a higher limit invites scripted abuse without
 * serving a real audience.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  getClaudeProvider,
  DEFAULT_MODEL_OPENROUTER,
} from "@/lib/claude/provider";
import { safeNotify } from "@/lib/notifications/slack";
import { reportUserError } from "@/lib/notifications/user-error";
import { trackEvent } from "@/lib/analytics/track";
import { checkRateLimit, identityFromRequest } from "@/lib/rate-limit";
import {
  buildSystemPrompt,
  POLICY_OUTPUT_SCHEMA,
} from "@/lib/policy-generator/prompt";
import type {
  GeneratedPolicy,
  PolicyGeneratorFormState,
} from "@/lib/policy-generator/types";
import { VERTICAL_LABELS } from "@/lib/policy-generator/frameworks";

export const runtime = "nodejs";
// Critical path is LLM-only (~25-37s typical, marketing the densest).
// Follow-up to 55270c8: the retry-on-truncation safety net can push
// total handler time to ~60-65s when the first attempt truncates the
// dense marketing tool_use output, producing HTTP 504 at the Vercel
// function ceiling (verified 2026-05-13: 1/5 marketing probes returned
// 504 at exactly 60.27s, no user_errors row written because the
// gateway timeout fires outside the Node handler, so its catch block
// never gets to call reportUserError). We're on Pro tier (verified via
// /v2/teams API: plan=pro), which allows up to 800s on Node runtime.
// 120s gives ample headroom for first attempt + retry (worst observed
// combined ~70s) without ever silently dropping a request, and is far
// enough below the platform ceiling that it remains a meaningful
// signal if a future regression makes things much worse.
export const maxDuration = 120;

const VALID_VERTICALS = new Set([
  "legal",
  "cpa",
  "hr",
  "marketing",
  "consulting",
  "other",
]);
const VALID_APPROVAL = new Set([
  "partner_approved",
  "blanket",
  "case_by_case",
  "prohibited_client_facing",
]);
const VALID_DISCLOSURE = new Set([
  "always",
  "on_request",
  "internal_only",
  "undecided",
]);

interface RequestBody {
  responses?: Partial<PolicyGeneratorFormState>;
  attribution?: {
    landing_slug?: string;
    source_platform?: string;
    source_post_id?: string;
    lane?: string;
    campaign?: string;
    topic?: string;
  };
  page_url?: string;
}

function validate(
  body: unknown,
):
  | { error: string }
  | {
      form: PolicyGeneratorFormState;
      attribution: NonNullable<RequestBody["attribution"]>;
      pageUrl: string | null;
    } {
  if (!body || typeof body !== "object") {
    return { error: "Invalid request body." };
  }
  const b = body as RequestBody;
  const r = b.responses ?? {};

  const email = typeof r.email === "string" ? r.email.trim() : "";
  if (!email || !email.includes("@")) {
    return { error: "Valid email is required." };
  }

  const vertical = String(r.vertical ?? "");
  if (!VALID_VERTICALS.has(vertical)) {
    return { error: "Invalid vertical." };
  }
  const approval = String(r.approvalWorkflow ?? "");
  if (!VALID_APPROVAL.has(approval)) {
    return { error: "Invalid approval workflow selection." };
  }
  const disclosure = String(r.disclosurePreference ?? "");
  if (!VALID_DISCLOSURE.has(disclosure)) {
    return { error: "Invalid disclosure preference selection." };
  }

  const cleanString = (v: unknown, max = 200): string =>
    typeof v === "string" ? v.trim().slice(0, max) : "";

  const cleanArray = (v: unknown, max = 50): string[] => {
    if (!Array.isArray(v)) return [];
    return v
      .filter((x) => typeof x === "string")
      .map((x) => (x as string).trim().slice(0, 100))
      .filter((x) => x.length > 0)
      .slice(0, max);
  };

  const form: PolicyGeneratorFormState = {
    vertical: vertical as PolicyGeneratorFormState["vertical"],
    firmName: cleanString(r.firmName, 200),
    firmSize: cleanString(r.firmSize, 60),
    states: cleanArray(r.states, 60),
    licenseType: cleanString(r.licenseType, 120),
    aiUsage: cleanArray(
      r.aiUsage,
      10,
    ) as PolicyGeneratorFormState["aiUsage"],
    sensitiveData: cleanArray(
      r.sensitiveData,
      10,
    ) as PolicyGeneratorFormState["sensitiveData"],
    approvalWorkflow:
      approval as PolicyGeneratorFormState["approvalWorkflow"],
    disclosurePreference:
      disclosure as PolicyGeneratorFormState["disclosurePreference"],
    name: cleanString(r.name, 200),
    email,
  };

  return {
    form,
    attribution: b.attribution ?? {},
    pageUrl: typeof b.page_url === "string" ? b.page_url : null,
  };
}

/**
 * Per-vertical max_tokens budgets. The marketing framework is the
 * densest of the five (FTC §5 + Endorsement Guides + Copyright +
 * CCPA/GDPR + per-platform rules), and the model regularly truncates
 * mid-tool_use at 2400, producing a partial JSON object that's missing
 * required fields ("LLM response missing required fields." at the
 * structural check below). 2026-05-13 observed 60% failure rate on
 * marketing at 2400; legal/cpa/hr/consulting were stable.
 *
 * Bumping marketing to 3600 leaves ~50% headroom over the empirically
 * observed output size of successful marketing runs (~2100 tokens) so
 * the model has room for the dense framework citations without
 * hitting the budget. Consulting also gets a bump as a precaution —
 * its prompt is the second-densest. The other three stay at 2400.
 *
 * The original 2400 ceiling was chosen to prevent the model from
 * wandering into 9-section essays under the prior 4096 budget. The
 * 6-section instruction in the prompt itself (re-checked 2026-05-13)
 * is the real guardrail; the token cap just enforces it.
 */
function maxTokensForVertical(vertical: string): number {
  if (vertical === "marketing") return 3600;
  if (vertical === "consulting") return 3000;
  return 2400;
}

function isPolicyComplete(policy: GeneratedPolicy): boolean {
  return (
    !!policy.policy_title &&
    Array.isArray(policy.sections) &&
    policy.sections.length > 0 &&
    Array.isArray(policy.key_obligations) &&
    policy.key_obligations.length > 0
  );
}

async function callPolicyLLM(
  form: PolicyGeneratorFormState,
  maxTokens: number,
): Promise<{
  policy: GeneratedPolicy | null;
  stopReason: string | undefined;
  rawText: string;
}> {
  const system = buildSystemPrompt(form);
  const provider = getClaudeProvider();
  const response = await provider.complete({
    system,
    messages: [
      {
        role: "user",
        content:
          "Draft the policy now. Return only the structured output via the tool — no commentary.",
      },
    ],
    maxTokens,
    model: provider.name === "openrouter" ? DEFAULT_MODEL_OPENROUTER : undefined,
    outputSchema: {
      name: "draft_ai_usage_policy",
      description:
        "Return the firm's draft AI usage policy as structured JSON.",
      schema: POLICY_OUTPUT_SCHEMA,
    },
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(response.text);
  } catch {
    try {
      const cleaned = response.text
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```\s*$/i, "")
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return { policy: null, stopReason: response.stopReason, rawText: response.text };
    }
  }

  const policy = parsed as GeneratedPolicy;
  if (!isPolicyComplete(policy)) {
    return { policy: null, stopReason: response.stopReason, rawText: response.text };
  }
  return { policy, stopReason: response.stopReason, rawText: response.text };
}

async function generatePolicy(
  form: PolicyGeneratorFormState,
): Promise<GeneratedPolicy> {
  const initialBudget = maxTokensForVertical(form.vertical);
  const first = await callPolicyLLM(form, initialBudget);
  if (first.policy) return first.policy;

  // Retry-once safety net. Either the model hit max_tokens mid-tool_use
  // (truncated structured output → missing required fields) or returned
  // malformed JSON. Bump the budget by 50% and try one more time. Vercel
  // function ceiling is 60s; first call is typically 35-45s and the retry
  // adds another 20-30s on a smaller delta, still inside the wall.
  const retryBudget = Math.min(4096, Math.round(initialBudget * 1.5));
  console.warn(
    `[ai-policy-generator] retry — vertical=${form.vertical} ` +
      `stopReason=${first.stopReason ?? "unknown"} ` +
      `rawTextLen=${first.rawText.length} ` +
      `budget=${initialBudget}->${retryBudget}`,
  );
  const second = await callPolicyLLM(form, retryBudget);
  if (second.policy) return second.policy;

  throw new Error(
    `LLM response missing required fields after retry. ` +
      `vertical=${form.vertical} ` +
      `firstStop=${first.stopReason ?? "?"} ` +
      `secondStop=${second.stopReason ?? "?"}`,
  );
}

export async function POST(request: NextRequest) {
  const rl = await checkRateLimit({
    namespace: "ai-policy-generator/generate",
    identity: identityFromRequest(request),
    limit: 5,
    windowMs: 10 * 60 * 1000,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again in a few minutes." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const validated = validate(body);
  if ("error" in validated) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }
  const { form, attribution, pageUrl } = validated;

  // 1. Generate policy via LLM. This is the only step on the critical
  //    path now — PDF rendering moved to the lazy GET route.
  const t0 = Date.now();
  let policy: GeneratedPolicy;
  try {
    policy = await generatePolicy(form);
  } catch (err) {
    console.error("[ai-policy-generator] generation failed:", err);
    await reportUserError({
      surface: "policy-generator",
      endpoint: "POST /api/ai-policy-generator/generate",
      status: 502,
      errorMessage:
        err instanceof Error ? err.message : "LLM generation failed",
      errorStack: err instanceof Error ? err.stack : undefined,
      userContext: {
        email: form.email,
        ip_country: request.headers.get("x-vercel-ip-country") ?? null,
        user_agent: request.headers.get("user-agent") ?? null,
      },
      requestBody: {
        vertical: form.vertical,
        firmSize: form.firmSize,
        statesCount: form.states.length,
      },
      stepIfApplicable: "LLM call (OpenRouter, policy gen)",
    });
    return NextResponse.json(
      {
        error:
          "We could not generate your policy right now. Please try again in a moment.",
      },
      { status: 502 },
    );
  }
  const tLlm = Date.now() - t0;
  console.log(`[ai-policy-generator] llm ${tLlm}ms`);

  // 2. Persist row. The lazy-PDF route will read it back by id.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error("[ai-policy-generator] Missing Supabase env vars.");
    return NextResponse.json(
      { error: "Server configuration error." },
      { status: 500 },
    );
  }
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  let rowId = "unknown";
  const tDb0 = Date.now();
  try {
    const insert = await supabase
      .schema("practiq")
      .from("policy_generations")
      .insert({
        email: form.email,
        name: form.name || null,
        firm_name: form.firmName || null,
        firm_vertical: form.vertical,
        firm_size: form.firmSize || null,
        states: form.states,
        responses: {
          ai_usage: form.aiUsage,
          sensitive_data: form.sensitiveData,
          approval_workflow: form.approvalWorkflow,
          disclosure_preference: form.disclosurePreference,
          license_type: form.licenseType,
        },
        policy,
        landing_slug: attribution.landing_slug ?? null,
        source_platform: attribution.source_platform ?? null,
        source_post_id: attribution.source_post_id ?? null,
        lane: attribution.lane ?? null,
        campaign: attribution.campaign ?? null,
        topic: attribution.topic ?? null,
      })
      .select("id")
      .single();
    if (insert.error) {
      console.error("[ai-policy-generator] Supabase insert error:", insert.error);
      await reportUserError({
        surface: "policy-generator",
        endpoint: "POST /api/ai-policy-generator/generate",
        status: 500,
        errorMessage: `DB insert: ${insert.error.message}`,
        userContext: {
          email: form.email,
          ip_country: request.headers.get("x-vercel-ip-country") ?? null,
          user_agent: request.headers.get("user-agent") ?? null,
        },
        stepIfApplicable: "Supabase insert (policy_generations)",
      });
    } else if (insert.data?.id) {
      rowId = insert.data.id as string;
    }
  } catch (err) {
    console.error("[ai-policy-generator] Supabase exception:", err);
    await reportUserError({
      surface: "policy-generator",
      endpoint: "POST /api/ai-policy-generator/generate",
      status: 500,
      errorMessage:
        err instanceof Error ? err.message : "Supabase insert exception",
      errorStack: err instanceof Error ? err.stack : undefined,
      userContext: {
        email: form.email,
        ip_country: request.headers.get("x-vercel-ip-country") ?? null,
        user_agent: request.headers.get("user-agent") ?? null,
      },
      stepIfApplicable: "Supabase insert (policy_generations)",
    });
  }
  console.log(`[ai-policy-generator] db ${Date.now() - tDb0}ms`);

  // 3. Server-side analytics. Must be awaited on Vercel — `void` at the
  //    tail of a serverless handler gets dropped (see memory note).
  const tAnalytics0 = Date.now();
  await trackEvent({
    type: "policy_generated",
    properties: {
      generation_id: rowId,
      firm_vertical: form.vertical,
      firm_size: form.firmSize || null,
      states_count: form.states.length,
      ai_usage: form.aiUsage,
      sensitive_data: form.sensitiveData,
      approval_workflow: form.approvalWorkflow,
      disclosure_preference: form.disclosurePreference,
      had_pdf: false,
      landing_slug: attribution.landing_slug ?? "ai-policy-generator",
      source_platform: attribution.source_platform ?? null,
      source_post_id: attribution.source_post_id ?? null,
      lane: attribution.lane ?? "practiq",
      campaign: attribution.campaign ?? null,
      topic: attribution.topic ?? null,
    },
    url: pageUrl,
    referrer: request.headers.get("referer"),
    userAgent: request.headers.get("user-agent"),
    geoCountry: request.headers.get("x-vercel-ip-country") ?? null,
  });
  console.log(
    `[ai-policy-generator] analytics ${Date.now() - tAnalytics0}ms`,
  );

  // 4. Slack notification — pdf_url is filled in on first download.
  safeNotify("policy_generated", {
    email: form.email,
    name: form.name,
    firm_name: form.firmName,
    firm_vertical: VERTICAL_LABELS[form.vertical],
    firm_size: form.firmSize,
    states: form.states.join(", "),
    policy_title: policy.policy_title,
    landing_slug: attribution.landing_slug ?? "ai-policy-generator",
    source_platform: attribution.source_platform ?? "(direct)",
    pdf_url: "(lazy — generated on first download)",
  });

  // PDF and SES email both fire from the lazy GET route on first
  // download. The client renders the inline preview from `policy`
  // immediately; the Download PDF button hits the lazy route.
  console.log(`[ai-policy-generator] total ${Date.now() - t0}ms`);
  return NextResponse.json({ id: rowId, policy, pdf_url: null });
}
