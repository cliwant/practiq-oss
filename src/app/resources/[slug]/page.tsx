import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";
import { RESOURCES, getResource } from "@/data/resources/resources";
import { ResourceForm } from "./resource-form";

const SITE_URL = "https://practiq.dev";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return RESOURCES.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const r = getResource(slug);
  if (!r) return { title: "Not found" };

  return {
    title: `${r.title} — Free ${r.formatLabel.split(" · ")[0]} | Practiq`,
    description: r.metaDescription,
    alternates: {
      canonical: `${SITE_URL}/resources/${r.slug}`,
    },
    openGraph: {
      title: r.title,
      description: r.metaDescription,
      url: `${SITE_URL}/resources/${r.slug}`,
      type: "article",
    },
    keywords: [
      r.title.toLowerCase(),
      `${r.verticalLabel.toLowerCase()} ${r.format}`,
      `${r.format} for ${r.verticalLabel.toLowerCase()}`,
      `free ${r.format} ${r.vertical}`,
    ],
  };
}

export default async function ResourceDetailPage({ params }: Props) {
  const { slug } = await params;
  const r = getResource(slug);
  if (!r) notFound();

  const pageUrl = `${SITE_URL}/resources/${r.slug}`;

  // Article + Offer JSON-LD
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: r.title,
    description: r.metaDescription,
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

  // FAQPage derived from whoItsFor + whyItWorks + outcome
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `Who is the ${r.title.toLowerCase()} built for?`,
        acceptedAnswer: { "@type": "Answer", text: r.whoItsFor },
      },
      {
        "@type": "Question",
        name: `Why does the ${r.title.toLowerCase()} work?`,
        acceptedAnswer: { "@type": "Answer", text: r.whyItWorks },
      },
      {
        "@type": "Question",
        name: `What's the outcome of using the ${r.title.toLowerCase()}?`,
        acceptedAnswer: { "@type": "Answer", text: r.outcome },
      },
    ],
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: "Resources",
        item: `${SITE_URL}/resources`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: r.title,
        item: pageUrl,
      },
    ],
  };

  const related = (r.relatedResourceSlugs ?? [])
    .map((s) => getResource(s))
    .filter((x): x is NonNullable<typeof x> => !!x);

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100">
      <Nav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <main className="px-6 pt-32 pb-20">
        <article className="mx-auto max-w-3xl">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            Free Resource · {r.verticalLabel}
          </p>

          <h1 className="mb-6 text-4xl font-extrabold tracking-[-0.03em] text-zinc-100 sm:text-5xl">
            {r.title}
          </h1>

          <p className="mb-6 inline-flex items-center gap-2 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300">
            {r.formatLabel}
          </p>

          <p className="mb-10 text-lg leading-relaxed text-zinc-300">
            {r.shortDescription}
          </p>

          {/* What you get */}
          <section className="mb-10">
            <h2 className="mb-4 text-xl font-bold text-zinc-100">
              What&apos;s inside
            </h2>
            <ul className="space-y-3">
              {r.whatYouGet.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-zinc-300">
                  <span className="mt-1.5 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Who it's for */}
          <section className="mb-10 rounded-xl border border-zinc-800 bg-[#0a0a0a] p-6">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              Who this is for
            </p>
            <p className="text-sm leading-relaxed text-zinc-200">
              {r.whoItsFor}
            </p>
          </section>

          {/* Email capture form — the primary CTA */}
          <section className="mb-10 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent p-8">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">
              Get the {r.format} — free
            </p>
            <h2 className="mb-4 text-2xl font-bold tracking-[-0.03em] text-zinc-100">
              Where should we send it?
            </h2>
            <p className="mb-6 text-sm leading-relaxed text-zinc-400">
              Enter your email and we&apos;ll send the {r.format} immediately.
              You&apos;ll also get our early-access newsletter (one-click
              unsubscribe — no spam).
            </p>
            <ResourceForm slug={r.slug} resourceTitle={r.title} verticalDefault={r.vertical} />
          </section>

          {/* Why it works */}
          <section className="mb-10">
            <h2 className="mb-4 text-xl font-bold text-zinc-100">
              Why this works
            </h2>
            <p className="text-sm leading-relaxed text-zinc-300">
              {r.whyItWorks}
            </p>
          </section>

          {/* Outcome */}
          <section className="mb-10 border-l-2 border-emerald-500/40 pl-6">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
              The outcome
            </p>
            <p className="text-base leading-relaxed text-zinc-200">
              {r.outcome}
            </p>
          </section>

          {/* Related resources */}
          {related.length > 0 && (
            <section className="mt-16 border-t border-zinc-800 pt-10">
              <h2 className="mb-6 text-xl font-bold text-zinc-100">
                Related resources
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {related.map((x) => (
                  <Link
                    key={x.slug}
                    href={`/resources/${x.slug}`}
                    className="group rounded-xl border border-zinc-800 bg-[#0a0a0a] p-4 transition-colors hover:border-zinc-600"
                  >
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                      {x.format}
                    </p>
                    <p className="text-sm font-bold text-zinc-200 group-hover:text-white">
                      {x.title}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Back to index */}
          <div className="mt-16 text-center">
            <Link
              href="/resources"
              className="text-sm font-medium text-zinc-400 underline underline-offset-4 hover:text-zinc-200"
            >
              ← Browse all resources
            </Link>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
