"use client";

/**
 * WebVitals — Core Web Vitals capture (LCP, FID/INP, CLS, FCP, TTFB).
 *
 * Wired via Next 15's useReportWebVitals hook. Each metric fires
 * `web_vital_captured` at a 10% sample rate so we don't blow out the
 * analytics_events table — the goal is correlation against funnel
 * conversion, not page-by-page profiling.
 *
 * The event flows through /api/events into practiq.analytics_events
 * AND mirrors to PostHog via the server-side trackEvents pipeline.
 */
import { useReportWebVitals } from "next/web-vitals";
import { trackClient } from "@/lib/analytics/track-client";

const SAMPLE_RATE = 0.1; // 10%

export function WebVitals() {
  useReportWebVitals((metric) => {
    // Sample at the call site so we don't even build the payload
    // for the 90% case.
    if (Math.random() > SAMPLE_RATE) return;
    trackClient({
      type: "web_vital_captured",
      properties: {
        name: metric.name,
        value: metric.value,
        rating: metric.rating, // "good" | "needs-improvement" | "poor"
        navigation_type: metric.navigationType,
        delta: metric.delta,
        id: metric.id,
      },
    });
  });
  return null;
}
