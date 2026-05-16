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
import { posthogClient } from "./posthog-server";

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
  | "sns_cta_clicked"
  | "waitlist_signed_up"
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
  // Stage 3c (2026-05-16) — credit pack one-time purchase
  | "credit_pack_purchased"
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
  | "external_api_error"
  | "citation_parse_failed"
  // ── Tier 5 — attribution + engagement + form-field telemetry ─
  | "attribution_captured"
  | "posthog_session_replay_started"
  | "scroll_depth_25"
  | "scroll_depth_50"
  | "scroll_depth_75"
  | "scroll_depth_100"
  | "time_on_page"
  | "exit_intent_detected"
  | "rage_click_detected"
  | "form_field_focused"
  | "form_field_blurred"
  | "form_validation_failed"
  | "form_submitted"
  // ── Tier 2 — vertical workflows ───────────────────────────────
  | "workflow_started"
  | "workflow_completed"
  // ── Tier 4 — lifecycle email sequences ─────────────────────────
  | "sequence_email_sent"
  // Server-only: fired when a duplicate-signup attempt triggers the
  // welcome-back path. Never emitted from the client — it would
  // re-introduce the user-enumeration leak we just closed.
  | "welcome_back_email_sent"
  // ── Tier 5+ — observability (web vitals, JS errors) ────────────
  | "web_vital_captured"
  | "js_error_captured"
  // ── Self-serve workflow audit ──────────────────────────────────
  | "workflow_audit_started"
  // 2026-05-16: Fires once per step when it becomes visible. Combined
  // with `workflow_audit_step_advanced` (the user actually moved on)
  // and `workflow_audit_step_blocked` (validation failed) this lets
  // the operator pinpoint exactly where the funnel stalls.
  | "workflow_audit_step_viewed"
  | "workflow_audit_step_advanced"
  | "workflow_audit_step_blocked"
  | "workflow_audit_completed"
  | "workflow_audit_followup_sent"
  // ── /demo/workspace — read-only sample experience ──────────────
  | "demo_workspace_interaction"
  // ── AI policy generator (TIER 3 free tool) ─────────────────────
  | "policy_step_advanced"
  | "policy_generated";

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
  // First-touch attribution (Tier 5)
  firstTouchUtmSource?: string | null;
  firstTouchUtmMedium?: string | null;
  firstTouchUtmCampaign?: string | null;
  firstTouchReferrer?: string | null;
  firstTouchLandingPage?: string | null;
  // Server-side enrichment (Tier 5)
  geoCountry?: string | null;
  geoRegion?: string | null;
  geoCity?: string | null;
  deviceType?: string | null;
  viewportWidth?: number | null;
  viewportHeight?: number | null;
}

/**
 * Mirror an event to PostHog (best-effort). Never throws — analytics
 * failures must never break the request. PostHog is a secondary sink;
 * the practiq.analytics_events table remains canonical.
 */
function mirrorToPosthog(input: TrackEventInput): void {
  if (!posthogClient) return;
  try {
    const distinctId = input.userId ?? input.distinctId ?? "anonymous";
    const properties: Record<string, unknown> = {
      ...(input.properties ?? {}),
      $current_url: input.url ?? undefined,
      $referrer: input.referrer ?? undefined,
      utm_source: input.utmSource ?? undefined,
      utm_medium: input.utmMedium ?? undefined,
      utm_campaign: input.utmCampaign ?? undefined,
      utm_term: input.utmTerm ?? undefined,
      utm_content: input.utmContent ?? undefined,
      first_touch_utm_source: input.firstTouchUtmSource ?? undefined,
      first_touch_utm_medium: input.firstTouchUtmMedium ?? undefined,
      first_touch_utm_campaign: input.firstTouchUtmCampaign ?? undefined,
      first_touch_referrer: input.firstTouchReferrer ?? undefined,
      first_touch_landing_page: input.firstTouchLandingPage ?? undefined,
      geo_country: input.geoCountry ?? undefined,
      geo_region: input.geoRegion ?? undefined,
      geo_city: input.geoCity ?? undefined,
      device_type: input.deviceType ?? undefined,
      viewport_width: input.viewportWidth ?? undefined,
      viewport_height: input.viewportHeight ?? undefined,
    };
    posthogClient.capture({
      distinctId,
      event: input.type,
      properties,
    });
  } catch (err) {
    console.warn(`[posthog] mirror failed for ${input.type}:`, err);
  }
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
        firstTouchUtmSource: input.firstTouchUtmSource ?? null,
        firstTouchUtmMedium: input.firstTouchUtmMedium ?? null,
        firstTouchUtmCampaign: input.firstTouchUtmCampaign ?? null,
        firstTouchReferrer: input.firstTouchReferrer ?? null,
        firstTouchLandingPage: input.firstTouchLandingPage ?? null,
        geoCountry: input.geoCountry ?? null,
        geoRegion: input.geoRegion ?? null,
        geoCity: input.geoCity ?? null,
        deviceType: input.deviceType ?? null,
        viewportWidth: input.viewportWidth ?? null,
        viewportHeight: input.viewportHeight ?? null,
      },
    });
  } catch (err) {
    // Never raise — analytics failures must not break business logic.
    console.warn(`[analytics] write failed for ${input.type}:`, err);
  }
  mirrorToPosthog(input);
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
        firstTouchUtmSource: input.firstTouchUtmSource ?? null,
        firstTouchUtmMedium: input.firstTouchUtmMedium ?? null,
        firstTouchUtmCampaign: input.firstTouchUtmCampaign ?? null,
        firstTouchReferrer: input.firstTouchReferrer ?? null,
        firstTouchLandingPage: input.firstTouchLandingPage ?? null,
        geoCountry: input.geoCountry ?? null,
        geoRegion: input.geoRegion ?? null,
        geoCity: input.geoCity ?? null,
        deviceType: input.deviceType ?? null,
        viewportWidth: input.viewportWidth ?? null,
        viewportHeight: input.viewportHeight ?? null,
      })) as unknown as CreateManyData,
      skipDuplicates: false,
    });
  } catch (err) {
    console.warn(`[analytics] batch write failed (${inputs.length} events):`, err);
  }
  for (const input of inputs) mirrorToPosthog(input);
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
  // Self-hosted writes are sync; nothing to flush there. PostHog
  // buffers in posthog-node — drain before serverless freeze so
  // end-of-handler captures don't get dropped.
  if (posthogClient) {
    try {
      await posthogClient.shutdown();
    } catch (err) {
      console.warn("[posthog] flush failed:", err);
    }
  }
}
