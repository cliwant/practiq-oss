/**
 * PostHog server-side analytics for Practiq.
 *
 * Backend events that need source-of-truth reliability (signup_completed,
 * checkout_completed, subscription_canceled) are fired from this module
 * via posthog-node. The client-side counterpart is posthog-client.ts.
 *
 * Why server-side at all? Two reasons:
 *   1. Stripe webhooks fire from a backend context where window/posthog
 *      doesn't exist — the only place to capture checkout.session.completed
 *      is here.
 *   2. Ad-blockers and extension purgers strip 30-50% of client events.
 *      Conversion data we bill against revenue must NOT depend on the
 *      browser making it.
 *
 * Env vars (studio-root .env.local):
 *   NEXT_PUBLIC_POSTHOG_KEY   — same key used client-side; works for
 *                                server ingestion too. (PostHog accepts
 *                                a single project API key for both.)
 *   NEXT_PUBLIC_POSTHOG_HOST  — region host (e.g. https://us.i.posthog.com).
 *
 * If the key is unset, every helper here is a silent no-op so dev /
 * preview deploys don't crash.
 */
import { PostHog } from "posthog-node";

let cachedClient: PostHog | null = null;
let resolved = false;

/**
 * Get a memoized PostHog node client. Returns null when no API key is
 * configured (silent no-op mode). Calling this is cheap after the first
 * resolution — the client is reused across function invocations within
 * the same Vercel container.
 */
function getServerClient(): PostHog | null {
  if (resolved) return cachedClient;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
  resolved = true;
  if (!key) return null;
  cachedClient = new PostHog(key, {
    host:
      process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() ||
      "https://us.i.posthog.com",
    // Auto-flush every 20 events or 30s. Vercel's function lifetime is
    // short, so we also call shutdown() at function exit (see helper
    // below) to drain whatever's left.
    flushAt: 20,
    flushInterval: 30_000,
  });
  return cachedClient;
}

/**
 * Track an event server-side.
 *
 * @param distinctId  PostHog distinct_id. Use the user's DB id when known
 *                    so server events stitch to client-side identify().
 *                    For pre-auth events, pass an anonymous fallback like
 *                    `anon:<some-stable-token>`.
 * @param name        Event name (snake_case, matches client convention).
 * @param properties  Free-form properties object.
 */
export function trackServerEvent(
  distinctId: string,
  name: string,
  properties: Record<string, unknown> = {},
): void {
  const client = getServerClient();
  if (!client || !distinctId) return;
  try {
    client.capture({
      distinctId,
      event: name,
      properties,
    });
  } catch (err) {
    // Never let analytics break a request path — log and swallow.
    console.error("[posthog-server] capture failed:", err);
  }
}

/**
 * Flush pending events. Call before the Vercel function exits to ensure
 * webhook events don't get dropped on cold-shutdown. Idempotent.
 */
export async function flushServerEvents(): Promise<void> {
  const client = getServerClient();
  if (!client) return;
  try {
    await client.shutdown();
    // Reset cache so the next request gets a fresh client (since
    // shutdown() drains and closes the underlying queue).
    cachedClient = null;
    resolved = false;
  } catch (err) {
    console.error("[posthog-server] flush failed:", err);
  }
}
