"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Wrench, ArrowRight, X } from "lucide-react";
import type { Workflow } from "@/lib/workflows/builtin";

const VERTICAL_LABEL: Record<Workflow["vertical"], string> = {
  cpa: "CPA",
  hr: "HR",
  legal: "Legal",
  "marketing-agency": "Marketing",
};

const VERTICAL_COLOR: Record<Workflow["vertical"], string> = {
  cpa: "#10b981",
  hr: "#06b6d4",
  legal: "#a855f7",
  "marketing-agency": "#f97316",
};

interface ClientLite {
  id: string;
  name: string;
  industry: string;
}

/**
 * Workflow gallery — cards + a client-picker modal that fires the
 * /api/workflows/{slug}/run POST. On success the operator lands in
 * the per-client chat with the seeded conversation already open.
 */
export function WorkflowsScreen({
  workflows,
  clients,
}: {
  workflows: Workflow[];
  clients: ClientLite[];
}) {
  const router = useRouter();
  const [picker, setPicker] = useState<Workflow | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const start = async (workflow: Workflow, clientId: string) => {
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/workflows/${workflow.slug}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { clientId: string };
      router.push(`/app/clients/${data.clientId}?tab=chat`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-[#050505]">
      <header className="border-b border-zinc-900 bg-[#080808] px-8 py-5">
        <p className="text-[10.5px] font-bold uppercase tracking-widest text-zinc-600">
          Workflows
        </p>
        <h1 className="mt-0.5 text-[19px] font-extrabold tracking-tight text-zinc-100">
          Vertical workflow library
        </h1>
        <p className="mt-1 max-w-2xl text-[12.5px] leading-relaxed text-zinc-500">
          Each workflow loads a domain-specific prompt fragment + tool
          recommendations into a fresh conversation. Pick a client, upload
          the inputs, and the agent runs the framing automatically.
        </p>
      </header>

      <div className="flex-1 overflow-y-auto px-8 py-8">
        <ul className="mx-auto grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-2">
          {workflows.map((w) => (
            <li
              key={w.slug}
              className="group relative flex flex-col overflow-hidden rounded-xl border border-zinc-800 bg-[#0a0a0a] p-5 transition-colors hover:border-zinc-600"
            >
              <span
                className="absolute left-0 top-0 h-full w-0.5"
                style={{ background: VERTICAL_COLOR[w.vertical] }}
                aria-hidden
              />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span
                    className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest"
                    style={{
                      color: VERTICAL_COLOR[w.vertical],
                      background: `${VERTICAL_COLOR[w.vertical]}15`,
                    }}
                  >
                    {VERTICAL_LABEL[w.vertical]}
                  </span>
                  <h2 className="mt-2 text-[16px] font-bold text-zinc-100">
                    {w.name}
                  </h2>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-zinc-400">
                    {w.description}
                  </p>
                </div>
                <Sparkles className="h-4 w-4 shrink-0 text-zinc-600" />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                <Wrench className="h-3 w-3 text-zinc-600" />
                {w.suggested_tools.map((t) => (
                  <span
                    key={t}
                    className="rounded-md bg-zinc-900 px-1.5 py-0.5 font-mono text-[10.5px] text-zinc-400"
                  >
                    {t}
                  </span>
                ))}
              </div>

              {w.example_inputs[0] && (
                <p className="mt-3 text-[11.5px] italic leading-relaxed text-zinc-500">
                  e.g. {w.example_inputs[0]}
                </p>
              )}

              <button
                onClick={() => setPicker(w)}
                disabled={clients.length === 0}
                className="mt-5 inline-flex items-center justify-center gap-2 self-start rounded-lg bg-zinc-100 px-4 py-2 text-[12.5px] font-semibold text-zinc-950 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Start workflow
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
              {clients.length === 0 && (
                <p className="mt-2 text-[11px] text-zinc-600">
                  Add a client first to start a workflow.
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>

      {picker && (
        <ClientPickerModal
          workflow={picker}
          clients={clients}
          busy={busy}
          err={err}
          onClose={() => {
            if (!busy) {
              setPicker(null);
              setErr(null);
            }
          }}
          onPick={(cid) => start(picker, cid)}
        />
      )}
    </div>
  );
}

function ClientPickerModal({
  workflow,
  clients,
  busy,
  err,
  onClose,
  onPick,
}: {
  workflow: Workflow;
  clients: ClientLite[];
  busy: boolean;
  err: string | null;
  onClose: () => void;
  onPick: (clientId: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(
    clients[0]?.id ?? null,
  );
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="workflow-picker-title"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-zinc-800 bg-[#0a0a0a] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-widest text-zinc-600">
              Start workflow
            </p>
            <h3
              id="workflow-picker-title"
              className="mt-0.5 text-[17px] font-extrabold text-zinc-100"
            >
              {workflow.name}
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="rounded p-1 text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-zinc-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-3 text-[12.5px] leading-relaxed text-zinc-400">
          Pick the client whose workspace this workflow should run inside.
        </p>

        <ul className="mt-4 max-h-72 space-y-1 overflow-y-auto">
          {clients.map((c) => (
            <li key={c.id}>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-transparent px-3 py-2 hover:border-zinc-700 hover:bg-zinc-900/50">
                <input
                  type="radio"
                  name="client"
                  value={c.id}
                  checked={selected === c.id}
                  onChange={() => setSelected(c.id)}
                  className="h-3.5 w-3.5 accent-zinc-100"
                />
                <span className="flex-1">
                  <span className="block text-[13px] font-medium text-zinc-100">
                    {c.name}
                  </span>
                  <span className="block text-[11px] text-zinc-500">
                    {c.industry}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>

        {err && (
          <p className="mt-3 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-[12px] text-red-300">
            {err}
          </p>
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border border-zinc-800 bg-[#0a0a0a] px-4 py-2 text-[12.5px] font-medium text-zinc-300 transition-colors hover:border-zinc-700 hover:text-zinc-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => selected && onPick(selected)}
            disabled={busy || !selected}
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-100 px-4 py-2 text-[12.5px] font-semibold text-zinc-950 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Starting…" : "Start"}
            {!busy && <ArrowRight className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
