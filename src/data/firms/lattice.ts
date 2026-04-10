// =============================================================================
// Lattice Partners HR — Total Rewards & People Ops Consulting
// =============================================================================
// A 9-person HR consultancy specializing in total rewards, leadership advisory,
// and people ops builds for growth-stage companies. Partners Dana Vu and Marco
// Singh built Lattice after leaving a global rewards firm. Hero engagement:
// Helix Robotics VP Engineering compensation review, where a CEO parity
// pushback becomes an opportunity to fix an underpaid Director role.
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
import { getHelixTeamChannelScript, getLatticeLiveAlerts } from "./scripts/helix-comp";
import type { FirmData, Firm, VerticalConfig, FirmChannel, DMThread } from "./types";

// ---------------------------------------------------------------------------
// Team
// ---------------------------------------------------------------------------
const team: TeamMember[] = [
  { id: "dana", name: "Dana Vu", initials: "DV", role: "Managing Partner · Total Rewards", avatarColor: "#9333EA", status: "online", clientCount: 7, completedThisWeek: 5 },
  { id: "marco", name: "Marco Singh", initials: "MS", role: "Partner · Leadership Advisory", avatarColor: "#0891B2", status: "online", clientCount: 6, completedThisWeek: 4 },
  { id: "elena-r", name: "Elena Rios", initials: "ER", role: "Senior Consultant · Comp & Benefits", avatarColor: "#DB2777", status: "online", clientCount: 8, completedThisWeek: 7 },
  { id: "oliver", name: "Oliver Tam", initials: "OT", role: "Senior Consultant · People Ops", avatarColor: "#059669", status: "online", clientCount: 6, completedThisWeek: 5 },
  { id: "riya", name: "Riya Gill", initials: "RG", role: "Analyst", avatarColor: "#D97706", status: "away", clientCount: 11, completedThisWeek: 9 },
];

// ---------------------------------------------------------------------------
// Clients (9)
// ---------------------------------------------------------------------------
type ClientSeed = Omit<ClientWorkspace, "qbSync" | "monthlyCloseStatus" | "firmId" | "integrationStatus" | "integrationLabel" | "integrationLastSync" | "workflowStatus" | "workflowStatusLabel" | "workflowStatusNote"> & {
  integrationStatus: NonNullable<ClientWorkspace["integrationStatus"]>;
  integrationLabel: string;
  integrationLastSync: string;
  workflowStatus: string;
  workflowStatusLabel: string;
  workflowStatusNote?: string;
};

