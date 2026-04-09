// =============================================================================
// Chen Morgan LLP — Boutique Litigation & Corporate
// =============================================================================
// A 12-lawyer boutique in the Financial District. Commercial litigation,
// early-stage venture, and tech M&A. Partners Helen Chen and David Morgan
// built the firm after leaving a AmLaw 50 litigation group. Hero matter:
// Hendrix v. Riverpoint Realty — a commercial discovery fight headed to
// deposition. This file packages the firm's mockup content as a FirmData
// bundle that the registry serves.
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
import { getHendrixTeamChannelScript, getChenMorganLiveAlerts } from "./scripts/hendrix-matter";
import type { FirmData, Firm, VerticalConfig, FirmChannel, DMThread } from "./types";

// ---------------------------------------------------------------------------
// Team (5) — Helen & David run the firm; Sarah/Marcus/Leah do the matter work
// ---------------------------------------------------------------------------
const team: TeamMember[] = [
  { id: "helen", name: "Helen Chen", initials: "HC", role: "Managing Partner · Litigation", avatarColor: "#0F766E", status: "online", clientCount: 9, completedThisWeek: 6 },
  { id: "david-m", name: "David Morgan", initials: "DM", role: "Partner · Corporate", avatarColor: "#1D4ED8", status: "online", clientCount: 11, completedThisWeek: 7 },
  { id: "sarah", name: "Sarah Vidal", initials: "SV", role: "Senior Associate", avatarColor: "#B45309", status: "online", clientCount: 14, completedThisWeek: 9 },
  { id: "marcus", name: "Marcus Reid", initials: "MR", role: "Associate", avatarColor: "#7C3AED", status: "away", clientCount: 10, completedThisWeek: 6 },
  { id: "leah", name: "Leah Park", initials: "LP", role: "Paralegal", avatarColor: "#BE185D", status: "online", clientCount: 18, completedThisWeek: 12 },
];

// ---------------------------------------------------------------------------
// Matters (9) — hero first, then the rest of the book
// ---------------------------------------------------------------------------
type MatterSeed = Omit<ClientWorkspace, "qbSync" | "monthlyCloseStatus" | "firmId" | "integrationStatus" | "integrationLabel" | "integrationLastSync" | "workflowStatus" | "workflowStatusLabel" | "workflowStatusNote"> & {
  integrationStatus: NonNullable<ClientWorkspace["integrationStatus"]>;
  integrationLabel: string;
  integrationLastSync: string;
  workflowStatus: string;
  workflowStatusLabel: string;
  workflowStatusNote?: string;
};

