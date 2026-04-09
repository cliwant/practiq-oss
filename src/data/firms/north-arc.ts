// =============================================================================
// North Arc Advisors — Fractional Executive & Strategy Consulting
// =============================================================================
// A 10-person boutique that places senior operators inside growth-stage
// companies as fractional CxOs and runs turnaround/GTM engagements. Partners
// Priya Raman and Ethan Walsh built North Arc after leaving a Big Three
// strategy practice. Hero engagement: Lumen Bio's Series B board prep, where
// the cohort enrollment numbers need reconciliation before Friday's meeting.
// =============================================================================

import type {
  TeamMember,
  ClientWorkspace,
  AttentionItem,
  ApprovalQueueItem,
  AITask,
  CompletedItem,
  WeeklyOverview,
  ClientDocument,
  ClientAIActivity,
  BriefingMessage,
  Channel,
  UpcomingEvent,
  ActivityItem,
  ActivityTick,
  KnowledgeItem,
} from "../mock-data";
import { getLumenBioTeamChannelScript, getNorthArcLiveAlerts } from "./scripts/lumen-bio";
import type { FirmData, Firm, VerticalConfig, FirmChannel, DMThread } from "./types";

// ---------------------------------------------------------------------------
// Team (5)
// ---------------------------------------------------------------------------
const team: TeamMember[] = [
  { id: "priya", name: "Priya Raman", initials: "PR", role: "Managing Partner · Strategy", avatarColor: "#4338CA", status: "online", clientCount: 7, completedThisWeek: 5 },
  { id: "ethan", name: "Ethan Walsh", initials: "EW", role: "Partner · GTM", avatarColor: "#0E7490", status: "online", clientCount: 8, completedThisWeek: 6 },
  { id: "naomi", name: "Naomi Patel", initials: "NP", role: "Senior Consultant · Operations", avatarColor: "#BE185D", status: "online", clientCount: 6, completedThisWeek: 5 },
  { id: "james", name: "James Okafor", initials: "JO", role: "Senior Analyst", avatarColor: "#D97706", status: "online", clientCount: 9, completedThisWeek: 7 },
  { id: "alicia", name: "Alicia Chen", initials: "AC", role: "Analyst", avatarColor: "#16A34A", status: "away", clientCount: 12, completedThisWeek: 9 },
];

// ---------------------------------------------------------------------------
// Engagements (9) — hero first
// ---------------------------------------------------------------------------
type EngagementSeed = Omit<ClientWorkspace, "qbSync" | "monthlyCloseStatus" | "firmId" | "integrationStatus" | "integrationLabel" | "integrationLastSync" | "workflowStatus" | "workflowStatusLabel" | "workflowStatusNote"> & {
  integrationStatus: NonNullable<ClientWorkspace["integrationStatus"]>;
  integrationLabel: string;
  integrationLastSync: string;
  workflowStatus: string;
  workflowStatusLabel: string;
  workflowStatusNote?: string;
};

