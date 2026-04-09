// =============================================================================
// Park Accounting Group — the existing accounting firm content, wrapped as FirmData
// =============================================================================
// This file does NOT redefine the mock data — it imports the existing exports
// from `mock-data.ts` and packages them into a `FirmData` bundle so the firm
// registry can serve them via `getActiveFirmData()`.
//
// No behavioral change in Phase N.1: consumers that import from mock-data.ts
// directly continue to work. The FirmData bundle is a parallel access path
// that Phase N.2+ will migrate consumers onto.
// =============================================================================

import {
  team,
  clients as rawClients,
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
  type ClientWorkspace,
  type BriefingMessage,
} from "../mock-data";
import { getKimsTeamChannelScript, getKimsLiveAlerts } from "./scripts/kims-restaurant";
import type { FirmData, Firm, VerticalConfig, FirmChannel, DMThread } from "./types";

// Enrich each existing accounting client with the generic multi-vertical fields.
// This keeps the original accounting-specific data intact while giving vertical-
// agnostic UI a uniform surface to read from.
const closeStatusLabels: Record<string, string> = {
  done: "Closed",
  "in-progress": "In progress",
  ready: "Ready to close",
  pending: "Pending",
  blocked: "Blocked",
};

const clients: ClientWorkspace[] = rawClients.map((c) => ({
  ...c,
  firmId: "park-accounting",
  integrationStatus: c.qbSync,
  integrationLabel: "QuickBooks",
  integrationLastSync: c.qbLastSync,
  workflowStatus: c.monthlyCloseStatus,
  workflowStatusLabel: closeStatusLabels[c.monthlyCloseStatus] ?? c.monthlyCloseStatus,
  workflowStatusNote: c.monthlyCloseNote,
}));

const firm: Firm = {
  id: "park-accounting",
  name: "Park Accounting Group",
  shortName: "PA",
  logoColor: "#6366F1", // indigo — matches Jennifer's avatar
  vertical: "accounting",
  tagline: "6 people · 120 clients",
  heroClientId: "kims-restaurant",
  totalClientCount: 120,
};

const config: VerticalConfig = {
  vertical: "accounting",
  labels: {
    clientWord: "Client",
    clientWordPlural: "Clients",
    teamWord: "Team",
    workflowWord: "Monthly close",
    primaryOutputLabel: "Financial statement",
  },
  integrations: [
    { name: "QuickBooks Online", subtitle: "Synced just now", synced: true },
    { name: "Xero", subtitle: "Synced 12 min ago", synced: true },
    { name: "Google Drive", subtitle: "Synced 1h ago", synced: true },
    { name: "Gusto", subtitle: "Synced 3h ago", synced: true },
  ],
  featuredMetricKeys: ["Monthly Revenue", "COGS", "Net Income", "AR Outstanding"],
};

// ---------------------------------------------------------------------------
// Team collaboration — firm-wide channels + 1:1 direct messages
// ---------------------------------------------------------------------------
const firmChannels: FirmChannel[] = [
  {
    id: "pa-general",
    name: "#general",
    description: "Firm-wide announcements and updates",
    participantIds: team.map((m) => m.id),
  },
  {
    id: "pa-knowledge",
    name: "#knowledge",
    description: "Tips, tool updates, and team Q&A",
    participantIds: team.map((m) => m.id),
  },
];