const rawMatters: MatterSeed[] = [
  {
    id: "hendrix-riverpoint",
    name: "Hendrix v. Riverpoint Realty",
    shortName: "HR",
    industry: "Commercial Litigation",
    industryIcon: "⚖",
    color: "#0F766E",
    colorLight: "#ECFDF5",
    entityType: "Plaintiff",
    assignedTo: "helen",
    integrationStatus: "synced",
    integrationLabel: "Clio",
    integrationLastSync: "Just now",
    workflowStatus: "discovery",
    workflowStatusLabel: "Discovery review",
    workflowStatusNote: "Privilege log ready for final review",
    metrics: {
      "Case Phase": "Discovery",
      "Docs Reviewed": "2,412",
      "Privileged Hits": "218",
      "Deposition Date": "May 9",
      "Billable YTD": "$318,500",
    },
    contact: { name: "Marion Hendrix", email: "mhendrix@hendrixco.com" },
    preferences: { tone: "formal", reportStyle: "litigation memos with case citations", frequency: "weekly" },
    monthlyFee: "Hourly ($850/hr blended)",
    knowledgeCount: 54,
    documentCount: 2412,
    conversationCount: 61,
  },
  {
    id: "apex-labs-series-c",
    name: "Apex Labs — Series C",
    shortName: "AL",
    industry: "Venture / Corporate",
    industryIcon: "🧪",
    color: "#1D4ED8",
    colorLight: "#EFF6FF",
    entityType: "C-Corp",
    assignedTo: "david-m",
    integrationStatus: "synced",
    integrationLabel: "NetDocuments",
    integrationLastSync: "5 min ago",
    workflowStatus: "closing",
    workflowStatusLabel: "Closing",
    workflowStatusNote: "SPA signature blocks under review",
    metrics: {
      "Deal Size": "$68M",
      "Lead Investor": "Index Ventures",
      "Signed LOIs": "11 of 11",
      "Close Date": "Apr 18",
      "Billable YTD": "$412,000",
    },
    contact: { name: "Daniel Huang", email: "daniel@apex.bio" },
    preferences: { tone: "transactional", reportStyle: "structured with signature tracking", frequency: "daily" },
    monthlyFee: "Fixed $180K",
    knowledgeCount: 47,
    documentCount: 312,
    conversationCount: 54,
  },
  {
    id: "miyamoto-dispute",
    name: "Pinehurst Operating Co. — Wrongful Term.",
    shortName: "PO",
    industry: "Employment Litigation",
    industryIcon: "🏯",
    color: "#DC2626",
    colorLight: "#FEF2F2",
    entityType: "Defendant",
    assignedTo: "helen",
    integrationStatus: "synced",
    integrationLabel: "Clio",
    integrationLastSync: "2 hours ago",
    workflowStatus: "pleading",
    workflowStatusLabel: "Pleading",
    workflowStatusNote: "Answer drafted, affirmative defenses under review",
    metrics: { "Case Phase": "Pleading", "Claim Amount": "$1.8M", "Deposition Date": "June 14", "Billable YTD": "$62,400" },
    contact: { name: "Robert Eldridge", email: "reldridge@pinehurstops.com" },
    preferences: { tone: "formal", reportStyle: "defense memos", frequency: "weekly" },
    monthlyFee: "Hourly ($750/hr)",
    knowledgeCount: 22,
    documentCount: 184,
    conversationCount: 18,
  },
  {
    id: "tidewater-sec",
    name: "Tidewater Insurance — SEC Inquiry",
    shortName: "TI",
    industry: "Regulatory",
    industryIcon: "🌊",
    color: "#0369A1",
    colorLight: "#F0F9FF",
    entityType: "Public Co.",
    assignedTo: "helen",
    integrationStatus: "stale",
    integrationLabel: "Westlaw",
    integrationLastSync: "3 days ago",
    workflowStatus: "response",
    workflowStatusLabel: "Wells response",
    workflowStatusNote: "Wells submission due April 22",
    metrics: { "Case Phase": "Wells Response", "Docs Produced": "14,200", "Interviews": "6", "Billable YTD": "$284,000" },
    contact: { name: "Anne Whitaker", email: "awhitaker@tidewater.com" },
    preferences: { tone: "formal", reportStyle: "SEC-style memoranda", frequency: "weekly" },
    monthlyFee: "Hourly ($900/hr blended)",
    knowledgeCount: 38,
    documentCount: 892,
    conversationCount: 41,
  },
  {
    id: "greenleaf-ip",
    name: "Greenleaf Organics — TTAB Oppos.",
    shortName: "GO",
    industry: "IP / Trademark",
    industryIcon: "🌿",
    color: "#15803D",
    colorLight: "#F0FDF4",
    entityType: "LLC",
    assignedTo: "marcus",
    integrationStatus: "synced",
    integrationLabel: "Clio",
    integrationLastSync: "1 hour ago",
    workflowStatus: "discovery",
    workflowStatusLabel: "Discovery",
    workflowStatusNote: "Opposer interrogatory responses overdue",
    metrics: { "Case Phase": "TTAB Discovery", "Marks at Issue": "2", "Billable YTD": "$38,900" },
    contact: { name: "Evan Kim", email: "evan@greenleaforganics.com" },
    preferences: { tone: "friendly-formal", reportStyle: "plain-English updates", frequency: "monthly" },
    monthlyFee: "Fixed $8K/mo",
    knowledgeCount: 19,
    documentCount: 96,
    conversationCount: 12,
  },
  {
    id: "delta-construction",
    name: "Delta Construction — MSA review",
    shortName: "DC",
    industry: "Contract",
    industryIcon: "🏗",
    color: "#D97706",
    colorLight: "#FFFBEB",
    entityType: "LLC",
    assignedTo: "david-m",
    integrationStatus: "synced",
    integrationLabel: "DocuSign",
    integrationLastSync: "30 min ago",
    workflowStatus: "review",
    workflowStatusLabel: "Contract review",
    workflowStatusNote: "LOD clause negotiation round 2",
    metrics: { "Contract Type": "Master Services", "Value": "$12M / 3 yrs", "Billable YTD": "$24,800" },
    contact: { name: "Marta Delgado", email: "marta@deltaconstruction.com" },
    preferences: { tone: "direct", reportStyle: "redline summaries", frequency: "per-milestone" },
    monthlyFee: "Hourly ($650/hr)",
    knowledgeCount: 14,
    documentCount: 42,
    conversationCount: 9,
  },
  {
    id: "holloway-estate",
    name: "Estate of Margaret Holloway",
    shortName: "HE",
    industry: "Probate",
    industryIcon: "📜",
    color: "#8B5CF6",
    colorLight: "#F5F3FF",
    entityType: "Estate",
    assignedTo: "leah",
    integrationStatus: "synced",
    integrationLabel: "Clio",
    integrationLastSync: "Yesterday",
    workflowStatus: "administration",
    workflowStatusLabel: "Administration",
    workflowStatusNote: "Final accounting in draft",
    metrics: { "Case Phase": "Administration", "Estate Value": "$4.2M", "Beneficiaries": "5", "Billable YTD": "$31,200" },
    contact: { name: "Thomas Holloway", email: "tom@hollowayestate.com" },
    preferences: { tone: "warm-formal", reportStyle: "plain-English summaries", frequency: "monthly" },
    monthlyFee: "Hourly ($550/hr)",
    knowledgeCount: 21,
    documentCount: 68,
    conversationCount: 15,
  },
  {
    id: "thornton-trust",
    name: "Thornton Family Trust",
    shortName: "TT",
    industry: "Trusts & Estates",
    industryIcon: "🏛",
    color: "#B45309",
    colorLight: "#FFFBEB",
    entityType: "Revocable Trust",
    assignedTo: "david-m",
    integrationStatus: "synced",
    integrationLabel: "NetDocuments",
    integrationLastSync: "3 hours ago",
    workflowStatus: "drafting",
    workflowStatusLabel: "Document drafting",
    workflowStatusNote: "Amendment 3 with dynasty provision",
    metrics: { "Case Phase": "Drafting", "AUM": "$18M", "Generations Covered": "3", "Billable YTD": "$42,600" },
    contact: { name: "Victoria Thornton", email: "vthornton@thorntonfamily.com" },
    preferences: { tone: "formal", reportStyle: "legal memos with tax citations", frequency: "monthly" },
    monthlyFee: "Hourly ($700/hr)",
    knowledgeCount: 28,
    documentCount: 87,
    conversationCount: 19,
  },
  {
    id: "maven-acquisition",
    name: "Maven Tech — Acquisition Due Dil.",
    shortName: "MT",
    industry: "M&A",
    industryIcon: "🤝",
    color: "#EC4899",
    colorLight: "#FDF2F8",
    entityType: "Target",
    assignedTo: "sarah",
    integrationStatus: "synced",
    integrationLabel: "NetDocuments",
    integrationLastSync: "1 hour ago",
    workflowStatus: "due-diligence",
    workflowStatusLabel: "Due diligence",
    workflowStatusNote: "IP chain-of-title verification ongoing",
    metrics: { "Deal Size": "$140M", "Target": "Maven Tech", "Billable YTD": "$198,000" },
    contact: { name: "Rohan Kapoor", email: "rohan@mavenhq.io" },
    preferences: { tone: "formal", reportStyle: "due diligence memos", frequency: "weekly" },
    monthlyFee: "Fixed $250K",
    knowledgeCount: 35,
    documentCount: 612,
    conversationCount: 44,
  },
];

