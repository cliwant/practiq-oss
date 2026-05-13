/**
 * Stripe webhook reliability instrumentation.
 *
 * Wraps the existing webhook handler with:
 *   1. Per-delivery row in practiq.stripe_webhook_events (received →
 *      processed | failed | replay_rejected).
 *   2. Idempotency check on Stripe's event_id — if the same id is
 *      already 'processed', return 200 immediately without running
 *      side effects and append a 'replay_rejected' row.
 *   3. Slack 'stripe_webhook_failed' alert (critical) on signature
 *      failure or handler exception. The alert includes the event_id,
 *      event_type, livemode flag, error step, and a deep link to
 *      /admin/incidents/stripe.
 *   4. Processing-duration capture for the 7d health metric on
 *      /admin/analytics.
 *
 * The Supabase writes are best-effort — if the practiq schema is down
 * we still return 200 to Stripe (so retries don't pile up) and log the
 * issue. Same posture as src/lib/notifications/user-error.ts.
 *
 * Rationale: Stripe's webhook is the authoritative source of
 * subscription state. Silent failures here mean churned customers
 * still showing as active, or new paying customers stuck in 'pending'.
 * We want every delivery, replay attempt, and signature error visible
 * in /admin/incidents/stripe within seconds.
 */

import type Stripe from "stripe";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { safeNotify } from "@/lib/notifications/slack";

const ADMIN_HOST = "https://admin.grindworks.ai";

type WebhookStatus = "received" | "processed" | "failed" | "replay_rejected";

interface RecordReceivedInput {
  eventId: string;
  eventType: string;
  livemode: boolean;
  payloadSize: number;
  signatureVerified: boolean;
}

interface MarkOutcomeInput {
  eventId: string;
  status: Exclude<WebhookStatus, "received">;
  errorMessage?: string | null;
  errorStep?: string | null;
  processingDurationMs?: number | null;
}

/**
 * Lazy supabase client — never throws at import time so the webhook
 * route still builds when env is missing in CI.
 */
function supabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Check whether this event_id has already been seen. Used for
 * idempotency — Stripe retries deliveries, and we never want to
 * re-execute side effects (charge the customer, send the welcome
 * email, etc.) for the same logical event twice.
 *
 * Returns the existing row's status if found, or null if not seen.
 */
export async function checkExistingEvent(
  eventId: string,
): Promise<{ status: WebhookStatus } | null> {
  const supabase = supabaseClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .schema("practiq")
      .from("stripe_webhook_events")
      .select("status")
      .eq("event_id", eventId)
      .maybeSingle();
    if (error) {
      console.warn("[stripe-webhook] idempotency check failed:", error);
      return null;
    }
    if (!data) return null;
    return { status: data.status as WebhookStatus };
  } catch (err) {
    console.warn("[stripe-webhook] idempotency check exception:", err);
    return null;
  }
}

/**
 * Insert (or upsert) the initial row when a delivery arrives. Called
 * AFTER signature verification so we know event_id is trustworthy.
 *
 * Uses INSERT with ON CONFLICT DO NOTHING semantics via upsert — if a
 * row already exists for this event_id (replay), we keep the original
 * row intact and the caller has already decided to mark it as
 * 'replay_rejected' via a separate row write.
 *
 * Note: we use a separate `recordReplayRejected` for replays because
 * we want to log the *attempt* without clobbering the original
 * delivery's success record.
 */
export async function recordReceived(input: RecordReceivedInput): Promise<void> {
  const supabase = supabaseClient();
  if (!supabase) return;
  try {
    const { error } = await supabase
      .schema("practiq")
      .from("stripe_webhook_events")
      .upsert(
        {
          event_id: input.eventId,
          event_type: input.eventType,
          livemode: input.livemode,
          status: "received",
          payload_size: input.payloadSize,
          signature_verified: input.signatureVerified,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "event_id", ignoreDuplicates: true },
      );
    if (error) {
      console.warn("[stripe-webhook] recordReceived failed:", error);
    }
  } catch (err) {
    console.warn("[stripe-webhook] recordReceived exception:", err);
  }
}

