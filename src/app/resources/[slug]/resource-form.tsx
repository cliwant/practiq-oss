"use client";

import { useState, FormEvent } from "react";

type Vertical = "accounting" | "law" | "hr" | "consulting" | "marketing" | "other";

// The API /api/early-access expects the enum above (note: "marketing" is the
// API enum for agency; "cross" on our side maps to "other").
function mapResourceVerticalToApi(
  v: "accounting" | "law" | "hr" | "consulting" | "agency" | "cross"
): Vertical {
  if (v === "agency") return "marketing";
  if (v === "cross") return "other";
  return v;
}

interface Props {
  slug: string;
  resourceTitle: string;
  verticalDefault: "accounting" | "law" | "hr" | "consulting" | "agency" | "cross";
}

function getVisitorId(): string {
  if (typeof document === "undefined") return "anonymous";
  const cookies = document.cookie.split(";").map((c) => c.trim());
  const row = cookies.find((c) => c.startsWith("practiq_visitor="));
  return row ? row.split("=")[1] : "anonymous";
}

export function ResourceForm({ slug, resourceTitle, verticalDefault }: Props) {
  const [email, setEmail] = useState("");
  const [vertical, setVertical] = useState<Vertical>(
    mapResourceVerticalToApi(verticalDefault)
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    setSubmitting(true);

    try {
      const res = await fetch("/api/early-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          firm_vertical: vertical,
          utm_source: "resources",
          utm_medium: "resource-download",
          utm_campaign: slug,
          landing_variant: `resource_${slug}`,
          metadata: {
            resource_title: resourceTitle,
            resource_slug: slug,
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Request failed with status ${res.status}`);
      }

      // Fire a conversion event for A/B tracking
      try {
        const visitorId = getVisitorId();
        await fetch("/api/ab/convert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            visitorId,
            testId: `resource_download_${slug}`,
            variant: "default",
            eventName: "resource_email_capture",
            metadata: { slug, email_domain: email.split("@")[1] },
          }),
        });
      } catch {
        // Non-fatal
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-6">
        <p className="mb-2 text-lg font-bold text-emerald-400">
          ✓ Resource on its way
        </p>
        <p className="text-sm leading-relaxed text-zinc-300">
          Check{" "}
          <span className="font-mono text-zinc-100">{email}</span> in the next
          few minutes. If it doesn&apos;t arrive, check spam — and reply to
          the first email so we know it landed.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="resource-email"
          className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-zinc-500"
        >
          Email
        </label>
        <input
          id="resource-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@yourfirm.com"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
          disabled={submitting}
        />
      </div>
      <div>
        <label
          htmlFor="resource-vertical"
          className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-zinc-500"
        >
          Firm type
        </label>
        <select
          id="resource-vertical"
          value={vertical}
          onChange={(e) => setVertical(e.target.value as Vertical)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none"
          disabled={submitting}
        >
          <option value="accounting">Accounting / CPA / Tax</option>
          <option value="law">Law</option>
          <option value="hr">HR Advisory</option>
          <option value="consulting">Consulting</option>
          <option value="marketing">Agency / Marketing</option>
          <option value="other">Other</option>
        </select>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-zinc-100 px-6 py-3 text-sm font-bold uppercase tracking-widest text-zinc-950 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Sending..." : "Send me the resource"}
      </button>
      <p className="text-center text-xs text-zinc-500">
        No credit card, no hidden upsell. One-click unsubscribe.
      </p>
    </form>
  );
}
