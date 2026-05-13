"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type {
  AiToolUsage,
  GeneratedPolicy,
  PolicyGeneratorFormState,
  SensitiveDataCategory,
} from "@/lib/policy-generator/types";

// ─── Static option tables ────────────────────────────────────────────

const VERTICAL_OPTIONS: {
  value: PolicyGeneratorFormState["vertical"];
  label: string;
  hint: string;
}[] = [
  {
    value: "legal",
    label: "Law firm",
    hint: "ABA Model Rules + Formal Opinion 512, state bar variations",
  },
  {
    value: "cpa",
    label: "CPA / accounting / bookkeeping",
    hint: "AICPA Code of Professional Conduct, SSARS / SSAE, Circular 230",
  },
  {
    value: "hr",
    label: "HR advisory / fractional HR",
    hint: "EEOC AI guidance, NYC LL 144, multi-state employment law",
  },
  {
    value: "marketing",
    label: "Marketing agency",
    hint: "FTC AI disclosure, copyright, platform policies",
  },
  {
    value: "consulting",
    label: "Consulting firm",
    hint: "Client confidentiality, IP boundaries, sector overlays",
  },
  {
    value: "other",
    label: "Other professional services",
    hint: "General AI governance principles",
  },
];

const FIRM_SIZE_OPTIONS = [
  "Solo",
  "2-5 people",
  "6-10 people",
  "11-25 people",
  "26-50 people",
  "50+ people",
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
  "DC",
];

const AI_USAGE_OPTIONS: { value: AiToolUsage; label: string }[] = [
  { value: "chatgpt", label: "ChatGPT (consumer or Team)" },
  { value: "claude", label: "Claude (consumer or API)" },
  { value: "copilot", label: "Microsoft 365 Copilot" },
  {
    value: "domain_saas",
    label: "Domain-specific AI SaaS (CoCounsel, Harvey, Karbon AI, etc.)",
  },
  { value: "none", label: "No AI tools yet" },
  { value: "exploring", label: "Currently exploring options" },
];

const SENSITIVE_DATA_OPTIONS: {
  value: SensitiveDataCategory;
  label: string;
}[] = [
  { value: "client_financial", label: "Client financial records" },
  { value: "medical_hipaa", label: "Medical / HIPAA-protected information" },
  {
    value: "attorney_privileged",
    label: "Attorney-client privileged communications",
  },
  { value: "pii", label: "Personally identifiable information (PII)" },
  { value: "trade_secrets", label: "Trade secrets / proprietary methodologies" },
  { value: "none", label: "None of the above" },
];

const APPROVAL_OPTIONS: {
  value: PolicyGeneratorFormState["approvalWorkflow"];
  label: string;
}[] = [
  {
    value: "partner_approved",
    label: "Partner-approved per use (every AI use needs a partner sign-off)",
  },
  {
    value: "blanket",
    label: "Blanket policy (pre-approved categories of use)",
  },
  {
    value: "case_by_case",
    label: "Case-by-case approval by engagement lead",
  },
  {
    value: "prohibited_client_facing",
    label: "Prohibited for client-facing work (internal use only)",
  },
];

const DISCLOSURE_OPTIONS: {
  value: PolicyGeneratorFormState["disclosurePreference"];
  label: string;
}[] = [
  { value: "always", label: "Always disclose AI use to clients" },
  { value: "on_request", label: "Disclose on client request" },
  { value: "internal_only", label: "Internal-only awareness (no client disclosure by default)" },
  { value: "undecided", label: "Undecided — recommend based on my vertical" },
];

// ─── Component ─────────────────────────────────────────────────────────

const TOTAL_STEPS = 7;

interface Attribution {
  landing_slug: string;
  source_platform: string | null;
  source_post_id: string | null;
  lane: string | null;
  campaign: string | null;
  topic: string | null;
}

interface ApiResponse {
  id: string;
  policy: GeneratedPolicy;
  pdf_url: string | null;
}

