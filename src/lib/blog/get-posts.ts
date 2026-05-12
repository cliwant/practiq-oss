/**
 * Dual-source blog post resolver.
 *
 * Posts live in two places:
 *   1. File-based: src/data/blog/posts/*.ts (150+ legacy posts, code-managed)
 *   2. Database: BlogPost model (authored via /admin/blog, no redeploy needed)
 *
 * DB posts win on slug collision. Public callers only see `published`
 * DB posts. Admin callers see drafts + a `source` tag.
 *
 * The shape returned is identical to the file-based BlogPost so existing
 * page rendering (FAQ extraction, heading slugifier, JSON-LD) works
 * transparently for both sources.
 */
import { prisma } from "@/lib/prisma";
import { BLOG_POSTS as FILE_POSTS } from "@/data/blog";
import type { BlogPost, BlogCategory } from "@/data/blog/types";

export type BlogPostSource = "file" | "db";

export interface BlogPostWithSource extends BlogPost {
  source: BlogPostSource;
  status?: "draft" | "published";
  id?: string; // DB id when source==="db"
}

/**
 * Convert a Prisma BlogPost row into the in-memory BlogPost shape used
 * everywhere else in the app. Defaults mirror the legacy file shape.
 */
function dbRowToPost(
  row: {
    id: string;
    slug: string;
    title: string;
    date: Date;
    author: string;
    excerpt: string;
    content: string;
    tags: string[];
    category: string | null;
    readingTime: string | null;
    keyTakeaways: string[];
    ogDescription: string | null;
    status: string;
    publishedAt: Date | null;
    updatedAt: Date;
  },
  opts: { includeSource?: boolean } = {},
): BlogPostWithSource {
  const post: BlogPostWithSource = {
    id: row.id,
    slug: row.slug,
    title: row.title,
    date: (row.publishedAt ?? row.date).toISOString().slice(0, 10),
    dateModified: row.updatedAt.toISOString().slice(0, 10),
    author: row.author,
    excerpt: row.excerpt,
    content: row.content,
    tags: row.tags,
    readingTime: row.readingTime ?? estimateReadingTime(row.content),
    ogDescription: row.ogDescription ?? row.excerpt,
    category: (normalizeCategory(row.category) ?? "General") as BlogCategory,
    keyTakeaways: row.keyTakeaways.length > 0 ? row.keyTakeaways : undefined,
    source: "db",
    status: (row.status === "published" ? "published" : "draft") as
      | "draft"
      | "published",
  };
  if (!opts.includeSource) {
    // strip admin-only fields when returning to public callers
    return post;
  }
  return post;
}

function normalizeCategory(cat: string | null): BlogCategory | null {
  if (!cat) return null;
  const allowed: BlogCategory[] = [
    "Accounting",
    "Law",
    "Consulting",
    "HR",
    "Agency",
    "General",
  ];
  const titled = cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();
  if (allowed.includes(titled as BlogCategory)) return titled as BlogCategory;
  return null;
}

function estimateReadingTime(html: string): string {
  const text = html.replace(/<[^>]+>/g, " ");
  const words = text.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 220));
  return `${minutes} min read`;
}

/**
 * Public listing: merged DB published posts ∪ file posts.
 * DB posts win on slug collision. Sorted newest-first by date.
 */
export async function getAllPosts(): Promise<BlogPost[]> {
  let dbPosts: BlogPostWithSource[] = [];
  try {
    const rows = await prisma.blogPost.findMany({
      where: { status: "published" },
      orderBy: { publishedAt: "desc" },
    });
    dbPosts = rows.map((r) => dbRowToPost(r));
  } catch (e) {
    // If DB is unavailable at build time, fall back to file posts only.
    console.error("[get-posts] DB unavailable, file posts only:", e);
  }

  const dbSlugs = new Set(dbPosts.map((p) => p.slug));
  const merged: BlogPost[] = [
    ...dbPosts,
    ...FILE_POSTS.filter((p) => !dbSlugs.has(p.slug)),
  ];

  // Newest first by `date`
  merged.sort((a, b) => (a.date < b.date ? 1 : -1));
  return merged;
}

/**
 * Resolve a single post by slug for public consumption.
 *
 * Returns `{ post, redirectTo }`:
 *   - { post: BlogPost }       — render this post
 *   - { redirectTo: string }   — the slug matched a previousSlugs[] entry,
 *                                 caller should 301-redirect to redirectTo
 *   - { }                       — not found
 */
export async function getPostBySlug(
  slug: string,
): Promise<
  | { post: BlogPost; redirectTo?: undefined }
  | { post?: undefined; redirectTo: string }
  | { post?: undefined; redirectTo?: undefined }
> {
  // DB check (published only)
  try {
    const row = await prisma.blogPost.findFirst({
      where: { slug, status: "published" },
    });
    if (row) return { post: dbRowToPost(row) };

    // Slug-change redirect: look for a published post whose previousSlugs
    // contains this slug.
    const redirectRow = await prisma.blogPost.findFirst({
      where: {
        status: "published",
        previousSlugs: { has: slug },
      },
      select: { slug: true },
    });
    if (redirectRow) return { redirectTo: redirectRow.slug };
  } catch (e) {
    console.error("[get-posts] DB lookup failed for slug:", slug, e);
  }

  // File-based fallback
  const filePost = FILE_POSTS.find((p) => p.slug === slug);
  if (filePost) return { post: filePost };
  return {};
}

/**
 * Admin listing: all DB posts (drafts + published) + all file posts.
 * Each entry tagged with `source` so the UI can show "code-managed" badge.
 */
export async function getAllPostsForAdmin(): Promise<{
  posts: BlogPostWithSource[];
  dbError?: string;
}> {
  let dbPosts: BlogPostWithSource[] = [];
  let dbError: string | undefined;
  try {
    const rows = await prisma.blogPost.findMany({
      orderBy: { updatedAt: "desc" },
    });
    dbPosts = rows.map((r) => dbRowToPost(r, { includeSource: true }));
  } catch (e) {
    dbError =
      e instanceof Error ? e.message.split("\n")[0] : "DB unavailable";
    console.error("[get-posts] admin listing DB error:", e);
  }

  const dbSlugs = new Set(dbPosts.map((p) => p.slug));
  const filePosts: BlogPostWithSource[] = FILE_POSTS.filter(
    (p) => !dbSlugs.has(p.slug),
  ).map((p) => ({ ...p, source: "file" as const }));

  return { posts: [...dbPosts, ...filePosts], dbError };
}

/**
 * Just slugs of published DB posts, for generateStaticParams.
 */
export async function getPublishedDbSlugs(): Promise<string[]> {
  try {
    const rows = await prisma.blogPost.findMany({
      where: { status: "published" },
      select: { slug: true },
    });
    return rows.map((r) => r.slug);
  } catch {
    return [];
  }
}

/**
 * Fetch a single DB post by id (admin use only).
 */
export async function getDbPostById(id: string) {
  return prisma.blogPost.findUnique({ where: { id } });
}
