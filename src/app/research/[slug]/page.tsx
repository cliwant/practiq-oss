/**
 * /research/[slug] — dataset detail page (P3-02).
 *
 * Renders one DatasetContent record from /data/research/datasets.ts:
 *
 *   - Schema.org Dataset JSON-LD (the AI-engine extraction surface)
 *   - Article + Breadcrumb JSON-LD (traditional SEO surface)
 *   - Headline number, abstract, numeric table, methodology, implications, sources
 *   - Citation block (copy-pasteable)
 *   - Markdown companion: alternates.types['text/markdown'] points at
 *     /research/<slug>.md (handled by middleware → /api/markdown/research/[slug])
 *
 * Layout follows DESIGN.md: dark theme, Plus Jakarta Sans, max-w-4xl
 * for prose readability. Numbers in JetBrains Mono per design system.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Quote } from "lucide-react";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";
import {
  RESEARCH_DATASETS,
  RESEARCH_DATASET_SLUGS,
  getDataset,
} from "@/data/research/datasets";
import {
  JsonLd,
  datasetJsonLd,
  breadcrumbJsonLd,
  SITE_URL,
} from "@/lib/seo/json-ld";

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return RESEARCH_DATASET_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const dataset = getDataset(slug);
  if (!dataset) return {};
  const url = `${SITE_URL}/research/${dataset.slug}`;
  const markdownUrl = `${SITE_URL}/research/${dataset.slug}.md`;
  return {
    title: dataset.title,
    description: dataset.metaDescription,
    alternates: {
      canonical: url,
      types: { "text/markdown": markdownUrl },
    },
    openGraph: {
      title: dataset.title,
      description: dataset.metaDescription,
      type: "article",
      url,
      publishedTime: dataset.schema.datePublished,
      authors: ["Practiq Research"],
    },
  };
}

export default async function ResearchDatasetPage({ params }: Props) {
  const { slug } = await params;
  const dataset = getDataset(slug);
  if (!dataset) notFound();

  const url = `${SITE_URL}/research/${dataset.slug}`;
  const datasetLd = datasetJsonLd({ ...dataset.schema, url });
  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Research", url: `${SITE_URL}/research` },
    { name: dataset.title, url },
  ]);

  return (
    <>
      <JsonLd data={datasetLd} />
      <JsonLd data={breadcrumbLd} />
      <Nav />
      <main className="min-h-screen bg-[#050505] text-zinc-100">
        <article className="mx-auto max-w-4xl px-6 pt-28 pb-24 lg:px-10">
          <Link
            href="/research"
            className="inline-flex items-center gap-2 text-sm text-zinc-500 transition-colors hover:text-zinc-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to research
          </Link>

          <header className="mt-8">
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              Dataset · Published {dataset.schema.datePublished} · CC BY 4.0
            </div>
            <h1 className="mt-3 text-balance text-4xl font-extrabold tracking-tighter text-zinc-100 lg:text-5xl">
              {dataset.title}
            </h1>
          </header>

          {/* Headline number */}
          <div className="mt-10 rounded-2xl border border-zinc-800 bg-[#0a0a0a] p-6 lg:p-8">
            <div className="flex items-baseline gap-4 font-mono">
              <div className="text-6xl font-extrabold tracking-tight text-zinc-100 lg:text-7xl">
                {dataset.headline.value}
              </div>
              <div className="text-sm text-zinc-500">
                {dataset.headline.unit}
              </div>
            </div>
            <div className="mt-3 text-zinc-300">{dataset.headline.label}</div>
          </div>

          {/* Abstract */}
          <section className="mt-12">
            <h2 className="text-2xl font-bold text-zinc-100">Abstract</h2>
            <div className="mt-4 space-y-4 text-zinc-300">
              {dataset.abstract.split("\n\n").map((p, i) => (
                <p key={i} className="leading-relaxed">
                  {renderInline(p)}
                </p>
              ))}
            </div>
          </section>

          {/* Numeric table */}
          <section className="mt-12">
            <h2 className="text-2xl font-bold text-zinc-100">
              Breakdown
            </h2>
            <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-800 bg-[#0a0a0a]">
              <table className="w-full font-mono text-sm">
                <thead>
                  <tr className="border-b border-zinc-800/80 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    {dataset.table.columns.map((c, i) => (
                      <th key={i} className="px-4 py-3 text-left">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dataset.table.rows.map((row, ri) => (
                    <tr
                      key={ri}
                      className="border-t border-zinc-800/60 text-zinc-200"
                    >
                      {row.map((cell, ci) => (
                        <td key={ci} className="px-4 py-3">
                          {String(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {dataset.table.notes && dataset.table.notes.length > 0 && (
              <ul className="mt-3 space-y-1 text-xs text-zinc-500">
                {dataset.table.notes.map((n, i) => (
                  <li key={i}>· {n}</li>
                ))}
              </ul>
            )}
          </section>

          {/* Methodology */}
          <section className="mt-12">
            <h2 className="text-2xl font-bold text-zinc-100">Methodology</h2>
            <div className="mt-4 space-y-4 text-zinc-300">
              {dataset.methodology.map((p, i) => (
                <p key={i} className="leading-relaxed">
                  {renderInline(p)}
                </p>
              ))}
            </div>
          </section>

          {/* Implications */}
          <section className="mt-12">
            <h2 className="text-2xl font-bold text-zinc-100">Implications</h2>
            <ul className="mt-4 space-y-3 text-zinc-300">
              {dataset.implications.map((b, i) => (
                <li key={i} className="flex gap-3 leading-relaxed">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                  <span>{renderInline(b)}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Citation */}
          <section className="mt-12">
            <h2 className="text-2xl font-bold text-zinc-100">Cite this dataset</h2>
            <div className="mt-4 rounded-xl border border-zinc-800 bg-[#0a0a0a] p-6">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                <Quote className="h-3 w-3" />
                Citation
              </div>
              <p className="mt-3 font-mono text-sm leading-relaxed text-zinc-200">
                {dataset.schema.citation}
              </p>
            </div>
          </section>

          {/* Sources */}
          <section className="mt-12">
            <h2 className="text-2xl font-bold text-zinc-100">Sources</h2>
            <ul className="mt-4 space-y-3">
              {dataset.sources.map((s, i) => (
                <li key={i} className="text-sm leading-relaxed text-zinc-400">
                  {s.url ? (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-200 underline decoration-zinc-700 hover:decoration-zinc-400"
                    >
                      {s.label}
                    </a>
                  ) : (
                    <span className="text-zinc-200">{s.label}</span>
                  )}
                  {s.note && (
                    <span className="ml-2 text-zinc-500">— {s.note}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>

          {/* Related datasets */}
          <section className="mt-16 border-t border-zinc-800 pt-12">
            <h2 className="text-xl font-bold text-zinc-100">
              Other datasets in this series
            </h2>
            <div className="mt-4 space-y-3">
              {RESEARCH_DATASETS.filter((d) => d.slug !== dataset.slug).map(
                (d) => (
                  <Link
                    key={d.slug}
                    href={`/research/${d.slug}`}
                    className="block rounded-lg border border-zinc-800 bg-[#0a0a0a] p-4 transition-colors hover:border-zinc-600"
                  >
                    <div className="text-sm font-medium text-zinc-200">
                      {d.title}
                    </div>
                    <div className="mt-1 font-mono text-xs text-zinc-500">
                      {d.headline.value} {d.headline.unit} ·{" "}
                      {d.headline.label}
                    </div>
                  </Link>
                ),
              )}
            </div>
          </section>
        </article>
      </main>
      <Footer />
    </>
  );
}

/** Minimal **bold** rendering inside paragraphs — markdown shortcut. */
function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-bold text-zinc-100">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
