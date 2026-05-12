import type { Metadata } from "next";
import { Suspense } from "react";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";
import { PolicyGeneratorClient } from "./policy-generator-client";

export const metadata: Metadata = {
  title: "Free AI policy generator for professional services firms — Practiq",
  description:
    "Generate a draft AI usage policy tailored to your firm's vertical and regulatory regime. ABA Opinion 512 for law firms. AICPA + Circular 230 for CPAs. EEOC + state law for HR advisory. FTC guidance for marketing. 5-7 questions, PDF in 30 seconds.",
  alternates: {
    canonical: "https://practiq.dev/tools/ai-policy-generator",
  },
  openGraph: {
    title:
      "Free AI usage policy generator — drafted around your vertical's regulatory regime",
    description:
      "Vertical-specific draft AI policies for legal, CPA, HR advisory, marketing, and consulting firms. Answer 5-7 questions, get a PDF you can take to counsel.",
    url: "https://practiq.dev/tools/ai-policy-generator",
    type: "website",
  },
};

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline:
    "Free AI Usage Policy Generator for Professional Services Firms",
  description:
    "A free tool that generates a draft firm-internal AI usage policy tailored to a firm's vertical (legal, CPA, HR advisory, marketing, consulting) and regulatory regime. Drafted around ABA Formal Opinion 512, AICPA Code of Professional Conduct, EEOC AI guidance, FTC AI disclosure rules, and applicable state laws.",
  author: { "@type": "Organization", name: "Practiq", url: "https://practiq.dev" },
  datePublished: "2026-05-12",
  dateModified: "2026-05-12",
  mainEntityOfPage: {
    "@type": "WebPage",
    "@id": "https://practiq.dev/tools/ai-policy-generator",
  },
};

