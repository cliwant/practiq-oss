/**
 * Compatibility shim — the PostHog client SDK was replaced by Practiq's
 * self-hosted browser tracker (see src/lib/analytics/track-client.ts).
 *
 * The dependency removal: posthog-js was 75 KB minified + introduced a
 * vendor cookie + sent events to a third-party domain that ad-blockers
 * routinely strip. The replacement is a single fetch-or-beacon call to
 * /api/events on the same origin, which writes directly to our
 * `analytics_events` table on Supabase.
 *
 * The function signatures here mirror the old PostHog wrappers so every
 * existing call site (PricingClient, PostHogProvider, etc.) keeps
 * working with no diff. Internally each function is now a thin adapter
 * over the new tracker.
 *
 * Migrating new code: import from `@/lib/analytics/track-client`
 * directly, not from this file.
 */
"use client";

import {
  trackClient,
  trackEvent as trackEventInner,
  trackPageview,
} from "./track-client";

/**
 * No-op init — kept for backwards compat. The new tracker has no SDK
 * to initialize: every call posts directly to /api/events.
 */
export function initPosthog(): void {
  // Nothing to do — the new tracker is stateless.
}

/**
 * Manual pageview capture. Wraps trackPageview so callers don't need
 * to update their imports.
 */
export function capturePageview(url?: string): void {
  trackPageview(url);
}

/**
 * Generic event capture. Equivalent to the old posthog.capture() in
 * shape; the underlying implementation now writes a row to our own DB
 * via /api/events.
 */
export function trackEvent(
  name: string,
  properties: Record<string, unknown> = {},
): void {
  trackEventInner(name, properties);
}

/**
 * Identify the authenticated user.
 *
 * In the old PostHog flow we called `posthog.identify(userId)` which
 * stamped the SDK's distinct_id with the authed id and merged with any
 * pre-signup anon trail.
 *
 * In the new self-hosted flow the same effect happens server-side: the
 * /api/events handler reads the auth session from the cookie, so once
 * the user is signed in every event is automatically tagged with
 * `userId`. The cookie-based `practiq_visitor` distinctId stays the
 * same across the auth boundary, so anon → authed events stitch with
 * a `WHERE distinct_id = ?` SQL join — no explicit alias call needed.
 *
 * This function is therefore a no-op kept for source-compat with the
 * existing `<PosthogProvider>`.
 */
export function identifyUser(
  _userId: string,
  _properties: Record<string, unknown> = {},
): void {
  // Server-side handles the userId stamping; nothing to do client-side.
  void trackClient; // keep the import alive so tree-shake doesn't strip it
}

/**
 * Reset on signout. The old PostHog SDK regenerated its distinct_id;
 * in our model the distinct_id is the cookie itself. Clearing it lets
 * the user appear as a fresh anonymous visitor on the next page load.
 */
export function resetPosthog(): void {
  if (typeof document === "undefined") return;
  // Expire the visitor cookie. Middleware will mint a new one on the
  // next request.
  document.cookie = "practiq_visitor=;Max-Age=0;path=/";
}

export type UtmParams = Partial<{
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_term: string;
  utm_content: string;
}>;

/** Read the persisted first-touch UTM params from the cookie. */
export function readStoredUtm(): UtmParams {
  if (typeof document === "undefined") return {};
  const m = document.cookie.match(/(?:^|; )practiq_utm=([^;]+)/);
  if (!m) return {};
  try {
    const obj = JSON.parse(decodeURIComponent(m[1])) as Record<string, string>;
    const out: UtmParams = {};
    for (const k of [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
    ] as const) {
      if (obj[k]) out[k] = obj[k];
    }
    return out;
  } catch {
    return {};
  }
}
