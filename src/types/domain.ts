/**
 * Core domain types for Fractional AI Command Center.
 *
 * DB 테이블 타입(database.ts)과 달리, 이 파일은 프론트엔드/비즈니스 로직에서
 * 사용하는 camelCase 도메인 모델을 정의합니다.
 */

// ─── Client ──────────────────────────────────────────────

export interface Client {
  id: string;
  name: string;
  industry: string;
  userRole: string; // 'CFO', 'COO', 'CMO', 'CTO'
  relationshipMonths: number;
  createdAt: string;
  preferences?: ClientPreferences;
}

export interface ClientPreferences {
  reportTone: "formal" | "casual" | "technical";
  preferredFormats: ("docx" | "xlsx" | "pptx" | "pdf")[];
  brandColor?: string;
  contactEmail?: string;
}

// ─── Client Context (Knowledge Base) ─────────────────────

export type ContextCategory =
  | "decision"
  | "document"
  | "note"
  | "meeting_summary"
  | "metric";

export interface ClientContext {
  id: string;
  clientId: string;
  title: string;
  content: string;
  category: ContextCategory;
  tags: string[];
  isPinned: boolean;
  createdAt: string;
}

// ─── Conversation ────────────────────────────────────────

export interface Conversation {
  id: string;
  clientId: string;
  title: string | null;
  summary: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  attachments?: OutputFileRef[];
  createdAt: string;
}

// ─── Output (Generated Files) ────────────────────────────

export type OutputFormat = "docx" | "xlsx" | "pptx" | "pdf" | "email";

export interface OutputFile {
  id: string;
  clientId: string;
  title: string;
  format: OutputFormat;
  filePath: string;
  fileSizeBytes: number | null;
  downloadUrl?: string;
  version: number;
  parentOutputId: string | null;
  isLatest: boolean;
  createdAt: string;
}

/** 메시지 첨부용 경량 참조 */
export interface OutputFileRef {
  outputId: string;
  title: string;
  format: OutputFormat;
}

// ─── File Upload ─────────────────────────────────────────

export type ParsingStatus = "pending" | "processing" | "completed" | "failed";

export interface FileUpload {
  id: string;
  clientId: string;
  originalFilename: string;
  filePath: string;
  fileSizeBytes: number | null;
  mimeType: string | null;
  parsingStatus: ParsingStatus;
  createdAt: string;
}