const rawEngagements: EngagementSeed[] = [
  {
    id: "lumen-bio",
    name: "Lumen Bio — Series B Prep",
    shortName: "LB",
    industry: "Biotech",
    industryIcon: "🧬",
    color: "#4338CA",
    colorLight: "#EEF2FF",
    entityType: "C-Corp",
    assignedTo: "priya",
    integrationStatus: "synced",
    integrationLabel: "HubSpot",
    integrationLastSync: "Just now",
    workflowStatus: "board-prep",
    workflowStatusLabel: "Board prep",
    workflowStatusNote: "Cohort reconciliation ready for Priya's review",
    metrics: {
      "Engagement Phase": "Board prep",
      "Raise Target": "$72M",
      "Q1 Enrollment": "427",
      "Board Date": "Apr 10",
      "Burn Rate": "$2.4M/mo",
    },
    contact: { name: "Kaveh Amini", email: "kaveh@lumen.bio" },
    preferences: { tone: "confident, data-led", reportStyle: "board-ready decks", frequency: "weekly" },
    monthlyFee: "Retainer $95K",
    knowledgeCount: 58,
    documentCount: 124,
    conversationCount: 71,
  },
  {
    id: "pacific-hull",
    name: "Marina District Builders — Fractional CFO",
    shortName: "PH",
    industry: "Manufacturing",
    industryIcon: "🛠",
    color: "#0E7490",
    colorLight: "#ECFEFF",
    entityType: "LLC",
    assignedTo: "ethan",
    integrationStatus: "synced",
    integrationLabel: "Stripe",
    integrationLastSync: "20 min ago",
    workflowStatus: "operating-cadence",
    workflowStatusLabel: "Operating cadence",
    workflowStatusNote: "Q2 cash forecast in draft",
    metrics: {
      "Engagement Type": "Fractional CFO",
      "Annual Revenue": "$34M",
      "Cash Runway": "11 months",
      "Gross Margin": "42%",
    },
    contact: { name: "Rachel Whitman", email: "rwhitman@marinadistrict.com" },
    preferences: { tone: "direct, operational", reportStyle: "ops dashboards", frequency: "weekly" },
    monthlyFee: "Retainer $28K",
    knowledgeCount: 34,
    documentCount: 87,
    conversationCount: 42,
  },
  {
    id: "synthia-gtm",
    name: "Synthia Labs — GTM strategy",
    shortName: "SL",
    industry: "SaaS",
    industryIcon: "🎯",
    color: "#DB2777",
    colorLight: "#FDF2F8",
    entityType: "C-Corp",
    assignedTo: "ethan",
    integrationStatus: "synced",
    integrationLabel: "HubSpot",
    integrationLastSync: "1 hour ago",
    workflowStatus: "discovery",
    workflowStatusLabel: "Discovery phase",
    workflowStatusNote: "Customer interviews week 2 of 4",
    metrics: { "Engagement Type": "GTM strategy", "ARR": "$12M", "Pipeline": "$18M", "Target Segments": "3" },
    contact: { name: "Marco Bell", email: "marco@synthia.ai" },
    preferences: { tone: "strategic", reportStyle: "narrative-first", frequency: "weekly" },
    monthlyFee: "Fixed $180K / 12 weeks",
    knowledgeCount: 29,
    documentCount: 54,
    conversationCount: 33,
  },
  {
    id: "northwind-partners",
    name: "Northwind Partners — Org redesign",
    shortName: "NP",
    industry: "Financial Services",
    industryIcon: "🏦",
    color: "#1E40AF",
    colorLight: "#EFF6FF",
    entityType: "LLP",
    assignedTo: "priya",
    integrationStatus: "stale",
    integrationLabel: "Notion",
    integrationLastSync: "2 days ago",
    workflowStatus: "diagnostic",
    workflowStatusLabel: "Diagnostic phase",
    workflowStatusNote: "Pulling 360 feedback from 42 stakeholders",
    metrics: { "Engagement Type": "Org redesign", "Employees": "320", "Layers": "7", "Target Layers": "5" },
    contact: { name: "Diana Prescott", email: "diana@northwindpartners.com" },
    preferences: { tone: "warm-professional", reportStyle: "synthesized narratives", frequency: "bi-weekly" },
    monthlyFee: "Fixed $240K / 16 weeks",
    knowledgeCount: 41,
    documentCount: 72,
    conversationCount: 51,
  },
  {
    id: "atlas-mfg",
    name: "Atlas Manufacturing — Ops transform",
    shortName: "AM",
    industry: "Manufacturing",
    industryIcon: "🏭",
    color: "#A16207",
    colorLight: "#FFFBEB",
    entityType: "LLC",
    assignedTo: "naomi",
    integrationStatus: "synced",
    integrationLabel: "Looker",
    integrationLastSync: "3 hours ago",
    workflowStatus: "implementation",
    workflowStatusLabel: "Implementation",
    workflowStatusNote: "Plant 2 rollout week 5 of 8",
    metrics: { "Engagement Type": "Ops transform", "Plants": "4", "Target Throughput": "+18%", "Achieved": "+11%" },
    contact: { name: "Henry Tate", email: "htate@atlasmfg.com" },
    preferences: { tone: "direct, metric-driven", reportStyle: "cockpit dashboards", frequency: "weekly" },
    monthlyFee: "Retainer $42K",
    knowledgeCount: 38,
    documentCount: 96,
    conversationCount: 47,
  },
  {
    id: "keystone-hospitality",
    name: "Keystone Hospitality — Brand",
    shortName: "KH",
    industry: "Hospitality",
    industryIcon: "🏨",
    color: "#BE185D",
    colorLight: "#FDF2F8",
    entityType: "LLC",
    assignedTo: "priya",
    integrationStatus: "synced",
    integrationLabel: "HubSpot",
    integrationLastSync: "1 hour ago",
    workflowStatus: "strategy",
    workflowStatusLabel: "Strategy",
    workflowStatusNote: "Brand architecture framework drafting",
    metrics: { "Engagement Type": "Brand strategy", "Properties": "6", "Avg ADR": "$285", "Occupancy": "71%" },
    contact: { name: "Isabella Reyes", email: "isabella@keystonehospitality.com" },
    preferences: { tone: "warm", reportStyle: "visual-first", frequency: "bi-weekly" },
    monthlyFee: "Fixed $120K / 10 weeks",
    knowledgeCount: 22,
    documentCount: 38,
    conversationCount: 24,
  },
  {
    id: "meridian-fpa",
    name: "Meridian Finance — FP&A setup",
    shortName: "MF",
    industry: "Financial Services",
    industryIcon: "📈",
    color: "#0891B2",
    colorLight: "#ECFEFF",
    entityType: "C-Corp",
    assignedTo: "ethan",
    integrationStatus: "synced",
    integrationLabel: "Stripe",
    integrationLastSync: "45 min ago",
    workflowStatus: "build",
    workflowStatusLabel: "Build phase",
    workflowStatusNote: "Three-statement model v3 in progress",
    metrics: { "Engagement Type": "FP&A build", "Annual Revenue": "$58M", "Model Horizons": "36 months", "Cost Centers": "14" },
    contact: { name: "Vikram Singh", email: "vsingh@meridianfinance.com" },
    preferences: { tone: "technical", reportStyle: "model-driven", frequency: "weekly" },
    monthlyFee: "Fixed $95K / 8 weeks",
    knowledgeCount: 31,
    documentCount: 64,
    conversationCount: 29,
  },
  {
    id: "crestline-capital",
    name: "Crestline Capital — PE value creation",
    shortName: "CC",
    industry: "Private Equity",
    industryIcon: "📊",
    color: "#7C3AED",
    colorLight: "#F5F3FF",
    entityType: "LP",
    assignedTo: "priya",
    integrationStatus: "synced",
    integrationLabel: "Looker",
    integrationLastSync: "2 hours ago",
    workflowStatus: "monitoring",
    workflowStatusLabel: "Portfolio monitoring",
    workflowStatusNote: "Q1 portfolio review cycle",
    metrics: { "Engagement Type": "PE value creation", "Portfolio Cos": "8", "Target IRR": "22%", "Current IRR": "19%" },
    contact: { name: "Daniel Freeman", email: "daniel@crestlinecapital.com" },
    preferences: { tone: "formal", reportStyle: "LP-grade reporting", frequency: "quarterly" },
    monthlyFee: "Retainer $68K",
    knowledgeCount: 52,
    documentCount: 138,
    conversationCount: 61,
  },
  {
    id: "vanta-logistics",
    name: "Vanta Logistics — SCM optimization",
    shortName: "VL",
    industry: "Logistics",
    industryIcon: "🚚",
    color: "#EA580C",
    colorLight: "#FFF7ED",
    entityType: "LLC",
    assignedTo: "naomi",
    integrationStatus: "synced",
    integrationLabel: "Looker",
    integrationLastSync: "4 hours ago",
    workflowStatus: "diagnostic",
    workflowStatusLabel: "Diagnostic phase",
    workflowStatusNote: "Lane-level cost analysis in progress",
    metrics: { "Engagement Type": "SCM optimization", "Daily Shipments": "2,400", "Avg Lane Cost": "$1,280", "Target Savings": "12%" },
    contact: { name: "Yuki Tanaka", email: "yuki@vantalogistics.com" },
    preferences: { tone: "direct", reportStyle: "ops-first", frequency: "weekly" },
    monthlyFee: "Fixed $160K / 12 weeks",
    knowledgeCount: 28,
    documentCount: 72,
    conversationCount: 36,
  },
];

