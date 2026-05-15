import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";
import { PROBLEMS, getProblem } from "@/data/problems/problems";

const SITE_URL = "https://practiq.dev";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return PROBLEMS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = getProblem(slug);
  if (!p) return { title: "Not found" };

  return {
    title: `${p.title} — Practiq`,
    description: p.metaDescription,
    alternates: { canonical: `${SITE_URL}/problem/${p.slug}` },
    openGraph: {
      title: p.h1,
      description: p.metaDescription,
      url: `${SITE_URL}/problem/${p.slug}`,
      type: "article",
    },
  };
}

export default async function ProblemDetailPage({ params }: Props) {
  const { slug } = await params;
  const p = getProblem(slug);
  if (!p) notFound();

  const pageUrl = `${SITE_URL}/problem/${p.slug}`;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: p.h1,
    description: p.metaDescription,
    url: pageUrl,
    datePublished: "2026-04-17",
    dateModified: "2026-04-17",
    author: { "@type": "Organization", name: "Practiq", url: SITE_URL },
    publisher: { "@id": `${SITE_URL}/#organization` },
    mainEntityOfPage: pageUrl,
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: p.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: "Problems",
        item: `${SITE_URL}/problem`,
      },
      { "@type": "ListItem", position: 3, name: p.title, item: pageUrl },
    ],
  };

  const relatedPages = p.relatedProblems
    .map((s) => getProblem(s))
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
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-red-400/80">
            Problem analysis · {p.verticalLabel}
          </p>

          <h1 className="mb-6 text-4xl font-extrabold tracking-[-0.03em] text-zinc-100 sm:text-5xl">
            {p.h1}
          </h1>

          <p className="mb-10 text-lg leading-relaxed text-zinc-300">
            {p.shortDescription}
          </p>

          {/* Symptoms */}
          <section className="mb-10 rounded-xl border-l-2 border-red-500/40 bg-[#0a0a0a] p-6">
            <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-red-400">
              You know you have this problem if...
            </p>
            <ul className="space-y-3">
              {p.symptoms.map((s, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-sm text-zinc-200"
                >
                  <span className="mt-1.5 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-400/70" />
                  <span className="leading-relaxed">{s}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Why it happens */}
          <section className="mb-10">
            <h2 className="mb-4 text-xl font-bold text-zinc-100">
              Why this happens
            </h2>
            <div className="space-y-4 text-base leading-relaxed text-zinc-300">
              {p.whyItHappens.split("\n\n").map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </section>

          {/* Cost analysis */}
          <section className="mb-10 rounded-xl border border-zinc-800 bg-[#0a0a0a] p-6">
            <h2 className="mb-6 text-xl font-bold text-zinc-100">
              What it actually costs
            </h2>
            <dl className="space-y-5">
              {p.costAnalysis.map((c) => (
                <div key={c.metric}>
                  <dt className="mb-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    {c.metric}
                  </dt>
                  <dd className="mb-1 text-base font-bold text-zinc-100">
                    {c.value}
                  </dd>
                  <p className="text-xs text-zinc-500">Source: {c.source}</p>
                </div>
              ))}
            </dl>
          </section>

          {/* What most firms try */}
          <section className="mb-10">
            <h2 className="mb-6 text-xl font-bold text-zinc-100">
              What most firms try (and why it doesn&apos;t fix it)
            </h2>
            <div className="space-y-4">
              {p.whatMostFirmsTry.map((t) => (
                <div
                  key={t.approach}
                  className="rounded-xl border border-zinc-800 bg-[#0a0a0a] p-6"
                >
                  <h3 className="mb-2 text-base font-bold text-zinc-100">
                    {t.approach}
                  </h3>
                  <p className="text-sm leading-relaxed text-zinc-400">
                    Why it doesn&apos;t fully fix it: {t.whyItFails}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* What works */}
          <section className="mb-10 rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent p-6">
            <h2 className="mb-4 text-xl font-bold text-zinc-100">
              What actually works
            </h2>
            <div className="space-y-4 text-sm leading-relaxed text-zinc-200">
              {p.whatActuallyWorks.split("\n\n").map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </section>

          {/* FAQ */}
          <section className="mb-12 border-t border-zinc-800 pt-10">
            <h2 className="mb-8 text-xl font-bold text-zinc-100">
              Frequently asked
            </h2>
            <dl className="space-y-6">
              {p.faqs.map((f) => (
                <div
                  key={f.q}
                  className="border-b border-zinc-800 pb-6 last:border-0"
                >
                  <dt className="mb-3 text-base font-bold text-zinc-100">
                    {f.q}
                  </dt>
                  <dd className="text-sm leading-relaxed text-zinc-400">
                    {f.a}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {/* CTA */}
          <section className="mt-12 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent p-10 text-center">
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">
              Founding Member Early Access
            </p>
            <h2 className="mb-4 text-2xl font-bold tracking-[-0.03em] text-zinc-100">
              If this problem sounds familiar
            </h2>
            <p className="mx-auto mb-8 max-w-xl text-sm text-zinc-400">
              Practiq is purpose-built for firms hitting the structural
              ceilings that cause this pattern. First 50 firms to join lock in
              $10/client/month for life (33% off forever).
            </p>
            <Link
              href={`/?utm_source=problem&utm_medium=cta&utm_campaign=${p.slug}#cta`}
              className="inline-flex items-center gap-3 rounded-2xl bg-zinc-100 px-10 py-4 text-sm font-bold uppercase tracking-widest text-zinc-950 shadow-lg transition-opacity hover:opacity-90"
            >
              Claim Founding spot →
            </Link>
            <p className="mt-6 text-xs text-zinc-500">
              Or{" "}
              <Link
                href="/roi-calculator"
                className="text-zinc-300 underline underline-offset-4 hover:text-white"
              >
                run the ROI calculator
              </Link>{" "}
              to see what this problem costs your specific firm.
            </p>
          </section>

          {relatedPages.length > 0 && (
            <section className="mt-16 border-t border-zinc-800 pt-10">
              <p className="mb-6 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                Related problems
              </p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {relatedPages.map((x) => (
                  <Link
                    key={x.slug}
                    href={`/problem/${x.slug}`}
                    className="rounded-xl border border-zinc-800 bg-[#0a0a0a] p-4 transition-colors hover:border-zinc-600"
                  >
                    <p className="text-sm font-bold text-zinc-200">
                      {x.title}
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
