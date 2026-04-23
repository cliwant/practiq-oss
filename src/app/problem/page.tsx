import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";
import { PROBLEMS, type ProblemPage } from "@/data/problems/problems";

const SITE_URL = "https://practiq.dev";

export const metadata: Metadata = {
  title: "Problems Small Professional Services Firms Face — Practiq",
  description:
    "The structural problems that cap growth at small professional services firms — context-switching cost, client-count ceiling, tool sprawl, tax season overload, and more.",
  alternates: { canonical: `${SITE_URL}/problem` },
};

const collectionSchema = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Problems Small Professional Services Firms Face",
  description:
    "Deep analysis of the structural growth-limiting problems at 2-10 person professional services firms.",
  url: `${SITE_URL}/problem`,
};

export default function ProblemIndexPage() {
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
            The problems that cap firm growth
          </p>
          <h1 className="mb-6 text-4xl font-extrabold tracking-[-0.03em] text-zinc-100 sm:text-5xl lg:text-6xl">
            What&apos;s actually limiting your firm&apos;s growth?
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
            Most small professional services firms hit structural ceilings
            nobody warned them about. These pages unpack the patterns we see
            most often in firm audits — with real numbers, real costs, and
            what firms that fixed them actually did.
          </p>
        </div>
      </section>

      <section className="px-6 pb-20">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {PROBLEMS.map((p: ProblemPage) => (
              <Link
                key={p.slug}
                href={`/problem/${p.slug}`}
                className="group rounded-xl border border-zinc-800 bg-[#0a0a0a] p-6 transition-colors hover:border-zinc-600"
              >
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-red-400/80">
                  {p.verticalLabel}
                </p>
                <h2 className="mb-3 text-xl font-bold leading-snug text-zinc-100 group-hover:text-white">
                  {p.title}
                </h2>
                <p className="mb-4 text-sm leading-relaxed text-zinc-400">
                  {p.shortDescription}
                </p>
                <p className="text-xs font-medium text-emerald-400 group-hover:text-emerald-300">
                  Read the analysis →
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
