"use client";

/**
 * ErrorTracker — captures uncaught JS errors and unhandled promise
 * rejections, fires them as `js_error_captured` events.
 *
 * Dedupes the same (message + first stack frame) within a 60s window
 * so a hot loop firing the same error 100×/sec doesn't drown the
 * analytics ingest. Survives across pageviews because handlers attach
 * to window once.
 */
import { useEffect } from "react";
import { trackClient } from "@/lib/analytics/track-client";

const DEDUPE_WINDOW_MS = 60 * 1000;
const seen = new Map<string, number>();

function shouldFire(key: string): boolean {
  const now = Date.now();
  const last = seen.get(key);
  if (last !== undefined && now - last < DEDUPE_WINDOW_MS) return false;
  seen.set(key, now);
  // Trim stale entries opportunistically — bounded memory regardless
  // of how long the page stays open.
  if (seen.size > 200) {
    for (const [k, t] of seen) {
      if (now - t > DEDUPE_WINDOW_MS) seen.delete(k);
    }
  }
  return true;
}

function dedupeKey(message: string, stack: string | undefined): string {
  const firstFrame = stack?.split("\n")[1]?.trim() ?? "";
  return `${message}::${firstFrame}`;
}

export function ErrorTracker() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      const message = event.message || "(unknown error)";
      const stack = event.error?.stack;
      const key = dedupeKey(message, stack);
      if (!shouldFire(key)) return;
      trackClient({
        type: "js_error_captured",
        properties: {
          message,
          stack: stack ?? null,
          source: event.filename ?? null,
          lineno: event.lineno ?? null,
          colno: event.colno ?? null,
          type: "error",
          url: typeof window !== "undefined" ? window.location.href : null,
        },
      });
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === "string"
            ? reason
            : "(unhandled rejection)";
      const stack = reason instanceof Error ? reason.stack : undefined;
      const key = dedupeKey(message, stack);
      if (!shouldFire(key)) return;
      trackClient({
        type: "js_error_captured",
        properties: {
          message,
          stack: stack ?? null,
          source: null,
          lineno: null,
          colno: null,
          type: "unhandled_rejection",
          url: typeof window !== "undefined" ? window.location.href : null,
        },
      });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
