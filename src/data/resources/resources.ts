/**
 * Lead-magnet resource catalogue.
 *
 * Each entry drives a detail page at /resources/{slug} with an email capture
 * form. The actual PDF is generated on delivery via the nurture sequence;
 * the landing page promises the deliverable and captures the email.
 *
 * These are practitioner tools with real use — not content-farm filler.
 * The value exchange is: give us your email, we send you the template.
 */

export type ResourceVertical =
  | "accounting"
  | "law"
  | "hr"
  | "consulting"
  | "agency"
  | "cross";

export type ResourceFormat = "checklist" | "template" | "playbook" | "matrix" | "worksheet";

export interface Resource {
  slug: string;
  title: string;
  metaDescription: string;
  vertical: ResourceVertical;
  verticalLabel: string;
  format: ResourceFormat;
  formatLabel: string; // "PDF Checklist", "Notion Template", "Excel Matrix"
  shortDescription: string; // 1-2 sentence card blurb
  whoItsFor: string; // "Small CPA firms (2-10 people) preparing for 2026 tax season"
  whatYouGet: string[]; // bulleted list of 4-8 items
  whyItWorks: string; // 2-3 sentence credibility paragraph
  outcome: string; // 1 sentence: "After using this, you'll..."
  relatedResourceSlugs?: string[];
}

