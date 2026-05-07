/**
 * Client-side PostHog provider.
 *
 * Mounts at the root layout, initializes posthog-js, captures the first
 * pageview + UTM params, and re-fires pageview on route changes for
 * Next.js App Router (where soft navigations don't trigger a hard reload
 * and posthog's auto-pageview wouldn't fire on its own).
 *
 * Also identifies the authenticated user when a NextAuth session
 * resolves so client + server distinct_ids stitch together. Pre-auth
 * pageviews link to the authed timeline via the alias() inside
 * identifyUser().
 */
"use client";

import { useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  initPosthog,
  capturePageview,
  identifyUser,
} from "@/lib/analytics/posthog-client";

// Group analytics: PostHog group() lets us roll up users by firm so
// dashboards can answer "users-per-firm", "active-firm count",
// firm-level retention curves. Mirrors the server-side groupIdentify
// done in /api/auth/signup.
function groupByFirm(firmName: string | null | undefined) {
  if (typeof window === "undefined") return;
  if (!firmName) return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;
  // Lazy import — posthog-js is only loaded once initPosthogSdk has fired.
  void import("posthog-js")
    .then((mod) => {
      try {
        mod.default.group("firm", firmName);
      } catch {
        /* swallow — group() is best-effort */
      }
    })
    .catch(() => {
      /* SDK not present — silent no-op */
    });
}

/**
 * Inner pageview tracker — separated out because useSearchParams forces
 * the component into a Suspense boundary in App Router. Without this
 * split, the whole provider would degrade to client-only rendering.
 */
function PosthogPageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;
    const url =
      window.location.origin +
      pathname +
      (searchParams?.toString() ? `?${searchParams.toString()}` : "");
    capturePageview(url);
  }, [pathname, searchParams]);

  return null;
}

export function PosthogProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin") ?? false;

  // One-time SDK init on mount — but skip /admin entirely. Operator
  // admin work is private (other users' PII, internal tooling) and
  // doesn't belong in session replay quota. Re-evaluates on route
  // change so navigating into /admin from elsewhere stops the SDK.
  useEffect(() => {
    if (isAdminRoute) return;
    initPosthog();
  }, [isAdminRoute]);

  // Identify the user when a session is available. Calling identifyUser
  // multiple times with the same id is a no-op inside posthog-js.
  // Also issue a posthog.group("firm", firmName) so PostHog dashboards
  // can break out users-per-firm and firm-level retention.
  useEffect(() => {
    if (isAdminRoute) return;
    if (status === "authenticated" && session?.user?.id) {
      identifyUser(session.user.id, {
        email: session.user.email ?? undefined,
        name: session.user.name ?? undefined,
      });
      const firmName = (session.user as { firmName?: string | null })
        ?.firmName;
      groupByFirm(firmName);
    }
  }, [
    status,
    session?.user?.id,
    session?.user?.email,
    session?.user?.name,
    session?.user,
    isAdminRoute,
  ]);

  return (
    <>
      <Suspense fallback={null}>
        <PosthogPageviewTracker />
      </Suspense>
      {children}
    </>
  );
}
