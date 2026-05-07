import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, XCircle, Minus } from "lucide-react";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";
import {
  JsonLd,
  breadcrumbJsonLd,
  faqJsonLd,
  SITE_URL,
} from "@/lib/seo/json-ld";

/**
 * /compare/mike — bespoke standalone comparison page (Tier 3.1).
 *
 * Goal: capture inbound search volume from Mike (willchen96/mike) traffic
 * spike and position Practiq as complementary, not competitive.
 *
 * Honest framing: "If you're a single-firm law office self-hosting one
 * document AI, Mike is excellent. If you run multi-client operations
 * across CPA / law / HR / consulting / agency, Practiq is what you want."
 *
 * Mike is not a competitor in the COMPETITORS data file — it's an
 * adjacent open-source tool covering a different layer of the stack.
 * That's why this is a hand-built page rather than a /compare/[slug] entry.
 */

const PAGE_URL = `${SITE_URL}/compare/mike`;

export const metadata: Metadata = {
  title: "Mike vs Practiq — self-host vs managed boutique-firm OS",
  description:
    "Mike is excellent for self-hosted document AI in a single law office. Practiq is the managed AI-Native agent workspace for boutique firms running multi-client operations. Honest comparison.",
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title:
      "Mike vs Practiq: when to self-host vs when to use a managed boutique-firm OS",
    description:
      "Honest comparison of Mike (self-hosted document AI) and Practiq (managed boutique-firm OS). Side-by-side on document review, multi-client workspace, license, pricing.",
    url: PAGE_URL,
    type: "article",
  },
  keywords: [
    "mike alternative",
    "mike vs practiq",
    "willchen96 mike",
    "self-hosted document AI",
    "managed AI for law firms",
    "boutique firm AI",
    "open source legal AI",
    "AI for law firms comparison",
  ],
};

interface RowValue {
  text: string;
  /** Visual indicator: yes / no / neutral. */
  state: "yes" | "no" | "neutral";
}

interface ComparisonRow {
  attribute: string;
  mike: RowValue;
  practiq: RowValue;
}

const TABLE: ComparisonRow[] = [
  {
    attribute: "Document review",
    mike: {
      text: "Strong — purpose-built for document AI on a single firm's corpus",
      state: "yes",
    },
    practiq: {
      text: "Strong — but as one of many capabilities inside the workspace",
      state: "yes",
    },
  },
  {
    attribute: "Multi-client workspace",
    mike: { text: "Not the design center — single-firm focus", state: "no" },
    practiq: {
      text: "Primary design center — every client is a workspace",
      state: "yes",
    },
  },
  {
    attribute: "Workflow automation across clients",
    mike: { text: "Out of scope", state: "no" },
    practiq: {
      text: "Overnight scans, prepared deliverables, advisory queue",
      state: "yes",
    },
  },
  {
    attribute: "Client portal",
    mike: { text: "Not included", state: "no" },
    practiq: {
      text: "Included in the workspace surface",
      state: "yes",
    },
  },
  {
    attribute: "DOCX redline editing",
    mike: { text: "Yes — strong document-AI tooling", state: "yes" },
    practiq: {
      text: "Yes — redline against firm playbook + prior approved versions",
      state: "yes",
    },
  },
  {
    attribute: "Self-host",
    mike: {
      text: "Yes — designed to be deployed inside one law office's infra",
      state: "yes",
    },
    practiq: {
      text: "Managed SaaS (self-host on enterprise plans only)",
      state: "neutral",
    },
  },
  {
    attribute: "Vertical scope",
    mike: { text: "Law (single-firm document AI)", state: "neutral" },
    practiq: {
      text: "CPA · law · HR · consulting · agency — boutique professional services",
      state: "yes",
    },
  },
  {
    attribute: "License",
    mike: { text: "Open source", state: "yes" },
    practiq: { text: "Commercial SaaS (free 14-day trial)", state: "neutral" },
  },
  {
    attribute: "Pricing",
    mike: {
      text: "Free (open source) — your infra + ops cost",
      state: "yes",
    },
    practiq: {
      text: "Founding members $49/mo for life · standard $149/mo · monthly billing, no annual lock-in",
      state: "neutral",
    },
  },
];

