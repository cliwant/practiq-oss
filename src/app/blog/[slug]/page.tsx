import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { BLOG_POSTS } from "@/data/blog";
import { getPostBySlug, getPublishedDbSlugs } from "@/lib/blog/get-posts";
import { BlogPostRender } from "@/components/blog/blog-post-render";
import { SITE_URL } from "@/lib/seo/json-ld";

interface Props {
  params: Promise<{ slug: string }>;
}

// Allow new DB-authored slugs that weren't in generateStaticParams to be
// rendered on first visit, then cached for 60s. This means a newly
// published post appears at /blog/<slug> within a minute, no redeploy.
export const dynamicParams = true;
export const revalidate = 60;

export async function generateStaticParams() {
  const dbSlugs = await getPublishedDbSlugs();
  const fileSlugs = BLOG_POSTS.map((p) => p.slug);
  const all = new Set([...dbSlugs, ...fileSlugs]);
  return Array.from(all).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPostBySlug(slug);
  const post = result.post;
  if (!post) return {};
  const canonical = `${SITE_URL}/blog/${post.slug}`;
  const markdownUrl = `${SITE_URL}/blog/${post.slug}.md`;
  return {
    title: post.title,
    description: post.ogDescription,
    // P3-03 (AEO): expose a link to the Markdown companion route so LLM
    // crawlers (Perplexity, ChatGPT, Claude) can grab a 3K-token clean
    // version instead of parsing the 15K-token rendered HTML page.
    // Next emits this as <link rel="alternate" type="text/markdown" />.
    alternates: {
      canonical,
      types: { "text/markdown": markdownUrl },
    },
    openGraph: {
      title: post.title,
      description: post.ogDescription,
      type: "article",
      url: canonical,
      publishedTime: post.date,
      authors: [post.author],
      // The file-based /blog/[slug]/opengraph-image.tsx generator
      // already produces a per-post OG image (category-tinted, title +
      // reading-time). Next.js wires it into <meta og:image> automatically;
      // we don't override `images` here so the prerendered version wins.
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const result = await getPostBySlug(slug);
  if (result.redirectTo) redirect(`/blog/${result.redirectTo}`);
  const post = result.post;
  if (!post) notFound();

  return <BlogPostRender post={post} />;
}
