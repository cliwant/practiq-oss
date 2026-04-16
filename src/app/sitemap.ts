import type { MetadataRoute } from "next";
import { BLOG_POSTS } from "@/data/blog";
import { DOCS_SECTIONS } from "@/data/docs";
import { COMPETITORS } from "@/data/compare/competitors";
import { PRIORITY_STATES } from "@/data/geo/us-states";

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
    ...verticalHubEntries,
    ...blogEntries,
    ...docsEntries,
    compareIndexEntry,
    ...compareEntries,
    alternativesIndexEntry,
    ...alternativesEntries,
    ...geoEntries,
  ];
}