const firmChannelBriefings: Record<string, BriefingMessage[]> = {
  "pa-general": [
    {
      id: "pa-gen-1",
      type: "team-update",
      senderId: "jennifer",
      timestamp: "Monday 8:02 AM",
      content:
        "Quick reminder team — the office is closed this Friday (4/10) for the spring break. If you have any client deliverables going out Thursday evening, please route them through me before 5pm so nothing slips through the cracks.",
      metadata: { teamMemberId: "jennifer" },
    },
    {
      id: "pa-gen-2",
      type: "team-update",
      senderId: "lisa",
      timestamp: "Monday 8:18 AM",
      content:
        "Got it. My Bayview Family Medicine partnership return draft will land by Thursday 3pm. Everything else on my plate is next week.",
      metadata: { teamMemberId: "lisa" },
    },
    {
      id: "pa-gen-3",
      type: "team-update",
      senderId: "anna",
      timestamp: "Monday 8:34 AM",
      content:
        "Kim's Restaurant March close is on track — Jennifer has the package in review now. No Thursday deadlines for me.",
      metadata: { teamMemberId: "anna" },
    },
    {
      id: "pa-gen-4",
      type: "team-update",
      senderId: "mike",
      timestamp: "Monday 9:12 AM",
      content:
        "Heads up — Pacific Plumbing changed their bank. I'll update the integration today, but the Thursday sync may run late. Flagging in case anyone sees missing data.",
      metadata: { teamMemberId: "mike" },
    },
  ],
  "pa-knowledge": [
    {
      id: "pa-know-1",
      type: "team-update",
      senderId: "anna",
      timestamp: "Yesterday 3:45 PM",
      content:
        "Has anyone used the new QBO bank rules engine for restaurant clients? I'm setting up one for Kim's that auto-tags supplier invoices by vendor category and I want to make sure I'm not duplicating what Lisa or Mike already built.",
      metadata: { teamMemberId: "anna" },
    },
    {
      id: "pa-know-2",
      type: "team-update",
      senderId: "mike",
      timestamp: "Yesterday 4:02 PM",
      content:
        "I did something similar for Redrock Construction last month — different industry but the rule structure is reusable. I'll share the template in Drive. You'll want to tweak the Meat/Seafood vs Produce split for restaurants.",
      metadata: { teamMemberId: "mike" },
    },
    {
      id: "pa-know-3",
      type: "ai-response",
      senderId: "ai",
      timestamp: "Yesterday 4:03 PM",
      content:
        "I can pre-populate the Kim's Restaurant rules from Mike's Redrock template if helpful. I'd change three categories: supplies → ingredients, subcontractors → servers, equipment → kitchen. Want me to stage it in QBO for Anna's review?",
    },
    {
      id: "pa-know-4",
      type: "team-update",
      senderId: "anna",
      timestamp: "Yesterday 4:18 PM",
      content:
        "Yes please! I'll review the staged rules tonight and apply them tomorrow morning.",
      metadata: { teamMemberId: "anna" },
    },
  ],
};

const dmThreads: DMThread[] = [
  { id: "pa-dm-jennifer-anna", participantIds: ["jennifer", "anna"], lastActivity: "32 min ago", unreadCount: 1 },
  { id: "pa-dm-jennifer-lisa", participantIds: ["jennifer", "lisa"], lastActivity: "2 hours ago" },
  { id: "pa-dm-jennifer-mike", participantIds: ["jennifer", "mike"], lastActivity: "Yesterday" },
];

