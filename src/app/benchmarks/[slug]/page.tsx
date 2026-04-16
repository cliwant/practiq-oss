import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";
import { BENCHMARKS, getBenchmark } from "@/data/benchmarks/benchmarks";

const SITE_URL = "https://practiq.dev";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return BENCHMARKS.map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const b = getBenchmark(slug);
  if (!b) return { title: "Not found" };

  return {
    title: b.metaTitle,
    description: b.metaDescription,
    alternates: {
      canonical: `${SITE_URL}/benchmarks/${b.slug}`,
    },
    openGraph: {
      title: b.h1,
      description: b.metaDescription,
      url: `${SITE_URL}/benchmarks/${b.slug}`,
      type: "article",
    },
    keywords: [
      b.h1.toLowerCase(),
      `${b.verticalLabel} capacity`,
      `${b.verticalLabel} benchmarks 2026`,
      `clients per ${b.vertical}`,
    ],
  };
}

export default async function BenchmarkDetailPage({ params }: Props) {
  const { slug } = await params;
  const b = getBenchmark(slug);
  if (!b) notFound();

  const pageUrl = `${SITE_URL}/benchmarks/${b.slug}`;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: b.h1,
    description: b.metaDescription,
    url: pageUrl,
    datePublished: "2026-04-17",
    dateModified: "2026-04-17",
    author: {
      "@type": "Organization",
      name: "Practiq",
      url: SITE_URL,
    },
    publisher: { "@id": `${SITE_URL}/#organization` },
    mainEntityOfPage: pageUrl,
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: b.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: "Benchmarks",
        item: `${SITE_URL}/benchmarks`,
      },
      { "@type": "ListItem", position: 3, name: b.h1, item: pageUrl },
    ],
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100">
      <Nav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <main className="px-6 pt-32 pb-20">
        <article className="mx-auto max-w-3xl">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            Benchmark · {b.vertical.toUpperCase()}
          </p>

          <h1 className="mb-6 text-4xl font-extrabold tracking-[-0.03em] text-zinc-100 sm:text-5xl">
            {b.h1}
          </h1>

          {/* Direct answer — AEO-optimized lead paragraph */}
          <p className="mb-10 rounded-xl border-l-2 border-emerald-500/40 bg-[#0a0a0a] p-6 text-lg leading-relaxed text-zinc-200">
            {b.directAnswer}
          </p>

          {/* Capacity bands */}
          <section className="mb-12">
            <h2 className="mb-6 text-2xl font-bold tracking-[-0.03em] text-zinc-100">
              Capacity benchmarks by firm size
            </h2>
            <div className="space-y-4">
              {b.capacityBands.map((band) => (
                <div
                  key={band.teamSize}
                  className="rounded-xl border border-zinc-800 bg-[#0a0a0a] p-6"
                >
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                    {band.teamSize}
                  </p>
                  <p className="mb-4 text-xl font-bold text-zinc-100">
                    {band.clientRange}
                  </p>
                  <dl className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
                    <div>
                      <dt className="mb-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                        Target load
                      </dt>
                      <dd className="text-zinc-300">
                        {band.recommendedLoadPerPartner}
                      </dd>
                    </div>
                    <div>
                      <dt className="mb-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                        Ceiling
                      </dt>
                      <dd className="text-zinc-300">{band.ceiling}</dd>
                    </div>
                    <div className="md:col-span-3">
                      <dt className="mb-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                        Common breaking point
                      </dt>
                      <dd className="text-zinc-400 leading-relaxed">
                        {band.commonBreakingPoint}
                      </dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
          </section>

          {/* What drives capacity */}
          <section className="mb-12">
            <h2 className="mb-6 text-2xl font-bold tracking-[-0.03em] text-zinc-100">
              What drives {b.verticalLabel} capacity?
            </h2>
            <div className="space-y-5">
              {b.whatDrivesCapacity.map((item) => (
                <div
                  key={item.heading}
                  className="border-l-2 border-zinc-700 pl-6"
                >
                  <h3 className="mb-2 text-base font-bold text-zinc-100">
                    {item.heading}
                  </h3>
                  <p className="text-sm leading-relaxed text-zinc-300">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Related factors table */}
          <section className="mb-12">
            <h2 className="mb-6 text-2xl font-bold tracking-[-0.03em] text-zinc-100">
              What levers move {b.verticalLabel} capacity?
            </h2>
            <div className="rounded-xl border border-zinc-800 bg-[#0a0a0a] p-6">
              <ul className="space-y-4">
                {b.relatedFactors.map((f) => (
                  <li key={f.factor} className="flex flex-col gap-1 text-sm">
                    <span className="font-bold text-zinc-100">{f.factor}</span>
                    <span className="text-zinc-400">→ {f.impact}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Ceiling analysis */}
          <section className="mb-12">
            <h2 className="mb-6 text-2xl font-bold tracking-[-0.03em] text-zinc-100">
              The structural ceiling — why it exists
            </h2>
            <div className="space-y-4 text-base leading-relaxed text-zinc-300">
              {b.ceilingAnalysis.split("\n\n").map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </section>

          {/* Scaling strategies */}
          <section className="mb-12">
            <h2 className="mb-6 text-2xl font-bold tracking-[-0.03em] text-zinc-100">
              How to push past the ceiling
            </h2>
            <div className="space-y-4">
              {b.scalingStrategies.map((s) => (
                <div
                  key={s.title}
                  className="rounded-xl border border-zinc-800 bg-[#0a0a0a] p-6"
                >
                  <h3 className="mb-2 text-base font-bold text-zinc-100">
                    {s.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-zinc-400">
                    {s.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Sources */}
          <section className="mb-12 rounded-xl border border-zinc-800 bg-[#0a0a0a] p-6">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              Benchmark sources
            </p>
            <ul className="space-y-2 text-xs text-zinc-400">
              {b.benchmarkSources.map((src) => (
                <li key={src}>• {src}</li>
              ))}
            </ul>
          </section>

          {/* FAQ */}
          <section className="mb-12 border-t border-zinc-800 pt-10">
            <h2 className="mb-8 text-2xl font-bold tracking-[-0.03em] text-zinc-100">
              Frequently Asked
            </h2>
            <dl className="space-y-6">
              {b.faqs.map((f) => (
                <div
                  key={f.q}
                  className="border-b border-zinc-800 pb-6 last:border-0"
                >
                  <dt className="mb-3 text-base font-bold text-zinc-100">
                    {f.q}
                  </dt>
                  <dd className="text-sm leading-relaxed text-zinc-400">
                    {f.a}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {/* CTA */}
          <section className="mt-12 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent p-10 text-center">
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">
              Context-Switching Cost Calculator
            </p>
            <h2 className="mb-4 text-2xl font-bold tracking-[-0.03em] text-zinc-100">
              What&apos;s your firm&apos;s capacity cost today?
            </h2>
            <p className="mx-auto mb-8 max-w-xl text-sm text-zinc-400">
              Plug in your firm size, client count, and billable rate. Get a
              firm-specific dollar number for what the capacity ceiling is
              costing you per year.
            </p>
            <Link
              href="/roi-calculator?utm_source=benchmarks&utm_campaign=ceiling-cost"
              className="inline-flex items-center gap-3 rounded-2xl bg-zinc-100 px-10 py-4 text-sm font-bold uppercase tracking-widest text-zinc-950 shadow-lg transition-opacity hover:opacity-90"
            >
              Calculate my number →
            </Link>
          </section>

          {/* Other benchmarks */}
          <section className="mt-16 border-t border-zinc-800 pt-10">
            <p className="mb-6 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
              Benchmarks for other verticals
            </p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {BENCHMARKS.filter((x) => x.slug !== b.slug).map((x) => (
                <Link
                  key={x.slug}
                  href={`/benchmarks/${x.slug}`}
                  className="rounded-xl border border-zinc-800 bg-[#0a0a0a] p-4 transition-colors hover:border-zinc-600"
                >
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    {x.vertical}
                  </p>
                  <p className="text-sm font-bold text-zinc-200">{x.h1}</p>
                </Link>
              ))}
            </div>
          </section>
        </article>
      </main>

      <Footer />
    </div>
  );
}
