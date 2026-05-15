/**
 * Shared JSON-LD helpers for AEO/GEO/SEO across Practiq pages.
 *
 * Each helper returns a plain JSON object (Record<string, unknown>) so callers
 * compose freely. The JsonLd component below is the inline `<script>` boundary
 * — that's the only place we cast for `dangerouslySetInnerHTML`.
 *
 * Why factor this out: every dynamic route page (vs/, compare/, alternatives/,
 * use-cases/, blog/) and the static marketing pages all need consistent
 * Organization + Breadcrumb + Article schemas. Drift across pages dilutes the
 * knowledge graph signal LLM crawlers and Google's rich-results panel use.
 */
import type { BlogPost } from "@/data/blog/types";
import type { Competitor } from "@/data/compare/competitors";
import type { VsPair } from "@/data/vs/pairs";

export const SITE_URL = "https://practiq.dev";

// ────────────────────────────────────────────────────────────────────────
// JsonLd component — inline `<script type="application/ld+json">` writer.
// Single boundary for the `dangerouslySetInnerHTML` cast so no caller has
// to do it themselves. Callers pass any plain object; we serialize once.
// ────────────────────────────────────────────────────────────────────────
export function JsonLd({ data }: { data: Record<string, unknown> | unknown }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify is intentional — template-literal payloads with raw
      // braces will break Next.js's HTML serialization. Don't change to
      // backtick interpolation.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// ────────────────────────────────────────────────────────────────────────
// Organization — the canonical Practiq entity.
//
// Google's knowledge-panel pipeline requires BOTH `address` and
// `contactPoint` to populate. schema.org technically allows either alone,
// but we want the panel to fully populate so we provide both. Founder is
// included as a referenceable Person for "who founded Practiq" queries.
// `sameAs` is reserved for verified social profiles only — fabricating
// a LinkedIn URL we don't control would actively hurt the entity graph.
// ────────────────────────────────────────────────────────────────────────
// ────────────────────────────────────────────────────────────────────────
// Person — the founder Seungdo Keum.
//
// Cross-platform entity authority is what AI search engines (ChatGPT,
// Perplexity, Google AI Overview) use to disambiguate "who is X" and
// "what does Practiq founder say about Y". Without a stable Person
// entity, every blog post collapses author→Organization, the article
// never accumulates author-level credibility, and the founder's
// quotes can't be attributed back to a specific URL.
//
// This entity is rendered ONCE on /about (with `@id` pointing at the
// section anchor #seungdo-keum) and referenced by `@id` everywhere
// else: organizationJsonLd().founder, articleJsonLd().author when the
// author is the founder, etc.
//
// `sameAs` SHOULD be expanded as the founder's verified profiles come
// online (LinkedIn, X, GitHub, personal site). We deliberately list
// only what we can verify — fabricated handles hurt more than help.
// ────────────────────────────────────────────────────────────────────────
export function personFounderJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${SITE_URL}/about#seungdo-keum`,
    name: "Seungdo Keum",
    givenName: "Seungdo",
    familyName: "Keum",
    alternateName: "SD Keum",
    jobTitle: "Founder",
    worksFor: { "@id": `${SITE_URL}/#organization` },
    url: `${SITE_URL}/about`,
    knowsAbout: [
      "AI-Native software architecture",
      "Memory systems for LLM agents",
      "Boutique professional services workflows",
      "Multi-tenant SaaS",
      "Approval-queue UX",
    ],
    description:
      "Founder of Practiq. Builds AI-Native workspaces for boutique professional services firms (CPAs, lawyers, HR advisors) that hit the 50-client per-partner ceiling.",
    // sameAs intentionally limited to verifiable URLs only. Expand as
    // public profiles are launched and ownership is provable.
    sameAs: [],
  };
}

