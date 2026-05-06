"use client";

import { Suspense } from "react";
import { SessionProvider } from "next-auth/react";
import { PosthogProvider } from "@/components/posthog-provider";
import { AnalyticsProvider } from "@/components/analytics-provider";

export function Providers({ children }: { children: React.ReactNode }) {
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
