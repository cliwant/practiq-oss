import type { Metadata } from "next";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";
import { PricingClient } from "./pricing-client";
import { FoundingCounter } from "@/components/founding-counter";

// Pricing was force-dynamic + revalidate=0 (TTFB 2.16s), then
// revalidate=60 (TTFB 134ms warm / 880ms cold). Round 6 measured
// the cold spike — every minute, the first visitor pays the full
// regen cost. Bumping to 300 (5 min) cuts cold-cache hits by 5x
// (1/300 of requests instead of 1/60). At our current traffic
// (handful of visitors/day) cold hits drop from ~1.7% of requests
// to ~0.3%.
//
// Allocation safety is unchanged — the founding cohort enforce
// happens atomically inside /api/stripe/checkout and the new
// FoundingClaim ledger reconciles on the webhook. The /pricing
// counter is just a display affordance and 5-minute staleness is
// acceptable (cohort fills at <1/day in steady state, <1/min only
// during a launch event when we'd manually drop the revalidate).
export const revalidate = 300;
import { InlineFaq } from "@/components/seo/inline-faq";
import {
  JsonLd,
  organizationJsonLd,
  softwareApplicationJsonLd,
  breadcrumbJsonLd,
  faqJsonLd,
  SITE_URL,
} from "@/lib/seo/json-ld";

export const metadata: Metadata = {
  title: "Pricing — Practiq",
  description:
    "Practiq pricing for 2-10 person accounting, law, HR, consulting, and agency firms. Founding Member tier — first 50 firms lock in 50% off for life.",
  alternates: { canonical: "https://practiq.dev/pricing" },
  openGraph: {
    title: "Practiq Pricing — Founding Member 50% Off for Life",
    description:
      "Three tiers for solo operators to 10-person firms managing 30-200 clients. Founding Members (first 50) keep 50% off forever.",
    url: "https://practiq.dev/pricing",
    type: "website",
  },
};

// Pricing page is a Product schema (multiple Offers) since visitors here
// are evaluating tiers. The shared SoftwareApplication and Organization
// helpers are also rendered so the page joins the same entity graph as
// the homepage.
const productOffersSchema = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "Practiq — AI workspace for boutique professional services firms",
  description:
    "AI-native client context workspace for 2-10 person accounting, law, HR advisory, consulting, and agency firms managing 30-200 clients.",
  brand: { "@type": "Brand", name: "Practiq" },
  offers: [
    {
      "@type": "Offer",
      name: "Solo",
      price: "49.00",
      priceCurrency: "USD",
      priceValidUntil: "2026-12-31",
      availability: "https://schema.org/PreOrder",
      url: `${SITE_URL}/pricing#solo`,
      description:
        "For solo operators managing up to 30 clients. 2M tokens/mo, AI briefings, unlimited documents.",
    },
    {
      "@type": "Offer",
      name: "Practice (Founding Member — first 50 firms)",
      price: "49.00",
      priceCurrency: "USD",
      priceValidUntil: "2026-12-31",
      availability: "https://schema.org/PreOrder",
      url: `${SITE_URL}/pricing#practice`,
      description:
        "For 2-5 person firms managing 30-100 clients. 10M tokens/mo. Founding Member price locks in $49/mo for life (vs. standard $149/mo).",
    },
    {
      "@type": "Offer",
      name: "Firm",
      price: "399.00",
      priceCurrency: "USD",
      priceValidUntil: "2026-12-31",
      availability: "https://schema.org/PreOrder",
      url: `${SITE_URL}/pricing#firm`,
      description:
        "For 6-10 person firms managing 100-200 clients. 50M tokens/mo, multi-seat, advanced permissions, priority support.",
    },
  ],
};

const pricingBreadcrumb = breadcrumbJsonLd([
  { name: "Home", url: SITE_URL },
  { name: "Pricing", url: `${SITE_URL}/pricing` },
]);

type TierId = "solo" | "practice" | "firm";

