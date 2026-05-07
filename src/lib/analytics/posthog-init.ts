/**
 * PostHog SDK bootstrap (Tier 5).
 *
 * The self-hosted analytics layer (track-client.ts → /api/events) handles
 * funnel-grade structured events. PostHog is layered on top for things
 * we DON'T want to build ourselves: session replay, autocapture clicks,
 * heatmaps, pageleave timing.
 *
 * No-op unless NEXT_PUBLIC_POSTHOG_KEY and NEXT_PUBLIC_POSTHOG_HOST are set,
 * so the build doesn't leak vendor scripts into preview environments without keys.
 *
 * Idempotent: safe to call on every route change; the SDK guards.
 */
"use client";

import posthog from "posthog-js";
import { trackClient } from "./track-client";

let initialized = false;
let replayEventFired = false;

export function initPosthogSdk(): void {
  if (typeof window === "undefined") return;
  if (initialized) return;
  // Operator-side admin pages are out of scope for session replay —
  // they expose other users' PII, internal tooling, and chew through
  // recording quota with no marketing value. Skip init entirely.
  if (window.location.pathname.startsWith("/admin")) return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  if (!host) return;

  posthog.init(key, {
    api_host: host,
    person_profiles: "identified_only",
    // Tier 5 enables — config-only flips per spec.
    autocapture: true,
    capture_pageleave: true,
    capture_pageview: true,
    session_recording: {
      // Don't record third-party iframes (Stripe checkout, etc.) — they
      // contain card data and we have no business recording them.
      recordCrossOriginIframes: false,
      // Mask any input that isn't explicitly opted in. password is
      // auto-masked by PostHog already; this catches email, phone,
      // tax id, and anything else the user types.
      maskAllInputs: true,
      // Don't mask non-input text by default — we want to see what
      // the user is reading/clicking. Sensitive blocks are tagged with
      // class="ph-no-capture" (chat message bodies in
      // src/components/workspace/client-chat-tab.tsx, etc.).
      maskTextSelector: ".ph-no-capture",
    },
    disable_session_recording: false,
    // Heatmaps live under autocapture in posthog-js v1.130+.
    enable_heatmaps: true,
    loaded: (ph) => {
      // Sample 100% — low traffic, capture everything.
      try {
        ph.startSessionRecording();
      } catch {
        /* noop — older SDK versions auto-start */
      }
      if (!replayEventFired) {
        replayEventFired = true;
        const replayUrl =
          typeof ph.get_session_replay_url === "function"
            ? ph.get_session_replay_url()
            : undefined;
        trackClient({
          type: "posthog_session_replay_started",
          properties: {
            session_id: ph.get_session_id?.(),
            replay_url: replayUrl,
          },
        });
      }
    },
  });

  initialized = true;
}

export function identifyPosthog(userId: string, traits?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  if (!initialized) return;
  posthog.identify(userId, traits);
}

export function resetPosthog(): void {
  if (typeof window === "undefined") return;
  if (!initialized) return;
  posthog.reset();
}
