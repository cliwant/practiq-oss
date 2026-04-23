/**
 * Relative-time formatting with no dependencies. Locale-agnostic English
 * because Practiq's UI is English-first; Korean labels live in user copy
 * elsewhere.
 */
export function formatDistance(
  input: Date | string,
  now: Date = new Date(),
): string {
  const then = typeof input === "string" ? new Date(input) : input;
  const diffMs = now.getTime() - then.getTime();
  const sec = Math.round(diffMs / 1000);

  if (sec < 30) return "just now";
  if (sec < 60) return `${sec}s ago`;

  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;

  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;

  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  if (day < 30) return `${Math.round(day / 7)}w ago`;
  if (day < 365) return `${Math.round(day / 30)}mo ago`;
  return `${Math.round(day / 365)}y ago`;
}

export function formatDate(input: Date | string): string {
  const d = typeof input === "string" ? new Date(input) : input;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(input: Date | string): string {
  const d = typeof input === "string" ? new Date(input) : input;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
