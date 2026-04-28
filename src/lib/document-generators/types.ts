/**
 * Shared types for the document-generation layer.
 */

export interface DocumentSection {
  heading: string;
  content: string;
}

export interface GeneratorClientMeta {
  name: string;
  industry: string;
  relationshipMonths?: number;
}

export type DocumentFormat = "docx" | "xlsx" | "pdf" | "pptx";
