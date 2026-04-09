// =============================================================================
// Firm registry
// =============================================================================
// Registers every firm data bundle and exposes a lookup function. At module
// load time, it also wires itself into the firm-context so non-React callers
// (mock-data getters, demo mode, etc.) can resolve the active firm's data.
// =============================================================================

import { registerFirmResolver, getActiveFirmData } from "@/lib/firm-context";
import { getSessionClient } from "@/lib/session-clients";
import { parkAccountingData } from "./park-accounting";
import { chenMorganData } from "./chen-morgan";
import { northArcData } from "./north-arc";
import { wildcardStudioData } from "./wildcard";
import { latticePartnersData } from "./lattice";
import type { Firm, FirmData, FirmChannel, DMThread } from "./types";
import type {
  ClientWorkspace,
  ClientGroup,
  GroupBy,
  BriefingMessage,
  Channel,
  KnowledgeItem,
  LiveAlert,
  AttentionSeverity,
} from "../mock-data";
import { getMember as getParkAccountingMember } from "../mock-data";

// ---------------------------------------------------------------------------
// Registry (Phase N.4: five firms — accounting, law, consulting, agency, hr)
// ---------------------------------------------------------------------------

const firmDataById: Record<string, FirmData> = {
  [parkAccountingData.firm.id]: parkAccountingData,
  [chenMorganData.firm.id]: chenMorganData,
  [northArcData.firm.id]: northArcData,
  [wildcardStudioData.firm.id]: wildcardStudioData,
  [latticePartnersData.firm.id]: latticePartnersData,
};

/** Ordered list of firms for UI rendering (switcher tile order). */
export const firms: Firm[] = [
  parkAccountingData.firm,
  chenMorganData.firm,
  northArcData.firm,
  wildcardStudioData.firm,
  latticePartnersData.firm,
];

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

export function getFirmData(firmId: string): FirmData {
  const data = firmDataById[firmId];
  if (!data) {
    // Fall back to the first firm to keep the mockup resilient.
    return parkAccountingData;
  }
  return data;
}

export function getFirmById(firmId: string): Firm | undefined {
  return firmDataById[firmId]?.firm;
}

/** Look up a client across every registered firm (used by components that
 *  only have a clientId and need to resolve which firm owns it). */
