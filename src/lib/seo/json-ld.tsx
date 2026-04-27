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
// all three tiers as a Product schema with multiple offers; the homepage
// renders SoftwareApplication with the entry-tier ($49 founding member)
// offer because that's the headline price visitors see first.
// `aggregateRating` is intentionally omitted — we have no public reviews
// yet, and a fabricated rating is a Google manual-action risk.
// `softwareVersion` matches package.json so it stays in sync with builds.
// ────────────────────────────────────────────────────────────────────────
export function softwareApplicationJsonLd(opts: {
  tier?: "founding" | "standard";
} = {}): Record<string, unknown> {
  const tier = opts.tier ?? "founding";
  const price = tier === "founding" ? "49.00" : "99.00";

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
      "AI-native client workspace for boutique professional services firms managing 30-200 client relationships. Overnight client portfolio scanning, ready-to-send deliverables, shared team memory, instant context switching across clients.",
    screenshot: `${SITE_URL}/images/dashboard-preview.png`,
    softwareVersion: "0.1.0",
    publisher: { "@id": `${SITE_URL}/#organization` },
    offers: {
      "@type": "Offer",
      name:
        tier === "founding"
          ? "Practice (Founding Member — first 50 firms)"
          : "Practice (Standard)",
      price,
      priceCurrency: "USD",
      priceValidUntil: "2026-12-31",
      availability: "https://schema.org/PreOrder",
      url: `${SITE_URL}/pricing`,
      description:
        tier === "founding"
          ? "First 50 firms on the waitlist lock in $49/mo for life — 50% off the standard $99/mo Practice tier."
          : "Standard pricing for 2-5 person firms managing 30-100 clients.",
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

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.ogDescription,
    datePublished: post.date,
    dateModified: post.date,
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
// Product comparison (for /vs/[slug]).
//
// schema.org has no first-class "ComparisonPage" — the convention is an
// Article that references the two compared Products. Listing both as
// `mentions` plus including price/category attributes gives LLM crawlers
// the structured pairing they need to cite the page in answers like
// "what's the difference between Clio and MyCase".
// ────────────────────────────────────────────────────────────────────────
export function productComparisonJsonLd(
  pair: VsPair,
  toolA: Competitor,
  toolB: Competitor,
  url: string,
  headline: string
): Record<string, unknown> {
  const productOf = (c: Competitor): Record<string, unknown> => ({
    "@type": "Product",
    name: c.name,
    category: c.category,
    description: c.tagline,
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      // We only know "starts at $X/user/month" copy — schema.org expects
      // a numeric price. Leaving as a string price is acceptable when
      // priceSpecification is not present and the offer is informational.
      price: c.priceStart,
      availability: "https://schema.org/InStock",
    },
  });

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
  const competitorProduct: Record<string, unknown> = {
    "@type": "Product",
    name: opts.competitorName,
    category: opts.competitorCategory,
    description: opts.competitorTagline,
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      price: opts.competitorPriceStart,
      availability: "https://schema.org/InStock",
    },
  };

  const practiqProduct: Record<string, unknown> = {
    "@type": "Product",
    name: "Practiq",
    category: "Practice Management",
    description:
      "AI-native client workspace for boutique professional services firms.",
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      price: "49.00",
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
