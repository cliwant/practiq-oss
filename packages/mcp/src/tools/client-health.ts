/**
 * client_health — Health score for a specific client or all clients.
 */

import { getAllClients, getClient } from "../store/client-store.js";
import { getInteractions, getAllInteractions } from "../store/interaction-store.js";
import { getDeadlinesForClient, getAllDeadlines } from "../store/deadline-store.js";
import { computeHealth } from "../utils/scoring.js";

export interface ClientHealthInput {
  client_name?: string;
}

export async function clientHealthTool(input: ClientHealthInput): Promise<string> {
  // Single client mode
  if (input.client_name) {
    const client = await getClient(input.client_name);
    if (!client) {
      return `Client not found: "${input.client_name}". Use search_clients to find the correct name.`;
    }

    const interactions = await getInteractions(client.slug);
    const deadlines = await getDeadlinesForClient(client.slug);
    const health = computeHealth(client, interactions, deadlines);

    const sections: string[] = [];
    sections.push(`HEALTH REPORT: ${client.name}`);
    sections.push("=".repeat(50));
    sections.push("");
    sections.push(`Overall Score: ${health.score}/100 (${health.band})`);
    sections.push("");
    sections.push("DIMENSIONS:");
    sections.push(`  Interaction Recency: ${health.dimensions.interactionRecency}/100`);
    sections.push(`    How recently was the last interaction?`);
    sections.push(`  Deadline Status:     ${health.dimensions.deadlineStatus}/100`);
    sections.push(`    Are deadlines on track?`);
    sections.push(`  Engagement Depth:    ${health.dimensions.engagementDepth}/100`);
    sections.push(`    How many interactions total?`);
    sections.push(`  Risk Signals:        ${health.dimensions.riskSignals}/100`);
    sections.push(`    Any negative indicators in notes?`);
    sections.push("");
    sections.push(`ASSESSMENT: ${health.summary}`);
    sections.push("");
    sections.push("SCORING WEIGHTS: Recency 30%, Deadlines 30%, Risk 25%, Depth 15%");

    return sections.join("\n");
  }

  // All clients mode
  const clients = await getAllClients();
  if (clients.length === 0) {
    return "No clients found. Use the add_client tool to add your first client.";
  }

  const allInteractions = await getAllInteractions();
  const allDeadlines = await getAllDeadlines();

  const results = clients.map((client) => {
    const cInteractions = allInteractions.filter((i) => i.clientSlug === client.slug);
    const cDeadlines = allDeadlines.filter((d) => d.clientSlug === client.slug);
    return computeHealth(client, cInteractions, cDeadlines);
  });

  // Sort: worst health first
  results.sort((a, b) => a.score - b.score);

  const byBand = {
    Critical: results.filter((r) => r.band === "Critical"),
    "At Risk": results.filter((r) => r.band === "At Risk"),
    Watch: results.filter((r) => r.band === "Watch"),
    Healthy: results.filter((r) => r.band === "Healthy"),
  };

  const sections: string[] = [];
  sections.push("PRACTICE HEALTH DASHBOARD");
  sections.push("=".repeat(50));
  sections.push("");
  sections.push(
    `${clients.length} clients | ` +
    `${byBand.Healthy.length} Healthy | ` +
    `${byBand.Watch.length} Watch | ` +
    `${byBand["At Risk"].length} At Risk | ` +
    `${byBand.Critical.length} Critical`,
  );
  sections.push("");

  if (byBand.Critical.length > 0) {
    sections.push("CRITICAL:");
    for (const r of byBand.Critical) {
      sections.push(`  ${r.clientName}: ${r.score}/100 — ${r.summary}`);
    }
    sections.push("");
  }

  if (byBand["At Risk"].length > 0) {
    sections.push("AT RISK:");
    for (const r of byBand["At Risk"]) {
      sections.push(`  ${r.clientName}: ${r.score}/100 — ${r.summary}`);
    }
    sections.push("");
  }

  if (byBand.Watch.length > 0) {
    sections.push("WATCH:");
    for (const r of byBand.Watch) {
      sections.push(`  ${r.clientName}: ${r.score}/100`);
    }
    sections.push("");
  }

  if (byBand.Healthy.length > 0) {
    sections.push(`HEALTHY (${byBand.Healthy.length} clients):`);
    for (const r of byBand.Healthy.slice(0, 10)) {
      sections.push(`  ${r.clientName}: ${r.score}/100`);
    }
    if (byBand.Healthy.length > 10) {
      sections.push(`  ... and ${byBand.Healthy.length - 10} more`);
    }
    sections.push("");
  }

  const avgScore = Math.round(
    results.reduce((sum, r) => sum + r.score, 0) / results.length,
  );
  sections.push(`Practice average health: ${avgScore}/100`);

  return sections.join("\n");
}
