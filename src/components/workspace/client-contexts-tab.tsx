"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Pin,
  Search,
  Plus,
  Trash2,
  Filter,
  X,
  Save,
  PinOff,
  Pencil,
} from "lucide-react";
import { formatDistance } from "@/lib/format-time";
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  type ContextCategory,
  type ContextItem,
} from "./types";

/**
 * Contexts (Knowledge) tab. Two-pane:
 *   - Left: filterable list of every context entry (pinned first).
 *   - Right: detail view for the selected entry + inline editor.
 *
 * New-entry flow opens a full-width inline form at the top of the list,
 * no modal — operators can reference surrounding entries while they type.
 * Pin toggling is one click and optimistic (no spinner flash).
 */
export function ClientContextsTab({
  clientId,
  contexts,
  onChange,
}: {
  clientId: string;
  contexts: ContextItem[];
  onChange: (contexts: ContextItem[]) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(
    contexts[0]?.id ?? null,
  );
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ContextCategory | "all">(
    "all",
  );
  const [composing, setComposing] = useState(false);
  const [editing, setEditing] = useState<ContextItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected =
    contexts.find((c) => c.id === selectedId) ?? contexts[0] ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return contexts.filter((c) => {
      if (categoryFilter !== "all" && c.category !== categoryFilter)
        return false;
      if (!q) return true;
      return (
        c.title.toLowerCase().includes(q) ||
        c.content.toLowerCase().includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [contexts, query, categoryFilter]);

  const create = async (draft: {
    title: string;
    content: string;
    category: string;
    isPinned: boolean;
    tags: string[];
  }) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/contexts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `${res.status}`);
      }
      const { context } = await res.json();
      const added: ContextItem = {
        id: context.id,
        title: context.title,
        content: context.content,
        category: context.category,
        tags: context.tags ?? [],
        isPinned: context.isPinned,
        updatedAt: context.updatedAt,
      };
      onChange([added, ...contexts]);
      setSelectedId(added.id);
      setComposing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const update = async (id: string, patch: Partial<ContextItem>) => {
    // Optimistic update for pin/unpin and field edits.
    const prev = contexts;
    const next = contexts.map((c) =>
      c.id === id ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c,
    );
    onChange(next);
    try {
      const res = await fetch(
        `/api/clients/${clientId}/contexts/${id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        },
      );
      if (!res.ok) throw new Error("update failed");
    } catch (e) {
      // Revert on failure.
      onChange(prev);
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this context entry? The agent will stop seeing it.")) return;
    const prev = contexts;
    const next = contexts.filter((c) => c.id !== id);
    onChange(next);
    if (selectedId === id) setSelectedId(next[0]?.id ?? null);
    try {
      const res = await fetch(
        `/api/clients/${clientId}/contexts/${id}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("delete failed");
    } catch (e) {
      onChange(prev);
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="flex h-full">
      {/* ─── List pane ────────────────────────────────────────── */}
      <aside className="flex h-full w-[360px] shrink-0 flex-col border-r border-zinc-900 bg-[#070707]">
        <div className="border-b border-zinc-900 p-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search knowledge..."
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-7 py-1.5 pr-7 text-[12.5px] text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <Filter className="h-3 w-3 text-zinc-600" />
            <select
              value={categoryFilter}
              onChange={(e) =>
                setCategoryFilter(e.target.value as ContextCategory | "all")
              }
              className="flex-1 rounded-md border border-zinc-800 bg-zinc-900/40 px-2 py-1 text-[11.5px] text-zinc-300 focus:outline-none"
            >
              <option value="all">All categories</option>
              {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                setComposing(true);
                setEditing(null);
              }}
              className="flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-1 text-[11px] font-semibold text-zinc-950 transition-all hover:bg-white"
            >
              <Plus className="h-3 w-3" />
              New
            </button>
          </div>
        </div>

        <ul className="flex-1 overflow-y-auto p-2">
          {filtered.length === 0 && (
            <li className="px-2 py-8 text-center text-[12px] text-zinc-600">
              {contexts.length === 0
                ? "No context yet. Click 'New' to add one."
                : "No matches."}
            </li>
          )}
          {filtered.map((ctx) => {
            const cat = (ctx.category as ContextCategory) in CATEGORY_COLORS
              ? (ctx.category as ContextCategory)
              : ("note" as ContextCategory);
            const color = CATEGORY_COLORS[cat];
            const active = ctx.id === selected?.id;
            return (
              <li key={ctx.id}>
                <button
                  onClick={() => {
                    setSelectedId(ctx.id);
                    setEditing(null);
                    setComposing(false);
                  }}
                  className={`mb-0.5 flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition-colors ${
                    active
                      ? "bg-zinc-800/80"
                      : "hover:bg-zinc-900/60"
                  }`}
                >
                  <span
                    className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: color }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[12.5px] font-medium text-zinc-100">
                        {ctx.title}
                      </span>
                      {ctx.isPinned && (
                        <Pin className="h-2.5 w-2.5 shrink-0 text-zinc-500" />
                      )}
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-zinc-600">
                      {ctx.content.slice(0, 80)}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* ─── Detail pane ───────────────────────────────────────── */}
      <section className="flex-1 overflow-y-auto bg-[#050505]">
        <AnimatePresence mode="wait">
          {composing ? (
            <motion.div
              key="composing"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
            >
              <ContextEditor
                mode="create"
                busy={busy}
                onCancel={() => setComposing(false)}
                onSave={create}
                error={error}
              />
            </motion.div>
          ) : editing ? (
            <motion.div
              key={`editing-${editing.id}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
            >
              <ContextEditor
                mode="edit"
                initial={editing}
                busy={busy}
                error={error}
                onCancel={() => setEditing(null)}
                onSave={async (draft) => {
                  setBusy(true);
                  try {
                    await update(editing.id, draft);
                    setEditing(null);
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            </motion.div>
          ) : selected ? (
            <motion.div
              key={selected.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
            >
              <ContextDetail
                ctx={selected}
                onPin={() =>
                  update(selected.id, { isPinned: !selected.isPinned })
                }
                onEdit={() => setEditing(selected)}
                onDelete={() => remove(selected.id)}
              />
            </motion.div>
          ) : (
            <div className="flex h-full items-center justify-center text-[12px] text-zinc-600">
              Select a context entry on the left.
            </div>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
}

function ContextDetail({
  ctx,
  onPin,
  onEdit,
  onDelete,
}: {
  ctx: ContextItem;
  onPin: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const cat = (ctx.category as ContextCategory) in CATEGORY_COLORS
    ? (ctx.category as ContextCategory)
    : ("note" as ContextCategory);
  const color = CATEGORY_COLORS[cat];
  const label = CATEGORY_LABELS[cat];

  return (
    <div className="mx-auto max-w-3xl px-10 py-8">
      <div className="mb-4 flex items-start justify-between gap-6">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2">
            <span
              className="rounded-md px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider"
              style={{ color, background: `${color}15` }}
            >
              {label}
            </span>
            {ctx.isPinned && (
              <span className="flex items-center gap-1 text-[10.5px] font-semibold text-zinc-500">
                <Pin className="h-2.5 w-2.5" />
                Pinned
              </span>
            )}
            <span className="text-[10.5px] text-zinc-600">
              · updated {formatDistance(ctx.updatedAt)}
            </span>
          </div>
          <h2 className="text-[20px] font-bold leading-tight text-zinc-100">
            {ctx.title}
          </h2>
          {ctx.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {ctx.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-md bg-zinc-900 px-1.5 py-0.5 text-[10.5px] text-zinc-500"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <IconBtn
            onClick={onPin}
            title={ctx.isPinned ? "Unpin" : "Pin to system prompt"}
            icon={ctx.isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
          />
          <IconBtn
            onClick={onEdit}
            title="Edit"
            icon={<Pencil className="h-3.5 w-3.5" />}
          />
          <IconBtn
            onClick={onDelete}
            title="Delete"
            icon={<Trash2 className="h-3.5 w-3.5" />}
            danger
          />
        </div>
      </div>

      <div className="whitespace-pre-wrap break-words text-[13.5px] leading-relaxed text-zinc-300">
        {ctx.content}
      </div>
    </div>
  );
}

function ContextEditor({
  mode,
  initial,
  busy,
  error,
  onCancel,
  onSave,
}: {
  mode: "create" | "edit";
  initial?: ContextItem;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onSave: (draft: {
    title: string;
    content: string;
    category: string;
    isPinned: boolean;
    tags: string[];
  }) => void | Promise<void>;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [category, setCategory] = useState<string>(
    initial?.category ?? "note",
  );
  const [isPinned, setIsPinned] = useState(initial?.isPinned ?? false);
  const [tagsText, setTagsText] = useState(
    (initial?.tags ?? []).join(", "),
  );

  const canSave =
    title.trim().length > 0 && content.trim().length > 0 && !busy;

  return (
    <div className="mx-auto max-w-3xl px-10 py-8">
      <h2 className="mb-5 text-[11.5px] font-bold uppercase tracking-widest text-zinc-500">
        {mode === "create" ? "New context" : "Edit context"}
      </h2>

      <div className="space-y-4">
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="E.g. Owner communication style"
            className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-[14px] text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-3">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-[13px] text-zinc-100 focus:border-zinc-600 focus:outline-none"
            >
              {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <label className="flex cursor-pointer items-end gap-2 pb-2 text-[12.5px] text-zinc-400">
            <input
              type="checkbox"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className="h-3.5 w-3.5 accent-zinc-400"
            />
            Pin to system prompt
          </label>
        </div>

        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Content
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={10}
            placeholder="The agent will see this verbatim when working with this client."
            className="mt-1 w-full resize-y rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-[13px] leading-relaxed text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Tags (comma-separated)
          </label>
          <input
            type="text"
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            placeholder="e.g. profile, pinned, financial"
            className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-[13px] text-zinc-300 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
          />
        </div>

        {error && (
          <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-[12px] text-red-300">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-zinc-800 px-4 py-2 text-[12.5px] font-medium text-zinc-300 transition-colors hover:border-zinc-700 hover:text-zinc-100"
          >
            Cancel
          </button>
          <button
            disabled={!canSave}
            onClick={() =>
              onSave({
                title: title.trim(),
                content: content.trim(),
                category,
                isPinned,
                tags: tagsText
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean),
              })
            }
            className="flex items-center gap-2 rounded-lg bg-zinc-100 px-4 py-2 text-[12.5px] font-semibold text-zinc-950 transition-all hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            {busy ? "Saving..." : mode === "create" ? "Create" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function IconBtn({
  onClick,
  title,
  icon,
  danger,
}: {
  onClick: () => void;
  title: string;
  icon: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`rounded-lg border border-zinc-900 bg-[#0a0a0a] p-2 transition-colors ${
        danger
          ? "text-zinc-500 hover:border-red-500/30 hover:bg-red-500/5 hover:text-red-400"
          : "text-zinc-500 hover:border-zinc-700 hover:text-zinc-200"
      }`}
    >
      {icon}
    </button>
  );
}
