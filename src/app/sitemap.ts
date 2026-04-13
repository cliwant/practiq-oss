import type { MetadataRoute } from "next";
import { BLOG_POSTS } from "@/data/blog";
import { DOCS_SECTIONS } from "@/data/docs";

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
    ...blogEntries,
    ...docsEntries,
  ];
}
