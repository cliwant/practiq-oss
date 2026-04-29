"use client";

/**
 * App-level error boundary. Catches errors thrown by any route under
 * the root layout that ISN'T an authenticated /app/* route (those have
 * their own boundary). Renders inside the root layout so Tailwind and
 * the shared font stack are available.
 *
 * The reset() prop re-renders the segment that threw without a full
 * reload, so a transient failure (network blip, a flaky 5xx) clears
 * cleanly with the user staying on the same page.
 */

import Link from "next/link";
import { useEffect } from "react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Surface the error in browser console + Vercel logs.
    // Sentry / PostHog client-side capture would attach here too once
    // we wire those up.
    console.error("[app/error]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050505] px-6 py-16">
      <div className="w-full max-w-lg text-center">
        <div className="mx-auto mb-8 flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-zinc-500">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h1 className="text-[22px] font-extrabold tracking-tight text-zinc-100">
          Something went sideways.
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-[13.5px] leading-relaxed text-zinc-500">
          We&apos;ve been alerted. Try again — if it keeps happening,{" "}
          <Link
            href="/contact"
            className="text-zinc-300 underline decoration-zinc-700 underline-offset-4 hover:decoration-zinc-400"
          >
            send us a quick note
          </Link>
          {error?.digest ? (
            <>
              {" "}
              and reference trace{" "}
              <code className="rounded bg-zinc-900 px-1.5 py-0.5 text-[12px] text-zinc-400">
                {error.digest}
              </code>
              .
            </>
          ) : (
            "."
          )}
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-xl bg-zinc-100 px-5 py-2.5 text-[13px] font-semibold text-zinc-950 shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_8px_32px_-8px_rgba(255,255,255,0.2)] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.15),0_12px_40px_-8px_rgba(255,255,255,0.3)] active:scale-[0.985]"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-xl border border-zinc-800 px-5 py-2.5 text-[13px] font-semibold text-zinc-200 hover:border-zinc-700 hover:text-zinc-100"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
