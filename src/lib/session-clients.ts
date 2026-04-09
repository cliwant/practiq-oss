// =============================================================================
// Session store — in-memory mutations the user makes at runtime
// =============================================================================
// The mockup ships with static firm data (~30 clients per firm, their Output
// and Context items). But the user needs to be able to ADD things themselves
// to prove the CRUD flows exist:
//
//   1. Create a new client (file drop → AI extracts metadata)
//   2. Upload a document into an existing client's Output
//   3. Add a note to an existing client's Context
//
// Everything in this module is module-level state that resets on page
// refresh. No backend, no persistence. All UI components that read from
// this store subscribe via `subscribeSessionStore` so they re-render when
// anything changes (React does not see module-level mutations otherwise).
// =============================================================================

import type {
  ClientWorkspace,
  BriefingMessage,
  IntegrationStatus,
  ClientDocument,
  KnowledgeItem,
} from "@/data/mock-data";

/** What the new-client form collects from the user */
export interface NewClientSeed {
  firmId: string;
  name: string;
  industry: string;
  industryIcon: string;
  entityType: string;
  assignedTo: string;          // team member id
  contactName: string;
  contactEmail: string;
  integrationLabel: string;    // e.g. "QuickBooks", "Clio", "Figma"
  monthlyFee: string;
  // Vertical-specific workflow stage at creation (e.g. "Onboarding")
  workflowStatusLabel: string;
  /** File names dropped into the new-client modal. The AI "extracts" from
   *  these to generate session Output entries and initial Context items. */
  uploadedFileNames?: string[];
}

// ---- Module-level stores ----
const sessionClientsByFirm: Record<string, ClientWorkspace[]> = {};
/** Session-added Output documents keyed by clientId (both seeded clients
 *  and newly-created session clients can have entries here). */
const sessionOutputByClient: Record<string, ClientDocument[]> = {};
/** Session-added Context items keyed by clientId. */
const sessionContextByClient: Record<string, KnowledgeItem[]> = {};
/** File names that were dropped when the client was created — kept so the
 *  onboarding briefing can reference them by name. */
const sessionClientOnboardingFiles: Record<string, string[]> = {};

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

/** Subscribe to any session store change (clients, output, context).
 *  A single bus for all three — subscribers re-render on any mutation. */
