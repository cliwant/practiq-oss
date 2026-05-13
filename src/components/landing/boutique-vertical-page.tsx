import Link from "next/link";
import { ArrowRight, Quote, CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";
import {
  JsonLd,
  breadcrumbJsonLd,
  faqJsonLd,
  SITE_URL,
} from "@/lib/seo/json-ld";
import {
  BOUTIQUE_VERTICALS,
  type BoutiqueVertical,
} from "@/data/boutique-verticals";

/**
 * Shared renderer for the five Tier-3.2 vertical landing pages.
 *
 * Each page is a thin wrapper that imports its slug's config and calls
 * this component. Keeping the markup in one place ensures every page
 * ships the same JSON-LD, AEO H2 structure, and CTA — and one fix
 * lands across all five.
 */

export function buildVerticalMetadata(slug: string): Metadata {
  const v = BOUTIQUE_VERTICALS[slug];
  if (!v) return {};
  const canonical = `${SITE_URL}/for/${v.slug}`;
  return {
    title: v.metaTitle,
    description: v.metaDescription,
    keywords: v.keywords,
    alternates: { canonical },
    openGraph: {
      title: v.metaTitle,
      description: v.metaDescription,
      type: "website",
      url: canonical,
      siteName: "Practiq",
    },
    twitter: {
      card: "summary_large_image",
      title: v.metaTitle,
      description: v.metaDescription,
    },
  };
}

interface Props {
  vertical: BoutiqueVertical;
}

export function BoutiqueVerticalPage({ vertical: v }: Props) {
  const canonical = `${SITE_URL}/for/${v.slug}`;
  const signupHref = `/signup?utm_source=${v.utmSource}`;

  // FAQPage JSON-LD — answers must exactly match the rendered text below.
  const faqLd = faqJsonLd(v.faqs.map((f) => ({ q: f.question, a: f.answer })));

  // Product JSON-LD scoped to this vertical landing page. We use a fresh
  // Product node (not the global SoftwareApplication) so each /for/{slug}
  // is its own AEO-discoverable Product surface targeting the vertical's
  // search intent. The Product references the global SoftwareApplication
  // via isVariantOf so the entity graph stays connected.
  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${canonical}#product`,
    name: `Practiq for ${v.label}`,
    description: v.metaDescription,
    url: canonical,
    category: "Business Software",
    brand: { "@id": `${SITE_URL}/#organization` },
    isVariantOf: { "@id": `${SITE_URL}/#software` },
    audience: {
      "@type": "BusinessAudience",
      audienceType: v.label,
    },
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/pricing`,
      priceCurrency: "USD",
      price: "49.00",
      availability: "https://schema.org/PreOrder",
    },
  };

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "For", url: `${SITE_URL}/for` },
    { name: v.label, url: canonical },
  ]);

  const sib1 = BOUTIQUE_VERTICALS[v.siblings[0]];
  const sib2 = BOUTIQUE_VERTICALS[v.siblings[1]];

  return (
    <div className="min-h-screen bg-bg-base">
      <Nav />
      <JsonLd data={productLd} />
      <JsonLd data={breadcrumbLd} />
      <JsonLd data={faqLd} />

      <main className="pt-32 pb-16 px-6">
        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="max-w-4xl mx-auto text-center mb-16">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-5">
            {v.kicker}
          </p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-zinc-100 tracking-[-0.03em] leading-[1.05] mb-6 text-balance">
            {v.heroTitle}
          </h1>
          <p className="text-lg text-zinc-400 leading-relaxed max-w-2xl mx-auto mb-10">
            {v.heroSubtitle}
          </p>
          <Link
            href={signupHref}
            className="btn-premium inline-flex items-center gap-2 py-4 px-8 text-sm"
          >
            Start free 14-day trial
            <ArrowRight className="w-4 h-4" />
          </Link>
        </section>

        {/* ── Lead paragraph (AEO first-paragraph accountability) ── */}
        <section className="max-w-3xl mx-auto mb-20">
          <p className="text-base text-zinc-300 leading-relaxed">
            {v.leadParagraph}
          </p>
        </section>

        {/* ── Reddit verbatim quotes (vertical pain) ─────────────── */}
        <section className="max-w-4xl mx-auto mb-24">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-6 text-center">
            What practitioners actually say
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {v.painQuotes.map((q) => (
              <figure key={q.quote} className="bento-card p-7">
                <Quote
                  className="w-5 h-5 text-zinc-600 mb-4"
                  aria-hidden="true"
                />
                <blockquote className="text-base text-zinc-200 leading-relaxed mb-5">
                  &ldquo;{q.quote}&rdquo;
                </blockquote>
                <figcaption className="text-xs text-zinc-400">
                  — {q.persona},{" "}
                  <cite className="not-italic font-medium text-zinc-400">
                    {q.subreddit}
                  </cite>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* ── Practiq workflows for this vertical ────────────────── */}
        <section className="max-w-5xl mx-auto mb-24">
          <div className="text-center mb-12">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-3">
              Practiq workflows
            </p>
            <h2 className="text-3xl md:text-4xl font-black text-zinc-100 tracking-[-0.03em] mb-4">
              What the agent does for a {v.singular}.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {v.workflows.map((w) => (
              <div key={w.title} className="bento-card p-7">
                <div className="flex items-start gap-3 mb-3">
                  <CheckCircle2
                    className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <h3 className="text-lg font-bold text-zinc-100 leading-snug">
                    {w.title}
                  </h3>
                </div>
                <p className="text-sm text-zinc-400 leading-relaxed pl-8">
                  {w.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Question-style H2s for AEO ─────────────────────────── */}
        <section className="max-w-3xl mx-auto mb-24">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-6 text-center">
            Frequently asked
          </p>
          <div className="flex flex-col gap-8">
            {v.faqs.map((f) => (
              <article key={f.question}>
                <h2 className="text-xl md:text-2xl font-bold text-zinc-100 tracking-[-0.02em] mb-3 leading-snug">
                  {f.question}
                </h2>
                <p className="text-base text-zinc-400 leading-relaxed">
                  {f.answer}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* ── Internal links: pricing, mike compare, siblings ──── */}
        <section className="max-w-5xl mx-auto mb-24">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-6 text-center">
            Keep reading
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link
              href="/pricing"
              className="bento-card p-5 hover:border-zinc-600 transition-colors"
            >
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">
                Pricing
              </p>
              <p className="text-sm font-bold text-zinc-200">
                What does Practiq cost
              </p>
            </Link>
            <Link
              href="/compare/mike"
              className="bento-card p-5 hover:border-zinc-600 transition-colors"
            >
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">
                Compare
              </p>
              <p className="text-sm font-bold text-zinc-200">
                Mike vs Practiq
              </p>
            </Link>
            {sib1 && (
              <Link
                href={`/for/${sib1.slug}`}
                className="bento-card p-5 hover:border-zinc-600 transition-colors"
              >
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">
                  For
                </p>
                <p className="text-sm font-bold text-zinc-200">{sib1.label}</p>
              </Link>
            )}
            {sib2 && (
              <Link
                href={`/for/${sib2.slug}`}
                className="bento-card p-5 hover:border-zinc-600 transition-colors"
              >
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">
                  For
                </p>
                <p className="text-sm font-bold text-zinc-200">{sib2.label}</p>
              </Link>
            )}
          </div>
        </section>

        {/* ── Bottom CTA ─────────────────────────────────────────── */}
        <section className="max-w-3xl mx-auto">
          <div className="glass-panel p-10 md:p-14 text-center">
            <h2 className="text-2xl md:text-3xl font-black text-zinc-100 tracking-[-0.03em] mb-4 text-balance">
              Built for boutique professional services firms.
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed max-w-xl mx-auto mb-8">
              Practiq is the AI-Native agent workspace for 2–20 person firms
              with 50–200 clients. Free 14-day trial. No annual contract.
            </p>
            <Link
              href={signupHref}
              className="btn-premium inline-flex items-center gap-2 py-4 px-8 text-sm"
            >
              Start free 14-day trial
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
