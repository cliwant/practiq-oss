// =============================================================================
// Wildcard Studio — Creative / Brand Agency
// =============================================================================
// A 9-person independent creative studio founded by Maya Okonkwo. Brand,
// campaign, and product design for challenger brands in outdoor, hospitality,
// and CPG. Hero account: Fjallberg Outdoor's Spring 2026 campaign, where
// a brand-guardrail mismatch becomes a strategic pivot opportunity.
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
import { getFjallbergTeamChannelScript, getWildcardLiveAlerts } from "./scripts/fjallberg-account";
import type { FirmData, Firm, VerticalConfig, FirmChannel, DMThread } from "./types";

// ---------------------------------------------------------------------------
// Team
// ---------------------------------------------------------------------------
const team: TeamMember[] = [
  { id: "maya", name: "Maya Okonkwo", initials: "MO", role: "Creative Director & Founder", avatarColor: "#DC2626", status: "online", clientCount: 6, completedThisWeek: 4 },
  { id: "leo", name: "Leo Haskins", initials: "LH", role: "Strategy Director", avatarColor: "#2563EB", status: "online", clientCount: 7, completedThisWeek: 5 },
  { id: "jun", name: "Jun Nakamura", initials: "JN", role: "Senior Designer", avatarColor: "#059669", status: "online", clientCount: 9, completedThisWeek: 8 },
  { id: "isa", name: "Isa Rivas", initials: "IR", role: "Account Director", avatarColor: "#DB2777", status: "away", clientCount: 9, completedThisWeek: 6 },
  { id: "theo", name: "Theo Bell", initials: "TB", role: "Junior Copywriter", avatarColor: "#D97706", status: "online", clientCount: 5, completedThisWeek: 5 },
];

// ---------------------------------------------------------------------------
// Accounts (9)
// ---------------------------------------------------------------------------
type AccountSeed = Omit<ClientWorkspace, "qbSync" | "monthlyCloseStatus" | "firmId" | "integrationStatus" | "integrationLabel" | "integrationLastSync" | "workflowStatus" | "workflowStatusLabel" | "workflowStatusNote"> & {
  integrationStatus: NonNullable<ClientWorkspace["integrationStatus"]>;
  integrationLabel: string;
  integrationLastSync: string;
  workflowStatus: string;
  workflowStatusLabel: string;
  workflowStatusNote?: string;
};

