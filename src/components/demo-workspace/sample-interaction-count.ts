/**
 * Session-scoped sample interaction counter for /demo/workspace.
 *
 * Stored in sessionStorage so the count resets when the visitor
 * closes the tab — it isn't a long-lived nag. We use a custom
 * event so a sibling component (the visible counter) can update
 * live without lifting state up to a shared provider.
 */

const KEY = "practiq_demo_sample_interactions";
const EVENT = "practiq:demo-sample-interaction";

export function readSampleInteractionCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    const n = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function bumpSampleInteractionCount(): number {
  if (typeof window === "undefined") return 0;
  const next = readSampleInteractionCount() + 1;
  try {
    window.sessionStorage.setItem(KEY, String(next));
    window.dispatchEvent(new CustomEvent(EVENT, { detail: next }));
  } catch {
    // sessionStorage can throw in private mode — modal still works,
    // just no escalation.
  }
  return next;
}

export const SAMPLE_INTERACTION_EVENT = EVENT;
