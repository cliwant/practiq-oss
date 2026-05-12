"use client";

import { useEffect, useState, FormEvent } from "react";
import { trackClient } from "@/lib/analytics/track-client";
import { useFormTracking } from "@/lib/analytics/form-tracking";

/**
 * Workflow-audit form used by the three topic landing pages
 * (professional-services-ai-evidence-layer, legal-ai-review-workflow,
 * client-context-memory).
 *
 * Posts to /api/early-access with the topic's `landing_variant`. Stores
 * `name` and `workflow_pain` via the route's extended payload — both
 * end up on the waitlist row (name on `contact_name`, workflow_pain
 * inside the `metadata` JSONB column).
 *
 * Telemetry:
 *  - useFormTracking auto-instruments focus / blur / invalid / submit.
 *    The form_id is the page-specific id passed in props so SQL can
 *    bucket field-drop-off by topic.
 *  - On successful submit we fire `waitlist_signed_up` with the same
 *    landing_variant + qualitative props so the analytics_events row
 *    matches the waitlist row 1:1.
 *
 * UTM / source params are read from window.location.search on mount
 * (the same params Practiq's analytics provider stamps on the cookie),
 * and forwarded so the operator can attribute each signup back to the
 * specific SNS post / campaign that drove it.
 */

interface UtmParams {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  source_platform: string | null;
  source_post_id: string | null;
  campaign: string | null;
  topic: string | null;
  lane: string | null;
  cta: string | null;
  fmt: string | null;
  v: string | null;
}

function readQuery(): UtmParams {
  if (typeof window === "undefined") {
    return {
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      source_platform: null,
      source_post_id: null,
      campaign: null,
      topic: null,
      lane: null,
      cta: null,
      fmt: null,
      v: null,
    };
  }
  const sp = new URLSearchParams(window.location.search);
  return {
    utm_source: sp.get("utm_source"),
    utm_medium: sp.get("utm_medium"),
    utm_campaign: sp.get("utm_campaign"),
    source_platform: sp.get("src"),
    source_post_id: sp.get("post"),
    campaign: sp.get("campaign"),
    topic: sp.get("topic"),
    lane: sp.get("lane"),
    cta: sp.get("cta"),
    fmt: sp.get("fmt"),
    v: sp.get("v"),
  };
}

type FirmType = "cpa" | "law" | "hr" | "marketing" | "consulting" | "other";

const VERTICAL_MAP: Record<FirmType, string> = {
  // /api/early-access enum: accounting | law | hr | marketing | consulting | other
  cpa: "accounting",
  law: "law",
  hr: "hr",
  marketing: "marketing",
  consulting: "consulting",
  other: "other",
};

interface Props {
  formId: string;
  landingVariant: string;
  /** CTA button label (varies per page). */
  submitLabel: string;
}

export function WorkflowAuditForm({
  formId,
  landingVariant,
  submitLabel,
}: Props) {
  const formRef = useFormTracking(formId);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [firmType, setFirmType] = useState<FirmType>("cpa");
  const [workflowPain, setWorkflowPain] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [utm, setUtm] = useState<UtmParams | null>(null);

  useEffect(() => {
    setUtm(readQuery());
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/early-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim(),
          firm_vertical: VERTICAL_MAP[firmType],
          workflow_pain: workflowPain.trim() || null,
          landing_variant: landingVariant,
          page_url:
            typeof window !== "undefined" ? window.location.href : null,
          utm_source: utm?.utm_source ?? utm?.source_platform ?? null,
          utm_medium: utm?.utm_medium ?? null,
          utm_campaign: utm?.utm_campaign ?? utm?.campaign ?? null,
          metadata: {
            firm_type: firmType,
            source_platform: utm?.source_platform ?? null,
            source_post_id: utm?.source_post_id ?? null,
            campaign: utm?.campaign ?? null,
            topic: utm?.topic ?? landingVariant,
            lane: utm?.lane ?? "practiq",
            cta: utm?.cta ?? null,
            fmt: utm?.fmt ?? null,
            v: utm?.v ?? null,
          },
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(
          data.error ?? `Request failed with status ${res.status}`
        );
      }

      // NB: the canonical `waitlist_signed_up` event is fired server-side
      // from POST /api/early-access after the Supabase insert succeeds.
      // We deliberately do NOT fire it from the client — ad-blockers
      // would drop the beacon and the event would no longer be
      // guaranteed to match the waitlist row.

      setSubmitted(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center"
      >
        <p className="mb-3 text-xl font-bold text-emerald-300">Thanks — got it.</p>
        <p className="text-sm leading-relaxed text-zinc-300">
          We&apos;ll reply within 24 hours at{" "}
          <span className="font-mono text-zinc-100">{email}</span>. If it
          isn&apos;t a fit, we&apos;ll say so directly.
        </p>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="space-y-5"
      noValidate
      aria-describedby={error ? `${formId}-error` : undefined}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor={`${formId}-name`}
            className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-zinc-500"
          >
            Your name
          </label>
          <input
            id={`${formId}-name`}
            name="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Smith"
            autoComplete="name"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600"
            disabled={submitting}
          />
        </div>
        <div>
          <label
            htmlFor={`${formId}-email`}
            className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-zinc-500"
          >
            Work email
          </label>
          <input
            id={`${formId}-email`}
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@firm.com"
            autoComplete="email"
            data-ph-no-capture
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600"
            disabled={submitting}
          />
        </div>
      </div>

      <div>
        <label
          htmlFor={`${formId}-firm-type`}
          className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-zinc-500"
        >
          Firm type
        </label>
        <select
          id={`${formId}-firm-type`}
          name="firm_type"
          value={firmType}
          onChange={(e) => setFirmType(e.target.value as FirmType)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600"
          disabled={submitting}
        >
          <option value="cpa">CPA / accounting / tax</option>
          <option value="law">Law</option>
          <option value="hr">HR advisory</option>
          <option value="marketing">Marketing / agency</option>
          <option value="consulting">Consulting</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div>
        <label
          htmlFor={`${formId}-workflow-pain`}
          className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-zinc-500"
        >
          What part of the workflow is hurting?
        </label>
        <textarea
          id={`${formId}-workflow-pain`}
          name="workflow_pain"
          value={workflowPain}
          onChange={(e) => setWorkflowPain(e.target.value)}
          placeholder="A sentence or two is plenty. e.g., 'partner re-reads three memos every quarter to remember why we landed where we landed last time.'"
          rows={4}
          maxLength={2000}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-600"
          disabled={submitting}
        />
      </div>

      {error && (
        <div
          id={`${formId}-error`}
          role="alert"
          className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        onClick={() => {
          trackClient({
            type: "sns_cta_clicked",
            properties: {
              landing_slug: landingVariant,
              cta_type: "submit",
              cta: utm?.cta ?? null,
              lane: utm?.lane ?? "practiq",
              source_platform: utm?.source_platform ?? null,
              source_post_id: utm?.source_post_id ?? null,
              campaign: utm?.campaign ?? null,
              topic: utm?.topic ?? landingVariant,
              fmt: utm?.fmt ?? null,
              v: utm?.v ?? null,
            },
          });
        }}
        className="btn-premium inline-flex w-full items-center justify-center gap-2 py-4 px-8 text-sm disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Sending..." : submitLabel}
      </button>

      <p className="text-center text-xs text-zinc-500">
        No spam. We reply within 24 hours. If it isn&apos;t a fit, we say so.
      </p>
    </form>
  );
}
