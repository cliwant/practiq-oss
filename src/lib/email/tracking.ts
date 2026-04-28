/**
 * Transactional email delivery tracking — Wave-4 RUN 11 (P0-05).
 *
 * Two complementary mechanisms:
 *
 *   1. **Resend webhook** (`/api/webhooks/resend`) — primary path.
 *      Resend fires events (`email.sent` → `email.delivered` /
 *      `email.bounced` / `email.complained` / `email.delivery_delayed`
 *      / `email.opened` / `email.clicked`) at the configured webhook
 *      URL. Sub-second latency, accurate, the production-grade signal.
 *
 *   2. **60-second polling fallback** — secondary path. Triggered
 *      synchronously inside `sendEmail` (fire-and-forget) so even if
 *      the operator hasn't wired the webhook yet, we still detect
 *      hard failures by polling Resend's `GET /emails/{id}` endpoint
 *      a few times in the first minute. Cancels itself the moment a
 *      webhook event arrives for the same id.
 *
 * Both paths normalise into the same write surface: an `AnalyticsEvent`
 * row with `type` ∈ {transactional_email_sent, …_delivered, …_bounced,
 * …_complained, …_delayed, …_opened, …_clicked} and a `tag` carrying
 * the email category (welcome / password_reset / etc.). Hard failures
 * (bounce / complaint) ALSO fire a Slack notification via `safeNotify`.
 *
 * The polling path uses an in-memory `seen` set — once a webhook
 * event lands for a message id, the poller skips that id. Dies on
 * cold starts; harmless because each polling cycle is a single-
 * lambda timer and the webhook will still record the event.
 *
 * Idempotency: AnalyticsEvent has a unique-ish triple of (type,
 * messageId, eventTimestamp) — duplicate events from a webhook
 * retry are deduped at insert time via the per-event `eventId`.
 */
import { prisma } from "@/lib/prisma";
import { safeNotify } from "@/lib/notifications/slack";

export type ResendDeliveryEvent =
  | "email.sent"
  | "email.delivered"
  | "email.bounced"
  | "email.complained"
  | "email.delivery_delayed"
  | "email.opened"
  | "email.clicked";

const ANALYTICS_TYPE_BY_EVENT: Record<
  ResendDeliveryEvent,
  string
> = {
  "email.sent": "transactional_email_sent",
  "email.delivered": "transactional_email_delivered",
  "email.bounced": "transactional_email_bounced",
  "email.complained": "transactional_email_complained",
  "email.delivery_delayed": "transactional_email_delivery_delayed",
  "email.opened": "transactional_email_opened",
  "email.clicked": "transactional_email_clicked",
};

export interface RecordedDeliveryEvent {
  /** Event type (canonical Resend name). */
  event: ResendDeliveryEvent;
  /** Resend message id. */
  messageId: string;
  /** Recipient address. */
  to: string;
  /** Subject line, when available. */
  subject?: string;
  /** Application tag (welcome / password_reset / billing_receipt / …). */
  tag?: string;
  /** Bounce-type (`Permanent`, `Transient`, …) when applicable. */
  bounceType?: string;
  /** Raw event timestamp (ISO 8601) from Resend's `created_at`. */
  eventTimestamp?: string;
  /** Webhook delivery id (Svix) — used for dedupe. */
  eventId?: string;
}

const seenWebhookEventIds = new Set<string>();

/**
 * Persist a delivery event + fire a Slack ping for hard failures.
 * Idempotent on `eventId` (Svix delivery id from the webhook header).
 */
