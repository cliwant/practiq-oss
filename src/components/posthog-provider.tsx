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

  // One-time SDK init on mount.
  useEffect(() => {
    initPosthog();
  }, []);

  // Identify the user when a session is available. Calling identifyUser
  // multiple times with the same id is a no-op inside posthog-js.
  useEffect(() => {
    if (status === "authenticated" && session?.user?.id) {
      identifyUser(session.user.id, {
        email: session.user.email ?? undefined,
        name: session.user.name ?? undefined,
      });
    }
  }, [status, session?.user?.id, session?.user?.email, session?.user?.name]);

  return (
    <>
      <Suspense fallback={null}>
        <PosthogPageviewTracker />
      </Suspense>
      {children}
    </>
  );
}
