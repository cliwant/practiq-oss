"use client";

/**
 * AnalyticsProvider — mounts the self-hosted page-view tracker.
 *
 * Why: src/lib/analytics/track-client.ts ships a `trackPageview()` beacon to
 * /api/events, but nothing in the tree was actually calling it on route
 * change. The result was that practiq.analytics_events stayed empty even
 * though the API route, taxonomy, and DB model all worked. This provider
 * fixes that gap by firing $pageview on initial mount AND on every App
 * Router pathname/search-params change.
 *
 * The beacon is dev-disabled (track-client.ts checks NODE_ENV) so localhost
 * doesn't pollute production metrics.
 */
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackPageview } from "@/lib/analytics/track-client";

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Fire-and-forget. Beacon is no-op outside production by design.
    const url =
      typeof window !== "undefined"
        ? window.location.href
        : undefined;
    trackPageview(url);
    // pathname + searchParams together guarantee we re-fire on any
    // client-side navigation, including ?utm_* changes which matter
    // for first-touch attribution.
  }, [pathname, searchParams]);

  return <>{children}</>;
}
