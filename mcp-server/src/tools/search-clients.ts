/**
 * search_clients — Full-text search across all client data.
 */

import { searchClients } from "../store/client-store.js";
import { searchInteractions } from "../store/interaction-store.js";

export interface SearchClientsInput {
  query: string;
}

export async function searchClientsTool(input: SearchClientsInput): Promise<string> {
  if (!input.query || input.query.trim().length === 0) {
    return "Please provide a search query.";
  }

  const clientResults = await searchClients(input.query);
  const interactionResults = await searchInteractions(input.query);

  if (clientResults.length === 0 && interactionResults.length === 0) {
    return `No results found for "${input.query}".`;
  }

  const sections: string[] = [];
  sections.push(`SEARCH RESULTS FOR: "${input.query}"`);
  sections.push("=".repeat(50));
  sections.push("");

  if (clientResults.length > 0) {
    sections.push(`CLIENT MATCHES (${clientResults.length}):`);
    for (const r of clientResults.slice(0, 15)) {
      sections.push(`  ${r.client.name} (${r.client.vertical}, ${r.client.status})`);
      sections.push(`    Match: ${r.matchContext}`);
    }
    if (clientResults.length > 15) {
      sections.push(`  ... and ${clientResults.length - 15} more`);
    }
    sections.push("");
  }

  if (interactionResults.length > 0) {
    sections.push(`INTERACTION MATCHES (${interactionResults.length}):`);
    for (const r of interactionResults.slice(0, 15)) {
      sections.push(
        `  [${r.interaction.date}] ${r.interaction.clientSlug} — ${r.interaction.type}`,
      );
      sections.push(`    Match: ${r.matchContext}`);
    }
    if (interactionResults.length > 15) {
      sections.push(`  ... and ${interactionResults.length - 15} more`);
    }
    sections.push("");
  }

  sections.push(
    `Total: ${clientResults.length} client${clientResults.length !== 1 ? "s" : ""}, ` +
    `${interactionResults.length} interaction${interactionResults.length !== 1 ? "s" : ""}`,
  );

  return sections.join("\n");
}
