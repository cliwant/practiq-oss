/**
 * morning_briefing — Generate a prioritized daily briefing across all clients.
 */

import { getAllClients } from "../store/client-store.js";
import { getAllInteractions } from "../store/interaction-store.js";
import {
  getOverdueDeadlines,
  getUpcomingDeadlines,
  getAllDeadlines,
} from "../store/deadline-store.js";
import { computeHealth } from "../utils/scoring.js";
import { today, formatRelative, formatDueRelative } from "../utils/date-utils.js";
import type { Vertical } from "../store/types.js";

export interface MorningBriefingInput {
  vertical?: string;
}

export async function morningBriefing(input: MorningBriefingInput): Promise<string> {
  let clients = await getAllClients();
  const verticalFilter = input.vertical as Vertical | undefined;

  if (verticalFilter) {
    clients = clients.filter((c) => c.vertical === verticalFilter);
  }

  if (clients.length === 0) {
    return "No clients found" + (verticalFilter ? ` for vertical "${verticalFilter}"` : "") +
      ". Use the add_client tool to add your first client.";
  }

  const allInteractions = await getAllInteractions();
  const allDeadlines = await getAllDeadlines();
  const overdue = await getOverdueDeadlines();
  const upcoming = await getUpcomingDeadlines(7);

  const sections: string[] = [];

  sections.push(`PRACTIQ MORNING BRIEFING — ${today()}`);
  sections.push(`${"=".repeat(50)}`);
  sections.push(
    `Practice: ${clients.length} client${clients.length === 1 ? "" : "s"}` +
    (verticalFilter ? ` (${verticalFilter})` : ""),
  );
  sections.push("");

  // OVERDUE DEADLINES
  if (overdue.length > 0) {
    sections.push("OVERDUE (requires immediate attention):");
    for (const d of overdue) {
      sections.push(`  - ${d.clientName}: ${d.description} (${formatDueRelative(d.dueDate)})`);
    }
    sections.push("");
  }

  // UPCOMING DEADLINES (next 7 days)
  if (upcoming.length > 0) {
    sections.push("THIS WEEK:");
    for (const d of upcoming) {
      sections.push(`  - ${d.clientName}: ${d.description} (${formatDueRelative(d.dueDate)})`);
    }
    sections.push("");
  }

  // STALE CLIENTS (no interaction in 30+ days)
  const staleClients = clients.filter((c) => {
    if (!c.lastInteraction) return true;
    const days = Math.floor(
      (Date.now() - new Date(c.lastInteraction).getTime()) / (1000 * 60 * 60 * 24),
    );
    return days > 30;
  });

  if (staleClients.length > 0) {
    sections.push("NEEDS ATTENTION (no contact in 30+ days):");
    for (const c of staleClients.slice(0, 10)) {
      const lastTouch = c.lastInteraction
        ? formatRelative(c.lastInteraction)
        : "never contacted";
      sections.push(`  - ${c.name} (${c.vertical}): last touch ${lastTouch}`);
    }
    if (staleClients.length > 10) {
      sections.push(`  ... and ${staleClients.length - 10} more`);
    }
    sections.push("");
  }

  // RECENT INTERACTIONS (last 3 days)
  const recentInteractions = allInteractions.filter((i) => {
    const days = Math.floor(
      (Date.now() - new Date(i.date).getTime()) / (1000 * 60 * 60 * 24),
    );
    return days <= 3;
  });

  if (recentInteractions.length > 0) {
    sections.push("RECENT ACTIVITY (last 3 days):");
    for (const i of recentInteractions.slice(0, 8)) {
      sections.push(`  - [${i.type}] ${i.clientSlug}: ${i.summary.slice(0, 80)}`);
    }
    sections.push("");
  }

  // AT-RISK CLIENTS
  const healthResults = [];
  for (const client of clients) {
    const cInteractions = allInteractions.filter((i) => i.clientSlug === client.slug);
    const cDeadlines = allDeadlines.filter((d) => d.clientSlug === client.slug);
    healthResults.push(computeHealth(client, cInteractions, cDeadlines));
  }

  const atRisk = healthResults.filter((h) => h.band === "Critical" || h.band === "At Risk");
  if (atRisk.length > 0) {
    sections.push("AT-RISK CLIENTS:");
    for (const h of atRisk) {
      sections.push(`  - ${h.clientName}: score ${h.score}/100 (${h.band}) — ${h.summary}`);
    }
    sections.push("");
  }

  // SUMMARY STATS
  const activeClients = clients.filter((c) => c.status === "active").length;
  const totalDeadlines = allDeadlines.filter((d) => !d.completed).length;
  sections.push("QUICK STATS:");
  sections.push(`  Active clients: ${activeClients}`);
  sections.push(`  Open deadlines: ${totalDeadlines}`);
  sections.push(`  Overdue: ${overdue.length}`);
  sections.push(`  Due this week: ${upcoming.length}`);
  sections.push(`  At risk: ${atRisk.length}`);

  return sections.join("\n");
}
