import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";
import {
  BEST_FOR_QUERIES,
  type BestForQuery,
} from "@/data/best-for/queries";

const SITE_URL = "https://practiq.dev";

export const metadata: Metadata = {
  title:
    "Best Software for Small Professional Services Firms — 2026 Guides",
  description:
    "Ranked 'best X for Y' guides covering practice management, billing, CRM, workflow, project management, payroll, and more. Built for 2-10 person firms in accounting, law, HR advisory, consulting, and agency.",
  alternates: { canonical: `${SITE_URL}/best` },
};

const VERTICAL_LABELS: Record<
  BestForQuery["vertical"],
  { label: string; description: string }
> = {
  accounting: {
    label: "Accounting",
    description:
      "Practice management, workflow, tax preparation, and bookkeeping software rankings",
  },
  law: {
    label: "Law",
    description:
      "Case management, legal billing, and legal CRM platform rankings",
  },
  hr: {
    label: "HR Advisory",
    description:
      "Multi-client HR, payroll, and compliance tool rankings for HR consultants",
  },
  consulting: {
    label: "Consulting",
    description:
      "Project management and CRM platform rankings for boutique consulting firms",
  },
  agency: {
    label: "Agency",
    description:
      "Project management, CRM, and time tracking tool rankings for marketing agencies",
  },
};

export default function BestIndexPage() {
  const byVertical = BEST_FOR_QUERIES.reduce((acc, q) => {
    if (!acc[q.vertical]) acc[q.vertical] = [];
    acc[q.vertical].push(q);
    return acc;
  }, {} as Record<BestForQuery["vertical"], BestForQuery[]>);

  return (
    <div className="min-h-screen bg-bg-base">
      <Nav />
      <main className="pt-32 pb-16 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-4">
            Best Software Guides
          </p>
          <h1 className="text-4xl md:text-5xl font-black text-zinc-100 tracking-tight leading-tight mb-4">
            Best software for small professional services firms.
          </h1>
          <p className="text-lg text-zinc-400 leading-relaxed mb-12 max-w-2xl">
            Ranked Top 5 lists for the software categories that matter to
            2-10 person firms in accounting, law, HR advisory, consulting,
            and agency. Honest pricing, AI capability analysis, and fit
            guidance for each vertical.
          </p>

          {(Object.keys(VERTICAL_LABELS) as BestForQuery["vertical"][]).map(
            (v) => {
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
                    {list.map((q) => (
                      <Link
                        key={q.slug}
                        href={`/best/${q.slug}`}
                        className="bento-card p-5 hover:border-zinc-600 transition-colors group"
                      >
                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
                          Top 5 · {q.category}
                        </p>
                        <h3 className="text-base font-bold text-zinc-100 mb-2 group-hover:text-white leading-snug">
                          {q.h1}
                        </h3>
                        <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3">
                          {q.metaDescription}
                        </p>
                      </Link>
                    ))}
                  </div>
                </section>
              );
            }
          )}

          <div className="mt-16 pt-10 border-t border-zinc-800">
            <p className="text-sm text-zinc-500 leading-relaxed max-w-2xl">
              Looking for a head-to-head tool comparison?{" "}
              <Link
                href="/vs"
                className="text-zinc-300 hover:text-white underline underline-offset-4"
              >
                Browse cross-tool comparisons
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