const clients: ClientWorkspace[] = rawEngagements.map((e) => ({
  ...e,
  firmId: "north-arc",
  qbSync: e.integrationStatus,
  qbLastSync: e.integrationLastSync,
  monthlyCloseStatus: "in-progress",
  monthlyCloseNote: e.workflowStatusNote,
}));

// ---------------------------------------------------------------------------
// Attention items
// ---------------------------------------------------------------------------
const attentionItems: AttentionItem[] = [
  {
    id: "na-att-1",
    type: "deadline",
    severity: "critical",
    title: "Lumen Bio board meeting in 72 hours",
    clientId: "lumen-bio",
    description: "Series B board deck leads with Q1 enrollment. Cohort reconciliation just revealed a 1-patient double-count — need to decide how to frame it to the board.",
    detectedAt: "2 hours ago",
    dueDate: "Friday 2pm",
  },
  {
    id: "na-att-2",
    type: "review",
    severity: "high",
    title: "Marina District Builders Q2 cash forecast ready",
    clientId: "pacific-hull",
    from: "james",
    description: "James built the Q2 cash forecast off yesterday's close. Runway extends from 10.8 to 11.4 months. Needs Ethan's review before Rachel sees it.",
    detectedAt: "1 hour ago",
    aiConfidence: 92,
  },
  {
    id: "na-att-3",
    type: "blocked",
    severity: "high",
    title: "Northwind org diagnostic — 7 stakeholders unreachable",
    clientId: "northwind-partners",
    description: "360 feedback is 35 of 42 done. The 7 remaining are all in the London office and our coordinator there is out this week.",
    detectedAt: "4 hours ago",
  },
  {
    id: "na-att-4",
    type: "low-confidence",
    severity: "medium",
    title: "Atlas Plant 2 throughput variance unexplained",
    clientId: "atlas-mfg",
    from: "naomi",
    description: "Plant 2 is hitting 11% throughput gain (target 18%). Naomi thinks it's a maintenance scheduling issue; AI isn't confident enough to recommend a fix yet.",
    detectedAt: "6 hours ago",
    aiConfidence: 72,
  },
];

// ---------------------------------------------------------------------------
// Approval queue
// ---------------------------------------------------------------------------
const approvalQueue: ApprovalQueueItem[] = [
  {
    id: "na-aq-1",
    clientId: "lumen-bio",
    title: "Lumen Bio — Q1 Cohort Reconciliation",
    format: "xlsx",
    generatedBy: "ai",
    aiConfidence: 94,
    highlights: ["Reconciled Q1 enrollment: 427", "Clinical/lab variance resolved", "Single duplicate identified"],
    status: "pending",
    createdAt: "Today 10:09 AM",
    waitingSince: "30m",
    version: 1,
  },
  {
    id: "na-aq-2",
    clientId: "lumen-bio",
    title: "Board Memo — Q1 Enrollment Correction",
    format: "docx",
    generatedBy: "ai",
    aiConfidence: 91,
    highlights: ["Three-paragraph board framing", "Root-cause explanation", "Process fix committed to"],
    status: "pending",
    createdAt: "Today 10:33 AM",
    waitingSince: "5m",
    version: 1,
  },
  {
    id: "na-aq-3",
    clientId: "pacific-hull",
    title: "Marina District Builders — Q2 Cash Forecast",
    format: "xlsx",
    generatedBy: "team",
    generatedByName: "James Okafor",
    aiConfidence: 92,
    highlights: ["Runway: 11.4 months (up from 10.8)", "Top customer concentration 38%", "Crestline invoice terms flagged"],
    status: "pending",
    createdAt: "Today 8:40 AM",
    waitingSince: "2h",
    version: 2,
  },
  {
    id: "na-aq-4",
    clientId: "synthia-gtm",
    title: "Synthia customer interview synthesis — weeks 1-2",
    format: "docx",
    generatedBy: "ai",
    aiConfidence: 87,
    highlights: ["14 interviews synthesized", "Three emerging segments", "Two conflicting product signals flagged"],
    status: "pending",
    createdAt: "Yesterday 5:20 PM",
    waitingSince: "17h",
    version: 1,
  },
  {
    id: "na-aq-5",
    clientId: "atlas-mfg",
    title: "Atlas Plant 2 — throughput diagnostic",
    format: "xlsx",
    generatedBy: "team",
    generatedByName: "Naomi Patel",
    aiConfidence: 82,
    highlights: ["11% vs 18% target gap analysis", "Maintenance scheduling hypothesis", "Data requests for next week"],
    status: "pending",
    createdAt: "Yesterday 4:10 PM",
    waitingSince: "18h",
    version: 2,
  },
  {
    id: "na-aq-6",
    clientId: "crestline-capital",
    title: "Portfolio monitoring — Q1 letter",
    format: "docx",
    generatedBy: "ai",
    aiConfidence: 93,
    highlights: ["All 8 portcos current period commentary", "LP-grade formatting", "IRR trajectory table"],
    status: "pending",
    createdAt: "Today 7:30 AM",
    waitingSince: "3h",
    version: 1,
  },
];

