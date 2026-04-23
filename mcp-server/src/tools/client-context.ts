/**
 * client_context — Full context dump for a specific client.
 */

import { getClient } from "../store/client-store.js";
import { getInteractions } from "../store/interaction-store.js";
import { getDeadlinesForClient } from "../store/deadline-store.js";
import { computeHealth } from "../utils/scoring.js";
import { formatRelative, formatDueRelative } from "../utils/date-utils.js";

export interface ClientContextInput {
  client_name: string;
}

export async function clientContext(input: ClientContextInput): Promise<string> {
  const client = await getClient(input.client_name);
  if (!client) {
    return `Client not found: "${input.client_name}". Use search_clients to find the correct name.`;
  }

  const interactions = await getInteractions(client.slug);
  const deadlines = await getDeadlinesForClient(client.slug);
  const health = computeHealth(client, interactions, deadlines);

  const sections: string[] = [];

  // Header
  sections.push(`CLIENT CONTEXT: ${client.name}`);
  sections.push("=".repeat(50));
  sections.push("");

  // Profile
  sections.push("PROFILE:");
  sections.push(`  ID: ${client.id}`);
  sections.push(`  Slug: ${client.slug}`);
  sections.push(`  Vertical: ${client.vertical}`);
  sections.push(`  Status: ${client.status}`);
  sections.push(`  Tags: ${client.tags.length > 0 ? client.tags.join(", ") : "none"}`);
  sections.push(`  Created: ${client.createdAt.slice(0, 10)}`);
  sections.push("");

  // Engagement
  sections.push("ENGAGEMENT:");
  sections.push(`  Type: ${client.engagement.type}`);
  sections.push(`  Start date: ${client.engagement.startDate}`);
  if (client.engagement.value) {
    sections.push(`  Monthly value: $${client.engagement.value.toLocaleString()}`);
  }
  if (client.engagement.scope) {
    sections.push(`  Scope: ${client.engagement.scope}`);
  }
  sections.push("");

  // Contacts
  if (client.contacts.length > 0) {
    sections.push("CONTACTS:");
    for (const c of client.contacts) {
      const primary = c.isPrimary ? " [PRIMARY]" : "";
      sections.push(`  - ${c.name} (${c.role})${primary}`);
      if (c.email) sections.push(`    Email: ${c.email}`);
      if (c.phone) sections.push(`    Phone: ${c.phone}`);
      if (c.notes) sections.push(`    Notes: ${c.notes}`);
    }
    sections.push("");
  }

  // Health
  sections.push("HEALTH SCORE:");
  sections.push(`  Overall: ${health.score}/100 (${health.band})`);
  sections.push(`  Interaction recency: ${health.dimensions.interactionRecency}/100`);
  sections.push(`  Deadline status: ${health.dimensions.deadlineStatus}/100`);
  sections.push(`  Engagement depth: ${health.dimensions.engagementDepth}/100`);
  sections.push(`  Risk signals: ${health.dimensions.riskSignals}/100`);
  sections.push(`  Summary: ${health.summary}`);
  sections.push("");

  // Active deadlines
  const activeDeadlines = deadlines.filter((d) => !d.completed);
  if (activeDeadlines.length > 0) {
    sections.push("ACTIVE DEADLINES:");
    for (const d of activeDeadlines) {
      const status = new Date(d.dueDate).getTime() < Date.now() ? "OVERDUE" : formatDueRelative(d.dueDate);
      sections.push(`  - [${d.priority.toUpperCase()}] ${d.description} — ${status}`);
    }
    sections.push("");
  }

  // Recent interactions
  if (interactions.length > 0) {
    sections.push(`INTERACTIONS (${interactions.length} total, showing latest 10):`);
    for (const i of interactions.slice(0, 10)) {
      sections.push(`  [${i.date}] ${i.type.toUpperCase()}: ${i.summary}`);
      if (i.actionItems.length > 0) {
        for (const item of i.actionItems) {
          sections.push(`    -> ${item}`);
        }
      }
    }
    sections.push("");
  }

  // Notes
  if (client.notes) {
    sections.push("NOTES:");
    sections.push(client.notes);
    sections.push("");
  }

  // Last interaction
  if (client.lastInteraction) {
    sections.push(`Last interaction: ${formatRelative(client.lastInteraction)}`);
  } else {
    sections.push("Last interaction: none recorded");
  }

  return sections.join("\n");
}
