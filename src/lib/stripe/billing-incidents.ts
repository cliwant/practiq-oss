/**
 * Billing incident ledger writer (Tier 3 lifecycle hardening).
 *
 * Records domain-meaningful billing events to practiq.billing_incidents
 * so the operator has a single audit log of every payment failure,
 * subscription cancel, upcoming renewal, and chargeback — visible at
 * /admin/incidents/billing alongside Slack pings.
 *
 * Distinction from src/lib/stripe/instrumentation.ts:
 *   - instrumentation.ts records the transport-layer delivery (every
 *     webhook event, idempotency-keyed by Stripe event_id, no payload).
 *   - This module records the *business meaning* of a subset of those
 *     events (payment_failed, subscription_canceled, upcoming_renewal,
 *     chargeback) with operator-actionable summary fields.
 *
 * Same posture as instrumentation.ts:
 *   - Best-effort writes — if Supabase is down we log + continue. We
 *     never block webhook ack on this write succeeding; Stripe's
 *     business event already fired the relevant Slack notification.
 *   - Lazy supabase client, never throws at import time.
 *   - Stripe event_id is UNIQUE — duplicate insert from a webhook replay
 *     is a no-op (we use upsert with ignoreDuplicates).
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type BillingIncidentType =
  | "payment_failed"
  | "subscription_canceled"
  | "upcoming_renewal"
  | "chargeback";

export type BillingIncidentStatus = "open" | "resolved" | "superseded";

interface RecordIncidentInput {
  stripeCustomerId: string;
  stripeInvoiceId?: string | null;
  stripeEventId: string;
  type: BillingIncidentType;
  status?: BillingIncidentStatus;
  amountUsd?: number | null;
  attemptCount?: number | null;
  payloadSummary?: Record<string, unknown>;
}

function supabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Insert a billing incident row. Idempotent on stripe_event_id — a
 * second call with the same event id is a no-op (handled by the UNIQUE
 * constraint + upsert ignoreDuplicates).
 *
 * Returns the row id when a new row was written, or null when nothing
 * was written (duplicate event_id, supabase env missing, or DB error).
 * Callers MUST tolerate null — we never want a billing_incidents write
 * to block the Stripe webhook from ack-ing.
 */
export async function recordBillingIncident(
  input: RecordIncidentInput,
): Promise<string | null> {
  const supabase = supabaseClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .schema("practiq")
      .from("billing_incidents")
      .upsert(
        {
          stripe_customer_id: input.stripeCustomerId,
          stripe_invoice_id: input.stripeInvoiceId ?? null,
          stripe_event_id: input.stripeEventId,
          type: input.type,
          status: input.status ?? "open",
          amount_usd: input.amountUsd ?? null,
          attempt_count: input.attemptCount ?? null,
          payload_summary: input.payloadSummary ?? {},
        },
        { onConflict: "stripe_event_id", ignoreDuplicates: true },
      )
      .select("id")
      .maybeSingle();
    if (error) {
      console.warn("[billing-incidents] insert failed:", error);
      return null;
    }
    return data?.id ?? null;
  } catch (err) {
    console.warn("[billing-incidents] insert exception:", err);
    return null;
  }
}
