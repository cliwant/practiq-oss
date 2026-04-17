/**
 * week_priorities — Prioritized client list for the week.
 */

import { getAllClients } from "../store/client-store.js";
import { getAllInteractions } from "../store/interaction-store.js";
import { getAllDeadlines, getActiveDeadlines } from "../store/deadline-store.js";
import { computeHealth } from "../utils/scoring.js";
import {
  startOfWeek,
  endOfWeek,
  daysUntil,
  daysSince,
  formatDueRelative,
  formatRelative,
} from "../utils/date-utils.js";

export async function weekPriorities(): Promise<string> {
  const clients = await getAllClients();

  if (clients.length === 0) {
    return "No clients found. Use the add_client tool to add your first client.";
  }

  const allInteractions = await getAllInteractions();
  const allDeadlines = await getAllDeadlines();
  const activeDeadlines = await getActiveDeadlines();

  // Score each client for this week's priority
  interface ClientPriority {
    name: string;
    slug: string;
    score: number;
    reasons: string[];
    healthBand: string;
    healthScore: number;
  }

  const priorities: ClientPriority[] = [];

  for (const client of clients) {
    if (client.status === "churned") continue;

    const cInteractions = allInteractions.filter((i) => i.clientSlug === client.slug);
    const cDeadlines = allDeadlines.filter((d) => d.clientSlug === client.slug);
    const cActiveDeadlines = activeDeadlines.filter((d) => d.clientSlug === client.slug);
    const health = computeHealth(client, cInteractions, cDeadlines);

    let score = 0;
    const reasons: string[] = [];

    // Overdue deadlines (highest priority)
    const overdueCount = cActiveDeadlines.filter(
      (d) => new Date(d.dueDate).getTime() < Date.now(),
    ).length;
    if (overdueCount > 0) {
      score += 40;
      reasons.push(`${overdueCount} overdue deadline${overdueCount > 1 ? "s" : ""}`);
    }

    // Deadlines this week
    const thisWeekDeadlines = cActiveDeadlines.filter((d) => {
      const du = daysUntil(d.dueDate);
      return du >= 0 && du <= 7;
    });
    if (thisWeekDeadlines.length > 0) {
      score += 25;
      reasons.push(
        `${thisWeekDeadlines.length} deadline${thisWeekDeadlines.length > 1 ? "s" : ""} this week`,
      );
    }

    // Stale client (no interaction in 30+ days)
    if (!client.lastInteraction || daysSince(client.lastInteraction) > 30) {
      score += 15;
      const since = client.lastInteraction
        ? formatRelative(client.lastInteraction)
        : "never";
      reasons.push(`Last contact: ${since}`);
    }

    // Poor health
    if (health.band === "Critical") {
      score += 20;
      reasons.push(`Health: Critical (${health.score}/100)`);
    } else if (health.band === "At Risk") {
      score += 10;
      reasons.push(`Health: At Risk (${health.score}/100)`);
    }

    // High-value client gets a small boost
    if (client.engagement.value && client.engagement.value >= 2000) {
      score += 5;
    }

    if (reasons.length > 0) {
      priorities.push({
        name: client.name,
        slug: client.slug,
        score,
        reasons,
        healthBand: health.band,
        healthScore: health.score,
      });
    }
  }

  // Sort by priority score descending
  priorities.sort((a, b) => b.score - a.score);

  if (priorities.length === 0) {
    return `Week of ${startOfWeek()} to ${endOfWeek()}\n\nAll clients are in good standing. No urgent priorities this week.`;
  }

  const sections: string[] = [];
  sections.push(`WEEK PRIORITIES — ${startOfWeek()} to ${endOfWeek()}`);
  sections.push("=".repeat(50));
  sections.push("");

  for (let i = 0; i < Math.min(priorities.length, 20); i++) {
    const p = priorities[i];
    sections.push(`${i + 1}. ${p.name} (priority score: ${p.score})`);
    sections.push(`   Health: ${p.healthBand} (${p.healthScore}/100)`);
    for (const reason of p.reasons) {
      sections.push(`   - ${reason}`);
    }
    sections.push("");
  }

  if (priorities.length > 20) {
    sections.push(`... and ${priorities.length - 20} more clients with lower priority`);
  }

  sections.push(`Total clients needing attention: ${priorities.length}/${clients.length}`);

  return sections.join("\n");
}
