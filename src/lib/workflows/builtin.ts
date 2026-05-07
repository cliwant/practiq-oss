/**
 * Built-in vertical workflows.
 *
 * Each workflow expresses domain expertise as a markdown prompt fragment
 * + a hint of which tools the operator's chat will likely lean on. Adding
 * a new workflow = appending a row here. There is no per-workflow code
 * path — the chat handler runs the same loop with the seeded fragment
 * already on the conversation.
 *
 * The seed is delivered to the chat by creating a brand-new Conversation
 * and writing the workflow framing as the first ConversationMessage so
 * that the chat handler picks it up via its priorMessages window. The
 * model then has the fragment as cold context before the operator types
 * their first message.
 */
export type Vertical =
  | "cpa"
  | "hr"
  | "legal"
  | "marketing-agency";

export interface Workflow {
  slug: string;
  name: string;
  vertical: Vertical;
  description: string;
  /**
   * Markdown system-prompt fragment. Prepended to the chat as the first
   * synthetic operator turn so the model gains domain framing before the
   * real prompt arrives.
   */
  system_prompt_fragment: string;
  /**
   * Tools the operator is likely to need. Surfaced in the workflow card
   * so reviewers can see what the agent can and cannot do.
   */
  suggested_tools: string[];
  /** Single example input string for the workflow card UI. */
  example_inputs: string[];
}

export const BUILTIN_WORKFLOWS: Workflow[] = [
  {
    slug: "cpa-monthly-close",
    name: "Monthly close memo + redline",
    vertical: "cpa",
    description:
      "Generate monthly close memo with redline review against prior period.",
    system_prompt_fragment: `You are reviewing a CPA firm's monthly close package. Ingest the engagement letter, prior-period workpapers, and current-period trial balance. Identify: (1) variances >10% from prior period (cite specific accounts), (2) accounts requiring partner review (per engagement-letter materiality threshold), (3) reclassifications since last period. Output: structured close memo (markdown) PLUS, if engagement letter is provided as DOCX, use edit_document to insert tracked-changes redline of the engagement letter's "scope of services" section if scope has drifted from current work.`,
    suggested_tools: ["read_document", "find_in_document", "edit_document"],
    example_inputs: [
      "Upload engagement-letter.docx + Q1-trial-balance.pdf + prior-period-workpapers.pdf",
    ],
  },
  {
    slug: "hr-onboarding-checklist",
    name: "Role-specific onboarding checklist",
    vertical: "hr",
    description:
      "Generate role-specific onboarding sequence with vendor-coordination redlines.",
    system_prompt_fragment: `You are HR-consulting an onboarding checklist for {role} at {client_company}. Reference the firm's standard onboarding template (uploaded). Customize for: state law (W-4, I-9, state-specific), benefits enrollment timing, IT/payroll/equipment vendor handoffs. Output: 30-60-90 day checklist (markdown) + if firm template DOCX provided, use edit_document to track-redline customizations specific to this client.`,
    suggested_tools: ["read_document", "find_in_document", "edit_document"],
    example_inputs: ["Upload onboarding-template.docx + role-spec.pdf"],
  },
  {
    slug: "legal-engagement-letter-redline",
    name: "Engagement letter redline",
    vertical: "legal",
    description:
      "Redline engagement letter against firm template + jurisdiction-specific updates.",
    system_prompt_fragment: `You are reviewing an engagement letter draft for a boutique law firm. Compare against the firm's template (uploaded). Identify: (1) clauses that deviate from template (with citation), (2) jurisdiction-specific edits required (state bar rules), (3) fee-arrangement language (hourly vs fixed vs contingency clarity). Output: redlined DOCX via edit_document tool with reasoning per change. NEVER alter substantive scope without explicit operator approval — flag scope-drift in the response, do not auto-redline scope.`,
    suggested_tools: ["read_document", "find_in_document", "edit_document"],
    example_inputs: ["Upload draft-engagement.docx + firm-template.docx"],
  },
  {
    slug: "marketing-campaign-brief",
    name: "Campaign brief + KPI checklist",
    vertical: "marketing-agency",
    description: "Generate creative brief + KPI checklist + redlined SOW.",
    system_prompt_fragment: `You are scoping a marketing campaign for a boutique agency client. Inputs: client business profile, campaign objective, target audience. If a draft SOW DOCX is uploaded, redline it. Output: (1) creative brief (audience, message, tone, deliverables), (2) KPI checklist (leading indicators + lagging indicators with measurement plan), (3) redlined SOW via edit_document with tracked-changes for scope/budget/timeline clarifications. Cite source: when client info comes from uploaded docs, use [N] citations.`,
    suggested_tools: ["read_document", "find_in_document", "edit_document"],
    example_inputs: ["Upload client-brief.pdf + draft-SOW.docx"],
  },
];

export function getWorkflowBySlug(slug: string): Workflow | undefined {
  return BUILTIN_WORKFLOWS.find((w) => w.slug === slug);
}
