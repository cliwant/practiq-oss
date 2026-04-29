"use client";

/**
 * Floating "Send feedback" button — bottom-right of every authenticated
 * /app page. Beta-launch must-have so users can report a bug / ask a
 * question / share a delight without leaving the app to find an
 * email address.
 *
 * Design choices:
 *   - Bottom-right floating, brand-quiet (zinc fill, no glow). Should
 *     not compete with primary CTAs; it's an always-available backstop.
 *   - Click opens a small modal with kind selector + textarea. Keep
 *     it minimal — every extra field is a reason the user gives up
 *     mid-write.
 *   - Path + userAgent + last seen JS error captured automatically.
 *     User doesn't have to think about repro.
 *   - On submit, POST /api/feedback. Success → "Thanks — we'll
 *     reply within 1 business day to <email>." Failure → "Couldn't
 *     send — email support@practiq.dev directly."
 *   - 5 submissions / hour rate limit on the server. The button just
 *     surfaces the 429 message.
 */

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type FeedbackKind = "bug" | "feature" | "question" | "praise" | "other";

const KIND_LABELS: Record<FeedbackKind, string> = {
  bug: "Bug — something broke",
  feature: "Feature request",
  question: "How do I...",
  praise: "Just nice to hear",
  other: "Other",
};

export function FeedbackButton(): React.ReactElement | null {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<FeedbackKind>("bug");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<
    | { state: "idle" }
    | { state: "ok"; email: string | null }
    | { state: "error"; message: string }
  >({ state: "idle" });
  const pathname = usePathname();

  // Track last unhandled JS error so the user can submit "this thing
  // just blew up" without remembering what the error said. Captured
  // best-effort — never throws.
  const [lastError, setLastError] = useState<string | null>(null);
  useEffect(() => {
    function onError(e: ErrorEvent) {
      try {
        const detail = `${e.message ?? "(no message)"} @ ${e.filename ?? "?"}:${
          e.lineno ?? "?"
        }`;
        setLastError(detail.slice(0, 500));
      } catch {
        // never throw from a global listener
      }
    }
    window.addEventListener("error", onError);
    return () => window.removeEventListener("error", onError);
  }, []);

  async function submit() {
    if (message.trim().length < 5) {
      setResult({ state: "error", message: "Please write at least a sentence." });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          message: message.trim(),
          context: {
            path: pathname,
            userAgent: navigator.userAgent.slice(0, 400),
            lastError: lastError ?? undefined,
          },
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setResult({
          state: "error",
          message:
            body?.error ??
            "Couldn't send — please email support@practiq.dev directly.",
        });
        return;
      }
      setResult({ state: "ok", email: null });
      setMessage("");
      // Auto-close after 4 seconds so the user gets feedback then can
      // keep working.
      setTimeout(() => {
        setOpen(false);
        setResult({ state: "idle" });
      }, 4000);
    } catch {
      setResult({
        state: "error",
        message:
          "Network error — please email support@practiq.dev with what you tried to send.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900/90 px-4 py-2 text-xs font-medium text-zinc-200 shadow-lg shadow-black/40 backdrop-blur-sm hover:border-zinc-500 hover:text-zinc-100 active:scale-[0.98]"
        aria-label="Send feedback"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M3 5a2 2 0 012-2h6a2 2 0 012 2v4a2 2 0 01-2 2H7l-3 3v-3H5a2 2 0 01-2-2V5z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>
        Send feedback
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-[#0a0a0a] p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                  Beta feedback
                </div>
                <h2 className="mt-1 text-lg font-bold text-zinc-100">
                  What do you want to tell us?
                </h2>
                <p className="mt-1 text-xs text-zinc-500">
                  We read every one. Reply within 1 business day.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setResult({ state: "idle" });
                }}
                className="rounded p-1 text-zinc-500 hover:text-zinc-200"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {result.state === "ok" ? (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-6 text-center">
                <div className="mb-2 text-2xl">✓</div>
                <div className="text-sm font-medium text-emerald-200">
                  Got it. We&apos;ll reply soon.
                </div>
              </div>
            ) : (
              <>
                <label className="mb-3 block">
                  <span className="text-xs font-medium text-zinc-400">
                    Kind
                  </span>
                  <select
                    value={kind}
                    onChange={(e) => setKind(e.target.value as FeedbackKind)}
                    className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none"
                  >
                    {(Object.keys(KIND_LABELS) as FeedbackKind[]).map((k) => (
                      <option key={k} value={k}>
                        {KIND_LABELS[k]}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="mb-3 block">
                  <span className="text-xs font-medium text-zinc-400">
                    Message
                  </span>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={5}
                    placeholder="What happened? What did you expect? Steps to reproduce help a lot."
                    className="mt-1 w-full resize-none rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
                  />
                </label>

                {lastError ? (
                  <div className="mb-3 rounded border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-300">
                    Last JS error captured: <span className="font-mono">{lastError.slice(0, 120)}</span>
                  </div>
                ) : null}

                {result.state === "error" ? (
                  <div className="mb-3 rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                    {result.message}
                  </div>
                ) : null}

                <div className="flex items-center justify-between">
                  <a
                    href="mailto:support@practiq.dev"
                    className="text-xs text-zinc-500 underline decoration-zinc-700 underline-offset-4 hover:decoration-zinc-300"
                  >
                    or email support@practiq.dev
                  </a>
                  <button
                    type="button"
                    onClick={submit}
                    disabled={submitting || message.trim().length < 5}
                    className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-bold text-zinc-950 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {submitting ? "Sending…" : "Send"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