export function PolicyGeneratorClient() {
  const search = useSearchParams();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<PolicyGeneratorFormState>({
    vertical: "legal",
    firmName: "",
    firmSize: "",
    states: [],
    licenseType: "",
    aiUsage: [],
    sensitiveData: [],
    approvalWorkflow: "partner_approved",
    disclosurePreference: "undecided",
    name: "",
    email: "",
  });
  const [verticalPicked, setVerticalPicked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResponse | null>(null);

  const attribution: Attribution = useMemo(
    () => ({
      landing_slug: search.get("landing_slug") ?? "ai-policy-generator",
      source_platform: search.get("src"),
      source_post_id: search.get("post"),
      lane: search.get("lane"),
      campaign: search.get("campaign"),
      topic: search.get("topic"),
    }),
    [search],
  );

  const progressPct = ((step - 1) / (TOTAL_STEPS - 1)) * 100;

  // Fire policy_step_advanced when step changes (after first step).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const data = {
      type: "policy_step_advanced",
      properties: {
        step,
        vertical: form.vertical,
        landing_slug: attribution.landing_slug,
      },
      url: window.location.href,
    };
    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      keepalive: true,
    }).catch(() => {});
  }, [step, form.vertical, attribution.landing_slug]);

  function toggleArray<K extends keyof PolicyGeneratorFormState>(
    field: K,
    value: string,
  ) {
    setForm((prev) => {
      const arr = prev[field] as unknown as string[];
      const exists = arr.includes(value);
      const next = exists ? arr.filter((v) => v !== value) : [...arr, value];
      return { ...prev, [field]: next as unknown as PolicyGeneratorFormState[K] };
    });
  }

  function canAdvance(): boolean {
    switch (step) {
      case 1:
        return !!form.vertical;
      case 2:
        return form.firmName.trim().length > 0 && form.firmSize.length > 0;
      case 3:
        return form.aiUsage.length > 0;
      case 4:
        return form.sensitiveData.length > 0;
      case 5:
        return !!form.approvalWorkflow;
      case 6:
        return !!form.disclosurePreference;
      case 7:
        return (
          form.name.trim().length > 0 &&
          form.email.trim().length > 0 &&
          form.email.includes("@")
        );
      default:
        return false;
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/ai-policy-generator/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responses: form,
          attribution,
          page_url:
            typeof window !== "undefined" ? window.location.href : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? "Generation failed.");
      }
      setResult(data as ApiResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Result view ────────────────────────────────────────────────────
  if (result) {
    return <ResultView result={result} firmName={form.firmName} />;
  }

  // ── Vertical picker (pre-step) ─────────────────────────────────────
  if (!verticalPicked) {
    return (
      <section className="px-6 pb-16">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-zinc-800 bg-[#0a0a0a] p-8">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
              Step 1 of {TOTAL_STEPS}
            </p>
            <h2 className="mb-6 text-2xl font-extrabold tracking-[-0.02em] text-zinc-100">
              What kind of firm is this for?
            </h2>
            <p className="mb-6 text-sm text-zinc-400">
              We tailor the policy to your vertical's regulatory regime —
              ABA Model Rules for law firms, AICPA + Circular 230 for CPAs,
              EEOC + state employment law for HR advisory, and so on.
            </p>
            <div className="grid gap-3">
              {VERTICAL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setForm((prev) => ({ ...prev, vertical: opt.value }));
                    setVerticalPicked(true);
                    setStep(2);
                  }}
                  className="rounded-xl border border-zinc-800 bg-black px-5 py-4 text-left transition-all hover:border-zinc-500 hover:bg-zinc-900"
                >
                  <div className="text-sm font-bold text-zinc-100">
                    {opt.label}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">{opt.hint}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // ── Form steps ─────────────────────────────────────────────────────
  return (
    <section className="px-6 pb-16">
      <div className="mx-auto max-w-3xl">
        {/* Progress bar */}
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
              Step {step} of {TOTAL_STEPS}
            </p>
            <p className="text-xs text-zinc-500">
              Vertical:{" "}
              <span className="font-semibold text-zinc-300">
                {VERTICAL_OPTIONS.find((v) => v.value === form.vertical)?.label}
              </span>
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setVerticalPicked(false);
                    setStep(1);
                  }}
                  className="ml-2 text-zinc-500 underline hover:text-zinc-300"
                >
                  Change
                </button>
              )}
            </p>
          </div>
          <div
            role="progressbar"
            aria-label={`Policy generator step ${step} of ${TOTAL_STEPS}`}
            aria-valuenow={Math.round(progressPct)}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-1 w-full overflow-hidden rounded-full bg-zinc-900"
          >
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-zinc-800 bg-[#0a0a0a] p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              {step === 2 && (
                <Step2FirmSpecifics form={form} setForm={setForm} />
              )}
              {step === 3 && (
                <Step3AiUsage form={form} onToggle={toggleArray} />
              )}
              {step === 4 && (
                <Step4SensitiveData form={form} onToggle={toggleArray} />
              )}
              {step === 5 && (
                <Step5Approval form={form} setForm={setForm} />
              )}
              {step === 6 && (
                <Step6Disclosure form={form} setForm={setForm} />
              )}
              {step === 7 && (
                <Step7Email form={form} setForm={setForm} error={error} />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Nav buttons */}
          <div className="mt-8 flex items-center justify-between gap-4 border-t border-zinc-800 pt-6">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(2, s - 1))}
              disabled={step <= 2 || submitting}
              className="rounded-lg border border-zinc-700 px-5 py-2.5 text-sm font-semibold text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100 disabled:opacity-40"
            >
              Back
            </button>
            {step < TOTAL_STEPS ? (
              <button
                type="button"
                onClick={() => canAdvance() && setStep((s) => s + 1)}
                disabled={!canAdvance()}
                className="rounded-lg bg-zinc-100 px-6 py-2.5 text-sm font-bold text-zinc-950 transition-all hover:bg-white active:scale-[0.98] disabled:opacity-40"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={!canAdvance() || submitting}
                className="rounded-lg bg-zinc-100 px-6 py-2.5 text-sm font-bold text-zinc-950 transition-all hover:bg-white active:scale-[0.98] disabled:opacity-40"
              >
                {submitting ? "Generating policy…" : "Generate my policy"}
              </button>
            )}
          </div>
        </form>

        <p className="mt-6 text-center text-[11px] text-zinc-600">
          This generates a draft for your firm's internal review.
          It is not legal advice. Review with qualified counsel before adoption.
        </p>
      </div>
    </section>
  );
}

