/**
 * Server-side PostHog client (posthog-node).
 *
 * Layered on top of the self-hosted analytics (track.ts). PostHog is used
 * for operator-facing features we don't want to build ourselves: session
 * replay correlation, funnel analysis, feature flags, and A/B tests.
 *
 * The self-hosted layer (track.ts → analytics_events table) remains the
 * canonical source for joining analytics × subscriptions × usage in SQL.
 * PostHog receives the same events as a secondary sink for its own tooling.
 *
 * No-op when NEXT_PUBLIC_POSTHOG_KEY is absent (preview / local without keys).
 *
 * The two legacy symbols (`trackServerEvent`, `flushServerEvents`) are
 * re-exported from track.ts so existing call sites keep working unchanged.
 */

import { PostHog } from "posthog-node";

/**
 * Singleton posthog-node client.
 * Returns null when the public key is not configured so callers can
 * safely skip PostHog in environments without keys.
 */
function createPosthogClient(): PostHog | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  if (!host) return null;
  return new PostHog(key, { host, flushAt: 20, flushInterval: 10000 });
}

// Module-level singleton — reused across requests in the same process.
const posthogClient: PostHog | null = createPosthogClient();

export { posthogClient };

// ── Legacy shim re-exports ────────────────────────────────────────────────
// Keep these so the dozens of existing call sites in webhook/signup/chat
// code don't need to be updated. New code should import from track.ts.
export { trackServerEvent, flushServerEvents } from "./track";
