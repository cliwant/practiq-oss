/**
 * POST /api/webhooks/resend — Resend delivery-event webhook (P0-05).
 *
 * Resend uses Svix to deliver webhooks. Each request carries headers:
 *
 *   - `svix-id`        — unique delivery id (used for idempotency)
 *   - `svix-timestamp` — unix epoch seconds (replay-window check)
 *   - `svix-signature` — `v1,base64sig` HMAC-SHA256 over
 *                         `<svix-id>.<svix-timestamp>.<raw-body>`
 *
 * We verify the signature with `RESEND_WEBHOOK_SECRET` (whsec_…),
 * reject anything outside a 5-minute timestamp tolerance, and route
 * the typed payload through `recordDeliveryEvent` so analytics +
 * Slack alerts are uniform with the polling fallback path.
 *
 * Non-blocking: even if Slack is down or the AnalyticsEvent insert
 * fails, the webhook returns 200 so Resend doesn't retry forever
 * and pile up. The recorder logs failures internally.
 *
 * Setup:
 *   1. Resend dashboard → Webhooks → Add endpoint
 *      → URL: https://practiq.dev/api/webhooks/resend
 *      → Events: email.sent / .delivered / .bounced / .complained /
 *                .delivery_delayed / .opened / .clicked
 *   2. Copy the signing secret (whsec_…) into RESEND_WEBHOOK_SECRET.
 *   3. Done — every send tagged via `sendEmail` will be tracked.
 */
import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import {
  recordDeliveryEvent,
  type ResendDeliveryEvent,
} from "@/lib/email/tracking";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

const FIVE_MINUTES_SEC = 5 * 60;

interface ResendWebhookBody {
  type?: string;
  created_at?: string;
  data?: {
    email_id?: string;
    to?: string | string[];
    subject?: string;
    tags?: Array<{ name: string; value: string }> | Record<string, string>;
    bounce?: { type?: string; subType?: string; message?: string };
  };
}

export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET ?? "";
  if (!secret || !secret.startsWith("whsec_")) {
    // Misconfigured — return 200 so Resend doesn't retry, but log so
    // ops can see the misconfiguration.
    console.warn(
      "[resend-webhook] RESEND_WEBHOOK_SECRET missing or malformed; webhook events are being dropped",
    );
    return NextResponse.json({ ok: true, ignored: true });
  }

  const svixId = request.headers.get("svix-id");
  const svixTs = request.headers.get("svix-timestamp");
  const svixSig = request.headers.get("svix-signature");
  if (!svixId || !svixTs || !svixSig) {
    return NextResponse.json(
      { error: "missing svix headers" },
      { status: 400 },
    );
  }

  const tsNum = Number.parseInt(svixTs, 10);
  if (!Number.isFinite(tsNum)) {
    return NextResponse.json(
      { error: "invalid svix-timestamp" },
      { status: 400 },
    );
  }
  const skewSec = Math.abs(Math.floor(Date.now() / 1000) - tsNum);
  if (skewSec > FIVE_MINUTES_SEC) {
    return NextResponse.json(
      { error: "stale webhook (replay protection)" },
      { status: 400 },
    );
  }

  const raw = await request.text();
  if (!verifySvixSignature({ secret, svixId, svixTs, raw, signatureHeader: svixSig })) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let body: ResendWebhookBody;
  try {
    body = JSON.parse(raw) as ResendWebhookBody;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const event = body.type as ResendDeliveryEvent | undefined;
  const messageId = body.data?.email_id;
  if (!event || !messageId || !isResendDeliveryEvent(event)) {
    // Acknowledge unknown event types so Resend doesn't retry; just
    // log so we notice if the API gains a new event.
    console.warn(`[resend-webhook] unknown event ${event ?? "(none)"}`);
    return NextResponse.json({ ok: true, ignored: true });
  }

  const to = pickTo(body.data?.to);
  const tag = body.data?.tags ? pickTag(body.data.tags) : undefined;

  await recordDeliveryEvent({
    event,
    messageId,
    to,
    subject: body.data?.subject,
    tag,
    bounceType: body.data?.bounce?.type,
    eventTimestamp: body.created_at,
    eventId: svixId,
  });

  return NextResponse.json({ ok: true });
}

/**
 * Svix signature verification — manual implementation to avoid
 * pulling in the full `svix` SDK for one route. See
 * https://docs.svix.com/receiving/verifying-payloads/how-manual.
 */
function verifySvixSignature(opts: {
  secret: string;
  svixId: string;
  svixTs: string;
  raw: string;
  signatureHeader: string;
}): boolean {
  // The signing secret is base64 (without the whsec_ prefix).
  const secretB64 = opts.secret.startsWith("whsec_")
    ? opts.secret.slice("whsec_".length)
    : opts.secret;
  let secretBytes: Buffer;
  try {
    secretBytes = Buffer.from(secretB64, "base64");
  } catch {
    return false;
  }
  const signedPayload = `${opts.svixId}.${opts.svixTs}.${opts.raw}`;
  const expected = createHmac("sha256", secretBytes)
    .update(signedPayload)
    .digest("base64");

  // Header may carry multiple `v1,…` signatures separated by spaces
  // (Svix supports key rotation). We accept any one matching.
  const candidates = opts.signatureHeader
    .split(" ")
    .map((s) => s.trim())
    .filter((s) => s.startsWith("v1,"))
    .map((s) => s.slice("v1,".length));

  for (const candidate of candidates) {
    if (candidate.length !== expected.length) continue;
    try {
      if (
        timingSafeEqual(Buffer.from(candidate), Buffer.from(expected))
      ) {
        return true;
      }
    } catch {
      // Length mismatch — try the next candidate.
    }
  }
  return false;
}

function isResendDeliveryEvent(t: string): t is ResendDeliveryEvent {
  return (
    t === "email.sent" ||
    t === "email.delivered" ||
    t === "email.bounced" ||
    t === "email.complained" ||
    t === "email.delivery_delayed" ||
    t === "email.opened" ||
    t === "email.clicked"
  );
}

function pickTo(to: unknown): string {
  if (typeof to === "string") return to;
  if (Array.isArray(to) && typeof to[0] === "string") return to[0];
  return "";
}

function pickTag(
  tags: ResendWebhookBody["data"] extends infer D
    ? D extends { tags?: infer T }
      ? T
      : never
    : never,
): string | undefined {
  if (!tags) return undefined;
  if (Array.isArray(tags)) {
    const cat = tags.find((t) => t.name === "category");
    return cat?.value;
  }
  if (typeof tags === "object") {
    const obj = tags as Record<string, string>;
    return obj.category;
  }
  return undefined;
}