const rawClients: ClientSeed[] = [
  {
    id: "helix-robotics",
    name: "Helix Robotics",
    shortName: "HX",
    industry: "Robotics",
    industryIcon: "🤖",
    color: "#9333EA",
    colorLight: "#FAF5FF",
    entityType: "Growth-stage",
    assignedTo: "dana",
    integrationStatus: "synced",
    integrationLabel: "Radford",
    integrationLastSync: "Just now",
    workflowStatus: "comp-review",
    workflowStatusLabel: "Comp review",
    workflowStatusNote: "VP Eng recommendation awaiting CEO framing",
    metrics: {
      "Engagement Stage": "Comp review",
      "Headcount": "218",
      "Engagement Fee": "$85K",
      "Next Milestone": "Apr 10 board review",
    },
    contact: { name: "Kiran Shah", email: "kiran@helixrobotics.com" },
    preferences: { tone: "warm-technical", reportStyle: "memo with data appendix", frequency: "weekly" },
    monthlyFee: "$85K engagement",
    knowledgeCount: 42,
    documentCount: 112,
    conversationCount: 58,
  },
  {
    id: "meridian-people-ops",
    name: "Meridian Finance — People Ops",
    shortName: "MF",
    industry: "Financial Services",
    industryIcon: "📊",
    color: "#0891B2",
    colorLight: "#ECFEFF",
    entityType: "C-Corp",
    assignedTo: "oliver",
    integrationStatus: "synced",
    integrationLabel: "Culture Amp",
    integrationLastSync: "15 min ago",
    workflowStatus: "diagnostic",
    workflowStatusLabel: "Diagnostic",
    workflowStatusNote: "Q1 culture pulse synthesis ready",
    metrics: { "Engagement Stage": "Diagnostic", "Headcount": "420", "Engagement Fee": "$62K" },
    contact: { name: "Janelle Ortiz", email: "janelle@meridianfinance.com" },
    preferences: { tone: "structured", reportStyle: "data-forward", frequency: "bi-weekly" },
    monthlyFee: "$62K engagement",
    knowledgeCount: 33,
    documentCount: 78,
    conversationCount: 41,
  },
  {
    id: "vantage-biotech",
    name: "Vantage Biotech — Total Rewards",
    shortName: "VB",
    industry: "Biotech",
    industryIcon: "🧬",
    color: "#059669",
    colorLight: "#ECFDF5",
    entityType: "Public Co.",
    assignedTo: "dana",
    integrationStatus: "synced",
    integrationLabel: "Radford",
    integrationLastSync: "1 hour ago",
    workflowStatus: "design",
    workflowStatusLabel: "Program design",
    workflowStatusNote: "2026 equity refresh program draft",
    metrics: { "Engagement Stage": "Program design", "Headcount": "880", "Engagement Fee": "$140K" },
    contact: { name: "Sofia Mendes", email: "sofia@vantagebio.com" },
    preferences: { tone: "formal", reportStyle: "comprehensive memos", frequency: "weekly" },
    monthlyFee: "$140K engagement",
    knowledgeCount: 51,
    documentCount: 164,
    conversationCount: 72,
  },
  {
    id: "starline-manufacturing",
    name: "Starline Manufacturing",
    shortName: "SM",
    industry: "Manufacturing",
    industryIcon: "🏭",
    color: "#D97706",
    colorLight: "#FFFBEB",
    entityType: "Family-owned",
    assignedTo: "marco",
    integrationStatus: "stale",
    integrationLabel: "BambooHR",
    integrationLastSync: "2 days ago",
    workflowStatus: "succession",
    workflowStatusLabel: "Succession planning",
    workflowStatusNote: "Generational handover scoping",
    metrics: { "Engagement Stage": "Succession", "Headcount": "640", "Engagement Fee": "$95K" },
    contact: { name: "Victor Thornton", email: "victor@starlinemfg.com" },
    preferences: { tone: "personal-formal", reportStyle: "narrative with decisions", frequency: "bi-weekly" },
    monthlyFee: "$95K engagement",
    knowledgeCount: 38,
    documentCount: 92,
    conversationCount: 48,
  },
  {
    id: "aurora-saas",
    name: "Aurora SaaS — Comp Bands",
    shortName: "AU",
    industry: "SaaS",
    industryIcon: "🌅",
    color: "#7C3AED",
    colorLight: "#F5F3FF",
    entityType: "C-Corp",
    assignedTo: "elena-r",
    integrationStatus: "synced",
    integrationLabel: "Lattice",
    integrationLastSync: "30 min ago",
    workflowStatus: "build",
    workflowStatusLabel: "Build",
    workflowStatusNote: "Engineering leveling framework v2",
    metrics: { "Engagement Stage": "Build", "Headcount": "180", "Engagement Fee": "$58K" },
    contact: { name: "Hannah Lee", email: "hannah@aurorasaas.com" },
    preferences: { tone: "crisp", reportStyle: "frameworks + examples", frequency: "weekly" },
    monthlyFee: "$58K engagement",
    knowledgeCount: 27,
    documentCount: 64,
    conversationCount: 35,
  },
  {
    id: "ironclad-defense",
    name: "Ironclad Defense — Leadership",
    shortName: "ID",
    industry: "Government / Defense",
    industryIcon: "🛡",
    color: "#475569",
    colorLight: "#F8FAFC",
    entityType: "Private",
    assignedTo: "marco",
    integrationStatus: "synced",
    integrationLabel: "Gusto",
    integrationLastSync: "3 hours ago",
    workflowStatus: "advisory",
    workflowStatusLabel: "Leadership advisory",
    workflowStatusNote: "New CTO 90-day plan",
    metrics: { "Engagement Stage": "Advisory", "Headcount": "1,200", "Engagement Fee": "$110K" },
    contact: { name: "Colonel Rachel Voss (ret.)", email: "rvoss@ironclad.com" },
    preferences: { tone: "direct-formal", reportStyle: "briefing format", frequency: "weekly" },
    monthlyFee: "$110K engagement",
    knowledgeCount: 44,
    documentCount: 118,
    conversationCount: 54,
  },
  {
    id: "linden-health",
    name: "Linden Health — Benefits Review",
    shortName: "LH",
    industry: "Healthcare",
    industryIcon: "🏥",
    color: "#16A34A",
    colorLight: "#F0FDF4",
    entityType: "Non-profit",
    assignedTo: "dana",
    integrationStatus: "synced",
    integrationLabel: "Gusto",
    integrationLastSync: "2 hours ago",
    workflowStatus: "review",
    workflowStatusLabel: "Review",
    workflowStatusNote: "2026 benefits renewal analysis",
    metrics: { "Engagement Stage": "Review", "Headcount": "780", "Engagement Fee": "$72K" },
    contact: { name: "Dr. Priya Desai", email: "pdesai@lindenhealth.org" },
    preferences: { tone: "warm-clinical", reportStyle: "options with trade-offs", frequency: "bi-weekly" },
    monthlyFee: "$72K engagement",
    knowledgeCount: 36,
    documentCount: 89,
    conversationCount: 44,
  },
  {
    id: "tollgate-retail",
    name: "Tollgate Retail — Hourly Comp",
    shortName: "TR",
    industry: "Retail",
    industryIcon: "🛍",
    color: "#BE185D",
    colorLight: "#FDF2F8",
    entityType: "LLC",
    assignedTo: "elena-r",
    integrationStatus: "synced",
    integrationLabel: "BambooHR",
    integrationLastSync: "1 hour ago",
    workflowStatus: "analysis",
    workflowStatusLabel: "Analysis",
    workflowStatusNote: "Wage floor regional analysis",
    metrics: { "Engagement Stage": "Analysis", "Store Count": "42", "Engagement Fee": "$48K" },
    contact: { name: "Bridget O'Malley", email: "bridget@tollgateretail.com" },
    preferences: { tone: "practical", reportStyle: "action-oriented", frequency: "bi-weekly" },
    monthlyFee: "$48K engagement",
    knowledgeCount: 21,
    documentCount: 56,
    conversationCount: 28,
  },
  {
    id: "crestmark-capital",
    name: "Crestmark Capital — Carry Design",
    shortName: "CK",
    industry: "Private Equity",
    industryIcon: "💼",
    color: "#0F766E",
    colorLight: "#ECFDF5",
    entityType: "LP",
    assignedTo: "dana",
    integrationStatus: "synced",
    integrationLabel: "Radford",
    integrationLastSync: "4 hours ago",
    workflowStatus: "design",
    workflowStatusLabel: "Program design",
    workflowStatusNote: "Fund III carry structure modeling",
    metrics: { "Engagement Stage": "Program design", "Fund Size": "$850M", "Engagement Fee": "$128K" },
    contact: { name: "Lawrence Crestmark", email: "lcrestmark@crestmarkcap.com" },
    preferences: { tone: "formal", reportStyle: "LP-grade modeling", frequency: "quarterly" },
    monthlyFee: "$128K engagement",
    knowledgeCount: 48,
    documentCount: 142,
    conversationCount: 63,
  },
];