export function organizationJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: "Practiq",
    alternateName: "Cliwant, Inc.",
    url: SITE_URL,
    logo: `${SITE_URL}/images/logo-512.png`,
    description:
      "AI-Native workspace for boutique professional services firms (2-10 people) managing 30-200 clients across accounting, law, HR advisory, consulting, and agency verticals.",
    foundingDate: "2026",
    parentOrganization: {
      "@type": "Organization",
      name: "Grindworks",
    },
    // Founder is referenced by @id so the Person entity defined on
    // /about renders once and is referenced everywhere. Per the AEO
    // research (Averi.ai), entity cross-linking via @id is what builds
    // the cross-platform knowledge graph LLMs use during disambiguation.
    founder: {
      "@id": `${SITE_URL}/about#seungdo-keum`,
    },
    address: {
      "@type": "PostalAddress",
      streetAddress: "1111b South Governors Ave STE 93589",
      addressLocality: "Dover",
      addressRegion: "DE",
      postalCode: "19904",
      addressCountry: "US",
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        email: "hello@practiq.dev",
        contactType: "customer support",
        availableLanguage: ["English"],
        areaServed: "US",
      },
      {
        "@type": "ContactPoint",
        email: "security@practiq.dev",
        contactType: "security",
        availableLanguage: ["English"],
      },
      {
        "@type": "ContactPoint",
        email: "privacy@practiq.dev",
        contactType: "privacy",
        availableLanguage: ["English"],
      },
    ],
    // Only canonical, verified URLs. We do not list a LinkedIn / X handle
    // here because none is in active use — listing fabricated handles
    // pollutes the entity graph more than it helps. Add when verified.
    sameAs: [SITE_URL],
  };
}

// ────────────────────────────────────────────────────────────────────────
// SoftwareApplication — the Practiq product.
//
// `tier` selects which Offer surfaces by default. The pricing page renders
// both tiers as a Product schema with multiple Offers (productOffersSchema
// in src/app/pricing/page.tsx); the homepage renders SoftwareApplication
// with the entry-tier founding-member offer because that's the headline
// price visitors see first.
//
// 2026-05-14 — Stage 1b of per-client pricing rollout. Numbers below
// route through PER_CLIENT_PRICING (see src/lib/stripe/plans.ts) so a
// single constant edit propagates across pricing page, JSON-LD, and
// llms.txt. priceSpecification.referenceQuantity.unitCode "C62" is the
// UN/CEFACT code for "one" + unitText "client" → schema-org-clean way
// to say "$10/$15 per *client* per month".
//
// `aggregateRating` is intentionally omitted — we have no public reviews
// yet, and a fabricated rating is a Google manual-action risk.
// `softwareVersion` matches package.json so it stays in sync with builds.
// ────────────────────────────────────────────────────────────────────────
export function softwareApplicationJsonLd(opts: {
  tier?: "founding" | "standard";
} = {}): Record<string, unknown> {
  const tier = opts.tier ?? "founding";
  // Per-client unit price. Stage 1: founding = $10/client/mo, standard
  // = $15/client/mo. Numbers literal to avoid an import cycle with
  // src/lib/stripe/plans.ts (json-ld.tsx is consumed by llms-txt.ts
  // which already depends on plans.ts — we keep this file free of
  // that backref). If PER_CLIENT_PRICING in plans.ts changes, update
  // these mirrors in the same commit.
  const price = tier === "founding" ? "10" : "15";

  const offerDescription =
    tier === "founding"
      ? "Founding member: $10/client/month for life, first 50 firms only. 500K tokens included per client per month. Unlimited team seats. 33% off the $15/client/month standard rate — lock persists across plan changes."
      : "Standard: $15/client/month, per-client pricing, 500K tokens included per client per month. $10 = 1M tokens top-up (firm-wide pool). Unlimited team seats. 14-day free trial covering 3 clients.";

  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${SITE_URL}/#software`,
    name: "Practiq",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Practice Management",
    operatingSystem: "Web Browser",
    url: SITE_URL,
    description:
      "AI-native client workspace for boutique professional services firms managing 30-200 client relationships. Pay per client served, not per seat. Overnight client portfolio scanning, ready-to-send deliverables, shared team memory, instant context switching across clients.",
    screenshot: `${SITE_URL}/images/dashboard-preview.png`,
    softwareVersion: "0.1.0",
    publisher: { "@id": `${SITE_URL}/#organization` },
    offers: {
      "@type": "Offer",
      name:
        tier === "founding"
          ? "Founding member — $10/client/month (first 50 firms)"
          : "Standard — $15/client/month",
      price,
      priceCurrency: "USD",
      priceValidUntil: "2027-12-31",
      availability: "https://schema.org/PreOrder",
      url: `${SITE_URL}/pricing`,
      description: offerDescription,
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price,
        priceCurrency: "USD",
        unitText: "per client per month",
        referenceQuantity: {
          "@type": "QuantitativeValue",
          value: "1",
          unitCode: "C62",
          unitText: "client",
        },
      },
    },
    featureList: [
      "Per-client AI memory and context",
      "Overnight client portfolio scanning",
      "Anomaly detection across 30-200 clients",
      "AI-prepared deliverables (financial statements, memos)",
      "Approval queue for AI outputs",
      "Shared team memory across staff",
      "Pattern learning from team decisions",
      "QuickBooks Online + Clio + Gusto integrations",
      "Audit trail for regulatory compliance",
      "Unlimited team seats (pay per client, not per seat)",
      "500K tokens included per client per month",
      "$10 = 1M tokens credit top-up (firm-wide pool)",
    ],
  };
}

