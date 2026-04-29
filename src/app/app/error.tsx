"use client";

/**
 * Authenticated app (/app/*) error boundary. Catches any error thrown
 * by client / server components inside the dashboard. Designed to keep
 * the operator inside their session — we don't want a transient Anthropic
 * 5xx to dump them back at /login.
 */

import Link from "next/link";
import { useEffect } from "react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AppErrorBoundary({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("[/app error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6 py-16">
      <div className="w-full max-w-lg text-center">
        <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-amber-300">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <h2 className="text-[20px] font-extrabold tracking-tight text-zinc-100">
          That action didn&apos;t complete.
        </h2>
        <p className="mx-auto mt-3 max-w-sm text-[13px] leading-relaxed text-zinc-500">
          Your session is still alive — try again, or jump back to the
          firm view.{" "}
          {error?.digest ? (
            <>
              Trace id{" "}
              <code className="rounded bg-zinc-900 px-1.5 py-0.5 text-[12px] text-zinc-400">
                {error.digest}
              </code>
              .
            </>
          ) : null}
        </p>
        <div className="mt-7 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-xl bg-zinc-100 px-5 py-2.5 text-[13px] font-semibold text-zinc-950 hover:bg-zinc-200 active:scale-[0.985]"
          >
            Try again
          </button>
          <Link
            href="/app"
            className="rounded-xl border border-zinc-800 px-5 py-2.5 text-[13px] font-semibold text-zinc-200 hover:border-zinc-700 hover:text-zinc-100"
          >
            Back to /app
          </Link>
        </div>
      </div>
    </div>
  );
}
