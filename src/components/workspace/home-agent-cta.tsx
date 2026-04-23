"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Loader2, CheckCircle2, XCircle } from "lucide-react";

/**
 * "Run daily briefing across all clients" button for the home page.
 *
 * Calls POST /api/agents/run with agent=daily_briefing, scope=all. Shows
 * per-client run results inline on completion and links the operator
 * straight to the newly populated Approval Queue.
 */
export function HomeAgentCTA() {
  const router = useRouter();
  const [state, setState] = useState<
    | { kind: "idle" }
    | { kind: "running" }
    | { kind: "done"; runs: number; failed: number; approvals: number }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

  const run = async () => {
    setState({ kind: "running" });
    try {
      const res = await fetch("/api/agents/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent: "daily_briefing", scope: "all" }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as {
        runs?: number;
        results?: Array<{
          status: string;
          approvalItemIds: string[];
          error?: string;
        }>;
      };
      const results = data.results ?? [];
      const runs = results.length;
      const failed = results.filter((r) => r.status === "failed").length;
      const approvals = results.reduce(
        (sum, r) => sum + r.approvalItemIds.length,
        0,
      );
      setState({ kind: "done", runs, failed, approvals });
      // Refresh so the pending count pill on the home page updates.
      router.refresh();
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  };

  if (state.kind === "done") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5 text-[12.5px]">
        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
        <span className="text-emerald-200">
          Ran across {state.runs} client{state.runs === 1 ? "" : "s"} ·{" "}
          <strong>{state.approvals}</strong> new item
          {state.approvals === 1 ? "" : "s"} for review
          {state.failed > 0 && (
            <>
              {" "}
              · <span className="text-amber-300">{state.failed} failed</span>
            </>
          )}
        </span>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2.5 text-[12.5px] text-red-200">
        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
        <div>
          <div className="font-semibold">Agent run failed</div>
          <div className="mt-0.5 text-[11.5px] text-red-300/80">
            {state.message}
          </div>
          <button
            onClick={run}
            className="mt-2 rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-[11px] font-semibold text-red-200 hover:bg-red-500/20"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={run}
      disabled={state.kind === "running"}
      className="inline-flex items-center gap-2 rounded-lg bg-zinc-100 px-3 py-2 text-[12.5px] font-semibold text-zinc-950 transition-all hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
    >
      {state.kind === "running" ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Agent is thinking…
        </>
      ) : (
        <>
          <Play className="h-3.5 w-3.5" />
          Run briefings now
        </>
      )}
    </button>
  );
}
