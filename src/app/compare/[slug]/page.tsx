import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";
import { COMPETITORS, getCompetitor } from "@/data/compare/competitors";
import {
  JsonLd,
  breadcrumbJsonLd,
  faqJsonLd,
  SITE_URL,
} from "@/lib/seo/json-ld";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return COMPETITORS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const competitor = getCompetitor(slug);
  if (!competitor) return { title: "Not found" };

  const title = `Practiq vs ${competitor.name}: Which Is Right for Your Firm?`;
  const description = `Honest comparison of Practiq and ${competitor.name} for small ${competitor.vertical} firms. See which tool fits your bottleneck, how they differ on AI capabilities, and when to use both together.`;

  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/compare/${competitor.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/compare/${competitor.slug}`,
      type: "article",
    },
    keywords: competitor.searchKeywords,
  };
}

export default async function ComparePage({ params }: Props) {
  const { slug } = await params;
  const competitor = getCompetitor(slug);
  if (!competitor) notFound();

  const pageUrl = `${SITE_URL}/compare/${competitor.slug}`;

  // Article schema with the competitor as the second Product to anchor
  // the comparison in the entity graph. We don't reuse productComparisonJsonLd
  // here because Practiq isn't a Competitor record — keep this inline.
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `Practiq vs ${competitor.name}: Which Is Right for Your Firm?`,
    description: `Honest comparison of Practiq and ${competitor.name} for small ${competitor.vertical} firms.`,
    url: pageUrl,
    datePublished: "2026-04-16",
    dateModified: "2026-04-16",
    author: { "@type": "Organization", name: "Practiq", url: SITE_URL },
    publisher: { "@id": `${SITE_URL}/#organization` },
    mainEntityOfPage: pageUrl,
    about: [
      { "@id": `${SITE_URL}/#software` },
      {
        "@type": "Product",
        name: competitor.name,
        category: competitor.category,
        description: competitor.tagline,
        offers: {
          "@type": "Offer",
          priceCurrency: "USD",
          price: competitor.priceStart,
          availability: "https://schema.org/InStock",
        },
      },
    ],
  };

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Compare", url: `${SITE_URL}/compare` },
    { name: `Practiq vs ${competitor.name}`, url: pageUrl },
  ]);

  // FAQPage schema (5 FAQs for AEO)
  const faqs = [
    {
      q: `What is the difference between Practiq and ${competitor.name}?`,
      a: competitor.practiqDifference,
    },
    {
      q: `When should I use ${competitor.name} instead of Practiq?`,
      a: `${competitor.name} is the better choice when: ${competitor.bestFor}`,
    },
    {
      q: `When should I switch from ${competitor.name} to Practiq?`,
      a: competitor.whenToSwitch,
    },
    {
      q: `Can I use both ${competitor.name} and Practiq together?`,
      a: `Yes. Most firms that adopt Practiq keep their existing ${competitor.category} tool. ${competitor.name} handles its strengths; Practiq adds the AI workspace layer that it does not provide. This is the most common migration pattern because it avoids replacement risk.`,
    },
    {
      q: `How much does Practiq cost compared to ${competitor.name}?`,
      a: `${competitor.name} starts around ${competitor.priceStart}. Practiq is in early access — pricing will be announced at beta launch. Founding members (first 50 firms) lock in 50% off for life.`,
    },
  ];

  const faqLd = faqJsonLd(faqs);

  return (
    <div className="min-h-screen bg-bg-base">
      <Nav />
      <JsonLd data={articleLd} />
      <JsonLd data={breadcrumbLd} />
      <JsonLd data={faqLd} />

      <main className="pt-32 pb-16 px-6">
        <article className="max-w-4xl mx-auto">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-4">
            Comparison · {competitor.vertical.toUpperCase()}
          </p>

          <h1 className="text-4xl md:text-5xl font-black text-zinc-100 tracking-tight leading-tight mb-4">
            Practiq vs {competitor.name}
          </h1>

          <p className="text-lg text-zinc-400 leading-relaxed mb-10 max-w-3xl">
            An honest comparison of Practiq and {competitor.name} for small {competitor.vertical} firms.
            Short answer: they solve different problems and most firms end up using both.
          </p>

          {/* Quick comparison table */}
          <div className="bento-card p-0 mb-12 overflow-hidden">
            <div className="grid grid-cols-3 border-b border-zinc-800">
              <div className="p-5 bg-zinc-900/30">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  Attribute
                </p>
              </div>
              <div className="p-5 bg-zinc-900/30 border-l border-zinc-800">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">
                  {competitor.name}
                </p>
              </div>
              <div className="p-5 border-l border-zinc-800 bg-gradient-to-br from-amber-500/5 to-transparent">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
                  Practiq
                </p>
              </div>
            </div>

            {[
              {
                label: "Category",
                comp: competitor.category,
                practiq: "AI-native client workspace",
              },
              {
                label: "Starting Price",
                comp: competitor.priceStart,
                practiq: "Early access (free) — founding members 50% off for life",
              },
              {
                label: "AI Approach",
                comp: "Assistive (chatbot / automation rules)",
                practiq: "Agentic (overnight scanning + deliverable prep)",
              },
              {
                label: "Multi-client Intelligence",
                comp: "Limited or none",
                practiq: "Primary focus",
              },
              {
                label: "Best For",
                comp: competitor.bestFor,
                practiq: "Context switching, deliverable preparation, cross-client patterns",
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
                  {row.comp}
                </div>
                <div className="p-5 border-l border-zinc-800 text-sm text-zinc-200 bg-gradient-to-br from-amber-500/5 to-transparent">
                  {row.practiq}
                </div>
              </div>
            ))}
          </div>

          {/* What each tool does well */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <div className="bento-card p-6">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
                {competitor.name} Strengths
              </p>
              <ul className="space-y-2">
                {competitor.strengths.map((s) => (
                  <li key={s} className="flex items-start gap-2 text-sm text-zinc-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bento-card p-6">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
                {competitor.name} Weaknesses
              </p>
              <ul className="space-y-2">
                {competitor.weaknesses.map((w) => (
                  <li key={w} className="flex items-start gap-2 text-sm text-zinc-400">
                    <XCircle className="w-4 h-4 text-amber-500/60 shrink-0 mt-0.5" />
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* When to use which */}
          <div className="prose-dark mb-12">
            <h2>When should you stay with {competitor.name}?</h2>
            <p>{competitor.bestFor}</p>

            <h2>When should you add Practiq?</h2>
            <p>{competitor.whenToSwitch}</p>

            <h2>What is the actual difference?</h2>
            <p>{competitor.practiqDifference}</p>

            <h2>Should I replace {competitor.name} with Practiq?</h2>
            <p>
              Almost never. Practiq is designed to complement {competitor.name}, not replace it.
              Most firms keep their existing tool for what it does well and layer Practiq on top
              for AI-native capabilities. This avoids the disruption of full platform migration
              while gaining the cross-client intelligence that no traditional practice management
              tool provides.
            </p>
          </div>

          {/* FAQ Section */}
          <div className="mt-12 pt-10 border-t border-zinc-800">
            <h2 className="text-2xl font-bold text-zinc-100 mb-8">Frequently Asked</h2>
            <div className="space-y-6">
              {faqs.map((f) => (
                <div key={f.q} className="bento-card p-6">
                  <h3 className="text-base font-bold text-zinc-100 mb-3">{f.q}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{f.a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="mt-16 pt-10 border-t border-zinc-800">
            <div className="bento-card p-10 text-center bg-gradient-to-br from-amber-500/5 to-transparent">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400 mb-4">
                Founding Member Early Access
              </p>
              <h2 className="text-3xl font-black text-zinc-100 tracking-tight mb-4">
                See how Practiq compares in practice.
              </h2>
              <p className="text-zinc-400 mb-8 max-w-xl mx-auto">
                First 50 firms to join get Founding Member pricing — 50% off for life, priority
                onboarding, direct feedback line to the founders.
              </p>
              <Link
                href={`/?utm_source=compare&utm_medium=cta&utm_campaign=vs-${competitor.slug}#cta`}
                className="btn-premium inline-flex items-center gap-3 py-4 px-10 text-sm"
              >
                Claim My Founding Spot <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Cross-link to other comparisons */}
          <div className="mt-16">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-6">
              More Comparisons
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {COMPETITORS.filter(
                (c) => c.slug !== competitor.slug && c.vertical === competitor.vertical
              )
                .slice(0, 6)
                .map((c) => (
                  <Link
                    key={c.slug}
                    href={`/compare/${c.slug}`}
                    className="bento-card p-4 hover:border-zinc-600 transition-colors"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
                      {c.vertical}
                    </p>
                    <p className="text-sm font-bold text-zinc-200">Practiq vs {c.name}</p>
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
