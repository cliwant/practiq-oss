/**
 * deadline_tracker — Track and manage deadlines across clients.
 */

import { getClient, slugify } from "../store/client-store.js";
import {
  getAllDeadlines,
  getDeadlinesForClient,
  getActiveDeadlines,
  getOverdueDeadlines,
  getUpcomingDeadlines,
  addDeadline,
  completeDeadline,
} from "../store/deadline-store.js";
import { formatDueRelative } from "../utils/date-utils.js";

export interface DeadlineTrackerInput {
  action: string; // "list" | "add" | "complete"
  client_name?: string;
  description?: string;
  due_date?: string;
  priority?: string;
  deadline_id?: string;
}

export async function deadlineTracker(input: DeadlineTrackerInput): Promise<string> {
  const action = input.action.toLowerCase();

  switch (action) {
    case "list":
      return listDeadlines(input.client_name);
    case "add":
      return addDeadlineAction(input);
    case "complete":
      return completeDeadlineAction(input);
    default:
      return `Unknown action: "${input.action}". Must be one of: list, add, complete`;
  }
}

async function listDeadlines(clientName?: string): Promise<string> {
  const sections: string[] = [];

  if (clientName) {
    const client = await getClient(clientName);
    if (!client) {
      return `Client not found: "${clientName}".`;
    }

    const deadlines = await getDeadlinesForClient(client.slug);
    sections.push(`DEADLINES: ${client.name}`);
    sections.push("=".repeat(50));

    const active = deadlines.filter((d) => !d.completed);
    const completed = deadlines.filter((d) => d.completed);

    if (active.length > 0) {
      sections.push("");
      sections.push("ACTIVE:");
      for (const d of active) {
        const overdue = new Date(d.dueDate).getTime() < Date.now() ? " [OVERDUE]" : "";
        sections.push(`  [${d.priority.toUpperCase()}] ${d.description} — ${formatDueRelative(d.dueDate)}${overdue}`);
        sections.push(`    ID: ${d.id}`);
      }
    }

    if (completed.length > 0) {
      sections.push("");
      sections.push(`COMPLETED (${completed.length}):`);
      for (const d of completed.slice(0, 5)) {
        sections.push(`  ${d.description} — completed ${d.completedAt?.slice(0, 10) ?? "unknown"}`);
      }
    }

    if (active.length === 0 && completed.length === 0) {
      sections.push("");
      sections.push("No deadlines found for this client.");
    }

    return sections.join("\n");
  }

  // All clients overview
  const overdue = await getOverdueDeadlines();
  const upcoming = await getUpcomingDeadlines(14);
  const active = await getActiveDeadlines();

  sections.push("DEADLINE TRACKER — ALL CLIENTS");
  sections.push("=".repeat(50));
  sections.push("");

  if (overdue.length > 0) {
    sections.push(`OVERDUE (${overdue.length}):`);
    for (const d of overdue) {
      sections.push(`  [${d.priority.toUpperCase()}] ${d.clientName}: ${d.description} — ${formatDueRelative(d.dueDate)}`);
      sections.push(`    ID: ${d.id}`);
    }
    sections.push("");
  }

  if (upcoming.length > 0) {
    sections.push(`UPCOMING (next 14 days, ${upcoming.length}):`);
    for (const d of upcoming) {
      sections.push(`  [${d.priority.toUpperCase()}] ${d.clientName}: ${d.description} — ${formatDueRelative(d.dueDate)}`);
      sections.push(`    ID: ${d.id}`);
    }
    sections.push("");
  }

  const futureCount = active.length - overdue.length - upcoming.length;
  if (futureCount > 0) {
    sections.push(`FUTURE (beyond 14 days): ${futureCount} deadline${futureCount !== 1 ? "s" : ""}`);
    sections.push("");
  }

  sections.push(`Summary: ${active.length} active, ${overdue.length} overdue, ${upcoming.length} due within 14 days`);

  return sections.join("\n");
}

async function addDeadlineAction(input: DeadlineTrackerInput): Promise<string> {
  if (!input.client_name) {
    return 'Missing required field: "client_name"';
  }
  if (!input.description) {
    return 'Missing required field: "description"';
  }
  if (!input.due_date) {
    return 'Missing required field: "due_date" (format: YYYY-MM-DD)';
  }

  const client = await getClient(input.client_name);
  if (!client) {
    return `Client not found: "${input.client_name}".`;
  }

  const validPriorities = ["low", "medium", "high", "critical"] as const;
  const priority = (input.priority?.toLowerCase() ?? "medium") as typeof validPriorities[number];
  if (!validPriorities.includes(priority)) {
    return `Invalid priority: "${input.priority}". Must be one of: ${validPriorities.join(", ")}`;
  }

  try {
    const deadline = await addDeadline({
      clientSlug: client.slug,
      clientName: client.name,
      description: input.description,
      dueDate: input.due_date,
      priority,
    });

    return [
      "Deadline added successfully.",
      "",
      `  Client: ${client.name}`,
      `  Description: ${deadline.description}`,
      `  Due: ${deadline.dueDate} (${formatDueRelative(deadline.dueDate)})`,
      `  Priority: ${deadline.priority}`,
      `  ID: ${deadline.id}`,
    ].join("\n");
  } catch (err) {
    return `Error adding deadline: ${err instanceof Error ? err.message : String(err)}`;
  }
}

async function completeDeadlineAction(input: DeadlineTrackerInput): Promise<string> {
  if (!input.deadline_id) {
    return 'Missing required field: "deadline_id". Use action "list" to find deadline IDs.';
  }

  try {
    const deadline = await completeDeadline(input.deadline_id);
    return [
      "Deadline marked as complete.",
      "",
      `  Client: ${deadline.clientName}`,
      `  Description: ${deadline.description}`,
      `  Was due: ${deadline.dueDate}`,
      `  Completed: ${deadline.completedAt?.slice(0, 10) ?? "now"}`,
    ].join("\n");
  } catch (err) {
    return `Error: ${err instanceof Error ? err.message : String(err)}`;
  }
}
