"use client";

/**
 * Client island for /admin/leads.
 *
 * Renders one lead as an expandable <details> card with:
 *   - Summary line: email, status badge, warmth, last-seen, tool tags
 *   - Expanded body: aggregated profile, status selector, notes box,
 *     and the full per-source history with deep links.
 *
 * Status and note edits PATCH/POST to /api/admin/leads/[email]/*.
 * Optimistic UI: we update local state immediately and roll back on
 * server error so the operator gets snappy feedback.
 */
import { useState, useTransition } from "react";
import {
  LEAD_STATUSES,
  LEAD_STATUS_BADGE,
  LEAD_STATUS_LABEL,
  type Lead,
  type LeadStatus,
} from "@/lib/admin/leads";

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s ago`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  if (ms < 7 * 86_400_000) return `${Math.floor(ms / 86_400_000)}d ago`;
  return new Date(iso).toLocaleDateString();
}

const SOURCE_LABEL: Record<string, string> = {
  waitlist: "Waitlist",
  workflow_audit: "Audit",
  policy_generation: "Policy",
  newsletter: "Newsletter",
};

const SOURCE_TAG_COLOR: Record<string, string> = {
  waitlist: "bg-blue-500/15 text-blue-300 border-blue-500/20",
  workflow_audit: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
  policy_generation: "bg-violet-500/15 text-violet-300 border-violet-500/20",
  newsletter: "bg-amber-500/15 text-amber-300 border-amber-500/20",
};

export function LeadRow({ lead }: { lead: Lead }) {
  const [status, setStatus] = useState<LeadStatus>(lead.status);
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [savedNotes, setSavedNotes] = useState(lead.notes ?? "");
  const [statusError, setStatusError] = useState<string | null>(null);
  const [noteSaving, setNoteSaving] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [noteError, setNoteError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function onStatusChange(next: LeadStatus) {
    const prev = status;
    setStatus(next);
    setStatusError(null);
    startTransition(async () => {
      try {
        const r = await fetch(
          `/api/admin/leads/${encodeURIComponent(lead.email)}/status`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: next }),
          },
        );
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          setStatusError(j.error ?? `HTTP ${r.status}`);
          setStatus(prev);
        }
      } catch (e) {
        setStatusError(e instanceof Error ? e.message : "network error");
        setStatus(prev);
      }
    });
  }

  async function onNoteSave() {
    setNoteSaving("saving");
    setNoteError(null);
    try {
      const r = await fetch(
        `/api/admin/leads/${encodeURIComponent(lead.email)}/note`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes }),
        },
      );
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setNoteError(j.error ?? `HTTP ${r.status}`);
        setNoteSaving("error");
        return;
      }
      setSavedNotes(notes);
      setNoteSaving("saved");
      // Auto-fade the "saved" pill back to idle after 2s.
      setTimeout(() => setNoteSaving("idle"), 2000);
    } catch (e) {
      setNoteError(e instanceof Error ? e.message : "network error");
      setNoteSaving("error");
    }
  }

  const notesDirty = notes !== savedNotes;
  const badgeClass = LEAD_STATUS_BADGE[status];

  return (
    <details className="rounded-xl border border-zinc-800 bg-[#0a0a0a] group open:border-zinc-700">
      <summary className="cursor-pointer p-4 list-none flex flex-col gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span
            className={
              "px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase " +
              badgeClass
            }
          >
            {LEAD_STATUS_LABEL[status]}
          </span>
          <span className="text-sm text-zinc-100 font-medium font-mono break-all">
            {lead.displayEmail}
          </span>
          {lead.firmName && (
            <span className="text-xs text-zinc-400">· {lead.firmName}</span>
          )}
          {lead.vertical && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              {lead.vertical}
            </span>
          )}
          <span className="ml-auto flex items-center gap-3 text-[10px] text-zinc-500 font-mono">
            <span title="Warmth score 0-100">★ {lead.warmth}</span>
            <span>last {relativeTime(lead.lastSeen)}</span>
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5 text-[10px]">
          {lead.toolsUsed.map((t) => (
            <span
              key={t}
              className={
                "px-2 py-0.5 rounded border font-bold uppercase tracking-wider " +
                SOURCE_TAG_COLOR[t]
              }
            >
              {SOURCE_LABEL[t]}
            </span>
          ))}
          {lead.sourcePlatforms.slice(0, 3).map((p) => (
            <span
              key={p}
              className="px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 font-mono"
            >
              {p}
            </span>
          ))}
        </div>
      </summary>

      <div className="border-t border-zinc-800 px-4 py-4 space-y-5 text-xs">
        {/* Profile facts */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Name" value={lead.name} />
          <Field label="Firm" value={lead.firmName} />
          <Field label="Firm size" value={lead.firmSize} />
          <Field label="Clients" value={lead.clientCount} />
          <Field label="Vertical" value={lead.vertical} />
          <Field label="Country" value={lead.ipCountry} />
          <Field
            label="First seen"
            value={
              lead.firstSeen
                ? `${relativeTime(lead.firstSeen)} (${new Date(
                    lead.firstSeen,
                  ).toLocaleDateString()})`
                : null
            }
          />
          <Field
            label="Status updated"
            value={
              lead.statusUpdatedAt
                ? relativeTime(lead.statusUpdatedAt)
                : "(never)"
            }
          />
        </div>

        {/* Status + notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
              Status
            </div>
            <div className="flex flex-wrap gap-1.5">
              {LEAD_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onStatusChange(s)}
                  className={
                    "px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors capitalize " +
                    (status === s
                      ? "bg-zinc-100 text-zinc-950"
                      : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800")
                  }
                >
                  {LEAD_STATUS_LABEL[s]}
                </button>
              ))}
            </div>
            {statusError && (
              <div className="mt-2 text-[11px] text-red-400">
                {statusError}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                Notes
              </div>
              <div className="text-[10px] text-zinc-500">
                {noteSaving === "saving" && "saving…"}
                {noteSaving === "saved" && (
                  <span className="text-emerald-400">saved</span>
                )}
                {noteSaving === "error" && (
                  <span className="text-red-400">save failed</span>
                )}
              </div>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Conversation context, what to send next, blockers…"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 font-mono"
            />
            {noteError && (
              <div className="mt-1 text-[11px] text-red-400">{noteError}</div>
            )}
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                disabled={!notesDirty}
                onClick={() => setNotes(savedNotes)}
                className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-zinc-900 text-zinc-400 disabled:opacity-30 hover:bg-zinc-800"
              >
                Revert
              </button>
              <button
                type="button"
                disabled={!notesDirty || noteSaving === "saving"}
                onClick={onNoteSave}
                className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-zinc-100 text-zinc-950 disabled:opacity-30 hover:bg-white"
              >
                Save note
              </button>
            </div>
          </div>
        </div>

        {/* History */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
            History ({lead.history.length})
          </div>
          <ol className="space-y-2">
            {lead.history.map((h, i) => (
              <li
                key={`${h.source}-${h.id ?? i}-${h.at}`}
                className="flex items-start gap-3 text-xs"
              >
                <span
                  className={
                    "shrink-0 px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider " +
                    SOURCE_TAG_COLOR[h.source]
                  }
                >
                  {SOURCE_LABEL[h.source]}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-zinc-200">
                    {h.detail}
                    {h.link && (
                      <>
                        {" "}
                        ·{" "}
                        <a
                          href={h.link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-zinc-400 underline hover:text-zinc-200"
                        >
                          open
                        </a>
                      </>
                    )}
                  </div>
                  {h.meta && (
                    <div className="mt-0.5 text-[11px] text-zinc-500 font-mono break-words">
                      {Object.entries(h.meta)
                        .filter(([, v]) => v !== null && v !== undefined && v !== "")
                        .map(([k, v]) => (
                          <span key={k} className="mr-3">
                            {k}={String(Array.isArray(v) ? v.join(",") : v)}
                          </span>
                        ))}
                    </div>
                  )}
                </div>
                <span className="shrink-0 text-[10px] text-zinc-500 font-mono">
                  {relativeTime(h.at)}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-900">
          <a
            href={`mailto:${lead.displayEmail}`}
            className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-zinc-100 text-zinc-950 hover:bg-white"
          >
            Reply via email
          </a>
        </div>
      </div>
    </details>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-0.5">
        {label}
      </div>
      <div className="text-zinc-200 break-words">{value ?? "—"}</div>
    </div>
  );
}
