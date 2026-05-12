"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ArrowRight, CheckCircle2, FileText, ExternalLink } from "lucide-react";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";
import { WorkflowAuditForm } from "@/components/landing/workflow-audit-form";
import {
  JsonLd,
  breadcrumbJsonLd,
  faqJsonLd,
  SITE_URL,
} from "@/lib/seo/json-ld";
import { trackClient } from "@/lib/analytics/track-client";
import { TOPIC_LANDINGS, type TopicLanding } from "@/data/topic-landings";

/**
 * Shared renderer for the three topic-landing pages
 * (professional-services-ai-evidence-layer, legal-ai-review-workflow,
 * client-context-memory).
 *
 * Mirrors the structure of BoutiqueVerticalPage so the visual language
 * is consistent (Nav, Footer, hero, lead, "what good looks like", AEO
 * H2 FAQ block, internal links, bottom CTA). Differences:
 *  - the section between hero and FAQ is the four reusable objects
 *    (source / review state / client context / handoff) rather than a
 *    workflow grid,
 *  - bottom block surfaces public sources cited from SNS posts,
 *  - the form posts to /api/early-access with the topic's landing_variant
 *    and a free-text workflow_pain field.
 *
 * Why is this a Client Component? Because the page emits an on-mount
 * $pageview with the landing slug + SNS source params from the query
 * string, and the form needs client-side telemetry. Metadata is still
 * generated server-side via buildTopicMetadata() exported below.
 */

interface Props {
  topic: TopicLanding;
}

