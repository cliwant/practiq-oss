/**
 * POST /api/ai-policy-generator/generate
 *
 * Generates a vertical-specific AI usage policy via the studio's
 * unified Claude provider (OpenRouter primary, per CLAUDE.md mandate),
 * renders it to PDF server-side using @react-pdf/renderer, uploads to
 * the Supabase `policy-pdfs` bucket, persists the row to
 * practiq.policy_generations, fires Slack + analytics, and emails the
 * requester a copy.
 *
 * Public endpoint — no auth. Anonymous visitors (especially law /
 * accounting firm visitors arriving from ABA Opinion 512 and AICPA AI
 * guidance content) generate a draft they can take to their counsel.
 *
 * Anti-abuse: 5 generations / 10 min / IP. The LLM round-trip + PDF
 * render are the expensive steps; a higher limit invites scripted
 * abuse without serving a real audience.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import {
  getClaudeProvider,
  DEFAULT_MODEL_OPENROUTER,
} from "@/lib/claude/provider";
import { safeNotify } from "@/lib/notifications/slack";
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
// LLM (~20s) + PDF (~5s) — keep the function alive for the full path.
export const maxDuration = 60;

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

async function generatePolicy(
  form: PolicyGeneratorFormState,
): Promise<GeneratedPolicy> {
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
    maxTokens: 4096,
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
    const cleaned = response.text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();
    parsed = JSON.parse(cleaned);
  }

  const policy = parsed as GeneratedPolicy;
  if (
    !policy.policy_title ||
    !Array.isArray(policy.sections) ||
    !Array.isArray(policy.key_obligations)
  ) {
    throw new Error("LLM response missing required fields.");
  }
  return policy;
}

async function uploadPdf(
  pdfBuffer: Buffer,
  rowId: string,
): Promise<string | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });
  const key = `${rowId}.pdf`;
  const { error } = await supabase.storage
    .from("policy-pdfs")
    .upload(key, pdfBuffer, {
      contentType: "application/pdf",
      cacheControl: "31536000",
      upsert: true,
    });
  if (error) {
    console.error("[ai-policy-generator] PDF upload error:", error);
    return null;
  }
  const { data } = supabase.storage.from("policy-pdfs").getPublicUrl(key);
  return data.publicUrl;
}

async function sendPolicyEmail(
  to: string,
  name: string,
  firmName: string,
  policyTitle: string,
  pdfUrl: string | null,
): Promise<void> {
  const awsKey = process.env.AWS_ACCESS_KEY_ID;
  const awsSecret = process.env.AWS_SECRET_ACCESS_KEY;
  const fromEmail = process.env.SES_FROM_EMAIL || "hello@practiq.dev";
  if (!awsKey || !awsSecret) {
    console.warn("[ai-policy-generator] SES not configured, skipping email.");
    return;
  }
  const ses = new SESClient({
    region: process.env.AWS_SES_REGION || "us-east-1",
    credentials: { accessKeyId: awsKey, secretAccessKey: awsSecret },
  });

  const greeting = name ? `Hi ${name},` : "Hi,";
  const firmLine = firmName ? ` for ${firmName}` : "";
  const downloadLine = pdfUrl
    ? `Download the PDF: ${pdfUrl}`
    : "Your PDF is available on the result page.";

  const text = [
    greeting,
    "",
    `Your draft AI usage policy${firmLine} is ready.`,
    "",
    `Title: ${policyTitle}`,
    "",
    downloadLine,
    "",
    "Important: this document is a starting draft, not legal advice.",
    "Please review it with qualified counsel licensed in your firm's",
    "jurisdiction before adopting it.",
    "",
    "If you'd like the same review-state tracking, source provenance,",
    "and approval workflow this policy describes built into every",
    "AI-assisted task at your firm — see how Practiq fits:",
    "https://practiq.dev/professional-services-ai-evidence-layer",
    "",
    "— The Practiq team",
  ].join("\n");

  try {
    await ses.send(
      new SendEmailCommand({
        Source: fromEmail,
        Destination: { ToAddresses: [to] },
        Message: {
          Subject: { Data: `Your draft AI usage policy${firmLine}` },
          Body: { Text: { Data: text } },
        },
      }),
    );
  } catch (err) {
    console.error("[ai-policy-generator] SES error:", err);
  }
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

  // 1. Generate policy via LLM.
  let policy: GeneratedPolicy;
  try {
    policy = await generatePolicy(form);
  } catch (err) {
    console.error("[ai-policy-generator] generation failed:", err);
    return NextResponse.json(
      {
        error:
          "We could not generate your policy right now. Please try again in a moment.",
      },
      { status: 502 },
    );
  }

  // 2. Persist row first so we can use the row id as the PDF key.
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
    } else if (insert.data?.id) {
      rowId = insert.data.id as string;
    }
  } catch (err) {
    console.error("[ai-policy-generator] Supabase exception:", err);
  }

  // 3. Render PDF. @react-pdf/renderer + its font assets break webpack's
  // content-hash step when statically imported by an App Router route
  // handler, so we dynamic-import both the renderer and the document
  // component. This pushes the load off the build's bundle graph and
  // resolves them from node_modules at request time on the Node runtime.
  let pdfUrl: string | null = null;
  try {
    const generatedOn = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const [{ renderToBuffer }, { PolicyPdfDocument }] = await Promise.all([
      import("@react-pdf/renderer"),
      import("@/lib/policy-generator/pdf-document"),
    ]);
    const pdfBuffer = await renderToBuffer(
      PolicyPdfDocument({
        policy,
        firmName: form.firmName,
        vertical: VERTICAL_LABELS[form.vertical],
        generatedOn,
      }),
    );
    pdfUrl = await uploadPdf(pdfBuffer, rowId);
    if (pdfUrl && rowId !== "unknown") {
      await supabase
        .schema("practiq")
        .from("policy_generations")
        .update({ pdf_url: pdfUrl })
        .eq("id", rowId);
    }
  } catch (err) {
    console.error("[ai-policy-generator] PDF render failed:", err);
    // Continue: the client still gets the JSON policy even if PDF
    // generation fails. Better than 500-ing after the LLM spend.
  }

  // 4. Server-side analytics.
  void trackEvent({
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
      had_pdf: !!pdfUrl,
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

  // 5. Slack notification.
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
    pdf_url: pdfUrl ?? "(not generated)",
  });

  // 6. Fire-and-forget email.
  void sendPolicyEmail(
    form.email,
    form.name,
    form.firmName,
    policy.policy_title,
    pdfUrl,
  );

  return NextResponse.json({ id: rowId, policy, pdf_url: pdfUrl });
}