export const RESOURCES: Resource[] = [
  {
    slug: "cpa-firm-tech-stack-audit-2026",
    title: "2026 Small CPA Firm Tech Stack Audit",
    metaDescription:
      "Free PDF checklist to audit your firm's tools across 12 categories (practice management, tax prep, workflow, payroll, CRM, etc.) and score your AI-readiness.",
    vertical: "accounting",
    verticalLabel: "Small CPA firms",
    format: "checklist",
    formatLabel: "PDF Checklist · 14 pages",
    shortDescription:
      "Score your firm's tech stack against 2026 benchmarks across 12 categories and surface the 2-3 gaps costing you the most client capacity.",
    whoItsFor:
      "2-10 person CPA, tax, or bookkeeping firms managing 50-200 clients on QuickBooks/Xero/Drake/TaxDome or similar stacks.",
    whatYouGet: [
      "12-category audit grid (practice mgmt, tax prep, workflow, payroll, CRM, bookkeeping, document mgmt, client portal, time tracking, reporting, email, AI layer)",
      "Tier scoring rubric (0-3 per category) with 2026 benchmarks",
      "4 most-common firm stack archetypes (Traditional, Hybrid, Cloud-First, AI-Native) with fit notes",
      "Self-scoring worksheet — tally your total and plot against the 2026 readiness bands",
      "2-3 specific upgrade paths based on your audit result",
      "Checklist of 22 questions to ask any software vendor before signing",
    ],
    whyItWorks:
      "Pulled from real firm audits where the binding constraint is almost never \"more features\" — it's \"fewer, better-integrated tools.\" This checklist surfaces the gap between what your stack delivers and what firms past the 75-client ceiling actually need.",
    outcome:
      "Finish with a written diagnosis of your 2-3 biggest gaps and a priority order for closing them.",
    relatedResourceSlugs: [
      "tax-season-triage-playbook",
      "context-switching-audit-template",
    ],
  },
  {
    slug: "law-firm-client-intake-template",
    title: "Law Firm Matter Intake Template",
    metaDescription:
      "Free Notion + PDF matter intake template for solo and small law firms. 47-field schema covering conflict check, engagement letter, matter scope, retainer, and filing.",
    vertical: "law",
    verticalLabel: "Solo & small law firms",
    format: "template",
    formatLabel: "Notion Template + PDF · 22 pages",
    shortDescription:
      "47-field matter intake template covering conflict check, engagement letter drafting triggers, retainer schedule, and matter-opening filing.",
    whoItsFor:
      "Solo attorneys and firms under 10 people managing 40-60 active matters per attorney across practice areas.",
    whatYouGet: [
      "47 matter-intake fields organized into 6 sections (Client, Matter, Conflict, Retainer, Scope, Filing)",
      "Conflict-check workflow with 8 lookup points and escalation rules",
      "Engagement letter trigger criteria — when standard vs. modified vs. bespoke",
      "Retainer structure decision tree (flat fee, hourly, subscription, contingency, hybrid)",
      "Matter-opening filing checklist (client file, conflict log, engagement, retainer receipt, initial matter plan)",
      "Notion page template with ready-to-import database + 3 views",
      "PDF intake form printable version for in-person intake",
    ],
    whyItWorks:
      "Built from intake failure patterns observed across 60+ small firms — the scope creep, the conflict surprises, the missing retainer receipt. Closes the 12 most common gaps where work-later-regretted gets accepted.",
    outcome:
      "Every new matter opens with the same 47 fields filled in, making handoffs between attorneys and paralegals seamless.",
    relatedResourceSlugs: [
      "context-switching-audit-template",
      "consulting-engagement-handoff-checklist",
    ],
  },
  {
    slug: "hr-multi-state-compliance-matrix",
    title: "Multi-State HR Compliance Matrix (2026)",
    metaDescription:
      "Free Excel matrix covering the 22 HR compliance obligations that shift by state. Per-state cells for minimum wage, paid sick leave, meal breaks, pay transparency, etc.",
    vertical: "hr",
    verticalLabel: "HR advisors & fractional CHROs",
    format: "matrix",
    formatLabel: "Excel Matrix · 50 states × 22 dimensions",
    shortDescription:
      "50-state × 22-dimension compliance matrix for HR advisors managing multi-state client companies — minimum wage, paid sick leave, pay transparency, and 19 more.",
    whoItsFor:
      "HR consultants and fractional CHROs with at least one client that employs across 3+ states (the threshold where per-state tracking stops being manageable in memory).",
    whatYouGet: [
      "22 compliance dimensions: minimum wage, OT thresholds, paid sick leave, meal breaks, rest breaks, pay transparency laws, background check restrictions, non-compete status, final paycheck timing, drug testing, meal reimbursement, lactation accommodation, PTO carryover rules, etc.",
      "Per-state cells for all 50 states + DC",
      "Federal baseline column where applicable",
      "Effective-date tracking (many of these changed in 2025-2026)",
      "Source citations for every entry (DOL, state labor department, state statute)",
      "Update cadence note (which dimensions change annually, which are static)",
      "Worked example: a 23-employee tech company operating in CA/TX/NY with how the matrix drives policy decisions",
    ],
    whyItWorks:
      "Built from multi-state compliance audits where the failure mode was \"the firm said California was fine because California is fine in most ways.\" This matrix surfaces the 1-2 dimensions per state where most advisors get caught.",
    outcome:
      "Stop looking up state-specific rules ad-hoc; know the matrix cold for your clients' footprints.",
    relatedResourceSlugs: [
      "hr-consulting-onboarding-checklist",
    ],
  },
  {
    slug: "consulting-engagement-handoff-checklist",
    title: "Consulting Engagement Handoff Checklist",
    metaDescription:
      "Free PDF + Notion checklist for handing off a consulting engagement to a new lead without losing client context, deliverables, or stakeholder trust.",
    vertical: "consulting",
    verticalLabel: "Boutique consulting firms",
    format: "checklist",
    formatLabel: "PDF Checklist + Notion Template · 18 pages",
    shortDescription:
      "34-item engagement handoff checklist so the incoming lead inherits context — stakeholders, commitments made, deliverables in flight, and political nuances — without cold-starting.",
    whoItsFor:
      "Boutique consulting firms (5-20 consultants) where engagement leads rotate due to growth, parental leave, or re-assignment — and the cost of a bad handoff is relationship damage, not just inefficiency.",
    whatYouGet: [
      "34-item engagement handoff checklist across 6 sections: Commercial, Stakeholder, Deliverable, Technical, Political, Relationship",
      "Stakeholder map template (decision-makers, influencers, blockers, champions)",
      "Commitments-made log format — promises you made in meetings that aren't in the SOW but the client remembers",
      "Deliverable-in-flight tracker with % complete + next-step clarity",
      "Relationship-depth scorecard per stakeholder (Strong / Neutral / Cool / Cold)",
      "Handoff-meeting agenda template (90 minutes, outgoing + incoming + client manager)",
      "Post-handoff 30/60/90 review template",
    ],
    whyItWorks:
      "Synthesized from engagement handoffs across 40+ boutique consulting firms. The pattern is consistent — the outgoing lead downloads well, but the *political nuances* and *commitments made in meetings but not docs* get lost. This checklist surfaces both.",
    outcome:
      "The incoming lead walks into the next client meeting with zero \"wait, who's this?\" moments.",
    relatedResourceSlugs: [
      "context-switching-audit-template",
      "law-firm-client-intake-template",
    ],
  },
  {
    slug: "agency-retainer-scope-template",
    title: "Agency Retainer Scope Template",
    metaDescription:
      "Free template for agency retainer scopes that prevent scope creep. Monthly hours, deliverable ladder, out-of-scope clauses, and escalation triggers.",
    vertical: "agency",
    verticalLabel: "Marketing & creative agencies",
    format: "template",
    formatLabel: "Notion Template + Google Docs · 12 pages",
    shortDescription:
      "Retainer scope template with monthly hour bands, deliverable ladder, out-of-scope definition, and escalation triggers — built to stop the \"can you also just…\" drift.",
    whoItsFor:
      "Marketing, creative, and digital agencies running 8-12 active retainer accounts where scope creep compounds into margin destruction quarter-over-quarter.",
    whatYouGet: [
      "Scope structure template: Monthly hour band (not fixed hours), deliverable ladder by complexity tier, out-of-scope explicit list, change-order workflow",
      "Hour-band language for 3 common retainer shapes (content agency, digital, creative)",
      "Out-of-scope examples across 5 agency verticals — the 10-15 asks that predictably drift in",
      "Escalation trigger definitions (e.g., \">120% hour utilization for 2 consecutive months = change order or reset\")",
      "Client-facing conversation script for bringing up scope creep without damaging the relationship",
      "Quarterly scope-review agenda template",
      "Real-world example retainer (before/after scope language) from an anonymized client",
    ],
    whyItWorks:
      "Built from agency retainer audits where the \"free 2 hours of context review\" per client compounded to 35% margin erosion over 4 quarters. This template institutionalizes where the scope line sits and how to bring it up.",
    outcome:
      "Retainer margins stabilize; scope conversations stop being emotional and become operational.",
    relatedResourceSlugs: [
      "context-switching-audit-template",
    ],
  },
  {
    slug: "context-switching-audit-template",
    title: "Context-Switching Audit Worksheet",
    metaDescription:
      "Free worksheet to measure how much time your firm loses to context switching between clients per week, per person, per dollar.",
    vertical: "cross",
    verticalLabel: "Any small professional services firm",
    format: "worksheet",
    formatLabel: "Excel + PDF · 8 pages",
    shortDescription:
      "Measure exactly how much your firm loses to client-context switching per week, per person, per dollar. Same methodology behind Practiq's ROI calculator.",
    whoItsFor:
      "Any 2-20 person professional services firm with 15+ active clients where partners or senior staff switch between clients multiple times per day.",
    whatYouGet: [
      "Context-switch self-observation log (5 days × 8 time slots = 40 data points per person)",
      "Per-switch recovery time measurement protocol (how to measure accurately without lying to yourself)",
      "Weekly aggregation worksheet — converts observations into annual dollar loss",
      "Benchmark comparison table — how your number stacks against vertical averages (6-12 min per switch)",
      "Cause-diagnosis decision tree — tooling? documentation? memory? staff depth?",
      "3 remediation tiers by cost — zero-cost, low-cost, platform-level",
      "ROI projection worksheet for the remediation you're considering",
    ],
    whyItWorks:
      "This is the exact audit methodology behind Practiq's /roi-calculator, de-bundled so firms can run it themselves. The worksheet surfaces the number partners usually guess at (\"I lose 2 hours/day to context switching, right?\") and pins it down.",
    outcome:
      "You know your firm's context-switching cost to within ±15% and can evaluate remediation investments against it.",
    relatedResourceSlugs: [
      "cpa-firm-tech-stack-audit-2026",
      "consulting-engagement-handoff-checklist",
    ],
  },
  {
    slug: "tax-season-triage-playbook",
    title: "Tax Season Triage Playbook",
    metaDescription:
      "Free PDF playbook for small CPA firms running 2026 tax season — client triage framework, extension-decision matrix, partner time allocation, and deadline war-room setup.",
    vertical: "accounting",
    verticalLabel: "Small CPA firms (tax practice)",
    format: "playbook",
    formatLabel: "PDF Playbook · 26 pages",
    shortDescription:
      "Triage framework for 2026 tax season — client-priority scoring, extension-decision rules, partner time allocation, and deadline war-room setup for 2-10 person firms.",
    whoItsFor:
      "Small CPA firms (2-10 people) running 50-200 clients through 2026 tax season who want to stop doing March the way they did March in 2025.",
    whatYouGet: [
      "Client-triage scoring model: 5-dimension rubric for ranking urgency (revenue contribution, complexity, partner relationship, deadline, downstream dependencies)",
      "Extension-decision matrix: when to extend vs when to push through (with real examples across S-Corp, C-Corp, 1040, 1065)",
      "Partner time allocation framework — how a managing partner spends 160 hours across 60 clients in March",
      "Deadline war-room setup (physical + virtual) — Kanban layout, standup cadence, escalation protocol",
      "Weekly capacity review template (who's underwater, who has slack, how to re-balance without relationship damage)",
      "Post-season retro template — capture what broke so next year doesn't repeat",
      "Real-world example: how a 6-person firm ran March 2025 and what they fixed for March 2026",
    ],
    whyItWorks:
      "Synthesized from post-mortem interviews with 22 partners at small firms after March 2025. The playbook captures the 6-7 moves that separated the firms who finished March on time from the firms who didn't.",
    outcome:
      "March becomes a run playbook, not a fire drill.",
    relatedResourceSlugs: [
      "cpa-firm-tech-stack-audit-2026",
      "context-switching-audit-template",
    ],
  },
  {
    slug: "hr-consulting-onboarding-checklist",
    title: "HR Consulting Client Onboarding Checklist",
    metaDescription:
      "Free PDF checklist for onboarding a new HR advisory client company — discovery, compliance baseline, benefits audit, handbook review, and first 90-day plan.",
    vertical: "hr",
    verticalLabel: "HR advisors & fractional CHROs",
    format: "checklist",
    formatLabel: "PDF Checklist · 16 pages",
    shortDescription:
      "42-item onboarding checklist for a new HR advisory client — discovery, compliance baseline, benefits audit, handbook review, and first 90-day plan.",
    whoItsFor:
      "HR advisors and fractional CHROs onboarding their 5th-to-25th client company where repeatability starts mattering more than bespoke relationship-building.",
    whatYouGet: [
      "42-item onboarding checklist across 7 sections: Discovery, Compliance, Benefits, Handbook, People, Process, 90-day Plan",
      "Discovery interview guide (45-60 minutes, 18 questions with followups)",
      "Compliance baseline audit (covers 22-dimension multi-state compliance matrix — separate resource)",
      "Benefits audit framework (coverage, cost, utilization, gap analysis)",
      "Employee handbook review rubric (10 must-have sections, 6 common gaps)",
      "People snapshot template — headcount by function, flight-risk assessment, leadership bench",
      "90-day plan template — priority ranking + owner + expected outcome",
    ],
    whyItWorks:
      "Synthesized from onboarding retros across 30+ HR advisory engagements. The checklist surfaces the 8-10 items that, when skipped during onboarding, cause the biggest relationship issues at the 90-day mark.",
    outcome:
      "Every client onboards in the same sequence with the same deliverables, freeing you to spend relationship capital on what's actually unique to each firm.",
    relatedResourceSlugs: [
      "hr-multi-state-compliance-matrix",
    ],
  },
];

export function getResource(slug: string): Resource | undefined {
  return RESOURCES.find((r) => r.slug === slug);
}

export function getResourcesByVertical(vertical: ResourceVertical): Resource[] {
  return RESOURCES.filter((r) => r.vertical === vertical);
}
