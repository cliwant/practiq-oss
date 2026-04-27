/**
 * Serialized shapes that cross the server-client boundary inside the
 * client workspace. Prisma types include Date objects which can't be
 * serialized directly into client components; all timestamps are strings.
 */

export interface ClientDossier {
  id: string;
  name: string;
  industry: string;
  userRole: string;
  relationshipMonths: number;
  brandColor: string;
  reportTone: string;
  preferredFormats: string[];
  contactEmail: string | null;
  updatedAt: string;
}

export type ContextCategory =
  | "decision"
  | "document"
  | "note"
  | "meeting_summary"
  | "metric";

export const CATEGORY_LABELS: Record<ContextCategory, string> = {
  decision: "Decision",
  document: "Document",
  note: "Note",
  meeting_summary: "Meeting",
  metric: "Metric",
};

export const CATEGORY_COLORS: Record<ContextCategory, string> = {
  decision: "#a855f7", // violet
  document: "#22d3ee", // cyan
  note: "#a1a1aa", // zinc
  meeting_summary: "#fbbf24", // amber
  metric: "#10b981", // emerald
};

export interface ContextItem {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  isPinned: boolean;
  updatedAt: string;
}

export interface ChatMessageItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface ConversationDossier {
  id: string;
  title: string;
  messages: ChatMessageItem[];
}

/** Pending approval item rendered on the client Overview ("AI priorities"). */
export interface ClientPriorityItem {
  id: string;
  type: string;
  title: string;
  priority: number;
  aiConfidence: number | null;
  aiNotes: string | null;
  createdAt: string;
}

/**
 * One row on the Recent AI Activity timeline. Sourced from a union of
 * AgentTask + ApprovalItem rows so the operator sees both autonomous
 * runs (briefings, scans) and operator decisions (approvals, rejections)
 * interleaved by time.
 */
export interface ActivityEvent {
  id: string;
  /** "task_run" = an agent execution; "approval" = a queue decision. */
  kind: "task_run" | "approval";
  /** Short description shown on the row. */
  label: string;
  /** Optional detail line (one-liner explaining the event). */
  detail: string | null;
  /** Status when relevant (e.g. "completed" / "approved" / "rejected"). */
  status: string | null;
  /** Confidence score [0,1] when the source row carried one. */
  confidence: number | null;
  /** ISO timestamp the event happened at. */
  occurredAt: string;
}