const rawAccounts: AccountSeed[] = [
  {
    id: "fjallberg-outdoor",
    name: "Fjallberg Outdoor",
    shortName: "FO",
    industry: "Outdoor Apparel",
    industryIcon: "🏔",
    color: "#DC2626",
    colorLight: "#FEF2F2",
    entityType: "Retainer",
    assignedTo: "maya",
    integrationStatus: "synced",
    integrationLabel: "Figma",
    integrationLastSync: "Just now",
    workflowStatus: "concept",
    workflowStatusLabel: "Concept approval",
    workflowStatusNote: "Spring 2026 hero cut awaiting CMO review",
    metrics: {
      "Campaign Phase": "Concept",
      "Active Deliverables": "14",
      "Next Milestone": "Apr 10 CMO pitch",
      "Retainer": "$42K/mo",
    },
    contact: { name: "Elena Rhodes", email: "elena.rhodes@fjallberg.com" },
    preferences: { tone: "warm-confident", reportStyle: "visual-first", frequency: "weekly" },
    monthlyFee: "$42K retainer",
    knowledgeCount: 48,
    documentCount: 187,
    conversationCount: 62,
  },
  {
    id: "northstar-coffee",
    name: "Northstar Coffee Roasters",
    shortName: "NC",
    industry: "CPG / Food",
    industryIcon: "☕",
    color: "#92400E",
    colorLight: "#FFFBEB",
    entityType: "Project",
    assignedTo: "leo",
    integrationStatus: "synced",
    integrationLabel: "Figma",
    integrationLastSync: "20 min ago",
    workflowStatus: "launch",
    workflowStatusLabel: "Launch prep",
    workflowStatusNote: "Q2 bean drop teaser creative in review",
    metrics: { "Campaign Phase": "Launch", "Channels": "IG / TikTok / DOOH", "Project Fee": "$68K" },
    contact: { name: "Owen Caruso", email: "owen@northstarcoffee.com" },
    preferences: { tone: "conversational", reportStyle: "narrative with visuals", frequency: "bi-weekly" },
    monthlyFee: "$68K project",
    knowledgeCount: 24,
    documentCount: 52,
    conversationCount: 28,
  },
  {
    id: "loom-hotels",
    name: "Loom Hotel Group",
    shortName: "LH",
    industry: "Hospitality",
    industryIcon: "🏨",
    color: "#7C3AED",
    colorLight: "#F5F3FF",
    entityType: "Retainer",
    assignedTo: "maya",
    integrationStatus: "synced",
    integrationLabel: "Asana",
    integrationLastSync: "1 hour ago",
    workflowStatus: "strategy",
    workflowStatusLabel: "Brand strategy",
    workflowStatusNote: "Brand architecture workshop scheduled",
    metrics: { "Campaign Phase": "Strategy", "Properties": "6", "Retainer": "$28K/mo" },
    contact: { name: "Priya Bhattacharya", email: "priya@loomhotels.com" },
    preferences: { tone: "elevated", reportStyle: "storytelling", frequency: "monthly" },
    monthlyFee: "$28K retainer",
    knowledgeCount: 32,
    documentCount: 78,
    conversationCount: 36,
  },
  {
    id: "grayrock-furniture",
    name: "Grayrock Furniture",
    shortName: "GR",
    industry: "DTC",
    industryIcon: "🪑",
    color: "#475569",
    colorLight: "#F8FAFC",
    entityType: "Project",
    assignedTo: "jun",
    integrationStatus: "synced",
    integrationLabel: "Figma",
    integrationLastSync: "3 hours ago",
    workflowStatus: "production",
    workflowStatusLabel: "In production",
    workflowStatusNote: "Photography round 2 shipped to client",
    metrics: { "Campaign Phase": "Production", "Photography Cost": "$14K", "Project Fee": "$38K" },
    contact: { name: "Michael Grayrock", email: "michael@grayrockfurniture.com" },
    preferences: { tone: "direct", reportStyle: "proofs-first", frequency: "weekly" },
    monthlyFee: "$38K project",
    knowledgeCount: 18,
    documentCount: 94,
    conversationCount: 22,
  },
  {
    id: "verve-fitness",
    name: "Verve Fitness",
    shortName: "VF",
    industry: "Wellness",
    industryIcon: "💪",
    color: "#F59E0B",
    colorLight: "#FFFBEB",
    entityType: "Retainer",
    assignedTo: "isa",
    integrationStatus: "stale",
    integrationLabel: "HubSpot",
    integrationLastSync: "2 days ago",
    workflowStatus: "discovery",
    workflowStatusLabel: "Discovery",
    workflowStatusNote: "Customer persona interviews underway",
    metrics: { "Campaign Phase": "Discovery", "Studios": "4", "Retainer": "$18K/mo" },
    contact: { name: "Simone Rivera", email: "simone@vervefitness.com" },
    preferences: { tone: "energetic", reportStyle: "snappy and visual", frequency: "weekly" },
    monthlyFee: "$18K retainer",
    knowledgeCount: 15,
    documentCount: 34,
    conversationCount: 21,
  },
  {
    id: "atelier-perfume",
    name: "Atelier Mirabel Perfume",
    shortName: "AM",
    industry: "Luxury / Beauty",
    industryIcon: "🌸",
    color: "#BE185D",
    colorLight: "#FDF2F8",
    entityType: "Project",
    assignedTo: "maya",
    integrationStatus: "synced",
    integrationLabel: "Dropbox Replay",
    integrationLastSync: "5 hours ago",
    workflowStatus: "post-production",
    workflowStatusLabel: "Post-production",
    workflowStatusNote: "Film color grade round 3",
    metrics: { "Campaign Phase": "Post-production", "Deliverables": "Film + lookbook", "Project Fee": "$120K" },
    contact: { name: "Camille Mirabel", email: "camille@ateliermirabel.fr" },
    preferences: { tone: "refined", reportStyle: "minimalist", frequency: "per-milestone" },
    monthlyFee: "$120K project",
    knowledgeCount: 29,
    documentCount: 62,
    conversationCount: 33,
  },
  {
    id: "kites-venture",
    name: "Kites Venture Capital",
    shortName: "KV",
    industry: "Financial Services",
    industryIcon: "🪁",
    color: "#0891B2",
    colorLight: "#ECFEFF",
    entityType: "Retainer",
    assignedTo: "leo",
    integrationStatus: "synced",
    integrationLabel: "Figma",
    integrationLastSync: "4 hours ago",
    workflowStatus: "rebrand",
    workflowStatusLabel: "Rebrand",
    workflowStatusNote: "Logo system v4 approved",
    metrics: { "Campaign Phase": "Rebrand", "Scope": "Full brand system", "Retainer": "$32K/mo" },
    contact: { name: "Raj Patel", email: "raj@kitesvc.com" },
    preferences: { tone: "confident", reportStyle: "executive-ready", frequency: "bi-weekly" },
    monthlyFee: "$32K retainer",
    knowledgeCount: 22,
    documentCount: 58,
    conversationCount: 27,
  },
  {
    id: "fable-books",
    name: "Fable Indie Bookstore",
    shortName: "FB",
    industry: "Retail",
    industryIcon: "📚",
    color: "#15803D",
    colorLight: "#F0FDF4",
    entityType: "Project",
    assignedTo: "theo",
    integrationStatus: "synced",
    integrationLabel: "Asana",
    integrationLastSync: "Yesterday",
    workflowStatus: "concept",
    workflowStatusLabel: "Concept",
    workflowStatusNote: "Holiday campaign concepts in draft",
    metrics: { "Campaign Phase": "Concept", "Stores": "3", "Project Fee": "$24K" },
    contact: { name: "Sana Hoffman", email: "sana@fablebooks.co" },
    preferences: { tone: "warm-literary", reportStyle: "essay", frequency: "monthly" },
    monthlyFee: "$24K project",
    knowledgeCount: 11,
    documentCount: 28,
    conversationCount: 14,
  },
  {
    id: "rook-cycling",
    name: "Rook Cycling Collective",
    shortName: "RC",
    industry: "Outdoor Sports",
    industryIcon: "🚴",
    color: "#0F766E",
    colorLight: "#ECFDF5",
    entityType: "Retainer",
    assignedTo: "jun",
    integrationStatus: "synced",
    integrationLabel: "Figma",
    integrationLastSync: "2 hours ago",
    workflowStatus: "production",
    workflowStatusLabel: "Production",
    workflowStatusNote: "Launch film edit v2 ready",
    metrics: { "Campaign Phase": "Production", "Channels": "YouTube / IG", "Retainer": "$22K/mo" },
    contact: { name: "Daniel Rook", email: "daniel@rookcycling.com" },
    preferences: { tone: "direct-athletic", reportStyle: "video-first", frequency: "weekly" },
    monthlyFee: "$22K retainer",
    knowledgeCount: 19,
    documentCount: 44,
    conversationCount: 26,
  },
];

