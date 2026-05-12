/**
 * Definition of the 8 audit steps. Kept declarative so the renderer
 * stays dumb and the test surface (validation + step copy) lives in
 * one place.
 *
 * The order of options inside each step is operator-curated — the
 * "all_of_the_above" / "multiple" / "rarely" tail option is always
 * last so it does not bias the median respondent.
 */

import type {
  FirmVertical,
  FirmSize,
  ClientCount,
  AiUsage,
  HandoffGap,
  RepeatFrequency,
  ReviewerPain,
} from "./types";

export const FIRM_VERTICAL_OPTIONS: ReadonlyArray<{
  value: FirmVertical;
  label: string;
}> = [
  { value: "cpa", label: "CPA / accounting / tax" },
  { value: "law", label: "Law firm" },
  { value: "hr", label: "HR advisory / employment" },
  { value: "marketing", label: "Marketing / agency" },
  { value: "consulting", label: "Management consulting" },
  { value: "other", label: "Other professional services" },
];

export const FIRM_SIZE_OPTIONS: ReadonlyArray<{
  value: FirmSize;
  label: string;
}> = [
  { value: "solo", label: "Solo" },
  { value: "2-5", label: "2 – 5" },
  { value: "6-20", label: "6 – 20" },
  { value: "21-50", label: "21 – 50" },
  { value: "50+", label: "50+" },
];

export const CLIENT_COUNT_OPTIONS: ReadonlyArray<{
  value: ClientCount;
  label: string;
}> = [
  { value: "<20", label: "Under 20" },
  { value: "20-50", label: "20 – 50" },
  { value: "50-100", label: "50 – 100" },
  { value: "100-200", label: "100 – 200" },
  { value: "200+", label: "200+" },
];

export const AI_USAGE_OPTIONS: ReadonlyArray<{ value: AiUsage; label: string }> =
  [
    { value: "chatgpt_or_claude", label: "ChatGPT / Claude (general)" },
    {
      value: "domain_saas",
      label: "A domain-specific SaaS with AI features",
    },
    {
      value: "embedded_copilot",
      label: "An embedded copilot (Word / Google Docs / Notion AI / etc.)",
    },
    { value: "internal_tools", label: "Internal tools the firm built" },
    { value: "none", label: "Nothing yet" },
  ];

export const HANDOFF_GAP_OPTIONS: ReadonlyArray<{
  value: HandoffGap;
  label: string;
}> = [
  { value: "source", label: "Source / provenance of facts" },
  { value: "review_state", label: "Review state (who approved what)" },
  { value: "client_context", label: "Client-specific context and prior decisions" },
  { value: "next_step_ownership", label: "Next-step ownership" },
  { value: "all_of_the_above", label: "All of the above" },
];

export const REPEAT_FREQUENCY_OPTIONS: ReadonlyArray<{
  value: RepeatFrequency;
  label: string;
}> = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "rarely", label: "Rarely" },
];

export const REVIEWER_PAIN_OPTIONS: ReadonlyArray<{
  value: ReviewerPain;
  label: string;
}> = [
  { value: "partner_redoes", label: "Partner / senior re-does too much of the work" },
  {
    value: "partner_cannot_sign_off",
    label: "Partner cannot sign off without re-doing the analysis",
  },
  {
    value: "team_handoff_breaks",
    label: "Handoff between team members breaks down",
  },
  {
    value: "training_new_staff_slow",
    label: "Training new staff is slow because context lives in heads",
  },
  { value: "multiple", label: "Multiple of the above" },
];

/**
 * Compliance concern checklists are vertical-aware. The renderer picks
 * the list that matches the chosen `firm_vertical` (defaulting to
 * the general set when the vertical is "other" or unset).
 */
export const COMPLIANCE_CONCERNS_BY_VERTICAL: Record<
  FirmVertical,
  ReadonlyArray<{ value: string; label: string }>