const clients: ClientWorkspace[] = rawClients.map((c) => ({
  ...c,
  firmId: "lattice-partners",
  qbSync: c.integrationStatus,
  qbLastSync: c.integrationLastSync,
  monthlyCloseStatus: "in-progress",
  monthlyCloseNote: c.workflowStatusNote,
}));

// ---------------------------------------------------------------------------
// Attention items
// ---------------------------------------------------------------------------
const attentionItems: AttentionItem[] = [
  {
    id: "lt-att-1",
    type: "deadline",
    severity: "critical",
    title: "Helix board comp review in 48 hours",
    clientId: "helix-robotics",
    description: "VP Eng recommendation needs framing for the CEO's parity concern. Scenario B memo ready for Dana's review.",
    detectedAt: "1 hour ago",
    dueDate: "Friday AM",
  },
  {
    id: "lt-att-2",
    type: "review",
    severity: "high",
    title: "Meridian Q1 culture pulse ready",
    clientId: "meridian-people-ops",
    from: "oliver",
    description: "327 responses (82% participation). Manager-quality variance is the dominant theme. Two early burnout signals in Sales + Support.",
    detectedAt: "30 min ago",
    aiConfidence: 89,
  },
  {
    id: "lt-att-3",
    type: "blocked",
    severity: "high",
    title: "Vantage Biotech 2026 equity refresh — waiting on proxy data",
    clientId: "vantage-biotech",
    description: "Public-comp proxy data for the peer group isn't current. Can't finalize the refresh program until Radford pushes the April cut.",
    detectedAt: "3 hours ago",
  },
  {
    id: "lt-att-4",
    type: "low-confidence",
    severity: "medium",
    title: "Starline succession scoping stalled",
    clientId: "starline-manufacturing",
    from: "marco",
    description: "Victor and his nephew haven't aligned on roles in the handover. Scoping memo on hold until Marco can broker a direct conversation.",
    detectedAt: "4 hours ago",
    aiConfidence: 68,
  },
];

// ---------------------------------------------------------------------------
// Approval queue
// ---------------------------------------------------------------------------
const approvalQueue: ApprovalQueueItem[] = [
  {
    id: "lt-aq-1",
    clientId: "helix-robotics",
    title: "Helix — VP Eng Comp Band Memo",
    format: "xlsx",
    generatedBy: "ai",
    aiConfidence: 93,
    highlights: ["Radford P75 band for VP Eng role", "Internal parity analysis vs 14 peers", "Two scenarios with recommendation"],
    status: "pending",
    createdAt: "Today 9:33 AM",
    waitingSince: "25m",
    version: 1,
  },
  {
    id: "lt-aq-2",
    clientId: "helix-robotics",
    title: "Email — VP Eng comp recommendation",
    format: "email",
    generatedBy: "ai",
    aiConfidence: 94,
    highlights: ["Warm tone to CEO", "Acknowledges parity concern first", "Frames Director adjustment as corrective"],
    status: "pending",
    createdAt: "Today 10:05 AM",
    waitingSince: "5m",
    version: 1,
  },
  {
    id: "lt-aq-3",
    clientId: "meridian-people-ops",
    title: "Meridian Q1 culture pulse — synthesis",
    format: "docx",
    generatedBy: "team",
    generatedByName: "Oliver Tam",
    aiConfidence: 89,
    highlights: ["327 responses synthesized", "Manager quality variance flagged", "Burnout signals in Sales + Support"],
    status: "pending",
    createdAt: "Today 8:45 AM",
    waitingSince: "2h",
    version: 2,
  },
  {
    id: "lt-aq-4",
    clientId: "vantage-biotech",
    title: "Vantage 2026 equity refresh — draft",
    format: "xlsx",
    generatedBy: "ai",
    aiConfidence: 85,
    highlights: ["RSU program structure", "Cliff + vesting scenarios", "Waiting on April Radford cut"],
    status: "pending",
    createdAt: "Yesterday 3:20 PM",
    waitingSince: "19h",
    version: 1,
  },
  {
    id: "lt-aq-5",
    clientId: "aurora-saas",
    title: "Aurora engineering leveling framework",
    format: "docx",
    generatedBy: "team",
    generatedByName: "Elena Rios",
    aiConfidence: 92,
    highlights: ["L3-L7 leveling with calibration examples", "Comp bands anchored to Radford P60", "Ready for Hannah's review"],
    status: "pending",
    createdAt: "Today 7:50 AM",
    waitingSince: "2h",
    version: 2,
  },
  {
    id: "lt-aq-6",
    clientId: "ironclad-defense",
    title: "New CTO — 90-day plan",
    format: "docx",
    generatedBy: "team",
    generatedByName: "Marco Singh",
    aiConfidence: 90,
    highlights: ["30/60/90 cadence", "Stakeholder mapping", "First 14 days detailed"],
    status: "pending",
    createdAt: "Yesterday 5:40 PM",
    waitingSince: "16h",
    version: 1,
  },
];

