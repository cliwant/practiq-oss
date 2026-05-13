import type { Metadata } from "next";
import { ArrowRight, Calendar, Sparkles } from "lucide-react";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";
import DemoClient from "./demo-client";

export const metadata: Metadata = {
  title: "Try Practiq in 60 seconds — live redline demo",
  description:
    "Feed Practiq a Word memo + your prior memos for that client. Get back a tracked-changes Word doc you accept or reject in Word, in your firm's voice. No signup.",
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://practiq.dev/demo",
  },
  openGraph: {
    title: "Try Practiq in 60 seconds",
    description:
      "Live redline demo. No signup. Tracked-changes Word doc in your firm's voice.",
    url: "https://practiq.dev/demo",
    type: "website",
    images: [
      {
        url: "/api/og/demo",
        width: 1200,
        height: 630,
        alt: "Practiq demo — 50-client sample firm, explore the workspace",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Try Practiq in 60 seconds",
    description:
      "Live redline demo. No signup. Tracked-changes Word doc in your firm's voice.",
    images: ["/api/og/demo"],
  },
};

const BOOK_CALL_HREF =
  "mailto:seungdo.keum@practiq.dev?subject=Practiq%20demo%20--%20can%20we%20talk%3F&body=I%20just%20tried%20the%20demo%20at%20practiq.dev%2Fdemo.%20Free%20for%20a%2015-min%20call%20%5Btime%5D.";

/**
 * /demo — public, anonymous, interactive "try the wedge" page.
 *
 * 2026-05-13 refactor: page shell is now a Server Component so the
 * Nav, cross-link to the sample workspace, hero copy, and book-call
 * CTA all render into the initial HTML. The interactive redline-
 * generation surface (file uploads, stage transitions, base64
 * .docx download) lives inside <DemoClient /> as a Client island —
 * which previously made the whole page a Client Component and pushed
 * production curl size down to a 23 KB shell with
 * BAILOUT_TO_CLIENT_SIDE_RENDERING.
 */
export default function DemoPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100">
      <Nav />

      <main className="mx-auto max-w-5xl px-6 pt-24 pb-16 lg:pt-32">
        {/* Cross-link to the live populated workspace experience. */}
        <a
          href="/demo/workspace"
          className="mx-auto mb-8 flex max-w-2xl items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3 text-sm transition-colors hover:border-zinc-600 hover:bg-zinc-900"
        >
          <span className="text-zinc-300">
            <span className="font-semibold text-zinc-100">
              Or explore a live sample workspace
            </span>
            <span className="ml-2 text-zinc-500">
              — 50 fictional clients pre-loaded
            </span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-zinc-400" />
        </a>

        {/* HERO — server-rendered */}
        <header className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/50 px-3 py-1 text-[11px] font-medium uppercase tracking-widest text-zinc-400">
            <Sparkles className="h-3 w-3" />
            Live demo · No signup
          </div>
          <h1 className="mt-5 text-balance text-4xl font-extrabold tracking-[-0.03em] text-zinc-100 sm:text-5xl lg:text-6xl">
            Try Practiq in 60 seconds
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-balance text-base leading-relaxed text-zinc-400 sm:text-lg">
            Hit the button. We&apos;ll redline a sample close memo using prior
            memos for the same fictional client, in the firm&apos;s voice. Open
            the result in Word — accept or reject the changes natively.
          </p>
        </header>

        {/* Interactive demo — Client island */}
        <DemoClient />

        {/* BOOK CALL CTA — server-rendered */}
        <section className="mt-16 rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900/80 to-zinc-950 p-8 text-center sm:p-10">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            If this is the wedge for your shop
          </div>
          <h2 className="mt-3 text-balance text-2xl font-extrabold tracking-[-0.03em] text-zinc-100 sm:text-3xl">
            Book a 15-min call. Bring a real memo.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-zinc-400">
            We&apos;ll run it on your file with the partner. Pricing is
            $15/client/month at launch. No annual contract. Pre-launch &mdash;
            looking for the first design partners in the 50&ndash;200 client
            range.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <a
              href={BOOK_CALL_HREF}
              className="btn-premium inline-flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              Book a 15-min call
            </a>
            <a
              href="/founding-member"
              className="btn-outline inline-flex items-center gap-2"
            >
              Design partner program
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
