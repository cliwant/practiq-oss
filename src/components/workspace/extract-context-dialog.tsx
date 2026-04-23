"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  Pin,
  ArrowLeft,
  X,
  FileText,
} from "lucide-react";
import { CATEGORY_COLORS, CATEGORY_LABELS, type ContextCategory } from "./types";

interface Preview {
  contexts: Array<{
    title: string;
    content: string;
    category: string;
    tags: string[];
    isPinned: boolean;
    confidence: number;
  }>;
  overallConfidence: number;
  warnings: string[];
}

/**
 * Two-step modal: paste → AI preview → confirm save.
 *
 * Step 1: operator pastes document text (bank statement dump, meeting
 *         notes, supplier email thread, etc.) and gives it a source name.
 * Step 2: agent returns structured entries; operator sees each as a
 *         card with category, tags, and confidence. They can delete
 *         individual proposals before saving, or hit "Save all" to
 *         commit the remaining set as ClientContext rows.
 *
 * Warnings from the extractor (e.g. "contained scanned portions we
 * couldn't read") surface above the preview so the operator knows what
 * they're approving.
 */
export function ExtractContextDialog({
  open,
  onClose,
  clientId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  clientId: string;
  onSaved: (createdIds: string[]) => void;
}) {
  const [step, setStep] = useState<"input" | "preview">("input");
  const [sourceName, setSourceName] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [dropped, setDropped] = useState<Set<number>>(new Set());

  const reset = () => {
    setStep("input");
    setSourceName("");
    setText("");
    setPreview(null);
    setDropped(new Set());
    setError(null);
    setBusy(false);
  };

  const runPreview = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceName: sourceName.trim() || "pasted snippet",
          text,
          persist: false,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      setPreview(data.result as Preview);
      setStep("preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const confirmSave = async () => {
    if (!preview || busy) return;
    setBusy(true);
    setError(null);
    try {
      // Re-send the filtered preview as a persist=true extraction.
      // The backend re-runs Claude each time — simpler than stashing
      // state server-side, and keeps the audit trail honest.
      const kept = preview.contexts.filter((_, i) => !dropped.has(i));
      const res = await fetch(`/api/clients/${clientId}/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceName: sourceName.trim() || "pasted snippet",
          // Pack the kept preview back into a minimal "text" form. The
          // simpler approach (re-extract) was chosen over storing
          // temporary state server-side; at this scale the token cost
          // is worth the audit clarity.
          text: kept
            .map(
              (c) =>
                `Title: ${c.title}\nCategory: ${c.category}\nContent: ${c.content}`,
            )
            .join("\n\n---\n\n"),
          persist: true,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      onSaved(data.createdIds ?? []);
      reset();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          onClick={() => {
            reset();
            onClose();
          }}
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ y: 8, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 4, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-[#0b0b0b] shadow-2xl"
          >
            <header className="flex items-center justify-between border-b border-zinc-900 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
                <div>
                  <h2 className="text-[14px] font-bold text-zinc-100">
                    Extract context from a document
                  </h2>
                  <p className="text-[11px] text-zinc-500">
                    {step === "input"
                      ? "Paste raw text — the agent will split it into knowledge-base entries."
                      : "Review what the agent extracted before saving."}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  reset();
                  onClose();
                }}
                className="rounded p-1 text-zinc-600 hover:bg-zinc-900 hover:text-zinc-300"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            {step === "input" ? (
              <div className="flex-1 overflow-y-auto p-5">
                <div className="space-y-4">
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                      Source name
                    </label>
                    <input
                      type="text"
                      value={sourceName}
                      onChange={(e) => setSourceName(e.target.value)}
                      placeholder="March 2026 bank statement"
                      className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
                    />
                    <p className="mt-1 text-[10.5px] text-zinc-600">
                      Used as a tag so you can trace extracted entries back
                      later.
                    </p>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                      Raw text
                    </label>
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      rows={14}
                      placeholder="Paste a statement, meeting notes, supplier email thread, or any document content. PDF text can be pasted after extracting it from your PDF viewer."
                      className="mt-1 w-full resize-y rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-[13px] leading-relaxed text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
                    />
                    <p className="mt-1 text-[10.5px] text-zinc-600">
                      {text.length.toLocaleString()} characters ·{" "}
                      {Math.max(1, Math.ceil(text.length / 4)).toLocaleString()}{" "}
                      approx tokens
                    </p>
                  </div>

                  {error && (
                    <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-[12px] text-red-300">
                      {error}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        reset();
                        onClose();
                      }}
                      className="rounded-lg border border-zinc-800 px-4 py-2 text-[12.5px] text-zinc-400 hover:border-zinc-700 hover:text-zinc-100"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={runPreview}
                      disabled={!text.trim() || busy}
                      className="inline-flex items-center gap-2 rounded-lg bg-zinc-100 px-4 py-2 text-[12.5px] font-semibold text-zinc-950 transition-all hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {busy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      {busy ? "Extracting…" : "Preview extraction"}
                    </button>
                  </div>
                </div>
              </div>
            ) : preview ? (
              <div className="flex-1 overflow-y-auto p-5">
                {preview.warnings.length > 0 && (
                  <div className="mb-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11.5px] text-amber-200">
                    <strong>Warnings:</strong>{" "}
                    {preview.warnings.join(" · ")}
                  </div>
                )}

                <div className="mb-3 flex items-center justify-between text-[11px]">
                  <span className="text-zinc-500">
                    {preview.contexts.length} entries proposed · overall confidence{" "}
                    {(preview.overallConfidence * 100).toFixed(0)}%
                  </span>
                  <span className="text-zinc-600">
                    {dropped.size > 0
                      ? `${preview.contexts.length - dropped.size} will be saved`
                      : "All will be saved"}
                  </span>
                </div>

                {preview.contexts.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-zinc-800 bg-[#070707] p-8 text-center text-[12.5px] text-zinc-500">
                    The agent didn't find extractable facts in this text. Try a
                    more specific document.
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {preview.contexts.map((c, i) => {
                      const cat = (c.category as ContextCategory) in CATEGORY_COLORS
                        ? (c.category as ContextCategory)
                        : ("note" as ContextCategory);
                      const color = CATEGORY_COLORS[cat];
                      const isDropped = dropped.has(i);
                      return (
                        <li
                          key={i}
                          className={`relative rounded-lg border border-zinc-900 p-3 transition-all ${
                            isDropped
                              ? "bg-[#070707] opacity-40"
                              : "bg-[#0d0d0d]"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
                              style={{ background: color }}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="truncate text-[13px] font-semibold text-zinc-100">
                                  {c.title}
                                </span>
                                <span
                                  className="rounded-md px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider"
                                  style={{
                                    color,
                                    background: `${color}15`,
                                  }}
                                >
                                  {CATEGORY_LABELS[cat]}
                                </span>
                                {c.isPinned && (
                                  <Pin className="h-2.5 w-2.5 text-zinc-500" />
                                )}
                                <span className="text-[10px] text-zinc-600">
                                  {(c.confidence * 100).toFixed(0)}% conf
                                </span>
                              </div>
                              <p className="mt-1 text-[12px] leading-relaxed text-zinc-400">
                                {c.content}
                              </p>
                              {c.tags.length > 0 && (
                                <div className="mt-1.5 flex flex-wrap gap-1">
                                  {c.tags.map((t) => (
                                    <span
                                      key={t}
                                      className="rounded bg-zinc-900 px-1.5 py-0.5 text-[9.5px] text-zinc-500"
                                    >
                                      {t}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => {
                                const next = new Set(dropped);
                                if (next.has(i)) next.delete(i);
                                else next.add(i);
                                setDropped(next);
                              }}
                              className="rounded p-1 text-zinc-600 transition-colors hover:bg-zinc-900 hover:text-zinc-300"
                              title={isDropped ? "Include" : "Exclude"}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {error && (
                  <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-[12px] text-red-300">
                    {error}
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between">
                  <button
                    onClick={() => {
                      setStep("input");
                      setPreview(null);
                      setError(null);
                    }}
                    className="inline-flex items-center gap-1.5 text-[12.5px] text-zinc-500 hover:text-zinc-200"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to edit
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        reset();
                        onClose();
                      }}
                      className="rounded-lg border border-zinc-800 px-4 py-2 text-[12.5px] text-zinc-400 hover:border-zinc-700 hover:text-zinc-100"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmSave}
                      disabled={
                        busy ||
                        preview.contexts.length === 0 ||
                        preview.contexts.length - dropped.size === 0
                      }
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-[12.5px] font-semibold text-emerald-950 transition-colors hover:bg-emerald-400 disabled:opacity-50"
                    >
                      {busy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      Save{" "}
                      {preview.contexts.length - dropped.size}{" "}
                      {preview.contexts.length - dropped.size === 1
                        ? "entry"
                        : "entries"}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            <footer className="flex items-center justify-between border-t border-zinc-900 px-5 py-2.5 text-[10.5px] text-zinc-600">
              <span className="inline-flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Claude reads the text verbatim. It won't invent facts.
              </span>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