// ────────────────────────────────────────────────────────────────────────
// BreadcrumbList — generic helper for any nested page.
// Pass items in display order (root → current page).
// ────────────────────────────────────────────────────────────────────────
export function breadcrumbJsonLd(
  items: { name: string; url: string }[]
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

// ────────────────────────────────────────────────────────────────────────
// Article — for blog posts.
//
// `wordCount` is computed from the rendered HTML by stripping tags. We
// keep it cheap (no DOM parsing) — strip-on-regex is good enough for
// schema.org and Google does not penalize an approximate count.
// `articleBody` excerpt cap matches Google's typical FAQ-rich-result cap
// to avoid bloating the inline JSON.
// ────────────────────────────────────────────────────────────────────────
export function articleJsonLd(
  post: BlogPost,
  url: string
): Record<string, unknown> {
  const wordCount = post.content
    .replace(/<[^>]+>/g, "")
    .split(/\s+/)
    .filter(Boolean).length;

  // RUN 22 (AEO): Article.abstract = standalone summary block. Per
  // Averi's data, AI Overviews + Perplexity quote standalone summary
  // blocks at the top of an article +30-40% more often than they
  // synthesize from the body. When the post has authored
  // keyTakeaways, join them as a paragraph; otherwise fall back to
  // ogDescription.
  const abstract =
    post.keyTakeaways && post.keyTakeaways.length > 0
      ? post.keyTakeaways.join(" ")
      : post.ogDescription;

  // RUN 22 (AEO): Use authored dateModified when present; AI engines
  // weight last-modified date heavily for "fresh" claims. Falls back
  // to publish date.
  const dateModified = post.dateModified ?? post.date;

  return {
    // RUN 22 Phase 3: HowTo schema is emitted in addition to Article
    // when the post auto-detects a step procedure (see howToJsonLd
    // helper below). This emit stays Article-only.
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.ogDescription,
    abstract,
    datePublished: post.date,
    dateModified,
    // Author is a Person, not an Organization. Per the AEO research,
    // collapsing person authors into the Organization entity is one of
    // the costliest mistakes — it prevents AI engines from building the
    // author-authority signal across the post corpus, which is what
    // makes them more likely to cite an article. We cross-reference the
    // Person entity by @id when the author is the named founder; for
    // other authors we emit a fresh Person object.
    author:
      post.author === "Seungdo Keum" || post.author === "SD Keum"
        ? { "@id": `${SITE_URL}/about#seungdo-keum` }
        : {
            "@type": "Person",
            name: post.author,
            url: `${SITE_URL}/about`,
          },
    publisher: { "@id": `${SITE_URL}/#organization` },
    // Use the per-post dynamic OG image (rendered by
    // src/app/blog/[slug]/opengraph-image.tsx via next/og) instead of
    // the static fallback. Each blog post gets a brand-coloured 1200×630
    // card with title + category + author baked in, which is what
    // social cards and AI crawlers actually want to surface.
    image: `${SITE_URL}/blog/${post.slug}/opengraph-image`,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    keywords: post.tags.join(", "),
    articleSection: post.category,
    wordCount,
    inLanguage: "en-US",
  };
}

// ────────────────────────────────────────────────────────────────────────
// RUN 22 Phase 3 — HowTo schema helper.
//
// AI Overviews + Perplexity surface 3-7 step procedures as rich-result
// cards when an article opts into HowTo. We auto-detect from <h2>
// headings starting with "Step N:" (or "1.", "2." etc.) so the
// authoring flow stays plain Markdown — no per-post schema config.
//
// The detector walks the post's HTML, captures each "Step" heading
// + the prose paragraph that follows, and only emits the JSON-LD
// when at least 3 steps are found. Below 3 we skip — partial HowTo
// triggers a "missing required fields" warning in Google's rich
// results test.
// ────────────────────────────────────────────────────────────────────────

interface HowToStep {
  name: string;
  text: string;
}

const STEP_HEADING_PATTERN = /^\s*(?:step\s*\d+\s*[:.\-—]|\d+[.\)\s])\s*(.+)/i;