// ---------------------------------------------------------------------------
// AI working now
// ---------------------------------------------------------------------------
const aiTasks: AITask[] = [
  {
    id: "na-ai-1",
    title: "Running Lumen Bio Q2 cohort forecast",
    description: "Projecting enrollment curves for the Series B deck",
    progress: 6,
    total: 12,
    unit: "scenarios",
    estimatedRemaining: "20 min",
    status: "running",
    startedAt: "8:30 AM",
  },
  {
    id: "na-ai-2",
    title: "Synthesizing Synthia customer interviews",
    description: "Processing transcripts from weeks 1-2 of the customer research sprint",
    progress: 14,
    total: 20,
    unit: "interviews",
    estimatedRemaining: "1 hour",
    status: "running",
    startedAt: "7:15 AM",
  },
  {
    id: "na-ai-3",
    title: "Monitoring portco KPIs across Crestline portfolio",
    description: "Daily dashboard refresh for all 8 portfolio companies",
    progress: 8,
    total: 8,
    unit: "portcos",
    status: "running",
    startedAt: "Continuous",
  },
  {
    id: "na-ai-4",
    title: "Marina District Builders customer concentration analysis",
    description: "Segmenting revenue by customer tier for risk scoring",
    progress: 4,
    total: 4,
    unit: "segments",
    status: "waiting-approval",
    startedAt: "6:50 AM",
  },
];

// ---------------------------------------------------------------------------
// Completed today
// ---------------------------------------------------------------------------
const completedToday: CompletedItem[] = [
  { id: "na-c-1", title: "Reconciled Lumen Bio Q1 cohort data", detail: "Clinical + lab feeds reconciled, 1 duplicate found", completedAt: "10:09 AM", category: "detection", itemCount: 1 },
  { id: "na-c-2", title: "Drafted board memo for Lumen Bio", detail: "3-paragraph framing ready for Priya's review", completedAt: "10:33 AM", category: "generation", itemCount: 1 },
  { id: "na-c-3", title: "Pulled customer interview transcripts", detail: "14 transcripts loaded into the synthesis workspace", completedAt: "9:45 AM", category: "reconciliation", itemCount: 14 },
  { id: "na-c-4", title: "Refreshed Crestline portfolio dashboards", detail: "All 8 portcos current as of this morning", completedAt: "8:00 AM", category: "reconciliation", clientCount: 8 },
  { id: "na-c-5", title: "Flagged Atlas Plant 2 variance", detail: "Throughput gap surfaced to Naomi", completedAt: "7:20 AM", category: "detection", itemCount: 1 },
  { id: "na-c-6", title: "Prepared Meridian FP&A model v3 draft", detail: "Three-statement linkage verified", completedAt: "6:30 AM", category: "generation", itemCount: 1 },
  { id: "na-c-7", title: "Scheduled 7 Northwind 360 follow-ups", detail: "London office calendar slots booked via Notion", completedAt: "5:10 AM", category: "communication", itemCount: 7 },
];

// ---------------------------------------------------------------------------
// Weekly overview
// ---------------------------------------------------------------------------
const weeklyOverview: WeeklyOverview = {
  monthlyClose: { completed: 5, total: 9, delta: 2 },
  taxSeason: { docsCollected: 124, docsTotal: 124, urgentReminders: 0 },
  teamWorkload: [
    { memberId: "priya", completed: 5, total: 7 },
    { memberId: "ethan", completed: 6, total: 8 },
    { memberId: "naomi", completed: 5, total: 6 },
    { memberId: "james", completed: 7, total: 9 },
    { memberId: "alicia", completed: 9, total: 12 },
  ],
  quality: { reworkRate: 2.8, reworkRatePrev: 3.4, aiConfidenceAvg: 90, aiConfidencePrev: 86 },
  cost: { apiUsage: 48, apiBudget: 150, costPerClient: 0.58, costTarget: 0.65 },
};

