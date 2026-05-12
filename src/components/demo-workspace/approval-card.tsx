"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, Check, X } from "lucide-react";
import { trackClient } from "@/lib/analytics/track-client";
import type { ApprovalItem } from "@/data/demo-workspace";

/**
 * Read-only render of a single ApprovalItem. The Approve / Reject /
 * Preview buttons surface a "Sample mode" toast — they do NOT mutate
 * any state. This is the visible product surface for a visitor before
 * sign-up, so the buttons must look real but be unambiguously inert.
 */
export function ApprovalDetailCard({ item }: { item: ApprovalItem }) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showSampleToast(label: string) {
    setToast(label);
    setTimeout(() => setToast(null), 3500);
    trackClient({
      type: "sns_cta_clicked",
      properties: {
        cta: "demo_signup_prompt",
        surface: "approval_queue",
        action: label,
        target_id: item.id,
      },
    });
    trackClient({
      type: "demo_workspace_interaction",
      properties: {
        surface: "approval_queue",
        action:
          label === "Approve" ? "approve_click" : "reject_click",
        target_id: item.id,
      },
    });
  }

  return (
    <article className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-[#0a0a0a]">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-900 px-5 py-4">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            {item.type} · AI confidence {item.aiConfidence}%
          </div>
          <h3 className="mt-1 text-base font-semibold text-zinc-100">
            {item.title}
          </h3>
          <p className="mt-1 text-[12.5px] text-zinc-400">
            {item.preview.summary}
          </p>
        </div>
        <div className="text-right text-[11px] text-zinc-500">
          <div className="font-medium text-zinc-300">Due {item.deadline}</div>
          <Link
            href={`/demo/workspace/clients/${item.clientId}`}
            className="mt-1 inline-block text-zinc-400 underline decoration-zinc-700 underline-offset-4 hover:text-zinc-100 hover:decoration-zinc-400"
          >
            Open client
          </Link>
        </div>
      </header>

      <div className="px-5 py-4">
        <button
          type="button"
          onClick={() => {
            setOpen((v) => !v);
            trackClient({
              type: "demo_workspace_interaction",
              properties: {
                surface: "approval_queue",
                action: "tab_click",
                target_id: `${item.id}:preview`,
              },
            });
          }}
          aria-expanded={open}
          className="inline-flex items-center gap-2 text-[12px] font-medium text-zinc-300 hover:text-zinc-100"
        >
          <Eye className="h-3.5 w-3.5" />
          {open ? "Hide preview" : "Preview document"}
        </button>
        {open && (
          <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
            <ul className="space-y-1.5 text-[12.5px] text-zinc-300">
              {item.preview.bullets.map((b, i) => (
                <li key={i} className="flex gap-2">
                  <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-zinc-600" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-zinc-900 px-5 py-3">
        <button
          type="button"
          onClick={() => showSampleToast("Reject")}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-transparent px-3 py-1.5 text-[12px] font-medium text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900"
        >
          <X className="h-3.5 w-3.5" />
          Reject
        </button>
        <button
          type="button"
          onClick={() => showSampleToast("Approve")}
          className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-100 px-3 py-1.5 text-[12px] font-bold text-zinc-950 hover:bg-white"
        >
          <Check className="h-3.5 w-3.5" />
          Approve
        </button>
      </footer>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="absolute bottom-3 right-3 max-w-xs rounded-lg border border-amber-500/40 bg-amber-500/15 px-3.5 py-2.5 text-[12px] text-amber-100 shadow-lg"
        >
          <strong className="font-semibold">Sample mode.</strong>{" "}
          <Link
            href="/signup"
            className="underline decoration-amber-400 underline-offset-4 hover:text-amber-50"
          >
            Sign up
          </Link>{" "}
          to enable approval workflows on your own clients.
        </div>
      )}
    </article>
  );
}