// ---------------------------------------------------------------------------
// AI working now
// ---------------------------------------------------------------------------
const aiTasks: AITask[] = [
  {
    id: "lt-ai-1",
    title: "Running Helix parity analysis",
    description: "Cross-referencing 14 similar-stage robotics companies against Radford",
    progress: 14,
    total: 14,
    unit: "companies",
    status: "waiting-approval",
    startedAt: "8:15 AM",
  },
  {
    id: "lt-ai-2",
    title: "Synthesizing Meridian culture pulse",
    description: "Processing 327 Q1 responses across all 42 managers",
    progress: 327,
    total: 327,
    unit: "responses",
    status: "waiting-approval",
    startedAt: "7:10 AM",
  },
  {
    id: "lt-ai-3",
    title: "Monitoring Radford Q1 cut",
    description: "Watching for April cut push from Radford",
    progress: 0,
    total: 1,
    unit: "cuts",
    status: "running",
    startedAt: "Continuous",
  },
  {
    id: "lt-ai-4",
    title: "Pulling Vantage peer proxies",
    description: "Refreshing comp disclosures for Vantage's public peer group",
    progress: 7,
    total: 12,
    unit: "filings",
    estimatedRemaining: "1 hour",
    status: "running",
    startedAt: "8:40 AM",
  },
];

// ---------------------------------------------------------------------------
// Completed today
// ---------------------------------------------------------------------------
const completedToday: CompletedItem[] = [
  { id: "lt-c-1", title: "Generated Helix VP Eng comp memo", detail: "Two scenarios with parity analysis", completedAt: "9:33 AM", category: "generation", itemCount: 1 },
  { id: "lt-c-2", title: "Drafted Helix CEO cover email", detail: "Warm tone acknowledging parity concern", completedAt: "10:05 AM", category: "generation", itemCount: 1 },
  { id: "lt-c-3", title: "Synthesized Meridian culture pulse", detail: "327 responses, manager-quality theme surfaced", completedAt: "8:45 AM", category: "learning", itemCount: 327 },
  { id: "lt-c-4", title: "Built Aurora engineering leveling draft", detail: "L3-L7 framework with calibration", completedAt: "7:50 AM", category: "generation", itemCount: 1 },
  { id: "lt-c-5", title: "Drafted CTO 90-day plan for Ironclad", detail: "Stakeholder mapping + first 14 days", completedAt: "Yesterday 5:40 PM", category: "generation", itemCount: 1 },
  { id: "lt-c-6", title: "Refreshed Crestmark carry model", detail: "Fund III waterfall updated with latest LP terms", completedAt: "5:20 AM", category: "reconciliation", itemCount: 1 },
  { id: "lt-c-7", title: "Monitored Radford April cut availability", detail: "Still pending — daily check continues", completedAt: "4:00 AM", category: "detection", itemCount: 1 },
];

// ---------------------------------------------------------------------------
// Weekly overview
// ---------------------------------------------------------------------------
const weeklyOverview: WeeklyOverview = {
  monthlyClose: { completed: 4, total: 9, delta: 2 },
  taxSeason: { docsCollected: 112, docsTotal: 112, urgentReminders: 0 },
  teamWorkload: [
    { memberId: "dana", completed: 5, total: 7 },
    { memberId: "marco", completed: 4, total: 6 },
    { memberId: "elena-r", completed: 7, total: 8 },
    { memberId: "oliver", completed: 5, total: 6 },
    { memberId: "riya", completed: 9, total: 11 },
  ],
  quality: { reworkRate: 2.6, reworkRatePrev: 3.0, aiConfidenceAvg: 91, aiConfidencePrev: 88 },
  cost: { apiUsage: 38, apiBudget: 130, costPerClient: 0.52, costTarget: 0.60 },
};

// ---------------------------------------------------------------------------
// Client documents
// ---------------------------------------------------------------------------
const clientDocuments: ClientDocument[] = [
  { id: "lt-doc-1", clientId: "helix-robotics", title: "VP Eng Comp Band Memo", format: "xlsx", source: "ai", version: 1, status: "pending-review", date: "Apr 7, 2026", tags: ["comp", "rewards"] },
  { id: "lt-doc-2", clientId: "helix-robotics", title: "Email — VP Eng recommendation", format: "email", source: "ai", version: 1, status: "pending-review", date: "Apr 7, 2026", tags: ["client-comms"] },
  { id: "lt-doc-3", clientId: "helix-robotics", title: "Q4 2025 comp benchmark report", format: "pdf", source: "team", sourceName: "Elena Rios", version: 1, status: "approved", date: "Jan 15, 2026", tags: ["comp"] },
  { id: "lt-doc-4", clientId: "meridian-people-ops", title: "Meridian Q1 culture pulse synthesis", format: "docx", source: "team", sourceName: "Oliver Tam", version: 2, status: "pending-review", date: "Apr 7, 2026", tags: ["culture", "diagnostic"] },
  { id: "lt-doc-5", clientId: "vantage-biotech", title: "2026 equity refresh — program design", format: "xlsx", source: "ai", version: 1, status: "pending-review", date: "Apr 6, 2026", tags: ["rewards"] },
  { id: "lt-doc-6", clientId: "aurora-saas", title: "Engineering leveling framework v2", format: "docx", source: "team", sourceName: "Elena Rios", version: 2, status: "pending-review", date: "Apr 7, 2026", tags: ["comp", "leveling"] },
  { id: "lt-doc-7", clientId: "ironclad-defense", title: "New CTO 90-day plan", format: "docx", source: "team", sourceName: "Marco Singh", version: 1, status: "pending-review", date: "Apr 6, 2026", tags: ["leadership"] },
  { id: "lt-doc-8", clientId: "crestmark-capital", title: "Fund III carry waterfall model", format: "xlsx", source: "ai", version: 1, status: "draft", date: "Apr 5, 2026", tags: ["rewards"] },
];

