import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";
import { INTEGRATIONS, getIntegration } from "@/data/integrations/integrations";

const SITE_URL = "https://practiq.dev";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return INTEGRATIONS.map((i) => ({ slug: i.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const i = getIntegration(slug);
  if (!i) return { title: "Not found" };

  return {
    title: `Practiq + ${i.name} Integration — ${i.statusLabel}`,
    description: i.metaDescription,
    alternates: {
      canonical: `${SITE_URL}/integrations/${i.slug}`,
    },
    openGraph: {
      title: `Practiq + ${i.name} Integration`,
      description: i.metaDescription,
      url: `${SITE_URL}/integrations/${i.slug}`,
      type: "article",
    },
    keywords: [
      `Practiq ${i.name}`,
      `${i.name} integration`,
      `${i.name} AI`,
      `${i.verticalLabel} ${i.name}`,
    ],
  };
}

const STATUS_STYLE: Record<
  "live" | "beta" | "roadmap" | "partner-requested",
  string
> = {
  live: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  beta: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  roadmap: "text-blue-400 border-blue-500/30 bg-blue-500/10",
  "partner-requested": "text-zinc-400 border-zinc-700 bg-zinc-800",
};

export default async function IntegrationDetailPage({ params }: Props) {
  const { slug } = await params;
  const i = getIntegration(slug);
  if (!i) notFound();

  const pageUrl = `${SITE_URL}/integrations/${i.slug}`;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `Practiq + ${i.name} Integration`,
    description: i.metaDescription,
    url: pageUrl,
    datePublished: "2026-04-17",
    dateModified: "2026-04-17",
    author: {
      "@type": "Organization",
      name: "Practiq",
      url: SITE_URL,
    },
    publisher: { "@id": `${SITE_URL}/#organization` },
    mainEntityOfPage: pageUrl,
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: "Integrations",
        item: `${SITE_URL}/integrations`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: `${i.name} Integration`,
        item: pageUrl,
      },
    ],
  };

  const related = INTEGRATIONS.filter(
    (x) => x.slug !== i.slug && x.vertical === i.vertical
  ).slice(0, 3);

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100">
      <Nav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <main className="px-6 pt-32 pb-20">
        <article className="mx-auto max-w-3xl">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            Integration · {i.categoryLabel}
          </p>

          <div className="mb-6 flex items-center justify-between gap-4">
            <h1 className="text-4xl font-extrabold tracking-[-0.03em] text-zinc-100 sm:text-5xl">
              Practiq + {i.name}
            </h1>
            <span
              className={`inline-flex items-center whitespace-nowrap rounded-md border px-3 py-1.5 text-xs font-bold uppercase tracking-widest ${STATUS_STYLE[i.status]}`}
            >
              {i.status}
            </span>
          </div>

          <p className="mb-4 text-lg text-zinc-300">{i.tagline}</p>
          <p className="mb-10 text-sm text-zinc-500">{i.statusLabel}</p>

          {/* What it does */}
          <section className="mb-10">
            <h2 className="mb-4 text-xl font-bold text-zinc-100">
              What the integration does
            </h2>
            <p className="text-base leading-relaxed text-zinc-300">
              {i.whatItDoes}
            </p>
          </section>

          {/* Capabilities */}
          <section className="mb-10 rounded-xl border border-zinc-800 bg-[#0a0a0a] p-6">
            <h2 className="mb-4 text-xl font-bold text-zinc-100">
              Capabilities
            </h2>
            <ul className="space-y-3">
              {i.capabilities.map((cap) => (
                <li
                  key={cap}
                  className="flex items-start gap-3 text-sm text-zinc-300"
                >
                  <span className="mt-1.5 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" />
                  <span className="leading-relaxed">{cap}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 border-t border-zinc-800 pt-4 text-xs text-zinc-500">
              Data flow: {i.dataFlowDirection.toUpperCase()}{" "}
              {i.dataFlowDirection === "read" &&
                "— Practiq reads from " + i.name + "; we don't write back to it."}
              {i.dataFlowDirection === "write" &&
                "— Practiq writes to " + i.name + " (details in setup)."}
              {i.dataFlowDirection === "bidirectional" &&
                "— Bidirectional sync (details in setup)."}
            </p>
          </section>

          {/* Use cases */}
          <section className="mb-10">
            <h2 className="mb-6 text-xl font-bold text-zinc-100">Use cases</h2>
            <div className="space-y-4">
              {i.useCases.map((uc) => (
                <div
                  key={uc.title}
                  className="rounded-xl border border-zinc-800 bg-[#0a0a0a] p-6"
                >
                  <h3 className="mb-2 text-base font-bold text-zinc-100">
                    {uc.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-zinc-400">
                    {uc.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Setup */}
          <section className="mb-10 rounded-xl border border-zinc-800 bg-[#0a0a0a] p-6">
            <h2 className="mb-4 text-xl font-bold text-zinc-100">Setup</h2>
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="mb-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  Setup time
                </dt>
                <dd className="text-zinc-300">{i.setupTime}</dd>
              </div>
              <div>
                <dt className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  Prerequisites
                </dt>
                <dd>
                  <ul className="space-y-2 text-zinc-300">
                    {i.prerequisites.map((p) => (
                      <li key={p} className="flex items-start gap-3">
                        <span className="mt-1.5 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-zinc-600" />
                        <span className="leading-relaxed">{p}</span>
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
              <div>
                <dt className="mb-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  Pricing
                </dt>
                <dd className="text-zinc-300">{i.pricingNote}</dd>
              </div>
            </dl>
          </section>

          {i.competitorNote && (
            <section className="mb-10 border-l-2 border-emerald-500/40 pl-6">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                How Practiq relates to {i.name}
              </p>
              <p className="text-sm leading-relaxed text-zinc-300">
                {i.competitorNote}
              </p>
            </section>
          )}

          {/* CTA */}
          <section className="mt-12 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent p-10 text-center">
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">
              {i.status === "live" || i.status === "beta"
                ? "Ready to try this integration"
                : "Get notified when this integration is live"}
            </p>
            <h2 className="mb-4 text-2xl font-bold tracking-[-0.03em] text-zinc-100">
              {i.status === "live" || i.status === "beta"
                ? `Connect ${i.name} to Practiq`
                : `Be first when Practiq + ${i.name} launches`}
            </h2>
            <p className="mx-auto mb-8 max-w-xl text-sm text-zinc-400">
              {i.status === "live" || i.status === "beta"
                ? `Founding Members get free access to Practiq + ${i.name}. First 50 firms also get 50% off for life once we move to paid plans.`
                : `Join early access and we'll notify you the moment the ${i.name} integration is available. Founding Members get first access.`}
            </p>
            <Link
              href={`/?utm_source=integrations&utm_medium=cta&utm_campaign=${i.slug}#cta`}
              className="inline-flex items-center gap-3 rounded-2xl bg-zinc-100 px-10 py-4 text-sm font-bold uppercase tracking-widest text-zinc-950 shadow-lg transition-opacity hover:opacity-90"
            >
              {i.status === "live" || i.status === "beta"
                ? "Claim Founding spot →"
                : "Get notified →"}
            </Link>
          </section>

          {related.length > 0 && (
            <section className="mt-16 border-t border-zinc-800 pt-10">
              <p className="mb-6 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                Related integrations
              </p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {related.map((x) => (
                  <Link
                    key={x.slug}
                    href={`/integrations/${x.slug}`}
                    className="rounded-xl border border-zinc-800 bg-[#0a0a0a] p-4 transition-colors hover:border-zinc-600"
                  >
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                      {x.status}
                    </p>
                    <p className="text-sm font-bold text-zinc-200">{x.name}</p>
                    <p className="mt-1 text-xs text-zinc-500 line-clamp-2">
                      {x.tagline}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </article>
      </main>

      <Footer />
    </div>
  );
}
