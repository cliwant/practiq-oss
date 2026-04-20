/**
 * A/B Test Framework — cookie-based variant assignment + Supabase logging.
 *
 * Design:
 *  - Visitor gets a stable variant on first visit (via cookie), keeps it.
 *  - Variant assignment is deterministic per visitor ID (not random per load)
 *    so the visitor sees the same variant on subsequent pages.
 *  - All exposure + conversion events log to Supabase `ab_test_events`.
 *
 * Usage (server component):
 *   const variant = await getVariant("landing_hero_v1", ["control", "benefit_lead"]);
 *
 * Usage (API route for conversion):
 *   await logConversion(visitorId, "landing_hero_v1", "waitlist_signup");
 *
 * Supabase table (apply via ab_test_events migration):
 *   create table if not exists ab_test_events (
 *     id uuid primary key default gen_random_uuid(),
 *     visitor_id text not null,
 *     test_id text not null,
 *     variant text not null,
 *     event_type text not null,  -- 'exposure' | 'conversion'
 *     event_name text,           -- null for exposure, descriptive for conversion
 *     metadata jsonb default '{}',
 *     created_at timestamptz not null default now()
 *   );
 *   create index ab_test_events_visitor on ab_test_events (visitor_id);
 *   create index ab_test_events_test on ab_test_events (test_id, variant);
 */

import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const VISITOR_COOKIE = "practiq_visitor";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function generateVisitorId(): string {
  // crypto.randomUUID is available in Node.js 19+ and all modern runtimes
  return `v_${crypto.randomUUID()}`;
}

export async function getOrCreateVisitorId(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(VISITOR_COOKIE);
  if (existing) return existing.value;

  const newId = generateVisitorId();
  // Note: can't set cookies in server component context directly;
  // the cookie will be set via middleware or the API route that first encounters a visitor.
  return newId;
}

/**
 * Hash a string to a number in [0, 1) deterministically.
 * Used for stable variant assignment.
 */
function hashToUnit(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash << 5) - hash + s.charCodeAt(i);
    hash |= 0; // force 32-bit int
  }
  return Math.abs(hash) / 2147483647;
}

/**
 * Assign a variant deterministically based on visitorId + testId.
 * Same visitor always gets the same variant for the same test.
 */
export function assignVariant<T extends string>(
  visitorId: string,
  testId: string,
  variants: T[]
): T {
  if (variants.length === 0) throw new Error("Variants array is empty");
  const idx = Math.floor(hashToUnit(`${visitorId}:${testId}`) * variants.length);
  return variants[Math.min(idx, variants.length - 1)];
}

/**
 * Log an event to Supabase. Fire-and-forget — errors are swallowed.
 */
async function logEvent(
  visitorId: string,
  testId: string,
  variant: string,
  eventType: "exposure" | "conversion",
  eventName?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SECRET_KEY;
    if (!supabaseUrl || !supabaseKey) return;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    await supabase.from("ab_test_events").insert({
      visitor_id: visitorId,
      test_id: testId,
      variant,
      event_type: eventType,
      event_name: eventName ?? null,
      metadata: metadata ?? {},
    });
  } catch {
    // Swallow — A/B logging should never break user experience.
  }
}

export async function logExposure(
  visitorId: string,
  testId: string,
  variant: string
): Promise<void> {
  return logEvent(visitorId, testId, variant, "exposure");
}

export async function logConversion(
  visitorId: string,
  testId: string,
  variant: string,
  eventName: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  return logEvent(visitorId, testId, variant, "conversion", eventName, metadata);
}

/**
 * Cookie helpers for API routes / middleware / client actions.
 */
export const VISITOR_COOKIE_NAME = VISITOR_COOKIE;
export const VISITOR_COOKIE_OPTIONS = {
  maxAge: COOKIE_MAX_AGE,
  httpOnly: false, // readable by client for client-side exposure events
  sameSite: "lax" as const,
  secure: true,
  path: "/",
};