const clients: ClientWorkspace[] = rawAccounts.map((a) => ({
  ...a,
  firmId: "wildcard-studio",
  qbSync: a.integrationStatus,
  qbLastSync: a.integrationLastSync,
  monthlyCloseStatus: "in-progress",
  monthlyCloseNote: a.workflowStatusNote,
}));

// ---------------------------------------------------------------------------
// Attention items
// ---------------------------------------------------------------------------
const attentionItems: AttentionItem[] = [
  {
    id: "wc-att-1",
    type: "deadline",
    severity: "critical",
    title: "Fjallberg CMO pitch in 48 hours",
    clientId: "fjallberg-outdoor",
    description: "Spring 2026 hero cut diverges from brand guardrails but tracks to the CMO's stated \"more 2026 energy\" direction. Rationale memo ready for Maya's review.",
    detectedAt: "1 hour ago",
    dueDate: "Friday PM",
  },
  {
    id: "wc-att-2",
    type: "review",
    severity: "high",
    title: "Northstar Q2 bean drop teaser ready",
    clientId: "northstar-coffee",
    from: "leo",
    description: "Three teaser variants in three aspect ratios. Copy in Northstar's voice. Leo wants Maya's eyes before sending to Owen.",
    detectedAt: "2 hours ago",
    aiConfidence: 94,
  },
  {
    id: "wc-att-3",
    type: "blocked",
    severity: "high",
    title: "Atelier Mirabel color grade pushed again",
    clientId: "atelier-perfume",
    description: "Post house asked for another 48 hours on round 3 color. That pushes the Cannes premiere window tight. Camille needs to know today.",
    detectedAt: "3 hours ago",
  },
  {
    id: "wc-att-4",
    type: "low-confidence",
    severity: "medium",
    title: "Verve Fitness persona interviews stalled",
    clientId: "verve-fitness",
    description: "Only 3 of 12 target interviews completed. Simone's team is not returning our scheduling pings. Isa flagged.",
    detectedAt: "5 hours ago",
    aiConfidence: 70,
  },
];

// ---------------------------------------------------------------------------
// Approval queue
// ---------------------------------------------------------------------------
const approvalQueue: ApprovalQueueItem[] = [
  {
    id: "wc-aq-1",
    clientId: "fjallberg-outdoor",
    title: "Fjallberg Spring 2026 — Campaign Rationale",
    format: "xlsx",
    generatedBy: "ai",
    aiConfidence: 92,
    highlights: ["Heritage vs modern KPI projections", "Hybrid recommendation with defensible rationale", "Gen Z engagement +14%"],
    status: "pending",
    createdAt: "Today 9:21 AM",
    waitingSince: "30m",
    version: 1,
  },
  {
    id: "wc-aq-2",
    clientId: "fjallberg-outdoor",
    title: "Email — Fjallberg Spring 2026 direction",
    format: "email",
    generatedBy: "ai",
    aiConfidence: 94,
    highlights: ["Warm CMO voice", "Leads with Gen Z insight", "Offers two creative variants"],
    status: "pending",
    createdAt: "Today 9:53 AM",
    waitingSince: "5m",
    version: 1,
  },
  {
    id: "wc-aq-3",
    clientId: "northstar-coffee",
    title: "Northstar Coffee — Q2 teaser suite",
    format: "pdf",
    generatedBy: "team",
    generatedByName: "Leo Haskins",
    aiConfidence: 93,
    highlights: ["Three aspect ratios", "Copy in Northstar's voice", "Launch-ready"],
    status: "pending",
    createdAt: "Today 8:10 AM",
    waitingSince: "2h",
    version: 2,
  },
  {
    id: "wc-aq-4",
    clientId: "loom-hotels",
    title: "Loom Hotel — Brand architecture draft",
    format: "docx",
    generatedBy: "ai",
    aiConfidence: 88,
    highlights: ["Parent-masterbrand structure", "Property tier framework", "Voice guardrails per tier"],
    status: "pending",
    createdAt: "Yesterday 4:30 PM",
    waitingSince: "17h",
    version: 1,
  },
  {
    id: "wc-aq-5",
    clientId: "kites-venture",
    title: "Kites VC — Brand system rollout plan",
    format: "docx",
    generatedBy: "team",
    generatedByName: "Leo Haskins",
    aiConfidence: 90,
    highlights: ["12-week rollout timeline", "Stakeholder comms script", "Risk register"],
    status: "pending",
    createdAt: "Yesterday 5:15 PM",
    waitingSince: "16h",
    version: 1,
  },
  {
    id: "wc-aq-6",
    clientId: "rook-cycling",
    title: "Rook launch film — edit v2",
    format: "pdf",
    generatedBy: "team",
    generatedByName: "Jun Nakamura",
    aiConfidence: 91,
    highlights: ["3-minute brand film", "Soundtrack licensed", "Ready for client review"],
    status: "pending",
    createdAt: "Today 7:40 AM",
    waitingSince: "2h",
    version: 2,
  },
];

