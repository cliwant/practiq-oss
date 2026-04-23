/**
 * Pure filter logic for the command palette. Extracted from the React
 * component so we can unit-test without a DOM.
 *
 * Matches: label, subtitle, keywords[] — all case-insensitive substring.
 * Scoring: exact-label-prefix > label-substring > subtitle > keywords.
 * Higher scores rank first; ties preserve input order.
 */

export interface FilterableAction {
  id: string;
  label: string;
  subtitle?: string;
  keywords?: string[];
}

export function filterActions<T extends FilterableAction>(
  actions: T[],
  query: string,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return actions;

  const scored: Array<{ action: T; score: number; index: number }> = [];
  actions.forEach((a, index) => {
    const label = a.label.toLowerCase();
    const subtitle = (a.subtitle ?? "").toLowerCase();
    const kw = (a.keywords ?? []).join(" ").toLowerCase();

    let score = 0;
    if (label === q) score = 1000;
    else if (label.startsWith(q)) score = 500;
    else if (label.includes(q)) score = 200;
    else if (subtitle.includes(q)) score = 50;
    else if (kw.includes(q)) score = 20;

    if (score > 0) scored.push({ action: a, score, index });
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.index - b.index;
  });

  return scored.map((s) => s.action);
}
