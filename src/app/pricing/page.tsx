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
// happens atomically inside /api/stripe/checkout (legacy path; in
// Stage 1 of the per-client rewrite the checkout CTA is disabled
// and we capture leads via /api/early-access instead).
// FoundingCounter still surfaces the canonical 50-slot cohort cap.
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
import { PRICING_TIERS, PRICING_EXAMPLES, PER_CLIENT_PRICING } from "@/lib/stripe/plans";

export const metadata: Metadata = {
  title: "Pricing — Practiq",
  description:
    "Practiq pricing: $15/client/month. 500K tokens included per client. $10 = 1M tokens top-up. Founding member tier — first 50 firms lock in $10/client/month for life.",
  alternates: { canonical: "https://practiq.dev/pricing" },
  openGraph: {
    title: "Practiq Pricing — Pay per client, not per seat",
    description:
      "$15/client/month. 500K tokens included per client. Founding members (first 50 firms) lock in $10/client/month for life.",
    url: "https://practiq.dev/pricing",
    type: "website",
    images: [
      {
        url: "/api/og/pricing",
        width: 1200,
        height: 630,
        alt: "Practiq pricing — per-client model, founding member tier locks 33% off for life",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Practiq Pricing — Pay per client, not per seat",
    description:
      "$15/client/month. 500K tokens included. Founding members (first 50 firms) lock in $10/client/month for life.",
    images: ["/api/og/pricing"],
  },
};

// Pricing page is a Product schema (multiple Offers) since visitors here
// are evaluating tiers. The per-client model exposes two priced offers:
// the standard $15/client/month rate and the founding-member $10/client
// lock-in. Schema.org Offer.price MUST be a bare numeric string — the
// 2026-05-12 Wave 18 fix established this. Marketing copy strings like
// "Starts at $15/user/month" get rejected by Google's rich-snippet
// validator and lose the page price eligibility, so we use the raw per-
// client unit price here.
const productOffersSchema = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "Practiq — AI workspace for boutique professional services firms",
  description:
    "AI-native client context workspace for boutique accounting, law, HR advisory, consulting, and agency firms. Pay per client served, not per seat.",
  brand: { "@type": "Brand", name: "Practiq" },
  offers: [
    {
      "@type": "Offer",
      name: "Standard — per-client pricing",
      price: String(PER_CLIENT_PRICING.standardPricePerClientUsd),
      priceCurrency: "USD",
      priceValidUntil: "2027-12-31",
      availability: "https://schema.org/PreOrder",
      url: `${SITE_URL}/pricing#standard`,
      description:
        "$15 per client per month. 500K tokens included per client. $10 buys 1M tokens top-up (firm-wide pool). Unlimited team seats. 14-day free trial covering 3 clients.",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: String(PER_CLIENT_PRICING.standardPricePerClientUsd),
        priceCurrency: "USD",
        unitText: "MON",
        referenceQuantity: {
          "@type": "QuantitativeValue",
          value: "1",
          unitCode: "C62",
          unitText: "client",
        },
      },
    },
    {
      "@type": "Offer",
      name: "Founding member — first 50 firms",
      price: String(PER_CLIENT_PRICING.foundingPricePerClientUsd),
      priceCurrency: "USD",
      priceValidUntil: "2027-12-31",
      availability: "https://schema.org/PreOrder",
      url: `${SITE_URL}/pricing#founding`,
      description:
        "$10 per client per month — locked for life. First 50 firms only. 500K tokens included per client. Full feature access.",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: String(PER_CLIENT_PRICING.foundingPricePerClientUsd),
        priceCurrency: "USD",
        unitText: "MON",
        referenceQuantity: {
          "@type": "QuantitativeValue",
          value: "1",
          unitCode: "C62",
          unitText: "client",
        },
      },
    },
  ],
};

const pricingBreadcrumb = breadcrumbJsonLd([
  { name: "Home", url: SITE_URL },
  { name: "Pricing", url: `${SITE_URL}/pricing` },
]);

const STANDARD_TIER = PRICING_TIERS.standard;
const FOUNDING_TIER = PRICING_TIERS.founding;
const TRIAL_TIER = PRICING_TIERS.trial;

