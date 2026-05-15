"use client";

import { useState, FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Footer } from "@/components/landing/footer";

const VERTICALS = [
  { value: "accounting", label: "Accounting / CPA / Tax" },
  { value: "law", label: "Law" },
  { value: "hr", label: "HR Advisory" },
  { value: "marketing", label: "Agency / Marketing" },
  { value: "consulting", label: "Consulting" },
  { value: "other", label: "Other" },
];

export function FromEmailClient() {
  const params = useSearchParams();
  const utmCampaign = params.get("utm_campaign") || "";
  const utmSource = params.get("utm_source") || "email";

  // Auto-detect vertical from campaign name
  const detectedVertical = utmCampaign.includes("cpa")
    ? "accounting"
    : utmCampaign.includes("law")
    ? "law"
    : utmCampaign.includes("hr")
    ? "hr"
    : utmCampaign.includes("consulting")
    ? "consulting"
    : utmCampaign.includes("agency")
    ? "marketing"
    : "";

  const [email, setEmail] = useState("");
  const [vertical, setVertical] = useState(detectedVertical);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/early-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          firm_vertical: vertical || "other",
          utm_source: utmSource,
          utm_medium: "email",
          utm_campaign: utmCampaign,
          landing_variant: "from-email",
          page_url: window.location.href,
        }),
      });
      if (!res.ok) throw new Error("Request failed");
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Try again or email hello@practiq.dev.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100">
      {/* Minimal nav */}
      <nav className="px-6 py-6">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100">
              <span className="text-lg font-black text-zinc-950">P</span>
            </div>
            <span className="text-xl font-bold tracking-tighter">
              Pract<span className="text-zinc-500">iq</span>
            </span>
          </Link>
          <Link
            href="/roi-calculator"
            className="text-xs font-medium text-zinc-400 hover:text-zinc-200"
          >
            ROI Calculator →
          </Link>
        </div>
      </nav>

      {/* Hero — direct, no fluff */}
      <section className="px-6 pb-10 pt-12">
        <div className="mx-auto max-w-2xl">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">
            For firms past the 75-client ceiling
          </p>
          <h1 className="mb-6 text-4xl font-extrabold tracking-[-0.03em] sm:text-5xl">
            Your firm manages 50+ clients.
            <br />
            <span className="text-zinc-500">
              Context switching is eating your margin.
            </span>
          </h1>
          <p className="mb-8 text-lg leading-relaxed text-zinc-300">
            Practiq is an AI layer above QuickBooks, Clio, and Gusto that
            maintains a living brief per client. Partners review context in
            60 seconds instead of reconstructing it in 15 minutes.
          </p>

          {/* Inline form — no modal */}
          {!submitted ? (
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent p-8"
            >
              <p className="mb-4 text-sm font-medium text-zinc-200">
                Join early access — first 50 firms lock in $10/client/month for life (33% off forever).
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="email" data-ph-no-capture
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@yourfirm.com"
                  className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
                  disabled={submitting}
                />
                <select
                  value={vertical}
                  onChange={(e) => setVertical(e.target.value)}
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none"
                  disabled={submitting}
                >
                  <option value="">Your vertical</option>
                  {VERTICALS.map((v) => (
                    <option key={v.value} value={v.value}>
                      {v.label}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={submitting}
                  className="whitespace-nowrap rounded-lg bg-zinc-100 px-6 py-3 text-sm font-bold text-zinc-950 transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {submitting ? "..." : "Get access"}
                </button>
              </div>
              {error && (
                <p className="mt-3 text-xs text-red-400">{error}</p>
              )}
              <p className="mt-3 text-[10px] text-zinc-500">
                No credit card. One-click unsubscribe.
              </p>
            </form>
          ) : (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8">
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                <p className="text-lg font-bold text-emerald-400">
                  You&apos;re in.
                </p>
              </div>
              <p className="text-sm text-zinc-300">
                Check <span className="font-mono">{email}</span> for a
                confirmation. We&apos;ll reach out within 24 hours with next
                steps.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Three proof points */}
      <section className="px-6 py-12">
        <div className="mx-auto grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-800 bg-[#0a0a0a] p-5">
            <p className="mb-2 text-2xl font-bold text-zinc-100">3.2 hrs</p>
            <p className="text-xs text-zinc-400">
              Average partner time lost to context switching per day (47-firm
              audit)
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-[#0a0a0a] p-5">
            <p className="mb-2 text-2xl font-bold text-zinc-100">75</p>
            <p className="text-xs text-zinc-400">
              Clients per partner — the ceiling where quality degrades faster
              than revenue scales
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-[#0a0a0a] p-5">
            <p className="mb-2 text-2xl font-bold text-zinc-100">$170K</p>
            <p className="text-xs text-zinc-400">
              Annual partner cost of context reconstruction at a 6-person firm
            </p>
          </div>
        </div>
      </section>

      {/* What Practiq does — 4 bullets */}
      <section className="px-6 py-12">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-6 text-2xl font-bold">What Practiq does</h2>
          <ul className="space-y-4">
            {[
              {
                title: "Morning briefing across your entire book",
                desc: "One view showing which clients need attention, what changed overnight, and what deadlines are approaching.",
              },
              {
                title: "60-second client context, not 15-minute reconstruction",
                desc: "Living brief per client synthesized from QuickBooks, email, and meeting notes. Review, don't rebuild.",
              },
              {
                title: "Handoffs that don't fracture relationships",
                desc: "When staff transitions between clients (or leaves), context survives at the firm level.",
              },
              {
                title: "Works above your existing tools",
                desc: "Practiq reads from QuickBooks, Clio, Gusto. Doesn't replace them. Adds the intelligence layer that's missing.",
              },
            ].map((item) => (
              <li
                key={item.title}
                className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-[#0a0a0a] p-5"
              >
                <ArrowRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
                <div>
                  <p className="mb-1 text-sm font-bold text-zinc-100">
                    {item.title}
                  </p>
                  <p className="text-xs leading-relaxed text-zinc-400">
                    {item.desc}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Secondary CTA */}
      <section className="px-6 py-12">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-4 text-sm text-zinc-400">
            Not ready to sign up? These are free and useful standalone:
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/roi-calculator"
              className="rounded-lg border border-zinc-700 px-4 py-2 text-xs font-medium text-zinc-200 hover:border-zinc-500"
            >
              ROI Calculator
            </Link>
            <Link
              href="/readiness-quiz"
              className="rounded-lg border border-zinc-700 px-4 py-2 text-xs font-medium text-zinc-200 hover:border-zinc-500"
            >
              Readiness Quiz
            </Link>
            <Link
              href="/benchmarks"
              className="rounded-lg border border-zinc-700 px-4 py-2 text-xs font-medium text-zinc-200 hover:border-zinc-500"
            >
              Capacity Benchmarks
            </Link>
            <Link
              href="/resources"
              className="rounded-lg border border-zinc-700 px-4 py-2 text-xs font-medium text-zinc-200 hover:border-zinc-500"
            >
              Free Templates
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