const clients: ClientWorkspace[] = rawMatters.map((m) => ({
  ...m,
  firmId: "chen-morgan",
  qbSync: m.integrationStatus,
  qbLastSync: m.integrationLastSync,
  monthlyCloseStatus: "in-progress",
  monthlyCloseNote: m.workflowStatusNote,
}));

// ---------------------------------------------------------------------------
// Attention items — 4 active pain points
// ---------------------------------------------------------------------------
const attentionItems: AttentionItem[] = [
  {
    id: "cm-att-1",
    type: "deadline",
    severity: "critical",
    title: "Hendrix discovery deadline in 48 hours",
    clientId: "hendrix-riverpoint",
    description: "Privilege log must ship to Hartwell & Beam by Friday 5pm. Three borderline calls still waiting on Helen's review.",
    detectedAt: "1 hour ago",
    dueDate: "Friday 5pm",
  },
  {
    id: "cm-att-2",
    type: "review",
    severity: "high",
    title: "Tidewater Wells response draft ready",
    clientId: "tidewater-sec",
    from: "marcus",
    description: "Marcus finished the Section 4 narrative on the Tidewater Wells response. Citations verified. Needs Helen's review before Monday's submission.",
    detectedAt: "3 hours ago",
    aiConfidence: 92,
  },
  {
    id: "cm-att-3",
    type: "blocked",
    severity: "high",
    title: "Apex Labs — escrow agent page missing",
    clientId: "apex-labs-series-c",
    from: "david-m",
    description: "SPA signature packet is 22 of 23 pages. Escrow Agent (First Republic) authorization still outstanding. Closing blocked until received.",
    detectedAt: "2 hours ago",
  },
  {
    id: "cm-att-4",
    type: "low-confidence",
    severity: "medium",
    title: "Greenleaf interrogatory — overdue by 3 days",
    clientId: "greenleaf-ip",
    description: "Opposer's interrogatory responses were due Tuesday. TTAB hasn't issued a show-cause yet but we should move to compel if nothing lands by tomorrow.",
    detectedAt: "Today",
    aiConfidence: 78,
  },
];

// ---------------------------------------------------------------------------
// Approval queue — 6 items ready for review
// ---------------------------------------------------------------------------
const approvalQueue: ApprovalQueueItem[] = [
  {
    id: "cm-aq-1",
    clientId: "hendrix-riverpoint",
    title: "Hendrix Privilege Log — final draft",
    format: "xlsx",
    generatedBy: "team",
    generatedByName: "Sarah Vidal",
    aiConfidence: 94,
    highlights: ["2,412 entries classified", "3 borderline calls flagged for Helen", "Work-product claim on entry 2018"],
    status: "pending",
    createdAt: "Today 8:56 AM",
    waitingSince: "45m",
    version: 2,
  },
  {
    id: "cm-aq-2",
    clientId: "hendrix-riverpoint",
    title: "Cover Memo — Privilege Log Production",
    format: "docx",
    generatedBy: "ai",
    aiConfidence: 91,
    highlights: ["Formal firm voice", "Cites Rule 26(b)(5)(A)", "Work-product basis for entry 2018"],
    status: "pending",
    createdAt: "Today 9:30 AM",
    waitingSince: "15m",
    version: 1,
  },
  {
    id: "cm-aq-3",
    clientId: "tidewater-sec",
    title: "Tidewater Wells Response — Section 4",
    format: "docx",
    generatedBy: "team",
    generatedByName: "Marcus Reid",
    aiConfidence: 89,
    highlights: ["14 document citations verified", "Tone matched to prior SEC correspondence", "Exhibits cross-referenced"],
    status: "pending",
    createdAt: "Yesterday 4:20 PM",
    waitingSince: "17h",
    version: 3,
  },
  {
    id: "cm-aq-4",
    clientId: "apex-labs-series-c",
    title: "Apex Labs SPA — signature block review",
    format: "docx",
    generatedBy: "ai",
    aiConfidence: 95,
    highlights: ["11 of 11 lead investor signature blocks verified", "One Delaware name mismatch flagged", "Escrow agent page pending"],
    status: "pending",
    createdAt: "Today 7:12 AM",
    waitingSince: "3h",
    version: 1,
  },
  {
    id: "cm-aq-5",
    clientId: "holloway-estate",
    title: "Final accounting — Estate of Holloway",
    format: "xlsx",
    generatedBy: "team",
    generatedByName: "Leah Park",
    aiConfidence: 93,
    highlights: ["All 5 beneficiary distributions reconciled", "Remaining reserve $34,200", "Ready for court submission"],
    status: "pending",
    createdAt: "Yesterday 3:45 PM",
    waitingSince: "18h",
    version: 1,
  },
  {
    id: "cm-aq-6",
    clientId: "maven-acquisition",
    title: "Due Diligence Memo — IP chain-of-title",
    format: "docx",
    generatedBy: "ai",
    aiConfidence: 88,
    highlights: ["3 patents with recording gaps flagged", "Proposed remediation path", "Materiality threshold analysis"],
    status: "pending",
    createdAt: "Today 6:40 AM",
    waitingSince: "3h",
    version: 2,
  },
];

