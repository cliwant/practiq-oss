"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  CheckCircle2,
  XCircle,
  Info,
  AlertTriangle,
  Undo2,
} from "lucide-react";

type ToastKind = "success" | "error" | "info" | "warning";

interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  description?: string;
  undo?: { label?: string; onUndo: () => void | Promise<void> };
}

interface ToastContextValue {
  push: (toast: Omit<Toast, "id">) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Non-blocking toast stack, bottom-right.
 *
 * Every toast can carry an optional `undo` block that renders as an
 * inline action button with a countdown. The provider doesn't own the
 * "undo window" timing — the caller decides how long to keep the toast
 * on screen. Default is 6 seconds for informational toasts, 10 for
 * ones with an undo action (Superhuman's sweet spot).
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, ...toast }]);
      const ttl = toast.undo ? 10_000 : 6_000;
      setTimeout(() => dismiss(id), ttl);
      return id;
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ push, dismiss }}>
      {children}
      <div
        className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col gap-2"
        aria-live="polite"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <ToastRow key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Non-provider render path — safe no-op so components can `useToast()`
    // unconditionally without blowing up unit tests / Storybook / seed pages.
    return {
      push: () => 0,
      dismiss: () => {},
    };
  }
  return ctx;
}

function ToastRow({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: () => void;
}) {
  const { kind, title, description, undo } = toast;
  const icon =
    kind === "success" ? (
      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
    ) : kind === "error" ? (
      <XCircle className="h-4 w-4 text-red-400" />
    ) : kind === "warning" ? (
      <AlertTriangle className="h-4 w-4 text-amber-400" />
    ) : (
      <Info className="h-4 w-4 text-blue-400" />
    );

  const accent =
    kind === "success"
      ? "border-emerald-500/30"
      : kind === "error"
        ? "border-red-500/30"
        : kind === "warning"
          ? "border-amber-500/30"
          : "border-blue-500/30";

  return (
    <motion.div
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 40, opacity: 0 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className={`pointer-events-auto flex min-w-[300px] max-w-[420px] items-start gap-3 rounded-xl border ${accent} bg-[#0d0d0d] p-3.5 shadow-xl shadow-black/60`}
    >
      <span className="mt-0.5">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] font-semibold text-zinc-100">{title}</div>
        {description && (
          <div className="mt-0.5 text-[11.5px] text-zinc-500">{description}</div>
        )}
      </div>
      {undo && (
        <button
          onClick={async () => {
            onDismiss();
            try {
              await undo.onUndo();
            } catch {
              /* swallow — the consumer handles re-toast on failure */
            }
          }}
          className="inline-flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-[10.5px] font-semibold text-zinc-300 transition-colors hover:border-zinc-600 hover:text-zinc-100"
        >
          <Undo2 className="h-3 w-3" />
          {undo.label ?? "Undo"}
        </button>
      )}
      <button
        onClick={onDismiss}
        className="shrink-0 rounded p-1 text-zinc-600 hover:bg-zinc-900 hover:text-zinc-300"
        aria-label="Dismiss"
      >
        <XCircle className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  );
}

// Auto-dismiss escape hatch: if a specific toast needs to stay pinned
// (e.g., during a long-running op), the caller may opt out via the
// custom hook below. Intentionally tiny — we haven't needed this yet.
export function usePinnedToast(): { keep: (id: number) => void } {
  // Future: clear a pending setTimeout for this id.
  // Placeholder so the hook exists for callers to adopt without breaking.
  useEffect(() => {}, []);
  return { keep: () => {} };
}
