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
    name: "read_document",
    description:
      "Read the full text of a user-uploaded document, with [Page N] markers around each page. Use when the operator references a specific document and you need to ground a claim in its actual contents. Optionally constrain to a page range to keep tokens tight.",
    input_schema: {
      type: "object" as const,
      properties: {
        doc_id: {
          type: "string",
          description: "FileUpload id of the document to read.",
        },
        page_from: {
          type: "number",
          description:
            "Optional 1-based first page to include (inclusive). Omit for page 1.",
        },
        page_to: {
          type: "number",
          description:
            "Optional 1-based last page to include (inclusive). Omit for the final page.",
        },
      },
      required: ["doc_id"],
    },
  },
  {
    name: "find_in_document",
    description:
      "Search a user-uploaded document for passages matching a query and return each hit with ~100 chars of surrounding context plus the page it came from. Prefer this over read_document when the doc is long and you only need a specific clause or term.",
    input_schema: {
      type: "object" as const,
      properties: {
        doc_id: {
          type: "string",
          description: "FileUpload id of the document to search.",
        },
        query: {
          type: "string",
          description: "Substring to search for (case-insensitive).",
        },
        max_results: {
          type: "number",
          description: "Maximum hits to return. Default 5, hard cap 20.",
        },
      },
      required: ["doc_id", "query"],
    },
  },
  {
    name: "edit_document",
    description:
      "Produce a redlined .docx with Word tracked changes (<w:ins>/<w:del>) applied to a user-uploaded document. Provide an array of precise find/replace edits, each with surrounding context to disambiguate the location, plus a plain-English reason. Returns an ApprovalItem id for the operator to review and download. Use when the operator asks for revisions to a specific document — never silently rewrite without going through this tool.",
    input_schema: {
      type: "object" as const,
      properties: {
        doc_id: {
          type: "string",
          description: "FileUpload id of the source .docx to edit.",
        },
        edits: {
          type: "array",
          items: {
            type: "object",
            properties: {
              find: {
                type: "string",
                description: "Exact text to remove (will be wrapped in <w:del>).",
              },
              replace: {
                type: "string",
                description:
                  "Replacement text (will be inserted as <w:ins>). Empty string means a pure deletion.",
              },
              context_before: {
                type: "string",
                description:
                  "~30 chars of text immediately before the match, used to disambiguate when 'find' appears multiple times.",
              },
              context_after: {
                type: "string",
                description: "~30 chars of text immediately after the match.",
              },
              reason: {
                type: "string",
                description:
                  "Plain-English explanation the operator will see in the side-by-side review card.",
              },
            },
            required: ["find", "replace", "reason"],
          },
          description: "Ordered list of edits to apply.",
        },
        title: {
          type: "string",
          description:
            "Title for the resulting redlined document (shown in Approval Queue).",
        },
      },
      required: ["doc_id", "edits", "title"],
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