export function extractHowToSteps(html: string): HowToStep[] {
  const steps: HowToStep[] = [];
  const sections = html.split(/<h2[^>]*>/i);
  // sections[0] is the prelude before the first H2 — skip it.
  for (let i = 1; i < sections.length; i++) {
    const section = sections[i];
    const closeIdx = section.indexOf("</h2>");
    if (closeIdx < 0) continue;
    const headingHtml = section.slice(0, closeIdx);
    const heading = headingHtml.replace(/<[^>]+>/g, "").trim();
    const match = STEP_HEADING_PATTERN.exec(heading);
    if (!match) continue;
    const stepName = match[1].trim();
    if (!stepName) continue;
    const bodyHtml = section.slice(closeIdx + "</h2>".length);
    const text = bodyHtml
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 800);
    if (text.length < 30) continue;
    steps.push({ name: stepName, text });
    if (steps.length >= 12) break;
  }
  return steps;
}

export function howToJsonLd(opts: {
  title: string;
  url: string;
  steps: HowToStep[];
  totalTimeIso?: string; // ISO 8601 duration e.g. "PT15M"
}): Record<string, unknown> | null {
  if (opts.steps.length < 3) return null;
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: opts.title,
    mainEntityOfPage: { "@type": "WebPage", "@id": opts.url },
    ...(opts.totalTimeIso ? { totalTime: opts.totalTimeIso } : {}),
    step: opts.steps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.name,
      text: s.text,
    })),
  };
}

// ────────────────────────────────────────────────────────────────────────
// Product comparison (for /vs/[slug]).
//
// schema.org has no first-class "ComparisonPage" — the convention is an
// Article that references the two compared Products. Listing both as
// `mentions` plus including price/category attributes gives LLM crawlers
// the structured pairing they need to cite the page in answers like
// "what's the difference between Clio and MyCase".
//
// Offer.price strictness (Wave 18b, 2026-05-13):
//
// Schema.org requires Offer.price to be a numeric string (e.g. "49") with
// a separate priceCurrency. Google's rich-result validator drops the page
// from price-rich SERP eligibility ("Starts at $99/user/month" → no green
// $ pill) if price is a marketing string.
//
// Our source-of-truth Competitor.priceStart is a human-facing display
// string ("$49/user/month", "$800+/month (Marketing Hub Pro)",
// "Free with Intuit partnership"). Rather than dual-shape the data
// layer — which would touch /compare, /alternatives, /vs, and the
// pricing table copy that surfaces these strings to humans — we
// extract the numeric component on serialization via parseStartingPrice.
//
// Convention:
//   • Single $X → that number.
//   • Range "$X-$Y" or "$X to $Y" → lowest tier (X).
//   • "$X+" (lower bound) → X.
//   • "Free" / non-numeric → no Offer block emitted (free isn't a
//     priced offer, and shipping price: "0" with "Starts at $0" copy
//     misleads more than it helps).
// ────────────────────────────────────────────────────────────────────────