// ---------------------------------------------------------------------------
// AI working now
// ---------------------------------------------------------------------------
const aiTasks: AITask[] = [
  {
    id: "wc-ai-1",
    title: "Generating Fjallberg KPI projections",
    description: "Pattern-matching modern outdoor campaigns on Meta and TikTok",
    progress: 14,
    total: 18,
    unit: "campaigns",
    estimatedRemaining: "15 min",
    status: "running",
    startedAt: "8:20 AM",
  },
  {
    id: "wc-ai-2",
    title: "Drafting Northstar launch copy variants",
    description: "Three teaser variants × three aspect ratios",
    progress: 9,
    total: 9,
    unit: "assets",
    status: "waiting-approval",
    startedAt: "7:40 AM",
  },
  {
    id: "wc-ai-3",
    title: "Monitoring Fjallberg social sentiment",
    description: "Brand mentions across Meta, TikTok, and YouTube",
    progress: 100,
    total: 100,
    unit: "%",
    status: "running",
    startedAt: "Continuous",
  },
  {
    id: "wc-ai-4",
    title: "Compositing Grayrock photography round 2",
    description: "Feed lookbook layouts with the new photography set",
    progress: 22,
    total: 28,
    unit: "layouts",
    estimatedRemaining: "40 min",
    status: "running",
    startedAt: "9:00 AM",
  },
];

// ---------------------------------------------------------------------------
// Completed today
// ---------------------------------------------------------------------------
const completedToday: CompletedItem[] = [
  { id: "wc-c-1", title: "Generated Fjallberg rationale deck", detail: "Heritage vs modern direction comparison", completedAt: "9:21 AM", category: "generation", itemCount: 1 },
  { id: "wc-c-2", title: "Drafted Fjallberg CMO rationale email", detail: "Warm tone, leads with insight", completedAt: "9:53 AM", category: "generation", itemCount: 1 },
  { id: "wc-c-3", title: "Exported 9 Northstar launch assets", detail: "Three variants × three aspect ratios", completedAt: "7:40 AM", category: "generation", itemCount: 9 },
  { id: "wc-c-4", title: "Synthesized Verve customer interviews", detail: "3 of 12 complete — early persona signals", completedAt: "Yesterday", category: "learning", itemCount: 3 },
  { id: "wc-c-5", title: "Ran brand audit on Kites VC", detail: "Legacy brand assets cataloged, risks flagged", completedAt: "6:30 AM", category: "detection", itemCount: 1 },
  { id: "wc-c-6", title: "Monitored Fjallberg social sentiment", detail: "TikTok heritage-craft trend up 22%", completedAt: "5:00 AM", category: "detection", itemCount: 1 },
];

// ---------------------------------------------------------------------------
// Weekly overview
// ---------------------------------------------------------------------------
const weeklyOverview: WeeklyOverview = {
  monthlyClose: { completed: 6, total: 9, delta: 2 },
  taxSeason: { docsCollected: 187, docsTotal: 187, urgentReminders: 0 },
  teamWorkload: [
    { memberId: "maya", completed: 4, total: 6 },
    { memberId: "leo", completed: 5, total: 7 },
    { memberId: "jun", completed: 8, total: 9 },
    { memberId: "isa", completed: 6, total: 9 },
    { memberId: "theo", completed: 5, total: 5 },
  ],
  quality: { reworkRate: 4.1, reworkRatePrev: 4.8, aiConfidenceAvg: 90, aiConfidencePrev: 87 },
  cost: { apiUsage: 28, apiBudget: 110, costPerClient: 0.48, costTarget: 0.55 },
};

// ---------------------------------------------------------------------------
// Client documents
// ---------------------------------------------------------------------------
const clientDocuments: ClientDocument[] = [
  { id: "wc-doc-1", clientId: "fjallberg-outdoor", title: "Spring 2026 Campaign Rationale", format: "xlsx", source: "ai", version: 1, status: "pending-review", date: "Apr 7, 2026", tags: ["rationale", "campaign"] },
  { id: "wc-doc-2", clientId: "fjallberg-outdoor", title: "Email — Spring 2026 direction", format: "email", source: "ai", version: 1, status: "pending-review", date: "Apr 7, 2026", tags: ["client-comms"] },
  { id: "wc-doc-3", clientId: "fjallberg-outdoor", title: "Hero key art v12", format: "pdf", source: "team", sourceName: "Jun Nakamura", version: 12, status: "draft", date: "Apr 6, 2026", tags: ["creative"] },
  { id: "wc-doc-4", clientId: "fjallberg-outdoor", title: "Brand manual — November 2025", format: "pdf", source: "uploaded", version: 1, status: "archived", date: "Nov 2, 2025", tags: ["brand"] },
  { id: "wc-doc-5", clientId: "northstar-coffee", title: "Q2 bean drop — teaser suite", format: "pdf", source: "team", sourceName: "Leo Haskins", version: 2, status: "pending-review", date: "Apr 7, 2026", tags: ["launch"] },
  { id: "wc-doc-6", clientId: "loom-hotels", title: "Brand architecture draft", format: "docx", source: "ai", version: 1, status: "pending-review", date: "Apr 6, 2026", tags: ["brand"] },
  { id: "wc-doc-7", clientId: "kites-venture", title: "Brand system rollout plan", format: "docx", source: "team", sourceName: "Leo Haskins", version: 1, status: "pending-review", date: "Apr 6, 2026", tags: ["rebrand"] },
  { id: "wc-doc-8", clientId: "rook-cycling", title: "Launch film edit v2", format: "pdf", source: "team", sourceName: "Jun Nakamura", version: 2, status: "pending-review", date: "Apr 7, 2026", tags: ["video"] },
];

