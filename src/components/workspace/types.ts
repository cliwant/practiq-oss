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