// ---------------------------------------------------------------------------
// AI working now
// ---------------------------------------------------------------------------
const aiTasks: AITask[] = [
  {
    id: "cm-ai-1",
    title: "Scanning Hendrix discovery set for responsiveness",
    description: "Final pass on the 2,412 doc set against Rule 34 request scope",
    progress: 2118,
    total: 2412,
    unit: "docs",
    estimatedRemaining: "35 min",
    status: "running",
    startedAt: "6:00 AM",
  },
  {
    id: "cm-ai-2",
    title: "Drafting Tidewater Wells submission Section 5",
    description: "Regulatory narrative on board supervision",
    progress: 78,
    total: 100,
    unit: "%",
    estimatedRemaining: "1.5 hours",
    status: "running",
    startedAt: "7:20 AM",
  },
  {
    id: "cm-ai-3",
    title: "Monitoring PACER dockets across 9 clients",
    description: "Real-time alerts on filings by opposing counsel",
    progress: 9,
    total: 9,
    unit: "clients",
    status: "running",
    startedAt: "Continuous",
  },
  {
    id: "cm-ai-4",
    title: "Apex Labs — escrow agent signature tracking",
    description: "Waiting on First Republic Bank signature page",
    progress: 0,
    total: 1,
    unit: "pages",
    status: "waiting-approval",
    startedAt: "Yesterday",
  },
];

// ---------------------------------------------------------------------------
// Completed today
// ---------------------------------------------------------------------------
const completedToday: CompletedItem[] = [
  { id: "cm-c-1", title: "Classified 2,412 Hendrix docs for privilege", detail: "218 privileged, 3 borderline flagged for Helen", completedAt: "8:40 AM", category: "generation", itemCount: 2412 },
  { id: "cm-c-2", title: "Drafted privilege log cover memo", detail: "Cover to Hartwell & Beam, firm voice", completedAt: "9:30 AM", category: "generation", itemCount: 1 },
  { id: "cm-c-3", title: "Ran Greenleaf TTAB conflict check", detail: "No new conflicts with the opposer's counsel", completedAt: "7:45 AM", category: "detection", itemCount: 1 },
  { id: "cm-c-4", title: "Pulled precedent briefs for Pinehurst affirmative defenses", detail: "12 briefs from Westlaw, ranked by relevance", completedAt: "6:50 AM", category: "generation", itemCount: 12 },
  { id: "cm-c-5", title: "Updated billing for 6 clients", detail: "Clio timekeeping auto-synced", completedAt: "5:30 AM", category: "reconciliation", clientCount: 6 },
  { id: "cm-c-6", title: "Detected duplicate filings on PACER", detail: "Hartwell & Beam re-filed a motion Wednesday — same caption, different exhibit", completedAt: "5:10 AM", category: "detection", itemCount: 1 },
  { id: "cm-c-7", title: "Drafted 3 estate beneficiary letters", detail: "Holloway final distribution cover letters", completedAt: "4:00 AM", category: "communication", itemCount: 3 },
];

// ---------------------------------------------------------------------------
// Weekly overview
// ---------------------------------------------------------------------------
const weeklyOverview: WeeklyOverview = {
  monthlyClose: { completed: 7, total: 12, delta: 3 },
  taxSeason: { docsCollected: 2412, docsTotal: 2412, urgentReminders: 0 },
  teamWorkload: [
    { memberId: "helen", completed: 6, total: 9 },
    { memberId: "david-m", completed: 7, total: 11 },
    { memberId: "sarah", completed: 9, total: 14 },
    { memberId: "marcus", completed: 6, total: 10 },
    { memberId: "leah", completed: 12, total: 18 },
  ],
  quality: { reworkRate: 2.4, reworkRatePrev: 3.1, aiConfidenceAvg: 92, aiConfidencePrev: 89 },
  cost: { apiUsage: 34, apiBudget: 120, costPerClient: 0.42, costTarget: 0.50 },
};

