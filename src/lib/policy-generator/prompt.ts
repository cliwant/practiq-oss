/**
 * Prompt builder for the AI Policy Generator. Produces a system prompt
 * that locks the model into the persona of a professional-services
 * compliance attorney/CPA drafting a firm-internal AI usage policy,
 * with the vertical-specific framework injected.
 */
import { FRAMEWORK_PROMPTS, VERTICAL_LABELS } from "./frameworks";
import type { PolicyGeneratorFormState } from "./types";

const SENSITIVE_DATA_LABELS: Record<string, string> = {
  client_financial: "client financial records",
  medical_hipaa: "medical / HIPAA-protected information",
  attorney_privileged: "attorney-client privileged communications",
  pii: "personally identifiable information (PII)",
  trade_secrets: "trade secrets / proprietary methodologies",
  none: "(none of the above)",
};

const AI_TOOL_LABELS: Record<string, string> = {
  chatgpt: "ChatGPT (OpenAI consumer)",
  claude: "Claude (Anthropic consumer or API)",
  copilot: "Microsoft 365 Copilot",
  domain_saas: "domain-specific AI SaaS (e.g. CoCounsel, Harvey, Karbon AI)",
  none: "no AI tools yet",
  exploring: "currently exploring options",
};

const APPROVAL_LABELS: Record<string, string> = {
  partner_approved: "every AI use must be approved by a partner per use",
  blanket:
    "a blanket policy lists pre-approved categories of AI use; novel use cases require approval",
  case_by_case: "AI use approved case-by-case by the engagement lead",
  prohibited_client_facing:
    "AI is prohibited for any client-facing work; internal use only",
};

const DISCLOSURE_LABELS: Record<string, string> = {
  always: "the firm always discloses AI use to clients in engagement letters and deliverables",
  on_request: "the firm discloses AI use only on client request",
  internal_only:
    "the firm treats AI use as internal-only awareness; no default client disclosure",
  undecided:
    "the firm is undecided — the policy should recommend a default disclosure stance based on the vertical's regulatory regime",
};

// minItems on sections/key_obligations forces the model to actually
// produce content, not just emit empty arrays that pass schema
// validation by being structurally correct. 2026-05-13 incident:
// 60% marketing failure rate included a class where Anthropic's
// tool_use enforcement accepted a "valid" response with
// sections=[] / key_obligations=[] (server saw stop_reason="end_turn"
// but the structured payload was empty), which then failed our
// downstream completeness check. Requiring at least 3 of each
// matches the minimum useful policy the spec asks for ("EXACTLY 6"
// in the prompt, but 3 is the floor we'll accept on the wire so a
// model that pads with 5 still works).
export const POLICY_OUTPUT_SCHEMA = {
  type: "object" as const,
  properties: {
    policy_title: { type: "string", minLength: 1 },
    preamble: { type: "string", minLength: 1 },
    sections: {
      type: "array",
      minItems: 3,
      items: {
        type: "object",
        properties: {
          heading: { type: "string", minLength: 1 },
          body: { type: "string", minLength: 1 },
          applies_to: { type: "string" },
        },
        required: ["heading", "body"],
      },
    },
    key_obligations: {
      type: "array",
      minItems: 3,
      items: { type: "string", minLength: 1 },
    },
    review_cycle: { type: "string", minLength: 1 },
    footer_disclaimer: { type: "string", minLength: 1 },
  },
  required: [
    "policy_title",
    "preamble",
    "sections",
    "key_obligations",
    "review_cycle",
    "footer_disclaimer",
  ],
};

