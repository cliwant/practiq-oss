import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";
import { InlineFaq } from "@/components/seo/inline-faq";
import { FoundingMemberForm } from "./founding-form";
import { FoundingCounter } from "@/components/founding-counter";
import {
  JsonLd,
  softwareApplicationJsonLd,
  SITE_URL,
} from "@/lib/seo/json-ld";
import { PER_CLIENT_PRICING } from "@/lib/stripe/plans";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Practitioner-vocabulary FAQ — concrete questions about the founding
// 50-firm cohort, scoped to what real partner-decision-makers worry
// about: pricing lock survival, founding seat handoff, scope of access.
//
// 2026-05-14 Stage 1b — rewritten for the per-client pricing model.
// Numbers reference PER_CLIENT_PRICING (src/lib/stripe/plans.ts):
// $15/client/month standard, $10/client/month founding lock-in.
const FOUNDING_FAQS: { q: string; a: string }[] = [
  {
    q: "If I leave my firm, does the $10/client founding rate transfer to my next practice?",
    a: "The lock is per-firm (Stripe customer), not per-person. If you spin up a new entity, that's a fresh subscription at then-current pricing. Founding-member rates stay with the firm even if leadership changes. Acquisitions usually keep the discount; we confirm case-by-case on the founder call.",
  },
  {
    q: "Why cap at 50 firms instead of selling to everyone who asks?",
    a: "Past 50, the feedback loop blurs — every change satisfies fewer practitioners than it disrupts. The 50-firm cap is operational, not artificial scarcity. Each founding firm gets a direct Slack channel with the founders and a 1-hour roadmap call. We can't honestly offer that to 500.",
  },
  {
    q: "Will my client data be used to train models that ship to other firms?",
    a: "No. Founding-member contracts include explicit no-training-on-your-data terms by default — what your firm puts in stays scoped to your workspace. Aggregate non-identifying telemetry (load times, feature usage) is opt-in. Your client memory and approval-queue history are never used to retrain shared models.",
  },
  {
    q: "What if Practiq pivots away from my vertical mid-cohort?",
    a: "Founding members get 90-day notice plus a full data export and 100% refund of unused subscription if we sunset their vertical. That's contractual, not a gesture. We've ring-fenced 10 founding slots per vertical (accounting, law, HR, consulting, agency) so no single vertical can starve the others.",
  },
  {
    q: "How is the founder Slack channel different from regular support?",
    a: "Direct-message access to Seungdo and the engineering lead. Median response under 4 hours during business days. You see ship dates before public release notes; you can request product changes that we triage same-week. Once you graduate to standard pricing post-cohort, you keep priority support but lose the direct channel.",
  },
];

export const metadata: Metadata = {
  title: "Founding Member — $10 per client/mo, locked for life | Practiq",
  description:
    "First 50 firms lock in $10/client/month for life — 33% off the $15/client standard. 500K tokens per client included. Unlimited seats. Direct line to founders.",
  alternates: { canonical: `${SITE_URL}/founding-member` },
  openGraph: {
    title: "Founding Member — $10 per client/mo, locked for life",
    description:
      "The first 50 firms on Practiq lock in $10/client/month forever. 33% off the $15 standard rate, unlimited team seats, full feature access, direct input on the product roadmap.",
    url: `${SITE_URL}/founding-member`,
    type: "website",
  },
};

