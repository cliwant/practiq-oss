"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  CheckCircle2,
  XCircle,
  SkipForward,
  MessageSquare,
  Sparkles,
  ChevronRight,
  AlertTriangle,
  Clock,
  Flame,
} from "lucide-react";
import { ClientAvatar } from "./client-avatar";
import { Markdown } from "./markdown";
import { useToast } from "./toast";
import { formatDistance } from "@/lib/format-time";

export interface ApprovalItemView {
  id: string;
  clientId: string;
  clientName: string;
  clientIndustry: string;
  clientBrandColor: string;
  type: string;
  title: string;
  status: string;
  priority: number;
  aiConfidence: number | null;
  content: unknown;
  aiNotes: string | null;
  reviewerNotes: string | null;
  reviewedAt: string | null;
  deadline: string | null;
  createdAt: string;
  // RUN 14: agent task metadata (null when the approval was created by
  // a non-agent flow, e.g. manual operator entry).
  agent: {
    type: string;
    version: string | null;
    attempt: number;
    usdCost: number | null;
    durationMs: number | null;
  } | null;
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  briefing: { label: "Morning briefing", color: "#a855f7" },
  action: { label: "Action needed", color: "#ef4444" },
  financial_statement: { label: "Financial draft", color: "#10b981" },
  tax_summary: { label: "Tax summary", color: "#3b82f6" },
  email_draft: { label: "Email draft", color: "#06b6d4" },
  anomaly_alert: { label: "Anomaly", color: "#f43f5e" },
  reminder: { label: "Reminder", color: "#f97316" },
  tracked_changes_docx: { label: "Redline", color: "#8b5cf6" },
};

/**
 * Approval Queue — Superhuman-style triage screen.
 *
 * Two-pane: queue list on the left, full-item preview on the right.
 * Keyboard flow:
 *   J / ↓ — next item
 *   K / ↑ — previous item
 *   Y     — approve + advance
 *   N     — reject + advance
 *   D     — dismiss + advance
 *   E     — focus reviewer-notes field
 *   ⌘↵    — save reviewer note + approve
 *
 * Items removed from the visible queue animate out. The server persists
 * the decision + an AuditLog row behind every key press.
 */