const FAQS: { q: string; a: string }[] = [
  {
    q: "How does client count work? Do you charge per client?",
    a: "Yes — pricing is purely per-client. You pay $15 for every client workspace you keep active in a given month. No tiers, no thresholds, no surprise upgrade prompts. Add a client this week, you see $15 more on next invoice. Remove a client, the line goes away.",
  },
  {
    q: "What about seats / team members?",
    a: "Seats are unlimited. Invite every accountant, paralegal, or analyst in your firm — the price doesn't move. Pricing tracks the work (clients served), not the team size, because that's where Practiq actually scales with you.",
  },
  {
    q: "What happens when I cross a client threshold?",
    a: "Nothing. There are no thresholds. You just see $15 more on next invoice for each new client workspace, and $15 less for each one you close. No re-pricing, no plan upgrade modal, no annual contract renegotiation.",
  },
  {
    q: "What's a 'credit' and what if I run out of tokens for a client?",
    a: "Each client gets 500K tokens/month by default — enough for ~20 typical engagement memos or ~100 short AI exchanges. When a busy client uses more, top up: $10 buys 1M tokens added to a firm-wide pool that any client can draw from. Or wait until next month's allowance resets. No automatic overage billing.",
  },
  {
    q: "What does 'Founding Member — first 50 firms' mean?",
    a: "The first 50 firms get $10/client/month — locked for life — instead of the $15 standard rate. Same features, same token allowance, just a 33% discount that never expires. Once 50 firms claim their slot, the founding rate closes and new firms onboard at standard pricing.",
  },
  {
    q: "Can I try Practiq before paying?",
    a: "Yes. Free trial covers 3 client workspaces for 14 days, no credit card required. If Practiq isn't saving you at least 5 hours per week by the end of the trial, cancel with no questions asked.",
  },
  {
    q: "What happens to my data if I cancel?",
    a: "You own your data. Cancel at any time — we export all client context, documents, and conversation history as ZIP within 24 hours. After 30 days we permanently delete from our servers. No lock-in, no data held hostage.",
  },
];

