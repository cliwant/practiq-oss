import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";
import { VS_PAIRS, type VsPair } from "@/data/vs/pairs";
import { PRACTIQ_VS_COMPETITORS } from "@/data/comparisons";
import {
  JsonLd,
  SITE_URL,
  breadcrumbJsonLd,
  itemListJsonLd,
} from "@/lib/seo/json-ld";

export const metadata: Metadata = {
  title: "Software Comparisons for Small Professional Services Firms — 2026",
  description:
    "Head-to-head comparisons of Clio vs MyCase, TaxDome vs Karbon, Rippling vs Gusto, Monday vs Asana, and more. Honest verdicts for 2-10 person firms.",
  alternates: { canonical: `${SITE_URL}/vs` },
};

const VERTICAL_LABELS: Record<
  VsPair["vertical"],
  { label: string; description: string }
> = {
  accounting: {
    label: "Accounting",
    description:
      "Practice management, workflow, and tax resolution tool comparisons",
  },
  law: {
    label: "Law",
    description:
      "Legal case management, billing, and CRM platform comparisons",
  },
  hr: {
    label: "HR Advisory",
    description:
      "HRIS, payroll, and SMB HR platform comparisons",
  },
  consulting: {
    label: "Consulting & Cross-Vertical",
    description:
      "Project management, CRM, and productivity platform comparisons",
  },
  agency: {
    label: "Agency",
    description:
      "Marketing automation, CRM, and agency operations comparisons",
  },
};

// Long-form comparison pages — dedicated route files under /vs/*
// authored as 1700-2200 word operator-grade comparisons. Kept in lockstep
// with the physical files at src/app/vs/{slug}/page.tsx. These rank for
// high-intent GSC queries where Practiq sits at positions 28-50 — the
// dedicated long-form layout outperforms the templated VS_PAIRS variant.
const LONG_FORM_COMPARISONS: Array<{
  slug: string;
  title: string;
  summary: string;
}> = [
  {
    slug: "karbon-vs-taxdome",
    title: "Karbon vs TaxDome",
    summary:
      "Workflow depth vs all-in-one client portal. Pick based on whether your bottleneck is team coordination or client document collection — operator picks by firm shape.",
  },
  {
    slug: "karbon-vs-canopy",
    title: "Karbon vs Canopy",
    summary:
      "Workflow modeling depth vs IRS Transcript Delivery + tax resolution workflows. Picks for advisory firms vs resolution-heavy practices.",
  },
  {
    slug: "canopy-vs-taxdome",
    title: "Canopy vs TaxDome",
    summary:
      "Native IRS transcripts vs best-in-class client portal. Pick by practice mix — resolution-heavy firms pick Canopy, tax-prep-heavy firms pick TaxDome.",
  },
  {
    slug: "jetpack-workflow-vs-karbon",
    title: "Jetpack Workflow vs Karbon",
    summary:
      "Affordable simplicity vs workflow depth. 1-5 person firms usually pick Jetpack; 7+ person firms usually pick Karbon. The 5-7 range is where the decision is hardest.",
  },
  {
    slug: "karbon-alternatives",
    title: "Karbon alternatives — 5 worth shortlisting",
    summary:
      "Curated roundup: TaxDome, Canopy, Jetpack Workflow, Aero, Financial Cents. Decision framework by firm shape + honest migration costs.",
  },
];