// ---------------------------------------------------------------------------
// Client AI activity
// ---------------------------------------------------------------------------
const clientAIActivities: ClientAIActivity[] = [
  { id: "lt-caa-1", clientId: "helix-robotics", action: "Built VP Eng comp band memo", detail: "Two scenarios with parity analysis", date: "Apr 7", status: "draft" },
  { id: "lt-caa-2", clientId: "helix-robotics", action: "Drafted CEO cover email", detail: "Warm tone, parity-first framing", date: "Apr 7", status: "draft" },
  { id: "lt-caa-3", clientId: "helix-robotics", action: "Flagged CEO parity pushback", detail: "Director to VP Eng gap at 72% concerned CEO", date: "Apr 7", status: "flagged" },
  { id: "lt-caa-4", clientId: "helix-robotics", action: "Dana's strategic note", detail: "Scenario B is the right call — corrective not generous", date: "Apr 6", status: "note" },
  { id: "lt-caa-5", clientId: "meridian-people-ops", action: "Synthesized Q1 culture pulse", detail: "Manager-quality variance surfaced", date: "Apr 7", status: "completed" },
  { id: "lt-caa-6", clientId: "vantage-biotech", action: "Drafted 2026 equity refresh program", detail: "Waiting on Radford April cut", date: "Apr 6", status: "flagged" },
  { id: "lt-caa-7", clientId: "aurora-saas", action: "Built engineering leveling framework", detail: "L3-L7 with calibration", date: "Apr 7", status: "draft" },
  { id: "lt-caa-8", clientId: "ironclad-defense", action: "Drafted CTO 90-day plan", detail: "30/60/90 cadence with stakeholder map", date: "Apr 6", status: "draft" },
  { id: "lt-caa-9", clientId: "starline-manufacturing", action: "Scoped succession planning blockers", detail: "Victor + nephew role alignment needed", date: "Apr 6", status: "flagged" },
];

// ---------------------------------------------------------------------------
// Team handoffs
// ---------------------------------------------------------------------------
const teamHandoffs: Record<string, BriefingMessage[]> = {
  "helix-robotics": [
    {
      id: "lt-handoff-helix-1",
      type: "team-handoff",
      timestamp: "25 min ago",
      content: "Dana — VP Eng band lands at $340K base / $510K TC. The issue isn't the number — it's that the current Director of Platform is 8% under P50. Scenario B memo and CEO cover email ready for you.",
      metadata: {
        teamMemberId: "elena-r",
        mentionedTo: "dana",
        handoffSubject: "VP Eng comp — scenario B ready",
      },
    },
  ],
  "meridian-people-ops": [
    {
      id: "lt-handoff-meridian-1",
      type: "team-handoff",
      timestamp: "2 hours ago",
      content: "Dana — Meridian Q1 culture pulse is in. 327 responses, 82% participation. Manager quality variance is the dominant theme. Two burnout early signals in Sales and Support that I'd want to flag to Janelle before the readout.",
      metadata: {
        teamMemberId: "oliver",
        mentionedTo: "dana",
        handoffSubject: "Meridian Q1 culture pulse",
      },
    },
  ],
  "starline-manufacturing": [
    {
      id: "lt-handoff-starline-1",
      type: "team-handoff",
      timestamp: "4 hours ago",
      content: "Dana — Starline succession scoping is stuck because Victor and his nephew haven't aligned on roles in the handover. I don't think a memo can solve this one. Can you reach Victor directly? He trusts you.",
      metadata: {
        teamMemberId: "marco",
        mentionedTo: "dana",
        handoffSubject: "Starline succession — Victor conversation needed",
      },
    },
  ],
};

