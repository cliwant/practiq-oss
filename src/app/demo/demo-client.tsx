"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  FileText,
  Download,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Upload,
  Sparkles,
  RotateCcw,
  ArrowRight,
  Lock,
} from "lucide-react";

type Stage = "idle" | "running" | "result" | "error";

interface SampleDescriptors {
  primary: { title: string; clientName: string; asOf: string; wordCount: number };
  priors: { title: string; clientName: string; asOf: string; wordCount: number }[];
}

interface RedlineResponse {
  docxBase64: string;
  filename: string;
  previewHtml: string;
  edits: { find: string; replace: string; reason: string }[];
  skipped: { find: string; reason: string }[];
  voiceNotes: string[];
  timingMs: { llm: number; redline: number; render: number; total: number };
  rateLimitRemaining: number;
  rateLimit: number;
  error?: string;
  retryAfterSec?: number;
  bookCallCta?: boolean;
}

const PROGRESS_CAPTIONS: Array<{ atSec: number; text: string }> = [
  { atSec: 0, text: "Reading your draft memo…" },
  { atSec: 10, text: "Cross-checking with prior client memos…" },
  { atSec: 25, text: "Generating tracked changes…" },
  { atSec: 50, text: "Writing the .docx…" },
];

const BOOK_CALL_HREF =
  "mailto:seungdo.keum@practiq.dev?subject=Practiq%20demo%20--%20can%20we%20talk%3F&body=I%20just%20tried%20the%20demo%20at%20practiq.dev%2Fdemo.%20Free%20for%20a%2015-min%20call%20%5Btime%5D.";

const PLACEHOLDER_PRIORS = [
  { title: "Q3 2025 Close Memo", asOf: "2025-09-30", wordCount: 220 },
  { title: "Q1 2026 Close Memo", asOf: "2026-03-31", wordCount: 130 },
];

