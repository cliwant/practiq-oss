import Link from "next/link";
import type { Metadata } from "next";

/**
 * Segment-level 404 for /app/*. Renders inside the authenticated workspace
 * layout (WorkspaceShell + TrialCountdownBanner + FeedbackButton already
 * wrap us via src/app/app/layout.tsx), so the operator never falls through
 * to the public marketing 404 with "Homepage / Pricing / Blog" suggestions
 * — wrong context for someone already logged in.
 *
 * Wave 14 (2026-05-13): a single /app/clients server-redirect shipped in
 * commit 8117939 patched one known bad path; this page extends that fix to
 * EVERY stale or half-typed authenticated URL (`/app/old-tab`,
 * `/app/clients/<deleted-id>`, paste-from-Slack typos, bookmarked routes
 * removed in refactors, etc.).
 *
 * Intentional design choices:
 *   - No auto-redirect. Pause briefly so the user knows they're still in
 *     /app and not stranded — then they pick a destination consciously.
 *   - No `"use client"`. Server component; Next.js handles the 404 status
 *     code automatically for `not-found.tsx` files.
 *   - noindex via metadata (the workspace is private anyway, but defensive
 *     in case anyone shares a screenshot URL).
 */

export const metadata: Metadata = {
  title: "Page not found — Practiq",
  robots: { index: false, follow: false },
};

export default function AppNotFound() {
  return (
    <main
      id="main"
      className="flex min-h-[60vh] items-center justify-center px-6 py-16"
    >
      <div className="w-full max-w-lg text-center">
        <div
          aria-hidden="true"
          className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-zinc-400"
        >
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
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>

        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-400">
          404
        </p>
        <h1 className="mt-3 text-[22px] font-extrabold tracking-tight text-zinc-100">
          We couldn&apos;t find that page.
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-[13.5px] leading-relaxed text-zinc-400">
          The workspace route you tried doesn&apos;t exist (or it moved).
          You&apos;re still signed in — pick up where you left off below.
        </p>

        <div className="mt-7 flex items-center justify-center gap-3">
          <Link
            href="/app"
            className="rounded-xl bg-zinc-100 px-5 py-2.5 text-[13px] font-semibold text-zinc-950 transition-colors hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-100 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505] active:scale-[0.985]"
          >
            Back to dashboard
          </Link>
          <Link
            href="/app?focus=clients"
            className="rounded-xl border border-zinc-800 px-5 py-2.5 text-[13px] font-semibold text-zinc-200 transition-colors hover:border-zinc-700 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-700 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]"
          >
            Open a client
          </Link>
        </div>

        <p className="mt-8 text-[12px] text-zinc-400">
          Still stuck?{" "}
          <Link
            href="/contact"
            className="rounded text-zinc-200 underline underline-offset-4 decoration-zinc-700 transition-colors hover:text-zinc-100 hover:decoration-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-700 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]"
          >
            Contact support
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