// ---------------------------------------------------------------------------
// Client documents
// ---------------------------------------------------------------------------
const clientDocuments: ClientDocument[] = [
  { id: "na-doc-1", clientId: "lumen-bio", title: "Q1 Cohort Reconciliation", format: "xlsx", source: "ai", version: 1, status: "pending-review", date: "Apr 7, 2026", tags: ["board-prep", "cohort"] },
  { id: "na-doc-2", clientId: "lumen-bio", title: "Board Memo — Q1 Enrollment Correction", format: "docx", source: "ai", version: 1, status: "pending-review", date: "Apr 7, 2026", tags: ["board-prep"] },
  { id: "na-doc-3", clientId: "lumen-bio", title: "Series B Board Deck v6", format: "pdf", source: "team", sourceName: "Priya Raman", version: 6, status: "draft", date: "Apr 6, 2026", tags: ["board-prep"] },
  { id: "na-doc-4", clientId: "lumen-bio", title: "Pipeline model — Q2/Q3 scenarios", format: "xlsx", source: "ai", version: 2, status: "approved", date: "Apr 4, 2026", tags: ["modeling"] },
  { id: "na-doc-5", clientId: "pacific-hull", title: "Q2 Cash Forecast", format: "xlsx", source: "team", sourceName: "James Okafor", version: 2, status: "pending-review", date: "Apr 7, 2026", tags: ["cash-forecast"] },
  { id: "na-doc-6", clientId: "synthia-gtm", title: "Customer interview synthesis — weeks 1-2", format: "docx", source: "ai", version: 1, status: "pending-review", date: "Apr 6, 2026", tags: ["research"] },
  { id: "na-doc-7", clientId: "crestline-capital", title: "Q1 LP letter — Crestline Fund III", format: "docx", source: "ai", version: 1, status: "pending-review", date: "Apr 7, 2026", tags: ["lp-reporting"] },
  { id: "na-doc-8", clientId: "atlas-mfg", title: "Plant 2 throughput diagnostic", format: "xlsx", source: "team", sourceName: "Naomi Patel", version: 2, status: "pending-review", date: "Apr 6, 2026", tags: ["ops"] },
];

// ---------------------------------------------------------------------------
// Client AI activity
// ---------------------------------------------------------------------------
const clientAIActivities: ClientAIActivity[] = [
  { id: "na-caa-1", clientId: "lumen-bio", action: "Reconciled Q1 cohort data", detail: "1 duplicate found, corrected to 427", date: "Apr 7", status: "completed" },
  { id: "na-caa-2", clientId: "lumen-bio", action: "Drafted board memo on correction", detail: "Root-cause + process fix framing", date: "Apr 7", status: "draft" },
  { id: "na-caa-3", clientId: "lumen-bio", action: "Flagged cohort discrepancy", detail: "Clinical 428 vs lab 431", date: "Apr 7", status: "flagged" },
  { id: "na-caa-4", clientId: "lumen-bio", action: "Priya's strategic note", detail: "Flag proactively to the board, not in appendix", date: "Apr 6", status: "note" },
  { id: "na-caa-5", clientId: "pacific-hull", action: "Built Q2 cash forecast", detail: "Runway 11.4 months", date: "Apr 7", status: "draft" },
  { id: "na-caa-6", clientId: "synthia-gtm", action: "Synthesized 14 customer interviews", detail: "Three emerging segments", date: "Apr 6", status: "completed" },
  { id: "na-caa-7", clientId: "atlas-mfg", action: "Flagged Plant 2 throughput gap", detail: "11% achieved vs 18% target", date: "Apr 6", status: "flagged" },
  { id: "na-caa-8", clientId: "crestline-capital", action: "Assembled Q1 LP letter", detail: "All 8 portcos, LP-grade format", date: "Apr 7", status: "draft" },
  { id: "na-caa-9", clientId: "northwind-partners", action: "Organized 360 feedback collection", detail: "35 of 42 complete, London blockers flagged", date: "Apr 7", status: "flagged" },
];

// ---------------------------------------------------------------------------
// Team handoffs
// ---------------------------------------------------------------------------
const teamHandoffs: Record<string, BriefingMessage[]> = {
  "lumen-bio": [
    {
      id: "na-handoff-lumen-1",
      type: "team-handoff",
      timestamp: "30 min ago",
      content: "Priya — I chased the cohort gap. Real Q1 is 427, not 428. Details in the reconciliation. I know it's small but the deck leads with that number and the CEO has been rehearsing to 428.",
      metadata: {
        teamMemberId: "naomi",
        mentionedTo: "priya",
        handoffSubject: "Cohort count reconciliation",
      },
    },
  ],
  "pacific-hull": [
    {
      id: "na-handoff-pacific-1",
      type: "team-handoff",
      timestamp: "2 hours ago",
      content: "Ethan — Q2 cash forecast is ready. Runway came out at 11.4 months, which is a decent beat versus the 10.8 from Q1. Main driver is the Crestline payment schedule finally behaving. Worth looping Rachel in before the board preview on Tuesday.",
      metadata: {
        teamMemberId: "james",
        mentionedTo: "ethan",
        handoffSubject: "Marina District Builders Q2 cash forecast",
      },
    },
  ],
  "atlas-mfg": [
    {
      id: "na-handoff-atlas-1",
      type: "team-handoff",
      timestamp: "6 hours ago",
      content: "Priya — Plant 2 is only at 11% throughput gain vs our 18% target. I think it's maintenance scheduling on the two newer lines but I don't have the historical data to confirm. Pulling the CMMS export this afternoon.",
      metadata: {
        teamMemberId: "naomi",
        mentionedTo: "priya",
        handoffSubject: "Atlas Plant 2 throughput gap",
      },
    },
  ],
};