// ---------------------------------------------------------------------------
// Client documents
// ---------------------------------------------------------------------------
const clientDocuments: ClientDocument[] = [
  { id: "cm-doc-1", clientId: "hendrix-riverpoint", title: "Hendrix Privilege Log — final draft", format: "xlsx", source: "team", sourceName: "Sarah Vidal", version: 2, status: "pending-review", date: "Apr 7, 2026", tags: ["discovery", "privilege"] },
  { id: "cm-doc-2", clientId: "hendrix-riverpoint", title: "Cover Memo — Privilege Log Production", format: "docx", source: "ai", version: 1, status: "pending-review", date: "Apr 7, 2026", tags: ["discovery", "correspondence"] },
  { id: "cm-doc-3", clientId: "hendrix-riverpoint", title: "Deposition Prep Binder — Hendrix", format: "pdf", source: "team", sourceName: "Sarah Vidal", version: 1, status: "draft", date: "Apr 5, 2026", tags: ["deposition"] },
  { id: "cm-doc-4", clientId: "hendrix-riverpoint", title: "Complaint — filed 2/14/2026", format: "pdf", source: "uploaded", version: 1, status: "archived", date: "Feb 14, 2026", tags: ["pleading"] },
  { id: "cm-doc-5", clientId: "apex-labs-series-c", title: "Series C SPA — execution version", format: "docx", source: "team", sourceName: "David Morgan", version: 8, status: "pending-review", date: "Apr 6, 2026", tags: ["corporate", "spa"] },
  { id: "cm-doc-6", clientId: "apex-labs-series-c", title: "Cap table reconciliation — Apex", format: "xlsx", source: "ai", version: 1, status: "approved", date: "Apr 5, 2026", tags: ["corporate"] },
  { id: "cm-doc-7", clientId: "tidewater-sec", title: "Wells Response — Section 4", format: "docx", source: "team", sourceName: "Marcus Reid", version: 3, status: "pending-review", date: "Apr 6, 2026", tags: ["regulatory"] },
  { id: "cm-doc-8", clientId: "maven-acquisition", title: "DD Memo — IP chain-of-title", format: "docx", source: "ai", version: 2, status: "pending-review", date: "Apr 7, 2026", tags: ["diligence"] },
];

// ---------------------------------------------------------------------------
// Client AI activity
// ---------------------------------------------------------------------------
const clientAIActivities: ClientAIActivity[] = [
  { id: "cm-caa-1", clientId: "hendrix-riverpoint", action: "Classified 2,412 discovery docs", detail: "218 privileged, 3 borderline", date: "Apr 7", status: "completed" },
  { id: "cm-caa-2", clientId: "hendrix-riverpoint", action: "Drafted privilege log cover memo", detail: "To Hartwell & Beam — firm voice", date: "Apr 7", status: "draft" },
  { id: "cm-caa-3", clientId: "hendrix-riverpoint", action: "Flagged 3 borderline privilege calls", detail: "Entries 847, 1203, 2018", date: "Apr 7", status: "flagged" },
  { id: "cm-caa-4", clientId: "hendrix-riverpoint", action: "Helen's privilege-review note", detail: "Asserting work-product on entry 2018 per Hickman", date: "Apr 6", status: "note" },
  { id: "cm-caa-5", clientId: "apex-labs-series-c", action: "Verified 11 SPA signature blocks", detail: "One Delaware name mismatch flagged", date: "Apr 7", status: "flagged" },
  { id: "cm-caa-6", clientId: "apex-labs-series-c", action: "Reconciled cap table with Carta", detail: "Post-round cap table clean", date: "Apr 6", status: "completed" },
  { id: "cm-caa-7", clientId: "tidewater-sec", action: "Cited Section 4 Wells response", detail: "14 doc citations verified", date: "Apr 6", status: "draft" },
  { id: "cm-caa-8", clientId: "tidewater-sec", action: "Monitored SEC inquiry updates", detail: "No new staff communications", date: "Apr 6", status: "completed" },
  { id: "cm-caa-9", clientId: "greenleaf-ip", action: "Overdue interrogatory alert", detail: "Opposer 3 days past response deadline", date: "Apr 7", status: "flagged" },
];

// ---------------------------------------------------------------------------
// Team handoffs
// ---------------------------------------------------------------------------
const teamHandoffs: Record<string, BriefingMessage[]> = {
  "hendrix-riverpoint": [
    {
      id: "cm-handoff-hendrix-1",
      type: "team-handoff",
      timestamp: "45 min ago",
      content: "Helen — privilege log is done on my end. Three entries I want you to look at before we ship. Details in the log itself but I wanted to flag now so you have time before the Friday deadline.",
      metadata: {
        teamMemberId: "sarah",
        mentionedTo: "helen",
        handoffSubject: "Privilege log — 3 borderline calls",
      },
    },
  ],
  "apex-labs-series-c": [
    {
      id: "cm-handoff-apex-1",
      type: "team-handoff",
      timestamp: "2 hours ago",
      content: "Helen/Sarah — closing is 48 hours out and we're still waiting on the First Republic escrow page. I called the banker this morning, he's chasing internally. If we don't have it by tomorrow noon we need to decide: push close to Monday or escrow with BNY Mellon as backup?",
      metadata: {
        teamMemberId: "david-m",
        mentionedTo: "helen",
        handoffSubject: "Apex Labs closing — escrow page blocker",
      },
    },
  ],
  "tidewater-sec": [
    {
      id: "cm-handoff-tidewater-1",
      type: "team-handoff",
      timestamp: "3 hours ago",
      content: "Helen — Section 4 of the Wells response is tight. Verified all 14 citations against the staff's original Rule 4-04 inquiry. One exhibit reference I want you to double-check because the pagination shifted after David's edits last week.",
      metadata: {
        teamMemberId: "marcus",
        mentionedTo: "helen",
        handoffSubject: "Tidewater Wells Response — Section 4 ready",
      },
    },
  ],
};

