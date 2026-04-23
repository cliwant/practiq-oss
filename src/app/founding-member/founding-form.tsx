"use client";

import { useState, FormEvent } from "react";

type Vertical =
  | "accounting"
  | "law"
  | "hr"
  | "consulting"
  | "marketing"
  | "other";
type FirmSize = "solo" | "2-5" | "6-10" | "11-15" | "15+";
type ClientCount = "under-25" | "25-50" | "50-100" | "100-200" | "200+";
type BiggestBottleneck =
  | "context-switching"
  | "client-capacity"
  | "tool-sprawl"
  | "team-coordination"
  | "busy-season"
  | "other";

function getVisitorId(): string {
  if (typeof document === "undefined") return "anonymous";
  const cookies = document.cookie.split(";").map((c) => c.trim());
  const row = cookies.find((c) => c.startsWith("practiq_visitor="));
  return row ? row.split("=")[1] : "anonymous";
}

export function FoundingMemberForm() {
  const [email, setEmail] = useState("");
  const [firmName, setFirmName] = useState("");
  const [vertical, setVertical] = useState<Vertical>("accounting");
  const [firmSize, setFirmSize] = useState<FirmSize>("2-5");
  const [clientCount, setClientCount] = useState<ClientCount>("50-100");
  const [bottleneck, setBottleneck] =
    useState<BiggestBottleneck>("context-switching");
  const [notes, setNotes] = useState("");

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
    if (!firmName.trim()) {
      setError("Please enter your firm name.");
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
          utm_source: "founding-member",
          utm_medium: "application",
          utm_campaign: "founding-member-page",
          landing_variant: `founding_${vertical}_${firmSize}`,
          metadata: {
            firm_name: firmName,
            firm_size: firmSize,
            client_count: clientCount,
            biggest_bottleneck: bottleneck,
            notes: notes.slice(0, 500),
            application_type: "founding-member",
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.error ?? `Request failed with status ${res.status}`
        );
      }

      // Conversion event
      try {
        const visitorId = getVisitorId();
        await fetch("/api/ab/convert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            visitorId,
            testId: "founding_member_application",
            variant: "default",
            eventName: "founding_member_submission",
            metadata: {
              vertical,
              firm_size: firmSize,
              client_count: clientCount,
              bottleneck,
            },
          }),
        });
      } catch {
        // non-fatal
      }

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
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
        <p className="mb-3 text-2xl font-bold text-emerald-400">
          Application received
        </p>
        <p className="mb-6 text-sm leading-relaxed text-zinc-300">
          We&apos;ll review your application within 24 hours and follow up at{" "}
          <span className="font-mono text-zinc-100">{email}</span>.
          <br />
          If it&apos;s a fit, you&apos;ll get a calendar link to talk with one
          of the founders. If the timing isn&apos;t right, we&apos;ll tell
          you directly.
        </p>
        <p className="text-xs text-zinc-500">
          Check your email in the next few minutes for a confirmation.
          You&apos;re also now on the standard early-access list as a
          fallback if we can&apos;t immediately place you in Founding
          Membership.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-zinc-500"
          >
            Your email
          </label>
          <input
            id="email"
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
            htmlFor="firm-name"
            className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-zinc-500"
          >
            Firm name
          </label>
          <input
            id="firm-name"
            type="text"
            required
            value={firmName}
            onChange={(e) => setFirmName(e.target.value)}
            placeholder="Smith & Associates"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
            disabled={submitting}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor="vertical"
            className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-zinc-500"
          >
            Your vertical
          </label>
          <select
            id="vertical"
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
        <div>
          <label
            htmlFor="firm-size"
            className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-zinc-500"
          >
            Firm size
          </label>
          <select
            id="firm-size"
            value={firmSize}
            onChange={(e) => setFirmSize(e.target.value as FirmSize)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none"
            disabled={submitting}
          >
            <option value="solo">Solo (1 person)</option>
            <option value="2-5">2-5 people</option>
            <option value="6-10">6-10 people</option>
            <option value="11-15">11-15 people</option>
            <option value="15+">15+ people</option>
          </select>
        </div>
      </div>

      <div>
        <label
          htmlFor="client-count"
          className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-zinc-500"
        >
          Active clients (or matters, for law)
        </label>
        <select
          id="client-count"
          value={clientCount}
          onChange={(e) => setClientCount(e.target.value as ClientCount)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none"
          disabled={submitting}
        >
          <option value="under-25">Under 25</option>
          <option value="25-50">25-50</option>
          <option value="50-100">50-100</option>
          <option value="100-200">100-200</option>
          <option value="200+">200+</option>
        </select>
      </div>

      <div>
        <label
          htmlFor="bottleneck"
          className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-zinc-500"
        >
          Your biggest bottleneck right now
        </label>
        <select
          id="bottleneck"
          value={bottleneck}
          onChange={(e) => setBottleneck(e.target.value as BiggestBottleneck)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none"
          disabled={submitting}
        >
          <option value="context-switching">
            Context switching between clients
          </option>
          <option value="client-capacity">
            Hitting client-count ceiling
          </option>
          <option value="tool-sprawl">
            Too many tools, no integration
          </option>
          <option value="team-coordination">
            Team coordination and handoffs
          </option>
          <option value="busy-season">
            Busy/tax season overload
          </option>
          <option value="other">Other (describe below)</option>
        </select>
      </div>

      <div>
        <label
          htmlFor="notes"
          className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-zinc-500"
        >
          Anything else? (Optional)
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g., what you're currently using, what would make Practiq a must-have, what's stopping you from solving this today..."
          rows={4}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
          disabled={submitting}
          maxLength={500}
        />
        <p className="mt-1 text-[10px] text-zinc-600">
          {notes.length}/500 characters
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-2xl bg-zinc-100 px-10 py-4 text-sm font-bold uppercase tracking-widest text-zinc-950 shadow-lg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Submitting..." : "Submit Founding Member application →"}
      </button>

      <p className="text-center text-xs text-zinc-500">
        Review in under 24 hours. No spam, no multi-email funnels. If
        it&apos;s not a fit we&apos;ll tell you directly.
      </p>
    </form>
  );
}
