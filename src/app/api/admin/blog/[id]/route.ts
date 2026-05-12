/**
 * /api/admin/blog/[id]
 *   GET    — read a single DB post
 *   PATCH  — update fields (title, slug, content, status, etc.)
 *            Slug changes push the old slug onto previousSlugs[] so
 *            /blog/<oldSlug> 301-redirects to the canonical URL.
 *   DELETE — hard delete (admin UI confirms first).
 */
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin, slugify, estimateReadingTime } from "../_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: Ctx) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const post = await prisma.blogPost.findUnique({ where: { id } });
  if (!post) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ post });
}

export async function PATCH(request: NextRequest, context: Ctx) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const current = await prisma.blogPost.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ error: "not found" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  // Build update payload — only fields actually present in body.
  const data: Record<string, unknown> = {};

  if (typeof body.title === "string") data.title = body.title.trim();
  if (typeof body.excerpt === "string") data.excerpt = body.excerpt.trim();
  if (typeof body.content === "string") data.content = body.content;
  if (typeof body.category === "string" || body.category === null)
    data.category = body.category;
  if (typeof body.author === "string") data.author = body.author;
  if (typeof body.ogDescription === "string" || body.ogDescription === null)
    data.ogDescription = body.ogDescription;
  if (typeof body.readingTime === "string") data.readingTime = body.readingTime;
  if (typeof body.date === "string") data.date = new Date(body.date);

  if (Array.isArray(body.tags)) {
    data.tags = (body.tags as unknown[])
      .filter((t): t is string => typeof t === "string")
      .map((t) => t.trim())
      .filter(Boolean);
  }
  if (Array.isArray(body.keyTakeaways)) {
    data.keyTakeaways = (body.keyTakeaways as unknown[])
      .filter((t): t is string => typeof t === "string")
      .map((t) => t.trim())
      .filter(Boolean);
  }

  // Slug change → preserve old slug in previousSlugs for 301 redirect.
  let newSlug: string | undefined;
  if (typeof body.slug === "string") {
    const slug = slugify(body.slug);
    if (slug && slug !== current.slug) {
      const collision = await prisma.blogPost.findUnique({ where: { slug } });
      if (collision && collision.id !== id) {
        return NextResponse.json({ error: "slug already taken" }, { status: 409 });
      }
      data.slug = slug;
      newSlug = slug;
      // Append old slug to previousSlugs (dedupe).
      const prev = new Set(current.previousSlugs);
      prev.add(current.slug);
      data.previousSlugs = Array.from(prev);
    }
  }

  // Status flip → set publishedAt if first time published.
  if (body.status === "published" || body.status === "draft") {
    data.status = body.status;
    if (body.status === "published" && !current.publishedAt) {
      data.publishedAt = new Date();
    }
  }

  // Auto-recalc reading time if content changed and operator didn't override.
  if (typeof body.content === "string" && typeof body.readingTime !== "string") {
    data.readingTime = estimateReadingTime(body.content);
  }

  const post = await prisma.blogPost.update({ where: { id }, data });

  // Revalidate impacted public routes
  revalidatePath("/blog");
  revalidatePath(`/blog/${current.slug}`);
  if (newSlug) revalidatePath(`/blog/${newSlug}`);
  revalidatePath("/sitemap.xml");

  return NextResponse.json({ post });
}

export async function DELETE(request: NextRequest, context: Ctx) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;
  const current = await prisma.blogPost.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ error: "not found" }, { status: 404 });

  await prisma.blogPost.delete({ where: { id } });

  revalidatePath("/blog");
  revalidatePath(`/blog/${current.slug}`);
  revalidatePath("/sitemap.xml");

  return NextResponse.json({ ok: true });
}
