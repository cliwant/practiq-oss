import type Anthropic from "@anthropic-ai/sdk";

/**
 * Tool definitions for Claude's function calling.
 * These tools allow the AI to generate documents, search knowledge bases,
 * and interact with external services on behalf of the user.
 */
export const tools: Anthropic.Tool[] = [
  {
    name: "generate_document",
    description:
      "Generate a document in specified format for the current client",
    input_schema: {
      type: "object" as const,
      properties: {
        format: {
          type: "string",
          enum: ["docx", "xlsx", "pptx", "pdf"],
          description: "Document format to generate",
        },
        title: {
          type: "string",
          description: "Document title",
        },
        sections: {
          type: "array",
          items: {
            type: "object",
            properties: {
              heading: { type: "string" },
              content: { type: "string" },
            },
            required: ["heading", "content"],
          },
          description: "Document sections",
        },
      },
      required: ["format", "title", "sections"],
    },
  },
  {
    name: "search_knowledge_base",
    description:
      "Search the current client's knowledge base for relevant information",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Search query",
        },
        limit: {
          type: "number",
          description: "Maximum number of results",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "recall_archival",
    description:
      "Page deeper into the operator's archive for this client. Use when the conversation references something not in the preloaded context — past beliefs, archived discussions, time-scoped facts. Returns hybrid keyword+semantic hits over the knowledge base plus temporal facts whose validity window intersects the requested period.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Natural-language query to look up.",
        },
        period_from: {
          type: "string",
          description:
            "Optional ISO 8601 lower bound for temporal-fact filtering (e.g. '2026-01-01'). Omit for 'since the beginning of time'.",
        },
        period_to: {
          type: "string",
          description:
            "Optional ISO 8601 upper bound for temporal-fact filtering. Omit for 'up to now'. Both bounds work in pair: missing one is fine, both is fine.",
        },
        limit: {
          type: "number",
          description: "Total result cap across both sources. Default 5, max 20.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "draft_email",
    description: "Create an email draft for the current client",
    input_schema: {
      type: "object" as const,
      properties: {
        to: { type: "string", description: "Recipient email" },
        subject: { type: "string", description: "Email subject" },
        body: { type: "string", description: "Email body (plain text)" },
        attachments: {
          type: "array",
          items: { type: "string" },
          description: "File IDs to attach",
        },
      },
      required: ["to", "subject", "body"],
    },
  },
];