// ---------------------------------------------------------------------------
// Client knowledge
// ---------------------------------------------------------------------------
const clientKnowledgeMap: Record<string, KnowledgeItem[]> = {
  "hendrix-riverpoint": [
    { id: "k1", category: "preference", title: "Hendrix prefers plain-English updates", detail: "Marion wants weekly updates in plain English — no jargon, no hedging. Tell him the bottom line first, then the why.", lastUpdated: "2 weeks ago", source: "team-noted" },
    { id: "k2", category: "history", title: "Three prior Riverpoint disputes", detail: "Hendrix has two prior commercial disputes with Riverpoint that settled. Pattern: Riverpoint pushes aggressively in discovery then settles before trial.", lastUpdated: "1 month ago", source: "ai-learned" },
    { id: "k3", category: "pattern", title: "Hartwell & Beam tactic: late Friday filings", detail: "Opposing counsel routinely files substantive motions late Friday to compress our response window. Schedule coverage accordingly.", lastUpdated: "3 weeks ago", source: "ai-learned" },
    { id: "k4", category: "compliance", title: "E.D.N.Y. Judge Alvarado rules", detail: "Chambers requires pre-motion conferences on anything beyond routine scheduling. Discovery disputes get referred to mag judge Tran first.", lastUpdated: "2 months ago", source: "team-noted" },
    { id: "k5", category: "contact", title: "Marion Hendrix reachable Tues/Thurs 9-11 AM ET", detail: "Runs his company the rest of the week. Don't call outside those windows unless it's genuinely urgent.", lastUpdated: "1 month ago", source: "client-shared" },
  ],
  "apex-labs-series-c": [
    { id: "k1", category: "preference", title: "Daniel wants daily close updates", detail: "During closing, Daniel wants a short end-of-day status email: what moved today, what's still open, what you need from him.", lastUpdated: "1 week ago", source: "team-noted" },
    { id: "k2", category: "history", title: "Lead investor: Index Ventures", detail: "Index Ventures partner on the deal is Shiv Patel. Past Index deals closed on time — very process-oriented counsel on their side.", lastUpdated: "3 weeks ago", source: "team-noted" },
    { id: "k3", category: "compliance", title: "Delaware good-standing verified 4/1", detail: "All 11 investor entities confirmed Delaware in good standing. Re-verify 7 days before closing.", lastUpdated: "1 week ago", source: "ai-learned" },
  ],
  "tidewater-sec": [
    { id: "k1", category: "compliance", title: "Wells submission — 30 day window", detail: "Staff Wells notice issued 3/23. Response window closes April 22. No extensions typically granted on Rule 4-04 inquiries.", lastUpdated: "2 weeks ago", source: "team-noted" },
    { id: "k2", category: "preference", title: "Anne Whitaker signs every outgoing filing", detail: "GC wants to read every outgoing correspondence before it ships. Build in 24 hours review buffer.", lastUpdated: "1 month ago", source: "client-shared" },
  ],
};

// ---------------------------------------------------------------------------
// Client channels
// ---------------------------------------------------------------------------
const clientChannels: Record<string, Channel[]> = {
  "hendrix-riverpoint": [
    {
      id: "hendrix-team",
      type: "team",
      name: "Case team",
      description: "Everyone working on Hendrix v. Riverpoint",
      participantIds: ["helen", "sarah", "david-m"],
      lastActivity: "15 min ago",
      unreadCount: 3,
    },
    {
      id: "hendrix-private",
      type: "private",
      name: "Private with AI",
      description: "Helen's private 1:1 with FractionalOS",
      participantIds: ["helen"],
      lastActivity: "Yesterday",
    },
    {
      id: "hendrix-discovery",
      type: "topic",
      name: "Discovery production",
      description: "Focused thread for the discovery workflow",
      participantIds: ["helen", "sarah"],
      lastActivity: "1 hour ago",
      unreadCount: 1,
    },
  ],
  "apex-labs-series-c": [
    {
      id: "apex-team",
      type: "team",
      name: "Deal team",
      description: "Everyone on the Apex Labs Series C",
      participantIds: ["david-m", "helen", "sarah"],
      lastActivity: "2 hours ago",
      unreadCount: 1,
    },
    {
      id: "apex-private",
      type: "private",
      name: "Private with AI",
      participantIds: ["david-m"],
      lastActivity: "Yesterday",
    },
    {
      id: "apex-closing",
      type: "topic",
      name: "Closing checklist",
      description: "Signature page tracker",
      participantIds: ["david-m", "sarah"],
      lastActivity: "30 min ago",
    },
  ],
  "tidewater-sec": [
    {
      id: "tidewater-team",
      type: "team",
      name: "Case team",
      participantIds: ["helen", "marcus"],
      lastActivity: "3 hours ago",
      unreadCount: 1,
    },
    {
      id: "tidewater-private",
      type: "private",
      name: "Private with AI",
      participantIds: ["helen"],
      lastActivity: "2 days ago",
    },
  ],
};

// ---------------------------------------------------------------------------
// Upcoming events
// ---------------------------------------------------------------------------
const upcomingEvents: UpcomingEvent[] = [
  { id: "cm-ev-1", date: "2026-04-08", dateShort: "Tomorrow", title: "Apex Labs closing call", clientId: "apex-labs-series-c", type: "meeting" },
  { id: "cm-ev-2", date: "2026-04-10", dateShort: "Friday", title: "Hendrix discovery production deadline", clientId: "hendrix-riverpoint", type: "deadline" },
  { id: "cm-ev-3", date: "2026-04-14", dateShort: "Apr 14", title: "Pinehurst pleading conference", clientId: "miyamoto-dispute", type: "meeting" },
  { id: "cm-ev-4", date: "2026-04-18", dateShort: "Apr 18", title: "Apex Labs Series C close", clientId: "apex-labs-series-c", type: "filing" },
  { id: "cm-ev-5", date: "2026-04-22", dateShort: "Apr 22", title: "Tidewater Wells response due", clientId: "tidewater-sec", type: "filing" },
  { id: "cm-ev-6", date: "2026-05-09", dateShort: "May 9", title: "Hendrix Rule 30(b)(6) deposition", clientId: "hendrix-riverpoint", type: "meeting" },
];

