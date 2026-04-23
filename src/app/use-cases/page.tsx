import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";
import { USE_CASES, type UseCase } from "@/data/use-cases/use-cases";

const SITE_URL = "https://practiq.dev";

export const metadata: Metadata = {
  title: "Practiq Use Cases — Workflows for Small Professional Services Firms",
  description:
    "How Practiq handles monthly close, matter handoff, multi-state HR compliance, engagement context preservation, account management, and client onboarding for small firms.",
  alternates: { canonical: `${SITE_URL}/use-cases` },
};

const VERTICAL_LABELS: Record<
  UseCase["vertical"],
  { label: string; description: string }
> = {
  accounting: {
    label: "Accounting",
    description:
      "Monthly close, tax season triage, and anomaly detection workflows for small CPA firms",
  },
  law: {
    label: "Law",
    description:
      "Matter handoff, deadline management, and matter context workflows for small law firms",
  },
  hr: {
    label: "HR Advisory",
    description:
      "Multi-state compliance surveillance, benefits renewal, and onboarding workflows for HR consultants",
  },
  consulting: {
    label: "Consulting",
    description:
      "Engagement context preservation, handoff, and strategic delivery workflows for boutique consulting firms",
  },
  agency: {
    label: "Agency",
    description:
      "Retainer account management, scope creep detection, and QBR workflows for marketing agencies",
  },
  cross: {
    label: "Cross-Vertical",
    description:
      "Workflows that apply across verticals — onboarding, context switching, and knowledge management",
  },
};

const collectionSchema = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Practiq Use Cases",
  description:
    "Workflow-specific use cases for how Practiq handles monthly close, matter handoff, multi-state HR compliance, engagement context, account management, and client onboarding.",
  url: `${SITE_URL}/use-cases`,
};

export default function UseCasesIndexPage() {
  const byVertical = USE_CASES.reduce((acc, u) => {
    if (!acc[u.vertical]) acc[u.vertical] = [];
    acc[u.vertical].push(u);
    return acc;
  }, {} as Record<UseCase["vertical"], UseCase[]>);

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100">
      <Nav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />

      <section className="px-6 pt-32 pb-10">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            Use Cases · Practiq in workflow
          </p>
          <h1 className="mb-6 text-4xl font-extrabold tracking-[-0.03em] text-zinc-100 sm:text-5xl lg:text-6xl">
            How Practiq handles{" "}
            <span className="text-zinc-500">the workflows that matter.</span>
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
            Concrete workflow walkthroughs — monthly close, matter handoff,
            multi-state HR compliance, engagement context, account
            management, and client onboarding — with real outcome metrics
            from firms using Practiq.
          </p>
        </div>
      </section>

      <section className="px-6 pb-20">
        <div className="mx-auto max-w-5xl">
          {(Object.keys(VERTICAL_LABELS) as UseCase["vertical"][]).map((v) => {
            const list = byVertical[v];
            if (!list || list.length === 0) return null;
            const info = VERTICAL_LABELS[v];
            return (
              <section key={v} className="mb-16">
                <div className="mb-6 border-b border-zinc-800 pb-4">
                  <h2 className="text-2xl font-bold text-zinc-100">
                    {info.label}
                  </h2>
                  <p className="text-sm text-zinc-500">{info.description}</p>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {list.map((u) => (
                    <Link
                      key={u.slug}
                      href={`/use-cases/${u.slug}`}
                      className="group rounded-xl border border-zinc-800 bg-[#0a0a0a] p-6 transition-colors hover:border-zinc-600"
                    >
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                        {u.verticalLabel}
                      </p>
                      <h3 className="mb-3 text-lg font-bold leading-snug text-zinc-100 group-hover:text-white">
                        {u.title}
                      </h3>
                      <p className="mb-4 text-sm leading-relaxed text-zinc-400">
                        {u.shortDescription}
                      </p>
                      <p className="text-xs font-medium text-emerald-400 group-hover:text-emerald-300">
                        Read the workflow →
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </section>

      <Footer />
    </div>
  );
}
