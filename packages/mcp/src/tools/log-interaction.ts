/**
 * log_interaction — Log an interaction (meeting, email, call, note) with a client.
 */

import { getClient, slugify } from "../store/client-store.js";
import { logInteraction, type LogInteractionInput } from "../store/interaction-store.js";
import type { InteractionType } from "../store/types.js";

export interface LogInteractionToolInput {
  client_name: string;
  type: string;
  summary: string;
  action_items?: string[];
  date?: string;
}

const VALID_TYPES: InteractionType[] = ["meeting", "email", "call", "note"];

export async function logInteractionTool(input: LogInteractionToolInput): Promise<string> {
  // Validate type
  const interactionType = input.type.toLowerCase() as InteractionType;
  if (!VALID_TYPES.includes(interactionType)) {
    return `Invalid interaction type: "${input.type}". Must be one of: ${VALID_TYPES.join(", ")}`;
  }

  // Find client
  const client = await getClient(input.client_name);
  if (!client) {
    return `Client not found: "${input.client_name}". Use search_clients to find the correct name.`;
  }

  const logInput: LogInteractionInput = {
    clientSlug: client.slug,
    type: interactionType,
    summary: input.summary,
    actionItems: input.action_items,
    date: input.date,
  };

  try {
    const interaction = await logInteraction(logInput);
    const lines = [
      `Interaction logged for ${client.name}.`,
      "",
      `  Type: ${interaction.type}`,
      `  Date: ${interaction.date}`,
      `  Summary: ${interaction.summary}`,
    ];
    if (interaction.actionItems.length > 0) {
      lines.push("  Action items:");
      for (const item of interaction.actionItems) {
        lines.push(`    - ${item}`);
      }
    }
    lines.push("");
    lines.push(`Logged to: ~/.practiq/interactions/${client.slug}.jsonl`);
    return lines.join("\n");
  } catch (err) {
    return `Error logging interaction: ${err instanceof Error ? err.message : String(err)}`;
  }
}