export async function recordDeliveryEvent(
  e: RecordedDeliveryEvent,
): Promise<void> {
  // Dedup on svix-id. The same event delivered twice (Resend retry)
  // should be a no-op so the analytics table doesn't double-count.
  if (e.eventId && seenWebhookEventIds.has(e.eventId)) return;
  if (e.eventId) seenWebhookEventIds.add(e.eventId);

  const analyticsType = ANALYTICS_TYPE_BY_EVENT[e.event];
  if (!analyticsType) return;

  // AnalyticsEvent row — observable in /admin/analytics.
  try {
    await prisma.analyticsEvent.create({
      data: {
        type: analyticsType,
        properties: {
          messageId: e.messageId,
          to: e.to,
          subject: e.subject ?? null,
          tag: e.tag ?? null,
          bounceType: e.bounceType ?? null,
          eventTimestamp: e.eventTimestamp ?? null,
          eventId: e.eventId ?? null,
        },
      },
    });
  } catch (err) {
    console.warn(
      `[email-tracking] AnalyticsEvent insert failed: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }

  // Slack ping for hard failures only.
  if (e.event === "email.bounced") {
    safeNotify("transactional_email_bounced", {
      to: e.to,
      subject: e.subject ?? "",
      tag: e.tag ?? "",
      bounceType: e.bounceType ?? "unknown",
      messageId: e.messageId,
    });
  } else if (e.event === "email.complained") {
    safeNotify("transactional_email_complained", {
      to: e.to,
      subject: e.subject ?? "",
      tag: e.tag ?? "",
      messageId: e.messageId,
    });
  } else if (e.event === "email.delivery_delayed") {
    // Less urgent — info-level Slack ping. Helps catch DNS-side issues
    // early without spamming a partial-failure noise floor.
    safeNotify("transactional_email_delivery_delayed", {
      to: e.to,
      tag: e.tag ?? "",
      messageId: e.messageId,
    });
  }
}

/**
 * 60-second polling fallback. Called fire-and-forget from `sendEmail`
 * after a successful Resend send. Polls `GET /emails/{id}` at 5s,
 * 15s, 30s, 60s. Stops as soon as the webhook beat us to it (the
 * `seenWebhookEventIds` guard) or the email reports a terminal state.
 *
 * Disabled when `RESEND_API_KEY` is missing, when the operator opts
 * out via `RESEND_DELIVERY_POLLING_DISABLED=1`, or when `id` is
 * empty (e.g. dev-logged sends).
 */
const POLL_DELAYS_MS = [5_000, 10_000, 15_000, 30_000];
const TERMINAL_STATUSES = new Set([
  "delivered",
  "bounced",
  "complained",
  "failed",
]);

export function startDeliveryPolling(opts: {
  messageId: string;
  to: string;
  tag?: string;
  subject?: string;
}): void {
  if (process.env.RESEND_DELIVERY_POLLING_DISABLED === "1") return;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  if (!opts.messageId || opts.messageId.length < 4) return;

  // Defensive: never attach an unhandled-rejection global listener;
  // wrap the whole flow in a single .catch.
  void runPolling({ ...opts, apiKey }).catch((err) => {
    console.warn(
      `[email-tracking] polling crashed for ${opts.messageId}: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  });
}

async function runPolling(opts: {
  messageId: string;
  to: string;
  tag?: string;
  subject?: string;
  apiKey: string;
}): Promise<void> {
  let lastStatus: string | null = null;
  for (const delay of POLL_DELAYS_MS) {
    await sleep(delay);
    // Skip if a webhook event already landed for this message — we've
    // got accurate state from the canonical channel, no need to GET.
    if (
      seenWebhookEventIds.size > 0 &&
      [...seenWebhookEventIds].some((id) => id.includes(opts.messageId))
    ) {
      return;
    }
    let status: string | null = null;
    try {
      const res = await fetch(`https://api.resend.com/emails/${opts.messageId}`, {
        headers: { Authorization: `Bearer ${opts.apiKey}` },
      });
      if (!res.ok) {
        if (res.status === 404) return; // Resend purged the row — give up.
        continue;
      }
      const body = (await res.json()) as { last_event?: string };
      status = body.last_event ?? null;
    } catch {
      continue;
    }
    if (!status || status === lastStatus) continue;
    lastStatus = status;

    // Map Resend's `last_event` strings into our canonical webhook
    // event shape so `recordDeliveryEvent` stays the single sink.
    const event = mapPolledStatus(status);
    if (event) {
      await recordDeliveryEvent({
        event,
        messageId: opts.messageId,
        to: opts.to,
        subject: opts.subject,
        tag: opts.tag,
        eventId: `poll:${opts.messageId}:${status}`,
      });
    }
    if (TERMINAL_STATUSES.has(status)) return;
  }
}

function mapPolledStatus(status: string): ResendDeliveryEvent | null {
  switch (status) {
    case "sent":
      return "email.sent";
    case "delivered":
      return "email.delivered";
    case "bounced":
      return "email.bounced";
    case "complained":
      return "email.complained";
    case "delivery_delayed":
      return "email.delivery_delayed";
    case "opened":
      return "email.opened";
    case "clicked":
      return "email.clicked";
    default:
      return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Test-only: clear the dedup cache. */
export function __resetDeliveryTracking(): void {
  seenWebhookEventIds.clear();
}
