import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getAllPosts } from "@/lib/blog/get-posts";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";

// Revalidate listing every 60s so a newly-published DB post appears
// within a minute without redeploy.
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Insights on running a better professional services firm — client management, productivity, and the future of AI in accounting, law, and consulting.",
  alternates: { canonical: "https://practiq.dev/blog" },
  openGraph: {
    title: "Blog | Practiq",
    description:
      "Insights on running a better professional services firm — client management, productivity, and the future of AI in accounting, law, and consulting.",
    url: "https://practiq.dev/blog",
    type: "website",
  },
};

export default async function BlogListingPage() {
  const posts = await getAllPosts();
  return (
    <div className="min-h-screen bg-bg-base">
      <Nav />
      <main id="main" className="pt-32 pb-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h1 className="text-4xl md:text-5xl font-black text-zinc-100 tracking-tight mb-4">
              Blog
            </h1>
            <p className="text-lg text-zinc-300 max-w-xl mx-auto">
              Insights on running a better professional services firm.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {posts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group bento-card p-7 flex flex-col justify-between hover:border-zinc-600 transition-all"
              >
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <time className="text-xs text-zinc-400">
                      {new Date(post.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </time>
                    <span className="text-xs text-zinc-500" aria-hidden="true">&middot;</span>
                    <span className="text-xs text-zinc-400">
                      {post.readingTime}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-zinc-100 mb-3 group-hover:text-white transition-colors leading-snug">
                    {post.title}
                  </h2>
                  <p className="text-sm text-zinc-400 leading-relaxed mb-5">
                    {post.excerpt}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    {post.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] px-2 py-1 rounded-md bg-zinc-800 text-zinc-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