// ---------------------------------------------------------------------------
// Client knowledge
// ---------------------------------------------------------------------------
const clientKnowledgeMap: Record<string, KnowledgeItem[]> = {
  "lumen-bio": [
    { id: "k1", category: "preference", title: "Kaveh prefers confident, data-led framing", detail: "CEO wants every slide to lead with the number, then the narrative. No hedging. He respects 'I don't know yet' more than qualifiers.", lastUpdated: "3 weeks ago", source: "team-noted" },
    { id: "k2", category: "pattern", title: "Board narrative rehearsal habit", detail: "Kaveh memorizes the deck the day before. Any late changes to numbers need to come with a voicemail so he can re-rehearse.", lastUpdated: "2 weeks ago", source: "ai-learned" },
    { id: "k3", category: "history", title: "Series A was a near-miss on runway math", detail: "Series A deck had a runway error that came out during diligence. Kaveh is scarred. Any number in front of the board gets double-source reconciled.", lastUpdated: "1 month ago", source: "team-noted" },
    { id: "k4", category: "compliance", title: "HIPAA-aware reporting on cohort data", detail: "Never attach raw patient IDs. Aggregate only. Consent log is the source of truth for enrollment counts.", lastUpdated: "2 months ago", source: "team-noted" },
    { id: "k5", category: "contact", title: "Best time to reach Kaveh: Mon/Wed/Fri 7-9 AM PT", detail: "Lab schedule pulls him in the afternoons. Avoid Tues/Thurs entirely.", lastUpdated: "1 month ago", source: "client-shared" },
  ],
  "pacific-hull": [
    { id: "k1", category: "preference", title: "Rachel wants operational, not strategic, framing", detail: "Rachel came up on the ops floor. Dashboards and variance reports land better than executive summaries.", lastUpdated: "2 weeks ago", source: "team-noted" },
    { id: "k2", category: "pattern", title: "Crestline invoice terms are the top cash driver", detail: "Marina District's top customer (Crestline) pays 45-60 days late unless reminded. Plan working capital accordingly.", lastUpdated: "1 month ago", source: "ai-learned" },
    { id: "k3", category: "history", title: "Shop-floor relationship is the moat", detail: "Marina District's pricing power comes from a 20-year relationship with their three largest customers. Don't recommend anything that strains those.", lastUpdated: "2 months ago", source: "team-noted" },
  ],
  "synthia-gtm": [
    { id: "k1", category: "preference", title: "Marco wants provocative point-of-view", detail: "He hires consultants for sharp opinions, not balanced analyses. Lead with the recommendation; defend it with the data.", lastUpdated: "1 week ago", source: "team-noted" },
    { id: "k2", category: "pattern", title: "Weekly check-in rhythm on Fridays 4pm", detail: "Marco does not want async updates. Standing Friday 4pm call is sacred.", lastUpdated: "2 weeks ago", source: "client-shared" },
  ],
};

// ---------------------------------------------------------------------------
// Client channels
// ---------------------------------------------------------------------------
const clientChannels: Record<string, Channel[]> = {
  "lumen-bio": [
    {
      id: "lumen-team",
      type: "team",
      name: "Engagement team",
      description: "Everyone on Lumen Bio",
      participantIds: ["priya", "naomi", "ethan"],
      lastActivity: "20 min ago",
      unreadCount: 2,
    },
    {
      id: "lumen-private",
      type: "private",
      name: "Private with AI",
      description: "Priya's private 1:1 with FractionalOS",
      participantIds: ["priya"],
      lastActivity: "Yesterday",
    },
    {
      id: "lumen-board-prep",
      type: "topic",
      name: "Series B board prep",
      description: "Focused thread for Friday's board meeting",
      participantIds: ["priya", "naomi", "ethan"],
      lastActivity: "1 hour ago",
      unreadCount: 1,
    },
  ],
  "pacific-hull": [
    {
      id: "pacific-team",
      type: "team",
      name: "Engagement team",
      description: "Marina District Builders fractional CFO engagement",
      participantIds: ["ethan", "james"],
      lastActivity: "2 hours ago",
      unreadCount: 1,
    },
    {
      id: "pacific-private",
      type: "private",
      name: "Private with AI",
      participantIds: ["ethan"],
      lastActivity: "Yesterday",
    },
  ],
  "synthia-gtm": [
    {
      id: "synthia-team",
      type: "team",
      name: "Engagement team",
      participantIds: ["ethan", "alicia"],
      lastActivity: "Yesterday",
    },
    {
      id: "synthia-private",
      type: "private",
      name: "Private with AI",
      participantIds: ["ethan"],
      lastActivity: "2 days ago",
    },
  ],
};

// ---------------------------------------------------------------------------
// Upcoming events
// ---------------------------------------------------------------------------
const upcomingEvents: UpcomingEvent[] = [
  { id: "na-ev-1", date: "2026-04-08", dateShort: "Tomorrow", title: "Marina District Builders Q2 forecast review", clientId: "pacific-hull", type: "meeting" },
  { id: "na-ev-2", date: "2026-04-10", dateShort: "Friday", title: "Lumen Bio Series B board meeting", clientId: "lumen-bio", type: "meeting" },
  { id: "na-ev-3", date: "2026-04-11", dateShort: "Apr 11", title: "Synthia weekly check-in", clientId: "synthia-gtm", type: "meeting" },
  { id: "na-ev-4", date: "2026-04-14", dateShort: "Apr 14", title: "Crestline Q1 portfolio review", clientId: "crestline-capital", type: "meeting" },
  { id: "na-ev-5", date: "2026-04-17", dateShort: "Apr 17", title: "Atlas Plant 2 review", clientId: "atlas-mfg", type: "meeting" },
  { id: "na-ev-6", date: "2026-04-22", dateShort: "Apr 22", title: "Northwind diagnostic readout", clientId: "northwind-partners", type: "meeting" },
];