type Tier = {
  id: TierId;
  name: string;
  headline: string;
  founding?: boolean;
  price: { founding?: string; standard: string };
  cadence: string;
  clients: string;
  seats: string;
  features: string[];
  ctaLabel: string;
  highlight?: boolean;
};

// Pricing UI imports the canonical tier copy from src/lib/stripe/plans.ts
// to guarantee no drift between this page and the checkout/webhook layer.
// We project PLANS into the marketing-friendly shape below.
import {
  PLANS,
  type PlanDefinition,
} from "@/lib/stripe/plans";

function tierFromPlan(p: PlanDefinition): Tier {
  const isPractice = p.key === "practice";
  return {
    id: p.key as TierId,
    name: p.publicName,
    headline: p.tagline,
    founding: isPractice && typeof p.monthlyPriceFoundingUsd === "number",
    price: {
      standard: `$${p.monthlyPriceUsd}`,
      ...(isPractice && p.monthlyPriceFoundingUsd
        ? { founding: `$${p.monthlyPriceFoundingUsd}` }
        : {}),
    },
    cadence: "per month",
    clients:
      p.includedClients === 0
        ? "Unlimited clients"
        : p.key === "practice"
          ? `30-${p.includedClients} clients`
          : p.key === "firm"
            ? `100-${p.includedClients} clients`
            : `Up to ${p.includedClients} clients`,
    seats:
      p.includedSeats === 1
        ? "1 seat"
        : `${p.includedSeats} seats included`,
    features: p.features,
    ctaLabel: isPractice
      ? `Lock in Founding $${p.monthlyPriceFoundingUsd}/mo`
      : p.key === "solo"
        ? "Start 14-day trial — no card required"
        : `Claim ${p.publicName} spot`,
    highlight: p.popular === true,
  };
}

const TIERS: Tier[] = [
  tierFromPlan(PLANS.solo),
  tierFromPlan(PLANS.practice),
  tierFromPlan(PLANS.firm),
];

const FAQS: { q: string; a: string }[] = [
  {
    q: "When does pricing go into effect?",
    a: "Practiq is currently in pre-launch. Founding Members who join during the waitlist phase lock in the Founding Member pricing permanently — it will never increase, even as the standard price rises after launch. Billing begins when your firm is invited off the waitlist and completes onboarding.",
  },
  {
    q: "What does 'Founding Member — first 50 firms' mean?",
    a: "The first 50 firms on the Practiq waitlist get Practice-tier features (10M tokens / mo, 5 seats, full agent stack) at $49/month — vs. $149 standard — for as long as they stay subscribed. No renewal increases, no gotchas. Once 50 firms claim their spot, the Founding Member pricing closes.",
  },
  {
    q: "Can I try Practiq before paying?",
    a: "Yes. Every tier includes a 14-day free trial starting from the moment your firm receives its invitation. If Practiq isn't saving you at least 5 hours per week by the end of the trial, cancel with no questions asked.",
  },
  {
    q: "How does client count work? Do you charge per client?",
    a: "No — pricing is flat per seat, not per client. A Solo plan supports up to 30 clients; a Practice plan supports 30-100; a Firm plan supports 100-200. If your firm crosses a threshold, upgrade at a prorated rate. We don't nickel-and-dime for client seat counts.",
  },
  {
    q: "What happens to my data if I cancel?",
    a: "You own your data. Cancel at any time — we export all client context, documents, and conversation history as ZIP within 24 hours. After 30 days we permanently delete from our servers. No lock-in, no data held hostage.",
  },
  {
    q: "Do you support non-accounting verticals (law, HR, consulting, agency)?",
    a: "Yes. Practiq's core workflows (client context, AI briefing, deliverable preparation, approval queue) work across all five verticals. Vertical-specific features (e.g., tax estimation for accounting, matter management for law, insurance claim tracking for medical) ship in Phase 2.",
  },
];

