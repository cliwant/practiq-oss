"use client";

/**
 * Create / edit form for DB-managed blog posts. Wraps the TipTap rich
 * editor plus the structured metadata fields (slug, excerpt, tags,
 * category, etc.). Auto-slugifies the title when slug is left untouched.
 */
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RichEditor } from "./rich-editor";

export interface BlogFormValues {
  id?: string;
  slug: string;
  title: string;
  excerpt: string;
  ogDescription: string;
  content: string;
  tagsText: string; // comma-separated for editing
  category: string;
  author: string;
  date: string; // yyyy-mm-dd
  readingTime: string;
  keyTakeawaysText: string; // newline-separated
  status: "draft" | "published";
}

const CATEGORIES = ["Accounting", "Law", "Consulting", "HR", "Agency", "General"];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

export function PostForm({
  initial,
  mode,
}: {
  initial: BlogFormValues;
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const [values, setValues] = useState<BlogFormValues>(initial);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Track unsaved-changes so the Preview button can warn the operator
  // that the preview will show the last *saved* version, not what's in
  // the editor right now.
  const [dirty, setDirty] = useState(false);

  // Auto-slugify from title when slug field hasn't been touched.
  useEffect(() => {
    if (!slugTouched) {
      setValues((v) => ({ ...v, slug: slugify(v.title) }));
    }
  }, [values.title, slugTouched]);

  const wordCount = useMemo(() => {
    const text = values.content.replace(/<[^>]+>/g, " ");
    return text.split(/\s+/).filter(Boolean).length;
  }, [values.content]);

  function update<K extends keyof BlogFormValues>(key: K, val: BlogFormValues[K]) {
    setValues((v) => ({ ...v, [key]: val }));
    setDirty(true);
  }

  function handlePreview() {
    if (!values.id) return;
    if (dirty) {
      const ok = window.confirm(
        "You have unsaved changes. Preview will show the last saved version. Continue?",
      );
      if (!ok) return;
    }
    window.open(`/admin/blog/preview/${values.id}`, "_blank", "noopener");
  }

  async function submit(targetStatus: "draft" | "published") {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: values.title,
        slug: values.slug,
        excerpt: values.excerpt,
        ogDescription: values.ogDescription || null,
        content: values.content,
        tags: values.tagsText
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        category: values.category || null,
        author: values.author,
        date: values.date,
        readingTime: values.readingTime,
        keyTakeaways: values.keyTakeawaysText
          .split("\n")
          .map((t) => t.trim())
          .filter(Boolean),
        status: targetStatus,
      };

      const url =
        mode === "create" ? "/api/admin/blog" : `/api/admin/blog/${values.id}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error ?? `Save failed (${res.status})`);
        setSaving(false);
        return;
      }

      setDirty(false);
      router.push("/admin/blog");
      router.refresh();
    } catch (e) {
      setError(String(e));
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!values.id) return;
    if (!window.confirm(`Permanently delete "${values.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/blog/${values.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`Delete failed: ${err.error ?? res.status}`);
        setDeleting(false);
        return;
      }
      router.push("/admin/blog");
      router.refresh();
    } catch (e) {
      alert(`Delete failed: ${String(e)}`);
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <header className="mb-8">
        <Link
          href="/admin/blog"
          className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          ← All posts
        </Link>
        <h1 className="mt-3 text-2xl md:text-3xl font-black text-zinc-100 tracking-tight">
          {mode === "create" ? "New post" : "Edit post"}
        </h1>
      </header>

      {error && (
        <div className="mb-6 p-4 rounded-xl border border-red-500/40 bg-red-500/10 text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-6">
        <Field label="Title">
          <input
            type="text"
            value={values.title}
            onChange={(e) => update("title", e.target.value)}
            className="input-premium w-full text-lg"
            placeholder="The 50-Client Ceiling: Why Boutique Firms Cap Out"
          />
        </Field>

        <Field
          label="Slug"
          hint={`Published at /blog/${values.slug || "<slug>"}. Edit to override the auto-generated value.`}
        >
          <input
            type="text"
            value={values.slug}
            onChange={(e) => {
              setSlugTouched(true);
              update("slug", slugify(e.target.value));
            }}
            className="input-premium w-full font-mono text-sm"
            placeholder="fifty-client-ceiling"
          />
        </Field>

        <Field label="Excerpt" hint="1-3 sentence summary for the listing page.">
          <textarea
            value={values.excerpt}
            onChange={(e) => update("excerpt", e.target.value)}
            className="input-premium w-full min-h-[80px] text-sm"
            placeholder="What this post is about, in 1-3 sentences."
          />
        </Field>

        <Field
          label="OG Description"
          hint="Optional. Falls back to excerpt if blank."
        >
          <textarea
            value={values.ogDescription}
            onChange={(e) => update("ogDescription", e.target.value)}
            className="input-premium w-full min-h-[60px] text-sm"
            placeholder="(Optional) social/SEO description override"
          />
        </Field>

        <Field
          label="Content"
          hint={`${wordCount} words · est. ${Math.max(1, Math.round(wordCount / 220))} min read`}
        >
          <RichEditor
            value={values.content}
            onChange={(html) => update("content", html)}
          />
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Field label="Tags" hint="Comma-separated.">
            <input
              type="text"
              value={values.tagsText}
              onChange={(e) => update("tagsText", e.target.value)}
              className="input-premium w-full text-sm"
              placeholder="Accounting, Practice Management"
            />
          </Field>

          <Field label="Category">
            <select
              value={values.category}
              onChange={(e) => update("category", e.target.value)}
              className="input-premium w-full text-sm"
            >
              <option value="">— pick one —</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Author">
            <input
              type="text"
              value={values.author}
              onChange={(e) => update("author", e.target.value)}
              className="input-premium w-full text-sm"
              placeholder="Practiq Team"
            />
          </Field>

          <Field label="Publish date">
            <input
              type="date"
              value={values.date}
              onChange={(e) => update("date", e.target.value)}
              className="input-premium w-full text-sm font-mono"
            />
          </Field>

          <Field
            label="Reading time"
            hint="Auto-calculated. Override if needed."
          >
            <input
              type="text"
              value={values.readingTime}
              onChange={(e) => update("readingTime", e.target.value)}
              className="input-premium w-full text-sm"
              placeholder={`${Math.max(1, Math.round(wordCount / 220))} min read`}
            />
          </Field>
        </div>

        <Field
          label="Key takeaways"
          hint="3-5 bullets. One per line. Shows above the post + emitted as JSON-LD."
        >
          <textarea
            value={values.keyTakeawaysText}
            onChange={(e) => update("keyTakeawaysText", e.target.value)}
            className="input-premium w-full min-h-[100px] text-sm font-mono"
            placeholder={`Boutique firms hit a ceiling around 50 clients per partner.\nThe ceiling is structural, not staffing.\nThree levers move it: ...`}
          />
        </Field>

        <div className="flex items-center justify-between pt-6 border-t border-zinc-800">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => submit("draft")}
              disabled={saving}
              className="btn-outline py-2.5 px-5 text-sm disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save draft"}
            </button>
            {mode === "edit" && values.id && (
              <button
                type="button"
                onClick={handlePreview}
                className="text-sm text-zinc-300 hover:text-white transition-colors py-2.5 px-3"
                title={
                  dirty
                    ? "Opens last saved version (unsaved changes won't show)"
                    : "Open draft preview in new tab"
                }
              >
                Preview{dirty && <span className="ml-1 text-amber-400">●</span>}
              </button>
            )}
            <button
              type="button"
              onClick={() => submit("published")}
              disabled={saving || !values.title || !values.excerpt}
              className="btn-premium py-2.5 px-5 text-sm disabled:opacity-50"
            >
              {values.status === "published" ? "Update published post" : "Publish"}
            </button>
          </div>
          {mode === "edit" && values.id && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="text-sm text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Delete post"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block mb-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
          {label}
        </span>
        {hint && <span className="ml-3 text-xs text-zinc-600">{hint}</span>}
      </label>
      {children}
    </div>
  );
}
