/**
 * Practiq-vs-competitor view component.
 *
 * Mounted by /vs/[slug]/page.tsx for the four practitioner-pain-mined
 * comparison slugs: iqidis, ai-lawyer, gavel-exec, veraty.
 *
 * Layout differences from the existing two-competitor page:
 *   - Header centers Practiq as one half of the comparison (not a
 *     "third option" footnote).
 *   - Renders verbatim Reddit quotes from r/Lawyertalk, r/legaltech,
 *     r/Accounting etc. with redacted authorship and explicit source
 *     placeholder ("Source: r/legaltech 2025") — never a fabricated URL.
 *   - Comparison table has 5-7 rows with explicit "winner" per row,
 *     color-coded so the verdict is honest (Practiq doesn't win every
 *     factor — when the competitor is better at brief drafting or tax
 *     return automation, we say so).
 *
 * Server Component — no client state, no effects.
 */
import Link from "next/link";
import { ArrowRight, CheckCircle2, Quote, Sparkles } from "lucide-react";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";
import {
  JsonLd,
  breadcrumbJsonLd,
  practiqVsCompetitorJsonLd,
  faqJsonLd,
  SITE_URL,
} from "@/lib/seo/json-ld";
import type { PractiqVsCompetitor } from "@/data/comparisons";

interface Props {
  competitor: PractiqVsCompetitor;
}