const dmBriefings: Record<string, BriefingMessage[]> = {
  "pa-dm-jennifer-anna": [
    {
      id: "pa-dm-ja-1",
      type: "team-update",
      senderId: "anna",
      timestamp: "8:45 AM",
      content:
        "Hey — I wanted to flag something privately before I bring it up in the Kim's team channel. I think the food cost variance is going to be a recurring issue with the new supplier, not a one-off. Do you want me to pull a 6-month comparison before the weekly review?",
      metadata: { teamMemberId: "anna" },
    },
    {
      id: "pa-dm-ja-2",
      type: "user",
      senderId: "user",
      timestamp: "9:02 AM",
      content:
        "Yes absolutely. Pull the data but hold off on the conclusion until we've talked it through together. I don't want Kim to feel cornered on his supplier decision.",
    },
    {
      id: "pa-dm-ja-3",
      type: "team-update",
      senderId: "anna",
      timestamp: "9:08 AM",
      content:
        "Makes sense. I'll have the comparison ready by lunch — let me know when you want to jump on a quick call.",
      metadata: { teamMemberId: "anna" },
    },
  ],
  "pa-dm-jennifer-lisa": [
    {
      id: "pa-dm-jl-1",
      type: "team-update",
      senderId: "lisa",
      timestamp: "11:20 AM",
      content:
        "Quick question — is it OK if I block out Thursday afternoon to finish the Bayview Family Medicine partnership return? I can push the Sunset Realty review to Friday morning without any client impact.",
      metadata: { teamMemberId: "lisa" },
    },
    {
      id: "pa-dm-jl-2",
      type: "user",
      senderId: "user",
      timestamp: "11:31 AM",
      content:
        "Yes, make it happen. Dr. Chen is the more time-sensitive client right now.",
    },
  ],
  "pa-dm-jennifer-mike": [
    {
      id: "pa-dm-jm-1",
      type: "team-update",
      senderId: "mike",
      timestamp: "Yesterday 4:15 PM",
      content:
        "Hey — I noticed Redrock's job cost variance is going to spook Daniel when he sees March close. Do you want me to prep talking points before we send the package, or handle it live on the call?",
      metadata: { teamMemberId: "mike" },
    },
    {
      id: "pa-dm-jm-2",
      type: "user",
      senderId: "user",
      timestamp: "Yesterday 4:42 PM",
      content:
        "Talking points please. I want Daniel to have time to process before our call — surprise calls never land well with him.",
    },
    {
      id: "pa-dm-jm-3",
      type: "team-update",
      senderId: "mike",
      timestamp: "Yesterday 5:01 PM",
      content: "On it. Draft in your inbox tonight.",
      metadata: { teamMemberId: "mike" },
    },
  ],
};

// ---------------------------------------------------------------------------
// Global agent briefings — scripted responses rendered in the Home view's
// "Ask across your firm" panel. Each slug answers a common cross-client
// question a managing partner might open the day with.
// ---------------------------------------------------------------------------
const globalAgentBriefings: Record<string, BriefingMessage[]> = {
  "morning-briefing": [
    {
      id: "pa-ga-morning-1",
      type: "briefing",
      senderId: "ai",
      timestamp: "7:08 AM",
      content: "**Good morning, Jennifer.** Here's your firm-wide picture across all 30 active clients:",
      metadata: {
        highlights: [
          "**3 clients need you today** — Kim's Restaurant (March close), Ardmore (unreconciled Stripe item), Sterling Route Freight (QB sync error)",
          "**8 items** in Approval Queue — 2 urgent, 6 routine",
          "**AI ran overnight** — reconciled 847 transactions across 15 clients, 0 discrepancies",
          "**Team load** — Anna's at 95% capacity this week; Lisa has slack for overflow",
        ],
      },
    },
  ],
  "client-status": [
    {
      id: "pa-ga-cs-1",
      type: "ai-response",
      senderId: "ai",
      timestamp: "Just now",
      content:
        "Across your 30 active clients, the breakdown for this week:\n\n" +
        "• **9 up to date** — closed, synced, nothing pending\n" +
        "• **12 in progress** — monthly close or quarterly work running normally\n" +
        "• **5 pending review** — items waiting on your approval\n" +
        "• **3 need attention now** — Kim's Restaurant, Ardmore Analytics, Sterling Route Freight\n\n" +
        "Want me to walk through any category in detail?",
    },
  ],
  "team-workload": [
    {
      id: "pa-ga-tw-1",
      type: "ai-response",
      senderId: "ai",
      timestamp: "Just now",
      content:
        "Your team's week so far:\n\n" +
        "• **Lisa Chen** — 12 of 35 clients closed (on track, has capacity for 2 more)\n" +
        "• **Mike Rodriguez** — 9 of 30 closed (slightly behind pace)\n" +
        "• **Anna Kim** — 7 of 25 closed (at 95% load, I'd avoid new assignments)\n" +
        "• **Tom Lee** — 4 of 10 closed (admin-only this week)\n\n" +
        "Nothing raised red flags, but Anna is a good candidate for load rebalancing before Friday.",
    },
  ],
};

export const parkAccountingData: FirmData = {
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
  liveAlertsByClient: getKimsLiveAlerts(),
  firmChannels,
  firmChannelBriefings,
  dmThreads,
  dmBriefings,
  globalAgentBriefings,
  heroChannelScript: getKimsTeamChannelScript,
};
