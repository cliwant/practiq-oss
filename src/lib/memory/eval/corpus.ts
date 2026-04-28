/**
 * Synthetic 3-persona corpus for the 5-tier memory eval (RUN 15).
 *
 * Picks three realistic boutique-firm clients — one Food & Beverage,
 * one SaaS, one healthcare — and populates each with the full memory
 * shape the composer expects:
 *
 *   - ProfileInputClient (T0)
 *   - 1 rolling-digest ClientContext row (T1)
 *   - 30 generic ClientContext rows across categories (T2 source)
 *   - 10 ClientFact rows with bitemporal validity (T2 facts)
 *   - 5 AgentTask rows with summaries (T3 episodic)
 *   - 3 approval_* AuditLog rows (T3 decisions)
 *   - 4 promoted AgentRule rows (T4 firm patterns)
 *
 * Each corpus carries a list of "annotated facts" with a `key` and
 * a `text` substring. The eval runner uses these annotations to
 * score recall: a query mentions a fact key → check whether the
 * composed prompt contains the corresponding text.
 *
 * The corpus is deterministic — every entry is hand-written so we
 * can compare cells (baseline / T0 / T0+T1+T4 / full) against the
 * exact same data and reach reproducible conclusions.
 */

export interface CorpusContext {
  id: string;
  title: string;
  content: string;
  category: string;
  isPinned: boolean;
  updatedAt: Date;
  /** Annotated keys that this row carries. Used by query-recall scoring. */
  factKeys: string[];
}

export interface CorpusFact {
  id: string;
  factType: string;
  factKey: string;
  factValue: string;
  validFrom: Date;
  validUntil: Date | null;
  factKeysExposed: string[];
}

export interface CorpusAgentTask {
  agentType: string;
  summary: string;
  completedAt: Date;
  factKeysExposed: string[];
}

export interface CorpusAuditLog {
  action: string;
  details: Record<string, unknown>;
  createdAt: Date;
  factKeysExposed: string[];
}

export interface CorpusAgentRule {
  ruleType: string;
  condition: Record<string, unknown>;
  action: Record<string, unknown>;
  confidence: number;
  appliedCount: number;
  factKeysExposed: string[];
}

export interface CorpusPersona {
  id: string;
  userId: string;
  client: {
    id: string;
    name: string;
    industry: string;
    userRole: string;
    relationshipMonths: number;
    preferences: Record<string, unknown>;
  };
  digest: { content: string; updatedAt: Date; factKeysExposed: string[] };
  contexts: CorpusContext[];
  facts: CorpusFact[];
  agentTasks: CorpusAgentTask[];
  auditLogs: CorpusAuditLog[];
  agentRules: CorpusAgentRule[];
}

