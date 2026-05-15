import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";
import { PRIORITY_STATES, getState } from "@/data/geo/us-states";

const SITE_URL = "https://practiq.dev";

const VERTICALS = [
  { slug: "accounting", label: "Accounting", firmLabel: "accounting firm", professionalLabel: "CPA" },
  { slug: "law", label: "Law", firmLabel: "law firm", professionalLabel: "attorney" },
  { slug: "hr", label: "HR Advisory", firmLabel: "HR advisory firm", professionalLabel: "HR consultant" },
  { slug: "consulting", label: "Consulting", firmLabel: "consulting firm", professionalLabel: "consultant" },
  { slug: "agency", label: "Agency", firmLabel: "marketing agency", professionalLabel: "agency operator" },
];

interface Props {
  params: Promise<{ vertical: string; state: string }>;
}

export async function generateStaticParams() {
  const params: { vertical: string; state: string }[] = [];
  for (const v of VERTICALS) {
    for (const s of PRIORITY_STATES) {
      params.push({ vertical: v.slug, state: s.slug });
    }
  }
  return params;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { vertical: verticalSlug, state: stateSlug } = await params;
  const vertical = VERTICALS.find((v) => v.slug === verticalSlug);
  const state = getState(stateSlug);
  if (!vertical || !state) return { title: "Not found" };

  const title = `AI Workspace for ${vertical.label} Firms in ${state.name} (2026)`;
  const description = `Practiq is the AI-native workspace for small ${vertical.firmLabel}s in ${state.name} managing 50-200 client relationships. Built for ${state.majorCities[0]}, ${state.majorCities[1]}, and other ${state.name} firms.`;

  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/for/${vertical.slug}/${state.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/for/${vertical.slug}/${state.slug}`,
    },
  };
}

export default async function GeoVerticalPage({ params }: Props) {
  const { vertical: verticalSlug, state: stateSlug } = await params;
  const vertical = VERTICALS.find((v) => v.slug === verticalSlug);
  const state = getState(stateSlug);
  if (!vertical || !state) notFound();

  const pageUrl = `${SITE_URL}/for/${vertical.slug}/${state.slug}`;

  const contextField =
    vertical.slug === "accounting"
      ? state.cpaContext
      : vertical.slug === "law"
      ? state.lawContext
      : vertical.slug === "hr"
      ? state.hrContext
      : null;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `AI Workspace for ${vertical.label} Firms in ${state.name}`,
    description: `Practiq is the AI-native workspace for small ${vertical.firmLabel}s in ${state.name}.`,
    url: pageUrl,
    datePublished: "2026-04-16",
    dateModified: "2026-04-16",
    author: { "@type": "Organization", name: "Practiq", url: SITE_URL },
    publisher: { "@id": `${SITE_URL}/#organization` },
    mainEntityOfPage: pageUrl,
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: vertical.label, item: `${SITE_URL}/for/${vertical.slug}` },
      { "@type": "ListItem", position: 3, name: state.name, item: pageUrl },
    ],
  };

  const faqs = [
    {
      q: `What is the best AI tool for ${vertical.firmLabel}s in ${state.name}?`,
      a: `Practiq is the first AI-native workspace purpose-built for small (2-10 person) ${vertical.firmLabel}s. For ${state.name} firms specifically, Practiq provides multi-client context management, overnight AI scanning, and deliverable preparation that general-purpose tools cannot replicate.`,
    },
    {
      q: `How much does AI workspace software cost for a ${vertical.firmLabel} in ${state.name}?`,
      a: `Practiq charges $15 per client per month — pay only for the clients you actually serve, with unlimited team seats included. The first 50 firms to join lock in Founding Member pricing of $10 per client per month for life (33% off forever). Other practice management tools range from $40 to $200 per user per month, which punishes you for hiring more staff.`,
    },
    {
      q: `Can a small ${vertical.firmLabel} in ${state.name} really handle 150 clients with Practiq?`,
      a: `The firms we have talked to hit a capacity ceiling around 50-75 clients per partner when relying on personal memory. The AI workspace layer removes this ceiling by holding client context outside of individual heads, making 150+ clients per partner practical.`,
    },
    ...(contextField
      ? [
          {
            q: `What ${state.name}-specific considerations should a small ${vertical.firmLabel} know about?`,
            a: contextField,
          },
        ]
      : []),
  ];

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="min-h-screen bg-bg-base">
      <Nav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <main className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-4">
            {vertical.label} · {state.name}
          </p>

          <h1 className="text-4xl md:text-5xl font-black text-zinc-100 tracking-tight leading-tight mb-5">
            AI Workspace for {vertical.label} Firms in {state.name}
          </h1>

          <p className="text-lg text-zinc-400 leading-relaxed mb-10 max-w-3xl">
            Practiq is the AI-native workspace built for small {vertical.firmLabel}s managing
            50-200 client relationships. If you run a firm in {state.majorCities[0]},{" "}
            {state.majorCities[1]}, or anywhere else in {state.name}, here is what makes Practiq
            different.
          </p>

          {contextField && (
            <div className="bento-card p-6 mb-10 border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400 mb-2">
                {state.name} Context
              </p>
              <p className="text-sm text-zinc-300 leading-relaxed">{contextField}</p>
            </div>
          )}

          <div className="prose-dark mb-12">
            <h2>Why {vertical.firmLabel}s in {state.name} need more than a practice management tool</h2>
            <p>
              Most software available to small {vertical.firmLabel}s was built for a single business
              managing its own work. But your firm does something different — you hold context on
              dozens of client businesses simultaneously. Each client has unique history,
              preferences, and ongoing issues that traditional tools do not capture. This
              context-switching tax compounds in {state.name} firms that serve the concentrated
              client base typical of markets like {state.majorCities[0]} and {state.majorCities[1]}.
            </p>

            <h2>How Practiq is different</h2>
            <p>
              Practiq is built AI-first. Every client gets a dedicated workspace storing complete
              history. An AI assistant scans every client overnight and surfaces priorities in a
              single morning queue. When you switch between clients, the full context loads
              instantly. When a team member takes vacation, their client knowledge does not go with
              them. When a new associate joins, they can hold client context from week one.
            </p>

            <h2>Major {state.name} markets Practiq serves</h2>
            <p>
              Practiq works the same whether your firm is in {state.majorCities.slice(0, 3).join(", ")},{" "}
              or {state.majorCities[3]}. The AI workspace concept scales across firm size, vertical
              focus, and geography. What matters is that you manage ongoing client relationships at
              scale.
            </p>

            <h2>Founding Member Access</h2>
            <p>
              The first 50 firms to join Practiq lock in Founding Member pricing — $10 per client
              per month for life (33% off the $15 per client per month standard rate, forever),
              priority onboarding, and a direct feedback line to the founders. If you are a{" "}
              {state.name} {vertical.firmLabel} with 2-10 people managing 50+ clients, this is a
              rare window to secure a permanent pricing advantage.
            </p>
          </div>

          {/* FAQ Section */}
          <div className="mt-12 pt-10 border-t border-zinc-800">
            <h2 className="text-2xl font-bold text-zinc-100 mb-8">Frequently Asked</h2>
            <div className="space-y-6">
              {faqs.map((f) => (
                <div key={f.q} className="bento-card p-6">
                  <h3 className="text-base font-bold text-zinc-100 mb-3">{f.q}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{f.a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="mt-16 pt-10 border-t border-zinc-800">
            <div className="bento-card p-10 text-center bg-gradient-to-br from-amber-500/5 to-transparent">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400 mb-4">
                Founding Member Early Access
              </p>
              <h2 className="text-3xl font-black text-zinc-100 tracking-tight mb-4">
                Join the waitlist for {state.name} firms.
              </h2>
              <p className="text-zinc-400 mb-8 max-w-xl mx-auto">
                First 50 firms lock in $10/client/month for life (33% off forever). Priority
                onboarding and direct founder feedback.
              </p>
              <Link
                href={`/?utm_source=geo&utm_medium=vertical_state&utm_campaign=${vertical.slug}-${state.slug}#cta`}
                className="btn-premium inline-flex items-center gap-3 py-4 px-10 text-sm"
              >
                Claim My Founding Spot <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Other states for this vertical */}
          <div className="mt-16">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-6">
              Also available for {vertical.label} firms in
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {PRIORITY_STATES.filter((s) => s.slug !== state.slug)
                .slice(0, 10)
                .map((s) => (
                  <Link
                    key={s.slug}
                    href={`/for/${vertical.slug}/${s.slug}`}
                    className="bento-card p-3 text-center hover:border-zinc-600 transition-colors"
                  >
                    <p className="text-xs font-bold text-zinc-200">{s.name}</p>
                  </Link>
                ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