// ---------------------------------------------------------------------------
// Client knowledge
// ---------------------------------------------------------------------------
const clientKnowledgeMap: Record<string, KnowledgeItem[]> = {
  "helix-robotics": [
    { id: "k1", category: "preference", title: "Kiran values direct, numbers-first framing", detail: "Helix CEO prefers memos that lead with the recommendation and the number. She reads carefully — every qualifier will be questioned.", lastUpdated: "2 weeks ago", source: "team-noted" },
    { id: "k2", category: "history", title: "Series B closed Q4 2025 with a leadership mandate", detail: "The Series B included a board-level commitment to compete for senior engineering talent. That's why VP Eng is at P75.", lastUpdated: "5 months ago", source: "client-shared" },
    { id: "k3", category: "pattern", title: "Parity concerns always precede a broader band review", detail: "Every time Kiran raises parity concerns, she's usually pointing at a broader underpaid segment. Listen for what else she's worried about.", lastUpdated: "1 month ago", source: "ai-learned" },
    { id: "k4", category: "compliance", title: "Radford P75 is the board's stated bar for leadership roles", detail: "Board minutes from Nov 2025 committed to P75 at the leadership tier. We shouldn't go below without explicit board cover.", lastUpdated: "3 months ago", source: "team-noted" },
    { id: "k5", category: "contact", title: "Kiran reachable Mon-Wed before 9 AM PT", detail: "She blocks afternoons for product reviews. Early morning is when she has headspace for comp conversations.", lastUpdated: "1 month ago", source: "ai-learned" },
  ],
  "meridian-people-ops": [
    { id: "k1", category: "preference", title: "Janelle wants data before narrative", detail: "Meridian's head of People Ops is a former Goldman analyst. She wants the chart before the commentary.", lastUpdated: "3 weeks ago", source: "team-noted" },
    { id: "k2", category: "pattern", title: "Manager-quality variance recurs every pulse", detail: "This is the third consecutive quarter where manager-quality variance is the top theme. Pattern, not noise.", lastUpdated: "2 weeks ago", source: "ai-learned" },
  ],
  "vantage-biotech": [
    { id: "k1", category: "compliance", title: "SEC proxy disclosure constraints", detail: "Vantage is public — any recommendations we make inform their proxy. Needs to survive legal review.", lastUpdated: "1 month ago", source: "team-noted" },
    { id: "k2", category: "preference", title: "Sofia prefers comprehensive memos", detail: "Vantage CHRO wants the full memo with appendices. Do not summarize — she reads the whole thing.", lastUpdated: "3 weeks ago", source: "client-shared" },
  ],
};

// ---------------------------------------------------------------------------
// Client channels — hero client gets 3 channels including a notable private channel
// ---------------------------------------------------------------------------
const clientChannels: Record<string, Channel[]> = {
  "helix-robotics": [
    {
      id: "helix-team",
      type: "team",
      name: "Engagement team",
      description: "Everyone on Helix Robotics",
      participantIds: ["dana", "elena-r", "marco"],
      lastActivity: "15 min ago",
      unreadCount: 2,
    },
    {
      id: "helix-private",
      type: "private",
      name: "Private with AI",
      description: "Dana's candid 1:1 with Firmem",
      participantIds: ["dana"],
      lastActivity: "Yesterday",
      unreadCount: 1,
    },
    {
      id: "helix-comp-review",
      type: "topic",
      name: "VP Eng comp review",
      description: "Focused thread for the comp recommendation",
      participantIds: ["dana", "elena-r"],
      lastActivity: "30 min ago",
    },
  ],
  "meridian-people-ops": [
    {
      id: "meridian-team",
      type: "team",
      name: "Engagement team",
      participantIds: ["dana", "oliver"],
      lastActivity: "2 hours ago",
      unreadCount: 1,
    },
    {
      id: "meridian-private",
      type: "private",
      name: "Private with AI",
      participantIds: ["dana"],
      lastActivity: "Yesterday",
    },
  ],
  "vantage-biotech": [
    {
      id: "vantage-team",
      type: "team",
      name: "Engagement team",
      participantIds: ["dana", "elena-r"],
      lastActivity: "3 hours ago",
    },
    {
      id: "vantage-private",
      type: "private",
      name: "Private with AI",
      participantIds: ["dana"],
      lastActivity: "2 days ago",
    },
  ],
};

// ---------------------------------------------------------------------------
// Upcoming events
// ---------------------------------------------------------------------------
const upcomingEvents: UpcomingEvent[] = [
  { id: "lt-ev-1", date: "2026-04-08", dateShort: "Tomorrow", title: "Meridian culture pulse readout", clientId: "meridian-people-ops", type: "meeting" },
  { id: "lt-ev-2", date: "2026-04-10", dateShort: "Friday", title: "Helix board comp review", clientId: "helix-robotics", type: "meeting" },
  { id: "lt-ev-3", date: "2026-04-14", dateShort: "Apr 14", title: "Vantage 2026 equity refresh review", clientId: "vantage-biotech", type: "meeting" },
  { id: "lt-ev-4", date: "2026-04-17", dateShort: "Apr 17", title: "Aurora leveling framework sign-off", clientId: "aurora-saas", type: "meeting" },
  { id: "lt-ev-5", date: "2026-04-21", dateShort: "Apr 21", title: "Ironclad CTO onboarding kickoff", clientId: "ironclad-defense", type: "meeting" },
  { id: "lt-ev-6", date: "2026-04-25", dateShort: "Apr 25", title: "Crestmark Fund III LP preview", clientId: "crestmark-capital", type: "meeting" },
];

// ---------------------------------------------------------------------------
// Activity feed
// ---------------------------------------------------------------------------
const activityFeed: ActivityItem[] = [
  { id: "lt-act-1", memberId: "elena-r", action: "finalized VP Eng comp band memo for", target: "Helix Robotics", clientId: "helix-robotics", timeAgo: "25m ago" },
  { id: "lt-act-2", memberId: "oliver", action: "synthesized Q1 culture pulse for", target: "Meridian Finance", clientId: "meridian-people-ops", timeAgo: "2h ago" },
  { id: "lt-act-3", memberId: "elena-r", action: "shipped engineering leveling framework for", target: "Aurora SaaS", clientId: "aurora-saas", timeAgo: "3h ago" },
  { id: "lt-act-4", memberId: "marco", action: "drafted 90-day plan for", target: "Ironclad Defense", clientId: "ironclad-defense", timeAgo: "Yesterday" },
  { id: "lt-act-5", memberId: "dana", action: "reviewed carry waterfall for", target: "Crestmark Capital", clientId: "crestmark-capital", timeAgo: "4h ago" },
];