// ---------------------------------------------------------------------------
// Client AI activity
// ---------------------------------------------------------------------------
const clientAIActivities: ClientAIActivity[] = [
  { id: "wc-caa-1", clientId: "fjallberg-outdoor", action: "Generated campaign rationale", detail: "Heritage vs modern cut analysis", date: "Apr 7", status: "completed" },
  { id: "wc-caa-2", clientId: "fjallberg-outdoor", action: "Drafted CMO rationale email", detail: "Warm tone, leads with Gen Z insight", date: "Apr 7", status: "draft" },
  { id: "wc-caa-3", clientId: "fjallberg-outdoor", action: "Flagged brand guardrail mismatch", detail: "Modern cut drifts from heritage guardrails", date: "Apr 7", status: "flagged" },
  { id: "wc-caa-4", clientId: "fjallberg-outdoor", action: "Maya's strategic note", detail: "Lead with modern, anchor with heritage in lookbook", date: "Apr 6", status: "note" },
  { id: "wc-caa-5", clientId: "northstar-coffee", action: "Generated 9 teaser assets", detail: "3 variants × 3 aspect ratios", date: "Apr 7", status: "draft" },
  { id: "wc-caa-6", clientId: "loom-hotels", action: "Drafted brand architecture framework", detail: "Parent-masterbrand structure with property tiers", date: "Apr 6", status: "draft" },
  { id: "wc-caa-7", clientId: "verve-fitness", action: "Flagged stalled customer interviews", detail: "3 of 12 complete, scheduling blocked", date: "Apr 6", status: "flagged" },
  { id: "wc-caa-8", clientId: "kites-venture", action: "Audited legacy brand assets", detail: "Catalog + risk register", date: "Apr 6", status: "completed" },
  { id: "wc-caa-9", clientId: "rook-cycling", action: "Edited launch film v2", detail: "3-minute brand film, soundtrack licensed", date: "Apr 7", status: "draft" },
];

// ---------------------------------------------------------------------------
// Team handoffs
// ---------------------------------------------------------------------------
const teamHandoffs: Record<string, BriefingMessage[]> = {
  "fjallberg-outdoor": [
    {
      id: "wc-handoff-fjallberg-1",
      type: "team-handoff",
      timestamp: "30 min ago",
      content: "Maya — Jun's new hero cut is gorgeous but it's drifting from the heritage-craft guardrails we set in November. Rationale memo ready so you can decide which way to run before Elena sees it.",
      metadata: {
        teamMemberId: "leo",
        mentionedTo: "maya",
        handoffSubject: "Hero key art — off-guardrail but compelling",
      },
    },
  ],
  "northstar-coffee": [
    {
      id: "wc-handoff-northstar-1",
      type: "team-handoff",
      timestamp: "2 hours ago",
      content: "Maya — Northstar Q2 teaser suite is ready. Three variants, three aspect ratios, copy in Northstar's voice. I'd love your eyes before this goes to Owen — he's a stickler on headline cadence.",
      metadata: {
        teamMemberId: "leo",
        mentionedTo: "maya",
        handoffSubject: "Northstar teaser suite — ready for review",
      },
    },
  ],
  "atelier-perfume": [
    {
      id: "wc-handoff-atelier-1",
      type: "team-handoff",
      timestamp: "3 hours ago",
      content: "Maya — post house asked for another 48 hours on round 3 color for Atelier Mirabel. That pushes the Cannes premiere window tight. Do you want me to brief Camille now or wait until we have a firm delivery date?",
      metadata: {
        teamMemberId: "isa",
        mentionedTo: "maya",
        handoffSubject: "Atelier color grade delay",
      },
    },
  ],
};

