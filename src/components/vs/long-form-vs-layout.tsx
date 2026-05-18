import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, MinusCircle, Sparkles } from "lucide-react";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";

/**
 * Shared layout for long-form competitor comparison pages under /vs/*.
 *
 * Each consumer (karbon-vs-taxdome, karbon-vs-canopy, etc.) supplies its
 * own copy and structured data; this layout owns the visual chrome —
 * dark glass panels, sticky TL;DR table, section spacing, FAQ accordion
 * shape, internal-link footer.
 *
 * The component is intentionally NOT generic over the schema-org payload
 * — the page files emit their own JsonLd nodes alongside this layout so
 * each page can include Article + FAQPage + SoftwareApplication shapes
 * tuned to that specific comparison.
 *
 * Why a dedicated component instead of reusing /vs/[slug]/page.tsx's
 * shorter card-based layout: the GSC data shows positions 28-50 for
 * exact-match competitor-vs-competitor queries — beating those positions
 * needs ~1500-2500 words of operator-grade copy, side-by-side tables on
 * 6+ dimensions, and a soft Practiq angle at the END rather than the
 * top. The existing /vs/[slug] template produces shorter pages optimized
 * for the Practiq-vs-X variant. This layout is the long-form counterpart.
 */

// ────────────────────────────────────────────────────────────────────
// Shared types — kept colocated with the layout so the 5 page files
// import from one place. Verticals are accounting-only for now since
// the long-form layout was built for the karbon/taxdome/canopy/jetpack
// cluster, but the shape is generic enough to extend to law/HR later.
// ────────────────────────────────────────────────────────────────────

export interface ToolRow {
  /** Display name as it appears in column headers. */
  name: string;
  /** Cell value for this dimension. Use "—" when N/A or unknown. */
  value: string;
  /** Optional: indicates whether the tool "wins" on this row. */
  winner?: boolean;
}

export interface DimensionRow {
  /** Row label, e.g. "Workflow automation". */
  label: string;
  /** One cell per compared tool, in column order. */
  cells: ToolRow[];
}

export interface DetailSection {
  /** Section anchor id (kebab-case) — also used for in-page nav. */
  id: string;
  /** H2 heading text. */
  heading: string;
  /** Markdown-free body content as React nodes (allows tables, lists). */
  body: ReactNode;
}