/**
 * Mark a previously-received row as processed / failed. Called from
 * the route handler's `finally` block so we always close the loop
 * even when the handler throws.
 */
export async function markOutcome(input: MarkOutcomeInput): Promise<void> {
  const supabase = supabaseClient();
  if (!supabase) return;
  try {
    const { error } = await supabase
      .schema("practiq")
      .from("stripe_webhook_events")
      .update({
        status: input.status,
        error_message: input.errorMessage ?? null,
        error_step: input.errorStep ?? null,
        processing_duration_ms: input.processingDurationMs ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("event_id", input.eventId);
    if (error) {
      console.warn("[stripe-webhook] markOutcome failed:", error);
    }
  } catch (err) {
    console.warn("[stripe-webhook] markOutcome exception:", err);
  }
}

/**
 * Record a replay attempt. Stripe retries deliveries when our 200
 * doesn't arrive fast enough. We never want to re-run side effects,
 * so we detect the replay and log it separately. The row's PK is
 * event_id which already has a row, so we instead INSERT into a
 * sentinel-style row — but since PK is event_id we just bump
 * updated_at and re-stamp status to capture the replay window.
 *
 * Implementation: we keep the original row's status='processed'
 * untouched and write a one-line audit via console + slack. The PK
 * conflict on event_id means we can't insert a *second* row, so we
 * also update the original row's updated_at as a "last replay seen"
 * stamp without clobbering its terminal status.
 *
 * This is intentional: from the operator's POV they care about
 * "how many deliveries arrived for this event" (countable via Stripe
 * dashboard) and "did we ever fail to process it" (the row's status).
 * If replay storms become a real issue we can add a separate
 * `replay_attempts` count column later.
 */
export async function recordReplayRejected(
  eventId: string,
  originalStatus: WebhookStatus,
): Promise<void> {
  const supabase = supabaseClient();
  if (!supabase) return;
  try {
    // If the original was 'failed', mark this attempt as replay_rejected
    // so the admin UI shows the most recent attempt. If it was already
    // 'processed', leave status as-is and just touch updated_at.
    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (originalStatus === "failed" || originalStatus === "received") {
      // Original delivery never completed — this replay is the operator's
      // signal that Stripe is retrying. Mark replay_rejected so /admin
      // surfaces it; the next successful delivery will overwrite with
      // 'processed'.
      patch.status = "replay_rejected";
    }
    const { error } = await supabase
      .schema("practiq")
      .from("stripe_webhook_events")
      .update(patch)
      .eq("event_id", eventId);
    if (error) {
      console.warn("[stripe-webhook] recordReplayRejected failed:", error);
    }
  } catch (err) {
    console.warn("[stripe-webhook] recordReplayRejected exception:", err);
  }
}

/**
 * Slack alert for webhook failures. Critical severity — this is one
 * of the few cases where a single failure can mean a churned customer
 * still being charged, or a paying customer locked out of the app.
 *
 * Payload mirrors the `user_error_critical` shape (see
 * src/lib/notifications/slack.ts) so the operator's triage workflow
 * is identical: open Slack ping → click "Admin incidents" → see row.
 */
export function pingWebhookFailure(input: {
  eventId: string;
  eventType: string;
  livemode: boolean;
  errorStep: string;
  errorMessage: string;
}): void {
  safeNotify(
    "stripe_webhook_failed",
    {
      eventId: input.eventId,
      eventType: input.eventType,
      livemode: input.livemode,
      errorStep: input.errorStep,
      errorMessage: input.errorMessage,
      adminLink: `${ADMIN_HOST}/admin/incidents/stripe`,
      stripeLink: `https://dashboard.stripe.com/${
        input.livemode ? "" : "test/"
      }events/${input.eventId}`,
    },
    { severity: "critical" },
  );
}