// ---------------------------------------------------------------------------
// Client knowledge
// ---------------------------------------------------------------------------
const clientKnowledgeMap: Record<string, KnowledgeItem[]> = {
  "fjallberg-outdoor": [
    { id: "k1", category: "preference", title: "Elena wants warm-confident framing", detail: "Fjallberg CMO prefers work framed as \"the brand's next chapter\" over \"a pivot.\" Avoid language that implies the current direction is wrong.", lastUpdated: "2 weeks ago", source: "team-noted" },
    { id: "k2", category: "history", title: "November brand refresh set heritage guardrails", detail: "In Nov 2025 we delivered a refreshed brand manual emphasizing heritage-craft visual language. Any departure needs rationale.", lastUpdated: "5 months ago", source: "team-noted" },
    { id: "k3", category: "pattern", title: "Fjallberg Q1 board review shifts the tone", detail: "Every Q1, the Fjallberg board pushes for \"more energy.\" We know this pattern now — it typically triggers a mid-year brand stretch.", lastUpdated: "1 month ago", source: "ai-learned" },
    { id: "k4", category: "contact", title: "Elena is best reached Mon/Wed/Fri 10-11 AM", detail: "Tuesday and Thursday are her retail partner meeting days — avoid scheduling anything substantive.", lastUpdated: "3 weeks ago", source: "client-shared" },
  ],
  "northstar-coffee": [
    { id: "k1", category: "preference", title: "Owen edits copy himself — expect two rounds", detail: "Owen has a strong copy voice and usually edits twice. Ship drafts with that buffer built in.", lastUpdated: "1 month ago", source: "ai-learned" },
    { id: "k2", category: "pattern", title: "Q2 bean drops always over-perform Q4", detail: "Northstar's Q2 seasonal drops routinely outperform Q4 by 18-22% on engagement. Plan media spend accordingly.", lastUpdated: "2 months ago", source: "ai-learned" },
  ],
  "loom-hotels": [
    { id: "k1", category: "preference", title: "Priya wants storytelling over frameworks", detail: "Loom's CMO does not respond to strategy slides. Lead with a narrative, end with the framework as proof.", lastUpdated: "3 weeks ago", source: "team-noted" },
    { id: "k2", category: "history", title: "Six properties, two distinct personalities", detail: "The three coastal properties have a different brand voice than the three mountain properties. Architecture must preserve both.", lastUpdated: "1 month ago", source: "team-noted" },
  ],
};

// ---------------------------------------------------------------------------
// Client channels
// ---------------------------------------------------------------------------
const clientChannels: Record<string, Channel[]> = {
  "fjallberg-outdoor": [
    {
      id: "fjallberg-team",
      type: "team",
      name: "Account team",
      description: "Everyone on Fjallberg",
      participantIds: ["maya", "leo", "jun", "isa"],
      lastActivity: "10 min ago",
      unreadCount: 3,
    },
    {
      id: "fjallberg-private",
      type: "private",
      name: "Private with AI",
      description: "Maya's private 1:1 with FractionalOS",
      participantIds: ["maya"],
      lastActivity: "Yesterday",
    },
    {
      id: "fjallberg-concept",
      type: "topic",
      name: "Spring 2026 concept",
      description: "Focused thread for the Spring 2026 brief",
      participantIds: ["maya", "jun", "leo"],
      lastActivity: "1 hour ago",
      unreadCount: 1,
    },
  ],
  "northstar-coffee": [
    {
      id: "northstar-team",
      type: "team",
      name: "Account team",
      participantIds: ["leo", "theo", "jun"],
      lastActivity: "2 hours ago",
      unreadCount: 1,
    },
    {
      id: "northstar-private",
      type: "private",
      name: "Private with AI",
      participantIds: ["leo"],
      lastActivity: "Yesterday",
    },
  ],
  "loom-hotels": [
    {
      id: "loom-team",
      type: "team",
      name: "Account team",
      participantIds: ["maya", "leo"],
      lastActivity: "1 hour ago",
    },
    {
      id: "loom-private",
      type: "private",
      name: "Private with AI",
      participantIds: ["maya"],
      lastActivity: "3 days ago",
    },
  ],
};

// ---------------------------------------------------------------------------
// Upcoming events
// ---------------------------------------------------------------------------
const upcomingEvents: UpcomingEvent[] = [
  { id: "wc-ev-1", date: "2026-04-08", dateShort: "Tomorrow", title: "Northstar teaser review with Owen", clientId: "northstar-coffee", type: "meeting" },
  { id: "wc-ev-2", date: "2026-04-10", dateShort: "Friday", title: "Fjallberg CMO Spring 2026 pitch", clientId: "fjallberg-outdoor", type: "meeting" },
  { id: "wc-ev-3", date: "2026-04-14", dateShort: "Apr 14", title: "Loom brand architecture workshop", clientId: "loom-hotels", type: "meeting" },
  { id: "wc-ev-4", date: "2026-04-18", dateShort: "Apr 18", title: "Grayrock photography final delivery", clientId: "grayrock-furniture", type: "deadline" },
  { id: "wc-ev-5", date: "2026-04-22", dateShort: "Apr 22", title: "Atelier Mirabel Cannes premiere", clientId: "atelier-perfume", type: "meeting" },
  { id: "wc-ev-6", date: "2026-04-25", dateShort: "Apr 25", title: "Rook launch film release", clientId: "rook-cycling", type: "deadline" },
];