// ---------------------------------------------------------------------------
// Activity feed
// ---------------------------------------------------------------------------
const activityFeed: ActivityItem[] = [
  { id: "cm-act-1", memberId: "sarah", action: "finalized privilege log for", target: "Hendrix v. Riverpoint", clientId: "hendrix-riverpoint", timeAgo: "1h ago" },
  { id: "cm-act-2", memberId: "marcus", action: "finished Section 4 of Wells response for", target: "Tidewater Insurance", clientId: "tidewater-sec", timeAgo: "3h ago" },
  { id: "cm-act-3", memberId: "david-m", action: "updated closing checklist for", target: "Apex Labs Series C", clientId: "apex-labs-series-c", timeAgo: "2h ago" },
  { id: "cm-act-4", memberId: "leah", action: "completed final accounting for", target: "Estate of Holloway", clientId: "holloway-estate", timeAgo: "4h ago" },
  { id: "cm-act-5", memberId: "helen", action: "approved answer in", target: "Pinehurst dispute", clientId: "miyamoto-dispute", timeAgo: "Yesterday" },
];

// ---------------------------------------------------------------------------
// Live activity ticker
// ---------------------------------------------------------------------------
const liveActivityTicks: ActivityTick[] = [
  { label: "Classifying Hendrix docs", current: 2118, total: 2412, unit: "docs" },
  { label: "Monitoring PACER dockets", current: 9, total: 9, unit: "clients" },
];

// ---------------------------------------------------------------------------
// Firm metadata
// ---------------------------------------------------------------------------
const firm: Firm = {
  id: "chen-morgan",
  name: "Chen Morgan LLP",
  shortName: "CM",
  logoColor: "#0F766E", // teal — matches Helen's avatar + firm brand
  vertical: "law",
  tagline: "12 lawyers · 42 active clients",
  heroClientId: "hendrix-riverpoint",
  totalClientCount: 42,
};

const config: VerticalConfig = {
  vertical: "law",
  labels: {
    clientWord: "Client",
    clientWordPlural: "Clients",
    teamWord: "Case team",
    workflowWord: "Case phase",
    primaryOutputLabel: "Legal memo",
  },
  integrations: [
    { name: "Clio", subtitle: "Synced just now", synced: true },
    { name: "NetDocuments", subtitle: "Synced 5 min ago", synced: true },
    { name: "Westlaw", subtitle: "Synced 1h ago", synced: true },
    { name: "DocuSign", subtitle: "Synced 30 min ago", synced: true },
  ],
  featuredMetricKeys: ["Case Phase", "Billable YTD", "Docs Reviewed", "Deposition Date"],
};

// ---------------------------------------------------------------------------
// Team collaboration — firm-wide channels + 1:1 DMs
// ---------------------------------------------------------------------------
const firmChannels: FirmChannel[] = [
  {
    id: "cm-general",
    name: "#general",
    description: "Firm-wide announcements",
    participantIds: team.map((m) => m.id),
  },
  {
    id: "cm-knowledge",
    name: "#practice-notes",
    description: "Case strategy and practice-area updates",
    participantIds: team.map((m) => m.id),
  },
];

const firmChannelBriefings: Record<string, BriefingMessage[]> = {
  "cm-general": [
    {
      id: "cm-gen-1",
      type: "team-update",
      senderId: "helen",
      timestamp: "Monday 7:48 AM",
      content:
        "Morning team. Reminder: Chambers of Judge Alvarado updated scheduling rules last Friday — discovery disputes now get a pre-motion conference before any motion to compel. Please route all new Hendrix-style disputes through me before we file.",
      metadata: { teamMemberId: "helen" },
    },
    {
      id: "cm-gen-2",
      type: "team-update",
      senderId: "david-m",
      timestamp: "Monday 8:02 AM",
      content:
        "Noted. Also a heads up on Apex Labs — the SPA signature block issue I flagged is still outstanding. First Republic is closed Monday for a bank holiday so we won't get the escrow page until Tuesday at the earliest.",
      metadata: { teamMemberId: "david-m" },
    },
    {
      id: "cm-gen-3",
      type: "team-update",
      senderId: "sarah",
      timestamp: "Monday 8:30 AM",
      content:
        "Hendrix privilege log will be in Helen's hands by Wednesday noon. I have three borderline entries — will flag them in the team channel for that client, not here.",
      metadata: { teamMemberId: "sarah" },
    },
  ],
  "cm-knowledge": [
    {
      id: "cm-know-1",
      type: "team-update",
      senderId: "marcus",
      timestamp: "Yesterday 2:20 PM",
      content:
        "Question for the group: In Rule 34 production sets, how are you handling AI-drafted internal memos that were never sent? Tidewater has a few and I want to make sure we're consistent across clients.",
      metadata: { teamMemberId: "marcus" },
    },
    {
      id: "cm-know-2",
      type: "team-update",
      senderId: "helen",
      timestamp: "Yesterday 2:45 PM",
      content:
        "Work-product, every time. Hickman v. Taylor is the starting point. If opposing counsel challenges, we meet and confer — and if we lose, we lose on a defensible ground. Never produce unsent drafts voluntarily.",
      metadata: { teamMemberId: "helen" },
    },
    {
      id: "cm-know-3",
      type: "team-update",
      senderId: "david-m",
      timestamp: "Yesterday 3:10 PM",
      content:
        "Agreed. Also worth noting — on the Apex deal side, I've started marking all internal memos 'DRAFT — ATTORNEY WORK PRODUCT' at creation, not at production. Much cleaner if an issue ever lands in front of a judge.",
      metadata: { teamMemberId: "david-m" },
    },
  ],
};

