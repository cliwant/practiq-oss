"use client";

/**
 * ErrorTracker — captures uncaught JS errors and unhandled promise
 * rejections, fires them as `js_error_captured` events.
 *
 * Dedupes the same (message + first stack frame) within a 60s window
 * so a hot loop firing the same error 100×/sec doesn't drown the
 * analytics ingest. Survives across pageviews because handlers attach
 * to window once.
 *
 * 2026-05-13: on critical conversion surfaces (workflow-audit, AI
 * policy generator, signup, /), we ALSO beacon the error to
 * /api/report-user-error so the operator sees it in Slack within a
 * few seconds. Beacon is filtered to skip the well-known browser-
 * extension noise (ResizeObserver loop, Script error., etc.) — those
 * are not the firm's bug to chase and only generate alert fatigue.
 */
import { useEffect } from "react";
import { usePathname } from "next/navigation";
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

// Paths where a client-side error directly kills a conversion. We
// elevate errors on these to the Slack beacon (server-side dedupe in
// reportUserError will keep it quiet if the same bug keeps repeating).
const CRITICAL_PATHS = [
  "/workflow-audit",
  "/tools/ai-policy-generator",
  "/signup",
];

function pageSurfaceFor(pathname: string): string {
  if (pathname === "/") return "landing-home";
  if (pathname.startsWith("/workflow-audit")) return "workflow-audit";
  if (pathname.startsWith("/tools/ai-policy-generator"))
    return "policy-generator";
  if (pathname.startsWith("/signup")) return "early-access";
  return "other";
}

function isIgnorableBrowserNoise(message: string): boolean {
  // Browser extensions / cross-origin scripts that we cannot fix.
  // Documented noise from sentry/postmortem industry consensus.
  if (!message) return true;
  if (message === "Script error.") return true;
  if (message.includes("ResizeObserver loop")) return true;
  if (message.includes("ResizeObserver: loop completed")) return true;
  if (message.includes("Non-Error promise rejection captured")) return true;
  if (message.toLowerCase().includes("network request failed"))
    return true; // generic — keep analytics, drop alert
  return false;
}

function sendCriticalBeacon(args: {
  pageSurface: string;
  message: string;
  stack: string | undefined;
  type: "error" | "unhandled_rejection";
  source: string | null;
  lineno: number | null;
  colno: number | null;
}) {
  if (typeof window === "undefined") return;
  if (process.env.NODE_ENV !== "production") return;
  if (isIgnorableBrowserNoise(args.message)) return;
  const body = JSON.stringify({
    pageSurface: args.pageSurface,
    message: args.message,
    stack: args.stack,
    url: window.location.href,
    type: args.type,
    source: args.source,
    lineno: args.lineno,
    colno: args.colno,
  });
  try {
    if ("sendBeacon" in navigator) {
      const ok = navigator.sendBeacon(
        "/api/report-user-error",
        new Blob([body], { type: "application/json" }),
      );
      if (ok) return;
    }
  } catch {
    /* fall through to fetch */
  }
  fetch("/api/report-user-error", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    /* swallow — analytics surface is best-effort */
  });
}

export function ErrorTracker() {
  const pathname = usePathname();
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
      const onCriticalPath =
        pathname === "/" ||
        CRITICAL_PATHS.some((p) => pathname.startsWith(p));
      if (onCriticalPath) {
        sendCriticalBeacon({
          pageSurface: pageSurfaceFor(pathname),
          message,
          stack,
          type: "error",
          source: event.filename ?? null,
          lineno: event.lineno ?? null,
          colno: event.colno ?? null,
        });
      }
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
      const onCriticalPath =
        pathname === "/" ||
        CRITICAL_PATHS.some((p) => pathname.startsWith(p));
      if (onCriticalPath) {
        sendCriticalBeacon({
          pageSurface: pageSurfaceFor(pathname),
          message,
          stack,
          type: "unhandled_rejection",
          source: null,
          lineno: null,
          colno: null,
        });
      }
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, [pathname]);

  return null;
}
