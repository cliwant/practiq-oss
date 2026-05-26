/**
 * Practiq MCP Server — tool registration and request handling.
 *
 * Registers all 10 practice management tools with the MCP server
 * and routes incoming tool calls to the appropriate handler.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { morningBriefing } from "./tools/morning-briefing.js";
import { clientContext } from "./tools/client-context.js";
import { addClientTool } from "./tools/add-client.js";
import { logInteractionTool } from "./tools/log-interaction.js";
import { weekPriorities } from "./tools/week-priorities.js";
import { prepareMeeting } from "./tools/prepare-meeting.js";
import { searchClientsTool } from "./tools/search-clients.js";
import { clientHealthTool } from "./tools/client-health.js";
import { handoffBrief } from "./tools/handoff-brief.js";
import { deadlineTracker } from "./tools/deadline-tracker.js";

export const VERSION = "0.1.0";

type ToolArgs = Record<string, unknown>;

function getString(args: ToolArgs, key: string): string {
  const v = args[key];
  if (typeof v !== "string") {
    throw new Error(`Missing required string argument: ${key}`);
  }
  return v;
}

function getOptionalString(args: ToolArgs, key: string): string | undefined {
  const v = args[key];
  if (v === undefined || v === null) return undefined;
  if (typeof v !== "string") {
    throw new Error(`${key} must be a string if provided`);
  }
  return v;
}

function getOptionalNumber(args: ToolArgs, key: string): number | undefined {
  const v = args[key];
  if (v === undefined || v === null) return undefined;
  if (typeof v !== "number") {
    throw new Error(`${key} must be a number if provided`);
  }
  return v;
}

function getStringArray(args: ToolArgs, key: string): string[] | undefined {
  const v = args[key];
  if (v === undefined || v === null) return undefined;
  if (!Array.isArray(v) || !v.every((x) => typeof x === "string")) {
    throw new Error(`${key} must be an array of strings if provided`);
  }
  return v as string[];
}

function getContactsArray(
  args: ToolArgs,
  key: string,
): Array<{
  name: string;
  role: string;
  email?: string;
  phone?: string;
  isPrimary?: boolean;
  notes?: string;
}> | undefined {
  const v = args[key];
  if (v === undefined || v === null) return undefined;
  if (!Array.isArray(v)) {
    throw new Error(`${key} must be an array if provided`);
  }
  return v as Array<{
    name: string;
    role: string;
    email?: string;
    phone?: string;
    isPrimary?: boolean;
    notes?: string;
  }>;
}

export function createServer(): Server {
  const server = new Server(
    {
      name: "practiq-mcp",
      version: VERSION,
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // -- Tool definitions --
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "morning_briefing",
        description:
          "Generate a prioritized daily briefing across all clients. Shows clients needing attention today, upcoming deadlines, stale clients, and recent interactions summary. Use this every morning to get a snapshot of your practice.",
        inputSchema: {
          type: "object" as const,
          properties: {
            vertical: {
              type: "string",
              enum: ["accounting", "law", "hr", "consulting", "agency", "other"],
              description: "Optional: filter briefing to a specific vertical",
            },
          },
        },
      },
      {
        name: "client_context",
        description:
          "Get the full context for a specific client — profile, contacts, engagement details, interaction history, deadlines, health score, and notes. Use this before any client meeting or when you need the complete picture.",
        inputSchema: {
          type: "object" as const,
          properties: {
            client_name: {
              type: "string",
              description: "Client name, slug, or ID to look up",
            },
          },
          required: ["client_name"],
        },
      },
      {
        name: "add_client",
        description:
          "Add a new client to your practice roster. Stores the client profile as a JSON file at ~/.practiq/clients/. You must specify at least a name and vertical (accounting, law, hr, consulting, agency, or other).",
        inputSchema: {
          type: "object" as const,
          properties: {
            name: { type: "string", description: "Full legal or business name of the client" },
            vertical: {
              type: "string",
              enum: ["accounting", "law", "hr", "consulting", "agency", "other"],
              description: "Industry vertical",
            },
            contacts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  role: { type: "string" },
                  email: { type: "string" },
                  phone: { type: "string" },
                  isPrimary: { type: "boolean" },
                  notes: { type: "string" },
                },
                required: ["name", "role"],
              },
              description: "Key contacts at the client",
            },
            notes: { type: "string", description: "Freeform notes about the client (markdown supported)" },
            engagement_type: { type: "string", description: "Type of engagement: retainer, project, advisory, etc." },
            start_date: { type: "string", description: "Engagement start date (YYYY-MM-DD)" },
            value: { type: "number", description: "Monthly dollar value of the engagement" },
            scope: { type: "string", description: "Brief scope description" },
            tags: { type: "string", description: "Comma-separated tags" },
            status: {
              type: "string",
              enum: ["active", "onboarding", "paused", "churned"],
              description: "Client status (default: active)",
            },
          },
          required: ["name", "vertical"],
        },
      },
      {
        name: "log_interaction",
        description:
          "Log an interaction (meeting, email, call, or note) with a client. Appends to the client's interaction log at ~/.practiq/interactions/ and updates the client's lastInteraction date.",
        inputSchema: {
          type: "object" as const,
          properties: {
            client_name: { type: "string", description: "Client name or slug" },
            type: {
              type: "string",
              enum: ["meeting", "email", "call", "note"],
              description: "Type of interaction",
            },
            summary: { type: "string", description: "What happened or what was discussed" },
            action_items: {
              type: "array",
              items: { type: "string" },
              description: "List of follow-up action items from this interaction",
            },
            date: { type: "string", description: "Date of the interaction (YYYY-MM-DD, defaults to today)" },
          },
          required: ["client_name", "type", "summary"],
        },
      },
      {
        name: "week_priorities",
        description:
          "Get a prioritized list of clients to focus on this week. Scores clients by overdue deadlines, upcoming deadlines, days since last interaction, and health indicators. Use this for weekly planning.",
        inputSchema: {
          type: "object" as const,
          properties: {},
        },
      },
      {
        name: "prepare_meeting",
        description:
          "Generate a pre-meeting context bundle for a client. Includes recent interactions, open action items, key contacts, engagement history, active deadlines, and suggested talking points.",
        inputSchema: {
          type: "object" as const,
          properties: {
            client_name: { type: "string", description: "Client name or slug" },
            meeting_purpose: { type: "string", description: "Optional: specific purpose of the meeting" },
          },
          required: ["client_name"],
        },
      },
      {
        name: "search_clients",
        description:
          "Full-text search across all client data — names, notes, contacts, tags, interactions. Returns matching clients and interactions with relevant excerpts.",
        inputSchema: {
          type: "object" as const,
          properties: {
            query: { type: "string", description: "Search query" },
          },
          required: ["query"],
        },
      },
      {
        name: "client_health",
        description:
          "Get a health score for a specific client or all clients. Scores 0-100 across four dimensions: interaction recency, deadline status, engagement depth, and risk signals. Bands: Healthy (80-100), Watch (60-79), At Risk (40-59), Critical (0-39).",
        inputSchema: {
          type: "object" as const,
          properties: {
            client_name: {
              type: "string",
              description: "Optional: specific client to check. If omitted, returns health dashboard for all clients.",
            },
          },
        },
      },
      {
        name: "handoff_brief",
        description:
          "Generate a comprehensive handoff document for transitioning a client from one team member to another. Includes full profile, contacts, interaction history, deadlines, notes, and a handoff checklist.",
        inputSchema: {
          type: "object" as const,
          properties: {
            client_name: { type: "string", description: "Client name or slug" },
            outgoing_person: { type: "string", description: "Name of the person handing off" },
            incoming_person: { type: "string", description: "Name of the person taking over" },
          },
          required: ["client_name", "outgoing_person", "incoming_person"],
        },
      },
      {
        name: "deadline_tracker",
        description:
          "Track and manage deadlines across all clients. Three actions: 'list' (view deadlines, optionally filtered by client), 'add' (create a new deadline), 'complete' (mark a deadline as done).",
        inputSchema: {
          type: "object" as const,
          properties: {
            action: {
              type: "string",
              enum: ["list", "add", "complete"],
              description: "Action to perform",
            },
            client_name: { type: "string", description: "Client name (required for 'add', optional for 'list')" },
            description: { type: "string", description: "Deadline description (required for 'add')" },
            due_date: { type: "string", description: "Due date YYYY-MM-DD (required for 'add')" },
            priority: {
              type: "string",
              enum: ["low", "medium", "high", "critical"],
              description: "Priority level (for 'add', default: medium)",
            },
            deadline_id: { type: "string", description: "Deadline ID (required for 'complete')" },
          },
          required: ["action"],
        },
      },
    ],
  }));

  // -- Tool call handler --
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;

    try {
      let result: string;

      switch (name) {
        case "morning_briefing":
          result = await morningBriefing({
            vertical: getOptionalString(args, "vertical"),
          });
          break;

        case "client_context":
          result = await clientContext({
            client_name: getString(args, "client_name"),
          });
          break;

        case "add_client":
          result = await addClientTool({
            name: getString(args, "name"),
            vertical: getString(args, "vertical"),
            contacts: getContactsArray(args, "contacts"),
            notes: getOptionalString(args, "notes"),
            engagement_type: getOptionalString(args, "engagement_type"),
            start_date: getOptionalString(args, "start_date"),
            value: getOptionalNumber(args, "value"),
            scope: getOptionalString(args, "scope"),
            tags: getOptionalString(args, "tags"),
            status: getOptionalString(args, "status"),
          });
          break;

        case "log_interaction":
          result = await logInteractionTool({
            client_name: getString(args, "client_name"),
            type: getString(args, "type"),
            summary: getString(args, "summary"),
            action_items: getStringArray(args, "action_items"),
            date: getOptionalString(args, "date"),
          });
          break;

        case "week_priorities":
          result = await weekPriorities();
          break;

        case "prepare_meeting":
          result = await prepareMeeting({
            client_name: getString(args, "client_name"),
            meeting_purpose: getOptionalString(args, "meeting_purpose"),
          });
          break;

        case "search_clients":
          result = await searchClientsTool({
            query: getString(args, "query"),
          });
          break;

        case "client_health":
          result = await clientHealthTool({
            client_name: getOptionalString(args, "client_name"),
          });
          break;

        case "handoff_brief":
          result = await handoffBrief({
            client_name: getString(args, "client_name"),
            outgoing_person: getString(args, "outgoing_person"),
            incoming_person: getString(args, "incoming_person"),
          });
          break;

        case "deadline_tracker":
          result = await deadlineTracker({
            action: getString(args, "action"),
            client_name: getOptionalString(args, "client_name"),
            description: getOptionalString(args, "description"),
            due_date: getOptionalString(args, "due_date"),
            priority: getOptionalString(args, "priority"),
            deadline_id: getOptionalString(args, "deadline_id"),
          });
          break;

        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      return {
        content: [{ type: "text", text: result }],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}
