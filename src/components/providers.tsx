"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import { PosthogProvider } from "@/components/posthog-provider";
import { AnalyticsProvider } from "@/components/analytics-provider";

/**
 * Why this branches on pathname:
 *
 * The admin surface (`admin.grindworks.ai/admin/*`) is host-locked by
 * middleware so every non-admin path on that host hard-404s — including
 * `/api/auth/session`, `/api/events`, and `/api/waitlist-count`. The
 * shared client bundle that ships with the root layout used to mount
 * NextAuth's `<SessionProvider>` and our `<AnalyticsProvider>` on EVERY
 * route, which caused two pollutants on admin:
 *
 *   1. `<SessionProvider>` polls `/api/auth/session` on mount + every
 *      few minutes thereafter. On admin that's a permanent 404 stream
 *      and a `J: Unexpected end of JSON input` from Auth.js trying to
 *      parse the 404 HTML body. R2/R3 dogfood caught ~30 console
 *      errors per admin navigation from this alone.
 *   2. `<AnalyticsProvider>` fires `/api/events` beacons on every
 *      pageview. On admin every beacon 404s and PostHog session-replay
 *      eats operator PII quota for no marketing reason.
 *
 * Admin has its own HMAC-signed `verifySession()` flow (see
 * `src/lib/admin-auth.ts`) — it never needs Auth.js. So we simply
 * don't mount those providers under `/admin/*`. The admin layout
 * still gets a clean React tree; the bundle still ships the modules
 * (no point splitting code for an operator-only surface), but at
 * runtime the actual network polls / SDK init never fire.
 *
 * Public marketing routes (`/`, `/blog`, `/pricing`, …) and the
 * authenticated product (`/app/*`, `/settings/*`) keep the full
 * provider stack — they ARE on practiq.dev where `/api/auth/session`
 * and `/api/events` both exist and return real responses.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin") ?? false;

  if (isAdminRoute) {
    // Admin: no Auth.js, no public-bundle analytics. Children render
    // bare. Admin's own auth lives in middleware + verifySession().
    return <>{children}</>;
  }

  return (
    <SessionProvider>
      <PosthogProvider>
        {/* Suspense required because AnalyticsProvider uses
            useSearchParams() which forces dynamic rendering otherwise. */}
        <Suspense fallback={null}>
          <AnalyticsProvider>{children}</AnalyticsProvider>
        </Suspense>
      </PosthogProvider>
    </SessionProvider>
  );
}
