/**
 * /admin/blog/[id]/edit — edit an existing DB blog post.
 */
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PostForm, type BlogFormValues } from "@/components/admin/blog/post-form";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditPostPage({ params }: Props) {
  const { id } = await params;
  const post = await prisma.blogPost.findUnique({ where: { id } });
  if (!post) notFound();

  const initial: BlogFormValues = {
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    ogDescription: post.ogDescription ?? "",
    content: post.content,
    tagsText: post.tags.join(", "),
    category: post.category ?? "General",
    author: post.author,
    date: post.date.toISOString().slice(0, 10),
    readingTime: post.readingTime ?? "",
    keyTakeawaysText: post.keyTakeaways.join("\n"),
    status: (post.status === "published" ? "published" : "draft") as
      | "draft"
      | "published",
  };

  return <PostForm initial={initial} mode="edit" />;
}