export function PractiqVsCompetitorView({ competitor }: Props) {
  const pageUrl = `${SITE_URL}/vs/${competitor.slug}`;
  const headline = `Practiq vs ${competitor.name}`;

  const comparisonLd = practiqVsCompetitorJsonLd({
    competitorName: competitor.name,
    competitorCategory: competitor.category,
    competitorPriceStart: competitor.priceStart,
    competitorTagline: competitor.tagline,
    pageUrl,
    headline,
    description: competitor.metaDescription,
    datePublished: "2026-04-28",
  });

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Comparisons", url: `${SITE_URL}/vs` },
    { name: headline, url: pageUrl },
  ]);

  const faqs = [
    {
      q: `Is Practiq a replacement for ${competitor.name}?`,
      a: `No — they solve different problems. ${competitor.summary}`,
    },
    {
      q: `When should I pick ${competitor.name} over Practiq?`,
      a: competitor.pickThemIf,
    },
    {
      q: `When should I pick Practiq over ${competitor.name}?`,
      a: competitor.pickPractiqIf,
    },
    {
      q: `Can I use Practiq alongside ${competitor.name}?`,
      a: `Yes. The two tools target different layers — ${competitor.name} owns ${competitor.category.toLowerCase()}, Practiq owns the workspace and client memory layer above it. Many small firms run both.`,
    },
  ];

  const faqLd = faqJsonLd(faqs);

  // Lead paragraph — front-loads competitor name + Practiq + 1-sentence
  // verdict. AEO crawlers anchor citations on this paragraph.
  const leadParagraph = `${competitor.name} and Practiq are often evaluated together by ${competitor.vertical === "general" ? "small professional services firms" : `small ${competitor.vertical} firms`} hitting the 30-200 client ceiling. ${competitor.summary}`;

  return (
    <div className="min-h-screen bg-bg-base">
      <Nav />
      <JsonLd data={comparisonLd} />
      <JsonLd data={breadcrumbLd} />
      <JsonLd data={faqLd} />

      <main className="pt-32 pb-16 px-6">
        <article className="max-w-4xl mx-auto">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-4">
            Comparison · {competitor.vertical.toUpperCase()}
          </p>

          <h1 className="text-4xl md:text-5xl font-black text-zinc-100 tracking-tight leading-tight mb-6">
            Practiq vs {competitor.name}
          </h1>

          <p className="text-lg text-zinc-300 leading-relaxed mb-10 max-w-3xl">
            {leadParagraph}
          </p>

          {/* Quick reference table — pricing + category at a glance */}
          <div className="bento-card p-0 mb-12 overflow-hidden">
            <div className="grid grid-cols-3 border-b border-zinc-800">
              <div className="p-5 bg-zinc-900/30">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                  Attribute
                </p>
              </div>
              <div className="p-5 bg-emerald-500/5 border-l border-zinc-800">
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                  Practiq
                </p>
              </div>
              <div className="p-5 border-l border-zinc-800 bg-zinc-900/30">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">
                  {competitor.name}
                </p>
              </div>
            </div>

            {[
              {
                label: "Category",
                a: "Practice Management + AI Workspace",
                b: competitor.category,
              },
              {
                label: "Starting Price",
                a: "$49/mo founding ($99 standard)",
                b: competitor.priceStart,
              },
              {
                label: "Best For",
                a: "2-10 person firms managing 30-200 clients",
                b: competitor.tagline,
              },
            ].map((row, i) => (
              <div
                key={row.label}
                className={`grid grid-cols-3 ${i > 0 ? "border-t border-zinc-800" : ""}`}
              >
                <div className="p-5 text-xs font-bold uppercase tracking-widest text-zinc-400 bg-zinc-900/20">
                  {row.label}
                </div>
                <div className="p-5 border-l border-zinc-800 text-sm text-zinc-300 bg-emerald-500/5">
                  {row.a}
                </div>
                <div className="p-5 border-l border-zinc-800 text-sm text-zinc-300">
                  {row.b}
                </div>
              </div>
            ))}
          </div>

          {/* Practitioner quotes — verbatim from Reddit, redacted authorship.
              We deliberately do NOT fabricate Reddit URLs. Source line is
              "Source: r/{subreddit} {year}" — readers know it's mined
              practitioner language without false specificity. */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-zinc-100 mb-2">
              What practitioners actually say
            </h2>
            <p className="text-sm text-zinc-400 mb-6">
              Verbatim quotes from r/Accounting, r/Lawyertalk, r/legaltech,
              r/LawFirm, r/Bookkeeping. Authorship redacted by convention; we
              don&apos;t fabricate URLs we don&apos;t control.
            </p>
            <div className="space-y-4">
              {competitor.quotes.map((q) => (
                <blockquote
                  key={q.text}
                  className="bento-card p-6 border-l-2 border-emerald-500/40"
                >
                  <Quote
                    className="w-4 h-4 text-emerald-400/60 mb-3"
                    aria-hidden="true"
                  />
                  <p className="text-base text-zinc-200 leading-relaxed mb-4 italic">
                    &ldquo;{q.text}&rdquo;
                  </p>
                  <cite className="text-xs text-zinc-400 not-italic">
                    {q.sourceLabel}
                    {q.month
                      ? ` · ${String(q.month).padStart(2, "0")}/${q.year}`
                      : ""}
                  </cite>
                </blockquote>
              ))}
            </div>
          </div>

          {/* Comparison table — factor-by-factor. Each row marks a winner
              so the page is an honest comparison, not promotional. */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-zinc-100 mb-4">
              Side-by-side: where each tool wins
            </h2>
            <div className="bento-card p-0 overflow-hidden">
              <div className="grid grid-cols-12 border-b border-zinc-800 bg-zinc-900/30">
                <div className="col-span-4 md:col-span-3 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                    Factor
                  </p>
                </div>
                <div className="col-span-4 md:col-span-4 p-4 border-l border-zinc-800 bg-emerald-500/5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                    Practiq
                  </p>
                </div>
                <div className="col-span-4 md:col-span-4 p-4 border-l border-zinc-800">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">
                    {competitor.name}
                  </p>
                </div>
                <div className="hidden md:block col-span-1 p-4 border-l border-zinc-800">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                    Wins
                  </p>
                </div>
              </div>
              {competitor.factors.map((factor) => {
                const practiqWins = factor.winner === "practiq";
                const competitorWins = factor.winner === "competitor";
                return (
                  <div
                    key={factor.label}
                    className="grid grid-cols-12 border-t border-zinc-800"
                  >
                    <div className="col-span-12 md:col-span-3 p-4 text-xs font-bold text-zinc-300 bg-zinc-900/20">
                      {factor.label}
                    </div>
                    <div
                      className={`col-span-6 md:col-span-4 p-4 border-l border-zinc-800 text-sm leading-relaxed ${
                        practiqWins
                          ? "bg-emerald-500/10 text-zinc-100"
                          : "bg-emerald-500/5 text-zinc-300"
                      }`}
                    >
                      {factor.practiq}
                    </div>
                    <div
                      className={`col-span-6 md:col-span-4 p-4 border-l border-zinc-800 text-sm leading-relaxed ${
                        competitorWins ? "bg-zinc-800/50 text-zinc-100" : "text-zinc-300"
                      }`}
                    >
                      {factor.competitor}
                    </div>
                    <div className="hidden md:flex col-span-1 p-4 border-l border-zinc-800 items-center justify-center">
                      {factor.winner === "practiq" && (
                        <span className="text-emerald-400 text-xs font-bold">
                          Practiq
                        </span>
                      )}
                      {factor.winner === "competitor" && (
                        <span className="text-zinc-200 text-xs font-bold">
                          {competitor.name}
                        </span>
                      )}
                      {factor.winner === "tie" && (
                        <span className="text-zinc-400 text-xs">Tie</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* When to pick each */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <div className="bento-card p-6 bg-gradient-to-br from-emerald-500/5 to-transparent border-emerald-500/20">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles
                  className="w-4 h-4 text-emerald-400"
                  aria-hidden="true"
                />
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                  Pick Practiq if…
                </p>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">
                {competitor.pickPractiqIf}
              </p>
            </div>
            <div className="bento-card p-6">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2
                  className="w-4 h-4 text-zinc-400"
                  aria-hidden="true"
                />
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                  Pick {competitor.name} if…
                </p>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">
                {competitor.pickThemIf}
              </p>
            </div>
          </div>

          {/* FAQ — emits FAQPage JSON-LD */}
          <div className="mt-12 pt-10 border-t border-zinc-800">
            <h2 className="text-2xl font-bold text-zinc-100 mb-8">
              Frequently asked
            </h2>
            <div className="space-y-6">
              {faqs.map((f) => (
                <div key={f.q} className="bento-card p-6">
                  <h3 className="text-base font-bold text-zinc-100 mb-3">
                    {f.q}
                  </h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    {f.a}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="mt-16 pt-10 border-t border-zinc-800">
            <div className="bento-card p-10 text-center bg-gradient-to-br from-emerald-500/5 to-transparent">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400 mb-4">
                Founding Member Early Access
              </p>
              <h2 className="text-3xl font-black text-zinc-100 tracking-tight mb-4">
                Still drowning in clients while {competitor.name} solves the wrong layer?
              </h2>
              <p className="text-zinc-400 mb-8 max-w-xl mx-auto">
                Practiq is the workspace + client memory layer that sits above
                tools like {competitor.name}. First 50 firms lock in $49/mo
                Founding Member pricing for life.
              </p>
              <Link
                href={`/?utm_source=vs&utm_medium=cta&utm_campaign=${competitor.slug}#cta`}
                className="btn-premium inline-flex items-center gap-3 py-4 px-10 text-sm"
              >
                Claim My Founding Spot{" "}
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
              <p className="text-xs text-zinc-400 mt-6">
                Already using {competitor.name}?{" "}
                <Link
                  href="/pricing"
                  className="text-emerald-400 hover:text-emerald-300 transition-colors underline"
                >
                  See pricing
                </Link>{" "}
                ·{" "}
                <Link
                  href="/security"
                  className="text-emerald-400 hover:text-emerald-300 transition-colors underline"
                >
                  Security & data isolation
                </Link>
              </p>
            </div>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
