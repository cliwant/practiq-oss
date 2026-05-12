/**
 * /admin/blog/preview/[id] — admin-gated draft preview.
 *
 * Renders a DB blog post (draft OR published) using the exact same
 * markup as the public /blog/[slug] route, wrapped in a sticky "DRAFT
 * PREVIEW" banner so the operator can see how the post will look once
 * it's live.
 *
 * Auth:
 *   - Middleware enforces the admin host gate + admin cookie. Without
 *     that this returns 404 (public hosts) or 307 → /admin/login (admin
 *     host, no cookie).
 *   - This route additionally calls verifySession() as defense-in-depth
 *     so the response is a clean 401 if middleware is misconfigured.
 *
 * Lookup is by BlogPost.id (NOT slug) so drafts with unfinalized slugs
 * still work. force-dynamic so every visit reflects the latest saved
 * version (no stale ISR cache during editing).
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/admin-auth";
import { BlogPostRender } from "@/components/blog/blog-post-render";
import { PublishButton } from "@/components/admin/blog/preview-banner-actions";
import type { BlogPost, BlogCategory } from "@/data/blog/types";

export const dynamic = "force-dynamic";

// Draft URLs must never end up in a search index.
export const metadata: Metadata = {
  title: "Draft preview",
  robots: { index: false, follow: false, nocache: true, noarchive: true },
};

const ADMIN_COOKIE = "practiq_admin_session";

interface Props {
  params: Promise<{ id: string }>;
}

function estimateReadingTime(html: string): string {
  const text = html.replace(/<[^>]+>/g, " ");
  const words = text.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 220));
  return `${minutes} min read`;
}

function normalizeCategory(cat: string | null): BlogCategory {
  if (!cat) return "General";
  const allowed: BlogCategory[] = [
    "Accounting",
    "Law",
    "Consulting",
    "HR",
    "Agency",
    "General",
  ];
  const titled = cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();
  return (allowed.includes(titled as BlogCategory)
    ? titled
    : "General") as BlogCategory;
}

export default async function PreviewPage({ params }: Props) {
  // Defense-in-depth: verify the admin cookie ourselves on top of the
  // middleware gate. If the cookie is missing or expired, return the
  // standard 404 so the route's existence isn't leaked.
  const cookieStore = await cookies();
  const cookieVal = cookieStore.get(ADMIN_COOKIE)?.value;
  const session = await verifySession(cookieVal);
  if (!session) notFound();

  const { id } = await params;
  const row = await prisma.blogPost.findUnique({ where: { id } });
  if (!row) notFound();

  // Coerce the DB row into the in-memory BlogPost shape the public
  // renderer expects. Identical to the projection in get-posts.ts but
  // inlined here so the preview surface remains independent.
  const post: BlogPost = {
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
    category: normalizeCategory(row.category),
    keyTakeaways: row.keyTakeaways.length > 0 ? row.keyTakeaways : undefined,
  };

  const isDraft = row.status !== "published";
  const lastSaved = row.updatedAt.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  // Detect host so the "Open public URL" link goes to the right place
  // for published posts. Admin host has no /blog route — point at the
  // marketing host.
  const headerStore = await headers();
  const adminHost = headerStore.get("host") ?? "";
  const publicBase =
    adminHost.includes("admin.grindworks.ai")
      ? "https://practiq.dev"
      : "";

  return (
    <>
      <DraftBanner
        id={row.id}
        slug={row.slug}
        isDraft={isDraft}
        lastSaved={lastSaved}
        publicBase={publicBase}
      />
      <BlogPostRender post={post} />
    </>
  );
}

function DraftBanner({
  id,
  slug,
  isDraft,
  lastSaved,
  publicBase,
}: {
  id: string;
  slug: string;
  isDraft: boolean;
  lastSaved: string;
  publicBase: string;
}) {
  return (
    <div
      className={`sticky top-0 z-50 border-b ${
        isDraft
          ? "bg-amber-500/10 border-amber-500/40"
          : "bg-emerald-500/10 border-emerald-500/40"
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-sm">
          <span
            className={`text-[10px] font-bold uppercase tracking-[0.2em] px-2 py-1 rounded ${
              isDraft
                ? "bg-amber-500/20 text-amber-300"
                : "bg-emerald-500/20 text-emerald-300"
            }`}
          >
            {isDraft ? "Draft preview" : "Published preview"}
          </span>
          <span className="text-zinc-300 hidden sm:inline">
            /blog/<code className="text-zinc-100">{slug}</code>
          </span>
          <span className="text-zinc-500 hidden md:inline">
            Last saved: {lastSaved}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/blog/${id}/edit`}
            className="text-xs px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            Edit
          </Link>
          {isDraft ? (
            <PublishButton id={id} />
          ) : (
            <Link
              href={`${publicBase}/blog/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-3 py-1.5 rounded-lg bg-zinc-100 text-zinc-950 font-bold hover:bg-white transition-colors"
            >
              Open public URL
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