function StateIcon({ state }: { state: RowValue["state"] }) {
  if (state === "yes") {
    return (
      <CheckCircle2
        className="w-4 h-4 text-emerald-400 shrink-0"
        aria-label="Yes"
      />
    );
  }
  if (state === "no") {
    return (
      <XCircle
        className="w-4 h-4 text-zinc-600 shrink-0"
        aria-label="Not in scope"
      />
    );
  }
  return (
    <Minus
      className="w-4 h-4 text-amber-500/70 shrink-0"
      aria-label="Neutral"
    />
  );
}

export default function MikeVsPractiqPage() {
  // Article schema — anchors this as an editorial comparison piece in the
  // Practiq entity graph. AI Overviews and Perplexity prefer Article over
  // Product for "X vs Y" queries because they want a citation, not a SKU.
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline:
      "Mike vs Practiq: when to self-host vs when to use a managed boutique-firm OS",
    description:
      "Honest comparison of Mike (self-hosted document AI) and Practiq (managed AI-Native agent workspace for boutique firms running multi-client operations).",
    url: PAGE_URL,
    datePublished: "2026-05-07",
    dateModified: "2026-05-07",
    author: { "@type": "Organization", name: "Practiq", url: SITE_URL },
    publisher: { "@id": `${SITE_URL}/#organization` },
    mainEntityOfPage: PAGE_URL,
    about: [
      { "@id": `${SITE_URL}/#software` },
      {
        "@type": "SoftwareApplication",
        name: "Mike",
        applicationCategory: "DocumentManagement",
        operatingSystem: "Self-hosted",
        description:
          "Open-source self-hosted document AI for single law offices.",
      },
    ],
  };

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Compare", url: `${SITE_URL}/compare` },
    { name: "Mike vs Practiq", url: PAGE_URL },
  ]);

  const faqs = [
    {
      q: "Is Mike a competitor to Practiq?",
      a: "No — they sit at different layers of the stack. Mike is open-source, self-hosted document AI optimized for a single law office. Practiq is a managed AI-Native agent workspace built around multi-client operations across CPA, law, HR, consulting, and agency firms.",
    },
    {
      q: "When should I choose Mike?",
      a: "If you run a single law office, want to self-host on your own infrastructure, have engineering capacity to operate it, and your primary need is document review and DOCX redline within one corpus, Mike is excellent.",
    },
    {
      q: "When should I choose Practiq?",
      a: "If you run a 2–20 person boutique firm managing 50–200 clients across CPA, law, HR, consulting, or agency work, want a managed product with overnight client scans and prepared deliverables, and prefer monthly billing with no engineering ops, Practiq is the right fit.",
    },
    {
      q: "Can I use both Mike and Practiq?",
      a: "Yes. Some firms self-host Mike for deep document AI on a specific corpus and use Practiq for the multi-client workspace, advisory queue, and cross-client memory. They are complementary tools, not substitutes.",
    },
    {
      q: "How is Practiq priced compared to Mike?",
      a: "Mike is free as open source — you absorb infrastructure, operations, and engineering cost. Practiq is a managed SaaS: founding members lock in $49/mo for life, standard pricing is $149/mo, billed monthly with no annual lock-in.",
    },
  ];

  return (
    <div className="min-h-screen bg-bg-base">
      <Nav />
      <JsonLd data={articleLd} />
      <JsonLd data={breadcrumbLd} />
      <JsonLd data={faqJsonLd(faqs)} />

      <main className="pt-32 pb-16 px-6">
        <article className="max-w-4xl mx-auto">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-4">
            Comparison · Open source vs managed
          </p>

          <h1 className="text-4xl md:text-5xl font-black text-zinc-100 tracking-tight leading-tight mb-5">
            Mike vs Practiq: when to self-host vs when to use a managed
            boutique-firm OS
          </h1>

          {/* AEO first-paragraph accountability — leads with the standalone
              answer to the implicit "X vs Y" question. */}
          <p className="text-lg text-zinc-300 leading-relaxed mb-10 max-w-3xl">
            Mike and Practiq are not competitors. Mike is excellent if you run
            a single law office self-hosting one document AI on your own
            infrastructure. Practiq is the managed AI-Native agent workspace
            for boutique firms running multi-client operations across CPA,
            law, HR, consulting, and agency work.
          </p>

          {/* ── Comparison table ────────────────────────────────────── */}
          <div className="bento-card p-0 mb-14 overflow-hidden">
            <div className="grid grid-cols-3 border-b border-zinc-800">
              <div className="p-5 bg-zinc-900/30">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  Attribute
                </p>
              </div>
              <div className="p-5 bg-zinc-900/30 border-l border-zinc-800">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">
                  Mike
                </p>
              </div>
              <div className="p-5 border-l border-zinc-800 bg-gradient-to-br from-amber-500/5 to-transparent">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
                  Practiq
                </p>
              </div>
            </div>

            {TABLE.map((row, i) => (
              <div
                key={row.attribute}
                className={`grid grid-cols-3 ${
                  i > 0 ? "border-t border-zinc-800" : ""
                }`}
              >
                <div className="p-5 text-xs font-bold uppercase tracking-widest text-zinc-500 bg-zinc-900/20">
                  {row.attribute}
                </div>
                <div className="p-5 border-l border-zinc-800 text-sm text-zinc-300">
                  <div className="flex items-start gap-2">
                    <StateIcon state={row.mike.state} />
                    <span>{row.mike.text}</span>
                  </div>
                </div>
                <div className="p-5 border-l border-zinc-800 text-sm text-zinc-200 bg-gradient-to-br from-amber-500/5 to-transparent">
                  <div className="flex items-start gap-2">
                    <StateIcon state={row.practiq.state} />
                    <span>{row.practiq.text}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── When to choose each — honest callouts ───────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-14">
            <div className="bento-card p-7">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">
                When to choose Mike
              </p>
              <ul className="space-y-3 text-sm text-zinc-300 leading-relaxed">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    You are a single law office and want one document AI on
                    your firm&apos;s corpus.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    You have engineering capacity to deploy and operate
                    self-hosted software.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    You need open-source license terms — full control over the
                    code, the data, and the infrastructure.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    Your primary workflow is deep review and redline within a
                    single corpus, not multi-client orchestration.
                  </span>
                </li>
              </ul>
            </div>
            <div className="bento-card p-7 bg-gradient-to-br from-amber-500/5 to-transparent">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400 mb-3">
                When to choose Practiq
              </p>
              <ul className="space-y-3 text-sm text-zinc-200 leading-relaxed">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    You run a 2–20 person boutique firm with 50–200 clients
                    across CPA, law, HR, consulting, or agency work.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    You want a managed product — overnight scans, prepared
                    deliverables, advisory queue — without ops engineering.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    Multi-client memory matters more than depth on a single
                    corpus — switching between 50 clients is the daily reality.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    You prefer monthly billing with no annual contract and no
                    seat minimum.
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* ── Question-style H2s for AEO ──────────────────────────── */}
          <div className="prose-dark mb-14">
            <h2>What is the actual difference between Mike and Practiq?</h2>
            <p>
              Mike is open-source, self-hosted document AI built for one law
              office&apos;s corpus. Practiq is a managed AI-Native agent
              workspace built around multi-client operations across boutique
              professional services firms. They sit at different layers of
              the stack and solve different problems.
            </p>

            <h2>Should I replace Mike with Practiq?</h2>
            <p>
              Almost never. If Mike is solving the document-AI problem inside
              one office, keep Mike there. Practiq adds the multi-client
              workspace, overnight advisory queue, and cross-client memory
              that Mike does not target. Many firms run both — Mike on the
              corpus, Practiq on the practice.
            </p>

            <h2>Is Practiq open source?</h2>
            <p>
              No. Practiq is commercial managed SaaS. We chose this because
              the AI-Native agent surface — overnight cross-client scans,
              prepared deliverables, anomaly detection — needs always-on
              infrastructure that boutique firms do not want to operate.
            </p>
          </div>

          {/* ── FAQ ──────────────────────────────────────────────────── */}
          <div className="mt-12 pt-10 border-t border-zinc-800">
            <h2 className="text-2xl font-bold text-zinc-100 mb-8">
              Frequently asked
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

          {/* ── CTA ──────────────────────────────────────────────────── */}
          <div className="mt-16 pt-10 border-t border-zinc-800">
            <div className="bento-card p-10 text-center bg-gradient-to-br from-amber-500/5 to-transparent">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400 mb-4">
                Built for boutique professional services firms
              </p>
              <h2 className="text-3xl font-black text-zinc-100 tracking-tight mb-4">
                Try Practiq free for 14 days
              </h2>
              <p className="text-zinc-400 mb-8 max-w-xl mx-auto">
                Monthly billing, no annual lock-in. If your daily reality is
                switching between 50 clients across multiple verticals,
                Practiq is the managed boutique-firm OS you want.
              </p>
              <Link
                href="/signup?utm_source=compare-mike"
                className="btn-premium inline-flex items-center gap-3 py-4 px-10 text-sm"
              >
                Start free 14-day trial <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
