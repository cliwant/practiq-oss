import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";
import { COMPETITORS } from "@/data/compare/competitors";

const SITE_URL = "https://practiq.dev";

// Mirrors FEATURED_SLUGS in [tool]/page.tsx — keep in sync.
const FEATURED_SLUGS = [
  "clio",
  "mycase",
  "taxdome",
  "karbon",
  "rippling",
  "gusto",
  "bamboohr",
  "hubspot",
  "monday",
  "asana",
] as const;

export const metadata: Metadata = {
  title: "Software Alternatives for Small Professional Services Firms in 2026",
  description:
    "Ranked alternatives to Clio, MyCase, TaxDome, Karbon, Rippling, Gusto, BambooHR, HubSpot, Monday, and Asana. Built for 2-10 person firms deciding what tool to add — or replace.",
  alternates: { canonical: `${SITE_URL}/alternatives` },
};

const VERTICAL_LABELS: Record<string, { label: string; description: string }> = {
  accounting: {
    label: "Accounting",
    description: "Practice management and workflow tools",
  },
  law: {
    label: "Law",
    description: "Legal practice management platforms",
  },
  hr: {
    label: "HR Advisory",
    description: "HRIS and employee platform alternatives",
  },
  consulting: {
    label: "Consulting",
    description: "Project management and knowledge workspace tools",
  },
  agency: {
    label: "Agency",
    description: "Marketing automation and agency operations platforms",
  },
};

export default function AlternativesIndexPage() {
  const featured = FEATURED_SLUGS.map((slug) =>
    COMPETITORS.find((c) => c.slug === slug)
  ).filter((c): c is (typeof COMPETITORS)[number] => Boolean(c));

  const byVertical = featured.reduce((acc, c) => {
    if (!acc[c.vertical]) acc[c.vertical] = [];
    acc[c.vertical].push(c);
    return acc;
  }, {} as Record<string, typeof featured>);

  return (
    <div className="min-h-screen bg-bg-base">
      <Nav />
      <main className="pt-32 pb-16 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-4">
            Alternatives
          </p>
          <h1 className="text-4xl md:text-5xl font-black text-zinc-100 tracking-tight leading-tight mb-4">
            Software alternatives for small firms.
          </h1>
          <p className="text-lg text-zinc-400 leading-relaxed mb-12 max-w-2xl">
            Ranked lists of the top 5 alternatives for each major practice management and
            workspace tool. Built for 2-10 person firms deciding what to add — or replace — in
            2026.
          </p>

          {Object.keys(VERTICAL_LABELS).map((v) => {
            const list = byVertical[v];
            if (!list || list.length === 0) return null;
            const info = VERTICAL_LABELS[v];
            return (
              <section key={v} className="mb-16">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-zinc-100 mb-2">{info.label}</h2>
                  <p className="text-sm text-zinc-500">{info.description}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {list.map((c) => (
                    <Link
                      key={c.slug}
                      href={`/alternatives/${c.slug}`}
                      className="bento-card p-5 hover:border-zinc-600 transition-colors group"
                    >
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
                        Top 5 Alternatives
                      </p>
                      <h3 className="text-base font-bold text-zinc-100 mb-2 group-hover:text-white">
                        {c.name} Alternatives
                      </h3>
                      <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3">
                        {c.tagline}
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}

          <div className="mt-16 pt-10 border-t border-zinc-800">
            <p className="text-sm text-zinc-500 leading-relaxed max-w-2xl">
              Looking for a direct head-to-head comparison instead?{" "}
              <Link
                href="/compare"
                className="text-zinc-300 hover:text-white underline underline-offset-4"
              >
                Browse all {COMPETITORS.length} Practiq comparisons
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
