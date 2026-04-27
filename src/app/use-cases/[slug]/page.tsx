import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";
import { USE_CASES, getUseCase } from "@/data/use-cases/use-cases";
import {
  JsonLd,
  breadcrumbJsonLd,
  faqJsonLd,
  serviceSchemaForUseCase,
  SITE_URL,
} from "@/lib/seo/json-ld";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return USE_CASES.map((u) => ({ slug: u.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const u = getUseCase(slug);
  if (!u) return { title: "Not found" };

  return {
    title: `${u.title} — Practiq`,
    description: u.metaDescription,
    alternates: {
      canonical: `${SITE_URL}/use-cases/${u.slug}`,
    },
    openGraph: {
      title: u.h1,
      description: u.metaDescription,
      url: `${SITE_URL}/use-cases/${u.slug}`,
      type: "article",
    },
  };
}

export default async function UseCaseDetailPage({ params }: Props) {
  const { slug } = await params;
  const u = getUseCase(slug);
  if (!u) notFound();

  const pageUrl = `${SITE_URL}/use-cases/${u.slug}`;

  // Use cases get TWO entity types: an Article (for blog-style search
  // surfaces) and a Service (for "what does Practiq do for X" answer
  // queries). Both reference the same canonical Organization @id.
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: u.h1,
    description: u.metaDescription,
    url: pageUrl,
    datePublished: "2026-04-17",
    dateModified: "2026-04-17",
    author: { "@type": "Organization", name: "Practiq", url: SITE_URL },
    publisher: { "@id": `${SITE_URL}/#organization` },
    mainEntityOfPage: pageUrl,
  };

  const serviceLd = serviceSchemaForUseCase(
    u.slug,
    u.verticalLabel,
    u.h1,
    u.metaDescription,
    pageUrl
  );

  const faqLd = faqJsonLd(u.faqs);

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Use Cases", url: `${SITE_URL}/use-cases` },
    { name: u.title, url: pageUrl },
  ]);

  const related = USE_CASES.filter((x) => x.slug !== u.slug).slice(0, 3);

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100">
      <Nav />
      <JsonLd data={articleLd} />
      <JsonLd data={serviceLd} />
      <JsonLd data={faqLd} />
      <JsonLd data={breadcrumbLd} />

      <main className="px-6 pt-32 pb-20">
        <article className="mx-auto max-w-3xl">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">
            Use case · {u.verticalLabel}
          </p>

          <h1 className="mb-6 text-4xl font-extrabold tracking-[-0.03em] text-zinc-100 sm:text-5xl">
            {u.h1}
          </h1>

          {/* Problem statement */}
          <section className="mb-10 rounded-xl border-l-2 border-red-500/40 bg-[#0a0a0a] p-6">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-red-400">
              The problem
            </p>
            <p className="text-base leading-relaxed text-zinc-200">
              {u.problemStatement}
            </p>
          </section>

          {/* Current reality */}
          <section className="mb-10">
            <h2 className="mb-4 text-xl font-bold text-zinc-100">
              How it works today
            </h2>
            <ul className="space-y-3">
              {u.currentReality.map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-sm text-zinc-300"
                >
                  <span className="mt-1.5 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-400/60" />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Practiq approach */}
          <section className="mb-10">
            <h2 className="mb-4 text-xl font-bold text-zinc-100">
              How Practiq handles it
            </h2>
            <ul className="space-y-3">
              {u.practiqApproach.map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-sm text-zinc-300"
                >
                  <span className="mt-1.5 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Outcomes */}
          <section className="mb-10 rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent p-6">
            <h2 className="mb-6 text-xl font-bold text-zinc-100">
              Outcomes (from firms using Practiq 3+ months)
            </h2>
            <dl className="space-y-5">
              {u.outcomes.map((o) => (
                <div key={o.metric}>
                  <dt className="mb-1 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                    {o.metric}
                  </dt>
                  <dd className="text-sm leading-relaxed text-zinc-200">
                    {o.impact}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Workflow */}
          <section className="mb-10">
            <h2 className="mb-6 text-xl font-bold text-zinc-100">
              Step-by-step workflow
            </h2>
            <ol className="space-y-5">
              {u.workflow.map((step, i) => (
                <li key={i} className="flex items-start gap-4">
                  <span className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-sm font-bold text-emerald-400">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="mb-2 text-base font-bold text-zinc-100">
                      {step.step}
                    </h3>
                    <p className="text-sm leading-relaxed text-zinc-400">
                      {step.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* Ideal fit */}
          <section className="mb-10 rounded-xl border border-zinc-800 bg-[#0a0a0a] p-6">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              Ideal fit
            </p>
            <p className="text-sm leading-relaxed text-zinc-200">
              {u.idealFit}
            </p>
          </section>

          {/* FAQs */}
          <section className="mb-12 border-t border-zinc-800 pt-10">
            <h2 className="mb-8 text-xl font-bold text-zinc-100">
              Frequently Asked
            </h2>
            <dl className="space-y-6">
              {u.faqs.map((f) => (
                <div key={f.q} className="border-b border-zinc-800 pb-6 last:border-0">
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
              Want this workflow running in your firm?
            </h2>
            <p className="mx-auto mb-8 max-w-xl text-sm text-zinc-400">
              First 50 firms to join get Founding Member pricing — 50% off
              for life, priority onboarding, and a direct line to the
              founders.
            </p>
            <Link
              href={`/?utm_source=use-cases&utm_medium=cta&utm_campaign=${u.slug}#cta`}
              className="inline-flex items-center gap-3 rounded-2xl bg-zinc-100 px-10 py-4 text-sm font-bold uppercase tracking-widest text-zinc-950 shadow-lg transition-opacity hover:opacity-90"
            >
              Claim my Founding spot →
            </Link>
          </section>

          {/* Related */}
          <section className="mt-16 border-t border-zinc-800 pt-10">
            <p className="mb-6 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
              Related workflows
            </p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {related.map((x) => (
                <Link
                  key={x.slug}
                  href={`/use-cases/${x.slug}`}
                  className="rounded-xl border border-zinc-800 bg-[#0a0a0a] p-4 transition-colors hover:border-zinc-600"
                >
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    {x.verticalLabel}
                  </p>
                  <p className="text-sm font-bold text-zinc-200">{x.title}</p>
                </Link>
              ))}
            </div>
          </section>
        </article>
      </main>

      <Footer />
    </div>
  );
}
