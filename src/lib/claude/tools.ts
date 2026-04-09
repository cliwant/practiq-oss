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