// ---------------------------------------------------------------------------
// Live activity ticker
// ---------------------------------------------------------------------------
const liveActivityTicks: ActivityTick[] = [
  { label: "Monitoring Radford cut", current: 0, total: 1, unit: "cuts" },
  { label: "Pulling peer proxies", current: 7, total: 12, unit: "filings" },
];

// ---------------------------------------------------------------------------
// Firm metadata
// ---------------------------------------------------------------------------
const firm: Firm = {
  id: "lattice-partners",
  name: "Lattice Partners HR",
  shortName: "LT",
  logoColor: "#9333EA", // purple — Dana's avatar
  vertical: "hr",
  tagline: "9 advisors · 18 active engagements",
  heroClientId: "helix-robotics",
  totalClientCount: 18,
};

const config: VerticalConfig = {
  vertical: "hr",
  labels: {
    clientWord: "Client",
    clientWordPlural: "Clients",
    teamWord: "Client team",
    workflowWord: "Engagement stage",
    primaryOutputLabel: "Comp memo",
  },
  integrations: [
    { name: "Radford", subtitle: "Synced just now", synced: true },
    { name: "BambooHR", subtitle: "Synced 1h ago", synced: true },
    { name: "Gusto", subtitle: "Synced 2h ago", synced: true },
    { name: "Culture Amp", subtitle: "Synced 15 min ago", synced: true },
  ],
  featuredMetricKeys: ["Engagement Stage", "Headcount", "Engagement Fee", "Next Milestone"],
};

// ---------------------------------------------------------------------------
// Team collaboration — firm-wide channels + 1:1 DMs
// ---------------------------------------------------------------------------
const firmChannels: FirmChannel[] = [
  {
    id: "lt-general",
    name: "#general",
    description: "Firm-wide updates",
    participantIds: team.map((m) => m.id),
  },
  {
    id: "lt-knowledge",
    name: "#practice-notes",
    description: "Comp trends, Radford updates, practice craft",
    participantIds: team.map((m) => m.id),
  },
];

const firmChannelBriefings: Record<string, BriefingMessage[]> = {
  "lt-general": [
    {
      id: "lt-gen-1",
      type: "team-update",
      senderId: "dana",
      timestamp: "Monday 7:35 AM",
      content:
        "Team — Helix board comp review is Friday. Elena and I have been working on the parity framing all weekend and we're landing on Scenario B (VP Eng at P75 + Director corrective adjustment). I'll walk the full narrative in the Helix client channel today.",
      metadata: { teamMemberId: "dana" },
    },
    {
      id: "lt-gen-2",
      type: "team-update",
      senderId: "marco",
      timestamp: "Monday 7:52 AM",
      content:
        "Noted. On my side: Starline succession is stuck on the role alignment between Victor and his nephew. Dana, I think you're the right person to broker that conversation — I'm going to ask you to take point on that DM after standup.",
      metadata: { teamMemberId: "marco" },
    },
    {
      id: "lt-gen-3",
      type: "team-update",
      senderId: "oliver",
      timestamp: "Monday 8:10 AM",
      content:
        "Meridian Q1 culture pulse synthesis is ready for Janelle. 327 responses, 82% participation. Manager-quality variance is the dominant theme — that's the third consecutive quarter, so it's definitely a pattern not noise.",
      metadata: { teamMemberId: "oliver" },
    },
  ],
  "lt-knowledge": [
    {
      id: "lt-know-1",
      type: "team-update",
      senderId: "elena-r",
      timestamp: "Yesterday 2:40 PM",
      content:
        "Radford Q1 cut dropped this morning. Top-line takeaway for the team: VP Engineering roles at growth-stage robotics and hardware companies moved up 3.1% at P75. That's faster than the broader tech benchmark (1.8%). I'll push the update to everyone's matrices by EOD.",
      metadata: { teamMemberId: "elena-r" },
    },
    {
      id: "lt-know-2",
      type: "team-update",
      senderId: "dana",
      timestamp: "Yesterday 2:58 PM",
      content:
        "Good — that actually strengthens our Helix Scenario B. The VP Eng number we're recommending ($510K TC) is now slightly BELOW the new P75, not right at it. Worth noting in the board memo.",
      metadata: { teamMemberId: "dana" },
    },
    {
      id: "lt-know-3",
      type: "team-update",
      senderId: "riya",
      timestamp: "Yesterday 3:15 PM",
      content:
        "I updated the Helix memo with the new Radford data. The parity analysis table now cites the Q1 cut throughout. Dana, please review when you have a moment.",
      metadata: { teamMemberId: "riya" },
    },
  ],
};

const dmThreads: DMThread[] = [
  { id: "lt-dm-dana-elena-r", participantIds: ["dana", "elena-r"], lastActivity: "30 min ago", unreadCount: 1 },
  { id: "lt-dm-dana-marco", participantIds: ["dana", "marco"], lastActivity: "2 hours ago" },
  { id: "lt-dm-dana-oliver", participantIds: ["dana", "oliver"], lastActivity: "Yesterday" },
];