// ---------------------------------------------------------------------------
// Activity feed
// ---------------------------------------------------------------------------
const activityFeed: ActivityItem[] = [
  { id: "na-act-1", memberId: "naomi", action: "finished cohort reconciliation for", target: "Lumen Bio", clientId: "lumen-bio", timeAgo: "30m ago" },
  { id: "na-act-2", memberId: "james", action: "delivered Q2 cash forecast for", target: "Marina District Builders", clientId: "pacific-hull", timeAgo: "2h ago" },
  { id: "na-act-3", memberId: "alicia", action: "synthesized customer interviews for", target: "Synthia Labs", clientId: "synthia-gtm", timeAgo: "Yesterday" },
  { id: "na-act-4", memberId: "priya", action: "reviewed portfolio letter draft for", target: "Crestline Capital", clientId: "crestline-capital", timeAgo: "3h ago" },
  { id: "na-act-5", memberId: "ethan", action: "scoped Q2 operating cadence for", target: "Meridian Finance", clientId: "meridian-fpa", timeAgo: "Yesterday" },
];

// ---------------------------------------------------------------------------
// Live activity ticker
// ---------------------------------------------------------------------------
const liveActivityTicks: ActivityTick[] = [
  { label: "Running cohort scenarios", current: 6, total: 12, unit: "scenarios" },
  { label: "Synthesizing interviews", current: 14, total: 20, unit: "interviews" },
];

// ---------------------------------------------------------------------------
// Firm metadata
// ---------------------------------------------------------------------------
const firm: Firm = {
  id: "north-arc",
  name: "North Arc Advisors",
  shortName: "NA",
  logoColor: "#4338CA", // indigo — Priya's avatar color
  vertical: "consulting",
  tagline: "10 advisors · 22 active engagements",
  heroClientId: "lumen-bio",
  totalClientCount: 22,
};

const config: VerticalConfig = {
  vertical: "consulting",
  labels: {
    clientWord: "Client",
    clientWordPlural: "Clients",
    teamWord: "Engagement team",
    workflowWord: "Engagement phase",
    primaryOutputLabel: "Board deck",
  },
  integrations: [
    { name: "HubSpot", subtitle: "Synced just now", synced: true },
    { name: "Stripe", subtitle: "Synced 20 min ago", synced: true },
    { name: "Notion", subtitle: "Synced 1h ago", synced: true },
    { name: "Looker", subtitle: "Synced 3h ago", synced: true },
  ],
  featuredMetricKeys: ["Engagement Phase", "Raise Target", "Burn Rate", "Board Date"],
};

// ---------------------------------------------------------------------------
// Team collaboration — firm-wide channels + 1:1 DMs
// ---------------------------------------------------------------------------
const firmChannels: FirmChannel[] = [
  {
    id: "na-general",
    name: "#general",
    description: "Firm-wide updates and announcements",
    participantIds: team.map((m) => m.id),
  },
  {
    id: "na-knowledge",
    name: "#craft",
    description: "Consulting craft, frameworks, and client patterns",
    participantIds: team.map((m) => m.id),
  },
];

const firmChannelBriefings: Record<string, BriefingMessage[]> = {
  "na-general": [
    {
      id: "na-gen-1",
      type: "team-update",
      senderId: "priya",
      timestamp: "Monday 7:40 AM",
      content:
        "Team — Lumen Bio board is Friday. Naomi caught a cohort discrepancy this weekend and I want to make sure we're all aligned on the correction story before Kaveh walks into that room. Naomi will share the full reconciliation in the Lumen team channel later this morning.",
      metadata: { teamMemberId: "priya" },
    },
    {
      id: "na-gen-2",
      type: "team-update",
      senderId: "ethan",
      timestamp: "Monday 7:55 AM",
      content:
        "Also: Marina District Builders Q2 cash forecast is ready. Runway came out better than we thought — 11.4 months vs the 10.8 we were tracking. James did great work on the customer concentration model.",
      metadata: { teamMemberId: "ethan" },
    },
    {
      id: "na-gen-3",
      type: "team-update",
      senderId: "naomi",
      timestamp: "Monday 8:12 AM",
      content:
        "Thanks Priya. I'll have the reconciliation posted by 10am with the full audit trail so anyone who wants to understand the correction can. It's small (one patient double-counted) but it matters because the deck leads with Q1 enrollment.",
      metadata: { teamMemberId: "naomi" },
    },
  ],
  "na-knowledge": [
    {
      id: "na-know-1",
      type: "team-update",
      senderId: "james",
      timestamp: "Yesterday 4:30 PM",
      content:
        "Has anyone built a cash forecast for a manufacturer with 3+ large customers making up 60% of revenue? Marina District Builders is my first one and I want to make sure I'm modeling concentration risk the right way.",
      metadata: { teamMemberId: "james" },
    },
    {
      id: "na-know-2",
      type: "team-update",
      senderId: "ethan",
      timestamp: "Yesterday 4:48 PM",
      content:
        "Yes — Keystone Hospitality had similar concentration when we started. The framework I use: model base case, then three scenarios (lose top customer / delay 60 days / reduce by 30%). Run each against 12 months of cash coverage. I'll send you the template.",
      metadata: { teamMemberId: "ethan" },
    },
    {
      id: "na-know-3",
      type: "team-update",
      senderId: "priya",
      timestamp: "Yesterday 5:05 PM",
      content:
        "Add one more: factor in the time to replace the customer. A $3M customer at a manufacturer with a 9-month sales cycle is a different risk than the same customer at a SaaS company with a 60-day cycle.",
      metadata: { teamMemberId: "priya" },
    },
  ],
};

