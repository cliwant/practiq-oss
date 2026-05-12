/**
 * Shape of the data the self-serve workflow audit collects and returns.
 *
 * The form fields and report schema are deliberately kept in this single
 * file so the client component, the API route, and the Supabase column
 * mapping all agree on the contract. The server-side route additionally
 * re-validates everything before insert / LLM call.
 */

export type FirmVertical =
  | "cpa"
  | "law"
  | "hr"
  | "marketing"
  | "consulting"
  | "other";

export type FirmSize = "solo" | "2-5" | "6-20" | "21-50" | "50+";

export type ClientCount = "<20" | "20-50" | "50-100" | "100-200" | "200+";

export type AiUsage =
  | "chatgpt_or_claude"
  | "domain_saas"
  | "embedded_copilot"
  | "internal_tools"
  | "none";

export type HandoffGap =
  | "source"
  | "review_state"
  | "client_context"
  | "next_step_ownership"
  | "all_of_the_above";

export type RepeatFrequency = "weekly" | "monthly" | "quarterly" | "rarely";

export type ReviewerPain =
  | "partner_redoes"
  | "partner_cannot_sign_off"
  | "team_handoff_breaks"
  | "training_new_staff_slow"
  | "multiple";

export interface AuditResponses {
  firm_vertical: FirmVertical | "";
  firm_size: FirmSize | "";
  client_count: ClientCount | "";
  recent_engagement: string;
  current_ai_usage: AiUsage[];
  current_ai_usage_specify: string;
  handoff_gaps: HandoffGap[];
  repeat_frequency: RepeatFrequency | "";
  reviewer_pain: ReviewerPain | "";
  compliance_concerns: string[];
}

export interface ContactInfo {
  name: string;
  email: string;
  firm_name: string;
}

export interface SnsAttribution {
  landing_slug: string | null;
  source_platform: string | null;
  source_post_id: string | null;
  lane: string | null;
  campaign: string | null;
  topic: string | null;
}

export type PrimaryGap =
  | "source"
  | "review_state"
  | "client_context"
  | "handoff"
  | "multiple";

export interface AuditRecommendation {
  title: string;
  body: string;
  applicable_before_practiq: boolean;
}

export interface AuditReport {
  headline: string;
  primary_gap: PrimaryGap;
  diagnosis_paragraphs: string[];
  specific_examples: string[];
  recommendations: AuditRecommendation[];
  vertical_specific_note: string;
}

export interface GenerateAuditRequest {
  responses: AuditResponses;
  contact: ContactInfo;
  attribution: SnsAttribution;
  page_url: string;
}

export interface GenerateAuditResponse {
  id: string;
  report: AuditReport;
}