const dmBriefings: Record<string, BriefingMessage[]> = {
  "lt-dm-dana-elena-r": [
    {
      id: "lt-dm-de-1",
      type: "team-update",
      senderId: "elena-r",
      timestamp: "9:00 AM",
      content:
        "Dana — one thing I want to flag privately before Friday. Kiran is going to notice that our Scenario B adjustment brings the Director up by 11% in a single cycle. I think she'll ask if that sets a precedent. How do we want to handle that?",
      metadata: { teamMemberId: "elena-r" },
    },
    {
      id: "lt-dm-de-2",
      type: "user",
      senderId: "user",
      timestamp: "9:15 AM",
      content:
        "Good catch. Frame it as a corrective, not a precedent: 'This is what happens when a role falls behind P50 during a high-growth cycle — a one-time recalibration, not an ongoing practice.' Elena, can you build that into the memo's Q&A appendix?",
    },
    {
      id: "lt-dm-de-3",
      type: "team-update",
      senderId: "elena-r",
      timestamp: "9:22 AM",
      content: "On it. Q&A appendix will be ready by 11am.",
      metadata: { teamMemberId: "elena-r" },
    },
  ],
  "lt-dm-dana-marco": [
    {
      id: "lt-dm-dm-1",
      type: "team-update",
      senderId: "marco",
      timestamp: "Yesterday 4:20 PM",
      content:
        "Starline — Victor called me this morning. He's frustrated that his nephew isn't taking ownership of the operations side. Do you want me to brief you before you reach out? I think this needs a lighter touch than a typical succession call.",
      metadata: { teamMemberId: "marco" },
    },
    {
      id: "lt-dm-dm-2",
      type: "user",
      senderId: "user",
      timestamp: "Yesterday 4:35 PM",
      content:
        "Yes — let's do 15 minutes tomorrow morning before I call Victor. I want your read on the family dynamic before I go in.",
    },
  ],
  "lt-dm-dana-oliver": [
    {
      id: "lt-dm-do-1",
      type: "team-update",
      senderId: "oliver",
      timestamp: "Yesterday 1:00 PM",
      content:
        "Heads up on Meridian — two of the manager-quality outliers are in Janelle's own org. I don't want to surprise her at the readout on Tuesday. Would you want me to share the preliminary data with her 24h ahead, or is that breaking protocol?",
      metadata: { teamMemberId: "oliver" },
    },
    {
      id: "lt-dm-do-2",
      type: "user",
      senderId: "user",
      timestamp: "Yesterday 1:20 PM",
      content:
        "Share it ahead of time. The protocol exists to prevent surprises, not to create them — Janelle will be grateful for the heads-up and it'll make the actual readout more productive.",
    },
  ],
};

// ---------------------------------------------------------------------------
// Global agent briefings — scripted responses for the Home view Ask panel.
// ---------------------------------------------------------------------------
const globalAgentBriefings: Record<string, BriefingMessage[]> = {
  "morning-briefing": [
    {
      id: "lt-ga-morning-1",
      type: "briefing",
      senderId: "ai",
      timestamp: "7:40 AM",
      content: "**Good morning, Dana.** Across your 18 active engagements this morning:",
      metadata: {
        highlights: [
          "**Helix Robotics board is Friday** — VP Eng comp recommendation ready; CEO parity concern addressed in Scenario B",
          "**Meridian Q1 culture pulse** — Oliver finished the synthesis, manager-quality variance is the dominant theme",
          "**Vantage 2026 equity refresh** blocked on Radford April cut — monitoring daily",
          "**Starline succession** stalled — Victor and his nephew need a direct conversation, you're the right person to broker it",
        ],
      },
    },
  ],
  "client-status": [
    {
      id: "lt-ga-cs-1",
      type: "ai-response",
      senderId: "ai",
      timestamp: "Just now",
      content:
        "Engagement stage distribution:\n\n" +
        "• **Diagnostic / Review** — 5 engagements\n" +
        "• **Design / Build** — 6 engagements\n" +
        "• **Advisory / Implementation** — 4 engagements\n" +
        "• **Operating cadence** — 3 engagements\n\n" +
        "Helix is the must-land this week. Starline is the stalled one that needs unblocking.",
    },
  ],
  "team-workload": [
    {
      id: "lt-ga-tw-1",
      type: "ai-response",
      senderId: "ai",
      timestamp: "Just now",
      content:
        "Your team's loads:\n\n" +
        "• **Marco Singh** — 6 engagements, Ironclad + Starline are his focus\n" +
        "• **Elena Rios** — 8 engagements, heavy comp analysis this week\n" +
        "• **Oliver Tam** — 6 engagements, Meridian pulse synthesis landed\n" +
        "• **Riya Gill** — 11 engagements, analyst support across everything\n\n" +
        "Elena's doing the heaviest lift — comp work is the firm's competitive edge this cycle.",
    },
  ],
};

export const latticePartnersData: FirmData = {
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
  liveAlertsByClient: getLatticeLiveAlerts(),
  firmChannels,
  firmChannelBriefings,
  dmThreads,
  dmBriefings,
  globalAgentBriefings,
  heroChannelScript: getHelixTeamChannelScript,
};