export function subscribeSessionStore(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** @deprecated use subscribeSessionStore. Kept as an alias so existing
 *  callers (e.g. the layout) keep working during the migration. */
export const subscribeSessionClients = subscribeSessionStore;

/** Get all session clients for a given firm (empty array if none yet). */
export function getSessionClients(firmId: string): ClientWorkspace[] {
  return sessionClientsByFirm[firmId] ?? [];
}

/** Convert a seed into a full ClientWorkspace and append it to the firm's
 *  session store. Returns the generated client id so the caller can route
 *  the user into the new client's workspace. */
export function addSessionClient(seed: NewClientSeed): ClientWorkspace {
  const id = slugify(seed.name) + "-" + Math.random().toString(36).slice(2, 6);
  const shortName = seed.name
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("") || "NC";

  const color = pickAccentColor();
  const client: ClientWorkspace = {
    id,
    firmId: seed.firmId,
    name: seed.name,
    shortName,
    industry: seed.industry,
    industryIcon: seed.industryIcon,
    color,
    colorLight: color + "1A",
    entityType: seed.entityType,
    assignedTo: seed.assignedTo,
    // Generic multi-vertical fields
    integrationStatus: "synced" as IntegrationStatus,
    integrationLabel: seed.integrationLabel,
    integrationLastSync: "Just now",
    workflowStatus: "onboarding",
    workflowStatusLabel: seed.workflowStatusLabel,
    workflowStatusNote: "AI finalizing initial ingestion",
    // Accounting-specific fields kept for type-shape compatibility
    qbSync: "synced",
    qbLastSync: "Just now",
    monthlyCloseStatus: "in-progress",
    monthlyCloseNote: "New client — AI onboarding in progress",
    metrics: {
      "Engagement Stage": "Onboarding",
      "Ingested Docs": "0",
      "Team": "1 assigned",
      "Status": "Kickoff",
    },
    contact: { name: seed.contactName, email: seed.contactEmail },
    preferences: { tone: "professional", reportStyle: "firm default", frequency: "weekly" },
    monthlyFee: seed.monthlyFee,
    knowledgeCount: 0,
    documentCount: 0,
    conversationCount: 1,
  };

  const existing = sessionClientsByFirm[seed.firmId] ?? [];
  sessionClientsByFirm[seed.firmId] = [...existing, client];
  if (seed.uploadedFileNames && seed.uploadedFileNames.length > 0) {
    sessionClientOnboardingFiles[client.id] = seed.uploadedFileNames;
  }
  notify();
  return client;
}

/** File names captured at client creation time (for briefing rendering). */
export function getSessionClientOnboardingFiles(clientId: string): string[] {
  return sessionClientOnboardingFiles[clientId] ?? [];
}

/** Look up a session client across firms by id. */
export function getSessionClient(clientId: string): ClientWorkspace | undefined {
  for (const list of Object.values(sessionClientsByFirm)) {
    const hit = list.find((c) => c.id === clientId);
    if (hit) return hit;
  }
  return undefined;
}

/** Generate the scripted onboarding briefing that plays in the Agent Thread
 *  the first time the user enters the new client. Each message has a
 *  senderId so the UI can render it with the user/AI/team distinction.
 *
 *  When the client was created with uploaded files, the briefing mentions
 *  them by name and claims to have extracted Context + drafted Output from
 *  them — making the new-client flow feel like a single magical step:
 *  drop files → AI reads them → workspace ready. */
export function getSessionClientOnboardingBriefing(
  client: ClientWorkspace,
  firmName: string
): BriefingMessage[] {
  const uploadedFileNames = getSessionClientOnboardingFiles(client.id);
  const fileCount = uploadedFileNames.length;
  const fileList = uploadedFileNames.slice(0, 4).join(", ");
  const moreFiles = fileCount > 4 ? ` (+${fileCount - 4} more)` : "";
  const contextCount = getSessionContextForClient(client.id).length;
  const outputCount = getSessionOutputForClient(client.id).length;

  if (fileCount > 0) {
    return [
      {
        id: `${client.id}-onboard-1`,
        type: "briefing",
        senderId: "ai",
        timestamp: "Just now",
        content: `**Welcome to ${client.name}.** I read the ${fileCount} file${fileCount === 1 ? "" : "s"} you dropped and built the workspace from them.`,
        metadata: {
          highlights: [
            `Parsed: ${fileList}${moreFiles}`,
            `Extracted ${contextCount} Context item${contextCount === 1 ? "" : "s"} — preferences, patterns, and key history`,
            `Saved ${outputCount} Output draft${outputCount === 1 ? "" : "s"} — pending your review`,
            `Contact set to ${client.contact.name}`,
          ],
        },
      },
      {
        id: `${client.id}-onboard-2`,
        type: "ai-response",
        senderId: "ai",
        timestamp: "Just now",
        content:
          "Take a look at the Context tab to see what I learned, and the Output tab for the drafts I put together. Let me know if I got anything wrong — or tell me what to work on first.",
      },
    ];
  }

  return [
    {
      id: `${client.id}-onboard-1`,
      type: "briefing",
      senderId: "ai",
      timestamp: "Just now",
      content: `**Welcome to ${client.name}.** I've created the workspace and started initial ingestion.`,
      metadata: {
        highlights: [
          `${client.integrationLabel} connected — syncing ${client.name}'s data now`,
          `Contact: ${client.contact.name} (${client.contact.email})`,
          `Assigned to: ${client.assignedTo}`,
          `${firmName} standard onboarding checklist loaded`,
        ],
      },
    },
    {
      id: `${client.id}-onboard-2`,
      type: "ai-response",
      senderId: "ai",
      timestamp: "Just now",
      content:
        "I'll ingest the last 12 months of data over the next few minutes and surface anything that needs your attention. In the meantime, is there anything specific I should watch for on this client? Any history or context you'd like me to note before I start?",
    },
  ];
}

// ---------------------------------------------------------------------------
// Session Output (documents) — user-uploaded or AI-drafted after creation
// ---------------------------------------------------------------------------

export interface NewOutputSeed {
  clientId: string;
  title: string;
  format: ClientDocument["format"];
  /** Defaults to "uploaded" — the caller can pass "ai" or "team" when the
   *  item represents an AI draft (e.g. from new-client file analysis). */
  source?: ClientDocument["source"];
  sourceName?: string;
  status?: ClientDocument["status"];
  tags?: string[];
}

export function addSessionOutput(seed: NewOutputSeed): ClientDocument {
  const doc: ClientDocument = {
    id: `session-doc-${Math.random().toString(36).slice(2, 8)}`,
    clientId: seed.clientId,
    title: seed.title,
    format: seed.format,
    source: seed.source ?? "uploaded",
    sourceName: seed.sourceName,
    version: 1,
    status: seed.status ?? (seed.source === "ai" ? "draft" : "approved"),
    date: "Just now",
    tags: seed.tags,
  };
  const existing = sessionOutputByClient[seed.clientId] ?? [];
  sessionOutputByClient[seed.clientId] = [doc, ...existing];
  notify();
  return doc;
}

export function getSessionOutputForClient(clientId: string): ClientDocument[] {
  return sessionOutputByClient[clientId] ?? [];
}

// ---------------------------------------------------------------------------
// Session Context (knowledge items) — user notes or AI-extracted facts
// ---------------------------------------------------------------------------

export interface NewContextSeed {
  clientId: string;
  category: KnowledgeItem["category"];
  title: string;
  detail: string;
  source?: KnowledgeItem["source"];
}

export function addSessionContext(seed: NewContextSeed): KnowledgeItem {
  const item: KnowledgeItem = {
    id: `session-ctx-${Math.random().toString(36).slice(2, 8)}`,
    category: seed.category,
    title: seed.title,
    detail: seed.detail,
    lastUpdated: "Just now",
    source: seed.source ?? "team-noted",
  };
  const existing = sessionContextByClient[seed.clientId] ?? [];
  sessionContextByClient[seed.clientId] = [item, ...existing];
  notify();
  return item;
}

export function getSessionContextForClient(clientId: string): KnowledgeItem[] {
  return sessionContextByClient[clientId] ?? [];
}

// ---- utilities ----
function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

// Muted hex palette — matches the existing ClientAvatar look
const ACCENT_COLORS = [
  "#F97316", "#3B82F6", "#10B981", "#92400E", "#6366F1", "#8B5CF6",
  "#06B6D4", "#EF4444", "#EC4899", "#0EA5E9", "#15803D", "#DC2626",
  "#D97706", "#7C3AED", "#BE185D", "#059669",
];
function pickAccentColor(): string {
  return ACCENT_COLORS[Math.floor(Math.random() * ACCENT_COLORS.length)];
}
