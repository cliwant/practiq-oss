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
      // Re-declare the default site OG image so SNS shares don't fall
      // back to a mystery preview. The root layout's openGraph.images
      // doesn't cascade into per-page openGraph overrides, so each
      // route that defines its own openGraph must include images
      // explicitly. Reuse the site-wide /og-image.png until we build
      // per-topic OG renders.
      images: [
        {
          url: `${SITE_URL}/images/og-image.png`,
          width: 1200,
          height: 630,
          alt: t.metaTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: t.metaTitle,
      description: t.metaDescription,
      images: [`${SITE_URL}/images/og-image.png`],
    },
  };
}