// Per-client unit-price Offer schema. Wave-18b convention: Offer.price
// must be a bare numeric string (Google's rich-result validator rejects
// marketing copy like "Starts at $99/user/month"). UnitPriceSpecification
// + referenceQuantity unitCode "C62" (UN/CEFACT "one") with unitText
// "client" tells search engines "this is $10 *per client* per month".
const offerSchema = {
  "@context": "https://schema.org",
  "@type": "Offer",
  name: "Practiq Founding Member — $10/client/month",
  description:
    "First 50 firms joining Practiq lock in $10 per client per month for life — 33% off the $15/client standard. 500K tokens per client included. Unlimited team seats. Direct line to founders and roadmap input.",
  url: `${SITE_URL}/founding-member`,
  availability: "https://schema.org/LimitedAvailability",
  validFrom: "2026-04-17",
  priceValidUntil: "2027-12-31",
  price: String(PER_CLIENT_PRICING.foundingPricePerClientUsd),
  priceCurrency: "USD",
  priceSpecification: {
    "@type": "UnitPriceSpecification",
    price: String(PER_CLIENT_PRICING.foundingPricePerClientUsd),
    priceCurrency: "USD",
    unitText: "per client per month",
    referenceQuantity: {
      "@type": "QuantitativeValue",
      value: "1",
      unitCode: "C62",
      unitText: "client",
    },
  },
  eligibleQuantity: {
    "@type": "QuantitativeValue",
    value: PER_CLIENT_PRICING.foundingSlotsTotal,
    unitText: "firms",
  },
};

const benefits = [
  {
    title: "$10 per client per month — locked for life",
    description:
      "Founding-member pricing is $10 per client per month, 33% off the $15 standard rate. The lock persists across plan changes, future price rises, and team turnover. When standard moves to $19 in a future cohort, you stay at $10. Forever.",
  },
  {
    title: "500K tokens included per client",
    description:
      "Every client workspace gets 500,000 tokens per month — enough for ~20 typical engagement memos or ~100 short AI exchanges. Same allowance as standard. Heavy clients can pull from firm-wide credit top-ups ($10 = 1M tokens).",
  },
  {
    title: "Unlimited team seats",
    description:
      "Pay per client, not per teammate. Invite every accountant, paralegal, or analyst in your firm — the bill doesn't move. Pricing tracks the work (clients served), not headcount, so hiring help never triggers a billing surprise.",
  },
  {
    title: "Direct line to the founders",
    description:
      "Shared Slack channel with Seungdo and the engineering lead. Your feature requests skip the queue. Monthly office hours to review what's working and what isn't. Median response under 4 hours during business days.",
  },
  {
    title: "Roadmap input",
    description:
      "You see the roadmap; you vote on it. Founding Members collectively determine prioritization on 30-40% of platform investment. Feature priority signals from the founding 50 carry real weight — that's the whole point of the cohort.",
  },
  {
    title: "Priority onboarding",
    description:
      "White-glove onboarding with the founding team — not a support rep. First 5 client setups done together. Custom integration scope based on your current stack (QuickBooks, Clio, Gusto, etc.).",
  },
  {
    title: "Free trial before you commit",
    description:
      "3 client workspaces × 14 days, no credit card required. Bring real clients into Practiq, watch what the agents prepare overnight, and decide if it's worth keeping. If it isn't, walk away with a ZIP of every workspace.",
  },
  {
    title: "Public Founding Member designation (optional)",
    description:
      "Optional badge + listing on practiq.dev/customers when we launch publicly. Many Founding Members prefer anonymity during early-access — entirely your call.",
  },
];

const qualificationNotes = [
  {
    title: "Small professional services firm (2-15 people)",
    description:
      "Practiq is built for firms where partners and senior staff handle client context directly. Bigger firms have different constraints we're not optimized for yet.",
  },
  {
    title: "30+ active clients or matters",
    description:
      "The value curve for Practiq starts at ~30 clients/matters — below that, the context-management problem is still manageable without us. If you're under 30, we can still talk but the fit is different.",
  },
  {
    title: "One of our supported verticals",
    description:
      "Accounting, law, HR advisory, consulting, or marketing/creative agency. If you're in a related vertical (wealth management, insurance, small healthcare practice), reach out — we'll assess fit.",
  },
  {
    title: "Willing to share feedback",
    description:
      "Founding Members are a small group; your feedback shapes the product. Not a passive user program. We ask that you engage with monthly check-ins and share what's working and what isn't.",
  },
];

