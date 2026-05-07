/**
 * Page-level engagement event helpers (Tier 5).
 *
 * Wires up:
 *   - scroll_depth_25 / 50 / 75 / 100 (once per page-view)
 *   - time_on_page (every 30s while document is visible)
 *   - exit_intent_detected (mouseleave on top edge)
 *   - rage_click_detected (3+ clicks within 1s on same element)
 *
 * Mount once per page-view via the AnalyticsProvider's pathname effect.
 * Returns a teardown to disconnect listeners on unmount/navigation.
 */
"use client";

import { trackClient } from "./track-client";

export function installEngagementListeners(): () => void {
  if (typeof window === "undefined") return () => {};

  const fired = { 25: false, 50: false, 75: false, 100: false } as Record<
    number,
    boolean
  >;

  const onScroll = () => {
    const doc = document.documentElement;
    const scrolled = window.scrollY + window.innerHeight;
    const total = Math.max(doc.scrollHeight, 1);
    const pct = Math.round((scrolled / total) * 100);
    for (const t of [25, 50, 75, 100] as const) {
      if (!fired[t] && pct >= t) {
        fired[t] = true;
        trackClient({
          type: `scroll_depth_${t}` as
            | "scroll_depth_25"
            | "scroll_depth_50"
            | "scroll_depth_75"
            | "scroll_depth_100",
          properties: { percent: pct, path: window.location.pathname },
        });
      }
    }
  };

  // Time-on-page: tick every 30s while visible.
  let visibleSeconds = 0;
  let lastTick = Date.now();
  const tick = () => {
    if (document.visibilityState !== "visible") {
      lastTick = Date.now();
      return;
    }
    const now = Date.now();
    const delta = Math.floor((now - lastTick) / 1000);
    lastTick = now;
    visibleSeconds += delta;
    trackClient({
      type: "time_on_page",
      properties: {
        visible_seconds: visibleSeconds,
        path: window.location.pathname,
      },
    });
  };
  const timeInterval = window.setInterval(tick, 30_000);

  // Exit intent: mouse leaves through the top edge.
  let exitFired = false;
  const onMouseOut = (e: MouseEvent) => {
    if (exitFired) return;
    if (e.relatedTarget) return;
    if (e.clientY > 8) return;
    exitFired = true;
    trackClient({
      type: "exit_intent_detected",
      properties: { path: window.location.pathname },
    });
  };

  // Rage clicks: 3+ in 1s on the same element.
  let lastEl: EventTarget | null = null;
  let burst: number[] = [];
  const onClick = (e: MouseEvent) => {
    const now = Date.now();
    if (e.target !== lastEl) {
      burst = [];
      lastEl = e.target;
    }
    burst = burst.filter((t) => now - t < 1000);
    burst.push(now);
    if (burst.length >= 3) {
      const el = e.target as HTMLElement | null;
      const sel = el
        ? (el.id ? `#${el.id}` : el.tagName.toLowerCase()) +
          (el.className && typeof el.className === "string"
            ? "." + el.className.split(" ").slice(0, 2).join(".")
            : "")
        : "unknown";
      trackClient({
        type: "rage_click_detected",
        properties: { selector: sel, path: window.location.pathname, count: burst.length },
      });
      burst = []; // throttle
    }
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  document.addEventListener("mouseout", onMouseOut);
  document.addEventListener("click", onClick, true);
  // Fire scroll once on mount to catch already-scrolled pages.
  onScroll();

  return () => {
    window.removeEventListener("scroll", onScroll);
    document.removeEventListener("mouseout", onMouseOut);
    document.removeEventListener("click", onClick, true);
    window.clearInterval(timeInterval);
  };
}
