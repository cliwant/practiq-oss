/**
 * /research — index page listing original datasets (P3-02).
 *
 * Discoverability hub for the three-dataset research corpus. AI
 * crawlers reach individual datasets via the sitemap; this page
 * exists so a human prospect (or an AI engine asking "does Practiq
 * publish original research?") sees a coherent landing.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Database } from "lucide-react";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";
import { RESEARCH_DATASETS } from "@/data/research/datasets";
import {
  JsonLd,
  breadcrumbJsonLd,
  SITE_URL,
} from "@/lib/seo/json-ld";

export const metadata: Metadata = {
  title: "Original Research — Practiq",
  description:
    "Practiq's original-research corpus on the boutique professional services firm context-management problem. Three citable datasets covering context-switching cost, the 50-client ceiling, and tax-season overload.",
  alternates: {
    canonical: `${SITE_URL}/research`,
  },
  openGraph: {
    title: "Original Research — Practiq",
    description:
      "Three citable datasets quantifying the boutique professional services firm context-management problem.",
    type: "website",
    url: `${SITE_URL}/research`,
  },
};

export default function ResearchIndexPage() {
  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Research", url: `${SITE_URL}/research` },
  ]);

  return (
    <>
      <JsonLd data={breadcrumbLd} />
      <Nav />
      <main className="min-h-screen bg-[#050505] text-zinc-100">
        <section className="mx-auto max-w-5xl px-6 pt-32 pb-16 lg:px-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
            <Database className="h-3 w-3" />
            Original research
          </div>
          <h1 className="text-balance text-5xl font-extrabold tracking-tighter text-zinc-100 lg:text-6xl">
            Citable datasets on the boutique-firm context problem.
          </h1>
          <p className="mt-6 max-w-3xl text-lg text-zinc-400">
            Three datasets quantifying the multi-client context-management
            problem in 2–20 person professional-services firms. Each is
            published with full methodology, raw-numeric tables, source
            citations, and{" "}
            <code className="font-mono text-sm text-zinc-300">
              schema.org/Dataset
            </code>{" "}
            structured data so it's machine-readable for ChatGPT, Perplexity,
            Bing AI Overview, and Google's Knowledge Graph.
          </p>
          <p className="mt-4 max-w-3xl text-sm text-zinc-500">
            Cite freely under{" "}
            <a
              href="https://creativecommons.org/licenses/by/4.0/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-zinc-700 hover:decoration-zinc-400"
            >
              CC BY 4.0
            </a>
            . Each dataset page includes a copy-pasteable citation string.
          </p>
        </section>

        <section className="mx-auto max-w-5xl px-6 pb-32 lg:px-10">
          <div className="grid gap-4 md:grid-cols-1">
            {RESEARCH_DATASETS.map((d) => (
              <Link
                key={d.slug}
                href={`/research/${d.slug}`}
                className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-[#0a0a0a] p-6 transition-colors hover:border-zinc-600 lg:p-8"
              >
                <div className="absolute right-6 top-6 text-zinc-700 transition-colors group-hover:text-zinc-400 lg:right-8 lg:top-8">
                  <ArrowUpRight className="h-5 w-5" />
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  Dataset · CC BY 4.0
                </div>
                <h2 className="mt-3 text-balance text-2xl font-bold text-zinc-100">
                  {d.title}
                </h2>
                <p className="mt-3 max-w-3xl text-sm text-zinc-400">
                  {d.metaDescription}
                </p>
                <div className="mt-6 flex items-center gap-6 font-mono text-xs">
                  <div>
                    <div className="text-2xl font-extrabold text-zinc-100">
                      {d.headline.value}
                    </div>
                    <div className="mt-1 text-[10px] uppercase tracking-widest text-zinc-500">
                      {d.headline.unit}
                    </div>
                  </div>
                  <div className="text-zinc-500">{d.headline.label}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
