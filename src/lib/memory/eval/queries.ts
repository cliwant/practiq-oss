/**
 * Eval queries — 30 questions (10 per persona) where each query is
 * paired with a list of `expectedFactKeys` that MUST appear (via
 * keyword match against the corresponding context content / fact
 * value / digest line) for the query to be considered "answerable
 * from the prompt alone".
 *
 * Recall scoring:
 *   - For each query, walk every expectedFactKey.
 *   - Find that key's "evidence string" in the corpus (the text we
 *     stored when annotating).
 *   - Check whether the composed prompt contains *any* substring of
 *     that evidence string ≥ 25 chars (case-insensitive).
 *   - Per-query recall = matched / expected.
 *   - Cell-level recall = mean of per-query recalls.
 *
 * Coverage by tier:
 *   - T0-only: 6 / 30 queries answerable (profile + preference questions)
 *   - T0+T1+T4: 18 / 30 (add digest + firm patterns)
 *   - Full 5-tier: 30 / 30 (vector + episodic complete the long tail)
 *
 * The eval is deterministic — same corpus + same composer → same
 * recall numbers every time.
 */

export interface EvalQuery {
  /** Persona this query targets. */
  personaId: "kim-rest" | "techstart" | "downtown-med";
  /** What the human asks the agent. */
  question: string;
  /** Optional sub-query the composer uses for T2 (vector tier). */
  vectorQuery?: string;
  /** Fact keys (from corpus.ts annotations) that must surface for the
   *  question to be answerable. */
  expectedFactKeys: string[];
}

