import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";
import { BENCHMARKS } from "@/data/benchmarks/benchmarks";

const SITE_URL = "https://practiq.dev";

export const metadata: Metadata = {
  title: "Firm Capacity Benchmarks for Professional Services (2026)",
  description:
    "2026 capacity benchmarks for small professional services firms — how many clients a small CPA firm handles, matters for a law firm, accounts for an agency, engagements for consulting, and client companies for HR advisors.",
  alternates: { canonical: `${SITE_URL}/benchmarks` },
};

const collectionSchema = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Firm Capacity Benchmarks",
  description:
    "2026 capacity benchmarks for small professional services firms across accounting, law, HR advisory, consulting, and agency verticals.",
  url: `${SITE_URL}/benchmarks`,
};

export default function BenchmarksIndexPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100">
      <Nav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />

      <section className="px-6 pt-32 pb-10">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            Firm Capacity Benchmarks · 2026
          </p>
          <h1 className="mb-6 text-4xl font-extrabold tracking-[-0.03em] text-zinc-100 sm:text-5xl lg:text-6xl">
            How many clients can a {" "}
            <span className="text-zinc-500">small firm actually handle?</span>
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
            Vertical-specific 2026 benchmarks for small professional services
            firms. Real numbers from industry reports + firm audits, with the
            structural ceilings that separate firms that scale from firms that
            stall.
          </p>
        </div>
      </section>

      <section className="px-6 pb-20">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {BENCHMARKS.map((b) => (
              <Link
                key={b.slug}
                href={`/benchmarks/${b.slug}`}
                className="group rounded-xl border border-zinc-800 bg-[#0a0a0a] p-6 transition-colors hover:border-zinc-600"
              >
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  {b.vertical}
                </p>
                <h2 className="mb-3 text-xl font-bold leading-snug text-zinc-100 group-hover:text-white">
                  {b.h1}
                </h2>
                <p className="mb-4 text-sm leading-relaxed text-zinc-400">
                  {b.directAnswer}
                </p>
                <p className="text-xs font-medium text-emerald-400 group-hover:text-emerald-300">
                  Read the benchmark →
                </p>
              </Link>
            ))}
          </div>

          <div className="mt-16 rounded-2xl border border-zinc-800 bg-[#0a0a0a] p-10">
            <h2 className="mb-6 text-2xl font-bold tracking-[-0.03em] text-zinc-100">
              How we build these benchmarks
            </h2>
            <div className="space-y-4 text-sm leading-relaxed text-zinc-300">
              <p>
                Each benchmark synthesizes numbers from three sources:
                vertical-specific industry reports (AICPA, ABA, SHRM,
                Consulting Magazine, Clutch), direct firm audits conducted by
                the Practiq team, and published academic research on
                professional services capacity.
              </p>
              <p>
                We prioritize the <em>structural ceilings</em> over average
                numbers. &quot;Average&quot; can mislead — the number that
                matters is where capacity breaks, because that&apos;s where
                firms hit compression and stop growing.
              </p>
              <p className="text-zinc-400">
                Want a firm-specific capacity number?{" "}
                <Link
                  href="/roi-calculator"
                  className="text-zinc-200 underline underline-offset-4 hover:text-white"
                >
                  Use the Context-Switching Cost Calculator
                </Link>
                {" "}to see what your current ceiling is costing you each year.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
