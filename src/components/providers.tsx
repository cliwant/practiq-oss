"use client";

import { SessionProvider } from "next-auth/react";
import { PosthogProvider } from "@/components/posthog-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <PosthogProvider>{children}</PosthogProvider>
    </SessionProvider>
  );
}
