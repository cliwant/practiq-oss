import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";
import { COMPETITORS } from "@/data/compare/competitors";

const SITE_URL = "https://practiq.dev";

export const metadata: Metadata = {
  title: "Compare Practiq vs 24+ Practice Management Tools",
  description:
    "Honest side-by-side comparisons of Practiq with TaxDome, Karbon, Clio, MyCase, BambooHR, Asana, Monday, HubSpot, and 17 other tools for boutique professional services firms.",
  alternates: { canonical: `${SITE_URL}/compare` },
};

const VERTICAL_LABELS: Record<string, { label: string; description: string }> = {
  accounting: {
    label: "Accounting",
    description: "Practice management, workflow, and tax resolution tools",
  },
  law: {
    label: "Law",
    description: "Legal practice management and billing platforms",
  },
  hr: {
    label: "HR Advisory",
    description: "HRIS and advisory workspace tools",
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

export default function ComparePage() {
  const byVertical = COMPETITORS.reduce((acc, c) => {
    if (!acc[c.vertical]) acc[c.vertical] = [];
    acc[c.vertical].push(c);
    return acc;
  }, {} as Record<string, typeof COMPETITORS>);

  return (
    <div className="min-h-screen bg-bg-base">
      <Nav />
      <main className="pt-32 pb-16 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-4">
            Comparisons
          </p>
          <h1 className="text-4xl md:text-5xl font-black text-zinc-100 tracking-tight leading-tight mb-4">
            Practiq vs everything else.
          </h1>
          <p className="text-lg text-zinc-400 leading-relaxed mb-12 max-w-2xl">
            Honest side-by-side comparisons. We tell you when to use Practiq, when to use the
            alternative, and when to use both together.
          </p>

          {Object.keys(VERTICAL_LABELS).map((v) => {
            const list = byVertical[v];
            if (!list) return null;
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
                      href={`/compare/practiq-vs-${c.slug}`}
                      className="bento-card p-5 hover:border-zinc-600 transition-colors group"
                    >
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
                        Compare
                      </p>
                      <h3 className="text-base font-bold text-zinc-100 mb-2 group-hover:text-white">
                        Practiq vs {c.name}
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
        </div>
      </main>
      <Footer />
    </div>
  );
}
