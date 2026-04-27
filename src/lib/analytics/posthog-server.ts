/**
 * Compatibility shim — PostHog server SDK was replaced by Practiq's
 * self-hosted analytics on Supabase (see src/lib/analytics/track.ts).
 *
 * This file used to import `posthog-node` and ship events to a hosted
 * PostHog project. We removed the dependency to (a) keep behavioural
 * data on our own infra, (b) avoid the free-tier event ceilings, and
 * (c) join analytics × subscriptions × usage in one SQL query — which
 * a vendor analytics tool can't do.
 *
 * The two exported symbols (`trackServerEvent`, `flushServerEvents`)
 * are re-exported as-is from track.ts so the dozens of call sites in
 * webhook / signup / chat code don't need to be edited again.
 *
 * Migrating new code: import from `@/lib/analytics/track` directly,
 * not from this file.
 */
export { trackServerEvent, flushServerEvents } from "./track";