// Practitioner-vocabulary FAQ — pulled from r/Accounting, r/LawFirm, and
// r/Bookkeeping language about pricing pain. Each answer is 40–60 words,
// direct, with concrete numbers from src/lib/stripe/plans.ts (PLANS) so
// it stays in sync with checkout. See InlineFaq for the JSON-LD wiring.
const PRACTITIONER_FAQS: { q: string; a: string }[] = [
  {
    q: "I'm drowning at 40 clients on a single seat — does Solo at $49 actually scale?",
    a: "Solo caps at 30 clients, 1 seat, and 2M tokens/month by design. Past that, the context-switching tax compounds — you need shared team memory and pooled tokens, not a bigger personal inbox. Move to Practice ($49 founding for life, $149 standard) the moment a second person touches the same client file.",
  },
  {
    q: "What happens when I run out of monthly tokens mid-month?",
    a: "By default, hard cut-off — you get a 'budget reached' prompt and the option to enable overage billing. Once enabled, calls past your allowance bill at $0.012/1K (Solo, Practice) or $0.010/1K (Firm) on your next Stripe invoice. No surprise auto-bills; overage is opt-in per subscription.",
  },
  {
    q: "How do I add a seat mid-month without a billing surprise?",
    a: "Practice adds extra seats at $19/mo each, Firm at $29/mo, prorated daily through Stripe. No annual lock, no minimum bundle. Removing a seat refunds the unused days the same way. The only thing that changes mid-month is the per-seat line on next invoice.",
  },
  {
    q: "Can I cancel during tax season without losing my external memory of clients?",
    a: "Yes. Cancellation triggers a full ZIP export within 24 hours — every client thread, deliverable, and approval-queue decision. We hold raw data 30 days post-cancel so you can re-import on a future plan. No vendor lock; your accumulated context belongs to your firm.",
  },
  {
    q: "What if my firm crosses 100 clients on Practice — do I get throttled?",
    a: "We surface an upgrade prompt at 90 clients, but no hard cutoff. Firm covers up to 200 clients at $399/mo with 10 seats and 50M tokens/mo included. Most 5-person teams cross at month 14; you'll see the bump coming weeks ahead in the workspace dashboard, not at month-end.",
  },
  {
    q: "Why is the founding-member price still locked even after the standard price rises?",
    a: "Founding members keep $49/mo on Practice for life — even if standard moves to $179 in 2027. The math: we commit because the first 50 firms shape the product more than any later cohort. The lock is per-firm, not per-seat, and survives plan downgrades.",
  },
];