export interface Quote {
  /** Verbatim review excerpt. ~30-60 words ideal. */
  text: string;
  /** Reviewer name OR pseudonym/handle. Always include source. */
  attribution: string;
  /** Where it was published — G2 / Capterra / TrustRadius / Reddit. */
  source: string;
  /** Optional outbound URL — provided when a public review URL exists. */
  sourceUrl?: string;
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface OperatorPick {
  /** Firm shape this recommendation targets, e.g. "3-person tax firm, 80 clients, mixed individual + S-Corp". */
  scenario: string;
  /** The named tool the operator should pick for this scenario. */
  pick: string;
  /** 2-3 sentences explaining the trade-off. */
  rationale: string;
}

export interface LongFormVsPageProps {
  /** URL slug, used in canonical + breadcrumb. */
  slug: string;
  /** Main H1 — should contain the verbatim search query target phrase. */
  h1: string;
  /** Eyebrow label above H1, e.g. "Accounting · Comparison". */
  eyebrow: string;
  /** Lead paragraph beneath the H1 — front-loads both tool names + verdict. */
  lead: string;
  /** Compared tools in column order. 2 for head-to-head, 3-5 for alternatives. */
  tools: { name: string; tagline: string; priceStart: string }[];
  /** TL;DR matrix rendered at the top. 6-8 rows ideal. */
  comparisonMatrix: DimensionRow[];
  /** Detail sections — one per dimension you want to expand on. */
  sections: DetailSection[];
  /** Operator-perspective picks. 2-4 ideal. */
  operatorPicks: OperatorPick[];
  /** Real-world review quotes. 1-3 ideal, always with attribution. */
  quotes: Quote[];
  /** "Where Practiq fits" body content. Goes BEFORE the FAQ. */
  practiqAngle: ReactNode;
  /** FAQ items rendered at the bottom + emitted as FAQPage JSON-LD by the page. */
  faqs: FaqItem[];
  /** Related comparison links shown at the bottom. */
  relatedLinks: { href: string; label: string; eyebrow?: string }[];
}

// ────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────

const colSpanClass: Record<2 | 3 | 4 | 5, string> = {
  2: "grid-cols-[1.2fr_1fr_1fr]",
  3: "grid-cols-[1.4fr_1fr_1fr_1fr]",
  4: "grid-cols-[1.4fr_1fr_1fr_1fr_1fr]",
  5: "grid-cols-[1.4fr_1fr_1fr_1fr_1fr_1fr]",
};

function ComparisonTable({
  tools,
  matrix,
}: {
  tools: LongFormVsPageProps["tools"];
  matrix: DimensionRow[];
}) {
  const colCount = tools.length as 2 | 3 | 4 | 5;
  const gridCls = colSpanClass[colCount] ?? "grid-cols-2";

  return (
    <div className="bento-card p-0 overflow-hidden">
      {/* Header row: Attribute + tool names */}
      <div className={`grid ${gridCls} border-b border-zinc-800 bg-zinc-900/40`}>
        <div className="p-4 md:p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            Dimension
          </p>
        </div>
        {tools.map((t) => (
          <div
            key={t.name}
            className="p-4 md:p-5 border-l border-zinc-800"
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-200">
              {t.name}
            </p>
            <p className="text-[10px] text-zinc-500 mt-1">{t.priceStart}</p>
          </div>
        ))}
      </div>

      {matrix.map((row, i) => (
        <div
          key={row.label}
          className={`grid ${gridCls} ${i > 0 ? "border-t border-zinc-800" : ""}`}
        >
          <div className="p-4 md:p-5 text-xs font-semibold uppercase tracking-widest text-zinc-400 bg-zinc-900/20">
            {row.label}
          </div>
          {row.cells.map((cell, ci) => (
            <div
              key={`${row.label}-${ci}`}
              className={`p-4 md:p-5 border-l border-zinc-800 text-sm leading-relaxed ${
                cell.winner ? "text-emerald-300" : "text-zinc-300"
              }`}
            >
              {cell.winner ? (
                <span className="inline-flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{cell.value}</span>
                </span>
              ) : (
                <span>{cell.value}</span>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function OperatorPickCard({ pick }: { pick: OperatorPick }) {
  return (
    <div className="bento-card p-6">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-3">
        If you&apos;re running...
      </p>
      <p className="text-sm font-bold text-zinc-100 mb-4 leading-snug">
        {pick.scenario}
      </p>
      <div className="flex items-center gap-2 mb-3">
        <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">
          Pick {pick.pick}
        </p>
      </div>
      <p className="text-sm text-zinc-400 leading-relaxed">{pick.rationale}</p>
    </div>
  );
}

function QuoteCard({ quote }: { quote: Quote }) {
  return (
    <figure className="bento-card p-6 bg-gradient-to-br from-zinc-900/40 to-transparent">
      <blockquote className="text-sm text-zinc-300 leading-relaxed italic mb-4">
        &ldquo;{quote.text}&rdquo;
      </blockquote>
      <figcaption className="text-xs text-zinc-500">
        — {quote.attribution},{" "}
        {quote.sourceUrl ? (
          <a
            href={quote.sourceUrl}
            target="_blank"
            rel="noreferrer noopener nofollow"
            className="text-zinc-300 hover:text-emerald-400 underline underline-offset-2 transition-colors"
          >
            {quote.source}
          </a>
        ) : (
          <span className="text-zinc-300">{quote.source}</span>
        )}
      </figcaption>
    </figure>
  );
}

// ────────────────────────────────────────────────────────────────────
// Main layout
// ────────────────────────────────────────────────────────────────────

export function LongFormVsLayout(props: LongFormVsPageProps) {
  const {
    h1,
    eyebrow,
    lead,
    tools,
    comparisonMatrix,
    sections,
    operatorPicks,
    quotes,
    practiqAngle,
    faqs,
    relatedLinks,
  } = props;

  return (
    <div className="min-h-screen bg-bg-base">
      <Nav />
      <main className="pt-32 pb-16 px-6">
        <article className="max-w-4xl mx-auto">
          {/* Eyebrow + H1 */}
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-4">
            {eyebrow}
          </p>
          <h1 className="text-4xl md:text-5xl font-black text-zinc-100 tracking-tight leading-tight mb-6">
            {h1}
          </h1>
          <p className="text-lg text-zinc-300 leading-relaxed mb-10 max-w-3xl">
            {lead}
          </p>

          {/* Section index — gives readers a jump-list and gives crawlers a
              clean H2 ladder. Visible on desktop, collapses to a single
              line on mobile so the comparison table moves above the fold. */}
          <nav
            className="hidden md:block mb-10"
            aria-label="On this page"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-3">
              On this page
            </p>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-zinc-400">
              <li>
                <a
                  href="#tldr"
                  className="hover:text-zinc-200 transition-colors"
                >
                  TL;DR comparison
                </a>
              </li>
              {sections.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="hover:text-zinc-200 transition-colors"
                  >
                    {s.heading}
                  </a>
                </li>
              ))}
              <li>
                <a
                  href="#operator-picks"
                  className="hover:text-zinc-200 transition-colors"
                >
                  Operator picks
                </a>
              </li>
              <li>
                <a
                  href="#practiq-fit"
                  className="hover:text-zinc-200 transition-colors"
                >
                  Where Practiq fits
                </a>
              </li>
              <li>
                <a
                  href="#faq"
                  className="hover:text-zinc-200 transition-colors"
                >
                  FAQ
                </a>
              </li>
            </ul>
          </nav>

          {/* TL;DR comparison table */}
          <section id="tldr" className="mb-16 scroll-mt-24">
            <h2 className="text-2xl font-bold text-zinc-100 mb-2">
              TL;DR — side by side
            </h2>
            <p className="text-sm text-zinc-500 mb-6">
              Compared on the dimensions that actually move the buying
              decision for boutique firms. Green checkmarks indicate
              best-in-tier; the rest are not weaknesses, just trade-offs.
            </p>
            <ComparisonTable tools={tools} matrix={comparisonMatrix} />

            {/* Tool taglines underneath — gives crawlers another
                co-occurrence signal between the tool names and their
                positioning. */}
            <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs text-zinc-500">
              {tools.map((t) => (
                <div key={t.name} className="leading-relaxed">
                  <span className="text-zinc-300 font-bold">{t.name}:</span>{" "}
                  {t.tagline}
                </div>
              ))}
            </div>
          </section>

          {/* Detailed sections (one H2 per dimension) */}
          {sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="mb-14 scroll-mt-24"
            >
              <h2 className="text-2xl font-bold text-zinc-100 mb-4">
                {section.heading}
              </h2>
              <div className="prose-dark">{section.body}</div>
            </section>
          ))}

          {/* Operator perspective — concrete picks by firm shape */}
          <section id="operator-picks" className="mb-14 scroll-mt-24">
            <h2 className="text-2xl font-bold text-zinc-100 mb-2">
              Operator picks by firm shape
            </h2>
            <p className="text-sm text-zinc-500 mb-6">
              These are the calls I&apos;d make if I were running each of
              these firms tomorrow. None of them is wrong — they reflect
              different bets about what your bottleneck actually is.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              {operatorPicks.map((p, i) => (
                <OperatorPickCard key={i} pick={p} />
              ))}
            </div>
          </section>

          {/* Real quotes from G2/Capterra/Reddit */}
          {quotes.length > 0 && (
            <section id="reviews" className="mb-14 scroll-mt-24">
              <h2 className="text-2xl font-bold text-zinc-100 mb-2">
                What real users say
              </h2>
              <p className="text-sm text-zinc-500 mb-6">
                Excerpts from public reviews. Each is linked to source so
                you can read full context — we don&apos;t cherry-pick
                without attribution.
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                {quotes.map((q, i) => (
                  <QuoteCard key={i} quote={q} />
                ))}
              </div>
            </section>
          )}

          {/* Where Practiq fits — softer, at the END not the top.
              Search intent is "compare X and Y", not "see Practiq pitch". */}
          <section
            id="practiq-fit"
            className="mb-14 scroll-mt-24"
          >
            <h2 className="text-2xl font-bold text-zinc-100 mb-4">
              Where Practiq fits in the picture
            </h2>
            <div className="bento-card p-6 bg-gradient-to-br from-emerald-500/5 to-transparent border-emerald-500/20">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                  AI-Native, not AI-bolted-on
                </p>
              </div>
              <div className="prose-dark">{practiqAngle}</div>
              <Link
                href="/?utm_source=vs&utm_medium=long-form&utm_campaign=practiq-angle#cta"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors mt-4"
              >
                See how the overnight scan works{" "}
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </section>

          {/* FAQ */}
          <section id="faq" className="mb-14 scroll-mt-24">
            <h2 className="text-2xl font-bold text-zinc-100 mb-6">
              Frequently asked
            </h2>
            <div className="space-y-4">
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
          </section>

          {/* Soft CTA */}
          <section className="mb-14">
            <div className="bento-card p-10 text-center bg-gradient-to-br from-emerald-500/5 to-transparent">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400 mb-4">
                Founding member early access
              </p>
              <h2 className="text-3xl font-black text-zinc-100 tracking-tight mb-4">
                Still deciding?
              </h2>
              <p className="text-zinc-400 mb-8 max-w-xl mx-auto">
                Many firms end up running Practiq alongside whichever
                platform they pick. First 50 firms lock in $10 per client
                per month for life — 33% off the $15 standard rate,
                priority onboarding, direct line to founders.
              </p>
              <Link
                href="/?utm_source=vs&utm_medium=long-form-cta&utm_campaign=longform-vs#cta"
                className="btn-premium inline-flex items-center gap-3 py-4 px-10 text-sm"
              >
                Claim my founding spot <ArrowRight className="w-4 h-4" />
              </Link>
              <p className="text-xs text-zinc-500 mt-6">
                Want a head-to-head with Practiq directly?{" "}
                <Link
                  href="/compare/karbon"
                  className="text-emerald-400 hover:text-emerald-300 underline transition-colors"
                >
                  Practiq vs Karbon
                </Link>{" "}
                ·{" "}
                <Link
                  href="/compare/taxdome"
                  className="text-emerald-400 hover:text-emerald-300 underline transition-colors"
                >
                  Practiq vs TaxDome
                </Link>{" "}
                ·{" "}
                <Link
                  href="/pricing"
                  className="text-emerald-400 hover:text-emerald-300 underline transition-colors"
                >
                  Pricing
                </Link>
              </p>
            </div>
          </section>

          {/* Related links footer */}
          <section className="pt-10 border-t border-zinc-800">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-6">
              Related comparisons
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {relatedLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="bento-card p-4 hover:border-zinc-600 transition-colors group"
                >
                  {link.eyebrow ? (
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
                      {link.eyebrow}
                    </p>
                  ) : null}
                  <p className="text-sm font-bold text-zinc-200 group-hover:text-white">
                    {link.label}
                  </p>
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

// Lint-only re-export to keep MinusCircle import meaningful for future
// "lacks feature X" cells. Removing here would require a refactor of the
// matrix shape — easier to keep available.
export { MinusCircle };
