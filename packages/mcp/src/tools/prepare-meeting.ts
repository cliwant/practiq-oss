/**
 * prepare_meeting — Pre-meeting context bundle for a client.
 */

import { getClient } from "../store/client-store.js";
import { getInteractions } from "../store/interaction-store.js";
import { getDeadlinesForClient } from "../store/deadline-store.js";
import { formatRelative, formatDueRelative } from "../utils/date-utils.js";

export interface PrepareMeetingInput {
  client_name: string;
  meeting_purpose?: string;
}

export async function prepareMeeting(input: PrepareMeetingInput): Promise<string> {
  const client = await getClient(input.client_name);
  if (!client) {
    return `Client not found: "${input.client_name}". Use search_clients to find the correct name.`;
  }

  const interactions = await getInteractions(client.slug);
  const deadlines = await getDeadlinesForClient(client.slug);
  const activeDeadlines = deadlines.filter((d) => !d.completed);

  const sections: string[] = [];

  sections.push(`MEETING PREP: ${client.name}`);
  sections.push("=".repeat(50));
  if (input.meeting_purpose) {
    sections.push(`Purpose: ${input.meeting_purpose}`);
  }
  sections.push("");

  // Client snapshot
  sections.push("CLIENT SNAPSHOT:");
  sections.push(`  Vertical: ${client.vertical}`);
  sections.push(`  Status: ${client.status}`);
  sections.push(`  Engagement: ${client.engagement.type} since ${client.engagement.startDate}`);
  if (client.engagement.value) {
    sections.push(`  Monthly value: $${client.engagement.value.toLocaleString()}`);
  }
  if (client.engagement.scope) {
    sections.push(`  Scope: ${client.engagement.scope}`);
  }
  sections.push("");

  // Key contacts
  if (client.contacts.length > 0) {
    sections.push("KEY CONTACTS:");
    for (const c of client.contacts) {
      const primary = c.isPrimary ? " [PRIMARY]" : "";
      sections.push(`  - ${c.name}, ${c.role}${primary}`);
      if (c.email) sections.push(`    ${c.email}`);
      if (c.notes) sections.push(`    Note: ${c.notes}`);
    }
    sections.push("");
  }

  // Recent interactions (last 5)
  if (interactions.length > 0) {
    sections.push("RECENT INTERACTIONS:");
    for (const i of interactions.slice(0, 5)) {
      sections.push(`  [${i.date}] ${i.type.toUpperCase()}: ${i.summary}`);
      if (i.actionItems.length > 0) {
        sections.push("    Open items:");
        for (const item of i.actionItems) {
          sections.push(`      - ${item}`);
        }
      }
    }
    sections.push("");
  } else {
    sections.push("RECENT INTERACTIONS: None recorded");
    sections.push("");
  }

  // Open action items from all interactions
  const allActionItems: Array<{ date: string; item: string }> = [];
  for (const i of interactions) {
    for (const item of i.actionItems) {
      allActionItems.push({ date: i.date, item });
    }
  }
  if (allActionItems.length > 0) {
    sections.push("OPEN ACTION ITEMS (from previous interactions):");
    for (const a of allActionItems.slice(0, 10)) {
      sections.push(`  - [${a.date}] ${a.item}`);
    }
    sections.push("");
  }

  // Active deadlines
  if (activeDeadlines.length > 0) {
    sections.push("ACTIVE DEADLINES:");
    for (const d of activeDeadlines) {
      const status = new Date(d.dueDate).getTime() < Date.now()
        ? "OVERDUE"
        : formatDueRelative(d.dueDate);
      sections.push(`  - [${d.priority.toUpperCase()}] ${d.description} — ${status}`);
    }
    sections.push("");
  }

  // Notes
  if (client.notes) {
    sections.push("CLIENT NOTES:");
    sections.push(client.notes);
    sections.push("");
  }

  // Suggested talking points
  sections.push("SUGGESTED TALKING POINTS:");
  const talkingPoints: string[] = [];

  if (activeDeadlines.some((d) => new Date(d.dueDate).getTime() < Date.now())) {
    talkingPoints.push("Review overdue deadlines and establish new timelines");
  }
  if (activeDeadlines.length > 0) {
    talkingPoints.push("Status update on upcoming deadlines");
  }
  if (allActionItems.length > 0) {
    talkingPoints.push("Follow up on outstanding action items");
  }
  if (input.meeting_purpose) {
    talkingPoints.push(`Discuss: ${input.meeting_purpose}`);
  }
  if (!client.lastInteraction || (Date.now() - new Date(client.lastInteraction).getTime()) > 30 * 24 * 60 * 60 * 1000) {
    talkingPoints.push("General check-in — it has been a while since last contact");
  }
  talkingPoints.push("Confirm next steps and follow-up date");

  for (const tp of talkingPoints) {
    sections.push(`  - ${tp}`);
  }

  return sections.join("\n");
}
