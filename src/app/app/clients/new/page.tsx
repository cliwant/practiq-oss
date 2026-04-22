"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  ArrowLeft,
  Loader2,
} from "lucide-react";

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

/**
 * New-client wizard. Single page; every field optional except name +
 * industry. Everything else can be filled in later from the workspace.
 *
 * On submit, POST /api/clients → redirect to /app/clients/[id] so the
 * operator lands on the fresh workspace with zero contexts and can
 * immediately start adding knowledge.
 */
export default function NewClientPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState(INDUSTRIES[0]);
  const [userRole, setUserRole] = useState("CPA");
  const [reportTone, setReportTone] =
    useState<(typeof TONES)[number]>("professional");
  const [contactEmail, setContactEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = name.trim().length > 0 && industry.length > 0 && !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
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
      router.push(`/app/clients/${client.id}`);
      router.refresh(); // so the client list in the shell picks it up
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSubmitting(false);
    }
  };

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
          Add the skeleton. Upload documents or paste financial summaries once
          the workspace is live.
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

          {error && (
            <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-[12.5px] text-red-300">
              {error}
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
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Create client
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
