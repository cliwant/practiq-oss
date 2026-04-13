"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";

interface PostMeta {
  slug: string;
  title: string;
  date: string;
  author: string;
  excerpt: string;
  tags: string[];
  readingTime: string;
  category: string;
}

const CATEGORIES = ["All", "Accounting", "Law", "Consulting", "HR", "Agency"] as const;
const POSTS_PER_PAGE = 12;

export function BlogListing({ posts }: { posts: PostMeta[] }) {
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(POSTS_PER_PAGE);

  const filtered = useMemo(() => {
    return posts.filter((post) => {
      const matchesCategory =
        activeCategory === "All" || post.category === activeCategory;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        post.title.toLowerCase().includes(q) ||
        post.excerpt.toLowerCase().includes(q) ||
        post.tags.some((tag) => tag.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [posts, activeCategory, searchQuery]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  return (
    <>
      {/* Search */}
      <div className="relative max-w-md mx-auto mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Search articles..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setVisibleCount(POSTS_PER_PAGE);
          }}
          className="w-full bg-bg-surface border border-border-subtle rounded-xl pl-10 pr-4 py-3 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors"
        />
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2 justify-center mb-10">
        {CATEGORIES.map((cat) => {
          const count =
            cat === "All"
              ? posts.length
              : posts.filter((p) => p.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => {
                setActiveCategory(cat);
                setVisibleCount(POSTS_PER_PAGE);
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                activeCategory === cat
                  ? "bg-zinc-100 text-zinc-950"
                  : "bg-zinc-800/60 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
              }`}
            >
              {cat} <span className="ml-1 opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Results count */}
      {searchQuery && (
        <p className="text-center text-sm text-zinc-500 mb-6">
          {filtered.length} {filtered.length === 1 ? "result" : "results"} for &ldquo;{searchQuery}&rdquo;
        </p>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {visible.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="group bento-card p-7 flex flex-col justify-between hover:border-zinc-600 transition-all"
          >
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 uppercase tracking-wider font-bold">
                  {post.category}
                </span>
                <time className="text-xs text-zinc-500">
                  {new Date(post.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </time>
                <span className="text-xs text-zinc-600">&middot;</span>
                <span className="text-xs text-zinc-500">{post.readingTime}</span>
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

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-16">
          <p className="text-zinc-500">No articles found. Try a different search or category.</p>
        </div>
      )}

      {/* Load More */}
      {hasMore && (
        <div className="text-center mt-10">
          <button
            onClick={() => setVisibleCount((v) => v + POSTS_PER_PAGE)}
            className="px-8 py-3 rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors text-sm font-medium"
          >
            Load more ({filtered.length - visibleCount} remaining)
          </button>
        </div>
      )}
    </>
  );
}
