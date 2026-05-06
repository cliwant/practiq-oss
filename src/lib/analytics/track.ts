/**
 * Self-hosted product analytics — server-side track helper.
 *
 * Replaces PostHog with Practiq-owned event storage on Supabase. Every
 * meaningful behavioural event flows through this module and lands in
 * the `practiq.analytics_events` table, queryable via SQL by the
 * operator on /admin/analytics.
 *
 * Why replace PostHog:
 *   - Customer behavioural data is a core proprietary asset; we don't
 *     want it in a third-party SaaS.
 *   - Free tier ceilings on hosted analytics products eventually bite.
 *     A Postgres row write is < 1ms and Supabase already handles GBs
 *     of these for free.
 *   - The operator can join analytics_events × subscriptions ×
 *     usage_events × clients in a single SQL query — that's
 *     impossible with vendor analytics.
 *
 * Two modules:
 *   - this file (server) — direct prisma write from API routes
 *   - track-client.ts (client) — beacon to /api/events
 *
 * Both write the same schema. Server-side wins for events that must
 * not be lost to ad-blockers (signup, checkout, payment). Client-side
 * is for events that can't be inferred server-side ($pageview, button
 * clicks before form submit, etc.).
 */

import { prisma } from "@/lib/prisma";

/**
 * Canonical event taxonomy. New events must be added here so the
 * type-checker enforces stable names. Properties type narrows what
 * each event ships — keeps the analytics dashboard query-able
 * without surprise schema drift.
 */
export type AnalyticsEventName =
  // ── Acquisition / signup funnel ──────────────────────────────
  | "$pageview"
  | "pricing_cta_clicked"
  | "signup_form_submitted"
  | "signup_blocked"
  | "signup_completed"
  // ── Activation ────────────────────────────────────────────────
  | "first_client_created"
  | "first_chat_message_sent"
  | "sample_data_dismissed"
  | "approval_queue_opened"
  // ── Monetization ─────────────────────────────────────────────
  | "checkout_initiated"
  | "checkout_completed"
  | "stripe_checkout_abandoned"
  | "subscription_canceled"
  | "founding_slot_claimed"
  | "founding_slot_exhausted"
  // ── Plan-gate friction (so we can quantify upgrade pressure) ─
  | "plan_gate_blocked"
  | "chat_quota_warned" // soft warn at 80% cap
  | "chat_quota_blocked" // hard 402 at 100%
  // ── Retention / engagement ───────────────────────────────────
  | "chat_started" // first message of a new conversation
  | "approval_decision" // approved | rejected | edited
  | "client_workspace_opened"
  // ── Account ──────────────────────────────────────────────────
  | "login_completed"
  | "password_reset_requested"
  // ── Errors / ops signals ──────────────────────────────────────
  | "agent_run_failed"
  | "agent_run_succeeded"
  | "external_api_error";

export interface TrackEventInput {
  type: AnalyticsEventName;
  distinctId?: string | null;
  userId?: string | null;
  properties?: Record<string, unknown>;
  /** Page URL the event happened on (server can pass referer header). */
  url?: string | null;
  referrer?: string | null;
  userAgent?: string | null;
  /** Hashed IP for unique-visitor approximation w/o storing raw IP. */
  ipHash?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmTerm?: string | null;
  utmContent?: string | null;
}

/**
 * Write a single analytics event. Fire-and-forget at the call site —
 * never throws, never blocks. The whole point of analytics is that the
 * pipeline must not be a critical-path dependency.
 *
 * Schedule: in serverless functions, prefer `void trackEvent(...)`
 * unless the caller has cleanup work that needs to wait. Vercel waits
 * for the response stream to close, not for fire-and-forget promises,
 * so very-end-of-handler events should be `await`ed to ensure the
 * write actually lands before the function freezes.
 */
export async function trackEvent(input: TrackEventInput): Promise<void> {
  try {
    type CreateOne = Parameters<typeof prisma.analyticsEvent.create>[0]["data"];
    await prisma.analyticsEvent.create({
      data: {
        type: input.type,
        distinctId: input.distinctId ?? null,
        userId: input.userId ?? null,
        // Cast through unknown — see trackEvents() rationale.
        properties: (input.properties ?? {}) as unknown as CreateOne["properties"],
        url: input.url ?? null,
        referrer: input.referrer ?? null,
        userAgent: input.userAgent ?? null,
        ipHash: input.ipHash ?? null,
        utmSource: input.utmSource ?? null,
        utmMedium: input.utmMedium ?? null,
        utmCampaign: input.utmCampaign ?? null,
        utmTerm: input.utmTerm ?? null,
        utmContent: input.utmContent ?? null,
      },
    });
  } catch (err) {
    // Never raise — analytics failures must not break business logic.
    console.warn(`[analytics] write failed for ${input.type}:`, err);
  }
}

/**
 * Batch write helper — used by the /api/events ingestion endpoint
 * which can receive multiple events per beacon (page-unload flush).
 */
export async function trackEvents(inputs: TrackEventInput[]): Promise<void> {
  if (inputs.length === 0) return;
  try {
    type CreateManyData = NonNullable<
      Parameters<typeof prisma.analyticsEvent.createMany>[0]
    >["data"];
    await prisma.analyticsEvent.createMany({
      data: inputs.map((input) => ({
        type: input.type,
        distinctId: input.distinctId ?? null,
        userId: input.userId ?? null,
        // Prisma's createMany InputJsonValue won't accept a free-form
        // Record<string, unknown> directly because it can't statically
        // verify nested values are JSON-safe. Cast through unknown —
        // the API route already validated shape by JSON-parsing the
        // request body.
        properties: (input.properties ?? {}) as unknown as CreateManyData,
        url: input.url ?? null,
        referrer: input.referrer ?? null,
        userAgent: input.userAgent ?? null,
        ipHash: input.ipHash ?? null,
        utmSource: input.utmSource ?? null,
        utmMedium: input.utmMedium ?? null,
        utmCampaign: input.utmCampaign ?? null,
        utmTerm: input.utmTerm ?? null,
        utmContent: input.utmContent ?? null,
      })) as unknown as CreateManyData,
      skipDuplicates: false,
    });
  } catch (err) {
    console.warn(`[analytics] batch write failed (${inputs.length} events):`, err);
  }
}

/**
 * Compatibility shim — old call sites used `trackServerEvent(distinctId, name, props)`.
 * Map that signature to the new structured one so the migration from
 * PostHog can be a one-line import-swap, not a global refactor.
 *
 * @deprecated Use `trackEvent({ type, userId, properties, ... })` directly.
 */
export async function trackServerEvent(
  distinctIdOrUserId: string,
  name: AnalyticsEventName,
  properties?: Record<string, unknown>,
): Promise<void> {
  await trackEvent({
    type: name,
    distinctId: distinctIdOrUserId,
    userId: distinctIdOrUserId,
    properties,
  });
}

/**
 * Legacy flush hook from the PostHog SDK (which queued events). Our
 * Postgres-backed implementation writes synchronously, so flushing is
 * a no-op — but keeping the symbol means the migration doesn't break
 * old imports.
 *
 * @deprecated No-op in self-hosted analytics. Safe to remove.
 */
export async function flushServerEvents(): Promise<void> {
  // Self-hosted writes are sync; nothing to flush.
}