export default function DemoClient() {
  const [stage, setStage] = useState<Stage>("idle");
  const [sample, setSample] = useState<SampleDescriptors | null>(null);
  const [progressCaption, setProgressCaption] = useState(PROGRESS_CAPTIONS[0].text);
  const [progressPct, setProgressPct] = useState(0);
  const [response, setResponse] = useState<RedlineResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [byoOpen, setByoOpen] = useState(false);
  const [byoPrimary, setByoPrimary] = useState<File | null>(null);
  const [byoPriors, setByoPriors] = useState<File[]>([]);
  const [byoClientName, setByoClientName] = useState("");
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load scenario metadata
  useEffect(() => {
    fetch("/api/demo/redline")
      .then((r) => r.json())
      .then((data) => setSample(data.sample))
      .catch(() => {
        // Non-fatal — page still works, just no metadata preview
      });
  }, []);

  // Cleanup any in-flight progress timer on unmount
  useEffect(() => {
    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, []);

  const startProgress = useCallback(() => {
    const startedAt = Date.now();
    progressTimerRef.current = setInterval(() => {
      const elapsedSec = (Date.now() - startedAt) / 1000;
      // Cap at 95% — final 5% reserved for actual response.
      const pct = Math.min(95, Math.floor((elapsedSec / 60) * 100));
      setProgressPct(pct);
      const next = [...PROGRESS_CAPTIONS]
        .reverse()
        .find((c) => elapsedSec >= c.atSec);
      if (next) setProgressCaption(next.text);
    }, 250);
  }, []);

  const stopProgress = useCallback(() => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }, []);

  const runSample = useCallback(async () => {
    setStage("running");
    setErrorMsg(null);
    setResponse(null);
    setProgressPct(0);
    setProgressCaption(PROGRESS_CAPTIONS[0].text);
    startProgress();

    try {
      const res = await fetch("/api/demo/redline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "sample" }),
      });
      const data = (await res.json()) as RedlineResponse;
      stopProgress();
      if (!res.ok) {
        setErrorMsg(data.error ?? `Request failed (${res.status})`);
        setStage("error");
        if (data.bookCallCta) {
          // Treat 429 as a soft state — still show error UI but with
          // book-a-call as primary CTA.
        }
        return;
      }
      setProgressPct(100);
      setResponse(data);
      setStage("result");
    } catch (err) {
      stopProgress();
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStage("error");
    }
  }, [startProgress, stopProgress]);

  const runByo = useCallback(async () => {
    if (!byoPrimary) {
      setErrorMsg("Please select a primary draft .docx first.");
      return;
    }
    if (byoPriors.length === 0) {
      setErrorMsg(
        "Please add at least one prior memo so the AI has a voice precedent.",
      );
      return;
    }
    setStage("running");
    setErrorMsg(null);
    setResponse(null);
    setProgressPct(0);
    setProgressCaption(PROGRESS_CAPTIONS[0].text);
    startProgress();
    try {
      const primaryB64 = await fileToBase64(byoPrimary);
      const priorsB64 = await Promise.all(byoPriors.map(fileToBase64));
      const res = await fetch("/api/demo/redline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "byo",
          primary: primaryB64,
          priors: priorsB64,
          primaryFilename: byoPrimary.name,
          clientName: byoClientName || undefined,
        }),
      });
      const data = (await res.json()) as RedlineResponse;
      stopProgress();
      if (!res.ok) {
        setErrorMsg(data.error ?? `Request failed (${res.status})`);
        setStage("error");
        return;
      }
      setProgressPct(100);
      setResponse(data);
      setStage("result");
    } catch (err) {
      stopProgress();
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStage("error");
    }
  }, [byoPrimary, byoPriors, byoClientName, startProgress, stopProgress]);

  const downloadDocx = useCallback(() => {
    if (!response) return;
    const bin = atob(response.docxBase64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const blob = new Blob([bytes], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = response.filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [response]);

  const reset = useCallback(() => {
    setStage("idle");
    setResponse(null);
    setErrorMsg(null);
    setProgressPct(0);
  }, []);

  // Nav, hero, cross-link, and book-call CTA are rendered server-side
  // by `src/app/demo/page.tsx`. This island owns only the interactive
  // redline stages, the BYO upload form, and the inline preview style
  // block consumed by the redline preview HTML.
  return (
    <>
      {/* MAIN STAGE */}
      {stage === "idle" && (
        <SampleStageIdle sample={sample} onRun={runSample} />
      )}
      {stage === "running" && (
        <RunningStage caption={progressCaption} pct={progressPct} />
      )}
      {stage === "error" && <ErrorStage message={errorMsg} onRetry={reset} />}
      {stage === "result" && response && (
        <ResultStage
          response={response}
          onDownload={downloadDocx}
          onReset={reset}
        />
      )}

      {/* BYO SECTION — always visible below the main stage */}
      <section className="mt-16">
        <button
          type="button"
          onClick={() => setByoOpen((v) => !v)}
          className="group flex w-full items-center justify-between rounded-2xl border border-zinc-800 bg-[#0a0a0a] px-5 py-4 text-left transition-colors hover:border-zinc-600"
          aria-expanded={byoOpen}
        >
          <div>
            <div className="text-sm font-semibold text-zinc-100">
              Try with your own draft + prior memos
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              Up to 1 primary .docx and 3 prior memos. Files are processed in
              memory only — never stored.
            </div>
          </div>
          <ArrowRight
            className={`h-4 w-4 text-zinc-500 transition-transform ${
              byoOpen ? "rotate-90" : "group-hover:translate-x-0.5"
            }`}
          />
        </button>
        {byoOpen && (
          <ByoForm
            primary={byoPrimary}
            priors={byoPriors}
            clientName={byoClientName}
            onPrimaryChange={setByoPrimary}
            onPriorsChange={setByoPriors}
            onClientNameChange={setByoClientName}
            onSubmit={runByo}
            busy={stage === "running"}
          />
        )}
      </section>

      {/* Inline preview styles */}
      <style jsx global>{`
        .redline-preview .preview-title {
          font-size: 1.5rem;
          font-weight: 800;
          color: #f4f4f5;
          margin: 0 0 1rem;
          letter-spacing: -0.02em;
        }
        .redline-preview h2 {
          font-size: 1.125rem;
          font-weight: 700;
          color: #f4f4f5;
          margin: 1.5rem 0 0.5rem;
          letter-spacing: -0.02em;
        }
        .redline-preview h3 {
          font-size: 1rem;
          font-weight: 700;
          color: #e4e4e7;
          margin: 1.25rem 0 0.5rem;
        }
        .redline-preview p {
          color: #a1a1aa;
          line-height: 1.65;
          margin: 0 0 0.75rem;
          font-size: 0.875rem;
        }
        .redline-preview .redline-ins {
          background: rgba(16, 185, 129, 0.18);
          color: #6ee7b7;
          padding: 0 2px;
          border-radius: 2px;
          text-decoration: none;
        }
        .redline-preview .redline-del {
          background: rgba(229, 72, 77, 0.18);
          color: #fca5a5;
          padding: 0 2px;
          border-radius: 2px;
          text-decoration: line-through;
          text-decoration-color: rgba(229, 72, 77, 0.7);
        }
      `}</style>
    </>
  );
}

/* ───────────────── Stage components ───────────────── */

function SampleStageIdle({
  sample,
  onRun,
}: {
  sample: SampleDescriptors | null;
  onRun: () => void;
}) {
  return (
    <section className="rounded-3xl border border-zinc-800 bg-[#0a0a0a] p-6 sm:p-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            Pre-loaded scenario
          </div>
          <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.03em] text-zinc-100">
            {sample?.primary.clientName ?? "Acme Manufacturing Ltd."}
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            A draft Q3 close memo plus two prior memos for the same fictional
            client. Practiq will redline the draft so it matches the firm&apos;s
            voice and conventions.
          </p>

          <div className="mt-6 space-y-2">
            <DocChip
              kind="primary"
              title={sample?.primary.title ?? "Q3 2026 Close Memo — DRAFT"}
              meta={
                sample?.primary
                  ? `${sample.primary.wordCount} words · ${sample.primary.asOf}`
                  : undefined
              }
            />
            {(sample?.priors ?? PLACEHOLDER_PRIORS).map((p, i) => (
              <DocChip
                key={i}
                kind="prior"
                title={p.title}
                meta={`${p.wordCount} words · ${p.asOf}`}
              />
            ))}
          </div>

          <div className="mt-6 flex items-center gap-2 text-xs text-zinc-500">
            <Lock className="h-3.5 w-3.5" />
            Files processed in memory only. Not stored.
          </div>
        </div>

        <div className="flex flex-col items-stretch gap-2 lg:items-end">
          <button
            type="button"
            onClick={onRun}
            className="btn-premium inline-flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <Sparkles className="h-4 w-4" />
            Generate redline
          </button>
          <span className="text-center text-[11px] text-zinc-500 lg:text-right">
            Takes about 30-60 seconds
          </span>
        </div>
      </div>
    </section>
  );
}

function DocChip({
  kind,
  title,
  meta,
}: {
  kind: "primary" | "prior";
  title: string;
  meta?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-[#111] px-4 py-3">
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-lg ${
          kind === "primary"
            ? "bg-blue-500/10 text-blue-400"
            : "bg-zinc-800 text-zinc-400"
        }`}
      >
        <FileText className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-zinc-200">{title}</div>
        {meta && (
          <div className="text-[11px] text-zinc-500">
            {kind === "primary" ? "Primary draft" : "Prior memo"} · {meta}
          </div>
        )}
      </div>
    </div>
  );
}

function RunningStage({ caption, pct }: { caption: string; pct: number }) {
  return (
    <section className="rounded-3xl border border-zinc-800 bg-[#0a0a0a] p-8 text-center sm:p-12">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
        <Sparkles className="h-5 w-5 animate-pulse" />
      </div>
      <h2 className="mt-5 text-xl font-bold text-zinc-100">{caption}</h2>
      <p className="mt-2 text-sm text-zinc-500">
        Hold tight — this runs the same redline pipeline our pilot firms use.
      </p>
      <div className="mx-auto mt-8 h-2 w-full max-w-md overflow-hidden rounded-full bg-zinc-900">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </section>
  );
}

function ErrorStage({
  message,
  onRetry,
}: {
  message: string | null;
  onRetry: () => void;
}) {
  return (
    <section className="rounded-3xl border border-red-500/20 bg-red-500/5 p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
        <AlertCircle className="h-5 w-5" />
      </div>
      <h2 className="mt-4 text-xl font-bold text-zinc-100">
        Something didn&apos;t fire
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">
        {message ?? "Unknown error. Try again, or book a call and we'll run it for you."}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={onRetry} className="btn-outline">
          Try again
        </button>
        <a href={BOOK_CALL_HREF} className="btn-premium inline-flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Book a 15-min call
        </a>
      </div>
    </section>
  );
}

function ResultStage({
  response,
  onDownload,
  onReset,
}: {
  response: RedlineResponse;
  onDownload: () => void;
  onReset: () => void;
}) {
  const totalSec = (response.timingMs.total / 1000).toFixed(1);
  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              Redline ready · {totalSec}s
            </div>
            <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.03em] text-zinc-100">
              {response.edits.length} suggested change
              {response.edits.length === 1 ? "" : "s"}
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              Open in Word and accept/reject natively. Each edit cites which
              prior memo motivated it.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onDownload}
              className="btn-premium inline-flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download .docx
            </button>
            <button
              type="button"
              onClick={onReset}
              className="btn-outline inline-flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        {/* Preview */}
        <div className="rounded-3xl border border-zinc-800 bg-[#0a0a0a] p-6 sm:p-8">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
              Browser preview
            </div>
            <div className="flex items-center gap-3 text-[11px] text-zinc-500">
              <LegendDot color="bg-emerald-500/40" label="Insertion" />
              <LegendDot color="bg-red-500/40" label="Deletion" />
            </div>
          </div>
          <div
            className="redline-preview max-h-[600px] overflow-y-auto rounded-xl border border-zinc-800/60 bg-[#050505] p-5"
            dangerouslySetInnerHTML={{ __html: response.previewHtml }}
          />
        </div>

        {/* Edits list */}
        <div className="rounded-3xl border border-zinc-800 bg-[#0a0a0a] p-6 sm:p-8">
          <div className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            Why these changes
          </div>
          <ul className="space-y-4">
            {response.edits.map((e, i) => (
              <li
                key={i}
                className="rounded-xl border border-zinc-800 bg-[#111] p-4"
              >
                <div className="text-[11px] text-zinc-500">{e.reason}</div>
                <div className="mt-2 space-y-1 font-mono text-xs leading-relaxed">
                  <div className="text-red-400">
                    <span className="mr-1 text-zinc-600">−</span>
                    <span className="line-through decoration-red-500/50">
                      {e.find}
                    </span>
                  </div>
                  <div className="text-emerald-400">
                    <span className="mr-1 text-zinc-600">+</span>
                    {e.replace}
                  </div>
                </div>
              </li>
            ))}
            {response.edits.length === 0 && (
              <li className="text-sm text-zinc-500">
                No edits — the draft already matched prior conventions. (This
                is rare. Hit reset and try again or use BYO.)
              </li>
            )}
          </ul>
          {response.skipped.length > 0 && (
            <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-[11px] text-amber-200/80">
              {response.skipped.length} suggestion
              {response.skipped.length === 1 ? "" : "s"} couldn&apos;t be applied
              (text spans formatting boundaries). The download still has every
              edit that did land.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-2.5 w-2.5 rounded-sm ${color}`} />
      <span>{label}</span>
    </span>
  );
}

function ByoForm({
  primary,
  priors,
  clientName,
  onPrimaryChange,
  onPriorsChange,
  onClientNameChange,
  onSubmit,
  busy,
}: {
  primary: File | null;
  priors: File[];
  clientName: string;
  onPrimaryChange: (f: File | null) => void;
  onPriorsChange: (f: File[]) => void;
  onClientNameChange: (s: string) => void;
  onSubmit: () => void;
  busy: boolean;
}) {
  return (
    <div className="mt-3 space-y-4 rounded-2xl border border-zinc-800 bg-[#0a0a0a] p-5">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-zinc-400">
          Client name (optional)
        </label>
        <input
          type="text"
          value={clientName}
          onChange={(e) => onClientNameChange(e.target.value)}
          placeholder="e.g. Northwind Industries"
          className="input-premium w-full"
        />
      </div>
      <FileSlot
        label="Primary draft (.docx)"
        accept=".docx"
        files={primary ? [primary] : []}
        onChange={(files) => onPrimaryChange(files[0] ?? null)}
        max={1}
      />
      <FileSlot
        label="Prior memos for this client (.docx, up to 3)"
        accept=".docx"
        files={priors}
        onChange={onPriorsChange}
        max={3}
      />
      <button
        type="button"
        onClick={onSubmit}
        disabled={busy || !primary || priors.length === 0}
        className="btn-premium inline-flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Sparkles className="h-4 w-4" />
        Run redline on my files
      </button>
      <div className="flex items-center gap-2 text-[11px] text-zinc-500">
        <Lock className="h-3 w-3" />
        Files are processed in memory only. Practiq does not store, log, or
        re-use your files.
      </div>
    </div>
  );
}

function FileSlot({
  label,
  accept,
  files,
  onChange,
  max,
}: {
  label: string;
  accept: string;
  files: File[];
  onChange: (files: File[]) => void;
  max: number;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-zinc-400">
        {label}
      </label>
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-700 bg-[#111] px-4 py-3 text-sm text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-200">
        <Upload className="h-4 w-4" />
        Choose file{max > 1 ? "s" : ""}
        <input
          type="file"
          accept={accept}
          multiple={max > 1}
          className="hidden"
          onChange={(e) => {
            const list = Array.from(e.target.files ?? []).slice(0, max);
            onChange(list);
          }}
        />
      </label>
      {files.length > 0 && (
        <ul className="mt-2 space-y-1">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex items-center justify-between rounded-lg bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-300"
            >
              <span className="truncate">{f.name}</span>
              <button
                type="button"
                onClick={() => onChange(files.filter((_, j) => j !== i))}
                className="text-zinc-500 transition-colors hover:text-red-400"
                aria-label={`Remove ${f.name}`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
