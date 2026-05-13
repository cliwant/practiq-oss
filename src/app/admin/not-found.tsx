import Link from "next/link";
import type { Metadata } from "next";

/**
 * Segment-level 404 for /admin/*. Renders inside the admin layout (top bar
 * + admin nav already provided by src/app/admin/layout.tsx), so an operator
 * who pastes or bookmarks a stale admin URL doesn't fall through to the
 * public marketing 404 — which would also be Homepage / Pricing / Blog
 * suggestions, the wrong destination for an internal operator.
 *
 * Auth posture: this page only renders if the visitor cleared admin
 * middleware (admin.grindworks.ai host + valid HMAC session cookie). The
 * unauthenticated case is already handled by src/middleware.ts → redirect
 * to /admin/login with `from=<original-path>` so we resume after sign-in.
 *
 * Wave 14 (2026-05-13): paired with src/app/app/not-found.tsx — both seal
 * the "class of bug" R3 triage flagged after the single-path /app/clients
 * patch in commit 8117939.
 */

export const metadata: Metadata = {
  title: "Not found — Practiq Admin",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
  },
};

export default function AdminNotFound() {
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
          That admin route doesn&apos;t exist.
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-[13.5px] leading-relaxed text-zinc-400">
          The page may have moved or never existed under this URL. Your
          admin session is still valid — pick a destination below.
        </p>

        <div className="mt-7 flex items-center justify-center gap-3">
          <Link
            href="/admin"
            className="rounded-xl bg-zinc-100 px-5 py-2.5 text-[13px] font-semibold text-zinc-950 transition-colors hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-100 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505] active:scale-[0.985]"
          >
            Admin home
          </Link>
          <Link
            href="/admin/login"
            className="rounded-xl border border-zinc-800 px-5 py-2.5 text-[13px] font-semibold text-zinc-200 transition-colors hover:border-zinc-700 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-700 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]"
          >
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
