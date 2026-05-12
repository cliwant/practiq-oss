/**
 * Shared blog post renderer.
 *
 * Used by both:
 *   - /blog/[slug]         (public render)
 *   - /admin/blog/preview/[id] (admin draft preview)
 *
 * The exact JSX and behaviour was extracted from the public page so that
 * draft previews render identically to what readers will eventually see
 * once the post is published — FAQ JSON-LD, anchored headings, KeyTakeaways,
 * AuthorBio, RelatedArticles, all of it.
 *
 * Keeping a single source means we don't drift between preview and
 * production over time. The public page is a thin wrapper that loads the
 * post and delegates rendering here.
 */
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { BlogPost } from "@/data/blog/types";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";
import { ReadingProgress } from "@/components/blog/reading-progress";
import { SocialShare } from "@/components/blog/social-share";
import { NewsletterSignup } from "@/components/blog/newsletter-signup";
import { RelatedArticles } from "@/components/blog/related-articles";
import { KeyTakeaways } from "@/components/blog/key-takeaways";
import { AuthorBio, authorPersonJsonLd } from "@/components/blog/author-bio";
import { withUtm, BLOG_CTA_UTM } from "@/lib/utm";
import {
  JsonLd,
  articleJsonLd,
  breadcrumbJsonLd,
  extractHowToSteps,
  howToJsonLd,
  SITE_URL,
} from "@/lib/seo/json-ld";

interface Props {
  post: BlogPost;
}

// ────────────────────────────────────────────────────────────────────────
// FAQ extraction — pulls H2 questions + the paragraphs that follow.
// (Lifted as-is from /blog/[slug]/page.tsx — DO NOT modify without
// re-verifying that file-post FAQ JSON-LD still emits correctly.)
// ────────────────────────────────────────────────────────────────────────

const QUESTION_STARTS = /^\s*(how|why|what|when|where|which|who|should|is|are|does|do|can|will)\b/i;

function extractFaqs(html: string): { question: string; answer: string }[] {
  const faqs: { question: string; answer: string }[] = [];

  const sections = html.split(/<h2[^>]*>/i);
  for (let i = 1; i < sections.length; i++) {
    const section = sections[i];
    const closeIdx = section.indexOf("</h2>");
    if (closeIdx < 0) continue;

    const headingHtml = section.slice(0, closeIdx);
    const heading = stripTags(headingHtml).trim();
    if (!heading.endsWith("?") && !QUESTION_STARTS.test(heading)) continue;

    const bodyHtml = section.slice(closeIdx + "</h2>".length);
    const answerText = stripTags(bodyHtml)
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 600);

    if (answerText.length < 30) continue;

    faqs.push({ question: heading, answer: answerText });

    if (faqs.length >= 10) break;
  }

  return faqs;
}

function stripTags(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function addHeadingIds(html: string): string {
  const seen = new Map<string, number>();
  return html.replace(
    /<(h[2-4])([^>]*)>([\s\S]*?)<\/\1>/gi,
    (_match, tag: string, attrs: string, inner: string) => {
      if (/\sid\s*=/.test(attrs)) return _match;
      const text = stripTags(inner).trim();
      if (!text) return _match;
      const baseSlug = slugify(text);
      if (!baseSlug) return _match;
      const seenCount = seen.get(baseSlug) ?? 0;
      const slug = seenCount === 0 ? baseSlug : `${baseSlug}-${seenCount + 1}`;
      seen.set(baseSlug, seenCount + 1);
      return `<${tag}${attrs} id="${slug}">${inner}</${tag}>`;
    },
  );
}

export function BlogPostRender({ post }: Props) {
  const postUrl = `${SITE_URL}/blog/${post.slug}`;

  const articleLd = articleJsonLd(post, postUrl);
  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Blog", url: `${SITE_URL}/blog` },
    { name: post.title, url: postUrl },
  ]);

  const faqs = extractFaqs(post.content);
  const faqJsonLd =
    faqs.length >= 2
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: { "@type": "Answer", text: f.answer },
          })),
        }
      : null;

  const personLd = authorPersonJsonLd(post.author);
  const contentWithAnchoredHeadings = addHeadingIds(post.content);
  const howToSteps = extractHowToSteps(post.content);
  const howToLd = howToJsonLd({
    title: post.title,
    url: postUrl,
    steps: howToSteps,
  });

  return (
    <div className="min-h-screen bg-bg-base">
      <ReadingProgress />
      <Nav />
      <JsonLd data={articleLd} />
      <JsonLd data={breadcrumbLd} />
      <JsonLd data={personLd} />
      {faqJsonLd && <JsonLd data={faqJsonLd} />}
      {howToLd && <JsonLd data={howToLd} />}
      <main className="pt-32 pb-16 px-6">
        <article className="max-w-3xl mx-auto">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to blog
          </Link>

          <header className="mb-10">
            <div className="flex items-center gap-3 mb-5">
              <time className="text-sm text-zinc-500">
                {new Date(post.date).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </time>
              <span className="text-sm text-zinc-600">&middot;</span>
              <span className="text-sm text-zinc-500">{post.readingTime}</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-zinc-100 tracking-tight leading-tight mb-5">
              {post.title}
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-zinc-400">{post.author}</span>
              <div className="flex gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] px-2 py-1 rounded-md bg-zinc-800 text-zinc-400"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </header>

          <div className="mb-8">
            <SocialShare url={postUrl} title={post.title} />
          </div>

          {post.keyTakeaways && post.keyTakeaways.length > 0 && (
            <KeyTakeaways takeaways={post.keyTakeaways} />
          )}

          <div
            className="prose-dark"
            dangerouslySetInnerHTML={{ __html: contentWithAnchoredHeadings }}
          />

          <AuthorBio authorName={post.author} />

          <RelatedArticles
            currentSlug={post.slug}
            category={post.category}
            tags={post.tags}
          />

          <NewsletterSignup postSlug={post.slug} />

          <hr className="border-zinc-800 my-12" />

          <div className="text-center">
            <p className="text-zinc-400 mb-4">
              Ready to see how Practiq can help your firm?
            </p>
            <Link
              href={withUtm("/#cta", BLOG_CTA_UTM(post.slug))}
              className="btn-premium inline-flex items-center gap-2 py-3 px-8 text-sm"
            >
              Request Early Access
            </Link>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
