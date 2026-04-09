// =============================================================================
// Firm types — the container for a multi-vertical workspace mockup
// =============================================================================
// Each Firm owns its own team, clients, briefings, documents, integrations, etc.
// The UI reads from the "active firm" via the firm-context module. This file
// defines the shape; concrete Firm instances live in `src/data/firms/*.ts`.
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
  LiveAlert,
} from "../mock-data";

// ---------------------------------------------------------------------------
// Vertical enum + config
// ---------------------------------------------------------------------------

export type FirmVertical =
  | "accounting"
  | "law"
  | "consulting"
  | "agency"
  | "hr";

export interface FirmLabels {
  /** "Client" | "Matter" | "Engagement" | "Account" */
  clientWord: string;
  /** "Clients" | "Matters" | "Engagements" | "Accounts" */
  clientWordPlural: string;
  /** "Team" | "Case team" | "Engagement team" | "Account team" */
  teamWord: string;
  /** "Monthly close" | "Matter phase" | "Engagement phase" | "Campaign phase" | "Engagement stage" */
  workflowWord: string;
  /** "Financial statement" | "Legal memo" | "Board deck" | "Campaign brief" | "Comp memo" */
  primaryOutputLabel: string;
}

export interface FirmIntegration {
  name: string;
  subtitle: string;
  synced: boolean;
}

export interface VerticalConfig {
  vertical: FirmVertical;
  labels: FirmLabels;
  /** Shown in Knowledge Base view */
  integrations: FirmIntegration[];
  /** What metric keys to feature first in client context panel */
  featuredMetricKeys: string[];
}

// ---------------------------------------------------------------------------
// Firm metadata
// ---------------------------------------------------------------------------

export interface Firm {
  id: string;                  // "park-accounting"
  name: string;                // "Park Accounting Group"
  shortName: string;           // "PA"
  /** Logo/brand color — used in firm switcher tile */
  logoColor: string;
  vertical: FirmVertical;
  /** Shown under the firm name in the switcher tooltip */
  tagline: string;
  /** The client id to land on when the user enters this firm */
  heroClientId: string;
  /** Total client count (may be larger than the mock data list — for "30 of 120" type footers) */
  totalClientCount: number;
}

// ---------------------------------------------------------------------------
// Firm-wide collaboration — channels and DMs not tied to any single client
// ---------------------------------------------------------------------------

/**
 * A firm-wide channel, not tied to any client. Used for #general,
 * #knowledge, and similar team-wide threads. Rendered by the Team view.
 */
export interface FirmChannel {
  id: string;
  name: string;           // "#general", "#knowledge", "#announcements"
  description?: string;
  participantIds: string[]; // usually everyone on the team
}

/**
 * A 1:1 direct message thread between two team members. Key format is
 * `dm:<sortedMemberA>:<sortedMemberB>` so lookup is order-independent.
 */
export interface DMThread {
  id: string;
  participantIds: [string, string]; // exactly two members
  lastActivity?: string;
  unreadCount?: number;
}

// ---------------------------------------------------------------------------
// FirmData bundle — all the content a firm owns
// ---------------------------------------------------------------------------

export interface FirmData {
  firm: Firm;
  config: VerticalConfig;
  team: TeamMember[];
  clients: ClientWorkspace[];
  attentionItems: AttentionItem[];
  approvalQueue: ApprovalQueueItem[];
  aiTasks: AITask[];
  completedToday: CompletedItem[];
  weeklyOverview: WeeklyOverview;
  clientDocuments: ClientDocument[];
  clientAIActivities: ClientAIActivity[];
  teamHandoffs: Record<string, BriefingMessage[]>;
  clientKnowledgeMap: Record<string, KnowledgeItem[]>;
  clientChannels: Record<string, Channel[]>;
  upcomingEvents: UpcomingEvent[];
  activityFeed: ActivityItem[];
  liveActivityTicks: ActivityTick[];
  liveAlertsByClient: Record<string, LiveAlert[]>;

  /** Firm-wide channels (#general, #knowledge, etc.). Optional to keep
   *  existing firm bundles loadable before O.4 populates them. */
  firmChannels?: FirmChannel[];
  /** Scripted message lists keyed by FirmChannel.id */
  firmChannelBriefings?: Record<string, BriefingMessage[]>;
  /** 1:1 DM threads keyed by DMThread.id */
  dmThreads?: DMThread[];
  /** Scripted message lists keyed by DMThread.id */
  dmBriefings?: Record<string, BriefingMessage[]>;
  /** Scripted responses the global agent chat uses as opening briefings
   *  or canned answers to common cross-client questions. Keyed by a short
   *  slug like "morning-briefing" or "week-overview". */
  globalAgentBriefings?: Record<string, BriefingMessage[]>;

  /**
   * The hero scripted conversation for this firm's team channel.
   * Returns a tailored BriefingMessage[] that will play when the user
   * lands on `firm.heroClientId`'s team channel. Other clients use the
   * default stitched briefing built from attentionItems/approvalQueue/etc.
   */
  heroChannelScript: () => BriefingMessage[];
}