// ---------------------------------------------------------------------------
// Activity feed
// ---------------------------------------------------------------------------
const activityFeed: ActivityItem[] = [
  { id: "wc-act-1", memberId: "jun", action: "shipped hero key art v12 for", target: "Fjallberg Outdoor", clientId: "fjallberg-outdoor", timeAgo: "1h ago" },
  { id: "wc-act-2", memberId: "leo", action: "flagged brand guardrail mismatch on", target: "Fjallberg Outdoor", clientId: "fjallberg-outdoor", timeAgo: "45m ago" },
  { id: "wc-act-3", memberId: "leo", action: "finished Q2 teaser suite for", target: "Northstar Coffee", clientId: "northstar-coffee", timeAgo: "2h ago" },
  { id: "wc-act-4", memberId: "theo", action: "drafted holiday concepts for", target: "Fable Indie Bookstore", clientId: "fable-books", timeAgo: "4h ago" },
  { id: "wc-act-5", memberId: "jun", action: "edited launch film v2 for", target: "Rook Cycling", clientId: "rook-cycling", timeAgo: "3h ago" },
];

// ---------------------------------------------------------------------------
// Live activity ticker
// ---------------------------------------------------------------------------
const liveActivityTicks: ActivityTick[] = [
  { label: "Pattern-matching campaigns", current: 14, total: 18, unit: "campaigns" },
  { label: "Compositing lookbook layouts", current: 22, total: 28, unit: "layouts" },
];

// ---------------------------------------------------------------------------
// Firm metadata
// ---------------------------------------------------------------------------
const firm: Firm = {
  id: "wildcard-studio",
  name: "Wildcard Studio",
  shortName: "WS",
  logoColor: "#DC2626", // red — Maya's avatar
  vertical: "agency",
  tagline: "9 creatives · 16 active accounts",
  heroClientId: "fjallberg-outdoor",
  totalClientCount: 16,
};

const config: VerticalConfig = {
  vertical: "agency",
  labels: {
    clientWord: "Client",
    clientWordPlural: "Clients",
    teamWord: "Account team",
    workflowWord: "Campaign phase",
    primaryOutputLabel: "Campaign brief",
  },
  integrations: [
    { name: "Figma", subtitle: "Synced just now", synced: true },
    { name: "HubSpot", subtitle: "Synced 20 min ago", synced: true },
    { name: "Asana", subtitle: "Synced 1h ago", synced: true },
    { name: "Dropbox Replay", subtitle: "Synced 5h ago", synced: true },
  ],
  featuredMetricKeys: ["Campaign Phase", "Active Deliverables", "Next Milestone", "Retainer"],
};

// ---------------------------------------------------------------------------
// Team collaboration — firm-wide channels + 1:1 DMs
// ---------------------------------------------------------------------------
const firmChannels: FirmChannel[] = [
  {
    id: "wc-general",
    name: "#general",
    description: "Studio-wide updates",
    participantIds: team.map((m) => m.id),
  },
  {
    id: "wc-knowledge",
    name: "#craft",
    description: "Design craft, references, and studio patterns",
    participantIds: team.map((m) => m.id),
  },
];

const firmChannelBriefings: Record<string, BriefingMessage[]> = {
  "wc-general": [
    {
      id: "wc-gen-1",
      type: "team-update",
      senderId: "maya",
      timestamp: "Monday 8:15 AM",
      content:
        "Morning team. Fjallberg CMO pitch is Friday afternoon. Leo flagged something on Jun's new hero cut — the modern direction is beautiful but it's drifting from the November brand guardrails. We'll decide the hybrid framing in the Fjallberg team channel today, not here.",
      metadata: { teamMemberId: "maya" },
    },
    {
      id: "wc-gen-2",
      type: "team-update",
      senderId: "leo",
      timestamp: "Monday 8:32 AM",
      content:
        "Also: Northstar Q2 teaser suite ready for Maya's eyes. Owen's expecting it Thursday so we have a day to iterate if needed.",
      metadata: { teamMemberId: "leo" },
    },
    {
      id: "wc-gen-3",
      type: "team-update",
      senderId: "isa",
      timestamp: "Monday 8:50 AM",
      content:
        "Heads up — Atelier Mirabel post house asked for another 48 hours on round 3 color. I'll handle the communication with Camille but if any of you are planning around that delivery date, know it's moving.",
      metadata: { teamMemberId: "isa" },
    },
  ],
  "wc-knowledge": [
    {
      id: "wc-know-1",
      type: "team-update",
      senderId: "jun",
      timestamp: "Yesterday 5:20 PM",
      content:
        "Stash for anyone working on outdoor or lifestyle brands right now: the TikTok heritage-craft trend we've been tracking is up 22% in the last 48 hours. I put together a moodboard of the strongest examples in Figma: figma.com/file/wc-heritage-signal",
      metadata: { teamMemberId: "jun" },
    },
    {
      id: "wc-know-2",
      type: "team-update",
      senderId: "leo",
      timestamp: "Yesterday 5:42 PM",
      content:
        "Bookmarked. This is exactly the kind of signal I want us surfacing proactively rather than reactively. Let's make 'trend signal' a recurring Friday post.",
      metadata: { teamMemberId: "leo" },
    },
    {
      id: "wc-know-3",
      type: "team-update",
      senderId: "maya",
      timestamp: "Yesterday 6:01 PM",
      content:
        "Agreed — and thank you Jun. This moodboard is going directly into the Fjallberg rationale on Friday. Credit in the deck.",
      metadata: { teamMemberId: "maya" },
    },
  ],
};