export function ApprovalQueueScreen({
  initialItems,
  counts,
}: {
  initialItems: ApprovalItemView[];
  counts: Record<string, number>;
}) {
  const [items, setItems] = useState(initialItems);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [noteText, setNoteText] = useState("");
  const [busy, setBusy] = useState(false);
  const [historicalCounts] = useState(counts);
  const toast = useToast();

  const selected = items[selectedIdx] ?? null;

  useEffect(() => {
    setNoteText(selected?.reviewerNotes ?? "");
  }, [selected?.id, selected?.reviewerNotes]);

  const dispatch = useCallback(
    async (
      action: "approve" | "reject" | "dismiss" | "modify",
      notes?: string,
    ) => {
      if (!selected || busy) return;
      setBusy(true);
      const id = selected.id;
      const snapshotItem = selected;

      // Optimistic remove.
      const prev = items;
      const nextItems = items.filter((i) => i.id !== id);
      setItems(nextItems);
      if (selectedIdx >= nextItems.length) {
        setSelectedIdx(Math.max(0, nextItems.length - 1));
      }

      try {
        const res = await fetch(`/api/approval-queue/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, reviewerNotes: notes }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        toast.push({
          kind:
            action === "approve"
              ? "success"
              : action === "reject"
                ? "error"
                : "info",
          title:
            action === "approve"
              ? "Approved"
              : action === "reject"
                ? "Rejected"
                : action === "dismiss"
                  ? "Dismissed"
                  : "Modified",
          description: snapshotItem.title,
          undo: {
            label: "Undo",
            onUndo: async () => {
              // Reset action moves the item back to pending_review.
              try {
                const r = await fetch(`/api/approval-queue/${id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "reset" }),
                });
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                // Re-insert at its original spot for continuity.
                setItems((curr) => {
                  if (curr.some((c) => c.id === id)) return curr;
                  const next = [...curr];
                  next.splice(
                    Math.min(selectedIdx, next.length),
                    0,
                    snapshotItem,
                  );
                  return next;
                });
                toast.push({
                  kind: "info",
                  title: "Restored",
                  description: snapshotItem.title,
                });
              } catch (e) {
                toast.push({
                  kind: "error",
                  title: "Undo failed",
                  description:
                    e instanceof Error ? e.message : "Network error",
                });
              }
            },
          },
        });
      } catch (err) {
        console.error("approval action failed:", err);
        setItems(prev);
        toast.push({
          kind: "error",
          title: "Action failed",
          description: err instanceof Error ? err.message : "Network error",
        });
      } finally {
        setBusy(false);
      }
    },
    [selected, busy, items, selectedIdx, toast],
  );

  // ─── Keyboard shortcuts (Superhuman-style) ─────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inInput =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (inInput) {
        // Only ⌘+Enter in textareas triggers approve.
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
          e.preventDefault();
          dispatch("approve", noteText || undefined);
        }
        return;
      }

      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(items.length - 1, i + 1));
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(0, i - 1));
      } else if (e.key === "y" || e.key === "Y") {
        e.preventDefault();
        dispatch("approve", noteText || undefined);
      } else if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        dispatch("reject", noteText || undefined);
      } else if (e.key === "d" || e.key === "D") {
        e.preventDefault();
        dispatch("dismiss", noteText || undefined);
      } else if (e.key === "e" || e.key === "E") {
        e.preventDefault();
        document.getElementById("reviewer-notes")?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [items.length, dispatch, noteText]);

  const pending = items.length;
  const reviewedToday = useMemo(() => {
    const totalDone =
      (historicalCounts.approved ?? 0) +
      (historicalCounts.rejected ?? 0) +
      (historicalCounts.dismissed ?? 0) +
      (historicalCounts.modified ?? 0);
    return totalDone;
  }, [historicalCounts]);

  return (
    <div className="flex h-full flex-col bg-[#050505]">
      {/* ─── Header strip ─────────────────────────────────────────── */}
      <header className="border-b border-zinc-900 bg-[#080808] px-8 py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-widest text-zinc-600">
              Approval Queue
            </p>
            <h1 className="mt-0.5 text-[19px] font-extrabold tracking-tight text-zinc-100">
              {pending === 0
                ? "All clear"
                : `${pending} item${pending === 1 ? "" : "s"} to review`}
            </h1>
          </div>
          <div className="flex items-center gap-5 text-[11.5px] text-zinc-500">
            <StatPill
              icon={<CheckCircle2 className="h-3 w-3 text-emerald-400" />}
              label="Approved"
              value={historicalCounts.approved ?? 0}
            />
            <StatPill
              icon={<XCircle className="h-3 w-3 text-red-400" />}
              label="Rejected"
              value={historicalCounts.rejected ?? 0}
            />
            <StatPill
              icon={<SkipForward className="h-3 w-3 text-zinc-500" />}
              label="Dismissed"
              value={historicalCounts.dismissed ?? 0}
            />
            <span className="pl-2 text-[10.5px] text-zinc-700">
              Lifetime reviewed: {reviewedToday}
            </span>
          </div>
        </div>
      </header>

      {/* ─── Main region ───────────────────────────────────────────── */}
      {pending === 0 ? (
        <EmptyQueue />
      ) : (
        <div className="flex min-h-0 flex-1">
          {/* ─── List ──────────────────────────────────────────────── */}
          <aside className="flex h-full w-[420px] shrink-0 flex-col border-r border-zinc-900 bg-[#070707]">
            <div className="border-b border-zinc-900 px-4 py-2.5 text-[11px] text-zinc-600">
              <kbd className={kbdCls}>J</kbd>/<kbd className={kbdCls}>K</kbd>{" "}
              navigate ·{" "}
              <kbd className={kbdCls}>Y</kbd> approve ·{" "}
              <kbd className={kbdCls}>N</kbd> reject ·{" "}
              <kbd className={kbdCls}>D</kbd> dismiss
            </div>
            <ul className="flex-1 overflow-y-auto p-2">
              <AnimatePresence initial={false}>
                {items.map((item, i) => (
                  <motion.li
                    key={item.id}
                    initial={{ opacity: 0, y: 2 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20, height: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <QueueListItem
                      item={item}
                      selected={i === selectedIdx}
                      onSelect={() => setSelectedIdx(i)}
                    />
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </aside>

          {/* ─── Detail ────────────────────────────────────────────── */}
          {selected ? (
            <section className="flex-1 overflow-y-auto">
              <ItemDetail
                item={selected}
                noteText={noteText}
                onNoteChange={setNoteText}
                onApprove={() => dispatch("approve", noteText || undefined)}
                onReject={() => dispatch("reject", noteText || undefined)}
                onDismiss={() => dispatch("dismiss", noteText || undefined)}
                busy={busy}
              />
            </section>
          ) : (
            <section className="flex flex-1 items-center justify-center text-[12px] text-zinc-600">
              Queue empty
            </section>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Subcomponents ──────────────────────────────────────────────────────

function QueueListItem({
  item,
  selected,
  onSelect,
}: {
  item: ApprovalItemView;
  selected: boolean;
  onSelect: () => void;
}) {
  const typeMeta = TYPE_LABELS[item.type] ?? {
    label: item.type,
    color: "#a1a1aa",
  };
  const deadlineUrgent =
    item.deadline &&
    new Date(item.deadline).getTime() - Date.now() < 48 * 60 * 60 * 1000;

  return (
    <button
      onClick={onSelect}
      className={`mb-0.5 flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
        selected
          ? "bg-zinc-800/70"
          : "hover:bg-zinc-900/60"
      }`}
    >
      <ClientAvatar
        name={item.clientName}
        color={item.clientBrandColor}
        size={26}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[12.5px] font-semibold text-zinc-100">
            {item.title}
          </span>
          {item.priority >= 70 && (
            <Flame className="h-3 w-3 shrink-0 text-orange-400" />
          )}
          {deadlineUrgent && (
            <Clock className="h-3 w-3 shrink-0 text-amber-400" />
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-zinc-600">
          <span className="truncate">{item.clientName}</span>
          <span className="text-zinc-800">·</span>
          <span
            className="shrink-0 rounded-md px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider"
            style={{ color: typeMeta.color, background: `${typeMeta.color}15` }}
          >
            {typeMeta.label}
          </span>
        </div>
      </div>
      <ChevronRight
        className={`h-4 w-4 shrink-0 transition-opacity ${
          selected ? "text-zinc-500 opacity-100" : "opacity-0"
        }`}
      />
    </button>
  );
}

function ItemDetail({
  item,
  noteText,
  onNoteChange,
  onApprove,
  onReject,
  onDismiss,
  busy,
}: {
  item: ApprovalItemView;
  noteText: string;
  onNoteChange: (v: string) => void;
  onApprove: () => void;
  onReject: () => void;
  onDismiss: () => void;
  busy: boolean;
}) {
  const typeMeta = TYPE_LABELS[item.type] ?? {
    label: item.type,
    color: "#a1a1aa",
  };
  const confidencePct =
    typeof item.aiConfidence === "number"
      ? Math.round(item.aiConfidence * 100)
      : null;

  // `content` is free-form per agent. Render briefing + action shapes
  // specifically; fall back to JSON for anything else.
  const content = item.content as Record<string, unknown> | null;

  return (
    <div className="mx-auto max-w-3xl px-10 py-8">
      <div className="flex items-start gap-3">
        <ClientAvatar
          name={item.clientName}
          color={item.clientBrandColor}
          size={36}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link
              href={`/app/clients/${item.clientId}`}
              className="text-[12.5px] font-medium text-zinc-400 transition-colors hover:text-zinc-100"
            >
              {item.clientName}
            </Link>
            <span className="text-zinc-700">·</span>
            <span className="text-[11.5px] text-zinc-600">
              {item.clientIndustry}
            </span>
          </div>
          <h2 className="mt-1 text-[22px] font-extrabold leading-tight tracking-tight text-zinc-100">
            {item.title}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
            <span
              className="rounded-md px-2 py-0.5 font-bold uppercase tracking-wider"
              style={{
                color: typeMeta.color,
                background: `${typeMeta.color}15`,
              }}
            >
              {typeMeta.label}
            </span>
            {item.priority >= 70 && (
              <span className="inline-flex items-center gap-1 rounded-md bg-orange-500/10 px-2 py-0.5 text-orange-300">
                <Flame className="h-3 w-3" /> High priority
              </span>
            )}
            {confidencePct !== null && (
              <span className="text-zinc-600">
                AI confidence {confidencePct}%
              </span>
            )}
            {item.deadline && (
              <span className="inline-flex items-center gap-1 text-zinc-500">
                <Clock className="h-3 w-3" />
                Due {formatDistance(item.deadline)}
              </span>
            )}
            <span className="text-zinc-600">
              · prepared {formatDistance(item.createdAt)}
            </span>
            {/* RUN 14: cost / version / retry inline. The dot-separated
                format is intentionally compact — a single glanceable
                row rather than a separate panel. Only render when the
                approval is agent-backed and at least one field is set. */}
            {item.agent &&
              (item.agent.usdCost !== null ||
                item.agent.version ||
                item.agent.attempt > 0) && (
                <span className="text-zinc-600">·</span>
              )}
            {item.agent?.usdCost !== null && item.agent?.usdCost !== undefined && (
              <span className="font-mono text-[11px] text-zinc-500" title="AI cost for this run">
                ${item.agent.usdCost.toFixed(4).replace(/\.?0+$/, "")}
              </span>
            )}
            {item.agent?.durationMs !== null &&
              item.agent?.durationMs !== undefined && (
                <span className="font-mono text-[11px] text-zinc-600">
                  {(item.agent.durationMs / 1000).toFixed(1)}s
                </span>
              )}
            {item.agent?.version && (
              <span
                className="font-mono text-[10px] text-zinc-600"
                title={`Agent ${item.agent.type} v${item.agent.version}`}
              >
                v{item.agent.version}
              </span>
            )}
            {item.agent && item.agent.attempt > 0 && (
              <span
                className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300"
                title={`Succeeded after ${item.agent.attempt} retr${item.agent.attempt === 1 ? "y" : "ies"}`}
              >
                retry {item.agent.attempt}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ─── Rendered content ───────────────────────────────────── */}
      <div className="mt-6 rounded-xl border border-zinc-900 bg-[#0a0a0a] p-5">
        {item.type === "briefing" && content?.summary ? (
          <BriefingRenderer
            summary={content.summary as string[]}
            watch={(content.watch as Array<{ topic: string; note: string }>) ?? []}
          />
        ) : item.type === "action" && content?.action ? (
          <ActionRenderer
            action={content.action as string}
            reason={(content.reason as string) ?? item.aiNotes ?? ""}
            dueHint={content.dueHint as string | undefined}
          />
        ) : content?.format &&
          (content.format === "docx" || content.format === "xlsx") ? (
          <ArtifactRenderer
            clientId={item.clientId}
            outputId={content.outputId as string}
            format={content.format as "docx" | "xlsx"}
            brief={(content.brief as string) ?? item.title}
            sizeBytes={(content.sizeBytes as number) ?? 0}
          />
        ) : item.type === "tracked_changes_docx" ? (
          <TrackedChangesRenderer
            approvalItemId={item.id}
            sourceFilename={(content?.sourceFilename as string) ?? "document.docx"}
            applied={
              (content?.applied as Array<{
                find: string;
                replace: string;
                reason: string;
              }>) ?? []
            }
            skipped={
              (content?.skipped as Array<{
                reason: string;
                edit: { find: string; reason: string };
              }>) ?? []
            }
          />
        ) : (
          <pre className="whitespace-pre-wrap break-words text-[12px] leading-relaxed text-zinc-300">
            {JSON.stringify(content, null, 2)}
          </pre>
        )}
      </div>

      {item.aiNotes && item.type !== "briefing" && item.type !== "action" && (
        <div className="mt-4 rounded-xl border border-zinc-900 bg-[#0a0a0a] p-4">
          <div className="mb-2 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-widest text-zinc-500">
            <Sparkles className="h-3 w-3" />
            Agent rationale
          </div>
          <Markdown className="text-[13px]">{item.aiNotes}</Markdown>
        </div>
      )}

      {/* ─── Reviewer note ──────────────────────────────────────── */}
      <div className="mt-6">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
          Reviewer notes (optional)
        </label>
        <textarea
          id="reviewer-notes"
          value={noteText}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder="Feedback for the agent. ⌘+Enter to approve with notes."
          rows={3}
          className="mt-1 w-full resize-y rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
        />
      </div>

      {/* ─── Action bar ─────────────────────────────────────────── */}
      <div className="mt-6 flex items-center gap-2">
        <button
          onClick={onApprove}
          disabled={busy}
          className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-[13px] font-semibold text-emerald-950 transition-colors hover:bg-emerald-400 disabled:opacity-50"
        >
          <CheckCircle2 className="h-4 w-4" />
          Approve
          <kbd className="ml-1 rounded border border-emerald-700/50 bg-emerald-700/30 px-1 text-[10px]">
            Y
          </kbd>
        </button>
        <button
          onClick={onReject}
          disabled={busy}
          className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-[#0a0a0a] px-4 py-2.5 text-[13px] font-medium text-zinc-300 transition-colors hover:border-red-500/40 hover:text-red-300 disabled:opacity-50"
        >
          <XCircle className="h-4 w-4" />
          Reject
          <kbd className="ml-1 rounded border border-zinc-800 bg-zinc-900 px-1 text-[10px] text-zinc-500">
            N
          </kbd>
        </button>
        <button
          onClick={onDismiss}
          disabled={busy}
          className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-[#0a0a0a] px-4 py-2.5 text-[13px] font-medium text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-100 disabled:opacity-50"
        >
          <SkipForward className="h-4 w-4" />
          Dismiss
          <kbd className="ml-1 rounded border border-zinc-800 bg-zinc-900 px-1 text-[10px] text-zinc-500">
            D
          </kbd>
        </button>
        <span className="ml-auto text-[11px] text-zinc-600">
          <Link
            href={`/app/clients/${item.clientId}`}
            className="inline-flex items-center gap-1 transition-colors hover:text-zinc-200"
          >
            <MessageSquare className="h-3 w-3" />
            Open {item.clientName}
          </Link>
        </span>
      </div>
    </div>
  );
}

function BriefingRenderer({
  summary,
  watch,
}: {
  summary: string[];
  watch: Array<{ topic: string; note: string }>;
}) {
  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-widest text-zinc-500">
          <Sparkles className="h-3 w-3 text-zinc-500" />
          This morning
        </div>
        <ul className="space-y-1.5 text-[13.5px] leading-relaxed text-zinc-200">
          {summary.map((line, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-zinc-500" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>
      {watch.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-widest text-zinc-500">
            <AlertTriangle className="h-3 w-3" />
            Keep an eye on
          </div>
          <ul className="space-y-2 text-[12.5px] text-zinc-400">
            {watch.map((w, i) => (
              <li
                key={i}
                className="rounded-lg border border-zinc-900 bg-[#0c0c0c] px-3 py-2"
              >
                <strong className="text-zinc-200">{w.topic}.</strong>{" "}
                <span>{w.note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ActionRenderer({
  action,
  reason,
  dueHint,
}: {
  action: string;
  reason: string;
  dueHint?: string;
}) {
  return (
    <div className="space-y-3">
      <div className="text-[15.5px] font-semibold leading-snug text-zinc-100">
        {action}
      </div>
      <p className="text-[13px] leading-relaxed text-zinc-400">{reason}</p>
      {dueHint && (
        <div className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2 py-1 text-[11.5px] text-amber-300">
          <Clock className="h-3 w-3" />
          {dueHint}
        </div>
      )}
    </div>
  );
}

function ArtifactRenderer({
  clientId,
  outputId,
  format,
  brief,
  sizeBytes,
}: {
  clientId: string;
  outputId: string;
  format: "docx" | "xlsx";
  brief: string;
  sizeBytes: number;
}) {
  const downloadHref = `/api/clients/${clientId}/artifacts/${outputId}/download`;
  const sizeKb = (sizeBytes / 1024).toFixed(1);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold text-zinc-100">
            {format.toUpperCase()} draft ready
          </div>
          <div className="truncate text-[11.5px] text-zinc-500">
            {brief} · {sizeKb} KB
          </div>
        </div>
        <a
          href={downloadHref}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-[12px] font-medium text-zinc-200 hover:border-zinc-600 hover:text-zinc-100"
        >
          Download
        </a>
      </div>
      <p className="text-[12px] text-zinc-500">
        The file is ready to attach to your client email. Open, review, and
        approve below — or request changes to send it back to the agent.
      </p>
    </div>
  );
}

function TrackedChangesRenderer({
  approvalItemId,
  sourceFilename,
  applied,
  skipped,
}: {
  approvalItemId: string;
  sourceFilename: string;
  applied: Array<{ find: string; replace: string; reason: string }>;
  skipped: Array<{ reason: string; edit: { find: string; reason: string } }>;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? applied : applied.slice(0, 3);
  const remaining = applied.length - visible.length;
  const downloadHref = `/api/approval-queue/${approvalItemId}/redline-download`;
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-300">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold text-zinc-100">
            Suggested edits to {sourceFilename}
          </div>
          <div className="text-[11.5px] text-zinc-500">
            {applied.length} edit{applied.length === 1 ? "" : "s"} applied as
            tracked changes · open in Word to review and accept
          </div>
        </div>
      </div>

      {skipped.length > 0 && (
        <div
          className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2"
          title="Skipped edits — the find-text spanned multiple runs and could not be safely replaced as tracked changes."
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
          <p className="text-[12px] leading-relaxed text-amber-200/90">
            <strong className="font-semibold">
              {skipped.length} match{skipped.length === 1 ? " was" : "es were"}{" "}
              skipped
            </strong>{" "}
            (multi-run text).{" "}
            <span className="text-amber-200/70">
              The redline engine only edits text that lives in a single
              formatting run. Open the original to handle these manually.
            </span>
          </p>
        </div>
      )}

      <ul className="space-y-2">
        {visible.map((edit, i) => (
          <li
            key={i}
            className="rounded-lg border border-zinc-900 bg-[#0c0c0c] px-3 py-2.5"
          >
            <div className="flex items-baseline gap-2 text-[10.5px] font-bold uppercase tracking-widest text-zinc-600">
              Edit {i + 1}
            </div>
            <div className="mt-1.5 grid grid-cols-1 gap-1.5 text-[12.5px] leading-relaxed">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-400">
                  Find
                </span>
                <p className="mt-0.5 break-words rounded bg-rose-500/5 px-2 py-1 font-mono text-[12px] text-rose-200">
                  {edit.find}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                  Replace
                </span>
                <p className="mt-0.5 break-words rounded bg-emerald-500/5 px-2 py-1 font-mono text-[12px] text-emerald-200">
                  {edit.replace}
                </p>
              </div>
              {edit.reason && (
                <p className="mt-1 text-[12px] italic text-zinc-400">
                  — {edit.reason}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>

      {remaining > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="text-[12px] font-medium text-zinc-400 transition-colors hover:text-zinc-100"
        >
          View all {applied.length} edits →
        </button>
      )}
      {expanded && applied.length > 3 && (
        <button
          onClick={() => setExpanded(false)}
          className="text-[12px] font-medium text-zinc-500 transition-colors hover:text-zinc-300"
        >
          Collapse
        </button>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <a
          href={downloadHref}
          className="inline-flex items-center gap-1.5 rounded-lg bg-violet-500 px-3 py-1.5 text-[12px] font-semibold text-violet-950 transition-colors hover:bg-violet-400"
        >
          Download redlined .docx
        </a>
        <a
          href={downloadHref}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-[12px] font-medium text-zinc-200 transition-colors hover:border-zinc-600"
          title="Same file — Word handles the .docx mime-type and opens locally"
        >
          Open in Word
        </a>
      </div>
    </div>
  );
}

function EmptyQueue() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
        <CheckCircle2 className="h-5 w-5" />
      </div>
      <h2 className="mt-4 text-[20px] font-bold text-zinc-100">
        Inbox zero for the agent
      </h2>
      <p className="mt-2 max-w-md text-[13px] leading-relaxed text-zinc-500">
        No pending reviews right now. The nightly agents will repopulate
        this queue overnight — come back tomorrow morning, or trigger a
        run from any client workspace.
      </p>
      <Link
        href="/app"
        className="mt-6 rounded-lg bg-zinc-100 px-4 py-2 text-[12.5px] font-semibold text-zinc-950 transition-colors hover:bg-white"
      >
        Back to workspace
      </Link>
    </div>
  );
}

function StatPill({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {icon}
      <span className="tabular-nums text-zinc-300">{value}</span>
      <span className="text-zinc-600">{label}</span>
    </span>
  );
}

const kbdCls =
  "rounded border border-zinc-800 bg-zinc-900/60 px-1 py-0.5 text-[10px] font-semibold text-zinc-400";
