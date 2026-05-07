/**
 * PostHog SDK bootstrap (Tier 5).
 *
 * The self-hosted analytics layer (track-client.ts → /api/events) handles
 * funnel-grade structured events. PostHog is layered on top for things
 * we DON'T want to build ourselves: session replay, autocapture clicks,
 * heatmaps, pageleave timing.
 *
 * No-op unless NEXT_PUBLIC_POSTHOG_KEY is set, so the build doesn't
 * leak vendor scripts into preview environments without keys.
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
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

  posthog.init(key, {
    api_host: host,
    person_profiles: "identified_only",
    // Tier 5 enables — config-only flips per spec.
    autocapture: true,
    capture_pageleave: true,
    capture_pageview: true,
    session_recording: {
      recordCrossOriginIframes: false,
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
