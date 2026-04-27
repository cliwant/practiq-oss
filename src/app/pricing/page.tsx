import type { Metadata } from "next";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";
import { PricingClient } from "./pricing-client";
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
      price: "39.00",
      priceCurrency: "USD",
      priceValidUntil: "2026-12-31",
      availability: "https://schema.org/PreOrder",
      url: `${SITE_URL}/pricing#solo`,
      description:
        "For solo operators managing up to 30 clients. Full client context, AI briefings, unlimited documents.",
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
        "For 2-5 person firms managing 30-100 clients. Founding Member price locks in $49/mo for life (vs. standard $99/mo).",
    },
    {
      "@type": "Offer",
      name: "Firm",
      price: "299.00",
      priceCurrency: "USD",
      priceValidUntil: "2026-12-31",
      availability: "https://schema.org/PreOrder",
      url: `${SITE_URL}/pricing#firm`,
      description:
        "For 6-10 person firms managing 100-200 clients. Multi-seat, advanced permissions, priority support.",
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
    a: "The first 50 firms on the Practiq waitlist get Practice-tier features at $49/month (vs. $99 standard) for as long as they stay subscribed — no renewal increases, no gotchas. Once 50 firms claim their spot, the Founding Member pricing closes.",
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
            Pricing
          </p>
          <h1 className="mb-6 text-4xl font-extrabold tracking-[-0.03em] text-zinc-100 sm:text-5xl lg:text-6xl">
            What does Practiq cost for a 2-10 person firm?
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
            Three flat-rate tiers. No per-client fees. No usage caps hidden in
            asterisks. The first <strong className="text-zinc-100">50 firms</strong> lock
            in Founding Member pricing for life.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold text-emerald-400">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            Founding Member tier — limited to first 50 firms
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
                      · <span className="text-emerald-400">$49 for life</span>
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

      <Footer />
    </div>
  );
}
