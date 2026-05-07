/**
 * POST /api/events  — analytics ingestion endpoint
 *
 * Receives beacons from src/lib/analytics/track-client.ts and writes
 * them to the practiq.analytics_events table via Prisma.
 *
 * Anti-abuse:
 *   - in-memory rate limit at 60 events/minute per IP. Real bursts come
 *     from real users (e.g. 10 pageviews + several clicks during a
 *     session); higher than that is almost always a misconfigured loop
 *     or a spammer trying to seed our analytics with garbage.
 *   - allowed-event-name list (anything outside the taxonomy is
 *     silently dropped; we DON'T 400 because we don't want to leak
 *     the schema to a probing client).
 *
 * Privacy:
 *   - The IP is hashed (sha256, daily salt) before storage. We never
 *     persist raw IP. The hashed value is enough to estimate uniques
 *     within a day-window without GDPR exposure.
 *   - User-agent is stored as-is (stable browser fingerprint info,
 *     same as web server logs would have).
 */
import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { auth } from "@/lib/auth";
import { trackEvents, type AnalyticsEventName } from "@/lib/analytics/track";
import { checkRateLimit, identityFromRequest } from "@/lib/rate-limit";

export const runtime = "nodejs";

/** Allow-list of valid event types — keep in sync with track.ts taxonomy. */
const ALLOWED: ReadonlySet<AnalyticsEventName> = new Set<AnalyticsEventName>([
  "$pageview",
  "pricing_cta_clicked",
  "signup_form_submitted",
  "signup_blocked",
  "signup_completed",
  "first_client_created",
  "first_chat_message_sent",
  "sample_data_dismissed",
  "approval_queue_opened",
  "checkout_initiated",
  "checkout_completed",
  "stripe_checkout_abandoned",
  "subscription_canceled",
  "founding_slot_claimed",
  "founding_slot_exhausted",
  "plan_gate_blocked",
  "chat_quota_warned",
  "chat_quota_blocked",
  "chat_started",
  "approval_decision",
  "client_workspace_opened",
  "login_completed",
  "password_reset_requested",
  "agent_run_failed",
  "agent_run_succeeded",
  "external_api_error",
  "citation_parse_failed",
  // Tier 5 — attribution + engagement + form-field telemetry
  "attribution_captured",
  "posthog_session_replay_started",
  "scroll_depth_25",
  "scroll_depth_50",
  "scroll_depth_75",
  "scroll_depth_100",
  "time_on_page",
  "exit_intent_detected",
  "rage_click_detected",
  "form_field_focused",
  "form_field_blurred",
  "form_validation_failed",
  "form_submitted",
]);

interface ClientPayload {
  type?: string;
  properties?: Record<string, unknown>;
  url?: string;
  referrer?: string | null;
  distinctId?: string | null;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
  firstTouch?: {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_term?: string;
    utm_content?: string;
    referrer?: string;
    landing_page?: string;
    landing_timestamp?: string;
  };
  viewport?: { width?: number; height?: number };
}

function deviceTypeFromUserAgent(ua: string | null): string | null {
  if (!ua) return null;
  const s = ua.toLowerCase();
  if (/(ipad|tablet|playbook|silk)|(android(?!.*mobi))/i.test(s)) return "tablet";
  if (/mobile|iphone|ipod|android.*mobi|blackberry|iemobile|opera mini/i.test(s))
    return "mobile";
  return "desktop";
}

interface BatchPayload {
  events?: ClientPayload[];
}

const DAILY_SALT = (process.env.ANALYTICS_IP_SALT?.trim() ||
  process.env.NEXTAUTH_SECRET ||
  "practiq-default-salt").toString();

function hashIp(ip: string): string {
  const today = new Date().toISOString().slice(0, 10);
  return crypto
    .createHash("sha256")
    .update(`${ip}::${today}::${DAILY_SALT}`)
    .digest("hex")
    .slice(0, 16);
}

function getClientIp(request: NextRequest): string | null {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    null
  );
}

export async function POST(request: NextRequest) {
  // Rate limit before parsing JSON so a flood doesn't even reach
  // the body-parser. 60 events/min/IP — real visitors don't burst
  // higher in normal use.
  const rl = await checkRateLimit({
    namespace: "events/ingest",
    identity: identityFromRequest(request),
    limit: 60,
    windowMs: 60 * 1000,
  });
  if (!rl.allowed) {
    // Silent 204 — don't tell the abuser they hit our limit.
    return new NextResponse(null, { status: 204 });
  }

  let body: ClientPayload | BatchPayload | null = null;
  try {
    body = (await request.json()) as ClientPayload | BatchPayload;
  } catch {
    return new NextResponse(null, { status: 204 });
  }
  if (!body) return new NextResponse(null, { status: 204 });

  // Accept both single event + batch (the beacon may flush several at once).
  const events: ClientPayload[] =
    "events" in body && Array.isArray(body.events)
      ? body.events
      : [body as ClientPayload];

  if (events.length === 0 || events.length > 50) {
    // Reject silly batch sizes — humans don't push >50 events per beacon.
    return new NextResponse(null, { status: 204 });
  }

  const ip = getClientIp(request);
  const ipHash = ip ? hashIp(ip) : null;
  const userAgent = request.headers.get("user-agent");
  // Server-side enrichment (Tier 5) — Vercel injects geo headers.
  const geoCountry =
    request.headers.get("x-vercel-ip-country") ||
    request.headers.get("cf-ipcountry") ||
    null;
  const geoRegion =
    request.headers.get("x-vercel-ip-country-region") || null;
  const geoCity = request.headers.get("x-vercel-ip-city") || null;
  const deviceType = deviceTypeFromUserAgent(userAgent);
  const serverReferrer = request.headers.get("referer") || null;

  // If the user is signed in we promote userId onto every event;
  // anon events stay distinctId-only.
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const filtered = events
    .filter((e) => typeof e.type === "string" && ALLOWED.has(e.type as AnalyticsEventName))
    .map((e) => ({
      type: e.type as AnalyticsEventName,
      distinctId: e.distinctId ?? null,
      userId,
      properties: e.properties ?? {},
      url: e.url ?? null,
      referrer: e.referrer ?? serverReferrer,
      userAgent,
      ipHash,
      utmSource: e.utm?.source ?? null,
      utmMedium: e.utm?.medium ?? null,
      utmCampaign: e.utm?.campaign ?? null,
      utmTerm: e.utm?.term ?? null,
      utmContent: e.utm?.content ?? null,
      firstTouchUtmSource: e.firstTouch?.utm_source ?? null,
      firstTouchUtmMedium: e.firstTouch?.utm_medium ?? null,
      firstTouchUtmCampaign: e.firstTouch?.utm_campaign ?? null,
      firstTouchReferrer: e.firstTouch?.referrer ?? null,
      firstTouchLandingPage: e.firstTouch?.landing_page ?? null,
      geoCountry,
      geoRegion,
      geoCity,
      deviceType,
      viewportWidth: e.viewport?.width ?? null,
      viewportHeight: e.viewport?.height ?? null,
    }));

  if (filtered.length === 0) return new NextResponse(null, { status: 204 });

  await trackEvents(filtered);
  // 204 No Content keeps the beacon path lean.
  return new NextResponse(null, { status: 204 });
}
