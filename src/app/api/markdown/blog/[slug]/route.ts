/**
 * Markdown companion to a blog post — serves plain Markdown at the
 * external URL `/blog/<slug>.md` (rewritten by middleware) so AI
 * crawlers (Cursor, Claude Code, Perplexity, ChatGPT) get the prose
 * without the HTML/CSS/JS bootstrap overhead.
 *
 * Why this matters (per Evil Martians' production data):
 *   - HTML blog posts cost an LLM crawler ~15K tokens to ingest
 *   - Same article as Markdown: ~3K tokens
 *   - /llms-full.txt already gets 3-4× more LLM-agent fetches than
 *     /llms.txt — concrete proof crawlers prefer plain-text.
 *   - Cursor + Claude Code already send `Accept: text/markdown`.
 *
 * Routing topology:
 *   - User-facing URL:   `/blog/<slug>.md`
 *   - Middleware rewrite: `/blog/<slug>.md` → `/api/markdown/blog/<slug>`
 *     (Next.js doesn't allow page.tsx + route.ts to coexist at the
 *      same App Router segment, so we put the handler under /api/.)
 *   - HTML page at `/blog/<slug>` adds `<link rel="alternate"
 *     type="text/markdown" href="/blog/<slug>.md">` so AI crawlers
 *     can discover the Markdown variant via standard HTTP headers.
 *   - `Accept: text/markdown` on the HTML URL is also handled by
 *     middleware: it 302-redirects to the `.md` URL.
 *
 * Each Markdown response includes YAML frontmatter with `canonical:`
 * pointing at the HTML URL, so AI agents that re-cite us can land
 * readers on the rendered page, not the raw .md.
 */
import { BLOG_POSTS } from "@/data/blog";
import { getPostBySlug, getPublishedDbSlugs } from "@/lib/blog/get-posts";
import { SITE_URL } from "@/lib/seo/json-ld";
import { htmlToMarkdown } from "@/lib/markdown-export";

// DB posts can appear after deploy — render on demand and cache for 1h.
export const dynamicParams = true;
export const revalidate = 3600;

export async function generateStaticParams() {
  const dbSlugs = await getPublishedDbSlugs();
  const fileSlugs = BLOG_POSTS.map((p) => p.slug);
  const all = new Set([...dbSlugs, ...fileSlugs]);
  return Array.from(all).map((slug) => ({ slug }));
}

interface RouteContext {
  params: Promise<{ slug: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const result = await getPostBySlug(slug);
  const post = result.post;

  if (!post) {
    return new Response("Not found", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const canonical = `${SITE_URL}/blog/${post.slug}`;
  const body = htmlToMarkdown(post.content);

  // Frontmatter — strict YAML so it parses cleanly with any md tool
  // (mkdocs, hugo, kramdown, etc.) and AI crawlers can extract the
  // structured fields without re-running their NLP layer.
  const dateModified = post.dateModified ?? post.date;
  const lastVerified = post.lastVerified ?? post.date;
  const keyTakeawaysYaml =
    post.keyTakeaways && post.keyTakeaways.length > 0
      ? "key_takeaways:\n" +
        post.keyTakeaways.map((k) => `  - "${escapeYaml(k)}"`).join("\n") +
        "\n"
      : "";
  // RUN 22: full schema-aligned frontmatter so AI crawlers (Cursor,
  // Claude Code, Perplexity, ChatGPT) extract dates / license /
  // takeaways without re-running their NLP layer. CC BY 4.0 license
  // is consistent with the public-research dataset routes — every
  // Markdown surface Practiq publishes is openly citable.
  const frontmatter = [
    "---",
    `title: "${escapeYaml(post.title)}"`,
    `slug: ${post.slug}`,
    `date: ${post.date}`,
    `date_published: ${post.date}`,
    `date_modified: ${dateModified}`,
    `last_verified: ${lastVerified}`,
    `author: ${post.author}`,
    `category: ${post.category}`,
    `license: CC-BY-4.0`,
    `reading_time_minutes: ${post.readingTime}`,
    `canonical: ${canonical}`,
    `summary: "${escapeYaml(post.ogDescription ?? "")}"`,
    `tags: [${post.tags.map((t) => `"${escapeYaml(t)}"`).join(", ")}]`,
    keyTakeawaysYaml.replace(/\n$/, ""),
    "---",
    "",
  ]
    .filter(Boolean)
    .join("\n");

  // RUN 22: TL;DR block from keyTakeaways shown above the body so AI
  // engines that quote the first 200 tokens get a self-contained
  // standalone summary (+30-40% citation likelihood per Averi data).
  const takeawaysBlock =
    post.keyTakeaways && post.keyTakeaways.length > 0
      ? `## TL;DR\n\n${post.keyTakeaways.map((k) => `- ${k}`).join("\n")}\n\n`
      : "";
  const md =
    frontmatter +
    `# ${post.title}\n\n` +
    `${post.excerpt}\n\n` +
    takeawaysBlock +
    `${body}\n\n` +
    `---\n\n` +
    `_This is the Markdown companion to ${canonical}. Source: Practiq (${SITE_URL})._\n`;

  return new Response(md, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
      "X-Robots-Tag": "all",
      Link: `<${canonical}>; rel="canonical"`,
    },
  });
}

function escapeYaml(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, " ");
}
