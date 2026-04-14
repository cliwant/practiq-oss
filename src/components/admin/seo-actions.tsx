"use client";
import { useState } from "react";
import { RefreshCw, Loader2 } from "lucide-react";

interface ActionResult {
  ok: boolean;
  summary?: Record<string, unknown>;
  total_urls?: number;
  error?: string;
}

export function SeoActions() {
  const [submitting, setSubmitting] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function runAction(endpoint: string, setBusy: (b: boolean) => void, label: string) {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch(endpoint, { method: "POST" });
      const data: ActionResult = await res.json();
      if (data.ok) {
        setResult(`${label}: ok — ${JSON.stringify(data.summary ?? data).slice(0, 200)}`);
      } else {
        setResult(`${label}: error — ${data.error ?? "unknown"}`);
      }
    } catch (e) {
      setResult(`${label}: network error — ${(e as Error).message}`);
    } finally {
      setBusy(false);
      setTimeout(() => setResult(null), 10_000);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => runAction("/api/seo/submit", setSubmitting, "Submit")}
          disabled={submitting || fetching}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors disabled:opacity-50"
        >
          {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          Submit now
        </button>
        <button
          type="button"
          onClick={() => runAction("/api/seo/fetch-performance", setFetching, "Fetch")}
          disabled={submitting || fetching}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors disabled:opacity-50"
        >
          {fetching ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          Fetch performance
        </button>
      </div>
      {result && (
        <div className="text-[10px] text-zinc-500 max-w-md text-right font-mono">
          {result}
        </div>
      )}
    </div>
  );
}