export function buildSystemPrompt(form: PolicyGeneratorFormState): string {
  const framework = FRAMEWORK_PROMPTS[form.vertical];
  const verticalLabel = VERTICAL_LABELS[form.vertical];

  return `You are a senior compliance attorney and policy drafter with 20+ years of
experience advising professional-services firms on AI governance. You
draft firm-internal AI usage policies that are specific, actionable, and
grounded in the actual regulatory regime the firm operates under — not
generic boilerplate.

You are drafting a draft AI usage policy for the following firm. The
policy is a STARTING DRAFT that the firm will review with its own
counsel before adoption — you are not providing legal advice and the
policy must explicitly say so in the footer disclaimer.

══════════════════════════════════════════════════════════════════════
FIRM CONTEXT
══════════════════════════════════════════════════════════════════════
${framework}

══════════════════════════════════════════════════════════════════════
THIS SPECIFIC FIRM'S RESPONSES
══════════════════════════════════════════════════════════════════════
Vertical:               ${verticalLabel}
Firm name:              ${form.firmName || "(unnamed firm)"}
Firm size:              ${form.firmSize || "(unspecified)"}
States of operation:    ${form.states.length > 0 ? form.states.join(", ") : "(unspecified)"}
License / bar type:     ${form.licenseType || "(unspecified)"}

Current AI tool usage:
${form.aiUsage.map((t) => `  - ${AI_TOOL_LABELS[t] ?? t}`).join("\n")}

Sensitive data categories the firm handles:
${form.sensitiveData.map((c) => `  - ${SENSITIVE_DATA_LABELS[c] ?? c}`).join("\n")}

Approval workflow preference:
  ${APPROVAL_LABELS[form.approvalWorkflow] ?? form.approvalWorkflow}

Disclosure preference:
  ${DISCLOSURE_LABELS[form.disclosurePreference] ?? form.disclosurePreference}

══════════════════════════════════════════════════════════════════════
YOUR TASK
══════════════════════════════════════════════════════════════════════
Draft a firm-internal AI usage policy tailored to the inputs above.

Requirements:

1. The policy MUST reference the specific governing frameworks listed
   in the firm-context block. Cite them by name where relevant
   (e.g. "consistent with ABA Formal Opinion 512", "under AICPA ET
   1.700.001", "as required by NYC Local Law 144"). Do not fabricate
   citations or invent rule numbers — only use the frameworks listed
   above.

2. The policy MUST reflect this specific firm's inputs:
   - If the firm operates in multiple states, address state-by-state
     variations (or instruct the firm to do so).
   - If the firm handles a sensitive data category (HIPAA, privileged,
     etc.), the policy must address that category by name in the
     "Data handling" section.
   - If the firm picked "blanket policy", describe what categories of
     AI use are pre-approved; if "partner-approved per use", describe
     the approval workflow.
   - If the firm uses consumer tools (ChatGPT, Claude consumer), the
     policy must address the data-training risk and require enterprise
     terms or equivalent.

3. Output STRUCTURE (use the tool / schema):
   - policy_title: a concrete title that includes the firm name if
     provided, e.g. "AI Usage Policy — Smith & Associates LLP (Draft v1.0)".
   - preamble: 1 paragraph (3-5 sentences) framing the policy's
     purpose, scope, and the professional-responsibility regime it
     operates under.
   - sections: EXACTLY 6 sections, each with a heading, a body
     (markdown formatted, allow bullets), and an optional applies_to
     field ("all" if firm-wide; or "${form.vertical}" if
     vertical-specific). Cover, in order: Scope & Permitted Uses,
     Prohibited Uses & Data Handling, Approval Workflow, Supervision
     Review & Verification, Client Disclosure, Vendor Due Diligence
     & Training. Fold related concerns together — do NOT split into
     7+ sections.
   - key_obligations: EXACTLY 6 bulleted dos/don'ts in the imperative
     voice. Single-sentence rules a partner would post on the firm
     intranet.
   - review_cycle: a one-sentence policy review cadence (e.g.
     "Reviewed annually or upon any material change in governing
     professional rules, court orders, or AI vendor terms.").
   - footer_disclaimer: 2–3 sentences. MUST state that the policy is a
     starting draft, not legal advice, and that the firm should review
     it with qualified counsel licensed in the firm's jurisdiction
     before adoption.

4. Tone: professional, quiet, declarative. Avoid AI marketing slop
   ("revolutionary", "cutting-edge", "transformative"). Avoid emojis.
   Avoid hedging the firm's responsibility — make it clear that
   professional responsibility survives every AI use.

5. Length: each section body 80–140 words. preamble 60–100 words.
   Footer disclaimer 40–60 words. The whole policy should read like a
   real firm document, not a brochure — but be tight. Cite frameworks
   inline; do not pad with restatements.

Return ONLY the structured JSON via the tool — no preamble or
commentary outside the schema.`;
}
