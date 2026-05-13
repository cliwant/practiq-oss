"use client";

/**
 * Self-serve workflow audit, mounted at /workflow-audit.
 *
 * Replaces the passive "request a 15-minute audit" CTA with an active
 * artifact: the visitor answers 8 short questions about their firm
 * and a recent engagement, and gets back an LLM-generated audit
 * mapped to Practiq's four-objects framework (source / review state
 * / client context / handoff).
 *
 * The page has three visual modes:
 *   1. Form mode — the 8-step multi-step questionnaire.
 *   2. Generating — the report is streaming back from the API.
 *   3. Report mode — the audit is rendered inline; we also email a copy.
 *
 * SNS attribution: every query param the topic-landing pages forward
 * (landing_slug, src, post, lane, topic, campaign) is captured on
 * mount and re-emitted on every analytics event so the operator can
 * tie completions back to specific outbound posts.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Sparkles,
  FileText,
} from "lucide-react";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";
import { trackClient } from "@/lib/analytics/track-client";
import {
  STEPS,
  FIRM_VERTICAL_OPTIONS,
  FIRM_SIZE_OPTIONS,
  CLIENT_COUNT_OPTIONS,
  AI_USAGE_OPTIONS,
  HANDOFF_GAP_OPTIONS,
  REPEAT_FREQUENCY_OPTIONS,
  REVIEWER_PAIN_OPTIONS,
  COMPLIANCE_CONCERNS_BY_VERTICAL,
} from "./steps";
import type {
  AuditResponses,
  ContactInfo,
  AuditReport,
  SnsAttribution,
  FirmVertical,
  AiUsage,
  HandoffGap,
  RepeatFrequency,
  ReviewerPain,
  GenerateAuditResponse,
} from "./types";

const TOTAL_STEPS = STEPS.length;

const INITIAL_RESPONSES: AuditResponses = {
  firm_vertical: "",
  firm_size: "",
  client_count: "",
  recent_engagement: "",
  current_ai_usage: [],
  current_ai_usage_specify: "",
  handoff_gaps: [],
  repeat_frequency: "",
  reviewer_pain: "",
  compliance_concerns: [],
};

const INITIAL_CONTACT: ContactInfo = {
  name: "",
  email: "",
  firm_name: "",
};

function readAttribution(): SnsAttribution {
  if (typeof window === "undefined") {
    return {
      landing_slug: null,
      source_platform: null,
      source_post_id: null,
      lane: null,
      campaign: null,
      topic: null,
    };
  }
  const sp = new URLSearchParams(window.location.search);
  return {
    landing_slug: sp.get("landing_slug"),
    source_platform: sp.get("src"),
    source_post_id: sp.get("post"),
    lane: sp.get("lane"),
    campaign: sp.get("campaign"),
    topic: sp.get("topic"),
  };
}

function isValidEmail(value: string): boolean {
  // Defensive — server re-validates. We just want to catch the
  // obvious "no @ at all" case so the submit button doesn't kick
  // them through a network round-trip.
  const trimmed = value.trim();
  if (trimmed.length < 3) return false;
  const at = trimmed.indexOf("@");
  if (at < 1) return false;
  if (at === trimmed.length - 1) return false;
  if (!trimmed.slice(at + 1).includes(".")) return false;
  return true;
}

export function WorkflowAuditPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [responses, setResponses] = useState<AuditResponses>(INITIAL_RESPONSES);
  const [contact, setContact] = useState<ContactInfo>(INITIAL_CONTACT);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [report, setReport] = useState<AuditReport | null>(null);
  const attributionRef = useRef<SnsAttribution | null>(null);
  const startedRef = useRef(false);

  // Capture attribution + fire pageview + workflow_audit_started once.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const attr = readAttribution();
    attributionRef.current = attr;
    trackClient({
      type: "$pageview",
      properties: {
        landing_slug: "workflow-audit",
        referrer_landing_slug: attr.landing_slug,
        lane: attr.lane ?? "practiq",
        source_platform: attr.source_platform,
        source_post_id: attr.source_post_id,
        campaign: attr.campaign,
        topic: attr.topic,
      },
    });
    if (!startedRef.current) {
      startedRef.current = true;
      trackClient({
        type: "workflow_audit_started",
        properties: {
          landing_slug: "workflow-audit",
          referrer_landing_slug: attr.landing_slug,
          lane: attr.lane ?? "practiq",
          source_platform: attr.source_platform,
          source_post_id: attr.source_post_id,
          campaign: attr.campaign,
          topic: attr.topic,
        },
      });
    }
  }, []);

  const trackStepAdvanced = useCallback(
    (fromStep: number, toStep: number) => {
      const attr = attributionRef.current;
      const step = STEPS.find((s) => s.index === fromStep);
      trackClient({
        type: "workflow_audit_step_advanced",
        properties: {
          step_number: fromStep,
          step_name: step?.id ?? `step_${fromStep}`,
          next_step_number: toStep,
          landing_slug: "workflow-audit",
          referrer_landing_slug: attr?.landing_slug ?? null,
          lane: attr?.lane ?? "practiq",
          source_platform: attr?.source_platform ?? null,
          source_post_id: attr?.source_post_id ?? null,
          campaign: attr?.campaign ?? null,
          topic: attr?.topic ?? null,
        },
      });
    },
    [],
  );

  // Per-step validation. Returns null when the step is complete,
  // otherwise an inline message we render under the controls.
  const stepError = useMemo<string | null>(() => {
    switch (currentStep) {
      case 1:
        if (!responses.firm_vertical) return "Select a vertical to continue.";
        if (!responses.firm_size) return "Select a firm size.";
        if (!responses.client_count) return "Pick a client-count range.";
        return null;
      case 2:
        if (responses.recent_engagement.trim().length < 15) {
          return "A sentence or two of context lets the audit be specific.";
        }
        return null;
      case 3:
        if (responses.current_ai_usage.length === 0) {
          return "Select at least one — pick \"Nothing yet\" if that's the answer.";
        }
        return null;
      case 4:
        if (responses.handoff_gaps.length === 0) {
          return "Pick whichever applies. You can pick more than one.";
        }
        return null;
      case 5:
        if (!responses.repeat_frequency) return "Pick a frequency.";
        return null;
      case 6:
        if (!responses.reviewer_pain) return "Pick the one that fits best.";
        return null;
      case 7:
        // Compliance concerns are optional — defaulting to "none selected"
        // is a valid signal in itself. No error.
        return null;
      case 8:
        if (!contact.name.trim()) return "Your name.";
        if (!isValidEmail(contact.email)) return "A valid work email address.";
        if (!contact.firm_name.trim()) return "Your firm name.";
        return null;
      default:
        return null;
    }
  }, [currentStep, responses, contact]);

  const goNext = useCallback(() => {
    if (stepError) return;
    const next = currentStep + 1;
    if (next > TOTAL_STEPS) return;
    trackStepAdvanced(currentStep, next);
    setCurrentStep(next);
  }, [currentStep, stepError, trackStepAdvanced]);

  const goPrev = useCallback(() => {
    if (currentStep <= 1) return;
    setCurrentStep(currentStep - 1);
  }, [currentStep]);

  const handleSubmit = useCallback(async () => {
    if (stepError) return;
    setSubmitError(null);
    setSubmitting(true);
    const attr = attributionRef.current ?? {
      landing_slug: null,
      source_platform: null,
      source_post_id: null,
      lane: null,
      campaign: null,
      topic: null,
    };
    trackClient({
      type: "sns_cta_clicked",
      properties: {
        landing_slug: "workflow-audit",
        cta: "workflow_audit_submit",
        cta_type: "primary",
        referrer_landing_slug: attr.landing_slug,
        lane: attr.lane ?? "practiq",
        source_platform: attr.source_platform,
        source_post_id: attr.source_post_id,
        campaign: attr.campaign,
        topic: attr.topic,
      },
    });
    try {
      const res = await fetch("/api/workflow-audit/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responses,
          contact,
          attribution: attr,
          page_url:
            typeof window !== "undefined" ? window.location.href : null,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? `Server error ${res.status}`);
      }
      const data = (await res.json()) as GenerateAuditResponse;
      setReport(data.report);
      // Scroll to top of result on render.
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Something went wrong generating the audit. Try again in a moment.",
      );
    } finally {
      setSubmitting(false);
    }
  }, [stepError, responses, contact]);

  if (report) {
    return <ReportView report={report} contact={contact} />;
  }

  const vertical: FirmVertical | "" = responses.firm_vertical;
  const complianceOptions =
    vertical && vertical !== "other"
      ? COMPLIANCE_CONCERNS_BY_VERTICAL[vertical]
      : COMPLIANCE_CONCERNS_BY_VERTICAL.other;

  // Hero + page chrome (Nav, Footer) are rendered server-side by
  // `src/app/workflow-audit/page.tsx`. This island only owns the
  // interactive form + report views.
  return (
    <>
      {/* Form card */}
      <section className="max-w-2xl mx-auto">
        <div className="bento-card p-7 md:p-10">
            <ProgressBar step={currentStep} total={TOTAL_STEPS} />

            <div className="mt-8">
              <StepHeader stepIndex={currentStep} />
            </div>

            <div className="mt-7">
              {currentStep === 1 && (
                <Step1FirmBasics
                  responses={responses}
                  setResponses={setResponses}
                />
              )}
              {currentStep === 2 && (
                <Step2RecentEngagement
                  value={responses.recent_engagement}
                  onChange={(v) =>
                    setResponses({ ...responses, recent_engagement: v })
                  }
                />
              )}
              {currentStep === 3 && (
                <Step3CurrentAi
                  responses={responses}
                  setResponses={setResponses}
                />
              )}
              {currentStep === 4 && (
                <Step4HandoffGaps
                  values={responses.handoff_gaps}
                  onChange={(values) =>
                    setResponses({ ...responses, handoff_gaps: values })
                  }
                />
              )}
              {currentStep === 5 && (
                <Step5RepeatFrequency
                  value={responses.repeat_frequency}
                  onChange={(v) =>
                    setResponses({ ...responses, repeat_frequency: v })
                  }
                />
              )}
              {currentStep === 6 && (
                <Step6ReviewerPain
                  value={responses.reviewer_pain}
                  onChange={(v) =>
                    setResponses({ ...responses, reviewer_pain: v })
                  }
                />
              )}
              {currentStep === 7 && (
                <Step7Compliance
                  values={responses.compliance_concerns}
                  options={complianceOptions}
                  onChange={(values) =>
                    setResponses({ ...responses, compliance_concerns: values })
                  }
                />
              )}
              {currentStep === 8 && (
                <Step8EmailGate
                  contact={contact}
                  setContact={setContact}
                />
              )}
            </div>

            {stepError && (
              <p
                className="mt-5 text-xs text-amber-400"
                role="status"
                aria-live="polite"
              >
                {stepError}
              </p>
            )}

            {submitError && (
              <p
                className="mt-5 text-xs text-red-400"
                role="alert"
                aria-live="assertive"
              >
                {submitError}
              </p>
            )}

            <div className="mt-8 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={goPrev}
                disabled={currentStep === 1 || submitting}
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                Back
              </button>

              {currentStep < TOTAL_STEPS ? (
                <button
                  type="button"
                  onClick={goNext}
                  disabled={!!stepError || submitting}
                  className="btn-premium inline-flex items-center gap-1.5 py-2.5 px-5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Continue
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!!stepError || submitting}
                  className="btn-premium inline-flex items-center gap-1.5 py-2.5 px-5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2
                        className="w-4 h-4 animate-spin"
                        aria-hidden="true"
                      />
                      Generating audit…
                    </>
                  ) : (
                    <>
                      Get my audit
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </>
                  )}
                </button>
              )}
            </div>
        </div>
      </section>
    </>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────