// Practitioner-vocabulary FAQ — pulled from r/Accounting, r/LawFirm,
// and r/Bookkeeping language about pricing pain. Rewritten for the
// per-client model. Each answer is 40-60 words, direct, with concrete
// numbers from PER_CLIENT_PRICING so it stays in sync.
const PRACTITIONER_FAQS: { q: string; a: string }[] = [
  {
    q: "I'm drowning at 40 clients on a single seat — what does Practiq actually cost me?",
    a: "Flat $15 × 40 = $600/month. No seat fees, no tier upgrades. Founding members lock that at $10 × 40 = $400/month for life. Either way, hiring a second person to share the load doesn't bump your bill at all — seats are unlimited.",
  },
  {
    q: "What happens when I run out of monthly tokens for one busy client?",
    a: "Each client gets 500K tokens/month included. If one client burns through it, top up: $10 buys 1M tokens added to a firm-wide pool every client can draw from. Or wait until next month resets. No surprise overage charges — top-ups are opt-in, one-click, and never auto-billed.",
  },
  {
    q: "How do I add a teammate mid-month without a billing surprise?",
    a: "There's no per-seat charge to surprise. Add a paralegal, analyst, or staff accountant — no line item on next invoice. The bill only moves when your client count moves. Removing a seat refunds nothing because nothing was charged.",
  },
  {
    q: "Can I cancel during tax season without losing my external memory of clients?",
    a: "Yes. Cancellation triggers a full ZIP export within 24 hours — every client thread, deliverable, and approval-queue decision. We hold raw data 30 days post-cancel so you can re-import on a future plan. No vendor lock; your accumulated context belongs to your firm.",
  },
  {
    q: "If I grow from 50 to 200 clients in a year, does Practiq punish me for scaling?",
    a: "No. Linear pricing means 50 clients = $750/month, 200 clients = $3,000/month, no plan upgrade in between. Founding members pay $500 and $2,000 at those tiers respectively. The math stays predictable — your gross margin per client doesn't get squeezed by a vendor as you grow.",
  },
  {
    q: "Why is the founding-member price still locked even after standard pricing rises?",
    a: "Founding members keep $10/client/month for life — even if standard moves to $19 in 2027. The math: we commit because the first 50 firms shape the product more than any later cohort. The lock is per-firm, persists across plan changes, and applies to every client you add forever.",
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

      <main id="main">
      {/* Hero */}
      <section className="px-6 pt-32 pb-16">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
            One model. One price. No surprises.
          </p>
          <h1 className="mb-6 text-4xl font-extrabold tracking-[-0.03em] text-zinc-100 sm:text-5xl lg:text-6xl">
            Pay for the clients you actually serve.
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
            <strong className="text-zinc-100">$15 per client per month.</strong>{" "}
            Each client comes with 500K tokens included. Top up credits when you
            need more. <strong className="text-zinc-100">Unlimited team seats.</strong>{" "}
            No tiers, no upgrade prompts, no annual contract.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold text-emerald-400">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            Founding member — first 50 firms lock $10/client/month for life
          </div>
          {/* Live "X of 50 claimed" counter — single source of truth from
              the FoundingSlot singleton row written by the Stripe
              webhook on successful checkout. */}
          <div className="mt-6 flex justify-center">
            <FoundingCounter variant="hero" />
          </div>
        </div>
      </section>

      {/* Founding member callout — prominent, time-limited */}
      <section id="founding" className="px-6 pb-12">
        <div className="mx-auto max-w-4xl">
          <div className="relative overflow-hidden rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/40 via-[#0a0a0a] to-[#0a0a0a] p-8 sm:p-10">
            <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" aria-hidden="true" />
            <div className="relative">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">
                Founding member — first 50 firms only
              </p>
              <h2 className="mb-4 text-3xl font-extrabold tracking-[-0.03em] text-zinc-100 sm:text-4xl">
                $10 per client per month — locked for life.
              </h2>
              <p className="mb-6 max-w-2xl text-base leading-relaxed text-zinc-300">
                33% off forever. Same 500K tokens per client. Same firm-wide credit
                top-ups. Same unlimited seats. Same full feature access. The lock is
                per-firm and never expires — not when standard pricing rises, not
                when you change plans, not on renewal.
              </p>
              <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-zinc-300">
                <span className="inline-flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                  $10/client/month vs $15 standard
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                  Direct line to founders
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                  Limited slots — 50 firms total
                </span>
              </div>
              <FoundingCounter variant="inline" />
            </div>
          </div>
        </div>
      </section>

      {/* Tier cards — Founding (left, highlighted) + Standard (right) */}
      <section className="px-6 pb-8">
        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-2">
          {/* Founding tier card */}
          <div className="relative rounded-2xl border border-emerald-500/50 bg-gradient-to-b from-emerald-950/30 to-[#0a0a0a] p-8">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-emerald-500/50 bg-emerald-500/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-400">
              Founding member · first 50 firms
            </div>
            <h2 className="mb-1 text-xl font-bold text-zinc-100">
              {FOUNDING_TIER.publicName}
            </h2>
            <p className="mb-6 text-sm leading-relaxed text-zinc-400">
              {FOUNDING_TIER.tagline}
            </p>

            <div className="mb-6">
              <p className="mb-1 text-sm font-medium text-zinc-400">
                <s className="text-zinc-500">${PER_CLIENT_PRICING.standardPricePerClientUsd}/client/mo standard</s>
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-extrabold text-emerald-400">
                  ${FOUNDING_TIER.pricePerClientUsd}
                </span>
                <span className="text-sm text-zinc-400">per client / month</span>
              </div>
              <p className="mt-2 text-xs font-semibold text-emerald-400">
                Locked in for life — first 50 firms only
              </p>
            </div>

            <div className="mb-6 rounded-lg border border-zinc-800 bg-black/30 p-4 text-xs">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-zinc-400">Tokens per client</span>
                <span className="font-semibold text-zinc-300">500,000 / month</span>
              </div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-zinc-400">Top-up credits</span>
                <span className="font-semibold text-zinc-300">$10 = 1M tokens</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Team seats</span>
                <span className="font-semibold text-zinc-300">Unlimited</span>
              </div>
            </div>

            <ul className="mb-8 space-y-3 text-sm">
              {FOUNDING_TIER.features.map((f, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" aria-hidden="true" />
                  <span className="text-zinc-300">{f}</span>
                </li>
              ))}
            </ul>

            <PricingClient
              tierId="founding"
              tierName={FOUNDING_TIER.publicName}
              highlight={true}
              label={FOUNDING_TIER.ctaLabel}
              planKey={undefined}
              founding={true}
            />
            <p className="mt-3 text-center text-[11px] leading-relaxed text-zinc-500">
              Stripe checkout coming soon — for now we onboard founding members 1:1 via email.
            </p>
          </div>

          {/* Standard tier card */}
          <div id="standard" className="relative rounded-2xl border border-zinc-800 bg-[#0a0a0a] p-8 transition-colors hover:border-zinc-700">
            <h2 className="mb-1 text-xl font-bold text-zinc-100">
              {STANDARD_TIER.publicName}
            </h2>
            <p className="mb-6 text-sm leading-relaxed text-zinc-400">
              {STANDARD_TIER.tagline}
            </p>

            <div className="mb-6">
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-extrabold text-zinc-100">
                  ${STANDARD_TIER.pricePerClientUsd}
                </span>
                <span className="text-sm text-zinc-400">per client / month</span>
              </div>
              <p className="mt-2 text-xs font-medium text-zinc-500">
                After the founding cohort fills
              </p>
            </div>

            <div className="mb-6 rounded-lg border border-zinc-800 bg-black/30 p-4 text-xs">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-zinc-400">Tokens per client</span>
                <span className="font-semibold text-zinc-300">500,000 / month</span>
              </div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-zinc-400">Top-up credits</span>
                <span className="font-semibold text-zinc-300">$10 = 1M tokens</span>
              </div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-zinc-400">Team seats</span>
                <span className="font-semibold text-zinc-300">Unlimited</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Free trial</span>
                <span className="font-semibold text-zinc-300">
                  3 clients · {PER_CLIENT_PRICING.freeTrialDays} days
                </span>
              </div>
            </div>

            <ul className="mb-8 space-y-3 text-sm">
              {STANDARD_TIER.features.map((f, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-zinc-500" aria-hidden="true" />
                  <span className="text-zinc-300">{f}</span>
                </li>
              ))}
            </ul>

            <PricingClient
              tierId="standard"
              tierName={STANDARD_TIER.publicName}
              highlight={false}
              label={STANDARD_TIER.ctaLabel}
              planKey={undefined}
              founding={false}
            />
            <p className="mt-3 text-center text-[11px] leading-relaxed text-zinc-500">
              Stripe checkout coming soon — request access and we&apos;ll onboard you when ready.
            </p>
          </div>
        </div>
        {/* In-tier FAQ jumplink — keeps the buyer in flow when they have
            "wait, how does X work?" questions instead of bouncing off to
            search. Dogfood 2026-05-13 P3-2. */}
        <div className="mx-auto mt-10 max-w-5xl text-center">
          <a
            href="#pricing-faq"
            className="text-sm font-medium text-zinc-400 underline decoration-zinc-700 underline-offset-4 transition-colors hover:text-zinc-100 hover:decoration-zinc-400"
          >
            Got questions? See answered pricing questions ↓
          </a>
        </div>
      </section>

      {/* Example math — helps prospects do the math */}
      <section className="border-y border-zinc-800 bg-[#0a0a0a] px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-3 text-2xl font-extrabold tracking-[-0.03em] text-zinc-100 sm:text-3xl">
            Do the math.
          </h2>
          <p className="mb-8 max-w-2xl text-base leading-relaxed text-zinc-400">
            Pricing scales linearly — every extra client is exactly $15 ($10 for
            founding members). No plan tiers, no upgrade prompts. Here&apos;s what
            common firm sizes pay per month:
          </p>
          <div className="overflow-hidden rounded-2xl border border-zinc-800">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-800 bg-zinc-900/50">
                <tr>
                  <th scope="col" className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Firm size
                  </th>
                  <th scope="col" className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Standard ($15/client)
                  </th>
                  <th scope="col" className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wider text-emerald-400">
                    Founding ($10/client)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {PRICING_EXAMPLES.map((row) => (
                  <tr key={row.label} className="transition-colors hover:bg-zinc-900/30">
                    <td className="px-5 py-4 text-zinc-200">{row.label}</td>
                    <td className="px-5 py-4 text-right font-mono text-zinc-300">
                      ${row.standardMonthlyUsd.toLocaleString()}/mo
                    </td>
                    <td className="px-5 py-4 text-right font-mono font-semibold text-emerald-400">
                      ${row.foundingMonthlyUsd.toLocaleString()}/mo
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-6 text-sm leading-relaxed text-zinc-400">
            Crossing 100 clients doesn&apos;t bump you to a different plan — it
            adds $1,500 to next invoice (or $1,000 if you&apos;re a founding
            member). That&apos;s the entire pricing model.
          </p>
        </div>
      </section>

      {/* Credits explainer */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-6 text-2xl font-extrabold tracking-[-0.03em] text-zinc-100 sm:text-3xl">
            What&apos;s a &quot;credit&quot; and when do I need one?
          </h2>
          <div className="space-y-4 text-base leading-relaxed text-zinc-300">
            <p>
              Each client gets <strong className="text-zinc-100">500K tokens per month</strong>{" "}
              by default — enough for roughly 20 typical engagement memos or 100
              short AI exchanges. For most clients, that&apos;s plenty.
            </p>
            <p>
              When a busy client uses more (heavy reconciliation, deposition-prep
              chats, multi-document analysis), you can top up.{" "}
              <strong className="text-zinc-100">$10 buys 1M tokens</strong> added
              to your firm-wide pool. Any client can draw from the pool — so a
              single $10 top-up covers a spike across multiple clients, not just
              one.
            </p>
            <p>
              Top-ups are <strong className="text-zinc-100">opt-in and one-click.</strong>{" "}
              No automatic overage billing, no surprise renewals. If you don&apos;t
              top up, the workspace pauses LLM calls on the over-budget client
              until next month&apos;s allowance resets. The rest of the firm keeps
              running.
            </p>
          </div>
        </div>
      </section>

      {/* Why per-client section (AEO question) */}
      <section className="border-y border-zinc-800 bg-[#0a0a0a] px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-6 text-2xl font-extrabold tracking-[-0.03em] text-zinc-100 sm:text-3xl">
            Why per-client instead of per-seat?
          </h2>
          <div className="space-y-4 text-base leading-relaxed text-zinc-300">
            <p>
              Boutique firms scale by client count, not seat count. A 4-person
              accounting firm with 120 clients does dramatically more work than a
              12-person firm with 40. Per-seat pricing punishes the first firm and
              subsidizes the second — that&apos;s backwards.
            </p>
            <p>
              Per-client pricing aligns the bill with the actual work. You pay
              when you serve a client, and the math stays the same whether one
              person or six touch the file. Hire more teammates without a billing
              surprise. Add clients linearly without renegotiating contracts.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ with FAQPage JSON-LD */}
      <section id="pricing-faq" className="scroll-mt-20 px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-12 text-3xl font-extrabold tracking-[-0.03em] text-zinc-100 sm:text-4xl">
            Pricing questions, answered.
          </h2>
          {/* FAQ body bumped from text-sm/leading-relaxed to
              text-[15px]/leading-7 on mobile so the long answer paragraphs
              don't feel anemic at 375px. text-zinc-400 → text-zinc-300 +
              the larger size keeps the same overall density on desktop.
              Dogfood 2026-05-13 P2-3. */}
          <dl className="space-y-8">
            {FAQS.map((f) => (
              <div key={f.q} className="border-b border-zinc-800 pb-8">
                <dt className="mb-3 text-base font-bold text-zinc-100">{f.q}</dt>
                <dd className="text-[15px] leading-7 text-zinc-300 sm:text-sm sm:leading-relaxed">
                  {f.a}
                </dd>
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

      {/* Note about trial — embedded for completeness without giving
          it its own card. The card grid is two-tier; the trial isn't
          a payable tier, it's an affordance of the standard model. */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-3xl rounded-2xl border border-zinc-800 bg-[#0a0a0a] p-6 text-sm leading-relaxed text-zinc-400">
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
            {TRIAL_TIER.publicName}
          </p>
          <p>
            Every firm — founding member or standard — gets a{" "}
            <strong className="text-zinc-100">
              {PER_CLIENT_PRICING.freeTrialDays}-day free trial covering{" "}
              {PER_CLIENT_PRICING.freeTrialClients} client workspaces
            </strong>
            , no credit card required. Bring three real clients into Practiq,
            watch what the agents prepare overnight, and decide whether it&apos;s
            worth keeping. If it&apos;s not, walk away with a ZIP of every
            workspace you touched.
          </p>
        </div>
      </section>
      </main>

      <Footer />
    </div>
  );
}