// Example math — drives the "Do the math" example block. Numbers
// derived from PER_CLIENT_PRICING so editing one constant in
// src/lib/stripe/plans.ts updates every surface (this page, pricing,
// llms.txt, JSON-LD).
const EXAMPLE_MATH: ReadonlyArray<{
  label: string;
  clients: number;
}> = [
  { label: "Solo, 10 clients", clients: 10 },
  { label: "5-person firm, 50 clients", clients: 50 },
  { label: "Boutique, 100 clients", clients: 100 },
  { label: "Larger boutique, 200 clients", clients: 200 },
];

export default function FoundingMemberPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100">
      <Nav />
      {/* Page-specific Offer + tier-scoped SoftwareApplication. The
          tier-scoped helper emits the same per-client unit-price
          structure as the pricing page's productOffersSchema so the
          two surfaces never disagree on price. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(offerSchema) }}
      />
      <JsonLd data={softwareApplicationJsonLd({ tier: "founding" })} />

      {/* Hero */}
      <section className="px-6 pt-32 pb-10">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">
            Founding Member Program · {PER_CLIENT_PRICING.foundingSlotsTotal} slots
          </p>
          <h1 className="mb-6 text-4xl font-extrabold tracking-[-0.03em] text-zinc-100 sm:text-5xl lg:text-6xl">
            $10 per client, per month —{" "}
            <br className="hidden md:inline" />
            <span className="text-emerald-400">locked for life.</span>
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-base leading-relaxed text-zinc-300 sm:text-lg">
            First {PER_CLIENT_PRICING.foundingSlotsTotal} firms only. 33% off the{" "}
            <strong className="text-zinc-100">
              ${PER_CLIENT_PRICING.standardPricePerClientUsd}/client/month
            </strong>{" "}
            standard rate — forever, even when standard pricing rises. Same
            features, same token allowance, unlimited team seats.
          </p>
          {/* Live "X of 50 claimed" counter — single source of truth from
              the FoundingSlot singleton row written by the Stripe webhook
              on successful checkout. */}
          <div className="flex justify-center">
            <FoundingCounter variant="hero" />
          </div>
          {/* Direct CTA pair: deep-link for ready-to-buy visitors, and an
              anchor to the qualification form for partners who'd rather
              book a call first. Stripe checkout is held off behind a
              modal/email path during Stage 1 — the planKey wiring will be
              reconnected during Stage 3 of the per-client rollout. */}
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/contact?topic=founding-member"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-bold text-emerald-950 transition-colors hover:bg-emerald-400"
            >
              Request founding member access →
            </Link>
            <Link
              href="#apply-form"
              className="text-sm text-zinc-300 underline decoration-zinc-700 underline-offset-4 hover:text-zinc-100 hover:decoration-zinc-400"
            >
              Or fill out the qualification form
            </Link>
          </div>
        </div>
      </section>

      {/* What's included — concrete inventory of the founding-member offer */}
      <section className="px-6 pb-12">
        <div className="mx-auto max-w-4xl rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-emerald-950/30 to-[#0a0a0a] p-8 sm:p-10">
          <h2 className="mb-6 text-2xl font-extrabold tracking-[-0.03em] text-zinc-100 sm:text-3xl">
            What&apos;s included
          </h2>
          <ul className="grid grid-cols-1 gap-x-8 gap-y-3 text-sm leading-relaxed text-zinc-200 sm:grid-cols-2">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" aria-hidden="true" />
              <span>
                <strong className="text-zinc-100">
                  ${PER_CLIENT_PRICING.foundingPricePerClientUsd}/client/month
                </strong>{" "}
                — locked for life, first {PER_CLIENT_PRICING.foundingSlotsTotal} firms only
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" aria-hidden="true" />
              <span>
                <strong className="text-zinc-100">
                  {(PER_CLIENT_PRICING.tokensPerClientPerMonth / 1000).toLocaleString()}K tokens included
                </strong>{" "}
                per client per month (firm-wide pool)
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" aria-hidden="true" />
              <span>
                <strong className="text-zinc-100">${PER_CLIENT_PRICING.topupCreditPriceUsd} = 1M tokens</strong>{" "}
                top-up when busy clients exceed allowance
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" aria-hidden="true" />
              <span>
                <strong className="text-zinc-100">Unlimited seats</strong> — pay per client, not per teammate
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" aria-hidden="true" />
              <span>
                <strong className="text-zinc-100">
                  Free trial: 3 clients × {PER_CLIENT_PRICING.freeTrialDays} days
                </strong>{" "}
                before commitment
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" aria-hidden="true" />
              <span>
                <strong className="text-zinc-100">All Practiq features</strong> — DOCX redline, AI
                agent, approval queue, knowledge base, multi-agent
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" aria-hidden="true" />
              <span>
                <strong className="text-zinc-100">Direct founder Slack channel</strong> — weekly,
                median 4h response
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" aria-hidden="true" />
              <span>
                <strong className="text-zinc-100">Roadmap input + priority onboarding</strong> with
                the founding team
              </span>
            </li>
          </ul>
        </div>
      </section>

      {/* Example math — do-the-math table */}
      <section className="border-y border-zinc-800 bg-[#0a0a0a] px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-3 text-2xl font-extrabold tracking-[-0.03em] text-zinc-100 sm:text-3xl">
            Do the math.
          </h2>
          <p className="mb-8 max-w-2xl text-base leading-relaxed text-zinc-400">
            Pricing scales linearly — every extra client is exactly{" "}
            <strong className="text-zinc-100">${PER_CLIENT_PRICING.foundingPricePerClientUsd}</strong>{" "}
            for founding members,{" "}
            <strong className="text-zinc-100">${PER_CLIENT_PRICING.standardPricePerClientUsd}</strong>{" "}
            standard. No plan tiers, no upgrade prompts. The lock-in is what changes
            — founding members keep the discount forever.
          </p>
          <div className="overflow-hidden rounded-2xl border border-zinc-800">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-800 bg-zinc-900/50">
                <tr>
                  <th
                    scope="col"
                    className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400"
                  >
                    Firm size
                  </th>
                  <th
                    scope="col"
                    className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wider text-emerald-400"
                  >
                    Founding (${PER_CLIENT_PRICING.foundingPricePerClientUsd}/client)
                  </th>
                  <th
                    scope="col"
                    className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wider text-zinc-400"
                  >
                    Standard (${PER_CLIENT_PRICING.standardPricePerClientUsd}/client)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {EXAMPLE_MATH.map((row) => {
                  const foundingMo =
                    row.clients * PER_CLIENT_PRICING.foundingPricePerClientUsd;
                  const standardMo =
                    row.clients * PER_CLIENT_PRICING.standardPricePerClientUsd;
                  return (
                    <tr
                      key={row.label}
                      className="transition-colors hover:bg-zinc-900/30"
                    >
                      <td className="px-5 py-4 text-zinc-200">{row.label}</td>
                      <td className="px-5 py-4 text-right font-mono font-semibold text-emerald-400">
                        ${foundingMo.toLocaleString()}/mo
                      </td>
                      <td className="px-5 py-4 text-right font-mono text-zinc-300">
                        ${standardMo.toLocaleString()}/mo
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-6 text-sm leading-relaxed text-zinc-400">
            A 5-person firm with 50 clients saves{" "}
            <strong className="text-emerald-400">$3,000/year</strong> as a founding member.
            A 100-client boutique saves <strong className="text-emerald-400">$6,000/year</strong>.
            And those savings persist — the founding lock survives every future price
            change.
          </p>
        </div>
      </section>

      {/* Benefits — full inventory of what founding members get */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-8 text-2xl font-bold tracking-[-0.03em] text-zinc-100">
            What founding members actually get
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {benefits.map((b) => (
              <div
                key={b.title}
                className="rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent p-6"
              >
                <h3 className="mb-3 text-lg font-bold text-zinc-100">
                  {b.title}
                </h3>
                <p className="text-sm leading-relaxed text-zinc-300">
                  {b.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why founding? — the deal in plain English */}
      <section className="border-y border-zinc-800 bg-[#0a0a0a] px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-6 text-2xl font-extrabold tracking-[-0.03em] text-zinc-100 sm:text-3xl">
            Why founding?
          </h2>
          <div className="space-y-4 text-base leading-relaxed text-zinc-300">
            <p>
              The first {PER_CLIENT_PRICING.foundingSlotsTotal} firms shape what Practiq
              becomes. Your feedback on the approval queue, the agent flow, the redline
              tooling — that&apos;s what the next 100 firms will use. We can&apos;t
              honestly offer that influence to firm #500.
            </p>
            <p>
              In exchange: <strong className="text-zinc-100">${PER_CLIENT_PRICING.foundingPricePerClientUsd}/client</strong>{" "}
              locked in for life, no future increases, a weekly direct channel with
              the founder, and priority on every feature you request. The math:
              we&apos;d rather give 50 firms a price lock that compounds with their
              growth than try to extract maximum revenue from a cohort that hasn&apos;t
              proven the product fits.
            </p>
            <p>
              If the cohort fills and Practiq launches publicly at the{" "}
              <strong className="text-zinc-100">${PER_CLIENT_PRICING.standardPricePerClientUsd}/client</strong>{" "}
              standard, you&apos;re still at ${PER_CLIENT_PRICING.foundingPricePerClientUsd}.
              If standard rises to $19 in 2027, you&apos;re still at $
              {PER_CLIENT_PRICING.foundingPricePerClientUsd}. The lock is per-firm,
              persists across plan changes, and applies to every client you add — forever.
            </p>
          </div>
        </div>
      </section>

      {/* Qualification — same gates as before, calibrated to the new
          per-client model where the 30-client floor matches the value curve */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-4 text-2xl font-bold tracking-[-0.03em] text-zinc-100">
            Is this program right for your firm?
          </h2>
          <p className="mb-8 text-sm leading-relaxed text-zinc-400">
            Founding membership is not a generic waitlist. We qualify applications
            to keep the early-access group small and aligned. Here&apos;s what we
            look for.
          </p>
          <ul className="space-y-6">
            {qualificationNotes.map((q) => (
              <li key={q.title} className="flex items-start gap-4">
                <span className="mt-1.5 inline-block h-2 w-2 flex-shrink-0 rounded-full bg-emerald-400" aria-hidden="true" />
                <div>
                  <h3 className="mb-2 text-base font-bold text-zinc-100">
                    {q.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-zinc-400">
                    {q.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Application form — keep the existing FoundingMemberForm intact;
          it captures vertical/size/bottleneck/notes which still apply
          unchanged under the per-client model. */}
      <section
        id="apply-form"
        className="scroll-mt-24 border-t border-zinc-800 px-6 py-16"
      >
        <div className="mx-auto max-w-2xl">
          <p className="mb-4 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">
            Apply for Founding Membership
          </p>
          <h2 className="mb-4 text-center text-3xl font-extrabold tracking-[-0.03em] text-zinc-100">
            Tell us about your firm
          </h2>
          <p className="mb-10 text-center text-sm leading-relaxed text-zinc-400">
            Five short fields. We&apos;ll review within 24 hours and follow up
            if it looks like a fit.
          </p>

          <FoundingMemberForm />

          <p className="mt-8 text-center text-xs text-zinc-500">
            Not ready to apply?{" "}
            <Link
              href="/#cta"
              className="text-zinc-300 underline underline-offset-4 hover:text-white"
            >
              Join the standard early-access list
            </Link>{" "}
            — you can upgrade to founding membership later if there are slots
            remaining.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-zinc-800 px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-10 text-3xl font-extrabold tracking-[-0.03em] text-zinc-100">
            Common questions
          </h2>
          <dl className="space-y-8">
            <div className="border-b border-zinc-800 pb-8">
              <dt className="mb-3 text-base font-bold text-zinc-100">
                What happens after I apply?
              </dt>
              <dd className="text-sm leading-relaxed text-zinc-400">
                Within 24 hours, one of the founders reviews your application
                and replies. If it&apos;s a fit, we schedule a 30-minute call to
                align on expectations, walk through the product, and confirm
                founding membership. If it&apos;s not a fit (size, vertical,
                timing), we tell you directly and offer the standard
                early-access list.
              </dd>
            </div>
            <div className="border-b border-zinc-800 pb-8">
              <dt className="mb-3 text-base font-bold text-zinc-100">
                How many founding member slots are left?
              </dt>
              <dd className="text-sm leading-relaxed text-zinc-400">
                The counter at the top of this page is live — it reads from the
                same singleton row the checkout webhook updates, so the count
                you see is the count remaining. We typically confirm slot
                availability during the first reply to your application.
              </dd>
            </div>
            <div className="border-b border-zinc-800 pb-8">
              <dt className="mb-3 text-base font-bold text-zinc-100">
                What&apos;s the difference between founding member and standard?
              </dt>
              <dd className="text-sm leading-relaxed text-zinc-400">
                <strong className="text-zinc-100">Standard:</strong> $
                {PER_CLIENT_PRICING.standardPricePerClientUsd}/client/month,
                same features, same {(PER_CLIENT_PRICING.tokensPerClientPerMonth / 1000).toLocaleString()}K
                tokens per client per month.{" "}
                <strong className="text-zinc-100">Founding:</strong> $
                {PER_CLIENT_PRICING.foundingPricePerClientUsd}/client/month, locked
                for life (33% off), priority onboarding, direct founder Slack
                channel, and roadmap input. The founding cohort is intentionally
                small (50 firms, 10 per vertical) to keep the feedback loop tight.
              </dd>
            </div>
            <div className="border-b border-zinc-800 pb-8">
              <dt className="mb-3 text-base font-bold text-zinc-100">
                Is this pay-to-play or is there actually a product?
              </dt>
              <dd className="text-sm leading-relaxed text-zinc-400">
                There&apos;s a real product in early access. Founding members
                onboard onto a working platform, not a promise. The early-access
                period simply means we&apos;re actively shipping new features
                based on your use — by the time the product is GA-ready,
                you&apos;ll have influenced 20-30% of what shipped.
              </dd>
            </div>
            <div className="border-b border-zinc-800 pb-8">
              <dt className="mb-3 text-base font-bold text-zinc-100">
                What if my firm doesn&apos;t meet the qualification criteria?
              </dt>
              <dd className="text-sm leading-relaxed text-zinc-400">
                Reach out anyway if you&apos;re close. The qualification criteria
                aren&apos;t strict gates — they&apos;re signals of who we&apos;ve
                seen the product work best for. Firms in adjacent verticals or at
                slightly different sizes sometimes fit well.
              </dd>
            </div>
            <div className="pb-8">
              <dt className="mb-3 text-base font-bold text-zinc-100">
                Can I cancel founding membership?
              </dt>
              <dd className="text-sm leading-relaxed text-zinc-400">
                Yes, any time, for any reason. The $
                {PER_CLIENT_PRICING.foundingPricePerClientUsd}/client lock is
                conditional on continuing subscription — if you cancel and rejoin
                later, you&apos;re at then-current pricing. No long-term
                contract; no cancellation fee. ZIP export of every workspace
                within 24 hours of cancellation.
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* Practitioner-vocabulary FAQ with FAQPage JSON-LD — these
          questions surface the actual concerns founding cohorts express
          on the introductory call (data control, pivot risk, transfer
          terms) rather than the marketing-tone FAQs above. */}
      <InlineFaq
        pageUrl={`${SITE_URL}/founding-member`}
        items={FOUNDING_FAQS}
        kicker="From founder calls"
        heading="What founding members actually ask before they sign."
      />

      <Footer />
    </div>
  );
}
