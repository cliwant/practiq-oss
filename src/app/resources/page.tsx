import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";
import { RESOURCES, type Resource } from "@/data/resources/resources";

const SITE_URL = "https://practiq.dev";

export const metadata: Metadata = {
  title: "Free Resources for Small Professional Services Firms — Practiq",
  description:
    "Free checklists, templates, and playbooks for 2-10 person accounting, law, HR advisory, consulting, and agency firms. Practitioner tools — not content-farm filler.",
  alternates: { canonical: `${SITE_URL}/resources` },
  openGraph: {
    title: "Free Resources for Small Professional Services Firms",
    description:
      "Eight practitioner resources for small firms: tech stack audit, intake templates, compliance matrix, handoff checklists, scope templates, and more.",
    url: `${SITE_URL}/resources`,
    type: "website",
  },
};

const VERTICAL_LABELS: Record<
  Resource["vertical"],
  { label: string; description: string }
> = {
  accounting: {
    label: "Accounting",
    description:
      "Tech stack audits, tax season playbooks, and workflow templates for small CPA and bookkeeping firms",
  },
  law: {
    label: "Law",
    description:
      "Matter intake templates, conflict check workflows, and engagement scope tools for solo and small law firms",
  },
  hr: {
    label: "HR Advisory",
    description:
      "Multi-state compliance matrix, onboarding checklists, and benefits audit tools for HR consultants",
  },
  consulting: {
    label: "Consulting",
    description:
      "Engagement handoff checklists, MSA/SOW templates, and retention frameworks for boutique consulting firms",
  },
  agency: {
    label: "Agency",
    description:
      "Retainer scope templates, utilization benchmarks, and client workflow tools for marketing and creative agencies",
  },
  cross: {
    label: "Cross-Vertical",
    description:
      "Tools that apply across verticals — context-switching audits, capacity benchmarks, and operational frameworks",
  },
};

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Free Resources for Small Professional Services Firms",
  description:
    "Practitioner checklists, templates, and playbooks for 2-10 person firms in accounting, law, HR advisory, consulting, and agency.",
  url: `${SITE_URL}/resources`,
  publisher: { "@id": `${SITE_URL}/#organization` },
};

export default function ResourcesIndexPage() {
  const byVertical = RESOURCES.reduce((acc, r) => {
    if (!acc[r.vertical]) acc[r.vertical] = [];
    acc[r.vertical].push(r);
    return acc;
  }, {} as Record<Resource["vertical"], Resource[]>);

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100">
      <Nav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      {/* Hero */}
      <section className="px-6 pt-32 pb-10">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            Free Resources · Practitioner Tools
          </p>
          <h1 className="mb-6 text-4xl font-extrabold tracking-[-0.03em] text-zinc-100 sm:text-5xl lg:text-6xl">
            Free checklists, templates, and playbooks
            <br />
            <span className="text-zinc-500">for small firms that move fast.</span>
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
            Built from real firm audits and engagement retros — not
            content-farm filler. Every resource was a working tool before it
            became a download.
          </p>
        </div>
      </section>

      {/* Resources grid */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-6xl">
          {(Object.keys(VERTICAL_LABELS) as Resource["vertical"][]).map((v) => {
            const list = byVertical[v];
            if (!list || list.length === 0) return null;
            const info = VERTICAL_LABELS[v];
            return (
              <section key={v} className="mb-16">
                <div className="mb-6 border-b border-zinc-800 pb-4">
                  <h2 className="mb-1 text-2xl font-bold text-zinc-100">
                    {info.label}
                  </h2>
                  <p className="text-sm text-zinc-500">{info.description}</p>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {list.map((r) => (
                    <Link
                      key={r.slug}
                      href={`/resources/${r.slug}`}
                      className="group rounded-xl border border-zinc-800 bg-[#0a0a0a] p-6 transition-colors hover:border-zinc-600"
                    >
                      <div className="mb-3 flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-md bg-zinc-800 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                          {r.format}
                        </span>
                        <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                          {r.formatLabel.split(" · ")[1] ?? r.formatLabel}
                        </span>
                      </div>
                      <h3 className="mb-3 text-lg font-bold leading-snug text-zinc-100 group-hover:text-white">
                        {r.title}
                      </h3>
                      <p className="mb-4 text-sm leading-relaxed text-zinc-400">
                        {r.shortDescription}
                      </p>
                      <p className="text-xs font-medium text-emerald-400 group-hover:text-emerald-300">
                        Get the {r.format} →
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}

          {/* How we pick resources */}
          <section className="mt-20 rounded-2xl border border-zinc-800 bg-[#0a0a0a] p-10">
            <h2 className="mb-6 text-2xl font-bold tracking-[-0.03em] text-zinc-100">
              How we build these resources
            </h2>
            <div className="space-y-4 text-sm leading-relaxed text-zinc-300">
              <p>
                Every resource on this page was a working tool inside a firm
                before it became a download. We synthesize patterns from
                engagement retros, firm audits, and onboarding post-mortems —
                anonymized and de-branded — into templates that solve a
                specific, concrete failure mode.
              </p>
              <p>
                You won&apos;t find &quot;10 tips for running a better firm&quot; here.
                Every resource is structured output — a checklist, a template,
                a playbook — that you can use in your firm tomorrow.
              </p>
              <p className="text-zinc-400">
                Missing a resource you need?{" "}
                <Link
                  href="/contact"
                  className="text-zinc-200 underline underline-offset-4 hover:text-white"
                >
                  Tell us what you&apos;d download
                </Link>
                {" "}— we&apos;re actively building.
              </p>
            </div>
          </section>
        </div>
      </section>

      <Footer />
    </div>
  );
}