const dmThreads: DMThread[] = [
  { id: "na-dm-priya-naomi", participantIds: ["priya", "naomi"], lastActivity: "45 min ago", unreadCount: 1 },
  { id: "na-dm-priya-ethan", participantIds: ["priya", "ethan"], lastActivity: "2 hours ago" },
  { id: "na-dm-priya-james", participantIds: ["priya", "james"], lastActivity: "Yesterday" },
];

const dmBriefings: Record<string, BriefingMessage[]> = {
  "na-dm-priya-naomi": [
    {
      id: "na-dm-pn-1",
      type: "team-update",
      senderId: "naomi",
      timestamp: "9:30 AM",
      content:
        "Priya — the cohort discrepancy I caught over the weekend turned out to be a single patient double-counted, not a systemic issue. Kaveh is going to ask whether we stress-tested the rest of the data. Honestly, I didn't — I only ran the Q1 reconciliation. Do you want me to do a full audit before Friday or do we flag it as a Q2 follow-up?",
      metadata: { teamMemberId: "naomi" },
    },
    {
      id: "na-dm-pn-2",
      type: "user",
      senderId: "user",
      timestamp: "9:48 AM",
      content:
        "Full audit, but scoped to the Q1 subset only — we can promise a complete stress test for Q2 in the memo. I'd rather tell Kaveh we caught one error and fully verified that section than hand-wave over the rest and get caught later.",
    },
  ],
  "na-dm-priya-ethan": [
    {
      id: "na-dm-pe-1",
      type: "team-update",
      senderId: "ethan",
      timestamp: "Yesterday 3:10 PM",
      content:
        "The Marina District Builders cash forecast is done but I'm second-guessing the assumption I used for Crestline payment terms. The last 6 months they've been paying on time, but historically they've been 45-60 days late. Do I model the new behavior or the 5-year average?",
      metadata: { teamMemberId: "ethan" },
    },
    {
      id: "na-dm-pe-2",
      type: "user",
      senderId: "user",
      timestamp: "Yesterday 3:25 PM",
      content:
        "Use the 5-year average for the base case and show the last-6-months as the upside. Rachel needs to see both — she'll ask, and if we only show the rosy one she won't trust us.",
    },
  ],
  "na-dm-priya-james": [
    {
      id: "na-dm-pj-1",
      type: "team-update",
      senderId: "james",
      timestamp: "Yesterday 10:00 AM",
      content:
        "Priya — Ethan's going to send me his Keystone concentration framework today. Thanks for prompting him in the #craft channel. Is it OK if I use the same framework for my next two engagements, or do you want me to learn it on Marina District Builders first?",
      metadata: { teamMemberId: "james" },
    },
    {
      id: "na-dm-pj-2",
      type: "user",
      senderId: "user",
      timestamp: "Yesterday 10:14 AM",
      content:
        "Use it everywhere. Frameworks become firm IP when the whole team uses them. I'd rather have you fluent with one strong model than hunting for a new one on every engagement.",
    },
  ],
};

// ---------------------------------------------------------------------------
// Global agent briefings — scripted responses for the Home view Ask panel.
// ---------------------------------------------------------------------------
const globalAgentBriefings: Record<string, BriefingMessage[]> = {
  "morning-briefing": [
    {
      id: "na-ga-morning-1",
      type: "briefing",
      senderId: "ai",
      timestamp: "7:47 AM",
      content: "**Good morning, Priya.** Here's where your 22 engagements stand this morning:",
      metadata: {
        highlights: [
          "**Lumen Bio board is Friday** — cohort reconciliation is ready, one patient was double-counted (Q1: 427 not 428)",
          "**Marina District Builders Q2 cash forecast** is ready for Ethan's review — runway extended to 11.4 months",
          "**Northwind 360 feedback** — 35 of 42 complete, London office is blocking the rest",
          "**Crestmark Q1 LP letter** drafted, ready for your review",
        ],
      },
    },
  ],
  "client-status": [
    {
      id: "na-ga-cs-1",
      type: "ai-response",
      senderId: "ai",
      timestamp: "Just now",
      content:
        "Active engagement phase distribution:\n\n" +
        "• **Discovery / Diagnostic** — 5 engagements\n" +
        "• **Design / Build** — 7 engagements\n" +
        "• **Implementation** — 4 engagements\n" +
        "• **Operating cadence / Monitoring** — 6 engagements\n\n" +
        "Lumen Bio is the one that needs you this week. Everything else is on track.",
    },
  ],
  "team-workload": [
    {
      id: "na-ga-tw-1",
      type: "ai-response",
      senderId: "ai",
      timestamp: "Just now",
      content:
        "Engagement team loads:\n\n" +
        "• **Ethan Walsh** — 8 engagements, Marina District Builders is the priority\n" +
        "• **Naomi Patel** — 6 engagements, just caught the Lumen cohort issue\n" +
        "• **James Okafor** — 9 engagements, capacity for more analysis work\n" +
        "• **Alicia Chen** — 12 engagements, at full load but all routine\n\n" +
        "Naomi is punching above her weight this week — consider recognizing that in 1:1.",
    },
  ],
};

export const northArcData: FirmData = {
  firm,
  config,
  team,
  clients,
  attentionItems,
  approvalQueue,
  aiTasks,
  completedToday,
  weeklyOverview,
  clientDocuments,
  clientAIActivities,
  teamHandoffs,
  clientKnowledgeMap,
  clientChannels,
  upcomingEvents,
  activityFeed,
  liveActivityTicks,
  liveAlertsByClient: getNorthArcLiveAlerts(),
  firmChannels,
  firmChannelBriefings,
  dmThreads,
  dmBriefings,
  globalAgentBriefings,
  heroChannelScript: getLumenBioTeamChannelScript,
};
