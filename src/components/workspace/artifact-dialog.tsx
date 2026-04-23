"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  FileText,
  Sheet,
  Sparkles,
  Loader2,
  X,
  CheckCircle2,
  Download,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

type Format = "docx" | "xlsx";

/**
 * Dialog to generate a .docx or .xlsx deliverable.
 *
 * The operator types a 1-2 sentence brief ("March monthly financial
 * statement", "Q1 payroll tax summary memo"), picks a format, and
 * fires. The agent plans the document structure from the client's
 * knowledge base and renders to disk; the modal ends on a success
 * screen with a download link + "open approval queue" link.
 */
export function ArtifactDialog({
  open,
  onClose,
  clientId,
}: {
  open: boolean;
  onClose: () => void;
  clientId: string;
}) {
  const [format, setFormat] = useState<Format>("docx");
  const [brief, setBrief] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    approvalItemId: string;
    downloadPath: string;
    sizeBytes: number;
  } | null>(null);

  const reset = () => {
    setFormat("docx");
    setBrief("");
    setBusy(false);
    setError(null);
    setResult(null);
  };

  const submit = async () => {
    if (!brief.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/artifacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, brief: brief.trim() }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      setResult({
        approvalItemId: data.approvalItemId,
        downloadPath: data.downloadPath,
        sizeBytes: data.sizeBytes,
      });
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
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-800 bg-[#0b0b0b] shadow-2xl"
          >
            <header className="flex items-center justify-between border-b border-zinc-900 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
                <div>
                  <h2 className="text-[14px] font-bold text-zinc-100">
                    Generate artifact
                  </h2>
                  <p className="text-[11px] text-zinc-500">
                    Agent drafts from this client's knowledge base.
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

            {result ? (
              <div className="p-6 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <h3 className="mt-3 text-[16px] font-bold text-zinc-100">
                  Draft ready
                </h3>
                <p className="mt-1 text-[12.5px] text-zinc-500">
                  {(result.sizeBytes / 1024).toFixed(1)} KB · lives in the
                  approval queue for your review.
                </p>
                <div className="mt-5 flex flex-col gap-2">
                  <a
                    href={result.downloadPath}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-100 px-4 py-2.5 text-[12.5px] font-semibold text-zinc-950 hover:bg-white"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download {format.toUpperCase()}
                  </a>
                  <Link
                    href="/app/tasks"
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-800 px-4 py-2.5 text-[12.5px] font-medium text-zinc-300 hover:border-zinc-700 hover:text-zinc-100"
                    onClick={() => {
                      reset();
                      onClose();
                    }}
                  >
                    Review in approval queue
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="p-5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  Format
                </label>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <FormatTile
                    selected={format === "docx"}
                    onClick={() => setFormat("docx")}
                    icon={<FileText className="h-4 w-4" />}
                    label=".docx"
                    hint="Memo, letter, summary"
                  />
                  <FormatTile
                    selected={format === "xlsx"}
                    onClick={() => setFormat("xlsx")}
                    icon={<Sheet className="h-4 w-4" />}
                    label=".xlsx"
                    hint="Financial statement, schedule"
                  />
                </div>

                <div className="mt-4">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    Brief
                  </label>
                  <textarea
                    value={brief}
                    onChange={(e) => setBrief(e.target.value)}
                    rows={3}
                    placeholder={
                      format === "docx"
                        ? "March monthly close summary memo, 1 page, executive summary first."
                        : "March P&L + balance sheet snapshot. One sheet for summary, one for line detail."
                    }
                    className="mt-1 w-full resize-y rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-[13px] leading-relaxed text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
                  />
                  <p className="mt-1 text-[10.5px] text-zinc-600">
                    The agent reads this client's full knowledge base. It
                    won't invent figures — if a number isn't in the
                    knowledge entries, it's excluded.
                  </p>
                </div>

                {error && (
                  <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-[12px] text-red-300">
                    {error}
                  </div>
                )}

                <div className="mt-5 flex items-center justify-end gap-2">
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
                    onClick={submit}
                    disabled={!brief.trim() || busy}
                    className="inline-flex items-center gap-2 rounded-lg bg-zinc-100 px-4 py-2 text-[12.5px] font-semibold text-zinc-950 transition-all hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    {busy ? "Drafting…" : "Draft artifact"}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function FormatTile({
  selected,
  onClick,
  icon,
  label,
  hint,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <button
      onClick={onClick}
      type="button"
      className={`flex flex-col items-start gap-1 rounded-lg border px-3 py-2.5 text-left transition-all ${
        selected
          ? "border-zinc-500 bg-zinc-800/60"
          : "border-zinc-900 bg-[#0a0a0a] hover:border-zinc-800"
      }`}
    >
      <span
        className={`inline-flex h-6 w-6 items-center justify-center rounded-md ${
          selected
            ? "bg-emerald-500/10 text-emerald-400"
            : "bg-zinc-900 text-zinc-400"
        }`}
      >
        {icon}
      </span>
      <span
        className={`mt-0.5 text-[13px] font-semibold ${
          selected ? "text-zinc-100" : "text-zinc-300"
        }`}
      >
        {label}
      </span>
      <span className="text-[10.5px] text-zinc-600">{hint}</span>
    </button>
  );
}