const dmThreads: DMThread[] = [
  { id: "cm-dm-helen-sarah", participantIds: ["helen", "sarah"], lastActivity: "1 hour ago", unreadCount: 2 },
  { id: "cm-dm-helen-david-m", participantIds: ["helen", "david-m"], lastActivity: "3 hours ago" },
  { id: "cm-dm-helen-marcus", participantIds: ["helen", "marcus"], lastActivity: "Yesterday" },
];

const dmBriefings: Record<string, BriefingMessage[]> = {
  "cm-dm-helen-sarah": [
    {
      id: "cm-dm-hs-1",
      type: "team-update",
      senderId: "sarah",
      timestamp: "8:45 AM",
      content:
        "Helen — one thing about the Hendrix privilege log I didn't put in the team channel. Entry 2018 is Morgan's deposition prep memo, and I know he's sensitive about his early draft work being seen. Do you want me to loop him in before we assert work-product on it?",
      metadata: { teamMemberId: "sarah" },
    },
    {
      id: "cm-dm-hs-2",
      type: "user",
      senderId: "user",
      timestamp: "9:01 AM",
      content:
        "Good instinct. Yes — send him the row privately and ask if he's comfortable with the assertion. Don't make it feel like a vote, just a courtesy heads-up. He'll appreciate it.",
    },
    {
      id: "cm-dm-hs-3",
      type: "team-update",
      senderId: "sarah",
      timestamp: "9:15 AM",
      content: "Already done — and he's fine with it. Cover memo is almost ready.",
      metadata: { teamMemberId: "sarah" },
    },
  ],
  "cm-dm-helen-david-m": [
    {
      id: "cm-dm-hd-1",
      type: "team-update",
      senderId: "david-m",
      timestamp: "Yesterday 5:30 PM",
      content:
        "Apex closing is going to slip if First Republic doesn't come through by Tuesday. Do you want me to line up BNY Mellon as a backup escrow agent now, or wait and see?",
      metadata: { teamMemberId: "david-m" },
    },
    {
      id: "cm-dm-hd-2",
      type: "user",
      senderId: "user",
      timestamp: "Yesterday 5:48 PM",
      content:
        "Line them up. Daniel Huang has been patient with us but if we walk into Apr 18 without a plan B he'll lose confidence fast. Better to have a backup we don't use than to scramble on closing day.",
    },
  ],
  "cm-dm-helen-marcus": [
    {
      id: "cm-dm-hm-1",
      type: "team-update",
      senderId: "marcus",
      timestamp: "Yesterday 11:30 AM",
      content:
        "Helen — Tidewater Section 4 is ready for your review but I wanted to ask something first. Is it OK for me to sit in on the submission call with Anne Whitaker? I've been doing the work and I'd like to hear how she responds in person.",
      metadata: { teamMemberId: "marcus" },
    },
    {
      id: "cm-dm-hm-2",
      type: "user",
      senderId: "user",
      timestamp: "Yesterday 11:45 AM",
      content:
        "Absolutely. You should be there. I'll email Anne to introduce you as co-counsel on the Wells response going forward.",
    },
  ],
};

// ---------------------------------------------------------------------------
// Global agent briefings — scripted responses for the Home view Ask panel.
// ---------------------------------------------------------------------------
const globalAgentBriefings: Record<string, BriefingMessage[]> = {
  "morning-briefing": [
    {
      id: "cm-ga-morning-1",
      type: "briefing",
      senderId: "ai",
      timestamp: "8:02 AM",
      content: "**Good morning, Helen.** Here's the firm picture across all 42 active clients:",
      metadata: {
        highlights: [
          "**Hendrix discovery deadline — 48 hours** — Sarah's privilege log is ready; 3 entries flagged for your review",
          "**Apex Labs Series C closing on Apr 18** — signature packet 22 of 23, waiting on First Republic escrow page",
          "**Tidewater Wells response due Apr 22** — Marcus finished Section 4, needs your sign-off",
          "**PACER monitoring** — no new filings overnight across any client",
        ],
      },
    },
  ],
  "client-status": [
    {
      id: "cm-ga-cs-1",
      type: "ai-response",
      senderId: "ai",
      timestamp: "Just now",
      content:
        "Across the firm's active clients, the phase breakdown:\n\n" +
        "• **Discovery** — 14 clients (3 with imminent deadlines)\n" +
        "• **Pleading / Pre-trial** — 11 clients\n" +
        "• **Closing / Transaction** — 6 clients\n" +
        "• **Post-judgment / Administration** — 11 clients\n\n" +
        "Hendrix v. Riverpoint is the most time-sensitive — discovery production is due Friday.",
    },
  ],
  "team-workload": [
    {
      id: "cm-ga-tw-1",
      type: "ai-response",
      senderId: "ai",
      timestamp: "Just now",
      content:
        "Your case team loads this week:\n\n" +
        "• **Sarah Vidal** — 14 clients, at 90% billable load\n" +
        "• **David Morgan** — 11 clients, heavy Apex closing next 10 days\n" +
        "• **Marcus Reid** — 10 clients, Tidewater Wells is his main block\n" +
        "• **Leah Park** — 18 clients, paralegal support steady\n\n" +
        "Sarah is the person to protect this week — any new intake should route to Marcus.",
    },
  ],
};

export const chenMorganData: FirmData = {
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
  liveAlertsByClient: getChenMorganLiveAlerts(),
  firmChannels,
  firmChannelBriefings,
  dmThreads,
  dmBriefings,
  globalAgentBriefings,
  heroChannelScript: getHendrixTeamChannelScript,
};