function ProgressBar({ step, total }: { step: number; total: number }) {
  const pct = Math.round(((step - 1) / total) * 100);
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
          Step {step} of {total}
        </p>
        <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-400">
          {pct}%
        </p>
      </div>
      <div
        className="h-1 w-full rounded-full bg-zinc-900 overflow-hidden"
        aria-hidden="true"
      >
        <div
          className="h-full bg-zinc-100 transition-all duration-300"
          style={{ width: `${Math.max(4, pct)}%` }}
        />
      </div>
    </div>
  );
}

function StepHeader({ stepIndex }: { stepIndex: number }) {
  const step = STEPS.find((s) => s.index === stepIndex);
  if (!step) return null;
  return (
    <div>
      <h2 className="text-xl md:text-2xl font-bold text-zinc-100 tracking-[-0.02em] leading-snug">
        {step.title}
      </h2>
      {step.description && (
        <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
          {step.description}
        </p>
      )}
    </div>
  );
}

interface RadioOption<T extends string> {
  value: T;
  label: string;
}

function RadioGroup<T extends string>({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: ReadonlyArray<RadioOption<T>>;
  value: T | "";
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-col gap-2" role="radiogroup" aria-label={name}>
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <label
            key={opt.value}
            className={`group flex items-center gap-3 rounded-xl border px-4 py-3 text-sm cursor-pointer transition-colors ${
              selected
                ? "border-zinc-500 bg-zinc-900 text-zinc-100"
                : "border-zinc-800 bg-[#0a0a0a] text-zinc-300 hover:border-zinc-600 hover:text-zinc-100"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={selected}
              onChange={() => onChange(opt.value)}
              className="sr-only"
            />
            <span
              aria-hidden="true"
              className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                selected ? "border-zinc-100" : "border-zinc-600"
              }`}
            >
              {selected && (
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-100" />
              )}
            </span>
            <span className="leading-snug">{opt.label}</span>
          </label>
        );
      })}
    </div>
  );
}

