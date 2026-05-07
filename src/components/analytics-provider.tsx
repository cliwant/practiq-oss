"use client";

/**
 * AnalyticsProvider — mounts pageview tracking + Tier 5 instrumentation.
 *
 * On mount we:
 *   1. Initialize PostHog SDK (session replay, autocapture, heatmaps)
 *      — no-op when NEXT_PUBLIC_POSTHOG_KEY isn't set.
 *   2. Capture first-touch attribution (UTM + referrer + landing page)
 *      to a 1-year cookie. Fires `attribution_captured` once per visitor.
 *   3. Update last-touch cookie when a fresh campaign URL arrives.
 *   4. Wire scroll-depth, time-on-page, exit-intent, and rage-click
 *      listeners for the current pathname.
 *   5. Fire $pageview on every App Router pathname/searchParams change.
 *
 * Engagement listeners are torn down + reinstalled per pathname so each
 * pageview gets a fresh scroll-depth set + time-on-page counter.
 */
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackPageview, trackClient } from "@/lib/analytics/track-client";
import {
  ensureFirstTouchCaptured,
  maybeUpdateLastTouch,
} from "@/lib/analytics/attribution";
import { installEngagementListeners } from "@/lib/analytics/engagement";
import { initPosthogSdk } from "@/lib/analytics/posthog-init";
import { WebVitals } from "@/components/web-vitals";
import { ErrorTracker } from "@/components/error-tracker";

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // One-time bootstrap (PostHog SDK + first-touch capture).
  useEffect(() => {
    initPosthogSdk();
    const { isNew, payload } = ensureFirstTouchCaptured();
    if (isNew) {
      trackClient({
        type: "attribution_captured",
        properties: {
          ...payload,
          // Flatten so SQL can `... AS first_touch_source` cleanly
          // alongside the typed first_touch_* columns.
          first_touch: payload,
        },
      });
    }
  }, []);

  // Per-route effects: pageview + last-touch refresh + engagement listeners.
  useEffect(() => {
    const url =
      typeof window !== "undefined" ? window.location.href : undefined;
    trackPageview(url);
    maybeUpdateLastTouch();
    const teardown = installEngagementListeners();
    return teardown;
    // pathname + searchParams together guarantee we re-fire on any
    // client-side navigation, including ?utm_* changes which matter
    // for attribution + campaign tracking.
  }, [pathname, searchParams]);

  return (
    <>
      <WebVitals />
      <ErrorTracker />
      {children}
    </>
  );
}
