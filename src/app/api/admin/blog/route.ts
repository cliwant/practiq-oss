/**
 * /api/admin/blog
 *   GET  — list DB blog posts (newest first)
 *   POST — create a new DB blog post (defaults to status="draft")
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, slugify, estimateReadingTime } from "./_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "100", 10), 500);
  const status = url.searchParams.get("status"); // "draft" | "published" | null

  const rows = await prisma.blogPost.findMany({
    where: status ? { status } : undefined,
    orderBy: { updatedAt: "desc" },
    take: limit,
  });

  return NextResponse.json({ posts: rows });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

  const content = typeof body.content === "string" ? body.content : "";
  const excerpt = typeof body.excerpt === "string" ? body.excerpt.trim() : "";
  if (!excerpt) {
    return NextResponse.json({ error: "excerpt required" }, { status: 400 });
  }

  // Slug: explicit > slugify(title). Ensure uniqueness.
  const rawSlug =
    typeof body.slug === "string" && body.slug.trim().length > 0
      ? slugify(body.slug)
      : slugify(title);
  if (!rawSlug) {
    return NextResponse.json({ error: "could not derive slug" }, { status: 400 });
  }

  // Check collision (both DB and file posts share the public URL space).
  const existing = await prisma.blogPost.findUnique({ where: { slug: rawSlug } });
  if (existing) {
    return NextResponse.json({ error: "slug already taken" }, { status: 409 });
  }

  const status =
    body.status === "published" || body.status === "draft" ? body.status : "draft";

  const tagsInput = Array.isArray(body.tags) ? body.tags : [];
  const tags = tagsInput
    .filter((t): t is string => typeof t === "string")
    .map((t) => t.trim())
    .filter(Boolean);

  const keyTakeawaysInput = Array.isArray(body.keyTakeaways) ? body.keyTakeaways : [];
  const keyTakeaways = keyTakeawaysInput
    .filter((t): t is string => typeof t === "string")
    .map((t) => t.trim())
    .filter(Boolean);

  const post = await prisma.blogPost.create({
    data: {
      slug: rawSlug,
      title,
      excerpt,
      content,
      tags,
      keyTakeaways,
      category: typeof body.category === "string" ? body.category : null,
      author: typeof body.author === "string" && body.author ? body.author : "Practiq Team",
      ogDescription:
        typeof body.ogDescription === "string" ? body.ogDescription : null,
      readingTime:
        typeof body.readingTime === "string" && body.readingTime
          ? body.readingTime
          : estimateReadingTime(content),
      date:
        typeof body.date === "string" && body.date
          ? new Date(body.date)
          : new Date(),
      status,
      publishedAt: status === "published" ? new Date() : null,
      createdById: auth.email,
    },
  });

  return NextResponse.json({ post }, { status: 201 });
}
