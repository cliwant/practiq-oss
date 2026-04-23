import type { Metadata } from "next";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";
import { ReadinessQuizClient } from "./quiz-client";

export const metadata: Metadata = {
  title: "Is your firm ready for AI? 10-question readiness assessment — Practiq",
  description:
    "Take the 2-minute readiness assessment. 10 questions about your firm's client count, workflow maturity, and bottleneck pattern. Get a personalized readiness score + specific next steps for your vertical.",
  alternates: { canonical: "https://practiq.dev/readiness-quiz" },
  openGraph: {
    title: "Is your firm ready for AI-Native workflows? Free 10-question assessment",
    description:
      "Answer 10 questions about your firm and get a personalized readiness score + next steps. Built for 2-10 person professional services firms.",
    url: "https://practiq.dev/readiness-quiz",
    type: "website",
  },
};

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline:
    "AI Readiness Assessment for Small Professional Services Firms",
  description:
    "A 10-question interactive assessment for 2-10 person accounting, law, HR advisory, consulting, and agency firms. Scores context-switching pain, workflow maturity, and AI-adoption fit. Delivers a personalized readiness report + specific next steps.",
  author: { "@type": "Organization", name: "Practiq", url: "https://practiq.dev" },
  datePublished: "2026-04-17",
  dateModified: "2026-04-17",
  mainEntityOfPage: {
    "@type": "WebPage",
    "@id": "https://practiq.dev/readiness-quiz",
  },
};

const faqs = [
  {
    q: "How long does the readiness assessment take?",
    a: "Under 2 minutes. 10 multiple-choice questions covering your firm's size, client count, workflow maturity, tooling, and bottleneck pattern. No account creation required to take it; email optional at the end if you want the full report.",
  },
  {
    q: "How is the readiness score calculated?",
    a: "Each answer carries a weight based on industry benchmarks for AI-native workflow fit. The score combines three dimensions: (1) acute need — are you at or past the client-count ceiling where context switching becomes structural? (2) workflow maturity — do you have the baseline process documentation that AI augments vs. replaces? (3) tooling fit — does your tech stack integrate with AI-native layers? The composite score places your firm on a 0-100 readiness scale.",
  },
  {
    q: "What does a 'ready' score mean?",
    a: "A score of 70+ means your firm is structurally ready for an AI-Native workspace like Practiq. You're likely past the client-count ceiling where context switching stops being a solvable human problem, you have documented workflows AI can learn from, and your current tooling (QuickBooks, Clio, Gusto, etc.) has working integrations. Scores 40-69 indicate partial readiness — usually a specific workflow or tooling gap to close first. Below 40 indicates the AI adoption conversation is premature for your current firm stage.",
  },
  {
    q: "Is the quiz specific to one vertical?",
    a: "Yes — the questions and scoring adapt based on your vertical selection at the start. An accounting firm's readiness signals differ from a law firm's (billable-hour tracking, IOLTA constraints) or an HR advisory firm's (multi-state compliance, per-client benefits admin). The personalized report reflects your vertical's specific patterns.",
  },
  {
    q: "What do I get if I enter my email?",
    a: "A personalized PDF report emailed within a few minutes: (1) your full readiness score with breakdown across the 3 dimensions, (2) the specific bottleneck patterns your answers indicate, (3) 2026 benchmark comparisons vs. similar-size firms in your vertical, (4) 5-step implementation path tailored to your readiness level, (5) direct recommendations on when to adopt vs. when to wait.",
  },
  {
    q: "Will you sell my email or spam me?",
    a: "No. Email is added to Practiq's early-access waitlist. You get the readiness report plus our 6-email nurture sequence (one email every few days for 30 days), then nothing unless you engage. One-click unsubscribe at any time removes you entirely.",
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

// Quiz structured as a Thing for discoverability
const quizSchema = {
  "@context": "https://schema.org",
  "@type": "Quiz",
  name: "AI Readiness Assessment for Small Professional Services Firms",
  description:
    "A 10-question interactive assessment that scores a firm's readiness to adopt AI-native workflows.",
  educationalLevel: "Professional",
  timeRequired: "PT2M",
  audience: {
    "@type": "Audience",
    name: "Small professional services firms (2-10 people, accounting/law/HR/consulting/agency)",
  },
  about: {
    "@type": "Thing",
    name: "AI-Native workflow adoption readiness",
  },
  hasPart: [
    {
      "@type": "Question",
      name: "How many active clients does your firm manage?",
    },
    {
      "@type": "Question",
      name: "How often does a team member 'rebuild context' when switching between clients?",
    },
    {
      "@type": "Question",
      name: "How structured is your firm's client workflow documentation?",
    },
  ],
};

export default function ReadinessQuizPage() {
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(quizSchema) }}
      />

      {/* Hero */}
      <section className="px-6 pt-32 pb-8">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            Firm Assessment · 2 minutes · Personalized
          </p>
          <h1 className="mb-6 text-4xl font-extrabold tracking-[-0.03em] text-zinc-100 sm:text-5xl lg:text-6xl">
            Is your firm ready for AI-Native workflows?
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
            10 questions about your firm&apos;s size, clients, and workflow.
            Get a personalized readiness score + specific next steps for your
            vertical. No account needed to take it.
          </p>
        </div>
      </section>

      {/* Quiz */}
      <ReadinessQuizClient />

      {/* Methodology */}
      <section className="border-y border-zinc-800 bg-[#0a0a0a] px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-6 text-2xl font-extrabold tracking-[-0.03em] text-zinc-100 sm:text-3xl">
            How is the readiness score calculated?
          </h2>
          <div className="space-y-4 text-base leading-relaxed text-zinc-300">
            <p>
              The assessment scores three dimensions of AI-adoption fit for
              small professional services firms. Each answer is weighted by
              industry benchmarks.
            </p>
            <ul className="space-y-3 pl-0 text-sm">
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" />
                <span>
                  <strong className="text-zinc-100">Acute need</strong>: are you
                  at or past the client-count ceiling where context switching
                  becomes structural? For accounting the ceiling is typically
                  75-85 clients per partner; for law firms 40-60 active
                  matters; for HR advisory 15-20 client companies; for
                  consulting 8-15 concurrent engagements; for agencies 8-12
                  concurrent accounts.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" />
                <span>
                  <strong className="text-zinc-100">Workflow maturity</strong>:
                  do you have the baseline documentation + repeatability that
                  AI augments (vs. replaces)? Firms with undocumented
                  workflows struggle to adopt AI — the AI has nothing to learn
                  from.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" />
                <span>
                  <strong className="text-zinc-100">Tooling fit</strong>: does
                  your current tech stack integrate with AI-native layers?
                  Firms on Excel + email only have no integration surface;
                  firms on QuickBooks Online + Clio + Gusto have deep
                  integration surface.
                </span>
              </li>
            </ul>
            <p>
              Composite score placement: <strong className="text-zinc-100">70+</strong>{" "}
              ready now · <strong className="text-zinc-100">40-69</strong>{" "}
              partial readiness (usually 1-2 specific gaps to close) ·{" "}
              <strong className="text-zinc-100">&lt;40</strong> AI adoption
              conversation premature for current firm stage.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-10 text-3xl font-extrabold tracking-[-0.03em] text-zinc-100 sm:text-4xl">
            Common questions about the assessment
          </h2>
          <dl className="space-y-8">
            {faqs.map((f) => (
              <div key={f.q} className="border-b border-zinc-800 pb-8">
                <dt className="mb-3 text-base font-bold text-zinc-100">{f.q}</dt>
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
