import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";
import { InlineFaq } from "@/components/seo/inline-faq";
import { FoundingMemberForm } from "./founding-form";
import { FoundingCounter } from "@/components/founding-counter";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SITE_URL = "https://practiq.dev";

// Practitioner-vocabulary FAQ — concrete questions about the founding
// 50-firm cohort, scoped to what real partner-decision-makers worry
// about: pricing lock survival, founding seat handoff, scope of access.
// Each answer 40–60 words. Numbers reference src/lib/stripe/plans.ts
// (Practice $99 standard / $49 founding).
const FOUNDING_FAQS: { q: string; a: string }[] = [
  {
    q: "If I leave my firm, does the $49 founding-member rate transfer to my next practice?",
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
  title: "Founding Member — Join the first 50 firms on Practiq",
  description:
    "Founding Member slots for the first 50 small professional services firms joining Practiq. 50% off for life, priority onboarding, and a direct line to the founders.",
  alternates: { canonical: `${SITE_URL}/founding-member` },
  openGraph: {
    title: "Founding Member — Join the first 50 firms on Practiq",
    description:
      "The first 50 firms joining Practiq get 50% off for life, priority onboarding, and direct input on the product roadmap. Qualification-based application.",
    url: `${SITE_URL}/founding-member`,
    type: "website",
  },
};

const offerSchema = {
  "@context": "https://schema.org",
  "@type": "Offer",
  name: "Practiq Founding Member",
  description:
    "First 50 small professional services firms joining Practiq get 50% off for life, priority onboarding, and roadmap input.",
  url: `${SITE_URL}/founding-member`,
  availability: "https://schema.org/LimitedAvailability",
  validFrom: "2026-04-17",
  priceSpecification: {
    "@type": "PriceSpecification",
    description: "Founding Member pricing: 50% off list price for life",
  },
  eligibleQuantity: {
    "@type": "QuantitativeValue",
    value: 50,
    unitText: "firms",
  },
};

const benefits = [
  {
    title: "50% off for life",
    description:
      "Founding Member pricing is locked in for the life of your firm's subscription. When we move to full pricing ($299/mo Firm tier), you stay at $149/mo. No renegotiation.",
  },
  {
    title: "Priority onboarding",
    description:
      "White-glove onboarding with the founding team — not a support rep. First 5 client setups done together. Custom integration scope based on your current stack.",
  },
  {
    title: "Direct line to the founders",
    description:
      "Shared Slack channel with the founders. Your feature requests skip the queue. Monthly office hours to review what's working and what isn't.",
  },
  {
    title: "Roadmap input",
    description:
      "You see the roadmap; you vote on it. Founding Members collectively determine prioritization on 30-40% of platform investment. Feature priority signals carry real weight.",
  },
  {
    title: "Locked-out feature access",
    description:
      "Features in beta are available to Founding Members first. Integration requests (new platforms, custom workflows) also prioritize Founding Member firms.",
  },
  {
    title: "Public Founding Member designation",
    description:
      "Optional badge + listing on practiq.dev/customers when we launch publicly. Not required — many Founding Members prefer anonymity during early-access.",
  },
];

const qualificationNotes = [
  {
    title: "Small professional services firm (2-15 people)",
    description:
      "Practiq is built for firms where partners and senior staff handle client context directly. Bigger firms have different constraints we're not optimized for yet.",
  },
  {
    title: "50+ active clients or matters",
    description:
      "The value curve for Practiq starts at 50 clients/matters — below that, the context-management problem is still manageable without us. If you're under 50, we can still talk but the fit is different.",
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

export default function FoundingMemberPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100">
      <Nav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(offerSchema) }}
      />

      {/* Hero */}
      <section className="px-6 pt-32 pb-10">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">
            Founding Member Program · 50 slots
          </p>
          <h1 className="mb-6 text-4xl font-extrabold tracking-[-0.03em] text-zinc-100 sm:text-5xl lg:text-6xl">
            The first 50 firms shape{" "}
            <br className="hidden md:inline" />
            <span className="text-zinc-500">what Practiq becomes.</span>
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
            Founding Membership is the first-50-firms program for small
            professional services firms using Practiq during early access.
            50% off for life, priority onboarding, and a direct line to the
            founders — in exchange for serious engagement with the roadmap.
          </p>
          {/* RUN-post-lovable: surface the live "X of 50 claimed" counter
              so the scarcity signal in the schema.org Offer matches what
              the visitor actually sees. Server-rendered (no client
              fetch / hydration flash). DB blip → cap-only fallback. */}
          <div className="flex justify-center">
            <FoundingCounter variant="hero" />
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="px-6 pb-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-8 text-2xl font-bold tracking-[-0.03em] text-zinc-100">
            What Founding Members get
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

      {/* Qualification */}
      <section className="border-y border-zinc-800 bg-[#0a0a0a] px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-4 text-2xl font-bold tracking-[-0.03em] text-zinc-100">
            Is this program right for your firm?
          </h2>
          <p className="mb-8 text-sm leading-relaxed text-zinc-400">
            Founding Membership is not a generic waitlist. We qualify
            applications to keep the early-access group small and aligned.
            Here&apos;s what we look for.
          </p>
          <ul className="space-y-6">
            {qualificationNotes.map((q) => (
              <li key={q.title} className="flex items-start gap-4">
                <span className="mt-1.5 inline-block h-2 w-2 flex-shrink-0 rounded-full bg-emerald-400" />
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

      {/* Application form */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-2xl">
          <p className="mb-4 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">
            Apply for Founding Membership
          </p>
          <h2 className="mb-4 text-center text-3xl font-extrabold tracking-[-0.03em] text-zinc-100">
            Tell us about your firm
          </h2>
          <p className="mb-10 text-center text-sm leading-relaxed text-zinc-400">
            Five short fields. We&apos;ll review within 24 hours and follow
            up if it looks like a fit.
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
            — you can upgrade to Founding Membership later if there are slots
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
                and replies. If it&apos;s a fit, we schedule a 30-minute
                call to align on expectations, walk through the product, and
                confirm Founding Membership. If it&apos;s not a fit (size,
                vertical, timing), we tell you directly and offer the
                standard early-access list.
              </dd>
            </div>
            <div className="border-b border-zinc-800 pb-8">
              <dt className="mb-3 text-base font-bold text-zinc-100">
                How many Founding Member slots are left?
              </dt>
              <dd className="text-sm leading-relaxed text-zinc-400">
                We don&apos;t publish real-time count (we&apos;ve seen that
                create urgency-based applications that aren&apos;t aligned
                fits). As of April 2026, there are slots remaining across
                all five verticals. We typically confirm slot availability
                during the first reply to your application.
              </dd>
            </div>
            <div className="border-b border-zinc-800 pb-8">
              <dt className="mb-3 text-base font-bold text-zinc-100">
                What&apos;s the difference between Founding Member and
                standard early access?
              </dt>
              <dd className="text-sm leading-relaxed text-zinc-400">
                Standard early access: you join a waitlist, get product
                updates, and get access when your vertical is onboarded.
                Founding Member: you&apos;re onboarded in the first 50,
                priority support, 50% off for life, and you have direct
                influence on product direction. The Founding Member group is
                intentionally small (50 firms, 10 per vertical) to keep the
                feedback loop tight.
              </dd>
            </div>
            <div className="border-b border-zinc-800 pb-8">
              <dt className="mb-3 text-base font-bold text-zinc-100">
                Is this pay-to-play or is there actually a product?
              </dt>
              <dd className="text-sm leading-relaxed text-zinc-400">
                There&apos;s a real product in early access. Founding
                Members onboard onto a working platform, not a promise. The
                early-access period simply means we&apos;re actively
                shipping new features based on your use — by the time the
                product is GA-ready, you&apos;ll have influenced 20-30% of
                what shipped.
              </dd>
            </div>
            <div className="border-b border-zinc-800 pb-8">
              <dt className="mb-3 text-base font-bold text-zinc-100">
                What if my firm doesn&apos;t meet the qualification criteria?
              </dt>
              <dd className="text-sm leading-relaxed text-zinc-400">
                Reach out anyway if you&apos;re close. The qualification
                criteria aren&apos;t strict gates — they&apos;re signals of
                who we&apos;ve seen the product work best for. Firms in
                adjacent verticals or at slightly different sizes sometimes
                fit well.
              </dd>
            </div>
            <div className="pb-8">
              <dt className="mb-3 text-base font-bold text-zinc-100">
                Can I cancel Founding Membership?
              </dt>
              <dd className="text-sm leading-relaxed text-zinc-400">
                Yes, any time, for any reason. The 50%-for-life pricing is
                conditional on continuing subscription — if you cancel and
                rejoin later, you&apos;re at current pricing. No long-term
                contract; no cancellation fee.
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
