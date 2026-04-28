import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BLOG_POSTS } from "@/data/blog";
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
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);
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
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) notFound();

  const postUrl = `${SITE_URL}/blog/${post.slug}`;

  // Article + Breadcrumb come from shared helpers so all blog posts
  // produce the same shape. FAQ extraction below stays inline because
  // it's blog-specific (parses H2s out of post.content).
  const articleLd = articleJsonLd(post, postUrl);
  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Blog", url: `${SITE_URL}/blog` },
    { name: post.title, url: postUrl },
  ]);

  // FAQ schema — extract <h2> elements that are phrased as questions
  // ("How / Why / What / When / Where / Should / Is / Does / Can / ?")
  // and pair each with the paragraphs that follow until the next <h2>.
  // This makes individual posts eligible for Google's FAQ rich result and
  // strongly helps AEO answer-engines pick our content for direct answers.
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

  // RUN 22: emit Person JSON-LD for the author so AI engines build
  // the author-authority signal across our corpus. Pairs with the
  // visible AuthorBio component below the post body.
  const personLd = authorPersonJsonLd(post.author);

  // RUN 22: process the rendered HTML to add stable id attributes to
  // every <h2>/<h3>/<h4> heading. ChatGPT and Perplexity quote
  // fragment-link URLs (`page.com#anchor`) more aggressively when the
  // anchors are stable + slug-shaped. Idempotent: if the heading
  // already has an id="" the slugifier leaves it alone.
  const contentWithAnchoredHeadings = addHeadingIds(post.content);

  // RUN 22 Phase 3: auto-detect step procedures and emit HowTo
  // structured data when >= 3 steps are found. Triggers AI Overviews
  // + Perplexity rich-result cards.
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

          {/* RUN 22: standalone TL;DR card that mirrors the JSON-LD
              Article.abstract field. Quoted directly +30-40% more often
              by AI Overviews + Perplexity per Averi data. */}
          {post.keyTakeaways && post.keyTakeaways.length > 0 && (
            <KeyTakeaways takeaways={post.keyTakeaways} />
          )}

          <div
            className="prose-dark"
            dangerouslySetInnerHTML={{ __html: contentWithAnchoredHeadings }}
          />

          {/* RUN 22: visible author bio at the bottom — pairs with the
              Person JSON-LD above so AI engines have both human-readable
              + structured author authority signals. */}
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

// ────────────────────────────────────────────────────────────────────────
// FAQ extraction — pulls H2 questions + the paragraphs that follow.
// ────────────────────────────────────────────────────────────────────────

const QUESTION_STARTS = /^\s*(how|why|what|when|where|which|who|should|is|are|does|do|can|will)\b/i;

function extractFaqs(html: string): { question: string; answer: string }[] {
  const faqs: { question: string; answer: string }[] = [];

  // Split on <h2>…</h2>. Use a lazy match.
  const sections = html.split(/<h2[^>]*>/i);
  // sections[0] is the prelude before the first H2 — skip it.
  for (let i = 1; i < sections.length; i++) {
    const section = sections[i];
    const closeIdx = section.indexOf("</h2>");
    if (closeIdx < 0) continue;

    const headingHtml = section.slice(0, closeIdx);
    const heading = stripTags(headingHtml).trim();
    // Only treat as FAQ if it ends in ? OR starts with a question word.
    if (!heading.endsWith("?") && !QUESTION_STARTS.test(heading)) continue;

    // Body = everything between </h2> and the next <h2 (already split out).
    const bodyHtml = section.slice(closeIdx + "</h2>".length);
    const answerText = stripTags(bodyHtml)
      .replace(/\s+/g, " ")
      .trim()
      // Cap at ~600 chars per FAQ entry — Google ignores anything longer.
      .slice(0, 600);

    if (answerText.length < 30) continue;

    faqs.push({ question: heading, answer: answerText });

    // Cap total FAQs per page (Google's max useful is ~10).
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

// ────────────────────────────────────────────────────────────────────────
// RUN 22 Phase 2 — auto-id every H2/H3/H4 with a slug-stable id so AI
// engines can deep-link to a specific section ("page.com#why-clients").
// Headings that already declare an id="" are left alone (idempotent).
// ────────────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ") // strip punctuation
    .replace(/\s+/g, "-") // collapse whitespace
    .replace(/-+/g, "-") // collapse hyphens
    .replace(/^-|-$/g, "") // trim leading/trailing hyphens
    .slice(0, 80); // cap so a long heading doesn't produce a megaslug
}

/**
 * Add `id="<slug>"` to every <h2..h4> tag in the rendered HTML that
 * doesn't already declare one. Resolves duplicate slugs by suffixing
 * `-2`, `-3`, … so a post with two "Conclusion" sections produces
 * `#conclusion` and `#conclusion-2`.
 */
function addHeadingIds(html: string): string {
  const seen = new Map<string, number>();
  return html.replace(
    /<(h[2-4])([^>]*)>([\s\S]*?)<\/\1>/gi,
    (_match, tag: string, attrs: string, inner: string) => {
      // Idempotent: if the tag already has an id="" attr, return as-is.
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
