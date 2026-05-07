/**
 * Shared eval types — one shape so the runner in eval-live.ts can mix
 * suites and emit a single trend-tracking JSON file.
 */
export interface EvalCaseResult {
  suite: "citation_grounding" | "docx_redline" | "workflow_output";
  caseId: string;
  passed: boolean;
  axes: Record<string, boolean | number | string>;
  /** Free-form notes for the human reading the report. */
  notes: string;
  /** USD spent on Anthropic calls for this case. */
  costUsd: number;
  durationMs: number;
}

export interface SuiteResult {
  name: string;
  cases: EvalCaseResult[];
  passRate: number;
  totalCostUsd: number;
}