export function getClientFromAnyFirm(clientId: string): ClientWorkspace | undefined {
  for (const data of Object.values(firmDataById)) {
    const hit = data.clients.find((c) => c.id === clientId);
    if (hit) return hit;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Active-firm resolvers (the main reading surface for UI components)
// ---------------------------------------------------------------------------
//
// These are thin wrappers around getActiveFirmData() that give components
// convenient access to firm-scoped data. Every one of them resolves via
// the firm-context module, which is kept in sync with the React state
// inside dashboard/layout.tsx.

/** Every client in the active firm. */
export function getActiveClients(): ClientWorkspace[] {
  return getActiveFirmData().clients;
}

/** A specific client from the active firm. Falls back to session-created
 *  clients if the id isn't found in the firm's static roster — this lets
 *  every consumer that calls getActiveClient(id) transparently resolve a
 *  client that was added by the new-client modal at runtime. */
export function getActiveClient(clientId: string): ClientWorkspace | undefined {
  const firm = getActiveFirmData().clients.find((c) => c.id === clientId);
  if (firm) return firm;
  return getSessionClient(clientId);
}

/** All channels defined for a client under the active firm. Falls back to
 *  a minimal default (team + private) if the firm has no explicit channels. */
export function getActiveClientChannels(clientId: string): Channel[] {
  const data = getActiveFirmData();
  const explicit = data.clientChannels[clientId];
  if (explicit && explicit.length > 0) return explicit;
  return [
    {
      id: `${clientId}-team`,
      type: "team",
      name: data.config.labels.teamWord,
      participantIds: [data.team[0]?.id ?? "jennifer"],
      lastActivity: "Today",
    },
    {
      id: `${clientId}-private`,
      type: "private",
      name: "Private with AI",
      participantIds: [data.team[0]?.id ?? "jennifer"],
      lastActivity: "Today",
    },
  ];
}

/** Look up a team member from the active firm by id. Falls back to Park
 *  Accounting's lookup (for messages that reference legacy ids). */
export function getActiveMember(id: string) {
  const data = getActiveFirmData();
  return data.team.find((m) => m.id === id) ?? getParkAccountingMember(id);
}

/** Active-firm-scoped knowledge items for a specific client. */
export function getActiveClientKnowledge(clientId: string): KnowledgeItem[] {
  return getActiveFirmData().clientKnowledgeMap[clientId] ?? [];
}

/** Active-firm-scoped live alerts for a specific client. Returns empty
 *  if the firm declares no alerts for that client. */
export function getActiveLiveAlerts(clientId: string): LiveAlert[] {
  return getActiveFirmData().liveAlertsByClient[clientId] ?? [];
}

/** Priority/Team/Industry grouping computed against the active firm's
 *  clients. Every firm gets grouping for free without defining its own. */
export function getActiveClientGroups(groupBy: GroupBy): ClientGroup[] {
  const data = getActiveFirmData();
  const { clients: firmClients, attentionItems, approvalQueue } = data;

  if (groupBy === "priority") {
    const critical: string[] = [];
    const needsReview: string[] = [];
    const inProgress: string[] = [];
    const upToDate: string[] = [];

    firmClients.forEach((c) => {
      const hasAlert = attentionItems.some((a) => a.clientId === c.id);
      const hasPendingApproval = approvalQueue.some((a) => a.clientId === c.id && a.status === "pending");
      const integrationBroken = (c.integrationStatus ?? c.qbSync) === "error";
      const workflowBlocked = (c.workflowStatus ?? c.monthlyCloseStatus) === "blocked";
      const workflowActive = ["in-progress", "ready", "discovery", "review", "drafting", "building", "implementation", "board-prep"].includes(c.workflowStatus ?? c.monthlyCloseStatus);

      if (integrationBroken || workflowBlocked) {
        critical.push(c.id);
      } else if (hasAlert || hasPendingApproval) {
        needsReview.push(c.id);
      } else if (workflowActive) {
        inProgress.push(c.id);
      } else {
        upToDate.push(c.id);
      }
    });

    return [
      { id: "critical", label: "Needs you now", clientIds: critical },
      { id: "review", label: "Pending review", clientIds: needsReview },
      { id: "progress", label: "In progress", clientIds: inProgress },
      { id: "ok", label: "Up to date", clientIds: upToDate },
    ].filter((g) => g.clientIds.length > 0);
  }

  if (groupBy === "team") {
    const byMember: Record<string, string[]> = {};
    firmClients.forEach((c) => {
      if (!byMember[c.assignedTo]) byMember[c.assignedTo] = [];
      byMember[c.assignedTo].push(c.id);
    });
    return Object.entries(byMember).map(([memberId, clientIds]) => ({
      id: memberId,
      label: data.team.find((m) => m.id === memberId)?.name.split(" ")[0] ?? memberId,
      clientIds,
    }));
  }

  if (groupBy === "industry") {
    const byIndustry: Record<string, string[]> = {};
    firmClients.forEach((c) => {
      if (!byIndustry[c.industry]) byIndustry[c.industry] = [];
      byIndustry[c.industry].push(c.id);
    });
    return Object.entries(byIndustry).map(([industry, clientIds]) => ({
      id: industry,
      label: industry,
      clientIds,
    }));
  }

  // "status" — group by workflowStatus (fallback to monthlyCloseStatus)
  const byStatus: Record<string, string[]> = {};
  firmClients.forEach((c) => {
    const key = c.workflowStatus ?? c.monthlyCloseStatus;
    if (!byStatus[key]) byStatus[key] = [];
    byStatus[key].push(c.id);
  });
  return Object.entries(byStatus).map(([status, clientIds]) => ({
    id: status,
    label: status,
    clientIds,
  }));
}

/** Build a briefing (thread of BriefingMessages) for a client under the
 *  active firm. Replaces the old getClientBriefing from mock-data. */
export function getActiveClientBriefing(clientId: string, channelId?: string): BriefingMessage[] {
  const data = getActiveFirmData();
  const client = data.clients.find((c) => c.id === clientId);
  if (!client) return [];

  // Private channel — candid 1:1
  if (channelId?.includes("private")) {
    return [
      {
        id: `priv-${clientId}-empty`,
        type: "briefing",
        timestamp: "Just now",
        content: `This is your **private channel** with FractionalOS for ${client.name}. Nothing here is shared with the team. Use it for strategy, candid notes, or sensitive questions.`,
      },
    ];
  }

  // Topic channel — focused thread (fallback: team handoffs only)
  if (channelId?.includes("topic") || channelId?.includes("close") || channelId?.includes("board") || channelId?.includes("discovery") || channelId?.includes("closing")) {
    const handoffs = data.teamHandoffs[clientId] || [];
    return [
      {
        id: `topic-${channelId}-intro`,
        type: "briefing",
        timestamp: "Earlier this week",
        content: `**${data.config.labels.primaryOutputLabel} — ${client.name}**\n\nFocused thread for this deliverable.`,
      },
      ...handoffs,
    ];
  }

  // Hero client team channel — use the firm's scripted conversation
  if (clientId === data.firm.heroClientId) {
    return data.heroChannelScript();
  }

  // Default team channel — stitched briefing from firm data
  const clientAttention = data.attentionItems.filter((a) => a.clientId === clientId);
  const clientApprovals = data.approvalQueue.filter((a) => a.clientId === clientId && a.status === "pending");
  const clientActivities = data.clientAIActivities.filter((a) => a.clientId === clientId);

  const messages: BriefingMessage[] = [];

  // 1. Welcome briefing
  const integrationLabel = client.integrationLabel ?? "Integration";
  const integrationStatus = client.integrationStatus ?? client.qbSync;
  const workflowLabel = client.workflowStatusLabel ?? client.monthlyCloseStatus;
  messages.push({
    id: `brief-${clientId}-welcome`,
    type: "briefing",
    timestamp: "Just now",
    content: `Welcome back to **${client.name}**. Here's what's happened since your last visit:`,
    metadata: {
      clientId,
      lastVisit: "3 hours ago",
      changesCount: clientActivities.length,
      highlights: [
        integrationStatus === "synced"
          ? `${integrationLabel} synced ${(client.integrationLastSync ?? client.qbLastSync)?.toLowerCase() ?? "recently"}`
          : integrationStatus === "error"
            ? `${integrationLabel} sync failed — needs reconnection`
            : `${integrationLabel} data is stale`,
        `${data.config.labels.workflowWord}: **${workflowLabel}**${client.workflowStatusNote ? ` — ${client.workflowStatusNote}` : ""}`,
        `${clientActivities.length} AI actions taken since last visit`,
        clientApprovals.length > 0 ? `${clientApprovals.length} item(s) waiting for your approval` : "No pending approvals",
      ],
    },
  });

  // 2. Team handoffs
  const handoffs = data.teamHandoffs[clientId] || [];
  handoffs.forEach((h) => messages.push(h));

  // 3. Anomaly alerts
  clientAttention.forEach((item) => {
    messages.push({
      id: `brief-${clientId}-att-${item.id}`,
      type: "anomaly-alert",
      timestamp: item.detectedAt,
      content: `**${item.title}**\n\n${item.description}`,
      metadata: {
        clientId,
        severity: item.severity as AttentionSeverity,
        aiConfidence: item.aiConfidence,
        actionButtons: [
          { label: "Investigate", variant: "primary" },
          { label: "Dismiss", variant: "secondary" },
        ],
      },
    });
  });

  // 4. Approval requests
  clientApprovals.forEach((item) => {
    messages.push({
      id: `brief-${clientId}-aq-${item.id}`,
      type: "approval-request",
      timestamp: item.createdAt,
      content: `I've prepared **${item.title}** for your review.`,
      metadata: {
        clientId,
        aiConfidence: item.aiConfidence,
        documentTitle: item.title,
        documentFormat: item.format,
        highlights: item.highlights,
        actionButtons: [
          { label: "Approve", variant: "primary" },
          { label: "Request Changes", variant: "secondary" },
          { label: "Preview", variant: "secondary" },
        ],
      },
    });
  });

  // 5. Team updates
  const teamActivities = data.activityFeed.filter((a) => a.clientId === clientId);
  teamActivities.forEach((act) => {
    const member = data.team.find((m) => m.id === act.memberId);
    messages.push({
      id: `brief-${clientId}-team-${act.id}`,
      type: "team-update",
      timestamp: act.timeAgo,
      content: `**${member?.name ?? act.memberId}** ${act.action} ${act.target}`,
      metadata: { teamMemberId: act.memberId },
    });
  });

  return messages;
}

// ---------------------------------------------------------------------------
// Scope-aware collaboration helpers (firm-wide channels, DMs, global agent)
// ---------------------------------------------------------------------------

/**
 * Firm-wide channels for the active firm (e.g. #general, #knowledge).
 * Returns an empty array when the firm bundle doesn't define any yet.
 */
export function getActiveFirmChannels(): FirmChannel[] {
  return getActiveFirmData().firmChannels ?? [];
}

/**
 * 1:1 DM threads for the active firm. Returns an empty array when the firm
 * bundle doesn't define any yet.
 */
export function getActiveDMThreads(): DMThread[] {
  return getActiveFirmData().dmThreads ?? [];
}

/**
 * Scripted message list for a firm-wide channel. Returns [] if the channel
 * id isn't in the firm's scripted content yet.
 */
export function getActiveFirmChannelBriefing(channelId: string): BriefingMessage[] {
  return getActiveFirmData().firmChannelBriefings?.[channelId] ?? [];
}

/**
 * Scripted message list for a specific DM thread. Returns [] if the thread
 * id isn't in the firm's scripted content yet.
 */
export function getActiveDMBriefing(threadId: string): BriefingMessage[] {
  return getActiveFirmData().dmBriefings?.[threadId] ?? [];
}

/**
 * Scripted response for the global agent chat. Without a slug, returns the
 * default "morning-briefing" opening. With a slug, returns the matching
 * canned response or an empty stub.
 */
export function getActiveGlobalAgentBriefing(slug: string = "morning-briefing"): BriefingMessage[] {
  const bundle = getActiveFirmData().globalAgentBriefings;
  if (!bundle) return [];
  return bundle[slug] ?? bundle["morning-briefing"] ?? [];
}

/**
 * Unified briefing dispatcher. Views can call this once with the desired
 * scope and the appropriate channel/client/dm id without caring which
 * concrete helper applies. Keeps the agent-thread view trivially
 * reusable across all four scopes.
 */
export type BriefingScope =
  | { kind: "client"; clientId: string; channelId?: string }
  | { kind: "firm"; channelId: string }
  | { kind: "dm"; threadId: string }
  | { kind: "global-agent"; slug?: string };

export function getBriefing(scope: BriefingScope): BriefingMessage[] {
  switch (scope.kind) {
    case "client":
      return getActiveClientBriefing(scope.clientId, scope.channelId);
    case "firm":
      return getActiveFirmChannelBriefing(scope.channelId);
    case "dm":
      return getActiveDMBriefing(scope.threadId);
    case "global-agent":
      return getActiveGlobalAgentBriefing(scope.slug);
  }
}

// ---------------------------------------------------------------------------
// Wire the resolver for non-React callers
// ---------------------------------------------------------------------------

registerFirmResolver(getFirmData);