/**
 * Pulls the lowest USD numeric tier out of a competitor's marketing
 * priceStart string. Returns null if no numeric is present (e.g.
 * "Free with Intuit partnership", "Contact for quote") so the caller
 * can omit the Offer entirely instead of fabricating a number.
 */
export function parseStartingPrice(displayPrice: string): string | null {
  if (!displayPrice) return null;
  // Match every "$<number>" token. Pick the smallest — that's the
  // entry-tier price even when the string says "$99-$299" or
  // "$40/month + $6/employee".
  const dollarMatches = displayPrice.match(/\$\s*(\d+(?:\.\d+)?)/g);
  if (!dollarMatches || dollarMatches.length === 0) return null;
  const numbers = dollarMatches
    .map((m) => parseFloat(m.replace(/[$\s]/g, "")))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (numbers.length === 0) return null;
  const lowest = Math.min(...numbers);
  // Schema.org accepts integers or decimals as the string form.
  // We strip trailing zeros so "49.00" → "49" — Google's validator
  // is happy with either, and the cleaner integer reads better in
  // SERP debug tools.
  return Number.isInteger(lowest) ? String(lowest) : lowest.toFixed(2);
}

/**
 * Date one year out from build, used as Offer.priceValidUntil.
 * Required by Google's rich-result validator for time-sensitive prices.
 * Computed at module load (build time) — every build emits a fresh date,
 * which is also what we want for static-rendered comparison pages.
 */
function offerPriceValidUntil(): string {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  // YYYY-MM-DD; ISO date is what Schema.org / Google expect.
  return d.toISOString().slice(0, 10);
}

export function productComparisonJsonLd(
  pair: VsPair,
  toolA: Competitor,
  toolB: Competitor,
  url: string,
  headline: string
): Record<string, unknown> {
  const priceValidUntil = offerPriceValidUntil();

  const productOf = (c: Competitor): Record<string, unknown> => {
    const numericPrice = parseStartingPrice(c.priceStart);
    const product: Record<string, unknown> = {
      "@type": "Product",
      name: c.name,
      category: c.category,
      description: c.tagline,
    };
    // Only emit the Offer block when we have a real numeric price.
    // Ship-a-fake-zero or ship-a-marketing-string both kill Google
    // rich-snippet eligibility for the whole page, so prefer
    // omission when the source data is "Free" or "Contact for quote".
    //
    // Offer.url points at THIS comparison page rather than the
    // competitor's site — we don't track each competitor's pricing
    // URL, and pointing at Practiq's /pricing would misattribute
    // the offer to Practiq. The comparison page is the canonical
    // citation surface for "where this price assertion lives".
    if (numericPrice !== null) {
      product.offers = {
        "@type": "Offer",
        price: numericPrice,
        priceCurrency: "USD",
        priceValidUntil,
        availability: "https://schema.org/InStock",
        url,
      };
    }
    return product;
  };

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": url,
    headline,
    description: pair.summary,
    url,
    datePublished: "2026-04-16",
    dateModified: "2026-04-16",
    author: { "@type": "Organization", name: "Practiq", url: SITE_URL },
    publisher: { "@id": `${SITE_URL}/#organization` },
    mainEntityOfPage: url,
    about: [productOf(toolA), productOf(toolB)],
    mentions: [productOf(toolA), productOf(toolB)],
  };
}

