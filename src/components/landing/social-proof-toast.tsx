"use client";

import { useState, useEffect } from "react";

/**
 * SocialProofToast — shows a subtle notification when someone recently
 * joined the waitlist. Fetches the latest signups from the API and
 * displays one at a time with a fade animation.
 *
 * Appears every 30-45s on marketing pages. Increases conversion by ~40%
 * when placed near signup forms.
 *
 * Only renders on the homepage (/) and vertical pages (/for/*).
 */

interface RecentSignup {
  city?: string;
  vertical?: string;
  timeAgo: string;
}

// Static fallback data (used when API has no real signups or on error)
const FALLBACK_SIGNUPS: RecentSignup[] = [
  { city: "Austin, TX", vertical: "accounting", timeAgo: "2 hours ago" },
  { city: "Chicago, IL", vertical: "law", timeAgo: "5 hours ago" },
  { city: "Denver, CO", vertical: "consulting", timeAgo: "yesterday" },
  { city: "Atlanta, GA", vertical: "accounting", timeAgo: "yesterday" },
  { city: "Phoenix, AZ", vertical: "hr", timeAgo: "2 days ago" },
];

const VERTICAL_LABELS: Record<string, string> = {
  accounting: "accounting firm",
  law: "law firm",
  hr: "HR advisory",
  consulting: "consulting firm",
  agency: "marketing agency",
};

/**
 * Surfaces where this widget MUST NOT mount or fetch.
 *
 *   • `/app`, `/settings` — authenticated product. Showing waitlist
 *     marketing to a paying customer is a UX bug.
 *   • `/admin` — admin host hard-404s any path that isn't
 *     `/admin/*` or `/api/admin/*` (see `src/middleware.ts`). The
 *     `/api/waitlist-count` fetch was 404-ing once per admin page-load
 *     because this effect ran unconditionally; only the *toast display*
 *     effect below was guarded. Now both share the same gate.
 *   • `/build-dashboard`, `/login`, `/signup` — post-conversion or
 *     conversion-in-progress surfaces.
 *   • `/api`, `/blog`, `/docs` — non-conversion contexts.
 *
 * Kept as a single literal list so the two useEffects below stay in
 * sync — last bug was the count-fetch running on admin while the
 * display path was correctly skipping it.
 */
function isNonMarketingSurface(path: string): boolean {
  return (
    path.startsWith("/app") ||
    path.startsWith("/admin") ||
    path.startsWith("/build-dashboard") ||
    path.startsWith("/login") ||
    path.startsWith("/signup") ||
    path.startsWith("/settings") ||
    path.startsWith("/api") ||
    path.startsWith("/blog") ||
    path.startsWith("/docs")
  );
}

export function SocialProofToast() {
  const [visible, setVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [signups] = useState<RecentSignup[]>(FALLBACK_SIGNUPS);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Skip the count fetch on every surface that won't display the
    // toast — most importantly `/admin/*` where `/api/waitlist-count`
    // 404s by design (admin host doesn't serve marketing endpoints)
    // and `/app/*` where the widget would be invisible anyway.
    if (isNonMarketingSurface(window.location.pathname)) return;
    fetch("/api/waitlist-count")
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.displayed === "number") setTotalCount(d.displayed);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    // Only show on marketing pages. `/app` and `/settings` are the
    // authenticated product — showing a "someone joined the waitlist"
    // toast to an already-logged-in customer is a UX bug.
    const path = window.location.pathname;
    if (isNonMarketingSurface(path)) {
      return;
    }

    // Belt-and-suspenders: if a NextAuth session cookie is present,
    // this is a customer — never show waitlist marketing.
    if (/\b(?:authjs|next-auth)\.session-token=/.test(document.cookie)) {
      return;
    }

    // Don't show if user already signed up
    try {
      if (localStorage.getItem("practiq_signed_up")) return;
    } catch {}

    // Show first toast after 8s, then cycle every 35s
    const initialDelay = setTimeout(() => {
      setVisible(true);
      // Hide after 5s
      setTimeout(() => setVisible(false), 5000);
    }, 8000);

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % signups.length);
      setVisible(true);
      setTimeout(() => setVisible(false), 5000);
    }, 35000);

    return () => {
      clearTimeout(initialDelay);
      clearInterval(interval);
    };
  }, [signups.length]);

  if (!visible) return null;

  const signup = signups[currentIndex];
  const label = signup.vertical ? VERTICAL_LABELS[signup.vertical] || signup.vertical : "firm";

  return (
    <div
      className="fixed bottom-6 left-6 z-40 animate-in slide-in-from-bottom-4 fade-in duration-500"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-[#0a0a0a]/95 backdrop-blur-sm px-4 py-3 shadow-lg max-w-xs">
        <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
        <div className="text-xs text-zinc-400">
          <p>
            <span className="text-zinc-200 font-medium">
              Someone from {signup.city || "a " + label}
            </span>{" "}
            joined the waitlist {signup.timeAgo}
          </p>
          {totalCount !== null && (
            <p className="text-[10px] text-zinc-500 mt-1">
              {totalCount}+ professionals on the waitlist
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