export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100">
      <Nav />
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={softwareApplicationJsonLd({ tier: "founding" })} />
      <JsonLd data={productOffersSchema} />
      <JsonLd data={pricingBreadcrumb} />

      {/* Hero */}
      <section className="px-6 pt-32 pb-16">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            Pricing for boutique firms
          </p>
          <h1 className="mb-6 text-4xl font-extrabold tracking-[-0.03em] text-zinc-100 sm:text-5xl lg:text-6xl">
            Pricing for boutique professional services firms.
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
            Built for boutique firms — 2–20 people, 50–200 clients. Three
            flat-rate tiers. No per-client fees. No usage caps hidden in
            asterisks. The first <strong className="text-zinc-100">50 firms</strong> lock
            in Founding Member pricing for life.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold text-emerald-400">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            Founding Member tier — limited to first 50 firms
          </div>
          {/* Live "X of 50 claimed" counter — single source of truth from
              the FoundingSlot singleton row written by the Stripe
              webhook on successful checkout. */}
          <div className="mt-6 flex justify-center">
            <FoundingCounter variant="hero" />
          </div>
        </div>
      </section>

      {/* Tiers */}
      <section className="px-6 pb-20">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-3">
          {TIERS.map((tier) => (
            <div
              key={tier.id}
              className={`relative rounded-2xl border p-8 transition-colors ${
                tier.highlight
                  ? "border-emerald-500/50 bg-gradient-to-b from-emerald-950/30 to-[#0a0a0a]"
                  : "border-zinc-800 bg-[#0a0a0a] hover:border-zinc-700"
              }`}
            >
              {tier.founding && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-emerald-500/50 bg-emerald-500/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-400">
                  Founding Member
                </div>
              )}
              <h2 className="mb-1 text-xl font-bold text-zinc-100">{tier.name}</h2>
              <p className="mb-6 text-sm leading-relaxed text-zinc-500">
                {tier.headline}
              </p>

              <div className="mb-6">
                {tier.price.founding ? (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-extrabold text-zinc-100">
                        {tier.price.founding}
                      </span>
                      <span className="text-sm text-zinc-500">{tier.cadence}</span>
                    </div>
                    <p className="mt-2 text-xs text-zinc-500">
                      <s className="text-zinc-600">{tier.price.standard}/mo</s> standard
                      · <span className="text-emerald-400">{tier.price.founding} for life</span>
                    </p>
                  </>
                ) : (
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-extrabold text-zinc-100">
                      {tier.price.standard}
                    </span>
                    <span className="text-sm text-zinc-500">{tier.cadence}</span>
                  </div>
                )}
              </div>

              <div className="mb-6 rounded-lg border border-zinc-800 bg-black/30 p-4 text-xs">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-zinc-500">Clients</span>
                  <span className="font-semibold text-zinc-300">{tier.clients}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Team</span>
                  <span className="font-semibold text-zinc-300">{tier.seats}</span>
                </div>
              </div>

              <ul className="mb-8 space-y-3 text-sm">
                {tier.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" />
                    <span className="text-zinc-300">{f}</span>
                  </li>
                ))}
              </ul>

              <PricingClient
                tierId={tier.id}
                tierName={tier.name}
                highlight={tier.highlight ?? false}
                label={tier.ctaLabel}
                planKey={tier.id}
                founding={tier.id === "practice"}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Why flat-rate section (AEO question) */}
      <section className="border-y border-zinc-800 bg-[#0a0a0a] px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-6 text-2xl font-extrabold tracking-[-0.03em] text-zinc-100 sm:text-3xl">
            Why flat-rate pricing instead of per-client?
          </h2>
          <div className="space-y-4 text-base leading-relaxed text-zinc-300">
            <p>
              Most practice management tools charge per client or per matter. That
              creates a perverse incentive — the more clients you serve, the more
              the software taxes you for doing your job well. We think it&apos;s
              backwards.
            </p>
            <p>
              Practiq&apos;s costs don&apos;t scale linearly with your client count
              (a single AI workspace handles 200 clients just as efficiently as
              30). So we charge a flat per-seat rate. Serve 30 clients or 200 —
              same price. Your margin expands as your firm scales, not ours.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ with FAQPage JSON-LD */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-12 text-3xl font-extrabold tracking-[-0.03em] text-zinc-100 sm:text-4xl">
            Pricing questions, answered.
          </h2>
          <dl className="space-y-8">
            {FAQS.map((f) => (
              <div key={f.q} className="border-b border-zinc-800 pb-8">
                <dt className="mb-3 text-base font-bold text-zinc-100">{f.q}</dt>
                <dd className="text-sm leading-relaxed text-zinc-400">{f.a}</dd>
              </div>
            ))}
          </dl>
          <JsonLd data={faqJsonLd(FAQS)} />
        </div>
      </section>

      {/* Practitioner-vocabulary FAQ — separate JSON-LD block on purpose:
          Google permits multiple FAQPage instances per page when each
          surfaces distinct question clusters. The official FAQ above is
          marketing-tone; this one mirrors how practitioners ask in
          r/Accounting / r/LawFirm forums. */}
      <InlineFaq
        pageUrl={`${SITE_URL}/pricing`}
        items={PRACTITIONER_FAQS}
        kicker="From the practitioner forums"
        heading="Pricing questions, answered like you'd ask them on Reddit."
      />

      <Footer />
    </div>
  );
}
