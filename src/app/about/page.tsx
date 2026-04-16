/* eslint-disable react/no-unescaped-entities */
import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";

export const metadata: Metadata = {
  title: "About Practiq",
  description:
    "Practiq is an AI workspace for boutique professional services firms managing 30-200 client relationships. Built by Cliwant, Inc.",
  openGraph: {
    title: "About Practiq",
    description:
      "Practiq is an AI workspace for boutique professional services firms managing 30-200 client relationships.",
    url: "https://practiq.dev/about",
    type: "website",
  },
  alternates: { canonical: "https://practiq.dev/about" },
};

const ABOUT_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  url: "https://practiq.dev/about",
  name: "About Practiq",
  mainEntity: { "@id": "https://practiq.dev/#organization" },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-bg-base">
      <Nav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ABOUT_JSON_LD) }}
      />
      <main className="pt-32 pb-16 px-6">
        <article className="max-w-3xl mx-auto">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-3">About</p>
          <h1 className="text-4xl md:text-5xl font-black text-zinc-100 tracking-tight leading-tight mb-8">
            Built for firms that outgrew the spreadsheet, can't afford the enterprise practice management.
          </h1>

          <div className="prose-dark">
            <p>
              Practiq is an AI workspace for boutique professional services firms — small accounting firms, solo and small-firm law practices, HR advisory shops, consulting boutiques, and marketing/creative agencies — that juggle 30 to 200 active client relationships with a team of two to twenty people.
            </p>

            <p>
              Every firm we've talked to hits the same wall around the fiftieth client: the client-context cost of running the business starts eating the business. Monday morning becomes three hours of tab-switching, searching email, reading old notes, and trying to remember what the last meeting actually covered. The work hasn't started. The day is already gone.
            </p>

            <h2>What we're building</h2>
            <p>
              Each client gets a dedicated workspace that stores the complete relationship — financials, communication preferences, past deliverables, team notes, open threads. An AI assistant scans every client overnight and surfaces what needs attention each morning. Switching clients takes one click, and the full context loads instantly.
            </p>

            <p>
              We frame AI as infrastructure that amplifies expert judgment, not as an autonomous agent that replaces it. Every small-firm expert we've spoken with has the same skepticism about "AI that does my work" — and they're right to. The product is judgment-first, automation-second.
            </p>

            <h2>Who we are</h2>
            <p>
              Practiq is built by <strong>Grindworks</strong>, a product studio founded by SD Keum. We are a small team currently focused on a single thing: shipping something that professional services firm owners use every single workday.
            </p>

            <p>
              All infrastructure runs on US-based services (Vercel, Supabase). We respond within 4 hours during US business time.
            </p>

            <p>
              We are in early access. If you run or work inside a firm that manages 30+ client relationships and you want to try what we're building, <Link href="/#cta" className="text-blue-400 hover:text-blue-300 underline underline-offset-2">request access</Link> or <Link href="/contact?topic=intro-call" className="text-blue-400 hover:text-blue-300 underline underline-offset-2">book a 15-minute intro call</Link>. We read every signup and reply personally.
            </p>

            <h2>Say hello</h2>
            <ul>
              <li>Early access / product questions: <Link href="/#cta" className="text-blue-400 hover:text-blue-300 underline underline-offset-2">practiq.dev/#cta</Link></li>
              <li>Press / partnerships: <a href="mailto:hello@practiq.dev" className="text-blue-400 hover:text-blue-300 underline underline-offset-2">hello@practiq.dev</a></li>
              <li>Privacy / data: <a href="mailto:privacy@practiq.dev" className="text-blue-400 hover:text-blue-300 underline underline-offset-2">privacy@practiq.dev</a></li>
            </ul>

            <hr />

            <p className="text-xs text-zinc-500">
              <strong>Studio</strong>: Grindworks · <strong>Product</strong>: Practiq · <strong>Legal entity</strong>: Cliwant, Inc. · <strong>Founded</strong>: 2026 · <strong>Infrastructure</strong>: US-based
            </p>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
