import type { MetadataRoute } from "next";
import { BLOG_POSTS } from "@/data/blog";
import { DOCS_SECTIONS } from "@/data/docs";
import { COMPETITORS } from "@/data/compare/competitors";
import { PRIORITY_STATES } from "@/data/geo/us-states";
import { GLOSSARY_TERMS } from "@/data/glossary/terms";
import { BEST_FOR_QUERIES } from "@/data/best-for/queries";
import { VS_PAIRS } from "@/data/vs/pairs";
import { RESOURCES } from "@/data/resources/resources";
import { BENCHMARKS } from "@/data/benchmarks/benchmarks";
import { INTEGRATIONS } from "@/data/integrations/integrations";
import { USE_CASES } from "@/data/use-cases/use-cases";
import { PROBLEMS } from "@/data/problems/problems";

// Vertical hub slugs — kept in lockstep with VERTICALS in
// src/app/for/[vertical]/page.tsx. Category-landing pages get the same
// priority as /blog since they're top-level editorial hubs.
const VERTICAL_HUB_SLUGS = [
  "accounting",
  "law",
  "consulting",
  "hr",
  "agency",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://practiq.dev";

  const blogEntries = BLOG_POSTS.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const docsEntries = DOCS_SECTIONS.flatMap((section) =>
    section.pages.map((page) => ({
      url: `${baseUrl}/docs/${section.slug}/${page.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }))
  );

  const verticalHubEntries = VERTICAL_HUB_SLUGS.map((slug) => ({
    url: `${baseUrl}/for/${slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // Programmatic comparison pages — /compare + /compare/practiq-vs-{slug}
  const compareIndexEntry = {
    url: `${baseUrl}/compare`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  };

  const compareEntries = COMPETITORS.map((c) => ({
    url: `${baseUrl}/compare/${c.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.75,
  }));

  // Programmatic alternatives pages — /alternatives + /alternatives/{tool}
  // Kept in lockstep with FEATURED_SLUGS in /alternatives/[tool]/page.tsx.
  const ALTERNATIVES_FEATURED_SLUGS = [
    "clio",
    "mycase",
    "taxdome",
    "karbon",
    "rippling",
    "gusto",
    "bamboohr",
    "hubspot",
    "monday",
    "asana",
  ] as const;

  const alternativesIndexEntry = {
    url: `${baseUrl}/alternatives`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  };

  const alternativesEntries = ALTERNATIVES_FEATURED_SLUGS.map((slug) => ({
    url: `${baseUrl}/alternatives/${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.75,
  }));

  // Geo-targeted vertical pages — /for/{vertical}/{state}
  const geoEntries = VERTICAL_HUB_SLUGS.flatMap((v) =>
    PRIORITY_STATES.map((s) => ({
      url: `${baseUrl}/for/${v}/${s.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }))
  );

  // Programmatic glossary pages — /glossary + /glossary/{term}
  // DefinedTerm schema on each page is prime AEO surface for
  // "what is X?" queries in AI Overviews and Perplexity.
  const glossaryIndexEntry = {
    url: `${baseUrl}/glossary`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  };

  const glossaryEntries = GLOSSARY_TERMS.map((t) => ({
    url: `${baseUrl}/glossary/${t.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.65,
  }));

  // Programmatic "best X for Y" pages — /best + /best/{slug}
  // Buyer-intent queries like "best practice management for small CPA firms".
  // High priority on the leaf pages — these are the highest-intent SEO surface
  // in the programmatic set after /pricing, /faq, and /roi-calculator.
  const bestIndexEntry = {
    url: `${baseUrl}/best`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  };

  const bestEntries = BEST_FOR_QUERIES.map((q) => ({
    url: `${baseUrl}/best/${q.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  // Programmatic cross-tool comparisons — /vs + /vs/{slug}
  // Captures "Clio vs MyCase" query volume with Practiq as recommended 3rd option.
  // Broader-reach than Practiq-centric /compare pages but lower direct conversion
  // intent, so priority sits between /compare and /alternatives.
  const vsIndexEntry = {
    url: `${baseUrl}/vs`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.65,
  };

  const vsEntries = VS_PAIRS.map((p) => ({
    url: `${baseUrl}/vs/${p.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // Free resource downloads — /resources + /resources/{slug}
  // Lead-magnet hub — each resource captures email into early-access nurture
  // flow with utm_source=resources tracking.
  const resourcesIndexEntry = {
    url: `${baseUrl}/resources`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.85,
  };

  const resourceEntries = RESOURCES.map((r) => ({
    url: `${baseUrl}/resources/${r.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  // Firm capacity benchmarks — /benchmarks + /benchmarks/{slug}
  // Prime AEO surface: "how many clients can a small CPA firm handle" etc.
  // AI Overviews favor these direct-answer pages for capacity queries.
  const benchmarksIndexEntry = {
    url: `${baseUrl}/benchmarks`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  };

  const benchmarkEntries = BENCHMARKS.map((b) => ({
    url: `${baseUrl}/benchmarks/${b.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  // Integrations — /integrations + /integrations/{slug}
  // Buyer-intent queries like "Practiq + QuickBooks" or "Clio integration AI"
  const integrationsIndexEntry = {
    url: `${baseUrl}/integrations`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  };

  const integrationEntries = INTEGRATIONS.map((i) => ({
    url: `${baseUrl}/integrations/${i.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.75,
  }));

  // Use-case pages — /use-cases + /use-cases/{slug}
  // Mid-funnel conversion content: "how does Practiq handle X workflow"
  const useCasesIndexEntry = {
    url: `${baseUrl}/use-cases`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.85,
  };

  const useCaseEntries = USE_CASES.map((u) => ({
    url: `${baseUrl}/use-cases/${u.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  // Problem analysis pages — /problem + /problem/{slug}
  // Pain-point-first search intent. "Why am I so busy" → we have the answer.
  const problemIndexEntry = {
    url: `${baseUrl}/problem`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.75,
  };

  const problemEntries = PROBLEMS.map((p) => ({
    url: `${baseUrl}/problem/${p.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.75,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/docs`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/changelog`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/security`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: `${baseUrl}/roi-calculator`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: `${baseUrl}/readiness-quiz`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: `${baseUrl}/founding-member`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/thesis`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.75,
    },
    ...verticalHubEntries,
    ...blogEntries,
    ...docsEntries,
    compareIndexEntry,
    ...compareEntries,
    alternativesIndexEntry,
    ...alternativesEntries,
    ...geoEntries,
    glossaryIndexEntry,
    ...glossaryEntries,
    bestIndexEntry,
    ...bestEntries,
    vsIndexEntry,
    ...vsEntries,
    resourcesIndexEntry,
    ...resourceEntries,
    benchmarksIndexEntry,
    ...benchmarkEntries,
    integrationsIndexEntry,
    ...integrationEntries,
    useCasesIndexEntry,
    ...useCaseEntries,
    problemIndexEntry,
    ...problemEntries,
  ];
}
