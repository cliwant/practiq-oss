import Link from "next/link";
import { CheckCircle2, FileText, ExternalLink } from "lucide-react";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";
import { WorkflowAuditForm } from "@/components/landing/workflow-audit-form";
import {
  TopicCtaLink,
  TopicPageviewBeacon,
} from "@/components/landing/topic-cta-link";
import {
  JsonLd,
  breadcrumbJsonLd,
  faqJsonLd,
  SITE_URL,
} from "@/lib/seo/json-ld";
import { TOPIC_LANDINGS, type TopicLanding } from "@/data/topic-landings";

/**
 * Shared renderer for the three topic-landing pages
 * (professional-services-ai-evidence-layer, legal-ai-review-workflow,
 * client-context-memory).
 *
 * **This is a Server Component.** It renders the entire static layout
 * (hero, lead, problem teardown, principle, four reusable objects,
 * Practiq context, FAQ, sources, sibling cross-links, bottom CTA, plus
 * the three JSON-LD blocks) server-side, so the markup is present in
 * the initial HTML and curl output — which is what AI crawlers
 * (GPTBot, PerplexityBot, ClaudeBot) and Google's SSR-fetch path
 * actually consume.
 *
 * The page's interactive surfaces are isolated into three Client
 * Components rendered inline as children:
 *
 *  - <TopicPageviewBeacon> — fires the on-mount $pageview event with
 *    landing_slug + SNS attribution params from the URL query string.
 *  - <TopicCtaLink> — hero + bottom "Run the audit" anchor with the
 *    onClick `sns_cta_clicked` beacon. Forwards landing_slug, lane,
 *    topic on navigation.
 *  - <WorkflowAuditForm> — the inline waitlist-style fallback form.
 *
 * This refactor (2026-05-13) fixed a production-only render failure
 * where the previous all-client-component implementation served pages
 * with an empty body shell when client hydration silently failed.
 * Folding the static markup into a Server Component eliminates the
 * "white page on hydration error" failure mode entirely — server-
 * rendered HTML survives regardless of whether the JS bundle hydrates.
 */

interface Props {
  topic: TopicLanding;
}

export function TopicLandingPage({ topic: t }: Props) {
  const canonical = `${SITE_URL}/${t.slug}`;
  const formId = `workflow-audit-${t.slug}`;

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
      <TopicPageviewBeacon
        landingSlug={t.slug}
        landingVariant={t.landingVariant}
      />

      <main id="main" className="pt-32 pb-16 px-6">
        {/* Hero */}
        <section className="max-w-4xl mx-auto text-center mb-16">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-5">
            {t.kicker}
          </p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-zinc-100 tracking-[-0.03em] leading-[1.05] mb-6 text-balance">
            {t.heroTitle}
          </h1>
          <p className="text-lg text-zinc-400 leading-relaxed max-w-2xl mx-auto mb-10">
            {t.heroSubtitle}
          </p>
          <TopicCtaLink
            landingSlug={t.slug}
            ctaType="primary"
            label="Run the audit"
          />
          <p className="mt-4 text-xs text-zinc-400">
            5 minutes. We email you the full report.
          </p>
        </section>

        {/* Lead paragraph */}
        <section className="max-w-3xl mx-auto mb-20">
          <p className="text-base text-zinc-300 leading-relaxed">
            {t.leadParagraph}
          </p>
        </section>

        {/* Problem teardown */}
        <section className="max-w-4xl mx-auto mb-24">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-6 text-center">
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
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-4 text-center">
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
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-3">
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
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-3">
              Where we fit
            </p>
            <p className="text-base text-zinc-300 leading-relaxed">
              {t.practiqContext}
            </p>
            <p className="mt-5 text-sm">
              <a
                href="/demo/workspace"
                className="text-zinc-300 underline decoration-zinc-700 underline-offset-4 hover:text-zinc-100 hover:decoration-zinc-400 transition-colors"
              >
                Or see a sample workspace populated with 50 clients →
              </a>
            </p>
            {t.slug === "legal-ai-review-workflow" && (
              <p className="mt-3 text-sm">
                <Link
                  href="/tools/ai-policy-generator?landing_slug=legal-ai-review-workflow"
                  className="text-zinc-300 underline decoration-zinc-700 underline-offset-4 hover:text-zinc-100 hover:decoration-zinc-400 transition-colors"
                >
                  Generate your firm&apos;s AI policy (ABA Opinion 512) →
                </Link>
              </p>
            )}
          </div>
        </section>

        {/* CTA + form */}
        <section
          id="workflow-audit"
          aria-labelledby="workflow-audit-heading"
          className="max-w-2xl mx-auto mb-24 scroll-mt-24"
        >
          <div className="text-center mb-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-3">
              Workflow audit
            </p>
            <h2
              id="workflow-audit-heading"
              className="text-3xl md:text-4xl font-black text-zinc-100 tracking-[-0.03em] mb-4 text-balance"
            >
              Run the workflow audit.
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
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-6 text-center">
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
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-4 text-center">
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
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-6 text-center">
            Keep reading
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {sib1 && (
              <Link
                href={`/${sib1.slug}`}
                className="bento-card p-5 hover:border-zinc-600 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-600"
              >
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">
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
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">
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
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">
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
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">
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
            <TopicCtaLink
              landingSlug={t.slug}
              ctaType="secondary"
              label="Run the audit"
            />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
