/**
 * Date utility functions for the Practiq MCP server.
 * All dates are ISO 8601 strings. No external dependencies.
 */

export function now(): string {
  return new Date().toISOString();
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA).getTime();
  const b = new Date(dateB).getTime();
  return Math.floor(Math.abs(b - a) / (1000 * 60 * 60 * 24));
}

export function daysSince(date: string): number {
  return daysBetween(date, now());
}

export function daysUntil(date: string): number {
  const target = new Date(date).getTime();
  const current = Date.now();
  return Math.floor((target - current) / (1000 * 60 * 60 * 24));
}

export function isOverdue(dueDate: string): boolean {
  return new Date(dueDate).getTime() < Date.now();
}

export function isWithinDays(date: string, days: number): boolean {
  const d = daysUntil(date);
  return d >= 0 && d <= days;
}

export function formatRelative(date: string): string {
  const d = daysSince(date);
  if (d === 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 7) return `${d} days ago`;
  if (d < 30) return `${Math.floor(d / 7)} weeks ago`;
  if (d < 365) return `${Math.floor(d / 30)} months ago`;
  return `${Math.floor(d / 365)} years ago`;
}

export function formatDueRelative(date: string): string {
  const d = daysUntil(date);
  if (d < 0) return `${Math.abs(d)} days overdue`;
  if (d === 0) return "due today";
  if (d === 1) return "due tomorrow";
  if (d < 7) return `due in ${d} days`;
  if (d < 30) return `due in ${Math.floor(d / 7)} weeks`;
  return `due in ${Math.floor(d / 30)} months`;
}

/** Start of the current week (Monday) as ISO date string */
export function startOfWeek(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().slice(0, 10);
}

/** End of the current week (Sunday) as ISO date string */
export function endOfWeek(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? 0 : 7);
  const sunday = new Date(d.setDate(diff));
  return sunday.toISOString().slice(0, 10);
}
