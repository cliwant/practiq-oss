/**
 * First-touch + last-touch attribution (Tier 5).
 *
 * On the first page load with no `practiq_first_touch` cookie, we capture:
 *   - utm_source / utm_medium / utm_campaign / utm_term / utm_content
 *   - referrer (document.referrer)
 *   - landing_page (current pathname)
 *   - landing_timestamp (ISO)
 *
 * These persist for 1 year and ride along on every subsequent event as
 * `first_touch.*` properties. A separate `practiq_last_touch` cookie
 * (30 days) updates whenever a NEW campaign hits the site so we can
 * separate first-touch credit from most-recent-touch credit.
 */
"use client";

const FIRST_TOUCH_COOKIE = "practiq_first_touch";
const LAST_TOUCH_COOKIE = "practiq_last_touch";
const FIRST_TOUCH_TTL_DAYS = 365;
const LAST_TOUCH_TTL_DAYS = 30;

export interface TouchPayload {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  referrer?: string;
  landing_page?: string;
  landing_timestamp?: string;
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(
    new RegExp(
      "(?:^|; )" + name.replace(/[.$?*|{}()[\]\\/+^]/g, "\\$&") + "=([^;]+)",
    ),
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

function readUtmFromUrl(): Partial<TouchPayload> {
  if (typeof window === "undefined") return {};
  const url = new URL(window.location.href);
  const out: Partial<TouchPayload> = {};
  for (const k of [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
  ] as const) {
    const v = url.searchParams.get(k);
    if (v) out[k] = v;
  }
  return out;
}

export function readFirstTouch(): TouchPayload | null {
  const raw = readCookie(FIRST_TOUCH_COOKIE);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TouchPayload;
  } catch {
    return null;
  }
}

export function readLastTouch(): TouchPayload | null {
  const raw = readCookie(LAST_TOUCH_COOKIE);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TouchPayload;
  } catch {
    return null;
  }
}

/**
 * Idempotent: returns true if a NEW first-touch was just captured (so the
 * caller can fire `attribution_captured`). Returns false if a first-touch
 * cookie already exists.
 */
export function ensureFirstTouchCaptured(): {
  isNew: boolean;
  payload: TouchPayload;
} {
  if (typeof window === "undefined") {
    return { isNew: false, payload: {} };
  }
  const existing = readFirstTouch();
  if (existing) return { isNew: false, payload: existing };

  const utm = readUtmFromUrl();
  const payload: TouchPayload = {
    ...utm,
    referrer: document.referrer || undefined,
    landing_page: window.location.pathname,
    landing_timestamp: new Date().toISOString(),
  };
  writeCookie(FIRST_TOUCH_COOKIE, JSON.stringify(payload), FIRST_TOUCH_TTL_DAYS);
  // Seed last-touch from same payload on first ever visit.
  writeCookie(LAST_TOUCH_COOKIE, JSON.stringify(payload), LAST_TOUCH_TTL_DAYS);
  return { isNew: true, payload };
}

/**
 * Update last-touch ONLY when the URL has UTMs or a new external referrer
 * indicating a fresh campaign hit. No-op for internal navigations.
 */
export function maybeUpdateLastTouch(): TouchPayload | null {
  if (typeof window === "undefined") return null;
  const utm = readUtmFromUrl();
  const hasUtm = Object.keys(utm).length > 0;
  if (!hasUtm) return null;
  const payload: TouchPayload = {
    ...utm,
    referrer: document.referrer || undefined,
    landing_page: window.location.pathname,
    landing_timestamp: new Date().toISOString(),
  };
  writeCookie(LAST_TOUCH_COOKIE, JSON.stringify(payload), LAST_TOUCH_TTL_DAYS);
  return payload;
}
