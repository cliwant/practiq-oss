"use client";

import { useEffect, useState } from "react";
import {
  readSampleInteractionCount,
  SAMPLE_INTERACTION_EVENT,
} from "./sample-interaction-count";

/**
 * Small running counter on /demo/workspace/approval-queue.
 *
 * Renders nothing until the visitor has tried at least one sample
 * approve/reject — keeps the page header clean for first impression.
 * Increments via a window CustomEvent dispatched from
 * bumpSampleInteractionCount so we don't need a context provider.
 */
export function SampleApprovalCounter() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    setCount(readSampleInteractionCount());
    function onBump(e: Event) {
      const next = (e as CustomEvent<number>).detail;
      if (typeof next === "number") setCount(next);
    }
    window.addEventListener(SAMPLE_INTERACTION_EVENT, onBump as EventListener);
    return () =>
      window.removeEventListener(
        SAMPLE_INTERACTION_EVENT,
        onBump as EventListener,
      );
  }, []);

  if (!count || count < 1) return null;

  return (
    <div className="mt-3 inline-flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/40 px-2.5 py-1 text-[11px] text-zinc-400">
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-amber-500" />
      <span>
        Sample approvals tried:{" "}
        <span className="font-semibold text-zinc-200">{count}</span>
      </span>
    </div>
  );
}
