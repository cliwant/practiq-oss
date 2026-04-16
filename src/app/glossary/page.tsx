import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";
import {
  GLOSSARY_TERMS,
  VERTICAL_LABELS,
  type GlossaryVertical,
} from "@/data/glossary/terms";
import { GlossaryFilter } from "./glossary-filter";

const SITE_URL = "https://practiq.dev";

export const metadata: Metadata = {
  title: "Professional Services Glossary — Accounting, Law, HR, Consulting, Agency",
  description:
    "40 essential terms every small firm operator should know. Plain-language definitions, how each term shows up in practice, and authoritative sources.",
  alternates: { canonical: `${SITE_URL}/glossary` },
  openGraph: {
    title: "Professional Services Glossary | Practiq",
    description:
      "40 essential terms every small firm operator should know — accounting, law, HR, consulting, agency, and cross-cutting.",
    url: `${SITE_URL}/glossary`,
    type: "website",
  },
};

const ORDER: GlossaryVertical[] = [
  "accounting",
  "law",
  "hr",
  "consulting",
  "agency",
  "cross",
];

const VERTICAL_DESCRIPTIONS: Record<GlossaryVertical, string> = {
  accounting:
    "Terms used in daily bookkeeping, monthly close, and financial reporting.",
  law: "Terms every attorney and legal operations lead encounters.",
  hr: "The vocabulary of multi-state compliance and people operations.",
  consulting: "Project economics, scope, and engagement structure.",
  agency: "Account management, creative review, and retainer economics.",
  cross: "Concepts that span every professional services vertical.",
};

export default function GlossaryIndexPage() {
  // Group terms by vertical for the server-rendered default view.
  const byVertical = ORDER.reduce<Record<GlossaryVertical, typeof GLOSSARY_TERMS>>(
    (acc, v) => {
      acc[v] = GLOSSARY_TERMS.filter((t) => t.vertical === v);
      return acc;
    },
    {
      accounting: [],
      law: [],
      hr: [],
      consulting: [],
      agency: [],
      cross: [],
    }
  );

  // Breadcrumb schema for the index page.
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Glossary", item: `${SITE_URL}/glossary` },
    ],
  };

  // DefinedTermSet schema declares the glossary as a cohesive set,
  // which helps AI answer engines treat the corpus as a single
  // authoritative reference rather than 40 isolated pages.
  const termSetJsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    "@id": `${SITE_URL}/glossary#termset`,
    name: "Practiq Professional Services Glossary",
    description:
      "40 essential terms for small firm operators across accounting, law, HR, consulting, and agency practice.",
    url: `${SITE_URL}/glossary`,
    hasDefinedTerm: GLOSSARY_TERMS.map((t) => ({
      "@type": "DefinedTerm",
      "@id": `${SITE_URL}/glossary/${t.slug}#definedterm`,
      name: t.term,
      description: t.shortDefinition,
      url: `${SITE_URL}/glossary/${t.slug}`,
    })),
  };

  // Flat list for the client-side filter component.
  const flatTerms = GLOSSARY_TERMS.map((t) => ({
    slug: t.slug,
    term: t.term,
    shortDefinition: t.shortDefinition,
    vertical: t.vertical,
  }));

  return (
    <div className="min-h-screen bg-bg-base">
      <Nav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(termSetJsonLd) }}
      />

      <main className="pt-32 pb-16 px-6">
        <div className="max-w-5xl mx-auto">
          {/* Hero */}
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-4">
            Professional Services Glossary
          </p>
          <h1 className="text-4xl md:text-5xl font-black text-zinc-100 tracking-tight leading-tight mb-4">
            40 terms every small firm operator should know.
          </h1>
          <p className="text-lg text-zinc-400 leading-relaxed mb-10 max-w-3xl">
            Plain-language definitions of the concepts that show up in daily work across
            accounting, law, HR advisory, consulting, and agency practice — plus
            cross-cutting operational terms that matter regardless of vertical.
          </p>

          {/* Filter + searchable list (client-side) */}
          <GlossaryFilter terms={flatTerms} />

          {/* Grouped-by-vertical default view — always rendered so
              search engines and AI crawlers get the full structure
              even if they don't execute the filter component. */}
          <div className="mt-16 space-y-16">
            {ORDER.map((v) => {
              const terms = byVertical[v];
              if (terms.length === 0) return null;
              return (
                <section key={v} id={v}>
                  <div className="flex items-baseline justify-between mb-6 pb-3 border-b border-zinc-800">
                    <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">
                      {VERTICAL_LABELS[v]}
                      <span className="ml-3 text-sm font-medium text-zinc-500">
                        {terms.length} terms
                      </span>
                    </h2>
                  </div>
                  <p className="text-sm text-zinc-400 mb-6 max-w-2xl">
                    {VERTICAL_DESCRIPTIONS[v]}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {terms.map((t) => (
                      <Link
                        key={t.slug}
                        href={`/glossary/${t.slug}`}
                        className="bento-card p-5 hover:border-zinc-600 transition-colors group"
                      >
                        <p className="text-base font-bold text-zinc-100 group-hover:text-amber-400 transition-colors mb-2">
                          {t.term}
                        </p>
                        <p className="text-sm text-zinc-400 leading-relaxed line-clamp-3">
                          {t.shortDefinition}
                        </p>
                      </Link>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>

          {/* Back-to-top / footer CTA */}
          <div className="mt-20 pt-10 border-t border-zinc-800">
            <div className="bento-card p-10 text-center bg-gradient-to-br from-amber-500/5 to-transparent">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400 mb-4">
                A Workspace for Multi-Client Firms
              </p>
              <h2 className="text-3xl font-black text-zinc-100 tracking-tight mb-4">
                Your institutional knowledge, structured.
              </h2>
              <p className="text-zinc-400 mb-8 max-w-xl mx-auto">
                Practiq gives every client a dedicated workspace — complete history, AI
                that scans overnight, and deliverables ready in your firm&apos;s voice by
                morning.
              </p>
              <Link
                href="/?utm_source=glossary&utm_medium=cta&utm_campaign=index#cta"
                className="btn-premium inline-flex items-center gap-3 py-4 px-10 text-sm"
              >
                See Pricing
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
