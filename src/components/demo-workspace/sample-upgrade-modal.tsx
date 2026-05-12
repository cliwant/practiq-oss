"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";

/**
 * Small, dismissible upgrade prompt shown when a visitor clicks
 * Approve / Reject on a sample approval-queue item.
 *
 * Replaces the previous transient toast — sits in the bottom-right
 * corner, soft slide-in, click-outside / ESC / close-X all dismiss.
 * It is NOT a heavy blocking modal — it never covers the whole
 * screen and never traps focus aggressively. The sample-mode
 * framing stays heavy per the fabrication-crisis lesson; this
 * surface just adds a warmer conversion path than "toast that
 * vanishes in 3.5s".
 */
export function SampleUpgradeModal({
  open,
  escalated,
  onClose,
  utmCta,
}: {
  open: boolean;
  /** When true (after N>=3 sample interactions) show stronger copy. */
  escalated?: boolean;
  onClose: () => void;
  /** utm_medium suffix so we can tell which button triggered it. */
  utmCta: "sample-approve" | "sample-reject";
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const signupHref = `/signup?utm_source=demo-workspace&utm_medium=${utmCta}`;
  const auditHref = `/workflow-audit?landing_slug=demo-workspace&lane=practiq`;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Click-outside surface — transparent, no backdrop dim,
              so the sample workspace stays visible behind it. */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40"
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.div
            role="dialog"
            aria-modal="false"
            aria-labelledby="sample-upgrade-title"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-4 right-4 z-50 w-[min(calc(100vw-2rem),22rem)] rounded-xl border border-amber-500/40 bg-[#0a0a0a] p-4 shadow-2xl shadow-black/60"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Dismiss"
              className="absolute right-2 top-2 rounded-md p-1 text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>

            <div className="mb-2 inline-flex items-center gap-1.5">
              <span className="rounded-md border border-amber-400/40 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-100">
                Sample
              </span>
            </div>

            <h2
              id="sample-upgrade-title"
              className="pr-6 text-sm font-semibold text-zinc-100"
            >
              {escalated
                ? "Looks like you're getting the rhythm."
                : "This is sample mode."}
            </h2>

            <p className="mt-1.5 text-[12.5px] leading-relaxed text-zinc-400">
              {escalated
                ? "Want to do this with your own clients? Start a free trial, or get a workflow audit first."
                : "These clients are fictional. To approve real client work — and let an AI do the rest — start your own workspace, or get a workflow audit first."}
            </p>

            <div className="mt-3 flex flex-col gap-2">
              <Link
                href={signupHref}
                className="inline-flex w-full items-center justify-center rounded-lg bg-zinc-100 px-3 py-2 text-[12px] font-bold text-zinc-950 hover:bg-white"
              >
                Start free trial
              </Link>
              <Link
                href={auditHref}
                className="inline-flex w-full items-center justify-center rounded-lg border border-zinc-800 bg-transparent px-3 py-2 text-[12px] font-medium text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100"
              >
                Get a workflow audit
              </Link>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
