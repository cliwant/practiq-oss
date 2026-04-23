"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  ArrowLeft,
  Loader2,
  Sparkles,
  FileText,
  Upload,
  CheckCircle2,
  X,
} from "lucide-react";
import { isMostlyBinary } from "@/lib/text-binary";

const INDUSTRIES = [
  "Food & Beverage",
  "SaaS",
  "Healthcare",
  "Real Estate",
  "Retail",
  "Manufacturing",
  "Services",
  "Legal",
  "Consulting",
  "Other",
];

const TONES = ["professional", "casual", "technical", "formal"] as const;

interface UploadedDoc {
  name: string;
  size: number;
  text: string;
  /** Read-only in the UI — user can delete before submit. */
}

/**
 * New-client wizard. Everything except name + industry is optional.
 *
 * After the basic skeleton, the operator can:
 *   - Paste a context paragraph (agent extracts + pins key facts)
 *   - Drag-drop .txt / .md / .pdf-as-text / .docx-as-text files and
 *     the agent runs the same extractor per-document
 *
 * On submit: create client → for each chunk of initial context, POST
 * /api/clients/{id}/extract with persist=true → redirect to the
 * freshly-populated workspace.
 */
export default function NewClientPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [industry, setIndustry] = useState(INDUSTRIES[0]);
  const [userRole, setUserRole] = useState("CPA");
  const [reportTone, setReportTone] =
    useState<(typeof TONES)[number]>("professional");
  const [contactEmail, setContactEmail] = useState("");

  // Optional initial-context payloads
  const [pastedContext, setPastedContext] = useState("");
  const [uploads, setUploads] = useState<UploadedDoc[]>([]);

  // Submission state machine
  const [phase, setPhase] = useState<
    "idle" | "creating" | "extracting" | "done"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [extractProgress, setExtractProgress] = useState("");

  const canSubmit =
    name.trim().length > 0 && industry.length > 0 && phase === "idle";

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    await ingestFiles(files);
  };

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    await ingestFiles(files);
    // reset input so selecting the same file again re-triggers
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const ingestFiles = async (files: File[]) => {
    const next: UploadedDoc[] = [];
    for (const f of files) {
      if (f.size > 10 * 1024 * 1024) {
        setError(`${f.name} exceeds 10MB. Skipping.`);
        continue;
      }
      // Read as text. PDFs and DOCXes will come in as garbled bytes — we
      // label those clearly; proper PDF parsing ships in a Phase 2
      // upgrade (FastAPI + python-docx/openpyxl).
      try {
        const text = await f.text();
        // Skip clearly-binary content.
        if (isMostlyBinary(text)) {
          setError(
            `${f.name} looks binary (PDF/DOCX parsing lands in Phase 2). Paste the relevant text below instead.`,
          );
          continue;
        }
        next.push({ name: f.name, size: f.size, text });
      } catch (err) {
        setError(`Couldn't read ${f.name}: ${err instanceof Error ? err.message : err}`);
      }
    }
    if (next.length) setUploads((prev) => [...prev, ...next]);
  };

  const removeUpload = (idx: number) => {
    setUploads((prev) => prev.filter((_, i) => i !== idx));
  };

  const submit = async () => {
    if (!canSubmit) return;
    setPhase("creating");
    setError(null);

    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          industry,
          userRole,
          relationshipMonths: 0,
          preferences: {
            reportTone,
            preferredFormats: ["docx", "xlsx"],
            contactEmail: contactEmail.trim() || undefined,
          },
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `${res.status}`);
      }
      const { client } = await res.json();

      // Kick off extraction for any initial context the operator seeded.
      const extractJobs: Array<{ sourceName: string; text: string }> = [];
      if (pastedContext.trim().length > 0) {
        extractJobs.push({
          sourceName: "Initial notes",
          text: pastedContext.trim(),
        });
      }
      for (const u of uploads) {
        extractJobs.push({ sourceName: u.name, text: u.text });
      }

      if (extractJobs.length > 0) {
        setPhase("extracting");
        for (let i = 0; i < extractJobs.length; i++) {
          const job = extractJobs[i];
          setExtractProgress(
            `Extracting ${i + 1}/${extractJobs.length}: ${job.sourceName}`,
          );
          // Fire in sequence to avoid flooding Claude with parallel jobs.
          const extractRes = await fetch(
            `/api/clients/${client.id}/extract`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...job, persist: true }),
            },
          );
          if (!extractRes.ok) {
            // Soft-fail per-doc — client is already created; user can
            // retry extraction manually from the Knowledge tab.
            const j = await extractRes.json().catch(() => ({}));
            console.warn(`extract failed for ${job.sourceName}:`, j);
          }
        }
      }

      setPhase("done");
      router.push(`/app/clients/${client.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("idle");
    }
  };

  const busy = phase === "creating" || phase === "extracting";

  return (
    <div className="h-full overflow-y-auto bg-[#050505]">
      <div className="mx-auto max-w-xl px-10 py-16">
        <Link
          href="/app"
          className="mb-6 inline-flex items-center gap-2 text-[12px] text-zinc-500 transition-colors hover:text-zinc-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to workspace
        </Link>

        <h1 className="text-[22px] font-extrabold tracking-tight text-zinc-100">
          New client
        </h1>
        <p className="mt-1 text-[13px] text-zinc-500">
          Add the skeleton. Paste or drop what you know — the agent extracts
          and pins key facts.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="mt-8 space-y-5"
        >
          <Field label="Company name" required>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Kim's Restaurant"
              className={inputCls}
              autoFocus
              required
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Industry" required>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className={inputCls}
                required
              >
                {INDUSTRIES.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Your role">
              <input
                type="text"
                value={userRole}
                onChange={(e) => setUserRole(e.target.value)}
                placeholder="CPA"
                className={inputCls}
              />
            </Field>
          </div>

          <Field label="Preferred report tone">
            <div className="grid grid-cols-4 gap-2">
              {TONES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setReportTone(t)}
                  className={`rounded-lg border px-3 py-2 text-[12px] font-medium capitalize transition-colors ${
                    reportTone === t
                      ? "border-zinc-500 bg-zinc-800/80 text-zinc-100"
                      : "border-zinc-900 bg-[#0a0a0a] text-zinc-500 hover:border-zinc-800 hover:text-zinc-300"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </Field>

          <Field
            label="Primary contact email"
            hint="Used for drafting client-facing messages."
          >
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="owner@client.com"
              className={inputCls}
            />
          </Field>

          {/* ── Initial context (optional) ────────────────────── */}
          <div className="rounded-2xl border border-zinc-900 bg-gradient-to-br from-[#0b0b0b] to-[#080808] p-5">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <div>
                <h2 className="text-[13px] font-bold text-zinc-100">
                  Seed the agent (optional)
                </h2>
                <p className="text-[11.5px] text-zinc-500">
                  Whatever you drop here, the agent extracts + pins. Skip it
                  if you just want an empty workspace.
                </p>
              </div>
            </div>

            <Field label="Paste notes, emails, or a summary">
              <textarea
                value={pastedContext}
                onChange={(e) => setPastedContext(e.target.value)}
                rows={5}
                placeholder={`e.g. "Kim's Restaurant — Korean BBQ in downtown. Family-owned, 8 employees, ~$145K monthly revenue. Owner Kim Lee is data-driven; prefers brief updates. Main concern: rising food costs (March spike +12%). S-Corp, uses QuickBooks Online."`}
                className={`${inputCls} font-sans leading-relaxed resize-y min-h-[120px]`}
              />
            </Field>

            {/* Drag-drop uploader */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 px-4 py-5 text-center transition-colors hover:border-zinc-700 hover:bg-zinc-900/40"
            >
              <Upload className="mb-2 h-5 w-5 text-zinc-500" />
              <p className="text-[12.5px] font-medium text-zinc-300">
                Drop files or click to browse
              </p>
              <p className="mt-0.5 text-[10.5px] text-zinc-600">
                .txt / .md today · 10MB max · PDF + DOCX coming (Phase 2)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".txt,.md,.csv,text/plain,text/markdown"
                onChange={handleFilePick}
                className="hidden"
              />
            </div>

            {uploads.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {uploads.map((u, i) => (
                  <li
                    key={`${u.name}-${i}`}
                    className="flex items-center gap-2 rounded-lg border border-zinc-900 bg-[#0a0a0a] px-3 py-2 text-[12px]"
                  >
                    <FileText className="h-3.5 w-3.5 text-zinc-500" />
                    <span className="flex-1 truncate text-zinc-200">
                      {u.name}
                    </span>
                    <span className="text-[10.5px] text-zinc-600">
                      {Math.round(u.size / 1024)}KB
                    </span>
                    <button
                      type="button"
                      onClick={() => removeUpload(i)}
                      className="rounded p-0.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
                      aria-label={`Remove ${u.name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && (
            <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-[12.5px] text-red-300">
              {error}
            </div>
          )}

          {phase === "extracting" && (
            <div className="flex items-center gap-2 rounded-lg border border-zinc-900 bg-[#0a0a0a] px-3 py-2 text-[12px] text-zinc-400">
              <Loader2 className="h-3 w-3 animate-spin text-zinc-500" />
              <span>{extractProgress}</span>
            </div>
          )}
          {phase === "done" && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-900/50 bg-emerald-500/5 px-3 py-2 text-[12px] text-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>Ready. Redirecting to workspace…</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-4">
            <Link
              href="/app"
              className="rounded-lg border border-zinc-800 px-4 py-2.5 text-[13px] font-medium text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-100"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-100 px-4 py-2.5 text-[13px] font-semibold text-zinc-950 transition-all hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              {phase === "creating"
                ? "Creating…"
                : phase === "extracting"
                  ? "Extracting…"
                  : "Create client"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2.5 text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none";

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline gap-2">
        <span className="text-[11.5px] font-semibold uppercase tracking-wider text-zinc-400">
          {label}
        </span>
        {required && (
          <span className="text-[10.5px] text-zinc-600">required</span>
        )}
      </span>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1 text-[11px] text-zinc-600">{hint}</p>}
    </label>
  );
}

// isMostlyBinary moved to src/lib/text-binary.ts so a unit test can
// cover it without loading the React client bundle.
