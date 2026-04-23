import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";
import {
  GLOSSARY_TERMS,
  getGlossaryTerm,
  getRelatedTerms,
  VERTICAL_LABELS,
  type GlossaryTerm,
} from "@/data/glossary/terms";

const SITE_URL = "https://practiq.dev";

// Verticals that have dedicated /for/{slug} landing pages — "cross"
// doesn't map to a vertical landing so we skip the CTA for it.
const VERTICAL_LANDINGS = new Set(["accounting", "law", "hr", "consulting", "agency"]);

interface Props {
  params: Promise<{ term: string }>;
}

export async function generateStaticParams() {
  return GLOSSARY_TERMS.map((t) => ({ term: t.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { term: slug } = await params;
  const entry = getGlossaryTerm(slug);
  if (!entry) return { title: "Not found" };

  const title = `${entry.term} | Glossary`;
  const description = `${entry.shortDefinition} — Practiq's glossary for small firm operators.`;

  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/glossary/${entry.slug}`,
    },
    openGraph: {
      title: `${entry.term} | Glossary | Practiq`,
      description,
      url: `${SITE_URL}/glossary/${entry.slug}`,
      type: "article",
    },
  };
}

export default async function GlossaryTermPage({ params }: Props) {
  const { term: slug } = await params;
  const entry = getGlossaryTerm(slug);
  if (!entry) notFound();

  const pageUrl = `${SITE_URL}/glossary/${entry.slug}`;
  const related = getRelatedTerms(entry, 5);
  const topContrast = related.slice(0, 3);
  const hasVerticalLanding = VERTICAL_LANDINGS.has(entry.vertical);
  const verticalLabel = VERTICAL_LABELS[entry.vertical];

  // DefinedTerm schema — the primary AEO schema for glossary entries.
  // Search engines and AI answer engines favor DefinedTerm for
  // "what is X?" queries and often cite it verbatim in responses.
  const definedTermJsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    "@id": `${pageUrl}#definedterm`,
    name: entry.term,
    description: entry.shortDefinition,
    url: pageUrl,
    inDefinedTermSet: {
      "@type": "DefinedTermSet",
      "@id": `${SITE_URL}/glossary#termset`,
      name: "Practiq Professional Services Glossary",
      url: `${SITE_URL}/glossary`,
    },
    ...(entry.source
      ? {
          sameAs: entry.source.url,
        }
      : {}),
  };

  // Breadcrumb schema for search result presentation
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Glossary", item: `${SITE_URL}/glossary` },
      {
        "@type": "ListItem",
        position: 3,
        name: entry.term,
        item: pageUrl,
      },
    ],
  };

  // Article schema — treats the expanded explainer page as a
  // citable article for AI search engines.
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${entry.term} — Definition, Context, and Examples`,
    description: entry.shortDefinition,
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
    about: {
      "@id": `${pageUrl}#definedterm`,
    },
  };

  // FAQ-style mini-entries drawn from related terms for AEO.
  // Each Q/A is short enough to become a zero-click answer.
  const faqs = buildFaqs(entry, related);
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="min-h-screen bg-bg-base">
      <Nav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(definedTermJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <main className="pt-32 pb-16 px-6">
        <article className="max-w-4xl mx-auto">
          {/* Breadcrumb trail */}
          <nav
            className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-4"
            aria-label="Breadcrumb"
          >
            <Link href="/glossary" className="hover:text-zinc-300 transition-colors">
              Glossary
            </Link>
            <span className="mx-2 text-zinc-700">/</span>
            <span className="text-zinc-400">{verticalLabel}</span>
          </nav>

          {/* H1 + lead paragraph — front-loads shortDefinition for AEO */}
          <h1 className="text-4xl md:text-5xl font-black text-zinc-100 tracking-tight leading-tight mb-4">
            {entry.term} — Definition, Context, and Examples
          </h1>

          <p className="text-lg text-zinc-300 leading-relaxed mb-10 max-w-3xl">
            <strong className="text-zinc-100">{entry.term}</strong> is{" "}
            <span className="text-zinc-300">{lowerFirst(entry.shortDefinition)}</span>{" "}
            This page explains the term in depth, how it is used in{" "}
            {verticalLabel.toLowerCase()} work, and how it relates to adjacent
            concepts in the professional services operating vocabulary.
          </p>

          {/* Main body — longDefinition */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-zinc-100 mb-5 tracking-tight">
              What is {entry.term}?
            </h2>
            <div
              className="prose-dark text-zinc-300 leading-relaxed space-y-4"
              dangerouslySetInnerHTML={{ __html: entry.longDefinition }}
            />
          </section>

          {/* Examples section — contextualizes term in the vertical */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-zinc-100 mb-5 tracking-tight">
              How is {entry.term} used in {verticalLabel.toLowerCase()} work?
            </h2>
            <div className="bento-card p-6">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400 mb-3">
                Example in practice
              </p>
              <p className="text-sm text-zinc-300 leading-relaxed">
                {entry.examples}
              </p>
            </div>
          </section>

          {/* Contrast section — structured differences from related terms */}
          {topContrast.length > 0 && (
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-zinc-100 mb-5 tracking-tight">
                How {entry.term} differs from related terms
              </h2>
              <div className="space-y-4">
                {topContrast.map((rel) => (
                  <div key={rel.slug} className="bento-card p-6">
                    <h3 className="text-base font-bold text-zinc-100 mb-3">
                      What is the difference between {entry.term} and {rel.term}?
                    </h3>
                    <p className="text-sm text-zinc-400 leading-relaxed mb-3">
                      {buildContrast(entry, rel)}
                    </p>
                    <Link
                      href={`/glossary/${rel.slug}`}
                      className="text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors inline-flex items-center gap-1"
                    >
                      Read the full {rel.term} definition
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Source attribution */}
          {entry.source && (
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-zinc-100 mb-5 tracking-tight">
                Where does the authoritative reference come from?
              </h2>
              <div className="bento-card p-6">
                <p className="text-sm text-zinc-300 leading-relaxed mb-3">
                  The definition and standards governing {entry.term} draw primarily
                  from guidance published by{" "}
                  <strong className="text-zinc-100">{entry.source.name}</strong>. For
                  the most recent rulings, interpretations, and model language, consult
                  the source directly.
                </p>
                <a
                  href={entry.source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors inline-flex items-center gap-1"
                >
                  Visit {entry.source.name}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </section>
          )}

          {/* FAQ — more AEO-optimized micro-entries */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-zinc-100 mb-5 tracking-tight">
              Frequently asked about {entry.term}
            </h2>
            <div className="space-y-4">
              {faqs.map((f) => (
                <div key={f.q} className="bento-card p-6">
                  <h3 className="text-base font-bold text-zinc-100 mb-3">{f.q}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{f.a}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Related terms grid */}
          {related.length > 0 && (
            <section className="mb-12">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-4">
                Related Terms
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {related.map((r) => (
                  <Link
                    key={r.slug}
                    href={`/glossary/${r.slug}`}
                    className="bento-card p-4 hover:border-zinc-600 transition-colors"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
                      {VERTICAL_LABELS[r.vertical]}
                    </p>
                    <p className="text-sm font-bold text-zinc-200">{r.term}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* CTA */}
          <div className="mt-16 pt-10 border-t border-zinc-800">
            <div className="bento-card p-10 text-center bg-gradient-to-br from-amber-500/5 to-transparent">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400 mb-4">
                Built for Multi-Client Professional Firms
              </p>
              <h2 className="text-3xl font-black text-zinc-100 tracking-tight mb-4">
                A workspace that knows every client the way you do.
              </h2>
              <p className="text-zinc-400 mb-8 max-w-xl mx-auto">
                Practiq maintains a live workspace per client, scans your portfolio
                overnight, and surfaces what needs attention each morning — so your
                team keeps its institutional knowledge as it scales.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link
                  href={`/?utm_source=glossary&utm_medium=cta&utm_campaign=${entry.slug}#cta`}
                  className="btn-premium inline-flex items-center gap-3 py-4 px-10 text-sm"
                >
                  See Pricing
                  <ArrowRight className="w-4 h-4" />
                </Link>
                {hasVerticalLanding && (
                  <Link
                    href={`/for/${entry.vertical}?utm_source=glossary&utm_medium=cta&utm_campaign=${entry.slug}`}
                    className="btn-outline inline-flex items-center gap-3 py-4 px-8 text-sm"
                  >
                    Practiq for {verticalLabel}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}

// ─────────────────────────────────────────────
// Helpers — kept in file so the route is self-contained.
// ─────────────────────────────────────────────

function lowerFirst(s: string): string {
  if (!s) return s;
  return s.charAt(0).toLowerCase() + s.slice(1);
}

function buildContrast(a: GlossaryTerm, b: GlossaryTerm): string {
  // Generates a 2-sentence contrast paragraph using the shortDefinitions
  // of both terms. Substantially rewritten rather than paraphrased to
  // keep each page's body text unique.
  return `${a.term} refers to ${lowerFirst(a.shortDefinition)} ${b.term}, in contrast, is ${lowerFirst(
    b.shortDefinition
  )} The two show up in the same operational conversations but answer different questions — ${a.term.toLowerCase()} describes the ${a.vertical === "cross" ? "operational" : a.vertical} artifact itself, while ${b.term.toLowerCase()} addresses a related but distinct part of the workflow.`;
}

function buildFaqs(
  entry: GlossaryTerm,
  related: GlossaryTerm[]
): Array<{ q: string; a: string }> {
  const faqs: Array<{ q: string; a: string }> = [];

  faqs.push({
    q: `What does ${entry.term} mean in simple terms?`,
    a: entry.shortDefinition,
  });

  if (related[0]) {
    faqs.push({
      q: `Is ${entry.term} the same as ${related[0].term}?`,
      a: `No. ${entry.term} and ${related[0].term} are related concepts but address different parts of the workflow. ${entry.term} is ${lowerFirst(
        entry.shortDefinition
      )} ${related[0].term} is ${lowerFirst(related[0].shortDefinition)}`,
    });
  }

  faqs.push({
    q: `Who typically owns ${entry.term} in a small firm?`,
    a: ownerByVertical(entry),
  });

  if (entry.source) {
    faqs.push({
      q: `Where is the authoritative standard for ${entry.term} published?`,
      a: `The most widely cited authority for ${entry.term} is ${entry.source.name}. Firms should consult the source directly for the most current rules, interpretations, and model language, since guidance is updated regularly.`,
    });
  } else {
    faqs.push({
      q: `Is ${entry.term} a regulated term?`,
      a: `${entry.term} is a widely used operational term in professional services. It is not tied to a single regulatory standard, though related concepts (contracts, revenue recognition, employment status) may carry legal or accounting rules in specific contexts.`,
    });
  }

  return faqs;
}

function ownerByVertical(entry: GlossaryTerm): string {
  switch (entry.vertical) {
    case "accounting":
      return `In a small accounting or bookkeeping firm, ${entry.term} is typically owned by the engagement senior or partner, with staff accountants executing the day-to-day work and the partner reviewing before client release.`;
    case "law":
      return `In a small law firm, ${entry.term} is typically managed by the responsible attorney for the matter, with support from paralegals for preparation and an administrative lead for procedural tracking.`;
    case "hr":
      return `In an HR advisory firm, ${entry.term} is typically handled by the senior HR consultant or practice lead, with administrative staff supporting documentation and compliance follow-through.`;
    case "consulting":
      return `In a consulting firm, ${entry.term} is typically owned by the engagement manager or principal, with associates executing against it and the partner signing off on client-facing decisions.`;
    case "agency":
      return `In a marketing or creative agency, ${entry.term} is typically owned by the Account Manager in partnership with the creative lead, with project-management support and senior oversight on major decisions.`;
    case "cross":
    default:
      return `${entry.term} is typically a shared operational responsibility — the partner or principal sets the policy, engagement leads execute, and administrative staff maintain records. Clear ownership is itself a predictor of firm health.`;
  }
}