const faqs = [
  {
    q: "Is this a legal document I can adopt as-is?",
    a: "No. The generator produces a starting draft for your firm's internal review. It is not legal advice. Before adoption, the policy must be reviewed with qualified counsel licensed in your firm's jurisdiction. The footer of the generated PDF says this explicitly so any reader is on notice.",
  },
  {
    q: "Which regulatory frameworks does the generator reference?",
    a: "For law firms: the ABA Model Rules (especially Rules 1.1 technological competence, 1.6 confidentiality, 3.3 candor, 5.1/5.3 supervision) and ABA Formal Opinion 512 on generative AI. For CPA / accounting firms: AICPA Code of Professional Conduct (ET 1.300, 1.400, 1.700), SSARS / SSAE for review and attest work, Circular 230 for tax practice, and PCAOB rules where applicable. For HR advisory: EEOC AI guidance, NYC Local Law 144, Illinois AI Video Interview Act, Colorado AI Act, and ADA. For marketing agencies: FTC AI guidance, Endorsement Guides, and platform policies. For consulting: confidentiality, IP boundaries, and sector overlays. The generator instructs the model to cite these by name only where actually applicable — it does not fabricate rule numbers.",
  },
  {
    q: "How does the policy change based on my firm's inputs?",
    a: "Each input shapes a specific section. Your states of operation appear in the multi-jurisdiction guidance. Sensitive data categories you select (PHI, privileged, PII, trade secrets) trigger named guardrails in the data-handling section. Your AI tool list determines which tools the policy must address by name (ChatGPT enterprise vs. consumer, Copilot, domain SaaS). Your approval workflow choice (partner-approved per use vs. blanket vs. case-by-case vs. prohibited client-facing) shapes the supervision section. Your disclosure preference shapes the client-communication section.",
  },
  {
    q: "What do I actually get?",
    a: "A clean, professionally-typeset PDF with: a cover page, a preamble, 7-10 numbered policy sections (Scope, Permitted Uses, Prohibited Uses, Data Handling, Approval Workflow, Supervision & Review, Client Disclosure, Verification & Accuracy, Vendor Due Diligence, Training & Documentation), a key-obligations checklist, a review-cycle clause, and a footer disclaimer. The PDF watermarks each page with 'Generated draft — review with counsel before adoption.'",
  },
  {
    q: "How long does it take?",
    a: "About 2 minutes to answer the questions. The AI takes 20-30 seconds to draft the policy. You get the PDF immediately and a copy by email.",
  },
  {
    q: "Will you keep my responses or share my email?",
    a: "Your responses and email are stored so we can email you the PDF and so we can improve the tool. We do not share your email with third parties. One-click unsubscribe removes you from our list entirely.",
  },
  {
    q: "Why is Practiq making this free?",
    a: "Practiq is the workspace we are building for professional services firms — review-state tracking, source provenance, and approval workflows built into every AI-assisted task. A policy is the prerequisite: you can't enforce review trail in software if the firm hasn't decided what its review trail should be. We make the policy easy so the conversation about the workspace is grounded in something concrete.",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function AiPolicyGeneratorPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100">
      <Nav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* Hero */}
      <section className="px-6 pt-32 pb-10">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            Free tool · 2 minutes · Draft PDF
          </p>
          <h1 className="mb-6 text-4xl font-extrabold tracking-[-0.03em] text-zinc-100 sm:text-5xl lg:text-6xl">
            Generate your firm&apos;s AI usage policy
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
            Answer 5-7 questions. We draft a policy that references your
            vertical&apos;s actual regulatory regime — ABA Opinion 512 for
            law firms, AICPA + Circular 230 for CPAs, EEOC + state law for
            HR advisory, FTC AI guidance for marketing. Download the PDF;
            review with counsel before adoption.
          </p>
        </div>
      </section>

      {/* Generator */}
      <Suspense
        fallback={
          <div className="mx-auto max-w-3xl px-6 pb-16 text-center text-zinc-500">
            Loading…
          </div>
        }
      >
        <PolicyGeneratorClient />
      </Suspense>

      {/* Methodology */}
      <section className="border-y border-zinc-800 bg-[#0a0a0a] px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-6 text-2xl font-extrabold tracking-[-0.03em] text-zinc-100 sm:text-3xl">
            How the policy is drafted
          </h2>
          <div className="space-y-4 text-base leading-relaxed text-zinc-300">
            <p>
              Each vertical is anchored to its actual professional-responsibility
              regime — not a generic AI-governance template. The model is
              instructed to cite governing frameworks by name only where they
              actually apply, and to note state-by-state variations rather
              than pretending one jurisdiction&apos;s rules are universal.
            </p>
            <ul className="space-y-3 pl-0 text-sm">
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" />
                <span>
                  <strong className="text-zinc-100">Law firms</strong>: ABA
                  Model Rules (1.1, 1.6, 3.3, 5.1/5.3, 1.5) and ABA Formal
                  Opinion 512 on generative AI. Court standing orders on
                  AI-filed work. State bar variations where the firm operates.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" />
                <span>
                  <strong className="text-zinc-100">CPA / accounting</strong>:
                  AICPA Code of Professional Conduct (ET 1.300, 1.400, 1.700),
                  SSARS / SSAE, Circular 230, PCAOB rules where applicable,
                  and the firm&apos;s state board of accountancy.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" />
                <span>
                  <strong className="text-zinc-100">HR advisory</strong>:
                  EEOC AI guidance, NYC Local Law 144, Illinois AI Video
                  Interview Act, Colorado AI Act, ADA, multi-state employment
                  compliance.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" />
                <span>
                  <strong className="text-zinc-100">Marketing agencies</strong>:
                  FTC AI guidance, Endorsement Guides, platform-specific rules
                  (Meta, Google, LinkedIn), copyright and attribution.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" />
                <span>
                  <strong className="text-zinc-100">Consulting</strong>:
                  NDA-grade confidentiality, IP boundary preservation,
                  conflict-of-interest separation, sector overlays.
                </span>
              </li>
            </ul>
            <p>
              The final PDF is a starting draft, not legal advice. Adoption
              requires review by counsel licensed in your firm&apos;s
              jurisdiction.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-10 text-3xl font-extrabold tracking-[-0.03em] text-zinc-100 sm:text-4xl">
            Common questions
          </h2>
          <dl className="space-y-8">
            {faqs.map((f) => (
              <div key={f.q} className="border-b border-zinc-800 pb-8">
                <dt className="mb-3 text-base font-bold text-zinc-100">
                  {f.q}
                </dt>
                <dd className="text-sm leading-relaxed text-zinc-400">{f.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <Footer />
    </div>
  );
}
