/**
 * Database types (수동 정의).
 *
 * Prisma 설치 후에는 `@prisma/client`에서 생성된 타입을 직접 사용합니다.
 * 이 파일은 Prisma 도입 전 과도기 호환용으로 유지되며,
 * Prisma 마이그레이션 완료 후 제거 대상입니다.
 *
 * 스키마 원본: prisma/schema.prisma (CLAUDE.md 섹션 4 참조)
 */
export interface Database {
  public: {
    Tables: {
      clients: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          industry: string;
          user_role: string;
          relationship_months: number;
          preferences: Record<string, unknown> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["clients"]["Row"],
          "id" | "created_at" | "updated_at"
        >;
        Update: Partial<Database["public"]["Tables"]["clients"]["Insert"]>;
      };
      client_contexts: {
        Row: {
          id: string;
          client_id: string;
          title: string;
          content: string;
          content_embedding: number[] | null;
          category: string;
          tags: string[];
          is_pinned: boolean;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["client_contexts"]["Row"],
          "id" | "created_at" | "updated_at" | "tags" | "is_pinned"
        >;
        Update: Partial<
          Database["public"]["Tables"]["client_contexts"]["Insert"]
        >;
      };
      conversations: {
        Row: {
          id: string;
          client_id: string;
          user_id: string;
          title: string | null;
          summary: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["conversations"]["Row"],
          "id" | "created_at" | "updated_at"
        >;
        Update: Partial<
          Database["public"]["Tables"]["conversations"]["Insert"]
        >;
      };
      conversation_messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: string;
          content: string;
          attachments: Record<string, unknown>[] | null;
          tool_calls: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["conversation_messages"]["Row"],
          "id" | "created_at"
        >;
        Update: Partial<
          Database["public"]["Tables"]["conversation_messages"]["Insert"]
        >;
      };
      outputs: {
        Row: {
          id: string;
          client_id: string;
          user_id: string;
          title: string;
          format: string;
          file_path: string;
          file_size_bytes: number | null;
          version: number;
          parent_output_id: string | null;
          generated_by: string;
          generation_prompt: string | null;
          is_latest: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["outputs"]["Row"],
          "id" | "created_at" | "updated_at" | "version" | "is_latest"
        >;
        Update: Partial<Database["public"]["Tables"]["outputs"]["Insert"]>;
      };
      file_uploads: {
        Row: {
          id: string;
          client_id: string;
          user_id: string;
          original_filename: string;
          file_path: string;
          file_size_bytes: number | null;
          mime_type: string | null;
          parsing_status: string;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["file_uploads"]["Row"],
          "id" | "created_at" | "parsing_status"
        >;
        Update: Partial<
          Database["public"]["Tables"]["file_uploads"]["Insert"]
        >;
      };
    };
  };
}
