/**
 * handoff_brief — Generate a handoff document for transitioning a client.
 */

import { getClient } from "../store/client-store.js";
import { getInteractions } from "../store/interaction-store.js";
import { getDeadlinesForClient } from "../store/deadline-store.js";
import { computeHealth } from "../utils/scoring.js";
import { today, formatRelative } from "../utils/date-utils.js";

export interface HandoffBriefInput {
  client_name: string;
  outgoing_person: string;
  incoming_person: string;
}

export async function handoffBrief(input: HandoffBriefInput): Promise<string> {
  const client = await getClient(input.client_name);
  if (!client) {
    return `Client not found: "${input.client_name}". Use search_clients to find the correct name.`;
  }

  const interactions = await getInteractions(client.slug);
  const deadlines = await getDeadlinesForClient(client.slug);
  const health = computeHealth(client, interactions, deadlines);
  const activeDeadlines = deadlines.filter((d) => !d.completed);

  const sections: string[] = [];

  sections.push("CLIENT HANDOFF BRIEF");
  sections.push("=".repeat(50));
  sections.push(`Client: ${client.name}`);
  sections.push(`Date: ${today()}`);
  sections.push(`Outgoing: ${input.outgoing_person}`);
  sections.push(`Incoming: ${input.incoming_person}`);
  sections.push("");

  // 1. Client overview
  sections.push("1. CLIENT OVERVIEW");
  sections.push("-".repeat(30));
  sections.push(`  Name: ${client.name}`);
  sections.push(`  Vertical: ${client.vertical}`);
  sections.push(`  Status: ${client.status}`);
  sections.push(`  Engagement: ${client.engagement.type} since ${client.engagement.startDate}`);
  if (client.engagement.value) {
    sections.push(`  Monthly value: $${client.engagement.value.toLocaleString()}`);
  }
  if (client.engagement.scope) {
    sections.push(`  Scope: ${client.engagement.scope}`);
  }
  sections.push(`  Health: ${health.score}/100 (${health.band})`);
  sections.push(`  Tags: ${client.tags.length > 0 ? client.tags.join(", ") : "none"}`);
  sections.push("");

  // 2. Key contacts
  sections.push("2. KEY CONTACTS");
  sections.push("-".repeat(30));
  if (client.contacts.length > 0) {
    for (const c of client.contacts) {
      const primary = c.isPrimary ? " [PRIMARY]" : "";
      sections.push(`  ${c.name} — ${c.role}${primary}`);
      if (c.email) sections.push(`    Email: ${c.email}`);
      if (c.phone) sections.push(`    Phone: ${c.phone}`);
      if (c.notes) sections.push(`    Relationship notes: ${c.notes}`);
    }
  } else {
    sections.push("  No contacts recorded.");
  }
  sections.push("");

  // 3. Active deadlines & open items
  sections.push("3. ACTIVE DEADLINES & OPEN ITEMS");
  sections.push("-".repeat(30));
  if (activeDeadlines.length > 0) {
    for (const d of activeDeadlines) {
      const overdue = new Date(d.dueDate).getTime() < Date.now() ? " [OVERDUE]" : "";
      sections.push(`  [${d.priority.toUpperCase()}] ${d.description} — due ${d.dueDate}${overdue}`);
    }
  } else {
    sections.push("  No active deadlines.");
  }
  sections.push("");

  // 4. Full interaction history
  sections.push(`4. INTERACTION HISTORY (${interactions.length} total)`);
  sections.push("-".repeat(30));
  if (interactions.length > 0) {
    for (const i of interactions) {
      sections.push(`  [${i.date}] ${i.type.toUpperCase()}`);
      sections.push(`    ${i.summary}`);
      if (i.actionItems.length > 0) {
        for (const item of i.actionItems) {
          sections.push(`    -> ${item}`);
        }
      }
    }
  } else {
    sections.push("  No interactions recorded.");
  }
  sections.push("");

  // 5. Client notes
  sections.push("5. CLIENT NOTES");
  sections.push("-".repeat(30));
  if (client.notes) {
    sections.push(client.notes);
  } else {
    sections.push("  No notes recorded.");
  }
  sections.push("");

  // 6. Handoff checklist
  sections.push("6. HANDOFF CHECKLIST");
  sections.push("-".repeat(30));
  sections.push(`  [ ] ${input.incoming_person} has reviewed this brief`);
  sections.push(`  [ ] Introduction email sent to client contacts`);
  sections.push(`  [ ] Access to client files/systems transferred`);
  sections.push(`  [ ] Active deadlines confirmed and assigned`);
  sections.push(`  [ ] Open action items reviewed`);
  sections.push(`  [ ] First touch scheduled with client`);
  if (health.band === "At Risk" || health.band === "Critical") {
    sections.push(`  [ ] PRIORITY: Address health concerns (currently ${health.band})`);
  }

  return sections.join("\n");
}