const NOW = new Date("2026-04-28T08:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60_000);

// ─────────────────────────────────────────────────────────────────
// Persona 1 — Kim's Restaurant (Food & Beverage)
// ─────────────────────────────────────────────────────────────────

const KIM: CorpusPersona = {
  id: "kim-rest",
  userId: "u-jennifer",
  client: {
    id: "kim-rest",
    name: "Kim's Restaurant",
    industry: "Food & Beverage",
    userRole: "fractional CFO",
    relationshipMonths: 18,
    preferences: {
      reportTone: "casual",
      preferredFormats: ["docx", "xlsx"],
      brandColor: "#f97316",
      contactEmail: "kim@kimrestaurant.example",
      primaryContactRole: "owner",
      note:
        "Owner reads in 5 minutes; lead with the headline number. Loves YoY comparisons.",
    },
  },
  digest: {
    content:
      "## Last 30 days\n\n- March monthly close completed Apr 3. Net margin 32%, food cost 31.2% (above industry but matches seasonal pattern).\n- Owner approved March P&L on 4/4 via portal.\n- Pending: new ingredient supplier negotiation — need to schedule call before May close.\n- Owner asked Jennifer to follow up on bulk discount tiers (8% savings on >$5K orders).",
    updatedAt: daysAgo(1),
    factKeysExposed: [
      "march-close-completed",
      "march-net-margin-32",
      "supplier-negotiation-pending",
    ],
  },
  contexts: [
    {
      id: "k1",
      title: "Owner communication style",
      category: "preference",
      isPinned: true,
      updatedAt: daysAgo(60),
      content:
        "Casual + direct. Owner skims first, asks questions later. Lead every report with the headline number, not the methodology.",
      factKeys: ["owner-prefers-casual"],
    },
    {
      id: "k2",
      title: "Seasonal food-cost pattern",
      category: "metric",
      isPinned: true,
      updatedAt: daysAgo(45),
      content:
        "Food cost ratio rises 10–14% during March/April every year (analysed 2 years of P&L). Tied to spring catering inventory build + premium-protein menu rotation. Treat as expected unless variance > 18%.",
      factKeys: ["food-cost-march-pattern"],
    },
    {
      id: "k3",
      title: "March 2026 monthly close",
      category: "decision",
      isPinned: false,
      updatedAt: daysAgo(25),
      content:
        "Closed 4/3/2026. Revenue $145K (+8% MoM). Food cost 31.2% — flagged but accepted (matches seasonal pattern). Net margin 32%. Owner approved on 4/4 via portal.",
      factKeys: ["march-close-completed", "march-net-margin-32"],
    },
    {
      id: "k4",
      title: "April supplier negotiation",
      category: "note",
      isPinned: false,
      updatedAt: daysAgo(20),
      content:
        "Owner asked Jennifer to follow up with the new ingredient supplier on bulk discount tiers — promised 8% savings on >$5K orders. Need to schedule call before May close.",
      factKeys: ["supplier-negotiation-pending", "supplier-discount-8pct"],
    },
    {
      id: "k5",
      title: "Q4 2025 holiday catering surge",
      category: "metric",
      isPinned: false,
      updatedAt: daysAgo(120),
      content:
        "December revenue spiked $42K (was $28K in Nov) on holiday corporate catering. Margins compressed to 22% during peak — staff overtime + premium ingredients.",
      factKeys: ["holiday-catering-margin-22"],
    },
    {
      id: "k6",
      title: "Owner birthday tradition",
      category: "note",
      isPinned: true,
      updatedAt: daysAgo(200),
      content:
        "Owner's birthday is March 15. Restaurant runs a discount promo — typical hit to revenue $3-4K, recover in next 2 weeks.",
      factKeys: ["owner-birthday-march-15"],
    },
    {
      id: "k7",
      title: "Lease — Mission St",
      category: "document",
      isPinned: true,
      updatedAt: daysAgo(180),
      content:
        "Current lease: $12,000/mo, expires 12/31/2027. Renewal talks paused pending corner-property option due 6/30/2026.",
      factKeys: ["lease-monthly-12000", "lease-expires-2027"],
    },
    // Additional rows for more realistic corpus volume — these don't
    // expose new factKeys, they exist to test "noise" tolerance.
    ...buildFillerContexts("kim", 23),
  ],
  facts: [
    {
      id: "kf1",
      factType: "metric",
      factKey: "monthly_revenue_avg",
      factValue: "$145,000",
      validFrom: daysAgo(180),
      validUntil: null,
      factKeysExposed: ["monthly-revenue-145k"],
    },
    {
      id: "kf2",
      factType: "preference",
      factKey: "owner_communication_style",
      factValue: "casual, headline-first",
      validFrom: daysAgo(360),
      validUntil: null,
      factKeysExposed: ["owner-prefers-casual"],
    },
    {
      id: "kf3",
      factType: "deadline",
      factKey: "next_quarterly_estimated_tax",
      factValue: "$4,200 due 6/15/2026",
      validFrom: daysAgo(10),
      validUntil: new Date("2026-06-15"),
      factKeysExposed: ["q2-estimated-tax-4200"],
    },
    ...buildFillerFacts("kim", 7),
  ],
  agentTasks: [
    {
      agentType: "daily_briefing",
      summary: "March monthly close drafted; food cost variance flagged.",
      completedAt: daysAgo(2),
      factKeysExposed: ["march-close-completed"],
    },
    {
      agentType: "anomaly_detector",
      summary: "No anomalies above threshold — all April transactions in expected range.",
      completedAt: daysAgo(1),
      factKeysExposed: [],
    },
    {
      agentType: "comms_drafter",
      summary: "Drafted reminder email re: supplier negotiation follow-up.",
      completedAt: daysAgo(1),
      factKeysExposed: ["supplier-negotiation-pending"],
    },
    {
      agentType: "daily_briefing",
      summary: "Holiday catering Q4 numbers reconciled.",
      completedAt: daysAgo(95),
      factKeysExposed: ["holiday-catering-margin-22"],
    },
    {
      agentType: "daily_briefing",
      summary: "March P&L delivered; owner approved via portal.",
      completedAt: daysAgo(24),
      factKeysExposed: ["march-net-margin-32"],
    },
  ],
  auditLogs: [
    {
      action: "approval_approve",
      details: { itemTitle: "March monthly close — financial statements" },
      createdAt: daysAgo(24),
      factKeysExposed: ["march-close-completed"],
    },
    {
      action: "approval_modify",
      details: { itemTitle: "Supplier follow-up email — softened tone" },
      createdAt: daysAgo(7),
      factKeysExposed: ["supplier-negotiation-pending"],
    },
    {
      action: "approval_dismiss",
      details: { itemTitle: "Anomaly alert (false positive)" },
      createdAt: daysAgo(40),
      factKeysExposed: [],
    },
  ],
  agentRules: [
    {
      ruleType: "categorization",
      condition: {
        clientIndustry: "Food & Beverage",
        category: "expense",
        descriptionPattern: "produce|meat|seafood",
      },
      action: { reclassify_to: "Food Cost / COGS - perishable", promoted: true },
      confidence: 0.92,
      appliedCount: 8,
      factKeysExposed: ["pattern-fnb-cogs-reclass"],
    },
    {
      ruleType: "communication_tone",
      condition: { clientId: "kim-rest" },
      action: { tone: "casual", lead_with: "headline number", promoted: true },
      confidence: 0.88,
      appliedCount: 5,
      factKeysExposed: ["pattern-kim-casual-tone"],
    },
    {
      ruleType: "approval_default",
      condition: { agentType: "daily_briefing", confidenceMin: 0.85 },
      action: { auto_approve: false, surface_inline_costs: true, promoted: false },
      confidence: 0.7,
      appliedCount: 2,
      factKeysExposed: [],
    },
    {
      ruleType: "anomaly_threshold",
      condition: {
        clientIndustry: "Food & Beverage",
        metric: "food_cost_ratio",
      },
      action: { ignore_if_within: "10..14% during Mar/Apr", promoted: true },
      confidence: 0.91,
      appliedCount: 6,
      factKeysExposed: ["pattern-food-cost-seasonality"],
    },
  ],
};

// ─────────────────────────────────────────────────────────────────
// Persona 2 — TechStart Inc. (SaaS)
// ─────────────────────────────────────────────────────────────────

const TECH: CorpusPersona = {
  id: "techstart",
  userId: "u-jennifer",
  client: {
    id: "techstart",
    name: "TechStart Inc.",
    industry: "SaaS",
    userRole: "fractional CFO",
    relationshipMonths: 9,
    preferences: {
      reportTone: "growth-focused",
      preferredFormats: ["xlsx", "pptx"],
      brandColor: "#2563eb",
      contactEmail: "ceo@techstart.example",
      primaryContactRole: "CEO",
      note:
        "CEO is investor-facing — every report should produce a board-deck-ready slide.",
    },
  },
  digest: {
    content:
      "## Last 30 days\n\n- MRR climbed to $145K (+$8.2K MoM, 6%). Customer count 24 (+2).\n- Burn $28.4K/mo (-$600 MoM). Runway 12.4 months.\n- Series A target Q3 2026; CEO requested investor dashboard refresh.\n- 1 churn event Feb 28 — $2.4K MRR lost (Acme Co downgraded).\n- Cohort analysis: Q4 2025 signups have 95% retention vs 87% baseline.",
    updatedAt: daysAgo(1),
    factKeysExposed: [
      "tech-mrr-145k",
      "tech-runway-12-4mo",
      "series-a-q3-2026",
      "churn-acme-feb",
    ],
  },
  contexts: [
    {
      id: "t1",
      title: "Runway & burn",
      category: "metric",
      isPinned: true,
      updatedAt: daysAgo(2),
      content:
        "MRR $145K, burn rate $28.4K/month, runway 12.4 months. Targeting Series A close in Q3 2026 — keep at least 6mo cushion before bridge.",
      factKeys: ["tech-mrr-145k", "tech-runway-12-4mo", "series-a-q3-2026"],
    },
    {
      id: "t2",
      title: "Series A readiness",
      category: "strategic",
      isPinned: true,
      updatedAt: daysAgo(20),
      content:
        "Investor-deck shape requested by CEO weekly. Track ARR / GRR / NRR / CAC payback / churn. Cohort analyses by signup quarter.",
      factKeys: ["series-a-q3-2026"],
    },
    {
      id: "t3",
      title: "Acme Co churn (Feb 28)",
      category: "decision",
      isPinned: false,
      updatedAt: daysAgo(60),
      content:
        "Acme Co downgraded from Pro ($2,400/mo) to Starter ($800/mo) after Q4 budget cut. Net MRR impact -$1,600. Salvage call set up for Q2 to revisit.",
      factKeys: ["churn-acme-feb"],
    },
    {
      id: "t4",
      title: "CEO is investor-facing",
      category: "preference",
      isPinned: true,
      updatedAt: daysAgo(150),
      content:
        "CEO uses every Practiq output in investor conversations. Reports must be board-deck-ready (clean KPI cards, no internal jargon, Series A narrative-aligned).",
      factKeys: ["ceo-investor-facing"],
    },
    {
      id: "t5",
      title: "Cohort retention analysis",
      category: "metric",
      isPinned: false,
      updatedAt: daysAgo(15),
      content:
        "Q4 2025 cohort: 95% 90-day retention (best ever). Q3 2025: 87%. Q2 2025: 82%. Material improvement → useful Series A talking point.",
      factKeys: ["cohort-q4-95pct"],
    },
    {
      id: "t6",
      title: "Vendor renewal — AWS",
      category: "decision",
      isPinned: false,
      updatedAt: daysAgo(40),
      content:
        "AWS commit renewed Mar 1 — $9.6K/mo for 12 months (locked-in 18% discount via Reserved Instances). Compute is ~33% of burn.",
      factKeys: ["aws-renewal-mar-1"],
    },
    ...buildFillerContexts("tech", 24),
  ],
  facts: [
    {
      id: "tf1",
      factType: "metric",
      factKey: "monthly_recurring_revenue",
      factValue: "$145,000 as of April 28, 2026",
      validFrom: daysAgo(7),
      validUntil: null,
      factKeysExposed: ["tech-mrr-145k"],
    },
    {
      id: "tf2",
      factType: "deadline",
      factKey: "series_a_target_close",
      factValue: "Q3 2026",
      validFrom: daysAgo(60),
      validUntil: new Date("2026-09-30"),
      factKeysExposed: ["series-a-q3-2026"],
    },
    {
      id: "tf3",
      factType: "metric",
      factKey: "current_runway_months",
      factValue: "12.4 months at current burn",
      validFrom: daysAgo(30),
      validUntil: null,
      factKeysExposed: ["tech-runway-12-4mo"],
    },
    ...buildFillerFacts("tech", 7),
  ],
  agentTasks: [
    {
      agentType: "daily_briefing",
      summary: "April investor dashboard — MRR + runway + cohort retention summary.",
      completedAt: daysAgo(1),
      factKeysExposed: ["tech-mrr-145k", "cohort-q4-95pct"],
    },
    {
      agentType: "anomaly_detector",
      summary: "Acme Co downgrade flagged Feb 28 — $1,600 MRR loss.",
      completedAt: daysAgo(60),
      factKeysExposed: ["churn-acme-feb"],
    },
    {
      agentType: "comms_drafter",
      summary: "Drafted Series A teaser email for CEO review (board language).",
      completedAt: daysAgo(8),
      factKeysExposed: ["ceo-investor-facing", "series-a-q3-2026"],
    },
    {
      agentType: "daily_briefing",
      summary: "Q1 financial dashboard — MRR up 14% QoQ.",
      completedAt: daysAgo(45),
      factKeysExposed: [],
    },
    {
      agentType: "daily_briefing",
      summary: "AWS renewal saved $1.7K/mo via RI commit.",
      completedAt: daysAgo(40),
      factKeysExposed: ["aws-renewal-mar-1"],
    },
  ],
  auditLogs: [
    {
      action: "approval_modify",
      details: { itemTitle: "Series A teaser — added cohort retention chart" },
      createdAt: daysAgo(8),
      factKeysExposed: ["cohort-q4-95pct"],
    },
    {
      action: "approval_approve",
      details: { itemTitle: "April investor dashboard" },
      createdAt: daysAgo(1),
      factKeysExposed: ["tech-mrr-145k"],
    },
    {
      action: "approval_dismiss",
      details: { itemTitle: "Anomaly alert — minor MRR fluctuation" },
      createdAt: daysAgo(15),
      factKeysExposed: [],
    },
  ],
  agentRules: [
    {
      ruleType: "communication_tone",
      condition: { clientId: "techstart" },
      action: {
        tone: "growth-focused",
        always_include: ["MRR", "runway", "burn"],
        promoted: true,
      },
      confidence: 0.93,
      appliedCount: 9,
      factKeysExposed: ["pattern-techstart-growth-tone"],
    },
    {
      ruleType: "report_format",
      condition: { clientIndustry: "SaaS", reportType: "monthly" },
      action: {
        always_include_section: "Series A readiness scoreboard",
        promoted: true,
      },
      confidence: 0.86,
      appliedCount: 6,
      factKeysExposed: ["pattern-saas-series-a-section"],
    },
    {
      ruleType: "approval_default",
      condition: { agentType: "daily_briefing", clientIndustry: "SaaS" },
      action: { auto_approve: false, urgency_floor: 60, promoted: false },
      confidence: 0.71,
      appliedCount: 3,
      factKeysExposed: [],
    },
    {
      ruleType: "categorization",
      condition: {
        clientIndustry: "SaaS",
        descriptionPattern: "AWS|GCP|Azure",
      },
      action: { reclassify_to: "Compute / Infrastructure", promoted: true },
      confidence: 0.95,
      appliedCount: 14,
      factKeysExposed: ["pattern-saas-compute-cogs"],
    },
  ],
};

// ─────────────────────────────────────────────────────────────────
// Persona 3 — Downtown Medical (Healthcare)
// ─────────────────────────────────────────────────────────────────

const MED: CorpusPersona = {
  id: "downtown-med",
  userId: "u-jennifer",
  client: {
    id: "downtown-med",
    name: "Downtown Medical",
    industry: "Healthcare",
    userRole: "fractional CFO",
    relationshipMonths: 24,
    preferences: {
      reportTone: "formal",
      preferredFormats: ["docx", "pdf"],
      brandColor: "#10b981",
      contactEmail: "billing@downtownmed.example",
      primaryContactRole: "practice_administrator",
      note: "Insurance-first practice. A/R aging is the metric they wake up to.",
    },
  },
  digest: {
    content:
      "## Last 30 days\n\n- Insurance payer mix steady: BCBS 38%, Aetna 24%, Medicare 21%, self-pay 11%, Medicaid 6%.\n- Self-pay collection rate 70% (industry standard 75-85%) — flagged for follow-up.\n- Provider productivity: Dr. Patel highest (96% collection, $210 avg charge).\n- Q2 lease renewal in negotiation — landlord asked 8%, we counter-offered 4% with 5-year lock.\n- A/R aging: 32% over 60 days (high — investigate).",
    updatedAt: daysAgo(1),
    factKeysExposed: [
      "med-payer-mix",
      "med-self-pay-70pct",
      "med-lease-renewal",
      "med-ar-32pct-over-60",
    ],
  },
  contexts: [
    {
      id: "m1",
      title: "Insurance payer mix",
      category: "metric",
      isPinned: true,
      updatedAt: daysAgo(2),
      content:
        "Blue Shield 38%, Aetna 24%, Medicare 21%, self-pay 11%, Medicaid 6%. Self-pay collection rate 70% (industry standard 75-85%) — flagged.",
      factKeys: ["med-payer-mix", "med-self-pay-70pct"],
    },
    {
      id: "m2",
      title: "Provider productivity (March 2026)",
      category: "metric",
      isPinned: false,
      updatedAt: daysAgo(25),
      content:
        "Dr. Chen 168 visits @ $185 avg (94% collection). Dr. Williams 158 @ $192 (89%). Dr. Patel 125 @ $210 (96%). Patel highest margin; consider extended hours.",
      factKeys: ["med-provider-productivity"],
    },
    {
      id: "m3",
      title: "Q2 2026 lease renewal",
      category: "decision",
      isPinned: false,
      updatedAt: daysAgo(15),
      content:
        "Current lease $12K/mo, expires 12/31/27. Practice admin opened renewal talks early — landlord proposed 8% bump. Negotiating to 4% with 5yr lock.",
      factKeys: ["med-lease-renewal"],
    },
    {
      id: "m4",
      title: "Practice admin preference",
      category: "preference",
      isPinned: true,
      updatedAt: daysAgo(180),
      content:
        "Practice admin is detail-driven. Wants formal reports with line-item breakdown. A/R aging report is the first thing she opens every Monday.",
      factKeys: ["admin-detail-driven"],
    },
    {
      id: "m5",
      title: "A/R aging Apr 2026",
      category: "metric",
      isPinned: false,
      updatedAt: daysAgo(3),
      content:
        "32% of A/R aged over 60 days (industry benchmark 18-22%). Self-pay accounts dominate the aged bucket. Recommend collections agency referral for 90+.",
      factKeys: ["med-ar-32pct-over-60"],
    },
    {
      id: "m6",
      title: "BAA on file",
      category: "document",
      isPinned: true,
      updatedAt: daysAgo(720),
      content:
        "HIPAA BAA signed 2024-04-15 between Downtown Medical and Park CPA Group. Annual review every April 15. Next renewal 2026-04-15 (DONE).",
      factKeys: ["baa-signed-2024-04-15"],
    },
    {
      id: "m7",
      title: "MIPS bonus 2025",
      category: "decision",
      isPinned: false,
      updatedAt: daysAgo(160),
      content:
        "2025 MIPS quality category 89%, promoting practice ranking 22%. Bonus: $14,200 received Mar 28 2026. Booked as deferred Q2 revenue.",
      factKeys: ["mips-bonus-14200"],
    },
    ...buildFillerContexts("med", 23),
  ],
  facts: [
    {
      id: "mf1",
      factType: "deadline",
      factKey: "lease_expires",
      factValue: "December 31, 2027",
      validFrom: daysAgo(720),
      validUntil: new Date("2027-12-31"),
      factKeysExposed: ["med-lease-renewal"],
    },
    {
      id: "mf2",
      factType: "metric",
      factKey: "self_pay_collection_rate",
      factValue: "70% — below industry benchmark 75-85%",
      validFrom: daysAgo(60),
      validUntil: null,
      factKeysExposed: ["med-self-pay-70pct"],
    },
    {
      id: "mf3",
      factType: "deadline",
      factKey: "baa_renewal_due",
      factValue: "April 15, 2026 (DONE — signed 2024-04-15)",
      validFrom: daysAgo(720),
      validUntil: new Date("2027-04-15"),
      factKeysExposed: ["baa-signed-2024-04-15"],
    },
    ...buildFillerFacts("med", 7),
  ],
  agentTasks: [
    {
      agentType: "daily_briefing",
      summary: "April A/R aging report — 32% over 60 days (high).",
      completedAt: daysAgo(2),
      factKeysExposed: ["med-ar-32pct-over-60"],
    },
    {
      agentType: "anomaly_detector",
      summary: "Self-pay collection rate dipped to 70% in April (was 76%).",
      completedAt: daysAgo(3),
      factKeysExposed: ["med-self-pay-70pct"],
    },
    {
      agentType: "comms_drafter",
      summary: "Drafted lease counter-offer letter for practice admin review.",
      completedAt: daysAgo(15),
      factKeysExposed: ["med-lease-renewal"],
    },
    {
      agentType: "daily_briefing",
      summary: "March provider productivity — Dr. Patel highest collection.",
      completedAt: daysAgo(25),
      factKeysExposed: ["med-provider-productivity"],
    },
    {
      agentType: "daily_briefing",
      summary: "MIPS bonus $14.2K reconciled to deferred revenue.",
      completedAt: daysAgo(160),
      factKeysExposed: ["mips-bonus-14200"],
    },
  ],
  auditLogs: [
    {
      action: "approval_approve",
      details: { itemTitle: "April A/R aging report" },
      createdAt: daysAgo(2),
      factKeysExposed: ["med-ar-32pct-over-60"],
    },
    {
      action: "approval_modify",
      details: {
        itemTitle: "Lease counter-offer — added 5-year lock language",
      },
      createdAt: daysAgo(15),
      factKeysExposed: ["med-lease-renewal"],
    },
    {
      action: "approval_approve",
      details: { itemTitle: "BAA renewal Apr 15" },
      createdAt: daysAgo(13),
      factKeysExposed: ["baa-signed-2024-04-15"],
    },
  ],
  agentRules: [
    {
      ruleType: "report_format",
      condition: { clientIndustry: "Healthcare", reportType: "monthly" },
      action: {
        always_include_section: "A/R aging breakdown",
        always_include_section_2: "Provider productivity table",
        promoted: true,
      },
      confidence: 0.94,
      appliedCount: 11,
      factKeysExposed: ["pattern-healthcare-ar-section"],
    },
    {
      ruleType: "communication_tone",
      condition: { clientId: "downtown-med" },
      action: { tone: "formal", line_items: true, promoted: true },
      confidence: 0.9,
      appliedCount: 7,
      factKeysExposed: ["pattern-med-formal"],
    },
    {
      ruleType: "anomaly_threshold",
      condition: {
        clientIndustry: "Healthcare",
        metric: "self_pay_collection_rate",
      },
      action: { alert_if_below: "75%", promoted: true },
      confidence: 0.88,
      appliedCount: 5,
      factKeysExposed: ["pattern-self-pay-threshold"],
    },
    {
      ruleType: "approval_default",
      condition: { agentType: "comms_drafter", clientIndustry: "Healthcare" },
      action: { require_human_review: true, promoted: false },
      confidence: 0.72,
      appliedCount: 2,
      factKeysExposed: [],
    },
  ],
};

function buildFillerContexts(prefix: string, n: number): CorpusContext[] {
  const out: CorpusContext[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      id: `${prefix}-filler-${i}`,
      title: `Misc ${prefix} note ${i}`,
      category: i % 3 === 0 ? "note" : i % 3 === 1 ? "metric" : "document",
      isPinned: false,
      updatedAt: daysAgo(30 + i * 5),
      content: `Routine ${prefix} bookkeeping note #${i} — generic activity, no key facts. Padding for noise tolerance.`,
      factKeys: [],
    });
  }
  return out;
}

function buildFillerFacts(prefix: string, n: number): CorpusFact[] {
  const out: CorpusFact[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      id: `${prefix}-ff-${i}`,
      factType: "metric",
      factKey: `${prefix}_misc_metric_${i}`,
      factValue: `placeholder ${i}`,
      validFrom: daysAgo(60 + i * 10),
      validUntil: null,
      factKeysExposed: [],
    });
  }
  return out;
}

export const PERSONAS: readonly CorpusPersona[] = [KIM, TECH, MED];