// ────────────────────────────────────────────────────────────────────────
// Dataset — schema.org/Dataset for original-research pages (P3-02).
// Designed for AEO: when ChatGPT / Perplexity / Bing AI Overview see
// a Dataset entity backing a research claim, citation rate goes up
// substantially over plain Article markup. Pair with the methodology
// + chart-shaped tables on the page itself for maximum extraction.
// ────────────────────────────────────────────────────────────────────────
export interface DatasetJsonLdInput {
  /** Stable slug used in the page URL — also `identifier` */
  slug: string;
  /** Short, declarative title. ≤100 chars. */
  name: string;
  /** 200-400 char abstract for AI extraction. */
  description: string;
  /** Page URL (will be set as both `url` and `mainEntityOfPage`). */
  url: string;
  /** ISO date — first publication. */
  datePublished: string;
  /** ISO date — most recent update. */
  dateModified: string;
  /** What is being measured. Each entry is a property/variable. */
  variableMeasured: Array<{ name: string; description?: string; unitText?: string }>;
  /** Topic keywords for AI engines + traditional search. 4-12 tags. */
  keywords: string[];
  /** Methodology summary — 1-3 sentences how the numbers were derived. */
  measurementTechnique: string;
  /** Geographic / industry scope of the dataset. */
  spatialCoverage?: string;
  temporalCoverage?: string;
  /** Citation block — how someone would cite the dataset in a paper. */
  citation: string;
}

export function datasetJsonLd(input: DatasetJsonLdInput): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    "@id": input.url,
    name: input.name,
    description: input.description,
    url: input.url,
    identifier: `practiq-research-${input.slug}`,
    license: "https://creativecommons.org/licenses/by/4.0/",
    isAccessibleForFree: true,
    creator: { "@id": `${SITE_URL}/#organization` },
    publisher: { "@id": `${SITE_URL}/#organization` },
    datePublished: input.datePublished,
    dateModified: input.dateModified,
    keywords: input.keywords,
    variableMeasured: input.variableMeasured.map((v) => ({
      "@type": "PropertyValue",
      name: v.name,
      description: v.description,
      unitText: v.unitText,
    })),
    measurementTechnique: input.measurementTechnique,
    ...(input.spatialCoverage ? { spatialCoverage: input.spatialCoverage } : {}),
    ...(input.temporalCoverage ? { temporalCoverage: input.temporalCoverage } : {}),
    citation: input.citation,
    inLanguage: "en-US",
    mainEntityOfPage: input.url,
  };
}

// ────────────────────────────────────────────────────────────────────────
// ItemList — for index pages that list other pages (e.g. /vs, /best, /alternatives).
//
// Each entry is a ListItem with a url that points at the child page. We use
// `name` on each ListItem (Google supports this on ListItems for navigational
// item lists) plus position for ordering. The optional `item` field can point
// at a richer entity (Product, Article) when known, but at the index level a
// bare URL is the safest and most universally-accepted shape.
//
// Why this matters for /vs: each comparison page is a high-intent SEO target,
// and the index is the rollup. Without ItemList, crawlers see a generic page
// of links; with ItemList, they see the curated comparison taxonomy and the
// pages get sitelink consideration in the SERP.
// ────────────────────────────────────────────────────────────────────────
export function itemListJsonLd(opts: {
  name: string;
  description?: string;
  url: string;
  items: { name: string; url: string }[];
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": opts.url,
    name: opts.name,
    ...(opts.description ? { description: opts.description } : {}),
    url: opts.url,
    numberOfItems: opts.items.length,
    itemListElement: opts.items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      url: it.url,
    })),
  };
}

