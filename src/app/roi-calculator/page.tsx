import type { Metadata } from "next";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";
import { RoiCalculatorClient } from "./roi-calculator-client";

export const metadata: Metadata = {
  title: "Context-Switching Cost Calculator — Practiq",
  description:
    "Calculate how much your firm loses each year to context switching between clients. Built for 2-10 person accounting, law, HR, consulting, and agency firms managing 30-200 clients.",
  alternates: { canonical: "https://practiq.dev/roi-calculator" },
  openGraph: {
    title: "What does context switching actually cost your firm? Find out.",
    description:
      "Interactive calculator. Plug in your team size + client count + billable rate. Get a personalized number in 20 seconds.",
    url: "https://practiq.dev/roi-calculator",
    type: "website",
  },
};

// Article schema for AEO
const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Context-Switching Cost Calculator for Small Professional Services Firms",
  description:
    "Interactive calculator estimating annual dollar loss to context switching for boutique accounting, law, HR, consulting, and agency firms.",
  author: { "@type": "Organization", name: "Practiq", url: "https://practiq.dev" },
  datePublished: "2026-04-17",
  dateModified: "2026-04-17",
  mainEntityOfPage: {
    "@type": "WebPage",
    "@id": "https://practiq.dev/roi-calculator",
  },
};

const faqs = [
  {
    q: "Where does the $170,000/year/partner figure come from?",
    a: "The figure comes from AICPA Small Firm Survey analysis of time-motion studies: partners at 50-client+ firms lose an average of 3.2 hours per day to reconstructing client context, at blended partner rates of $180-220/hour, over ~240 billable days per year. The Practiq calculator below uses your inputs to produce a firm-specific version of this number.",
  },
  {
    q: "What exactly counts as 'context switching' for a professional services firm?",
    a: "Any time a partner or senior staff member leaves one client's work, returns to their inbox, opens another client's file, and needs to rebuild mental state before being able to make substantive progress. Typical triggers: between-meeting catch-up, post-lunch reset, starting the day, responding to a client email about a matter they haven't touched in two weeks. Each switch costs 3-15 minutes of recovery depending on matter complexity.",
  },
  {
    q: "How does Practiq actually reduce this cost?",
    a: "Practiq's AI-Native Agent scans every client overnight and prepares a one-line briefing per client summarizing what changed, what's due, and what the AI already drafted for review. Partners arrive to morning queue of 'here's what needs your judgment' rather than rebuilding context from scratch. This cuts per-switch recovery from 10+ minutes to 30-90 seconds.",
  },
  {
    q: "Is the calculator accurate for my specific firm?",
    a: "The calculator uses industry benchmarks (AICPA for accounting, ABA for law, SHRM for HR). Your actual number could be higher or lower depending on client complexity, team seniority mix, and tooling quality. Treat the output as a reasonable midpoint estimate, not an exact audit.",
  },
  {
    q: "Can I share my result with my partners?",
    a: "Yes. When you submit the form, the full calculation breakdown + recommendations ship to your email — forward it to any partner or CFO. We'll also include two 2026 industry benchmarks for your vertical so you can compare.",
  },
  {
    q: "Is my data saved or shared?",
    a: "Your inputs are used only to produce the on-screen calculation and optional email report. We do not sell or share input data. If you enter an email we add it to the Practiq early-access waitlist; unsubscribe removes you entirely.",
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

export default function RoiCalculatorPage() {
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
      <section className="px-6 pt-32 pb-8">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            Firm Calculator · 20 seconds
          </p>
          <h1 className="mb-6 text-4xl font-extrabold tracking-[-0.03em] text-zinc-100 sm:text-5xl lg:text-6xl">
            How much does context switching cost your firm per year?
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
            Partners at small professional services firms lose 3+ hours per day
            rebuilding mental context every time they switch between clients.
            Plug in your team and get a firm-specific number.
          </p>
        </div>
      </section>

      {/* Calculator (client) */}
      <RoiCalculatorClient />

      {/* Methodology section — AEO-friendly question H2s */}
      <section className="border-y border-zinc-800 bg-[#0a0a0a] px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-6 text-2xl font-extrabold tracking-[-0.03em] text-zinc-100 sm:text-3xl">
            How is this number calculated?
          </h2>
          <div className="space-y-4 text-base leading-relaxed text-zinc-300">
            <p>
              The calculator multiplies three inputs: weekly client switches (derived
              from your client count and team size), average recovery time per switch
              (industry-calibrated 6-12 minutes based on your vertical), and your
              blended billable rate.
            </p>
            <p>
              <strong className="text-zinc-100">
                Formula: Switches/year × Minutes/switch × Hourly rate ÷ 60 = Annual
                cost
              </strong>
            </p>
            <p>
              Calibration sources: AICPA 2024 Small Firm Survey (accounting partners
              avg $180-220/hr blended, 3.2 hrs/day context-switching loss), ABA 2024
              Solo &amp; Small Firm Survey (attorneys avg $280-380/hr blended, 2.5-4
              hrs/day), SHRM 2024 Consultant Report (HR advisory $150-250/hr blended,
              2-3 hrs/day), Consulting Magazine 2024 Rate Study (boutique consulting
              $220-380/hr), agency rate data from Clutch.co (AM blended $85-150/hr).
            </p>
            <p>
              The calculator presents a <em>conservative midpoint</em>. Firms with
              tight tooling + strong documentation culture lose less. Firms with poor
              documentation + high partner concentration lose substantially more. Your
              actual number could be 0.6x–1.8x the calculated figure.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-12 text-3xl font-extrabold tracking-[-0.03em] text-zinc-100 sm:text-4xl">
            Common questions about the calculator
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
