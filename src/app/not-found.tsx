import Link from "next/link";
import type { Metadata } from "next";

/**
 * 404 page rendered for any route Next.js can't resolve. Lives inside
 * the root layout so the visitor still has the marketing nav and the
 * dark Practiq chrome — no jarring "white default 404" experience.
 *
 * Uses metadata to noindex the page so Google doesn't count broken
 * inbound links as crawlable content.
 */

export const metadata: Metadata = {
  title: "Page not found — Practiq",
  description:
    "We couldn't find that page. Try Pricing, Use cases, the Blog, or jump back to the homepage.",
  robots: { index: false, follow: false },
};

const suggestions: Array<{ href: string; label: string; hint: string }> = [
  { href: "/", label: "Homepage", hint: "What Practiq is, in two minutes" },
  { href: "/pricing", label: "Pricing", hint: "Solo / Practice / Firm — Founding Member tier" },
  { href: "/use-cases", label: "Use cases", hint: "Day-in-the-life by vertical" },
  { href: "/blog", label: "Blog", hint: "Field notes from boutique-firm operators" },
  { href: "/demo", label: "Try the demo", hint: "Anonymous tour — no signup" },
];

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050505] px-6 py-16">
      <div className="w-full max-w-xl">
        <div className="mb-10 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-500">
            404
          </p>
          <h1 className="mt-3 text-[28px] font-extrabold tracking-tight text-zinc-100">
            That page doesn&apos;t exist.
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-[13.5px] leading-relaxed text-zinc-500">
            It may have been moved, renamed, or never existed. Here&apos;s
            where most visitors land instead:
          </p>
        </div>
        <ul className="space-y-2">
          {suggestions.map((s) => (
            <li key={s.href}>
              <Link
                href={s.href}
                className="flex items-center justify-between rounded-xl border border-zinc-900 bg-[#0a0a0a] px-4 py-3 transition-colors hover:border-zinc-700"
              >
                <div>
                  <div className="text-[13.5px] font-semibold text-zinc-100">
                    {s.label}
                  </div>
                  <div className="text-[12px] text-zinc-500">{s.hint}</div>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-zinc-600"
                  aria-hidden="true"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
