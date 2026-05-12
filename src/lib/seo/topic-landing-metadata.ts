import type { Metadata } from "next";
import { TOPIC_LANDINGS } from "@/data/topic-landings";
import { SITE_URL } from "@/lib/seo/json-ld";

/**
 * Server-side metadata builder for the three topic landings. Kept in
 * its own module (not on the client renderer) so route pages can
 * remain server components and Next.js can statically analyze the
 * exported `metadata`.
 */
export function buildTopicMetadata(slug: string): Metadata {
  const t = TOPIC_LANDINGS[slug];
  if (!t) return {};
  const canonical = `${SITE_URL}/${t.slug}`;
  return {
    title: t.metaTitle,
    description: t.metaDescription,
    keywords: t.keywords,
    alternates: { canonical },
    openGraph: {
      title: t.metaTitle,
      description: t.metaDescription,
      type: "article",
      url: canonical,
      siteName: "Practiq",
    },
    twitter: {
      card: "summary_large_image",
      title: t.metaTitle,
      description: t.metaDescription,
    },
  };
}
