import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";
import {
  BEST_FOR_QUERIES,
  getBestForQuery,
  type BestForQuery,
  type RankedTool,
} from "@/data/best-for/queries";
import { getCompetitor } from "@/data/compare/competitors";

const SITE_URL = "https://practiq.dev";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return BEST_FOR_QUERIES.map((q) => ({ slug: q.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const spec = getBestForQuery(slug);
  if (!spec) return { title: "Not found" };

  return {
    title: spec.h1,
    description: spec.metaDescription,
    alternates: {
      canonical: `${SITE_URL}/best/${spec.slug}`,
    },
    openGraph: {
      title: spec.h1,
      description: spec.metaDescription,
      url: `${SITE_URL}/best/${spec.slug}`,
      type: "article",
    },
    keywords: [
      spec.query,
      `best ${spec.category} ${spec.verticalLabel}`,
      `${spec.category} ${spec.verticalLabel} 2026`,
      `top ${spec.category} ${spec.verticalLabel}`,
      `${spec.verticalLabel} ${spec.category} comparison`,
    ],
  };
}

// Build the editorially ranked Top 5 list, inserting Practiq at the
// spec-defined position. This produces a canonical ordered list the
// whole page and ItemList schema share.
interface Pick {
  rank: 1 | 2 | 3 | 4 | 5;
  isPractiq: boolean;
  name: string;
  slug: string | null;
  bestFor: string;
  pricingNote: string;
  whyRanked: string;
}

function buildPicks(spec: BestForQuery): Pick[] {
  const practiqPick: Pick = {
    rank: spec.practiqPosition,
    isPractiq: true,
    name: "Practiq",
    slug: null,
    bestFor: `Firms past 50 clients per professional where context switching is the binding constraint — the AI-native ${spec.category} option.`,
    pricingNote: "$15/client/month standard · founding members $10/client/month for life (first 50 firms)",
    whyRanked: spec.practiqReason,
  };

  const competitorPicks: Pick[] = spec.rankedTools.map((rt) => {
    const c = getCompetitor(rt.slug);
    return {
      rank: rt.position,
      isPractiq: false,
      name: c?.name ?? rt.slug,
      slug: rt.slug,
      bestFor: rt.bestFor,
      pricingNote: rt.pricingNote,
      whyRanked: c
        ? `${c.tagline}. ${c.practiqDifference.split(".")[0]}.`
        : rt.bestFor,
    };
  });

  const all = [...competitorPicks, practiqPick];
  // Sort by rank (1-5)
  return all.sort((a, b) => a.rank - b.rank);
}

export default async function BestForPage({ params }: Props) {
  const { slug } = await params;
  const spec = getBestForQuery(slug);
  if (!spec) notFound();

  const pageUrl = `${SITE_URL}/best/${spec.slug}`;
  const picks = buildPicks(spec);

  // Article schema
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: spec.h1,
    description: spec.metaDescription,
    url: pageUrl,
    datePublished: "2026-04-16",
    dateModified: "2026-04-16",
    author: {
      "@type": "Organization",
      name: "Practiq",
      url: SITE_URL,
    },
    publisher: { "@id": `${SITE_URL}/#organization` },
    mainEntityOfPage: pageUrl,
  };

  // ItemList schema — ranked collection
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: spec.h1,
    description: spec.metaDescription,
    numberOfItems: picks.length,
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    itemListElement: picks.map((p) => ({
      "@type": "ListItem",
      position: p.rank,
      item: {
        "@type": "SoftwareApplication",
        name: p.name,
        applicationCategory: "BusinessApplication",
        description: p.bestFor,
      },
    })),
  };

  // Breadcrumb schema
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: "Best Software",
        item: `${SITE_URL}/best`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: spec.h1,
        item: pageUrl,
      },
    ],
  };

  // FAQPage schema (5-6 FAQs for AEO)
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: spec.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  // Lead paragraph — front-loads the 5 picks by name for AEO direct answer.
  const pickNamesList = picks
    .map((p, i) => (i === picks.length - 1 ? `and ${p.name}` : p.name))
    .join(", ");
  const leadParagraph = `The best ${spec.category} for ${spec.verticalLabel} in 2026 are ${pickNamesList}. This ranked list covers the top five options across pricing, AI capability, and fit for ${spec.verticalLabel}.`;

  return (
    <div className="min-h-screen bg-bg-base">
      <Nav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <main className="pt-32 pb-16 px-6">
        <article className="max-w-4xl mx-auto">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-4">
            Best Software · {spec.vertical.toUpperCase()}
          </p>

          <h1 className="text-4xl md:text-5xl font-black text-zinc-100 tracking-tight leading-tight mb-6">
            {spec.h1}
          </h1>

          <p className="text-lg text-zinc-300 leading-relaxed mb-10 max-w-3xl">
            {leadParagraph}
          </p>

          {/* What is the best X for Y */}
          <div className="prose-dark mb-12">
            <h2 className="text-2xl font-bold text-zinc-100 mb-4">
              What is the best {spec.category} for {spec.verticalLabel} in 2026?
            </h2>
            <p className="text-zinc-400 leading-relaxed mb-3">
              The best choice depends on firm shape, client count, and current
              tool stack. At the top of the list, {picks[0].name} is the
              strongest pick for most {spec.verticalLabel} —{" "}
              {picks[0].bestFor.toLowerCase()}
            </p>
            <p className="text-zinc-400 leading-relaxed">
              The rest of the ranking reflects trade-offs: some tools fit
              smaller teams, some bundle more features, and exactly one on this
              list is AI-native rather than rule-based. The framework below
              explains how to pick.
            </p>
          </div>

          {/* Ranking framework */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-zinc-100 mb-4">
              How did we rank these {spec.category} tools?
            </h2>
            <ul className="space-y-3">
              {spec.framework.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-sm text-zinc-300"
                >
                  <span className="w-1 h-1 rounded-full bg-zinc-500 shrink-0 mt-2" />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* The 5 ranked picks */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-zinc-100 mb-6">
              What are the 5 best {spec.category} tools for{" "}
              {spec.verticalLabel}?
            </h2>
            <ol className="space-y-4">
              {picks.map((p) => (
                <li
                  key={p.name}
                  className={`bento-card p-6 ${
                    p.isPractiq
                      ? "bg-gradient-to-br from-emerald-500/5 to-transparent border-emerald-500/20"
                      : ""
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm ${
                        p.isPractiq
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-zinc-800 text-zinc-300"
                      }`}
                    >
                      {p.rank}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-3">
                        <h3 className="text-lg font-bold text-zinc-100">
                          {p.name}
                        </h3>
                        {p.isPractiq && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                            <Sparkles className="w-3 h-3" />
                            AI-Native
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
                            Best For
                          </p>
                          <p className="text-sm text-zinc-300 leading-relaxed">
                            {p.bestFor}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
                            Pricing
                          </p>
                          <p className="text-sm text-zinc-300 leading-relaxed">
                            {p.pricingNote}
                          </p>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
                          Why It Ranks Here
                        </p>
                        <p className="text-sm text-zinc-300 leading-relaxed">
                          {p.whyRanked}
                        </p>
                      </div>
                      {p.slug && (
                        <Link
                          href={`/compare/${p.slug}`}
                          className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
                        >
                          See Practiq vs {p.name}{" "}
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Decision framework */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-zinc-100 mb-4">
              Which tool should you actually pick?
            </h2>
            <div className="prose-dark">
              <p className="text-zinc-400 leading-relaxed mb-3">
                For {spec.verticalLabel} in 2026, the decision rarely comes
                down to feature checklists. It comes down to firm scale: at
                smaller client counts, the simpler tools on this list
                ({picks.find((p) => p.rank === 4)?.name},{" "}
                {picks.find((p) => p.rank === 5)?.name}) cover the real work.
                At larger scales, the all-in-one platforms at the top of this
                list ({picks.find((p) => p.rank === 1)?.name},{" "}
                {picks.find((p) => p.rank === 2)?.name}) earn their price.
              </p>
              <p className="text-zinc-400 leading-relaxed">
                {spec.closingInsight}
              </p>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="mt-12 pt-10 border-t border-zinc-800">
            <h2 className="text-2xl font-bold text-zinc-100 mb-8">
              Frequently Asked
            </h2>
            <div className="space-y-6">
              {spec.faqs.map((f) => (
                <div key={f.q} className="bento-card p-6">
                  <h3 className="text-base font-bold text-zinc-100 mb-3">
                    {f.q}
                  </h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    {f.a}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="mt-16 pt-10 border-t border-zinc-800">
            <div className="bento-card p-10 text-center bg-gradient-to-br from-emerald-500/5 to-transparent">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400 mb-4">
                Founding Member Early Access
              </p>
              <h2 className="text-3xl font-black text-zinc-100 tracking-tight mb-4">
                Evaluating the AI-native option on this list?
              </h2>
              <p className="text-zinc-400 mb-8 max-w-xl mx-auto">
                Practiq is the AI-native pick in this ranking. First 50 firms
                to join lock in $10/client/month for life (33% off forever),
                priority onboarding, and a direct line to the founders.
              </p>
              <Link
                href={`/?utm_source=best&utm_medium=cta&utm_campaign=${spec.slug}#cta`}
                className="btn-premium inline-flex items-center gap-3 py-4 px-10 text-sm"
              >
                Claim My Founding Spot <ArrowRight className="w-4 h-4" />
              </Link>
              <p className="text-xs text-zinc-500 mt-6">
                See how Practiq compares to{" "}
                {picks
                  .filter((p) => !p.isPractiq && p.slug)
                  .slice(0, 3)
                  .map((p, i, arr) => (
                    <span key={p.name}>
                      <Link
                        href={`/compare/${p.slug}`}
                        className="text-emerald-400 hover:text-emerald-300 transition-colors underline"
                      >
                        {p.name}
                      </Link>
                      {i < arr.length - 1 ? ", " : ""}
                    </span>
                  ))}
                .
              </p>
            </div>
          </div>

          {/* Cross-link to other best-for pages */}
          <div className="mt-16">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-6">
              More Best-Of Guides
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {BEST_FOR_QUERIES.filter((q) => q.slug !== spec.slug)
                .slice(0, 6)
                .map((q) => (
                  <Link
                    key={q.slug}
                    href={`/best/${q.slug}`}
                    className="bento-card p-4 hover:border-zinc-600 transition-colors"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
                      {q.vertical}
                    </p>
                    <p className="text-sm font-bold text-zinc-200">{q.h1}</p>
                  </Link>
                ))}
            </div>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
