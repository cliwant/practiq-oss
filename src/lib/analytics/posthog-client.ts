/**
 * PostHog client-side analytics for Practiq.
 *
 * Wires posthog-js for autocaptured pageviews + custom event tracking +
 * UTM persistence + identify-merge on signup. Initialized lazily — if
 * NEXT_PUBLIC_POSTHOG_KEY is unset (pre-launch / preview deploys), every
 * helper here becomes a silent no-op so no runtime cost is incurred and
 * nothing crashes.
 *
 * Env vars (studio-root .env.local):
 *   NEXT_PUBLIC_POSTHOG_KEY   — Project API key from posthog.com
 *   NEXT_PUBLIC_POSTHOG_HOST  — typically https://us.i.posthog.com
 *
 * Both vars MUST use the NEXT_PUBLIC_ prefix — they ship to the browser.
 *
 * Companion file: src/lib/analytics/posthog-server.ts (Node-side events).
 */
"use client";

import posthog, { type PostHog } from "posthog-js";

/** Local-storage key used to persist the first-touch UTM params. */
const UTM_STORAGE_KEY = "practiq_utm";

/** UTM params we track. Anything else is dropped to keep payloads small. */
const UTM_FIELDS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
] as const;

export type UtmParams = Partial<Record<(typeof UTM_FIELDS)[number], string>>;

/**
 * Cached posthog instance. Re-initialization is no-op safe (posthog-js
 * itself guards re-init), but caching avoids the env-var lookup churn.
 */
let initialized = false;

/**
 * Returns the live PostHog instance if it's been initialized AND a key
 * is configured; null otherwise. Use this — not the raw `posthog`
 * import — so callers always get the no-op behavior when unconfigured.
 */
function getClient(): PostHog | null {
  if (typeof window === "undefined") return null;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
  if (!key) return null;
  if (!initialized) {
    posthog.init(key, {
      api_host:
        process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() ||
        "https://us.i.posthog.com",
      // We trigger pageview manually via App Router (see initPosthog) so
      // we don't double-count on hard navigation.
      capture_pageview: false,
      // Autocapture clicks/changes/etc. — useful for retroactive funnel
      // analysis without re-instrumenting.
      autocapture: true,
      // Person-profile creation only when an event is captured. Saves
      // billable MAU on bots that load /robots.txt and bounce.
      person_profiles: "identified_only",
      // Disable in dev to avoid polluting production dashboards.
      loaded: (ph) => {
        if (process.env.NODE_ENV === "development") ph.opt_out_capturing();
      },
    });
    initialized = true;
  }
  return posthog;
}

/**
 * One-shot client-side init. Call from a top-level Client Component
 * (e.g. <PosthogProvider>) on mount. Safe to call multiple times.
 */
export function initPosthog(): void {
  getClient();
}

/**
 * Capture the current page view manually. Call from a route-change hook
 * so SPA navigations are tracked. The first call also captures the URL's
 * UTM params into localStorage (first-touch attribution).
 */
export function capturePageview(url?: string): void {
  const ph = getClient();
  if (!ph) return;
  // First-touch: only write UTM if we don't already have one stored.
  // This means the channel that drove the FIRST visit gets credit, even
  // if later navigations land on UTM-less URLs.
  captureUtmFromCurrentUrl();
  ph.capture("$pageview", { $current_url: url ?? window.location.href });
}

/**
 * Generic event helper. Wraps posthog.capture with UTM enrichment so
 * every conversion event carries first-touch attribution automatically.
 */
export function trackEvent(
  name: string,
  properties: Record<string, unknown> = {},
): void {
  const ph = getClient();
  if (!ph) return;
  const utm = readStoredUtm();
  ph.capture(name, { ...utm, ...properties });
}

/**
 * Identify the current user. Call this whenever a session resolves
 * (e.g. on auth state change). Safe to call repeatedly — posthog-js
 * dedupes identifies that don't change the distinct_id.
 *
 * Includes an optional alias of the prior anonymous id so pre-signup
 * pageviews stitch to the authed user's timeline.
 */
export function identifyUser(
  userId: string,
  properties: Record<string, unknown> = {},
): void {
  const ph = getClient();
  if (!ph || !userId) return;
  // Merge anonymous id → user id. Posthog does this automatically when
  // identify() is called with a fresh distinct_id, but we call alias
  // explicitly to be defensive against edge cases (e.g. user signs in
  // on a new device where the anon id is fresh).
  try {
    const anonId = ph.get_distinct_id();
    if (anonId && anonId !== userId) {
      ph.alias(userId, anonId);
    }
  } catch {
    // alias() can throw if posthog isn't ready yet; ignore.
  }
  ph.identify(userId, properties);
}

/** Reset on signout — generates a new anonymous distinct_id. */
export function resetPosthog(): void {
  const ph = getClient();
  if (!ph) return;
  ph.reset();
}

// ── UTM persistence ─────────────────────────────────────────────────

/**
 * Read UTM params from the current URL (if any) and persist them to
 * localStorage for first-touch attribution. Only writes when:
 *   1. Storage doesn't already have a UTM record, AND
 *   2. The URL actually carries at least one utm_* param.
 * This means the first marketing-tagged page wins; later untagged
 * navigations don't clobber the credit.
 */
function captureUtmFromCurrentUrl(): void {
  if (typeof window === "undefined") return;
  try {
    if (window.localStorage.getItem(UTM_STORAGE_KEY)) return;
    const params = new URLSearchParams(window.location.search);
    const utm: UtmParams = {};
    for (const field of UTM_FIELDS) {
      const v = params.get(field);
      if (v) utm[field] = v;
    }
    if (Object.keys(utm).length > 0) {
      window.localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(utm));
    }
  } catch {
    // localStorage can throw in private mode / quota issues — fail open.
  }
}

/** Read the stored first-touch UTM params (or {} if none). */
export function readStoredUtm(): UtmParams {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(UTM_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as UtmParams;
  } catch {
    return {};
  }
}