export function TopicLandingPage({ topic: t }: Props) {
  const canonical = `${SITE_URL}/${t.slug}`;
  const formId = `workflow-audit-${t.slug}`;

  // Page-view beacon with SNS source attribution stripped from the
  // query string. analytics-provider also fires a generic $pageview,
  // but the topic-page version carries the structured props the
  // operator needs to attribute SNS conversions.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    trackClient({
      type: "$pageview",
      properties: {
        landing_slug: t.slug,
        landing_variant: t.landingVariant,
        source_platform: sp.get("src"),
        source_post_id: sp.get("post"),
        campaign: sp.get("campaign"),
        topic: sp.get("topic") ?? t.slug,
      },
    });
  }, [t.slug, t.landingVariant]);

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: t.kicker.replace(/^For /i, "").trim() || t.metaTitle, url: canonical },
  ]);

  const faqLd = faqJsonLd(t.faqs.map((f) => ({ q: f.question, a: f.answer })));

  // Article JSON-LD — these pages are thesis pages, not product pages,
  // so Article is the right schema. We point isPartOf back to the
  // Organization so the entity graph stays connected.
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${canonical}#article`,
    headline: t.heroTitle,
    description: t.metaDescription,
    abstract: t.leadParagraph,
    url: canonical,
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
    author: { "@type": "Organization", name: "Practiq", url: SITE_URL },
    publisher: { "@id": `${SITE_URL}/#organization` },
    inLanguage: "en-US",
  };

  const sib1 = TOPIC_LANDINGS[t.siblings[0]];
  const sib2 = TOPIC_LANDINGS[t.siblings[1]];

  return (
    <div className="min-h-screen bg-bg-base">
      <Nav />
      <JsonLd data={articleLd} />
      <JsonLd data={breadcrumbLd} />
      <JsonLd data={faqLd} />

      <main id="main" className="pt-32 pb-16 px-6">
        {/* Hero */}
        <section className="max-w-4xl mx-auto text-center mb-16">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-5">
            {t.kicker}
          </p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-zinc-100 tracking-[-0.03em] leading-[1.05] mb-6 text-balance">
            {t.heroTitle}
          </h1>
          <p className="text-lg text-zinc-400 leading-relaxed max-w-2xl mx-auto mb-10">
            {t.heroSubtitle}
          </p>
          <a
            href="#workflow-audit"
            onClick={() => {
              trackClient({
                type: "pricing_cta_clicked",
                properties: {
                  landing_slug: t.slug,
                  cta_type: "secondary",
                },
              });
            }}
            className="btn-premium inline-flex items-center gap-2 py-4 px-8 text-sm"
          >
            {t.ctaLabel}
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </a>
        </section>

        {/* Lead paragraph */}
        <section className="max-w-3xl mx-auto mb-20">
          <p className="text-base text-zinc-300 leading-relaxed">
            {t.leadParagraph}
          </p>
        </section>

        {/* Problem teardown */}
        <section className="max-w-4xl mx-auto mb-24">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-6 text-center">
            The shape of the problem
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {t.painBullets.map((p) => (
              <div key={p.title} className="bento-card p-7">
                <h2 className="text-lg font-bold text-zinc-100 leading-snug mb-3 tracking-[-0.01em]">
                  {p.title}
                </h2>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  {p.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* AI workflow principle */}
        <section className="max-w-3xl mx-auto mb-24">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-4 text-center">
            The principle
          </p>
          <h2 className="text-3xl md:text-4xl font-black text-zinc-100 tracking-[-0.03em] mb-6 text-center text-balance">
            What the AI workflow has to preserve.
          </h2>
          <p className="text-base text-zinc-300 leading-relaxed">
            {t.workflowPrinciple}
          </p>
        </section>

        {/* Reusable objects (source / review state / client context / handoff) */}
        <section className="max-w-5xl mx-auto mb-24">
          <div className="text-center mb-12">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-3">
              Four objects to preserve
            </p>
            <h2 className="text-3xl md:text-4xl font-black text-zinc-100 tracking-[-0.03em] mb-4">
              {t.reusableObjectsHeading}.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {t.reusableObjects.map((o) => (
              <div key={o.name} className="bento-card p-7">
                <div className="flex items-start gap-3 mb-3">
                  <CheckCircle2
                    className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <h3 className="text-lg font-bold text-zinc-100 leading-snug">
                    {o.name}
                  </h3>
                </div>
                <p className="text-sm text-zinc-400 leading-relaxed pl-8">
                  {o.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Soft Practiq context */}
        <section className="max-w-3xl mx-auto mb-24">
          <div className="glass-panel p-8 md:p-10">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-3">
              Where we fit
            </p>
            <p className="text-base text-zinc-300 leading-relaxed">
              {t.practiqContext}
            </p>
          </div>
        </section>

        {/* CTA + form */}
        <section
          id="workflow-audit"
          aria-labelledby="workflow-audit-heading"
          className="max-w-2xl mx-auto mb-24 scroll-mt-24"
        >
          <div className="text-center mb-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-3">
              Workflow audit
            </p>
            <h2
              id="workflow-audit-heading"
              className="text-3xl md:text-4xl font-black text-zinc-100 tracking-[-0.03em] mb-4 text-balance"
            >
              {t.ctaLabel}.
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed max-w-lg mx-auto">
              {t.formIntro}
            </p>
          </div>
          <div className="bento-card p-7 md:p-10">
            <WorkflowAuditForm
              formId={formId}
              landingVariant={t.landingVariant}
              submitLabel={t.ctaLabel}
            />
          </div>
        </section>

        {/* AEO FAQ */}
        <section className="max-w-3xl mx-auto mb-24">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-6 text-center">
            Frequently asked
          </p>
          <div className="flex flex-col gap-8">
            {t.faqs.map((f) => (
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

        {/* Sources */}
        <section className="max-w-3xl mx-auto mb-24">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-4 text-center">
            Sources
          </p>
          <ul className="flex flex-col gap-3" aria-label="External sources">
            {t.sources.map((s) => (
              <li key={s.url}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-3 rounded-xl border border-zinc-800 bg-[#0a0a0a] p-4 hover:border-zinc-600 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-600"
                >
                  <FileText
                    className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5 group-hover:text-zinc-300 transition-colors"
                    aria-hidden="true"
                  />
                  <span className="flex-1 text-sm text-zinc-300 leading-snug">
                    {s.label}
                  </span>
                  <ExternalLink
                    className="w-4 h-4 text-zinc-600 shrink-0 mt-0.5 group-hover:text-zinc-400 transition-colors"
                    aria-hidden="true"
                  />
                </a>
              </li>
            ))}
          </ul>
        </section>

        {/* Internal cross-links */}
        <section className="max-w-5xl mx-auto mb-24">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-6 text-center">
            Keep reading
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {sib1 && (
              <Link
                href={`/${sib1.slug}`}
                className="bento-card p-5 hover:border-zinc-600 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-600"
              >
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
                  Topic
                </p>
                <p className="text-sm font-bold text-zinc-200 leading-snug">
                  {sib1.metaTitle.replace(" — Practiq", "")}
                </p>
              </Link>
            )}
            {sib2 && (
              <Link
                href={`/${sib2.slug}`}
                className="bento-card p-5 hover:border-zinc-600 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-600"
              >
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
                  Topic
                </p>
                <p className="text-sm font-bold text-zinc-200 leading-snug">
                  {sib2.metaTitle.replace(" — Practiq", "")}
                </p>
              </Link>
            )}
            <Link
              href="/pricing"
              className="bento-card p-5 hover:border-zinc-600 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-600"
            >
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
                Pricing
              </p>
              <p className="text-sm font-bold text-zinc-200">
                $15/client/month at launch
              </p>
            </Link>
            <Link
              href="/for/cpa-firms"
              className="bento-card p-5 hover:border-zinc-600 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-600"
            >
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
                For
              </p>
              <p className="text-sm font-bold text-zinc-200">
                Boutique CPA firms
              </p>
            </Link>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="max-w-3xl mx-auto">
          <div className="glass-panel p-10 md:p-14 text-center">
            <h2 className="text-2xl md:text-3xl font-black text-zinc-100 tracking-[-0.03em] mb-4 text-balance">
              Built for boutique professional services firms.
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed max-w-xl mx-auto mb-8">
              Pre-launch and looking for the first design partners in the
              50–200 client range. $15/client/month at launch. No annual
              contract.
            </p>
            <a
              href="#workflow-audit"
              onClick={() => {
                trackClient({
                  type: "pricing_cta_clicked",
                  properties: {
                    landing_slug: t.slug,
                    cta_type: "secondary",
                  },
                });
              }}
              className="btn-premium inline-flex items-center gap-2 py-4 px-8 text-sm"
            >
              {t.ctaLabel}
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
