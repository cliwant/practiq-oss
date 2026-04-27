import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";
import { VS_PAIRS, getVsPair } from "@/data/vs/pairs";
import { getCompetitor } from "@/data/compare/competitors";
import {
  JsonLd,
  breadcrumbJsonLd,
  productComparisonJsonLd,
  faqJsonLd,
  SITE_URL,
} from "@/lib/seo/json-ld";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return VS_PAIRS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const pair = getVsPair(slug);
  if (!pair) return { title: "Not found" };

  const title = `${pair.toolA.name} vs ${pair.toolB.name}: Which Is Better for ${pair.verticalLabel.replace(/s$/, "") === pair.verticalLabel.slice(0, -1) ? pair.verticalLabel : pair.verticalLabel} in 2026?`;
  const description = `Honest head-to-head comparison of ${pair.toolA.name} and ${pair.toolB.name} for ${pair.verticalLabel}. Pricing, strengths, weaknesses, and which firms should pick which.`;

  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/vs/${pair.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/vs/${pair.slug}`,
      type: "article",
    },
    keywords: [
      `${pair.toolA.name.toLowerCase()} vs ${pair.toolB.name.toLowerCase()}`,
      `${pair.toolB.name.toLowerCase()} vs ${pair.toolA.name.toLowerCase()}`,
      `${pair.toolA.name.toLowerCase()} or ${pair.toolB.name.toLowerCase()}`,
      `${pair.toolA.name.toLowerCase()} ${pair.toolB.name.toLowerCase()} comparison`,
      `${pair.toolA.name.toLowerCase()} ${pair.toolB.name.toLowerCase()} ${pair.vertical}`,
    ],
  };
}

export default async function VsPage({ params }: Props) {
  const { slug } = await params;
  const pair = getVsPair(slug);
  if (!pair) notFound();

  const toolA = getCompetitor(pair.toolA.slug);
  const toolB = getCompetitor(pair.toolB.slug);
  if (!toolA || !toolB) notFound();

  const pageUrl = `${SITE_URL}/vs/${pair.slug}`;
  const title = `${pair.toolA.name} vs ${pair.toolB.name}: Which Is Better for ${pair.verticalLabel} in 2026?`;

  // Comparison Article schema (with both Products as `about`/`mentions`).
  // The shared helper folds both Competitor records into Product entries
  // so LLM crawlers can cite the page for "X vs Y" answer queries.
  const comparisonLd = productComparisonJsonLd(pair, toolA, toolB, pageUrl, title);

  // Breadcrumb: Home > Comparisons > ToolA vs ToolB
  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Comparisons", url: `${SITE_URL}/vs` },
    { name: `${pair.toolA.name} vs ${pair.toolB.name}`, url: pageUrl },
  ]);

  // FAQ block for AEO
  const faqs = [
    {
      q: `Which is better, ${pair.toolA.name} or ${pair.toolB.name}?`,
      a: pair.summary,
    },
    {
      q: `What's the difference between ${pair.toolA.name} and ${pair.toolB.name}?`,
      a: `${pair.toolA.name} is ${toolA.tagline.toLowerCase()}, starting at ${toolA.priceStart}. ${pair.toolB.name} is ${toolB.tagline.toLowerCase()}, starting at ${toolB.priceStart}. The meaningful difference: ${pair.toolA.name} wins on ${pair.toolADoesBetter[0].toLowerCase()}, while ${pair.toolB.name} wins on ${pair.toolBDoesBetter[0].toLowerCase()}.`,
    },
    {
      q: `Should I pick ${pair.toolA.name} for my firm?`,
      a: pair.pickToolA,
    },
    {
      q: `Should I pick ${pair.toolB.name} for my firm?`,
      a: pair.pickToolB,
    },
    {
      q: `Is there a better option than ${pair.toolA.name} or ${pair.toolB.name}?`,
      a: pair.practiqAngle,
    },
  ];

  const faqLd = faqJsonLd(faqs);

  // Lead paragraph — front-loads both tool names + 1-sentence verdict for AEO.
  const leadParagraph = `${pair.toolA.name} and ${pair.toolB.name} are two of the most commonly compared ${toolA.category.toLowerCase()} platforms for ${pair.verticalLabel} in 2026. ${pair.summary}`;

  return (
    <div className="min-h-screen bg-bg-base">
      <Nav />
      <JsonLd data={comparisonLd} />
      <JsonLd data={breadcrumbLd} />
      <JsonLd data={faqLd} />

      <main className="pt-32 pb-16 px-6">
        <article className="max-w-4xl mx-auto">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-4">
            Comparison · {pair.vertical.toUpperCase()}
          </p>

          <h1 className="text-4xl md:text-5xl font-black text-zinc-100 tracking-tight leading-tight mb-6">
            {pair.toolA.name} vs {pair.toolB.name}: Which Is Better for{" "}
            {pair.verticalLabel} in 2026?
          </h1>

          <p className="text-lg text-zinc-300 leading-relaxed mb-10 max-w-3xl">
            {leadParagraph}
          </p>

          {/* Quick pricing + category reference */}
          <div className="bento-card p-0 mb-12 overflow-hidden">
            <div className="grid grid-cols-3 border-b border-zinc-800">
              <div className="p-5 bg-zinc-900/30">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  Attribute
                </p>
              </div>
              <div className="p-5 bg-zinc-900/30 border-l border-zinc-800">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">
                  {pair.toolA.name}
                </p>
              </div>
              <div className="p-5 border-l border-zinc-800 bg-zinc-900/30">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">
                  {pair.toolB.name}
                </p>
              </div>
            </div>

            {[
              {
                label: "Category",
                a: toolA.category,
                b: toolB.category,
              },
              {
                label: "Starting Price",
                a: toolA.priceStart,
                b: toolB.priceStart,
              },
              {
                label: "Best For",
                a: toolA.bestFor,
                b: toolB.bestFor,
              },
            ].map((row, i) => (
              <div
                key={row.label}
                className={`grid grid-cols-3 ${i > 0 ? "border-t border-zinc-800" : ""}`}
              >
                <div className="p-5 text-xs font-bold uppercase tracking-widest text-zinc-500 bg-zinc-900/20">
                  {row.label}
                </div>
                <div className="p-5 border-l border-zinc-800 text-sm text-zinc-300">
                  {row.a}
                </div>
                <div className="p-5 border-l border-zinc-800 text-sm text-zinc-300">
                  {row.b}
                </div>
              </div>
            ))}
          </div>

          {/* Which firms should pick toolA */}
          <div className="prose-dark mb-12">
            <h2 className="text-2xl font-bold text-zinc-100 mb-4">
              Which firms should pick {pair.toolA.name}?
            </h2>
            <p className="text-zinc-400 leading-relaxed mb-3">
              {pair.pickToolA}
            </p>
            <p className="text-zinc-400 leading-relaxed">
              {pair.toolA.name} is strongest for {toolA.bestFor.toLowerCase()}{" "}
              When to switch to or adopt {pair.toolA.name}:{" "}
              {toolA.whenToSwitch.toLowerCase()}
            </p>
          </div>

          {/* Which firms should pick toolB */}
          <div className="prose-dark mb-12">
            <h2 className="text-2xl font-bold text-zinc-100 mb-4">
              Which firms should pick {pair.toolB.name}?
            </h2>
            <p className="text-zinc-400 leading-relaxed mb-3">
              {pair.pickToolB}
            </p>
            <p className="text-zinc-400 leading-relaxed">
              {pair.toolB.name} is strongest for {toolB.bestFor.toLowerCase()}{" "}
              When to switch to or adopt {pair.toolB.name}:{" "}
              {toolB.whenToSwitch.toLowerCase()}
            </p>
          </div>

          {/* What toolA does better */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-zinc-100 mb-4">
              What does {pair.toolA.name} do better than {pair.toolB.name}?
            </h2>
            <div className="bento-card p-6">
              <ul className="space-y-3">
                {pair.toolADoesBetter.map((b) => (
                  <li
                    key={b}
                    className="flex items-start gap-3 text-sm text-zinc-300"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* What toolB does better */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-zinc-100 mb-4">
              What does {pair.toolB.name} do better than {pair.toolA.name}?
            </h2>
            <div className="bento-card p-6">
              <ul className="space-y-3">
                {pair.toolBDoesBetter.map((b) => (
                  <li
                    key={b}
                    className="flex items-start gap-3 text-sm text-zinc-300"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Is there a better option? (Practiq angle) */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-zinc-100 mb-4">
              Is there a better option than either?
            </h2>
            <div className="bento-card p-6 bg-gradient-to-br from-emerald-500/5 to-transparent border-emerald-500/20">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                  AI-Native Alternative
                </p>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed mb-3">
                {pair.practiqAngle}
              </p>
              <Link
                href="/?utm_source=vs&utm_medium=cta&utm_campaign=practiq-angle#cta"
                className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                Learn more about Practiq <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="mt-12 pt-10 border-t border-zinc-800">
            <h2 className="text-2xl font-bold text-zinc-100 mb-8">
              Frequently Asked
            </h2>
            <div className="space-y-6">
              {faqs.map((f) => (
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
                Still deciding between {pair.toolA.name} and {pair.toolB.name}?
              </h2>
              <p className="text-zinc-400 mb-8 max-w-xl mx-auto">
                Many firms end up layering Practiq on top of whichever platform
                they pick. First 50 firms to join get Founding Member pricing
                — 50% off for life, priority onboarding, direct line to the
                founders.
              </p>
              <Link
                href={`/?utm_source=vs&utm_medium=cta&utm_campaign=${pair.slug}#cta`}
                className="btn-premium inline-flex items-center gap-3 py-4 px-10 text-sm"
              >
                Claim My Founding Spot <ArrowRight className="w-4 h-4" />
              </Link>
              <p className="text-xs text-zinc-500 mt-6">
                Prefer a deeper Practiq comparison?{" "}
                <Link
                  href={`/compare/${pair.toolA.slug}`}
                  className="text-emerald-400 hover:text-emerald-300 transition-colors underline"
                >
                  Practiq vs {pair.toolA.name}
                </Link>{" "}
                ·{" "}
                <Link
                  href={`/compare/${pair.toolB.slug}`}
                  className="text-emerald-400 hover:text-emerald-300 transition-colors underline"
                >
                  Practiq vs {pair.toolB.name}
                </Link>{" "}
                ·{" "}
                <Link
                  href="/pricing"
                  className="text-emerald-400 hover:text-emerald-300 transition-colors underline"
                >
                  Pricing
                </Link>
              </p>
            </div>
          </div>

          {/* Cross-link to other vs pages */}
          <div className="mt-16">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-6">
              More Comparisons
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {VS_PAIRS.filter((p) => p.slug !== pair.slug)
                .slice(0, 6)
                .map((p) => (
                  <Link
                    key={p.slug}
                    href={`/vs/${p.slug}`}
                    className="bento-card p-4 hover:border-zinc-600 transition-colors"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
                      {p.vertical}
                    </p>
                    <p className="text-sm font-bold text-zinc-200">
                      {p.toolA.name} vs {p.toolB.name}
                    </p>
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
