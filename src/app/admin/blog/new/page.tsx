/**
 * /admin/blog/new — create a new DB blog post.
 */
import { PostForm, type BlogFormValues } from "@/components/admin/blog/post-form";

export const dynamic = "force-dynamic";

export default function NewPostPage() {
  const today = new Date().toISOString().slice(0, 10);
  const initial: BlogFormValues = {
    slug: "",
    title: "",
    excerpt: "",
    ogDescription: "",
    content: "",
    tagsText: "",
    category: "General",
    author: "Practiq Team",
    date: today,
    readingTime: "",
    keyTakeawaysText: "",
    status: "draft",
  };

  return <PostForm initial={initial} mode="create" />;
}