const dmThreads: DMThread[] = [
  { id: "wc-dm-maya-jun", participantIds: ["maya", "jun"], lastActivity: "22 min ago", unreadCount: 1 },
  { id: "wc-dm-maya-leo", participantIds: ["maya", "leo"], lastActivity: "1 hour ago" },
  { id: "wc-dm-maya-isa", participantIds: ["maya", "isa"], lastActivity: "Yesterday" },
];

const dmBriefings: Record<string, BriefingMessage[]> = {
  "wc-dm-maya-jun": [
    {
      id: "wc-dm-mj-1",
      type: "team-update",
      senderId: "jun",
      timestamp: "9:20 AM",
      content:
        "Maya — I saw Leo's note about the guardrail mismatch. I'm not defensive about it but I want to understand: are we saying the new cut is wrong, or that it's right but needs a heritage anchor? I don't want to push back in the team channel without clarity from you first.",
      metadata: { teamMemberId: "jun" },
    },
    {
      id: "wc-dm-mj-2",
      type: "user",
      senderId: "user",
      timestamp: "9:32 AM",
      content:
        "Right but needs a heritage anchor. Your cut is the future of the brand — I just don't want to lose the eighteen years of craft story in getting there. We'll pitch both directions and lead with yours.",
    },
    {
      id: "wc-dm-mj-3",
      type: "team-update",
      senderId: "jun",
      timestamp: "9:40 AM",
      content: "That's the clarity I needed. Thank you — I'll match energy in the team channel.",
      metadata: { teamMemberId: "jun" },
    },
  ],
  "wc-dm-maya-leo": [
    {
      id: "wc-dm-ml-1",
      type: "team-update",
      senderId: "leo",
      timestamp: "Yesterday 4:45 PM",
      content:
        "Quick one — do you want me to share the Fjallberg rationale with Elena before Friday, or wait until the pitch? Sharing early gives her time to push back; waiting keeps the surprise.",
      metadata: { teamMemberId: "leo" },
    },
    {
      id: "wc-dm-ml-2",
      type: "user",
      senderId: "user",
      timestamp: "Yesterday 5:00 PM",
      content:
        "Share early. Elena doesn't like being surprised in a room with other stakeholders. Day-before is fine.",
    },
  ],
  "wc-dm-maya-isa": [
    {
      id: "wc-dm-mi-1",
      type: "team-update",
      senderId: "isa",
      timestamp: "Yesterday 3:15 PM",
      content:
        "Atelier Mirabel color grade is pushing again. Camille is going to ask for a timeline update — do you want me to offer the Cannes date as the firm deadline or keep it soft?",
      metadata: { teamMemberId: "isa" },
    },
    {
      id: "wc-dm-mi-2",
      type: "user",
      senderId: "user",
      timestamp: "Yesterday 3:28 PM",
      content:
        "Keep it soft. Camille is a long-term client and a Cannes slip is survivable — a broken promise isn't.",
    },
  ],
};

// ---------------------------------------------------------------------------
// Global agent briefings — scripted responses for the Home view Ask panel.
// ---------------------------------------------------------------------------
const globalAgentBriefings: Record<string, BriefingMessage[]> = {
  "morning-briefing": [
    {
      id: "wc-ga-morning-1",
      type: "briefing",
      senderId: "ai",
      timestamp: "8:15 AM",
      content: "**Good morning, Maya.** Across your 16 active accounts this morning:",
      metadata: {
        highlights: [
          "**Fjallberg CMO pitch is Friday** — Jun's hero cut drifts from the November brand manual, Leo flagged it",
          "**Northstar Q2 teaser suite** — three variants ready, Leo wants your eyes before Owen sees them",
          "**Atelier Mirabel color grade** — post house pushed another 48 hours, Cannes window getting tight",
          "**TikTok signal** — heritage craft content up 22% in the last 48h, strengthens the hybrid recommendation for Fjallberg",
        ],
      },
    },
  ],
  "client-status": [
    {
      id: "wc-ga-cs-1",
      type: "ai-response",
      senderId: "ai",
      timestamp: "Just now",
      content:
        "Campaign phase distribution:\n\n" +
        "• **Strategy / Discovery** — 3 accounts\n" +
        "• **Concept** — 4 accounts (Fjallberg is the priority)\n" +
        "• **Production / Post-production** — 6 accounts\n" +
        "• **Launch / Live** — 3 accounts\n\n" +
        "Fjallberg is the one you need to land this week. Atelier Mirabel is the risk to watch — timeline slipping.",
    },
  ],
  "team-workload": [
    {
      id: "wc-ga-tw-1",
      type: "ai-response",
      senderId: "ai",
      timestamp: "Just now",
      content:
        "Your studio's loads this week:\n\n" +
        "• **Leo Haskins** — 7 accounts, strategy work across multiple deliverables\n" +
        "• **Jun Nakamura** — 9 accounts, heavy design production\n" +
        "• **Isa Rivas** — 9 accounts, client management is smooth\n" +
        "• **Theo Bell** — 5 accounts, copy-only but punching above his level\n\n" +
        "Jun is the one I'd watch — 9 accounts in production is a lot for one senior designer.",
    },
  ],
};

export const wildcardStudioData: FirmData = {
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
  liveAlertsByClient: getWildcardLiveAlerts(),
  firmChannels,
  firmChannelBriefings,
  dmThreads,
  dmBriefings,
  globalAgentBriefings,
  heroChannelScript: getFjallbergTeamChannelScript,
};