// ─── Step subcomponents ────────────────────────────────────────────────

function Step2FirmSpecifics({
  form,
  setForm,
}: {
  form: PolicyGeneratorFormState;
  setForm: React.Dispatch<React.SetStateAction<PolicyGeneratorFormState>>;
}) {
  return (
    <div>
      <h2 className="mb-2 text-2xl font-extrabold tracking-[-0.02em] text-zinc-100">
        Firm details
      </h2>
      <p className="mb-6 text-sm text-zinc-400">
        We use these to make the policy reference your actual firm by name
        and address the states you operate in.
      </p>
      <div className="space-y-5">
        <div>
          <label
            htmlFor="policy-firm-name"
            className="mb-2 block text-xs font-bold uppercase tracking-widest text-zinc-400"
          >
            Firm name
          </label>
          <input
            id="policy-firm-name"
            name="firmName"
            type="text"
            value={form.firmName}
            onChange={(e) =>
              setForm((p) => ({ ...p, firmName: e.target.value }))
            }
            placeholder="Smith & Associates LLP"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
          />
        </div>
        <div>
          <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-zinc-400">
            Firm size
          </span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {FIRM_SIZE_OPTIONS.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setForm((p) => ({ ...p, firmSize: size }))}
                className={`rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                  form.firmSize === size
                    ? "border-emerald-500/50 bg-emerald-500/5 text-zinc-100"
                    : "border-zinc-800 bg-black text-zinc-300 hover:border-zinc-600"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-zinc-400">
            States of operation{" "}
            <span className="text-zinc-500">(select all that apply)</span>
          </span>
          <div className="flex max-h-56 flex-wrap gap-1.5 overflow-y-auto rounded-xl border border-zinc-800 bg-black p-3">
            {US_STATES.map((s) => {
              const selected = form.states.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() =>
                    setForm((p) => ({
                      ...p,
                      states: selected
                        ? p.states.filter((x) => x !== s)
                        : [...p.states, s],
                    }))
                  }
                  className={`rounded-md border px-2.5 py-1 text-xs font-mono transition-colors ${
                    selected
                      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                      : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label
            htmlFor="policy-license-type"
            className="mb-2 block text-xs font-bold uppercase tracking-widest text-zinc-400"
          >
            License or bar type{" "}
            <span className="text-zinc-500">(optional)</span>
          </label>
          <input
            id="policy-license-type"
            name="licenseType"
            type="text"
            value={form.licenseType}
            onChange={(e) =>
              setForm((p) => ({ ...p, licenseType: e.target.value }))
            }
            placeholder="e.g. CPA, EA, JD/NY Bar, SHRM-CP"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}

function Step3AiUsage({
  form,
  onToggle,
}: {
  form: PolicyGeneratorFormState;
  onToggle: <K extends keyof PolicyGeneratorFormState>(
    field: K,
    value: string,
  ) => void;
}) {
  return (
    <div>
      <h2 className="mb-2 text-2xl font-extrabold tracking-[-0.02em] text-zinc-100">
        Which AI tools is the firm currently using?
      </h2>
      <p className="mb-6 text-sm text-zinc-400">
        Select all that apply. We use this to call out which tools the
        policy needs to cover by name.
      </p>
      <div className="grid gap-2">
        {AI_USAGE_OPTIONS.map((opt) => {
          const selected = form.aiUsage.includes(opt.value);
          return (
            <label
              key={opt.value}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 text-sm transition-colors ${
                selected
                  ? "border-emerald-500/50 bg-emerald-500/5 text-zinc-100"
                  : "border-zinc-800 bg-black/40 text-zinc-300 hover:border-zinc-600"
              }`}
            >
              <input
                type="checkbox"
                checked={selected}
                onChange={() => onToggle("aiUsage", opt.value)}
                className="mt-0.5 h-4 w-4 flex-shrink-0 accent-emerald-500"
              />
              <span>{opt.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function Step4SensitiveData({
  form,
  onToggle,
}: {
  form: PolicyGeneratorFormState;
  onToggle: <K extends keyof PolicyGeneratorFormState>(
    field: K,
    value: string,
  ) => void;
}) {
  return (
    <div>
      <h2 className="mb-2 text-2xl font-extrabold tracking-[-0.02em] text-zinc-100">
        Which sensitive data categories does the firm handle?
      </h2>
      <p className="mb-6 text-sm text-zinc-400">
        Each category triggers specific guardrails in the data-handling
        section of the policy.
      </p>
      <div className="grid gap-2">
        {SENSITIVE_DATA_OPTIONS.map((opt) => {
          const selected = form.sensitiveData.includes(opt.value);
          return (
            <label
              key={opt.value}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 text-sm transition-colors ${
                selected
                  ? "border-emerald-500/50 bg-emerald-500/5 text-zinc-100"
                  : "border-zinc-800 bg-black/40 text-zinc-300 hover:border-zinc-600"
              }`}
            >
              <input
                type="checkbox"
                checked={selected}
                onChange={() => onToggle("sensitiveData", opt.value)}
                className="mt-0.5 h-4 w-4 flex-shrink-0 accent-emerald-500"
              />
              <span>{opt.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function Step5Approval({
  form,
  setForm,
}: {
  form: PolicyGeneratorFormState;
  setForm: React.Dispatch<React.SetStateAction<PolicyGeneratorFormState>>;
}) {
  return (
    <div>
      <h2 className="mb-2 text-2xl font-extrabold tracking-[-0.02em] text-zinc-100">
        How does the firm want to approve AI use?
      </h2>
      <p className="mb-6 text-sm text-zinc-400">
        This shapes the approval-workflow section of the policy.
      </p>
      <div className="grid gap-2">
        {APPROVAL_OPTIONS.map((opt) => (
          <label
            key={opt.value}
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 text-sm transition-colors ${
              form.approvalWorkflow === opt.value
                ? "border-emerald-500/50 bg-emerald-500/5 text-zinc-100"
                : "border-zinc-800 bg-black/40 text-zinc-300 hover:border-zinc-600"
            }`}
          >
            <input
              type="radio"
              name="approval"
              checked={form.approvalWorkflow === opt.value}
              onChange={() =>
                setForm((p) => ({ ...p, approvalWorkflow: opt.value }))
              }
              className="mt-0.5 h-4 w-4 flex-shrink-0 accent-emerald-500"
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function Step6Disclosure({
  form,
  setForm,
}: {
  form: PolicyGeneratorFormState;
  setForm: React.Dispatch<React.SetStateAction<PolicyGeneratorFormState>>;
}) {
  return (
    <div>
      <h2 className="mb-2 text-2xl font-extrabold tracking-[-0.02em] text-zinc-100">
        Disclosure preference
      </h2>
      <p className="mb-6 text-sm text-zinc-400">
        Whether and when AI use should be disclosed to clients.
      </p>
      <div className="grid gap-2">
        {DISCLOSURE_OPTIONS.map((opt) => (
          <label
            key={opt.value}
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 text-sm transition-colors ${
              form.disclosurePreference === opt.value
                ? "border-emerald-500/50 bg-emerald-500/5 text-zinc-100"
                : "border-zinc-800 bg-black/40 text-zinc-300 hover:border-zinc-600"
            }`}
          >
            <input
              type="radio"
              name="disclosure"
              checked={form.disclosurePreference === opt.value}
              onChange={() =>
                setForm((p) => ({ ...p, disclosurePreference: opt.value }))
              }
              className="mt-0.5 h-4 w-4 flex-shrink-0 accent-emerald-500"
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function Step7Email({
  form,
  setForm,
  error,
}: {
  form: PolicyGeneratorFormState;
  setForm: React.Dispatch<React.SetStateAction<PolicyGeneratorFormState>>;
  error: string | null;
}) {
  return (
    <div>
      <h2 className="mb-2 text-2xl font-extrabold tracking-[-0.02em] text-zinc-100">
        Where should we send the PDF?
      </h2>
      <p className="mb-6 text-sm text-zinc-400">
        We'll generate the draft policy and email you a copy. The policy
        is yours — no follow-up sequence required.
      </p>
      <div className="space-y-4">
        <div>
          <label
            htmlFor="policy-contact-name"
            className="mb-2 block text-xs font-bold uppercase tracking-widest text-zinc-400"
          >
            Your name
          </label>
          <input
            id="policy-contact-name"
            name="contactName"
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="Jane Smith"
            autoComplete="name"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
          />
        </div>
        <div>
          <label
            htmlFor="policy-contact-email"
            className="mb-2 block text-xs font-bold uppercase tracking-widest text-zinc-400"
          >
            Work email
          </label>
          <input
            id="policy-contact-email"
            name="contactEmail"
            type="email"
            required
            data-ph-no-capture
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            placeholder="jane@firm.com"
            autoComplete="email"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
          />
        </div>
        {error && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </p>
        )}
        <p className="text-[11px] text-zinc-600">
          By submitting, you agree to receive the draft policy by email.
          We do not share your address. Unsubscribing removes you from our
          list entirely.
        </p>
      </div>
    </div>
  );
}

// ─── Result view ───────────────────────────────────────────────────────

function ResultView({
  result,
  firmName,
}: {
  result: ApiResponse;
  firmName: string;
}) {
  const { id, policy, pdf_url } = result;
  // PDF is now lazy-rendered on first download via /[id]/pdf. The
  // cached Storage URL (if it exists from a previous click) is faster
  // than hitting the lazy route, but the lazy route 302-redirects to
  // it after the first render so both are safe.
  const pdfHref =
    pdf_url ??
    (id && id !== "unknown" ? `/api/ai-policy-generator/${id}/pdf` : null);
  return (
    <section className="px-6 pb-20">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-emerald-950/30 to-[#0a0a0a] p-8">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">
            Draft ready
          </p>
          <h2 className="mb-4 text-3xl font-extrabold tracking-[-0.02em] text-zinc-100">
            {policy.policy_title}
          </h2>
          <p className="mb-6 text-sm leading-relaxed text-zinc-300">
            Your draft AI usage policy is ready below. The PDF takes
            a few seconds to render on first click; we will also email
            you a copy. Review with qualified counsel before adoption.
          </p>
          <div className="flex flex-wrap gap-3">
            {pdfHref && (
              <a
                href={pdfHref}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-zinc-100 px-5 py-2.5 text-sm font-bold text-zinc-950 transition-colors hover:bg-white"
              >
                Download PDF
              </a>
            )}
            <Link
              href="/professional-services-ai-evidence-layer"
              className="rounded-lg border border-zinc-700 px-5 py-2.5 text-sm font-semibold text-zinc-200 transition-colors hover:border-zinc-500 hover:text-zinc-100"
            >
              See how Practiq enforces this →
            </Link>
          </div>
        </div>

        {/* Preview */}
        <article className="rounded-2xl border border-zinc-800 bg-[#0a0a0a] p-8">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            Preview · {firmName || "Your firm"}
          </p>
          <h3 className="mb-4 text-xl font-bold text-zinc-100">Preamble</h3>
          <p className="mb-8 text-sm leading-relaxed text-zinc-300">
            {policy.preamble}
          </p>
          {policy.sections.map((s, idx) => (
            <div key={idx} className="mb-8 border-t border-zinc-800 pt-6">
              <h3 className="mb-3 text-lg font-bold text-zinc-100">
                {idx + 1}. {s.heading}
              </h3>
              <div className="whitespace-pre-line text-sm leading-relaxed text-zinc-300">
                {s.body}
              </div>
            </div>
          ))}
          <div className="mt-8 border-t border-zinc-800 pt-6">
            <h3 className="mb-3 text-lg font-bold text-zinc-100">
              Key obligations
            </h3>
            <ul className="space-y-2">
              {policy.key_obligations.map((ob, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-sm leading-relaxed text-zinc-300"
                >
                  <span className="mt-0.5 text-emerald-400">•</span>
                  <span>{ob}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-8 border-t border-zinc-800 pt-6 text-xs italic text-zinc-500">
            {policy.review_cycle}
          </p>
          <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-xs leading-relaxed text-amber-200">
            {policy.footer_disclaimer}
          </div>
        </article>

        <div className="mt-10 rounded-2xl border border-zinc-800 bg-[#0a0a0a] p-8">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            What this policy describes — Practiq builds it in
          </p>
          <p className="mb-4 text-sm leading-relaxed text-zinc-300">
            Practiq embeds review-state tracking, source provenance, and
            the approval workflows this policy describes into every
            AI-assisted task. Pre-launch.
          </p>
          <Link
            href="/professional-services-ai-evidence-layer"
            className="text-sm font-semibold text-zinc-100 underline decoration-zinc-700 underline-offset-4 hover:decoration-zinc-400"
          >
            See how Practiq fits →
          </Link>
        </div>
      </div>
    </section>
  );
}
