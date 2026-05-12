/**
 * POST /api/workflow-audit/generate
 *
 * Receives the 8-step self-serve workflow audit, runs it through the
 * LLM with a Practiq-evidence-layer system prompt, persists the
 * response + report to Supabase, fires Slack + analytics, and emails
 * the requester a copy.
 *
 * No auth — this is a public conversion surface (anonymous visitors
 * from SNS posts). We rate-limit by IP and validate every input field.
 *
 * The LLM call goes through the studio's unified Claude provider so
 * the OpenRouter-primary mandate stays satisfied (see CLAUDE.md). The
 * provider's `outputSchema` mechanism forces a structured JSON
 * response — eliminates parse-fragility.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { getClaudeProvider, DEFAULT_MODEL_OPENROUTER } from "@/lib/claude/provider";
import { safeNotify } from "@/lib/notifications/slack";
import { trackEvent } from "@/lib/analytics/track";
import { checkRateLimit, identityFromRequest } from "@/lib/rate-limit";
import type {
  AuditResponses,
  ContactInfo,
  SnsAttribution,
  AuditReport,
  GenerateAuditRequest,
  PrimaryGap,
} from "@/components/workflow-audit/types";

export const runtime = "nodejs";
// LLM call can run up to ~30s; default 10s Vercel timeout is too tight.
export const maxDuration = 60;

const VALID_VERTICALS = new Set([
  "cpa",
  "law",
  "hr",
  "marketing",
  "consulting",
  "other",
]);
const VALID_FIRM_SIZES = new Set(["solo", "2-5", "6-20", "21-50", "50+"]);
const VALID_CLIENT_COUNTS = new Set([
  "<20",
  "20-50",
  "50-100",
  "100-200",
  "200+",
]);
const VALID_AI_USAGE = new Set([
  "chatgpt_or_claude",
  "domain_saas",
  "embedded_copilot",
  "internal_tools",
  "none",
]);
const VALID_HANDOFF_GAPS = new Set([
  "source",
  "review_state",
  "client_context",
  "next_step_ownership",
  "all_of_the_above",
]);
const VALID_REPEAT_FREQ = new Set([
  "weekly",
  "monthly",
  "quarterly",
  "rarely",
]);
const VALID_REVIEWER_PAIN = new Set([
  "partner_redoes",
  "partner_cannot_sign_off",
  "team_handoff_breaks",
  "training_new_staff_slow",
  "multiple",
]);

function isString(v: unknown): v is string {
  return typeof v === "string";
}

function isValidEmail(v: string): boolean {
  const trimmed = v.trim();
  if (trimmed.length < 5 || trimmed.length > 200) return false;
  const at = trimmed.indexOf("@");
  if (at < 1 || at === trimmed.length - 1) return false;
  if (!trimmed.slice(at + 1).includes(".")) return false;
  return true;
}

interface ValidatedBody {
  responses: AuditResponses;
  contact: ContactInfo;
  attribution: SnsAttribution;
  pageUrl: string | null;
}

function validate(body: unknown): ValidatedBody | { error: string } {
  if (!body || typeof body !== "object") return { error: "Invalid body." };
  const b = body as Partial<GenerateAuditRequest> & {
    page_url?: unknown;
  };
  const r = b.responses;
  const c = b.contact;
  if (!r || typeof r !== "object") return { error: "Missing responses." };
  if (!c || typeof c !== "object") return { error: "Missing contact." };

  if (!isString(c.name) || c.name.trim().length === 0)
    return { error: "Name is required." };
  if (!isString(c.email) || !isValidEmail(c.email))
    return { error: "A valid email is required." };
  if (!isString(c.firm_name) || c.firm_name.trim().length === 0)
    return { error: "Firm name is required." };

  if (!isString(r.firm_vertical) || !VALID_VERTICALS.has(r.firm_vertical))
    return { error: "Pick a vertical." };
  if (!isString(r.firm_size) || !VALID_FIRM_SIZES.has(r.firm_size))
    return { error: "Pick a firm size." };
  if (!isString(r.client_count) || !VALID_CLIENT_COUNTS.has(r.client_count))
    return { error: "Pick a client-count range." };

  if (!isString(r.recent_engagement) || r.recent_engagement.trim().length < 15)
    return { error: "Describe a recent engagement (at least a sentence)." };

  if (!Array.isArray(r.current_ai_usage) || r.current_ai_usage.length === 0)
    return { error: "Pick at least one AI-usage option." };
  for (const x of r.current_ai_usage) {
    if (!isString(x) || !VALID_AI_USAGE.has(x))
      return { error: "Invalid AI-usage option." };
  }

  if (!Array.isArray(r.handoff_gaps) || r.handoff_gaps.length === 0)
    return { error: "Pick at least one handoff-gap option." };
  for (const x of r.handoff_gaps) {
    if (!isString(x) || !VALID_HANDOFF_GAPS.has(x))
      return { error: "Invalid handoff-gap option." };
  }

  if (!isString(r.repeat_frequency) || !VALID_REPEAT_FREQ.has(r.repeat_frequency))
    return { error: "Pick a repeat frequency." };
  if (!isString(r.reviewer_pain) || !VALID_REVIEWER_PAIN.has(r.reviewer_pain))
    return { error: "Pick a reviewer-pain option." };

  if (
    !Array.isArray(r.compliance_concerns) ||
    r.compliance_concerns.some((x) => !isString(x))
  ) {
    return { error: "Invalid compliance-concerns shape." };
  }

  const attribution = (b.attribution ?? {}) as Partial<SnsAttribution>;

  return {
    responses: {
      firm_vertical: r.firm_vertical,
      firm_size: r.firm_size,
      client_count: r.client_count,
      recent_engagement: r.recent_engagement.trim().slice(0, 2000),
      current_ai_usage: r.current_ai_usage as AuditResponses["current_ai_usage"],
      current_ai_usage_specify:
        isString(r.current_ai_usage_specify)
          ? r.current_ai_usage_specify.trim().slice(0, 200)
          : "",
      handoff_gaps: r.handoff_gaps as AuditResponses["handoff_gaps"],
      repeat_frequency: r.repeat_frequency,
      reviewer_pain: r.reviewer_pain,
      compliance_concerns: (r.compliance_concerns as string[])
        .map((x) => x.trim().slice(0, 100))
        .filter(Boolean),
    },
    contact: {
      name: c.name.trim().slice(0, 100),
      email: c.email.trim().toLowerCase(),
      firm_name: c.firm_name.trim().slice(0, 150),
    },
    attribution: {
      landing_slug: isString(attribution.landing_slug)
        ? attribution.landing_slug.slice(0, 200)
        : null,
      source_platform: isString(attribution.source_platform)
        ? attribution.source_platform.slice(0, 50)
        : null,
      source_post_id: isString(attribution.source_post_id)
        ? attribution.source_post_id.slice(0, 200)
        : null,
      lane: isString(attribution.lane) ? attribution.lane.slice(0, 50) : null,
      campaign: isString(attribution.campaign)
        ? attribution.campaign.slice(0, 100)
        : null,
      topic: isString(attribution.topic) ? attribution.topic.slice(0, 200) : null,
    },
    pageUrl: isString(b.page_url) ? b.page_url.slice(0, 500) : null,
  };
}

const SYSTEM_PROMPT = `You are a senior advisor on professional-services AI workflows. You diagnose where a firm's current workflow is dropping evidence and recommend changes the firm can make today.

Practiq's framework is the "evidence layer" — four objects that must survive every step of an AI-assisted workflow:
  1. Source — the underlying documents and facts that ground each output.
  2. Review state — which human has signed off on what, and at what version.
  3. Client context — the firm's prior decisions, preferences, and engagement-specific constraints for this client.
  4. Handoff — the structured pass between roles (associate → senior → partner) that preserves the three objects above.

When one of these objects gets dropped, the reviewer ends up redoing the work — that's the cost the firm is paying.

The visitor has just answered an 8-step self-serve audit. Diagnose their specific situation:

  - The diagnosis must reference their engagement description directly. Quote or paraphrase the facts they gave you.
  - The "primary_gap" must be one of: source, review_state, client_context, handoff, multiple.
  - The "headline" is a single sentence diagnosing their core failure mode. Direct, professional, no marketing voice.
  - "diagnosis_paragraphs" is 3 – 5 short paragraphs (2 – 4 sentences each). Plain English, no bullet lists, no jargon.
  - "specific_examples" is 2 – 3 concrete situations the firm has likely already lived through, written in past tense and grounded in their engagement description.
  - "recommendations" is 3 – 5 actionable changes. For each, set "applicable_before_practiq": true when the firm can adopt the principle today using their current tools (templates, checklists, naming conventions), and false when the change actually requires platform-level memory or shared state to maintain.
  - "vertical_specific_note" is one paragraph addressing the professional standards / compliance regime relevant to their vertical (ABA 1.1/512 for law, AICPA SSTS + Circular 230 for CPA, ADA/Title VII/Local 144 for HR, FTC for marketing, fiduciary/board-readiness for consulting).

Hard constraints:
  - Do NOT promise specific Practiq features. The audit diagnoses the firm's workflow gaps and recommends principles. Practiq embodies those principles; the audit does not sell Practiq.
  - Do NOT fabricate facts about the firm. Only use what they said.
  - Do NOT use any of these words or phrases: game-changing, revolutionary, unlock, supercharge, seamless, transform your workflow, leverage, robust, cutting-edge, paradigm shift, synergy.
  - Tone is quiet, professional, boutique-trustworthy. The reader is a partner at a 6 – 50 person firm who has seen every consultant's pitch.
  - Never invent client names, dollar amounts, or named tools the firm didn't mention.`;

function buildUserPrompt(
  responses: AuditResponses,
  contact: ContactInfo,
): string {
  const ai =
    responses.current_ai_usage.join(", ") +
    (responses.current_ai_usage_specify
      ? ` (specified: ${responses.current_ai_usage_specify})`
      : "");
  const compliance =
    responses.compliance_concerns.length > 0
      ? responses.compliance_concerns.join(", ")
      : "none selected";
  return [
    `Firm: ${contact.firm_name}`,
    `Vertical: ${responses.firm_vertical}`,
    `Firm size: ${responses.firm_size}`,
    `Active client count: ${responses.client_count}`,
    "",
    "Recent engagement that took more reviewer time than it should have:",
    responses.recent_engagement,
    "",
    `Current AI usage: ${ai}`,
    `What gets lost in handoff: ${responses.handoff_gaps.join(", ")}`,
    `Repeat frequency: ${responses.repeat_frequency}`,
    `Where the reviewer feels it: ${responses.reviewer_pain}`,
    `Compliance standards in scope: ${compliance}`,
    "",
    "Diagnose their specific situation per the framework above. Use the submit_audit_report tool to return the structured result.",
  ].join("\n");
}

const REPORT_SCHEMA = {
  type: "object" as const,
  properties: {
    headline: { type: "string", maxLength: 240 },
    primary_gap: {
      type: "string",
      enum: ["source", "review_state", "client_context", "handoff", "multiple"],
    },
    diagnosis_paragraphs: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      items: { type: "string", maxLength: 1200 },
    },
    specific_examples: {
      type: "array",
      minItems: 2,
      maxItems: 3,
      items: { type: "string", maxLength: 600 },
    },
    recommendations: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          title: { type: "string", maxLength: 120 },
          body: { type: "string", maxLength: 800 },
          applicable_before_practiq: { type: "boolean" },
        },
        required: ["title", "body", "applicable_before_practiq"],
      },
    },
    vertical_specific_note: { type: "string", maxLength: 1000 },
  },
  required: [
    "headline",
    "primary_gap",
    "diagnosis_paragraphs",
    "specific_examples",
    "recommendations",
    "vertical_specific_note",
  ],
};

async function generateReport(
  responses: AuditResponses,
  contact: ContactInfo,
): Promise<AuditReport> {
  const provider = getClaudeProvider();
  const userPrompt = buildUserPrompt(responses, contact);
  const result = await provider.complete({
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
    maxTokens: 2500,
    // Pin the OpenRouter Anthropic model — provider abstraction handles
    // routing + fallback. See CLAUDE.md LLM API mandate.
    model: DEFAULT_MODEL_OPENROUTER,
    outputSchema: {
      name: "submit_audit_report",
      description:
        "Submit the diagnosed workflow audit report. Call this tool exactly once with all required fields populated.",
      schema: REPORT_SCHEMA,
    },
  });
  const parsed = JSON.parse(result.text) as AuditReport;
  // Defensive normalization — ensure the shape the renderer expects.
  return {
    headline: String(parsed.headline ?? "").slice(0, 240),
    primary_gap: (parsed.primary_gap ?? "multiple") as PrimaryGap,
    diagnosis_paragraphs: Array.isArray(parsed.diagnosis_paragraphs)
      ? parsed.diagnosis_paragraphs.map((p) => String(p))
      : [],
    specific_examples: Array.isArray(parsed.specific_examples)
      ? parsed.specific_examples.map((e) => String(e))
      : [],
    recommendations: Array.isArray(parsed.recommendations)
      ? parsed.recommendations.map((r) => ({
          title: String(r.title ?? ""),
          body: String(r.body ?? ""),
          applicable_before_practiq: !!r.applicable_before_practiq,
        }))
      : [],
    vertical_specific_note: String(parsed.vertical_specific_note ?? ""),
  };
}

function renderReportAsPlainText(report: AuditReport): string {
  const lines: string[] = [];
  lines.push(report.headline);
  lines.push("");
  lines.push(`Primary gap: ${report.primary_gap}`);
  lines.push("");
  lines.push("DIAGNOSIS");
  lines.push("─────────");
  for (const p of report.diagnosis_paragraphs) {
    lines.push(p);
    lines.push("");
  }
  if (report.specific_examples.length > 0) {
    lines.push("IN YOUR ENGAGEMENT SPECIFICALLY");
    lines.push("───────────────────────────────");
    for (const ex of report.specific_examples) {
      lines.push(`• ${ex}`);
    }
    lines.push("");
  }
  lines.push("WHAT TO CHANGE");
  lines.push("──────────────");
  report.recommendations.forEach((rec, i) => {
    lines.push(
      `${i + 1}. ${rec.title}${rec.applicable_before_practiq ? "  [do this today]" : ""}`,
    );
    lines.push(`   ${rec.body}`);
    lines.push("");
  });
  if (report.vertical_specific_note) {
    lines.push("PROFESSIONAL STANDARDS");
    lines.push("──────────────────────");
    lines.push(report.vertical_specific_note);
    lines.push("");
  }
  lines.push("—");
  lines.push("Practiq is pre-launch, looking for the first design partners");
  lines.push("in the 50 – 200 client range. $15/client/month at launch.");
  lines.push("Reply to this email if you'd like to talk.");
  return lines.join("\n");
}

function renderReportAsHtml(report: AuditReport): string {
  const esc = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  const paragraphs = report.diagnosis_paragraphs
    .map((p) => `<p style="margin:0 0 14px;color:#1f2937;line-height:1.6;">${esc(p)}</p>`)
    .join("");
  const examples = report.specific_examples
    .map(
      (ex) =>
        `<li style="margin:0 0 8px;color:#374151;line-height:1.5;">${esc(ex)}</li>`,
    )
    .join("");
  const recs = report.recommendations
    .map(
      (r, i) =>
        `<li style="margin:0 0 16px;color:#1f2937;line-height:1.5;">
           <strong>${i + 1}. ${esc(r.title)}</strong>${r.applicable_before_practiq ? ' <span style="font-size:11px;color:#059669;text-transform:uppercase;letter-spacing:0.05em;">— do this today</span>' : ""}<br/>
           <span style="color:#4b5563;">${esc(r.body)}</span>
         </li>`,
    )
    .join("");
  return `<!doctype html>
<html><body style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;background:#f9fafb;padding:32px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:8px;padding:32px;">
    <tr><td>
      <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.15em;color:#6b7280;">Practiq workflow audit</p>
      <h1 style="margin:0 0 24px;font-size:24px;line-height:1.25;color:#111827;">${esc(report.headline)}</h1>
      <p style="margin:0 0 20px;font-size:13px;color:#374151;"><strong>Primary gap:</strong> ${esc(report.primary_gap)}</p>
      <h2 style="margin:24px 0 12px;font-size:14px;text-transform:uppercase;letter-spacing:0.1em;color:#6b7280;">Diagnosis</h2>
      ${paragraphs}
      ${examples ? `<h2 style="margin:24px 0 12px;font-size:14px;text-transform:uppercase;letter-spacing:0.1em;color:#6b7280;">In your engagement specifically</h2><ul style="margin:0 0 20px;padding-left:20px;">${examples}</ul>` : ""}
      <h2 style="margin:24px 0 12px;font-size:14px;text-transform:uppercase;letter-spacing:0.1em;color:#6b7280;">What to change</h2>
      <ol style="margin:0 0 20px;padding-left:20px;">${recs}</ol>
      ${report.vertical_specific_note ? `<h2 style="margin:24px 0 12px;font-size:14px;text-transform:uppercase;letter-spacing:0.1em;color:#6b7280;">Professional standards</h2><p style="margin:0 0 20px;color:#1f2937;line-height:1.6;">${esc(report.vertical_specific_note)}</p>` : ""}
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;"/>
      <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.5;">
        Practiq is pre-launch, looking for the first design partners in the 50 – 200 client range. $15/client/month at launch. Reply to this email if you'd like to talk.
      </p>
    </td></tr>
  </table>
</body></html>`;
}

async function sendReportEmail(
  to: string,
  name: string,
  report: AuditReport,
): Promise<void> {
  const awsKey = process.env.AWS_ACCESS_KEY_ID;
  const awsSecret = process.env.AWS_SECRET_ACCESS_KEY;
  const fromEmail = process.env.SES_FROM_EMAIL || "hello@practiq.dev";
  if (!awsKey || !awsSecret) {
    console.warn("[workflow-audit] SES not configured, skipping email.");
    return;
  }
  const ses = new SESClient({
    region: process.env.AWS_SES_REGION || "us-east-1",
    credentials: { accessKeyId: awsKey, secretAccessKey: awsSecret },
  });
  const subject = `Your workflow audit — ${report.headline.slice(0, 80)}`;
  try {
    await ses.send(
      new SendEmailCommand({
        Source: fromEmail,
        Destination: { ToAddresses: [to] },
        Message: {
          Subject: { Data: subject },
          Body: {
            Text: { Data: `Hi ${name || "there"},\n\nHere's your audit:\n\n${renderReportAsPlainText(report)}` },
            Html: { Data: renderReportAsHtml(report) },
          },
        },
      }),
    );
  } catch (err) {
    console.error("[workflow-audit] SES error:", err);
  }
}

export async function POST(request: NextRequest) {
  // 10 audits / 10 min / IP. Generous enough for real visitors, low
  // enough to keep an LLM-spamming script from running up the bill.
  const rl = await checkRateLimit({
    namespace: "workflow-audit/generate",
    identity: identityFromRequest(request),
    limit: 10,
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
  const { responses, contact, attribution, pageUrl } = validated;

  // Generate the report via LLM — this is the critical-path slow step.
  let report: AuditReport;
  try {
    report = await generateReport(responses, contact);
  } catch (err) {
    console.error("[workflow-audit] generation failed:", err);
    return NextResponse.json(
      {
        error:
          "We couldn't generate your audit right now. Please try again in a moment.",
      },
      { status: 502 },
    );
  }

  // Persist to Supabase.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error("[workflow-audit] Missing Supabase env vars.");
    return NextResponse.json(
      { error: "Server configuration error." },
      { status: 500 },
    );
  }
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  const userAgent = request.headers.get("user-agent") ?? null;
  const ipCountry = request.headers.get("x-vercel-ip-country") ?? null;

  let auditRowId = "unknown";
  try {
    const insert = await supabase
      .from("workflow_audits")
      .insert({
        email: contact.email,
        name: contact.name,
        firm_name: contact.firm_name,
        firm_vertical: responses.firm_vertical,
        firm_size: responses.firm_size,
        client_count: responses.client_count,
        responses,
        report,
        landing_slug: attribution.landing_slug,
        source_platform: attribution.source_platform,
        source_post_id: attribution.source_post_id,
        lane: attribution.lane,
        campaign: attribution.campaign,
        topic: attribution.topic,
        user_agent: userAgent,
        ip_country: ipCountry,
      })
      .select("id")
      .single();
    if (insert.error) {
      console.error("[workflow-audit] Supabase insert error:", insert.error);
    } else if (insert.data?.id) {
      auditRowId = insert.data.id as string;
    }
  } catch (err) {
    console.error("[workflow-audit] Supabase exception:", err);
  }

  // Server-side analytics (ad-blocker-resistant).
  void trackEvent({
    type: "workflow_audit_completed",
    properties: {
      audit_id: auditRowId,
      primary_gap: report.primary_gap,
      firm_vertical: responses.firm_vertical,
      firm_size: responses.firm_size,
      client_count: responses.client_count,
      handoff_gaps: responses.handoff_gaps,
      reviewer_pain: responses.reviewer_pain,
      repeat_frequency: responses.repeat_frequency,
      compliance_concerns_count: responses.compliance_concerns.length,
      landing_slug: attribution.landing_slug,
      source_platform: attribution.source_platform,
      source_post_id: attribution.source_post_id,
      lane: attribution.lane ?? "practiq",
      campaign: attribution.campaign,
      topic: attribution.topic,
    },
    url: pageUrl,
    referrer: request.headers.get("referer"),
    userAgent,
    geoCountry: ipCountry,
  });

  // Slack notification for the operator.
  safeNotify("workflow_audit_completed", {
    email: contact.email,
    name: contact.name,
    firm_name: contact.firm_name,
    firm_vertical: responses.firm_vertical,
    firm_size: responses.firm_size,
    client_count: responses.client_count,
    primary_gap: report.primary_gap,
    landing_slug: attribution.landing_slug ?? "(direct)",
    source_platform: attribution.source_platform ?? "(direct)",
    headline: report.headline,
  });

  // Fire-and-forget email — don't block the response on SES.
  void sendReportEmail(contact.email, contact.name, report);

  return NextResponse.json({ id: auditRowId, report });
}
