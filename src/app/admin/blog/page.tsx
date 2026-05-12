/**
 * /admin/blog — index listing of every post (DB + file-based).
 *
 * File-based posts (legacy src/data/blog/posts/*.ts) appear with a
 * "code-managed" badge and no edit/delete actions — those still
 * require a code change. DB posts get full CRUD via /admin/blog/[id]/edit.
 */
import Link from "next/link";
import { getAllPostsForAdmin, type BlogPostWithSource } from "@/lib/blog/get-posts";

export const dynamic = "force-dynamic";

export default async function AdminBlogIndex() {
  const { posts, dbError } = await getAllPostsForAdmin();

  const dbPosts = posts.filter((p) => p.source === "db");
  const filePosts = posts.filter((p) => p.source === "file");

  const dbPublished = dbPosts.filter((p) => p.status === "published").length;
  const dbDrafts = dbPosts.filter((p) => p.status === "draft").length;

  return (
    <div className="max-w-6xl mx-auto py-12 px-6">
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-2">
            Content management
          </p>
          <h1 className="text-3xl md:text-4xl font-black text-zinc-100 tracking-tight mb-3">
            Blog
          </h1>
          <p className="text-zinc-400 max-w-xl text-sm leading-relaxed">
            Author, edit, and publish posts without a redeploy. Code-managed
            posts in <code className="text-zinc-300">src/data/blog/posts/</code>{" "}
            still require a code change.
          </p>
        </div>
        <Link
          href="/admin/blog/new"
          className="btn-premium inline-flex items-center gap-2 py-2.5 px-5 text-sm self-start md:self-auto"
        >
          + New post
        </Link>
      </header>

      {dbError && (
        <div className="mb-8 p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-200 text-sm">
          <strong className="font-bold">DB unavailable</strong> — showing
          code-managed posts only. Authoring new posts requires a working DB
          connection. Last error:{" "}
          <code className="text-amber-300">{dbError}</code>
        </div>
      )}

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
        <Stat label="Published (DB)" value={dbPublished} accent="emerald" />
        <Stat label="Drafts" value={dbDrafts} accent="amber" />
        <Stat label="Code-managed" value={filePosts.length} accent="zinc" />
        <Stat label="Total visible" value={dbPublished + filePosts.length} accent="zinc" />
      </section>

      {dbPosts.length > 0 && (
        <Section title="DB-managed posts" subtitle="Editable here. Publish/unpublish without a redeploy.">
          <PostsTable posts={dbPosts} editable />
        </Section>
      )}

      <Section
        title={`Code-managed posts (${filePosts.length})`}
        subtitle="Source: src/data/blog/posts/*.ts — edits require a code change + deploy."
      >
        <PostsTable posts={filePosts.slice(0, 50)} editable={false} />
        {filePosts.length > 50 && (
          <p className="mt-3 text-xs text-zinc-600 text-center">
            Showing first 50 of {filePosts.length} code-managed posts.
          </p>
        )}
      </Section>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "emerald" | "amber" | "zinc";
}) {
  const accentClass =
    accent === "emerald"
      ? "text-emerald-400"
      : accent === "amber"
        ? "text-amber-400"
        : "text-zinc-100";
  return (
    <div className="bento-card p-5">
      <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
        {label}
      </div>
      <div className={`text-3xl font-black ${accentClass}`}>{value}</div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-12">
      <h2 className="text-lg font-bold text-zinc-100 mb-1">{title}</h2>
      {subtitle && <p className="text-xs text-zinc-500 mb-4">{subtitle}</p>}
      {children}
    </section>
  );
}

function PostsTable({
  posts,
  editable,
}: {
  posts: BlogPostWithSource[];
  editable: boolean;
}) {
  if (posts.length === 0) {
    return (
      <div className="bento-card p-8 text-center text-sm text-zinc-500">
        No posts yet.
      </div>
    );
  }

  return (
    <div className="bento-card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-zinc-900/50 border-b border-zinc-800">
          <tr>
            <Th>Title</Th>
            <Th>Slug</Th>
            <Th>Status</Th>
            <Th>Category</Th>
            <Th>Date</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {posts.map((p) => (
            <tr
              key={p.slug}
              className="border-b border-zinc-900 last:border-b-0 hover:bg-zinc-900/30"
            >
              <td className="px-4 py-3 align-top">
                <div className="text-zinc-100 font-medium">{p.title}</div>
                <div className="text-xs text-zinc-500 mt-0.5 line-clamp-1">
                  {p.excerpt}
                </div>
              </td>
              <td className="px-4 py-3 align-top">
                <code className="text-xs text-zinc-400 break-all">{p.slug}</code>
              </td>
              <td className="px-4 py-3 align-top">
                <StatusBadge source={p.source} status={p.status} />
              </td>
              <td className="px-4 py-3 align-top text-zinc-400 text-xs">
                {p.category}
              </td>
              <td className="px-4 py-3 align-top text-zinc-500 text-xs font-mono">
                {p.date}
              </td>
              <td className="px-4 py-3 align-top">
                {editable && p.id ? (
                  <div className="flex flex-col gap-1 text-xs">
                    <Link
                      href={`/admin/blog/${p.id}/edit`}
                      className="text-zinc-300 hover:text-white"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/admin/blog/preview/${p.id}`}
                      target="_blank"
                      className="text-zinc-400 hover:text-zinc-200"
                    >
                      Preview
                    </Link>
                    {p.status === "published" && (
                      <Link
                        href={`/blog/${p.slug}`}
                        target="_blank"
                        className="text-zinc-500 hover:text-zinc-300"
                      >
                        View live
                      </Link>
                    )}
                  </div>
                ) : (
                  <Link
                    href={`/blog/${p.slug}`}
                    target="_blank"
                    className="text-xs text-zinc-500 hover:text-zinc-300"
                  >
                    View
                  </Link>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
      {children}
    </th>
  );
}

function StatusBadge({
  source,
  status,
}: {
  source: "db" | "file";
  status?: "draft" | "published";
}) {
  if (source === "file") {
    return (
      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-zinc-800 text-zinc-400">
        Code-managed
      </span>
    );
  }
  if (status === "published") {
    return (
      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-emerald-500/20 text-emerald-400">
        Published
      </span>
    );
  }
  return (
    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-amber-500/20 text-amber-400">
      Draft
    </span>
  );
}
