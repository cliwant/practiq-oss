import type { MetadataRoute } from "next";
import { BLOG_POSTS } from "@/data/blog";
import { DOCS_SECTIONS } from "@/data/docs";
import { COMPETITORS } from "@/data/compare/competitors";
import { PRIORITY_STATES } from "@/data/geo/us-states";
import { GLOSSARY_TERMS } from "@/data/glossary/terms";
import { BEST_FOR_QUERIES } from "@/data/best-for/queries";
import { VS_PAIRS } from "@/data/vs/pairs";
import { PRACTIQ_VS_COMPETITORS } from "@/data/comparisons";
import { RESOURCES } from "@/data/resources/resources";
import { BENCHMARKS } from "@/data/benchmarks/benchmarks";
import { RESEARCH_DATASETS } from "@/data/research/datasets";
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

  // Practiq-vs-$competitor pages (iqidis, ai-lawyer, gavel-exec, veraty).
  // Sit under the same /vs/[slug] route as the two-competitor pairs but
  // resolve to a different layout. Priority sits slightly above the
  // two-competitor pairs because Practiq-vs-X queries convert harder.
  const practiqVsEntries = PRACTIQ_VS_COMPETITORS.map((c) => ({
    url: `${baseUrl}/vs/${c.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.75,
  }));

  // Long-form /vs/* comparison pages — dedicated route files (NOT
  // backed by VS_PAIRS data). These target high-intent GSC queries
  // where Practiq currently ranks page 3-4 (positions 28-50): "karbon
  // vs taxdome" (111 impressions/28d), "karbon vs canopy" (107),
  // "canopy vs taxdome" (60), "jetpack workflow vs karbon" (54),
  // "karbon alternatives" (34). Priority 0.85 — higher than the
  // two-competitor template variants because these are commercial-
  // intent comparison queries with operator-grade long-form content.
  const LONG_FORM_VS_SLUGS = [
    "karbon-vs-taxdome",
    "karbon-vs-canopy",
    "canopy-vs-taxdome",
    "jetpack-workflow-vs-karbon",
    "karbon-alternatives",
  ] as const;

  const longFormVsEntries = LONG_FORM_VS_SLUGS.map((slug) => ({
    url: `${baseUrl}/vs/${slug}`,
    lastModified: new Date("2026-05-18"),
    changeFrequency: "monthly" as const,
    priority: 0.85,
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
    // Free tools — self-serve workflow audit (TIER 1) + AI policy
    // generator (TIER 3) + tools index. Workflow audit is the most
    // qualified lead path for SNS-driven and non-SNS traffic alike.
    {
      url: `${baseUrl}/workflow-audit`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/tools`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/tools/ai-policy-generator`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    // Topic landing pages — long-form thesis articles with JSON-LD FAQ
    // and a workflow-audit conversion CTA. These are the SNS conversion
    // targets and the strongest AEO surface, so priority is on par with
    // /pricing and /faq.
    {
      url: `${baseUrl}/professional-services-ai-evidence-layer`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/legal-ai-review-workflow`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/client-context-memory`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    // Sample workspace (TIER 2) — read-only demo workspace. Skip the
    // per-client demo pages (50 of them, low SEO value, sample data).
    {
      url: `${baseUrl}/demo/workspace`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/demo/workspace/clients`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/demo/workspace/approval-queue`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/thesis`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.75,
    },
    // Original-research datasets (P3-02). Index + per-slug entries.
    {
      url: `${baseUrl}/research`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.85,
    },
    ...RESEARCH_DATASETS.map((d) => ({
      url: `${baseUrl}/research/${d.slug}`,
      lastModified: new Date(d.schema.dateModified),
      changeFrequency: "monthly" as const,
      priority: 0.85,
    })),
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
    ...practiqVsEntries,
    ...longFormVsEntries,
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
