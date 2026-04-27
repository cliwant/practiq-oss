/**
 * Self-hosted product analytics — browser-side beacon.
 *
 * The client tracks a stable visitor distinctId in a cookie
 * (practiq_visitor, set by middleware on first visit), and POSTs
 * events to /api/events. The server route writes them to the same
 * `analytics_events` table that server-side track.ts uses.
 *
 * Two design choices worth flagging:
 *
 * 1. **Cookie-not-localStorage** for the distinctId. Cookies survive
 *    Safari ITP better, work in private windows where localStorage
 *    is partitioned, and let the server stamp the same id on
 *    server-side events without a round-trip — unifying the funnel.
 *
 * 2. **Beacon API** preferred over fetch() because it survives the
 *    page-unload race (e.g. user clicks an outbound link mid-event).
 *    fetch is the fallback when navigator.sendBeacon isn't available.
 *
 * UTM persistence: first-touch attribution. We capture utm_* params
 * from the URL on first page load and stash them in a cookie that
 * lives until signup or 90 days. Subsequent events automatically
 * promote those values into the event row via /api/events.
 *
 * Identify-merge: when a user signs up, we don't lose pre-signup
 * activity. The cookie distinctId stays the same; the server simply
 * starts associating a userId column on subsequent events. SQL joins
 * across distinctId close the loop.
 *
 * Dev-mode opt-out: NODE_ENV !== "production" disables the beacon so
 * localhost noise doesn't pollute the production metrics stream.
 */

const ENDPOINT = "/api/events";
const VISITOR_COOKIE = "practiq_visitor";
const UTM_COOKIE = "practiq_utm";
const UTM_TTL_DAYS = 90;

type EventName = string; // typed exhaustively in track.ts (server)

interface ClientEventPayload {
  type: EventName;
  properties?: Record<string, unknown>;
  /** Override the page URL (defaults to window.location.href). */
  url?: string;
}

interface UtmContext {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
}

function isProduction(): boolean {
  if (typeof process === "undefined") return false;
  return process.env.NODE_ENV === "production";
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(
    new RegExp("(?:^|; )" + name.replace(/[.$?*|{}()[\]\\/+^]/g, "\\$&") + "=([^;]+)"),
  );
  return m ? decodeURIComponent(m[1]) : null;
}

function writeCookie(name: string, value: string, ttlDays: number): void {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
  document.cookie =
    `${name}=${encodeURIComponent(value)};` +
    `expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

/** Visitor id — set by middleware on first request. */
function getDistinctId(): string | null {
  return readCookie(VISITOR_COOKIE);
}

/**
 * Read UTM params from the URL, persist as first-touch attribution.
 * Returns the persisted values for the current event payload.
 */
function captureUtm(): UtmContext {
  if (typeof window === "undefined") return {};
  const cached = readCookie(UTM_COOKIE);
  // Re-parse current URL to see if there are NEW utm_* params; first-
  // touch wins, but if we have no cookie yet and the current URL has
  // params, we capture them.
  const current = new URL(window.location.href);
  const fromUrl: UtmContext = {};
  for (const k of ["source", "medium", "campaign", "term", "content"] as const) {
    const v = current.searchParams.get(`utm_${k}`);
    if (v) fromUrl[k] = v;
  }
  if (cached) {
    try {
      return JSON.parse(cached) as UtmContext;
    } catch {
      // Corrupt cookie — overwrite below.
    }
  }
  if (Object.keys(fromUrl).length > 0) {
    writeCookie(UTM_COOKIE, JSON.stringify(fromUrl), UTM_TTL_DAYS);
    return fromUrl;
  }
  return {};
}

/**
 * Fire a single event. Returns void immediately — never blocks the
 * caller. Failures swallowed (analytics must not break the app).
 */
export function trackClient(payload: ClientEventPayload): void {
  if (typeof window === "undefined") return;
  if (!isProduction()) return; // dev opt-out

  const utm = captureUtm();
  const body = JSON.stringify({
    type: payload.type,
    properties: payload.properties ?? {},
    url: payload.url ?? window.location.href,
    referrer: document.referrer || null,
    distinctId: getDistinctId(),
    utm,
  });

  // Beacon API: survives page-unload races. Fall back to fetch() with
  // keepalive for older browsers (Safari < 13 etc.).
  if ("sendBeacon" in navigator) {
    try {
      const ok = navigator.sendBeacon(
        ENDPOINT,
        new Blob([body], { type: "application/json" }),
      );
      if (ok) return;
    } catch {
      // Fall through to fetch
    }
  }

  // Fallback. keepalive: true ensures the request continues if the
  // page navigates away mid-request (capped at 64KB by spec).
  fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    // Silent — analytics failures shouldn't surface to users.
  });
}

/**
 * Page-view tracker. Call once on initial mount and on every route
 * change in your <AnalyticsProvider>. Practiq's provider mounts in
 * src/components/analytics-provider.tsx.
 */
export function trackPageview(url?: string): void {
  trackClient({ type: "$pageview", url });
}

/**
 * Backwards-compat shim — old PostHog code called `trackEvent(name, props)`.
 * @deprecated Use `trackClient({ type, properties })` directly.
 */
export function trackEvent(
  name: EventName,
  properties?: Record<string, unknown>,
): void {
  trackClient({ type: name, properties });
}