export const QUERIES: readonly EvalQuery[] = [
  // ── Kim's Restaurant — 10 queries ─────────────────────────────
  {
    personaId: "kim-rest",
    question: "How does the owner prefer to receive reports?",
    vectorQuery: "owner communication tone preference",
    expectedFactKeys: ["owner-prefers-casual"],
  },
  {
    personaId: "kim-rest",
    question: "When is the owner's birthday and what's the impact?",
    vectorQuery: "owner birthday discount promotion",
    expectedFactKeys: ["owner-birthday-march-15"],
  },
  {
    personaId: "kim-rest",
    question: "Did the March 2026 monthly close happen?",
    vectorQuery: "March monthly close approval",
    expectedFactKeys: ["march-close-completed", "march-net-margin-32"],
  },
  {
    personaId: "kim-rest",
    question: "What's the typical seasonal food cost variance?",
    vectorQuery: "food cost variance seasonal pattern",
    expectedFactKeys: ["food-cost-march-pattern", "pattern-food-cost-seasonality"],
  },
  {
    personaId: "kim-rest",
    question: "What's pending with the new ingredient supplier?",
    vectorQuery: "supplier negotiation bulk discount",
    expectedFactKeys: ["supplier-negotiation-pending", "supplier-discount-8pct"],
  },
  {
    personaId: "kim-rest",
    question: "What's the lease rate and expiration?",
    vectorQuery: "Mission St lease cost expiration",
    expectedFactKeys: ["lease-monthly-12000", "lease-expires-2027"],
  },
  {
    personaId: "kim-rest",
    question:
      "How should I categorize a $2,300 protein order from a new supplier?",
    vectorQuery: "categorization food cost reclassification rule",
    expectedFactKeys: ["pattern-fnb-cogs-reclass"],
  },
  {
    personaId: "kim-rest",
    question: "What was the Q4 2025 holiday catering margin?",
    vectorQuery: "Q4 2025 holiday catering margin",
    expectedFactKeys: ["holiday-catering-margin-22"],
  },
  {
    personaId: "kim-rest",
    question: "What's the next quarterly estimated tax payment?",
    vectorQuery: "Q2 estimated tax payment due",
    expectedFactKeys: ["q2-estimated-tax-4200"],
  },
  {
    personaId: "kim-rest",
    question:
      "What did the operator decide about the supplier follow-up email last week?",
    vectorQuery: "supplier email approval decision",
    expectedFactKeys: ["supplier-negotiation-pending"],
  },

  // ── TechStart Inc. — 10 queries ───────────────────────────────
  {
    personaId: "techstart",
    question: "What's the current MRR and runway?",
    vectorQuery: "MRR runway burn current state",
    expectedFactKeys: ["tech-mrr-145k", "tech-runway-12-4mo"],
  },
  {
    personaId: "techstart",
    question: "When is the Series A target close?",
    vectorQuery: "Series A funding target timing",
    expectedFactKeys: ["series-a-q3-2026"],
  },
  {
    personaId: "techstart",
    question: "Who churned in February and what was the impact?",
    vectorQuery: "churn February customer downgrade",
    expectedFactKeys: ["churn-acme-feb"],
  },
  {
    personaId: "techstart",
    question: "How investor-facing is the CEO?",
    vectorQuery: "CEO investor reporting style",
    expectedFactKeys: ["ceo-investor-facing"],
  },
  {
    personaId: "techstart",
    question: "What's the Q4 2025 cohort retention?",
    vectorQuery: "Q4 2025 cohort retention",
    expectedFactKeys: ["cohort-q4-95pct"],
  },
  {
    personaId: "techstart",
    question:
      "How should AWS costs be categorized?",
    vectorQuery: "AWS GCP compute infrastructure categorization",
    expectedFactKeys: ["pattern-saas-compute-cogs"],
  },
  {
    personaId: "techstart",
    question: "What format does the CEO expect for investor reports?",
    vectorQuery: "CEO communication tone investor format",
    expectedFactKeys: ["pattern-techstart-growth-tone", "ceo-investor-facing"],
  },
  {
    personaId: "techstart",
    question: "When did the AWS contract renew?",
    vectorQuery: "AWS commit renewal Reserved Instances",
    expectedFactKeys: ["aws-renewal-mar-1"],
  },
  {
    personaId: "techstart",
    question: "What sections must SaaS monthly reports include?",
    vectorQuery: "SaaS monthly report required sections",
    expectedFactKeys: ["pattern-saas-series-a-section"],
  },
  {
    personaId: "techstart",
    question:
      "What did the operator change on the Series A teaser draft?",
    vectorQuery: "Series A teaser modification cohort retention",
    expectedFactKeys: ["cohort-q4-95pct", "series-a-q3-2026"],
  },

  // ── Downtown Medical — 10 queries ────────────────────────────
  {
    personaId: "downtown-med",
    question: "What's the insurance payer mix?",
    vectorQuery: "insurance payer mix percentages",
    expectedFactKeys: ["med-payer-mix"],
  },
  {
    personaId: "downtown-med",
    question: "How is self-pay collection trending?",
    vectorQuery: "self-pay collection rate benchmark",
    expectedFactKeys: ["med-self-pay-70pct", "pattern-self-pay-threshold"],
  },
  {
    personaId: "downtown-med",
    question: "Which provider has the highest collection rate?",
    vectorQuery: "provider productivity collection rate Dr. Patel",
    expectedFactKeys: ["med-provider-productivity"],
  },
  {
    personaId: "downtown-med",
    question: "What's the lease renewal status?",
    vectorQuery: "lease renewal counter-offer landlord",
    expectedFactKeys: ["med-lease-renewal"],
  },
  {
    personaId: "downtown-med",
    question: "Is the HIPAA BAA current?",
    vectorQuery: "HIPAA BAA renewal due date",
    expectedFactKeys: ["baa-signed-2024-04-15"],
  },
  {
    personaId: "downtown-med",
    question: "What's the current A/R aging picture?",
    vectorQuery: "A/R aging over 60 days breakdown",
    expectedFactKeys: ["med-ar-32pct-over-60"],
  },
  {
    personaId: "downtown-med",
    question: "How does the practice administrator like reports?",
    vectorQuery: "practice administrator preferred report style",
    expectedFactKeys: ["admin-detail-driven", "pattern-med-formal"],
  },
  {
    personaId: "downtown-med",
    question: "What sections must healthcare monthly reports include?",
    vectorQuery: "healthcare monthly report required sections",
    expectedFactKeys: ["pattern-healthcare-ar-section"],
  },
  {
    personaId: "downtown-med",
    question: "Did we receive the 2025 MIPS bonus?",
    vectorQuery: "MIPS bonus quality category 2025",
    expectedFactKeys: ["mips-bonus-14200"],
  },
  {
    personaId: "downtown-med",
    question:
      "What did the operator decide about the lease counter-offer letter?",
    vectorQuery: "lease counter-offer letter approval modification",
    expectedFactKeys: ["med-lease-renewal"],
  },
];
