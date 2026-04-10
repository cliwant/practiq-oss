import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BLOG_POSTS } from "@/data/blog";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";

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
  return {
    title: post.title,
    description: post.ogDescription,
    openGraph: {
      title: post.title,
      description: post.ogDescription,
      type: "article",
      publishedTime: post.date,
      authors: [post.author],
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  if (!post) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    datePublished: post.date,
    author: { "@type": "Person", name: post.author },
    publisher: {
      "@type": "Organization",
      name: "Firmem",
      url: "https://firmem.com",
    },
    description: post.ogDescription,
  };

  return (
    <div className="min-h-screen bg-bg-base">
      <Nav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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

          <div
            className="prose-dark"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          <hr className="border-zinc-800 my-12" />

          <div className="text-center">
            <p className="text-zinc-400 mb-4">
              Ready to see how Firmem can help your firm?
            </p>
            <Link href="/#cta" className="btn-premium inline-flex items-center gap-2 py-3 px-8 text-sm">
              Request Early Access
            </Link>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