> = {
  cpa: [
    { value: "aicpa_ssts", label: "AICPA Statements on Standards for Tax Services" },
    { value: "pcaob_audit_evidence", label: "PCAOB audit-evidence requirements" },
    { value: "irs_circular_230", label: "IRS Circular 230" },
    { value: "sox_sec", label: "SOX / SEC-registrant work" },
    { value: "state_board_cpa", label: "State Board of Accountancy rules" },
  ],
  law: [
    { value: "aba_model_rule_1_1", label: "ABA Model Rule 1.1 (competence)" },
    {
      value: "aba_model_rule_5_3",
      label: "ABA Model Rule 5.3 (responsibilities re: nonlawyer assistance)",
    },
    {
      value: "aba_formal_opinion_512",
      label: "ABA Formal Opinion 512 (generative AI)",
    },
    { value: "privilege_workproduct", label: "Privilege / work-product doctrine" },
    { value: "state_bar_uplunlicensed", label: "State bar UPL / unlicensed-practice rules" },
  ],
  hr: [
    { value: "title_vii", label: "Title VII / disparate impact" },
    { value: "ada", label: "ADA" },
    { value: "fcra_consumer_reports", label: "FCRA (background / consumer reports)" },
    {
      value: "nyc_local_144",
      label: "NYC Local Law 144 / state automated-decision rules",
    },
    { value: "multi_state_employment", label: "Multi-state employment-law variance" },
  ],
  marketing: [
    { value: "ftc_endorsement", label: "FTC endorsement / disclosure guides" },
    { value: "claims_substantiation", label: "Claims substantiation" },
    { value: "copyright", label: "Copyright / training-data exposure" },
    { value: "privacy_ccpa_gdpr", label: "Privacy (CCPA / GDPR)" },
    { value: "brand_voice_drift", label: "Brand-voice drift across clients" },
  ],
  consulting: [
    {
      value: "client_confidentiality",
      label: "Client confidentiality / NDA exposure",
    },
    {
      value: "deliverable_provenance",
      label: "Deliverable provenance for board / regulator audiences",
    },
    {
      value: "cross_client_leakage",
      label: "Cross-client data leakage through shared models",
    },
    { value: "engagement_letter", label: "Engagement-letter scope" },
  ],
  other: [
    { value: "client_confidentiality", label: "Client confidentiality" },
    { value: "deliverable_provenance", label: "Deliverable provenance" },
    { value: "regulatory_audit", label: "Regulatory / external-audit exposure" },
    { value: "privacy", label: "Privacy / data-handling rules" },
  ],
};

export interface StepDescriptor {
  /** 1-indexed for human-facing "Step N of 8" copy. */
  index: number;
  /** Internal id for analytics events. */
  id: string;
  /** Question shown above the inputs. */
  title: string;
  /** Optional helper text. */
  description?: string;
}

export const STEPS: ReadonlyArray<StepDescriptor> = [
  {
    index: 1,
    id: "firm_basics",
    title: "Tell us about the firm.",
    description:
      "We use this to tailor the audit to your professional standards and reviewer model.",
  },
  {
    index: 2,
    id: "recent_engagement",
    title: "Describe a recent engagement that took more reviewer time than it should have.",
    description:
      "2 – 3 sentences is plenty. What was the deliverable, where did it stall, and who had to redo what?",
  },
  {
    index: 3,
    id: "current_ai_usage",
    title: "How is AI currently being used in the work?",
    description: "Select everything that applies.",
  },
  {
    index: 4,
    id: "handoff_gaps",
    title: "What tends to get lost when one person hands work to another?",
    description: "Select everything that applies.",
  },
  {
    index: 5,
    id: "repeat_frequency",
    title: "How often does the same gap repeat?",
  },
  {
    index: 6,
    id: "reviewer_pain",
    title: "Where does the reviewer feel it most?",
  },
  {
    index: 7,
    id: "compliance_concerns",
    title: "Which professional standards do you have to defend the work against?",
    description: "Select everything that applies.",
  },
  {
    index: 8,
    id: "email_gate",
    title: "Where should we send the full report?",
    description:
      "We will email you a copy. Pre-launch — we read every audit and reply personally.",
  },
];