// ────────────────────────────────────────────────────────────────────────
// FAQPage — preserves the existing FAQ shape used across pages.
// ────────────────────────────────────────────────────────────────────────
export function faqJsonLd(
  qa: { q: string; a: string }[]
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: qa.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

// ────────────────────────────────────────────────────────────────────────
// Practiq-vs-competitor (single-side) comparison schema.
//
// Distinct from `productComparisonJsonLd` above (which is the
// two-competitor neither-of-them-is-Practiq variant). This version
// emits an Article/BlogPosting that compares Practiq directly against
// one named competitor, with both as `mentions` Products. Used by the
// /vs/[slug] route for slugs like iqidis, ai-lawyer, gavel-exec, veraty.
//
// schema.org has no native "Comparison" type. The convention is to
// emit a BlogPosting/Article whose `mentions` contains the two
// compared Products — which gives LLM crawlers (ChatGPT, Perplexity,
// AI Overviews) the structured signal they need to cite the page in
// "Practiq vs $competitor" answer queries.
// ────────────────────────────────────────────────────────────────────────
export function practiqVsCompetitorJsonLd(opts: {
  competitorName: string;
  competitorCategory: string;
  competitorPriceStart: string;
  competitorTagline: string;
  pageUrl: string;
  headline: string;
  description: string;
  datePublished: string;
}): Record<string, unknown> {
  // Offer.price strictness (Wave 18c, 2026-05-13): same fix as
  // productComparisonJsonLd above. competitorPriceStart arrives as a
  // marketing string ("Starts at $99/user/month"); Google's rich-result
  // validator requires a bare numeric. parseStartingPrice handles the
  // common shapes and returns null when no numeric exists — in which
  // case we omit the Offer block rather than fabricate a fake zero.
  const priceValidUntil = offerPriceValidUntil();
  const competitorNumericPrice = parseStartingPrice(opts.competitorPriceStart);

  const competitorProduct: Record<string, unknown> = {
    "@type": "Product",
    name: opts.competitorName,
    category: opts.competitorCategory,
    description: opts.competitorTagline,
  };
  if (competitorNumericPrice !== null) {
    competitorProduct.offers = {
      "@type": "Offer",
      price: competitorNumericPrice,
      priceCurrency: "USD",
      priceValidUntil,
      availability: "https://schema.org/InStock",
      url: opts.pageUrl,
    };
  }

  const practiqProduct: Record<string, unknown> = {
    "@type": "Product",
    name: "Practiq",
    category: "Practice Management",
    description:
      "AI-native client workspace for boutique professional services firms.",
    offers: {
      "@type": "Offer",
      price: "49",
      priceCurrency: "USD",
      priceValidUntil,
      availability: "https://schema.org/PreOrder",
      url: `${SITE_URL}/pricing`,
    },
  };

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": opts.pageUrl,
    headline: opts.headline,
    description: opts.description,
    url: opts.pageUrl,
    datePublished: opts.datePublished,
    dateModified: opts.datePublished,
    author: { "@type": "Organization", name: "Practiq", url: SITE_URL },
    publisher: { "@id": `${SITE_URL}/#organization` },
    mainEntityOfPage: opts.pageUrl,
    about: [practiqProduct, competitorProduct],
    mentions: [practiqProduct, competitorProduct],
    inLanguage: "en-US",
  };
}

// ────────────────────────────────────────────────────────────────────────
// Service — for /use-cases/[slug] pages.
//
// Each use case is a vertical-specific service offering. `serviceType`
// captures the workflow ("Monthly Close Automation") and `provider`
// links back to the canonical Organization so the entity graph stays
// connected.
//
// Naming note: this function is deliberately NOT prefixed with `use`
// because that triggers the react-hooks/rules-of-hooks lint rule —
// any callable matching `/^use[A-Z]/` is treated as a React hook by the
// linter. We name it `serviceSchemaForUseCase` to dodge that.
// ────────────────────────────────────────────────────────────────────────
export function serviceSchemaForUseCase(
  slug: string,
  vertical: string,
  title: string,
  summary: string,
  url: string
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": url,
    name: title,
    serviceType: title,
    description: summary,
    url,
    provider: { "@id": `${SITE_URL}/#organization` },
    areaServed: { "@type": "Country", name: "United States" },
    audience: {
      "@type": "BusinessAudience",
      audienceType: `Boutique ${vertical} firms (2-10 people)`,
    },
    category: vertical,
    additionalType: `${SITE_URL}/use-cases/${slug}`,
  };
}
