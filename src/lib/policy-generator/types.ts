/**
 * Shared types for the AI Policy Generator.
 *
 * The form responses, the LLM output, and the persisted row all use
 * these shapes so the boundary between client → API → Supabase is
 * statically checked.
 */
import type { Vertical } from "./frameworks";

export type AiToolUsage =
  | "chatgpt"
  | "claude"
  | "copilot"
  | "domain_saas"
  | "none"
  | "exploring";

export type SensitiveDataCategory =
  | "client_financial"
  | "medical_hipaa"
  | "attorney_privileged"
  | "pii"
  | "trade_secrets"
  | "none";

export type ApprovalWorkflow =
  | "partner_approved"
  | "blanket"
  | "case_by_case"
  | "prohibited_client_facing";

export type DisclosurePreference =
  | "always"
  | "on_request"
  | "internal_only"
  | "undecided";

export interface PolicyGeneratorFormState {
  vertical: Vertical;
  firmName: string;
  firmSize: string;
  states: string[];
  licenseType: string;
  aiUsage: AiToolUsage[];
  sensitiveData: SensitiveDataCategory[];
  approvalWorkflow: ApprovalWorkflow;
  disclosurePreference: DisclosurePreference;
  name: string;
  email: string;
}

export interface PolicySection {
  heading: string;
  body: string;
  applies_to?: string;
}

export interface GeneratedPolicy {
  policy_title: string;
  preamble: string;
  sections: PolicySection[];
  key_obligations: string[];
  review_cycle: string;
  footer_disclaimer: string;
}

export interface PolicyGenerationResponse {
  policy: GeneratedPolicy;
  pdf_url: string | null;
  id: string;
}