function CheckboxGroup<T extends string>({
  name,
  options,
  values,
  onChange,
}: {
  name: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  values: T[];
  onChange: (next: T[]) => void;
}) {
  function toggle(value: T) {
    if (values.includes(value)) {
      onChange(values.filter((v) => v !== value));
    } else {
      onChange([...values, value]);
    }
  }
  return (
    <div className="flex flex-col gap-2" role="group" aria-label={name}>
      {options.map((opt) => {
        const selected = values.includes(opt.value);
        return (
          <label
            key={opt.value}
            className={`group flex items-center gap-3 rounded-xl border px-4 py-3 text-sm cursor-pointer transition-colors ${
              selected
                ? "border-zinc-500 bg-zinc-900 text-zinc-100"
                : "border-zinc-800 bg-[#0a0a0a] text-zinc-300 hover:border-zinc-600 hover:text-zinc-100"
            }`}
          >
            <input
              type="checkbox"
              value={opt.value}
              checked={selected}
              onChange={() => toggle(opt.value)}
              className="sr-only"
            />
            <span
              aria-hidden="true"
              className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center ${
                selected
                  ? "border-zinc-100 bg-zinc-100 text-zinc-950"
                  : "border-zinc-600"
              }`}
            >
              {selected && <CheckCircle2 className="w-3 h-3" />}
            </span>
            <span className="leading-snug">{opt.label}</span>
          </label>
        );
      })}
    </div>
  );
}

// ─── Per-step inputs ──────────────────────────────────────────────────────

function Step1FirmBasics({
  responses,
  setResponses,
}: {
  responses: AuditResponses;
  setResponses: (r: AuditResponses) => void;
}) {
  return (
    <div className="flex flex-col gap-7">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-3">
          Vertical
        </p>
        <RadioGroup<FirmVertical>
          name="firm_vertical"
          options={FIRM_VERTICAL_OPTIONS}
          value={responses.firm_vertical}
          onChange={(v) => setResponses({ ...responses, firm_vertical: v })}
        />
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-3">
          Firm size
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {FIRM_SIZE_OPTIONS.map((opt) => {
            const selected = responses.firm_size === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() =>
                  setResponses({ ...responses, firm_size: opt.value })
                }
                className={`rounded-xl border px-3 py-3 text-sm font-medium transition-colors ${
                  selected
                    ? "border-zinc-500 bg-zinc-900 text-zinc-100"
                    : "border-zinc-800 bg-[#0a0a0a] text-zinc-300 hover:border-zinc-600"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-3">
          Active clients
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {CLIENT_COUNT_OPTIONS.map((opt) => {
            const selected = responses.client_count === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() =>
                  setResponses({ ...responses, client_count: opt.value })
                }
                className={`rounded-xl border px-3 py-3 text-sm font-medium transition-colors ${
                  selected
                    ? "border-zinc-500 bg-zinc-900 text-zinc-100"
                    : "border-zinc-800 bg-[#0a0a0a] text-zinc-300 hover:border-zinc-600"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Step2RecentEngagement({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label htmlFor="recent_engagement" className="sr-only">
        Recent engagement
      </label>
      <textarea
        id="recent_engagement"
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, 2000))}
        rows={6}
        placeholder="e.g. We delivered a Q3 close to a manufacturing client. The senior had to redo two memos because the staff couldn't show which invoices supported each accrual — and the new associate didn't know we'd already agreed on a different revenue-recognition cutoff with this client last year."
        className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 leading-relaxed focus:outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-700"
      />
      <p className="mt-2 text-xs text-zinc-400">
        Plain English. The more specific, the more specific the audit can be.
      </p>
    </div>
  );
}

function Step3CurrentAi({
  responses,
  setResponses,
}: {
  responses: AuditResponses;
  setResponses: (r: AuditResponses) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <CheckboxGroup<AiUsage>
        name="current_ai_usage"
        options={AI_USAGE_OPTIONS}
        values={responses.current_ai_usage}
        onChange={(next) =>
          setResponses({ ...responses, current_ai_usage: next })
        }
      />
      {(responses.current_ai_usage.includes("domain_saas") ||
        responses.current_ai_usage.includes("internal_tools")) && (
        <div>
          <label
            htmlFor="ai_specify"
            className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 block mb-2"
          >
            Which tools? (optional)
          </label>
          <input
            id="ai_specify"
            type="text"
            value={responses.current_ai_usage_specify}
            onChange={(e) =>
              setResponses({
                ...responses,
                current_ai_usage_specify: e.target.value.slice(0, 200),
              })
            }
            placeholder="e.g. CCH Axcess + a custom prompt library"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-700"
          />
        </div>
      )}
    </div>
  );
}

function Step4HandoffGaps({
  values,
  onChange,
}: {
  values: HandoffGap[];
  onChange: (v: HandoffGap[]) => void;
}) {
  return (
    <CheckboxGroup<HandoffGap>
      name="handoff_gaps"
      options={HANDOFF_GAP_OPTIONS}
      values={values}
      onChange={onChange}
    />
  );
}

function Step5RepeatFrequency({
  value,
  onChange,
}: {
  value: RepeatFrequency | "";
  onChange: (v: RepeatFrequency) => void;
}) {
  return (
    <RadioGroup<RepeatFrequency>
      name="repeat_frequency"
      options={REPEAT_FREQUENCY_OPTIONS}
      value={value}
      onChange={onChange}
    />
  );
}

function Step6ReviewerPain({
  value,
  onChange,
}: {
  value: ReviewerPain | "";
  onChange: (v: ReviewerPain) => void;
}) {
  return (
    <RadioGroup<ReviewerPain>
      name="reviewer_pain"
      options={REVIEWER_PAIN_OPTIONS}
      value={value}
      onChange={onChange}
    />
  );
}

function Step7Compliance({
  values,
  options,
  onChange,
}: {
  values: string[];
  options: ReadonlyArray<{ value: string; label: string }>;
  onChange: (v: string[]) => void;
}) {
  return (
    <CheckboxGroup<string>
      name="compliance_concerns"
      options={options}
      values={values}
      onChange={onChange}
    />
  );
}

function Step8EmailGate({
  contact,
  setContact,
}: {
  contact: ContactInfo;
  setContact: (c: ContactInfo) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <label
          htmlFor="contact_name"
          className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 block mb-2"
        >
          Name
        </label>
        <input
          id="contact_name"
          type="text"
          autoComplete="name"
          value={contact.name}
          onChange={(e) =>
            setContact({ ...contact, name: e.target.value.slice(0, 100) })
          }
          className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-700"
        />
      </div>
      <div>
        <label
          htmlFor="contact_email"
          className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 block mb-2"
        >
          Work email
        </label>
        <input
          id="contact_email"
          type="email"
          autoComplete="email"
          value={contact.email}
          onChange={(e) =>
            setContact({ ...contact, email: e.target.value.slice(0, 200) })
          }
          className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-700"
        />
      </div>
      <div>
        <label
          htmlFor="firm_name"
          className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 block mb-2"
        >
          Firm name
        </label>
        <input
          id="firm_name"
          type="text"
          autoComplete="organization"
          value={contact.firm_name}
          onChange={(e) =>
            setContact({
              ...contact,
              firm_name: e.target.value.slice(0, 150),
            })
          }
          className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-700"
        />
      </div>
    </div>
  );
}

// ─── Report view ───────────────────────────────────────────────────────────

const PRIMARY_GAP_LABEL: Record<AuditReport["primary_gap"], string> = {
  source: "Source / provenance",
  review_state: "Review state",
  client_context: "Client context",
  handoff: "Handoff",
  multiple: "Multiple objects",
};

function ReportView({
  report,
  contact,
}: {
  report: AuditReport;
  contact: ContactInfo;
}) {
  return (
    <div className="min-h-screen bg-bg-base">
      <Nav />
      <main id="main" className="pt-32 pb-16 px-6">
        {/* Header */}
        <section className="max-w-3xl mx-auto text-center mb-12">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-5">
            Workflow audit · {contact.firm_name || "Your firm"}
          </p>
          <h1 className="text-3xl md:text-5xl font-black text-zinc-100 tracking-[-0.03em] leading-[1.05] mb-6 text-balance">
            {report.headline}
          </h1>
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-[#0a0a0a] px-4 py-2 text-xs">
            <Sparkles
              className="w-3.5 h-3.5 text-emerald-400"
              aria-hidden="true"
            />
            <span className="text-zinc-400">
              Primary gap detected:{" "}
              <span className="text-zinc-100 font-semibold">
                {PRIMARY_GAP_LABEL[report.primary_gap]}
              </span>
            </span>
          </div>
          <p className="mt-4 text-xs text-zinc-400">
            A copy is on its way to {contact.email}.
          </p>
        </section>

        {/* Diagnosis */}
        <section className="max-w-3xl mx-auto mb-16">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-4">
            Diagnosis
          </p>
          <div className="prose prose-invert max-w-none">
            {report.diagnosis_paragraphs.map((para, idx) => (
              <p
                key={idx}
                className="text-base text-zinc-300 leading-relaxed mb-5"
              >
                {para}
              </p>
            ))}
          </div>
        </section>

        {/* Specific examples */}
        {report.specific_examples.length > 0 && (
          <section className="max-w-4xl mx-auto mb-16">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-4 text-center">
              In your engagement specifically
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {report.specific_examples.map((ex, idx) => (
                <div key={idx} className="bento-card p-6">
                  <FileText
                    className="w-4 h-4 text-zinc-500 mb-3"
                    aria-hidden="true"
                  />
                  <p className="text-sm text-zinc-300 leading-relaxed">
                    {ex}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recommendations */}
        <section className="max-w-3xl mx-auto mb-16">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-4 text-center">
            What to change
          </p>
          <ol className="flex flex-col gap-4">
            {report.recommendations.map((rec, idx) => (
              <li
                key={idx}
                className="rounded-xl border border-zinc-800 bg-[#0a0a0a] p-6"
              >
                <div className="flex items-start gap-3 mb-3">
                  <span className="shrink-0 inline-flex w-7 h-7 items-center justify-center rounded-lg bg-zinc-900 text-zinc-200 text-xs font-bold">
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-zinc-100 leading-snug">
                      {rec.title}
                    </h3>
                    {rec.applicable_before_practiq && (
                      <span className="mt-1 inline-block rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-emerald-400">
                        Do this today
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-zinc-400 leading-relaxed pl-10">
                  {rec.body}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* Vertical note */}
        {report.vertical_specific_note && (
          <section className="max-w-3xl mx-auto mb-16">
            <div className="glass-panel p-8 md:p-10">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-3">
                Professional standards
              </p>
              <p className="text-base text-zinc-300 leading-relaxed">
                {report.vertical_specific_note}
              </p>
            </div>
          </section>
        )}

        {/* Bottom CTA */}
        <section className="max-w-3xl mx-auto">
          <div className="glass-panel p-10 md:p-14 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-4">
              Where Practiq fits
            </p>
            <h2 className="text-2xl md:text-3xl font-black text-zinc-100 tracking-[-0.03em] mb-4 text-balance">
              This is the audit Practiq automates across every engagement.
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed max-w-xl mx-auto mb-8">
              Pre-launch and looking for the first design partners in the
              50 – 200 client range. $15/client/month at launch. No annual
              contract.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/founding-member"
                className="btn-premium inline-flex items-center gap-2 py-4 px-8 text-sm"
              >
                Apply as a design partner
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
              <Link
                href="/thesis"
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 px-6 py-4 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:text-zinc-100"
              >
                Read the thesis
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
