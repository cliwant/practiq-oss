/**
 * Workflow output quality evals (4 cases — one per built-in workflow).
 *
 * For each workflow we feed canonical inputs (synthesized as plain-text
 * blobs the model treats like uploaded docs), run the workflow's
 * `system_prompt_fragment`, and grade the output:
 *
 *   1. Structural assertion: the response contains all the required
 *      sections / sub-claims (substring-checked, case-insensitive).
 *   2. Prompt-graded score: a separate Claude call rates the output
 *      1-5 on (a) structural correctness and (b) relevance. ≥4 = pass.
 *
 * A workflow case passes iff structural-assertion=true AND grader≥4.
 *
 * Suite passes overall iff ≥3/4 cases pass.
 */
import Anthropic from "@anthropic-ai/sdk";
import { BUILTIN_WORKFLOWS, type Workflow } from "../../src/lib/workflows/builtin";
import type { EvalCaseResult } from "./types";

interface WorkflowCase {
  workflowSlug: string;
  inputDocs: string;
  /** Required substrings (lower-case) — at least one from each group must be present. */
  required: string[][];
}

const CASES: WorkflowCase[] = [
  {
    workflowSlug: "cpa-monthly-close",
    inputDocs: `[engagement-letter.docx]
Materiality threshold: $10,000. Quarterly review. Annual tax prep.

[Q1-trial-balance.csv]
Account, Q1 Balance, Prior Q4 Balance
Cash,         145000,        130000
A/R,          82000,         55000
Inventory,    210000,        180000
A/P,          92000,         71000
Sales,        650000,        520000
COGS,         390000,        302000
Rent,         24000,         24000
Misc,         18500,         3200`,
    required: [
      ["variance", "% change", "vs prior"],
      ["materiality", "10,000", "threshold"],
      ["reclassif", "reclass"],
    ],
  },
  {
    workflowSlug: "hr-onboarding-checklist",
    inputDocs: `[role-spec.pdf]
Role: Senior Engineer
Location: Texas
Start date: May 1, 2026
Salary: $185,000
Benefits: Standard package (health, dental, 401k 4% match)`,
    required: [
      ["W-4", "I-9", "tax form"],
      ["benefit", "enrollment"],
      ["IT", "payroll", "equipment"],
    ],
  },
  {
    workflowSlug: "legal-engagement-letter-redline",
    inputDocs: `[draft-engagement.docx]
Section 3: Fees. Hourly rate $450. Retainer $5,000. Late fee 2%.
Section 5: Jurisdiction. Disputes resolved per California law.
Section 8: Termination. 14 days notice.

[firm-template.docx]
Section 3: Fees. Hourly rate as agreed in Schedule A. Retainer per Schedule A. Late fee 1.5% per month.
Section 5: Jurisdiction. Disputes resolved per the law of the firm's principal place of business.
Section 8: Termination. 30 days notice.`,
    required: [
      ["deviat", "differ", "vary"],
      ["jurisdict"],
      ["fee", "retainer", "rate"],
    ],
  },
  {
    workflowSlug: "marketing-campaign-brief",
    inputDocs: `[client-brief.pdf]
Client: GreenLeaf Organics, a DTC organic snack brand.
Objective: Drive Q3 revenue +25%.
Audience: Women 28-45, health-conscious, urban.
Budget: $150,000.
Timeline: July-September.`,
    required: [
      ["audience", "target"],
      ["KPI", "metric", "indicator"],
      ["measure", "measurement", "tracking"],
    ],
  },
];

interface RunOpts {
  client: Anthropic;
  model: string;
  pricingInputPerM: number;
  pricingOutputPerM: number;
}

export async function runWorkflowOutputSuite(
  opts: RunOpts,
): Promise<EvalCaseResult[]> {
  const out: EvalCaseResult[] = [];
  for (const c of CASES) {
    const wf = BUILTIN_WORKFLOWS.find((w) => w.slug === c.workflowSlug);
    if (!wf) {
      out.push({
        suite: "workflow_output",
        caseId: c.workflowSlug,
        passed: false,
        axes: { error: "workflow_not_found" },
        notes: `workflow '${c.workflowSlug}' not in BUILTIN_WORKFLOWS`,
        costUsd: 0,
        durationMs: 0,
      });
      continue;
    }
    const startedAt = Date.now();
    const { output, costUsd: runCost } = await runWorkflow(opts, wf, c.inputDocs);
    const structuralOk = scoreStructure(output, c.required);
    const { score: graderScore, costUsd: gradeCost } = await graderScore_(
      opts,
      wf,
      output,
    );
    const passed = structuralOk && graderScore >= 4;
    const totalCost = runCost + gradeCost;
    out.push({
      suite: "workflow_output",
      caseId: c.workflowSlug,
      passed,
      axes: {
        structural_ok: structuralOk,
        grader_score: graderScore,
        output_chars: output.length,
      },
      notes: `${wf.name} → grader=${graderScore}/5, structural=${structuralOk}`,
      costUsd: totalCost,
      durationMs: Date.now() - startedAt,
    });
    console.log(
      `[workflow] ${c.workflowSlug} ${passed ? "PASS" : "FAIL"} structural=${structuralOk} grader=${graderScore} ($${totalCost.toFixed(4)})`,
    );
  }
  return out;
}

async function runWorkflow(
  opts: RunOpts,
  wf: Workflow,
  inputDocs: string,
): Promise<{ output: string; costUsd: number }> {
  const res = await opts.client.messages.create({
    model: opts.model,
    max_tokens: 2000,
    system: wf.system_prompt_fragment,
    messages: [
      {
        role: "user",
        content: `Below are the source documents for this workflow. Produce the deliverable described in your instructions. Use [N] citations where appropriate.\n\n${inputDocs}`,
      },
    ],
  });
  const text = res.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("");
  const inputTokens = res.usage?.input_tokens ?? 0;
  const outputTokens = res.usage?.output_tokens ?? 0;
  const costUsd =
    (inputTokens * opts.pricingInputPerM) / 1_000_000 +
    (outputTokens * opts.pricingOutputPerM) / 1_000_000;
  return { output: text, costUsd };
}

function scoreStructure(output: string, required: string[][]): boolean {
  const lower = output.toLowerCase();
  for (const group of required) {
    const hit = group.some((needle) => lower.includes(needle.toLowerCase()));
    if (!hit) return false;
  }
  return true;
}

async function graderScore_(
  opts: RunOpts,
  wf: Workflow,
  output: string,
): Promise<{ score: number; costUsd: number }> {
  const res = await opts.client.messages.create({
    model: opts.model,
    max_tokens: 200,
    system: `You are a strict grader. Read a workflow output and rate it on a 1-5 integer scale where 5 = excellent (all required structural elements present, on-topic, actionable), 3 = acceptable but missing minor elements, 1 = wrong format or off-topic. Reply with ONLY a single integer 1-5. No prose, no explanation.`,
    messages: [
      {
        role: "user",
        content: `Workflow: ${wf.name}\nDescription: ${wf.description}\n\nOutput to grade:\n\n${output.slice(0, 6000)}\n\nReply with one integer 1-5.`,
      },
    ],
  });
  const text = res.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();
  const m = text.match(/[1-5]/);
  const score = m ? Number(m[0]) : 0;
  const inputTokens = res.usage?.input_tokens ?? 0;
  const outputTokens = res.usage?.output_tokens ?? 0;
  const costUsd =
    (inputTokens * opts.pricingInputPerM) / 1_000_000 +
    (outputTokens * opts.pricingOutputPerM) / 1_000_000;
  return { score, costUsd };
}

export const WORKFLOW_CASE_COUNT = CASES.length;
