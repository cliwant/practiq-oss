/**
 * InlineFaq — drop-in question/answer block with FAQPage JSON-LD.
 *
 * Used by persona/feature pages to bake AEO question coverage straight
 * into the body of the page. Each item renders as an H3 + 40–60 word
 * answer paragraph, plus a single `<script type="application/ld+json">`
 * exposing the items as `FAQPage > mainEntity > Question[]` for
 * Google rich results, ChatGPT, and Perplexity citations.
 *
 * Server Component — no client state, no effects. Drop it into any
 * page section under the "FAQ" heading you already have, OR import it
 * standalone with its own kicker. Both modes are supported.
 *
 * The wording style across pages should mirror Reddit-mined practitioner
 * vocabulary — "drowning in clients", "context switching", "external
 * memory". Avoid SaaS marketing voice; the AEO crawlers prefer the
 * pattern that real practitioners use to ask the same question.
 */
import { JsonLd, faqJsonLd } from "@/lib/seo/json-ld";

export interface InlineFaqItem {
  q: string;
  a: string;
}

interface InlineFaqProps {
  /** Page-relative URL (used only to disambiguate JSON-LD per page). */
  pageUrl: string;
  items: InlineFaqItem[];
  /** Optional eyebrow above the heading. Defaults to FAQ kicker. */
  kicker?: string;
  /** Optional H2 — defaults to "Frequently asked, by practitioners". */
  heading?: string;
  /**
   * Whether to render the surrounding section/heading scaffolding.
   * Set false when embedding into a page that already provides them.
   * Default: true.
   */
  withChrome?: boolean;
}

export function InlineFaq({
  pageUrl,
  items,
  kicker = "FAQ",
  heading = "Frequently asked, by practitioners",
  withChrome = true,
}: InlineFaqProps) {
  // FAQPage schema — single block per page is the convention. Multiple
  // InlineFaq instances on one page would emit duplicate FAQPage objects,
  // which dilutes the rich-results signal — render one per page.
  const ld = faqJsonLd(items);

  const list = (
    <div className="space-y-6">
      {items.map((item) => (
        <div
          key={item.q}
          className="rounded-xl border border-zinc-800 bg-[#0a0a0a] p-6 transition-colors hover:border-zinc-700"
        >
          <h3 className="mb-3 text-base font-bold text-zinc-100">{item.q}</h3>
          <p className="text-sm leading-relaxed text-zinc-400">{item.a}</p>
        </div>
      ))}
    </div>
  );

  if (!withChrome) {
    return (
      <>
        <JsonLd data={ld} />
        {list}
      </>
    );
  }

  return (
    <section className="border-t border-zinc-800 px-6 py-20" data-faq-url={pageUrl}>
      <JsonLd data={ld} />
      <div className="mx-auto max-w-3xl">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
          {kicker}
        </p>
        <h2 className="mb-10 text-3xl font-extrabold tracking-[-0.03em] text-zinc-100 sm:text-4xl">
          {heading}
        </h2>
        {list}
      </div>
    </section>
  );
}