export default function VsIndexPage() {
  const byVertical = VS_PAIRS.reduce((acc, p) => {
    if (!acc[p.vertical]) acc[p.vertical] = [];
    acc[p.vertical].push(p);
    return acc;
  }, {} as Record<VsPair["vertical"], VsPair[]>);

  // Breadcrumb: Home > Comparisons. Two-level only on the index — the
  // /vs/[slug] pages append a third item themselves.
  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Comparisons", url: `${SITE_URL}/vs` },
  ]);

  // ItemList — combines both the Practiq-vs-X cluster and the two-competitor
  // VS_PAIRS into one curated index. Ordered with the Practiq-vs-X items
  // first (matches the visual ordering on the page — higher commercial
  // intent), then VS_PAIRS in their declaration order. Each list item is a
  // bare {name,url} pair; Google's ListItem accepts both a string url AND
  // a nested item entity, but the bare url shape works universally and
  // avoids fabricating Product entities we don't fully back with offers.
  const itemListLd = itemListJsonLd({
    name: "Software Comparisons for Small Professional Services Firms",
    description:
      "Head-to-head software comparisons for accounting, law, HR advisory, consulting, and agency firms (2-10 people).",
    url: `${SITE_URL}/vs`,
    items: [
      // Long-form comparisons sit first — they are the highest-intent
      // GSC queries (positions 28-50 pre-launch) and the layout
      // mirrors that with a top-of-page section.
      ...LONG_FORM_COMPARISONS.map((c) => ({
        name: c.title,
        url: `${SITE_URL}/vs/${c.slug}`,
      })),
      ...PRACTIQ_VS_COMPETITORS.map((c) => ({
        name: `Practiq vs ${c.name}`,
        url: `${SITE_URL}/vs/${c.slug}`,
      })),
      ...VS_PAIRS.map((p) => ({
        name: `${p.toolA.name} vs ${p.toolB.name}`,
        url: `${SITE_URL}/vs/${p.slug}`,
      })),
    ],
  });

  return (
    <div className="min-h-screen bg-bg-base">
      <Nav />
      <JsonLd data={breadcrumbLd} />
      <JsonLd data={itemListLd} />
      <main className="pt-32 pb-16 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-4">
            Head-to-Head Comparisons
          </p>
          <h1 className="text-4xl md:text-5xl font-black text-zinc-100 tracking-tight leading-tight mb-4">
            Software comparisons for small firms.
          </h1>
          <p className="text-lg text-zinc-400 leading-relaxed mb-12 max-w-2xl">
            Honest head-to-head comparisons of the most commonly evaluated
            tools for 2-10 person firms in accounting, law, HR advisory,
            consulting, and agency. Verdicts, strengths, and when to pick
            each.
          </p>

          {/* Long-form comparisons — operator-grade 1700-2200 word
              pages built as dedicated route files (not template-rendered
              from VS_PAIRS). Sits at top because these target the
              highest-intent GSC queries — exact-match competitor-vs-
              competitor searches with strong commercial intent. */}
          <section className="mb-16">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-zinc-100 mb-2">
                In-depth accounting software comparisons
              </h2>
              <p className="text-sm text-zinc-500">
                Long-form operator-grade comparisons — 1,700-2,200 words
                each, with side-by-side tables, real review quotes, and
                operator picks by firm shape. Use these when you&apos;re
                actually shortlisting tools, not browsing.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4">
              {LONG_FORM_COMPARISONS.map((c) => (
                <Link
                  key={c.slug}
                  href={`/vs/${c.slug}`}
                  className="bento-card p-5 hover:border-zinc-600 transition-colors group bg-gradient-to-br from-blue-500/5 to-transparent"
                >
                  <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-2">
                    Accounting · In-depth
                  </p>
                  <h3 className="text-base font-bold text-zinc-100 mb-2 group-hover:text-white">
                    {c.title}
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3">
                    {c.summary}
                  </p>
                </Link>
              ))}
            </div>
          </section>

          {/* Practiq-vs-$competitor cluster — wave-4-plan P3-07. Sits
              above the two-competitor pairs because Practiq-centric
              queries (e.g. "practiq vs iqidis") convert harder than
              X-vs-Y queries and the Reddit-mined practitioner quotes
              read as more useful social proof. */}
          <section className="mb-16">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-zinc-100 mb-2">
                Practiq vs the AI tools small firms keep mentioning
              </h2>
              <p className="text-sm text-zinc-500">
                Honest verdicts on where Practiq wins and where each
                competitor still leads. Sourced from r/Lawyertalk,
                r/legaltech, r/LawFirm, r/Accounting, r/Bookkeeping.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-4">
              {PRACTIQ_VS_COMPETITORS.map((c) => (
                <Link
                  key={c.slug}
                  href={`/vs/${c.slug}`}
                  className="bento-card p-5 hover:border-zinc-600 transition-colors group bg-gradient-to-br from-emerald-500/5 to-transparent"
                >
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-2">
                    {c.vertical.toUpperCase()}
                  </p>
                  <h3 className="text-base font-bold text-zinc-100 mb-2 group-hover:text-white">
                    Practiq vs {c.name}
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3">
                    {c.summary}
                  </p>
                </Link>
              ))}
            </div>
          </section>

          {(Object.keys(VERTICAL_LABELS) as VsPair["vertical"][]).map((v) => {
            const list = byVertical[v];
            if (!list || list.length === 0) return null;
            const info = VERTICAL_LABELS[v];
            return (
              <section key={v} className="mb-16">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-zinc-100 mb-2">
                    {info.label}
                  </h2>
                  <p className="text-sm text-zinc-500">{info.description}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {list.map((p) => (
                    <Link
                      key={p.slug}
                      href={`/vs/${p.slug}`}
                      className="bento-card p-5 hover:border-zinc-600 transition-colors group"
                    >
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
                        {p.vertical.toUpperCase()}
                      </p>
                      <h3 className="text-base font-bold text-zinc-100 mb-2 group-hover:text-white">
                        {p.toolA.name} vs {p.toolB.name}
                      </h3>
                      <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3">
                        {p.summary}
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}

          <div className="mt-16 pt-10 border-t border-zinc-800">
            <p className="text-sm text-zinc-500 leading-relaxed max-w-2xl">
              Looking for a ranked list instead?{" "}
              <Link
                href="/best"
                className="text-zinc-300 hover:text-white underline underline-offset-4"
              >
                Browse the Top 5 best-of guides
              </Link>{" "}
              or{" "}
              <Link
                href="/compare"
                className="text-zinc-300 hover:text-white underline underline-offset-4"
              >
                see Practiq vs every major competitor
              </Link>
              .
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
