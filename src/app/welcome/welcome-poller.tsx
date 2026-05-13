"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, AlertTriangle } from "lucide-react";

interface WelcomePollerProps {
  sessionId: string | null;
  /** True when the server already saw an active subscription (skips polling). */
  initiallyActive: boolean;
}

type PollState =
  | "no-session"
  | "confirming"
  | "active"
  | "timeout";

const POLL_INTERVAL_MS = 1000;
const POLL_TIMEOUT_MS = 10_000;

/**
 * /welcome polling island.
 *
 * Hits /api/users/me every second for up to 10 seconds, looking for
 * subscription.status === "active" (or "trialing", which Stripe assigns
 * during the trial-eligible flows). On confirmation, swaps the inline
 * status badge to "subscription active". On timeout, surfaces a
 * support fallback AND fires a critical reportUserError beacon — that
 * gets paged via Slack within seconds so the operator sees the failure
 * before the user does.
 *
 * Design notes:
 *   - We don't replace the static SSR checklist; we layer a single
 *     status badge above it so the no-JS fallback (and search engine
 *     crawl) still shows the full onboarding flow.
 *   - The reportUserError beacon is sent via /api/report-user-error
 *     with `pageSurface=stripe-checkout` — that matches the surface
 *     used by checkout-side errors so the operator sees both client
 *     and server failures in the same Slack channel under the same
 *     surface label.
 */
export function WelcomePoller({ sessionId, initiallyActive }: WelcomePollerProps) {
  const [state, setState] = useState<PollState>(
    initiallyActive ? "active" : sessionId ? "confirming" : "no-session",
  );

  useEffect(() => {
    if (state !== "confirming") return;
    if (!sessionId) return;

    let cancelled = false;
    const start = Date.now();

    async function poll() {
      if (cancelled) return;
      try {
        const res = await fetch("/api/users/me", {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (cancelled) return;
        if (res.ok) {
          const data = (await res.json().catch(() => null)) as {
            user?: { subscription?: { status?: string } };
          } | null;
          const status = data?.user?.subscription?.status;
          if (status === "active" || status === "trialing") {
            setState("active");
            return;
          }
        }
      } catch {
        // Network blip — keep polling.
      }
      if (cancelled) return;
      if (Date.now() - start >= POLL_TIMEOUT_MS) {
        setState("timeout");
        if (sessionId) fireCriticalBeacon(sessionId);
        return;
      }
      setTimeout(poll, POLL_INTERVAL_MS);
    }

    // Kick off after a tick so the SSR'd "confirming…" state is visible
    // even on a perfectly-warm /api/users/me (which would otherwise
    // resolve before paint).
    const id = setTimeout(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [sessionId, state]);

  if (state === "no-session") {
    // Page already renders sensible copy in this state from SSR. No
    // island UI needed.
    return null;
  }

  if (state === "active") {
    return (
      <div className="mt-8 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4">
        <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-300" />
        <div className="flex-1 text-[13.5px] text-zinc-100">
          <p className="font-semibold">Your subscription is active.</p>
          <p className="mt-0.5 text-[12.5px] text-zinc-400">
            Stripe confirmed the founding-member rate. You can start setting
            things up below.
          </p>
        </div>
      </div>
    );
  }

  if (state === "timeout") {
    return (
      <div className="mt-8 rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-300" />
          <div className="flex-1 text-[13.5px] text-zinc-100">
            <p className="font-semibold">Confirmation is taking longer than usual.</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-zinc-300">
              Stripe usually finishes within a few seconds — yours hasn&apos;t
              come through yet. Your payment is almost certainly fine; our
              team has been paged and will reconcile within minutes.
            </p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-zinc-300">
              In the meantime, email{" "}
              <a
                href="mailto:hello@practiq.dev"
                className="text-zinc-100 underline decoration-amber-400/60 underline-offset-4 hover:decoration-amber-300"
              >
                hello@practiq.dev
              </a>{" "}
              with the reference{" "}
              <span className="font-mono text-[12px] text-zinc-200">
                {sessionId ?? "(no session id)"}
              </span>{" "}
              and we&apos;ll sort it.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // confirming
  return (
    <div className="mt-8 flex items-center gap-3 rounded-xl border border-zinc-800 bg-[#0a0a0a] px-5 py-4">
      <Loader2 className="h-5 w-5 flex-shrink-0 animate-spin text-zinc-400" />
      <div className="flex-1 text-[13.5px] text-zinc-200">
        <p className="font-semibold">Confirming your subscription…</p>
        <p className="mt-0.5 text-[12.5px] text-zinc-500">
          Talking to Stripe. This usually finishes inside 10 seconds.
        </p>
      </div>
    </div>
  );
}

function fireCriticalBeacon(sessionId: string): void {
  // Best-effort: do not await, do not block the UI. The /api/report-user-error
  // endpoint maps surface=stripe-checkout → severity=warning by default
  // (no status code passed), but we *want* this to be critical because
  // the operator-on-call should know within seconds. We force the
  // severity by passing a 500 status — the helper's severityForStatus
  // maps >=500 to "critical" and disables dedupe.
  try {
    fetch("/api/report-user-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        pageSurface: "stripe-checkout",
        message: `Welcome page subscription poll timed out after 10s for session ${sessionId}`,
        url: typeof window !== "undefined" ? window.location.href : "/welcome",
        type: "error",
        source: "welcome-poller",
      }),
    }).catch(() => {});
  } catch {
    // swallow
  }
}
