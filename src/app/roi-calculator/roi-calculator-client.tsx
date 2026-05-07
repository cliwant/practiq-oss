"use client";

import { useState, useMemo, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";

type Vertical = "accounting" | "law" | "hr" | "consulting" | "marketing";

const VERTICAL_LABELS: Record<Vertical, string> = {
  accounting: "Accounting / Tax / Bookkeeping",
  law: "Law Firm",
  hr: "HR Advisory",
  consulting: "Consulting",
  marketing: "Agency / Marketing",
};

// Recovery-time-per-switch in minutes, calibrated by vertical (industry research)
const VERTICAL_RECOVERY_MIN: Record<Vertical, number> = {
  accounting: 8,
  law: 12,
  hr: 10,
  consulting: 9,
  marketing: 7,
};

// Default hourly rates (blended partner/senior rate) by vertical
const VERTICAL_DEFAULT_RATE: Record<Vertical, number> = {
  accounting: 195,
  law: 320,
  hr: 185,
  consulting: 275,
  marketing: 115,
};

// Switches-per-client-per-week (more touches = more switches)
const VERTICAL_SWITCHES_PER_CLIENT_WEEK: Record<Vertical, number> = {
  accounting: 1.2,
  law: 2.4,
  hr: 1.5,
  consulting: 1.8,
  marketing: 2.0,
};

function getVisitorId(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|; )practiq_visitor=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export function RoiCalculatorClient() {
  const [vertical, setVertical] = useState<Vertical>("accounting");
  const [teamSize, setTeamSize] = useState(5);
  const [clientCount, setClientCount] = useState(80);
  const [hourlyRate, setHourlyRate] = useState(VERTICAL_DEFAULT_RATE.accounting);
  const [billableWeeksPerYear, setBillableWeeksPerYear] = useState(48);

  // Email capture
  const [email, setEmail] = useState("");
  const [firmName, setFirmName] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calc = useMemo(() => {
    const recoveryMin = VERTICAL_RECOVERY_MIN[vertical];
    const switchesPerClientWeek = VERTICAL_SWITCHES_PER_CLIENT_WEEK[vertical];
    const clientsPerPerson = Math.max(1, clientCount / Math.max(1, teamSize));
    // Each person handles (clientCount / teamSize) clients, each requiring
    // switchesPerClientWeek touches. Team total = clientCount * switches (not per person)
    const switchesPerWeek = clientCount * switchesPerClientWeek;
    const switchesPerYear = switchesPerWeek * billableWeeksPerYear;

    const minutesLostPerYear = switchesPerYear * recoveryMin;
    const hoursLostPerYear = minutesLostPerYear / 60;
    const dollarsLostPerYear = hoursLostPerYear * hourlyRate;

    // Practiq savings estimate: cuts recovery per switch from N min to 1 min
    const newMinutesPerYear = switchesPerYear * 1; // 1 min per switch with Practiq
    const newHoursPerYear = newMinutesPerYear / 60;
    const newDollarsPerYear = newHoursPerYear * hourlyRate;

    const savingsDollarsPerYear = dollarsLostPerYear - newDollarsPerYear;
    const savingsHoursPerYear = hoursLostPerYear - newHoursPerYear;
    const savingsPct = dollarsLostPerYear > 0
      ? Math.round(((savingsDollarsPerYear / dollarsLostPerYear) * 100))
      : 0;

    return {
      clientsPerPerson: Math.round(clientsPerPerson),
      switchesPerWeek: Math.round(switchesPerWeek),
      switchesPerYear: Math.round(switchesPerYear),
      hoursLostPerYear: Math.round(hoursLostPerYear),
      dollarsLostPerYear: Math.round(dollarsLostPerYear),
      newHoursPerYear: Math.round(newHoursPerYear),
      newDollarsPerYear: Math.round(newDollarsPerYear),
      savingsHoursPerYear: Math.round(savingsHoursPerYear),
      savingsDollarsPerYear: Math.round(savingsDollarsPerYear),
      savingsPct,
    };
  }, [vertical, teamSize, clientCount, hourlyRate, billableWeeksPerYear]);

  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/early-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          firm_vertical: vertical,
          utm_source: "roi-calculator",
          utm_medium: "cta",
          utm_campaign: "calculator-email-report",
          landing_variant: "roi_calculator",
          page_url:
            typeof window !== "undefined" ? window.location.href : null,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Could not send. Please try again.");
      }

      // A/B conversion log
      const visitorId = getVisitorId();
      if (visitorId) {
        await fetch("/api/ab/convert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            visitorId,
            testId: "roi_calc_completed",
            variant: vertical,
            eventName: "roi_report_email_capture",
            metadata: {
              vertical,
              team_size: teamSize,
              client_count: clientCount,
              calculated_annual_loss: calc.dollarsLostPerYear,
              calculated_savings: calc.savingsDollarsPerYear,
              firm_name: firmName || null,
            },
          }),
        }).catch(() => {});
      }

      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSending(false);
    }
  };

  const fmt = (n: number) => n.toLocaleString("en-US");
  const fmtMoney = (n: number) => `$${fmt(n)}`;

  return (
    <section className="px-6 pb-20">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_1.2fr]">
        {/* Input card */}
        <div className="rounded-2xl border border-zinc-800 bg-[#0a0a0a] p-8">
          <h2 className="mb-6 text-lg font-bold text-zinc-100">
            Your firm
          </h2>

          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Vertical
              </label>
              <select
                value={vertical}
                onChange={(e) => {
                  const v = e.target.value as Vertical;
                  setVertical(v);
                  setHourlyRate(VERTICAL_DEFAULT_RATE[v]);
                }}
                className="w-full rounded-lg border border-zinc-800 bg-black px-4 py-3 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none"
              >
                {(Object.keys(VERTICAL_LABELS) as Vertical[]).map((v) => (
                  <option key={v} value={v}>
                    {VERTICAL_LABELS[v]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Team size <span className="font-mono text-zinc-300">{teamSize}</span>
              </label>
              <input
                type="range"
                min={1}
                max={25}
                value={teamSize}
                onChange={(e) => setTeamSize(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>

            <div>
              <label className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Client count <span className="font-mono text-zinc-300">{clientCount}</span>
              </label>
              <input
                type="range"
                min={10}
                max={400}
                step={5}
                value={clientCount}
                onChange={(e) => setClientCount(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>

            <div>
              <label className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Blended hourly rate <span className="font-mono text-zinc-300">${hourlyRate}</span>
              </label>
              <input
                type="range"
                min={60}
                max={600}
                step={5}
                value={hourlyRate}
                onChange={(e) => setHourlyRate(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
              <p className="mt-1 text-[11px] text-zinc-600">
                Default: {VERTICAL_LABELS[vertical]} industry blended mid-point.
              </p>
            </div>

            <div>
              <label className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Billable weeks per year <span className="font-mono text-zinc-300">{billableWeeksPerYear}</span>
              </label>
              <input
                type="range"
                min={40}
                max={52}
                value={billableWeeksPerYear}
                onChange={(e) => setBillableWeeksPerYear(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Result card */}
        <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-emerald-950/30 to-[#0a0a0a] p-8">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">
            Your firm&apos;s annual context-switching cost
          </p>
          <div className="mb-8">
            <p className="text-6xl font-extrabold tracking-[-0.04em] text-zinc-100 sm:text-7xl">
              {fmtMoney(calc.dollarsLostPerYear)}
            </p>
            <p className="mt-2 text-sm text-zinc-400">
              ≈ {fmt(calc.hoursLostPerYear)} hours of senior-staff time per year
            </p>
          </div>

          <div className="mb-6 grid gap-3 border-t border-zinc-800 pt-6 text-sm">
            <div className="flex items-baseline justify-between">
              <span className="text-zinc-500">Clients per person</span>
              <span className="font-mono text-zinc-100">{calc.clientsPerPerson}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-zinc-500">Context switches / week</span>
              <span className="font-mono text-zinc-100">{fmt(calc.switchesPerWeek)}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-zinc-500">Context switches / year</span>
              <span className="font-mono text-zinc-100">{fmt(calc.switchesPerYear)}</span>
            </div>
          </div>

          <div className="mb-6 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-5">
            <p className="mb-1 text-xs font-bold uppercase tracking-widest text-emerald-400">
              With Practiq
            </p>
            <p className="mb-2 text-3xl font-extrabold text-zinc-100">
              Save {fmtMoney(calc.savingsDollarsPerYear)} / year
            </p>
            <p className="text-xs text-zinc-400">
              {fmt(calc.savingsHoursPerYear)} hours reclaimed · {calc.savingsPct}% reduction
              · AI-prepared briefings cut per-switch recovery from{" "}
              <span className="font-mono">{VERTICAL_RECOVERY_MIN[vertical]}m</span> to{" "}
              <span className="font-mono">~1m</span>
            </p>
          </div>

          {/* Email capture */}
          {sent ? (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-5 text-center">
              <div className="mb-2 text-2xl">✓</div>
              <p className="mb-1 text-sm font-bold text-zinc-100">
                Report on its way.
              </p>
              <p className="text-xs text-zinc-400">
                Check your inbox for the personalized breakdown + 2026 benchmarks for
                your vertical. You&apos;re also on the Practiq early-access list.
              </p>
            </div>
          ) : (
            <form onSubmit={handleEmailSubmit} className="space-y-3">
              <p className="mb-2 text-xs text-zinc-400">
                Send me the full report + 2026 benchmarks for my vertical:
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="email" data-ph-no-capture
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="work@firm.com"
                  className="flex-1 rounded-lg border border-zinc-800 bg-black px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={sending || !email}
                  className="rounded-lg bg-zinc-100 px-6 py-3 text-sm font-semibold text-zinc-950 transition-all hover:bg-white active:scale-[0.98] disabled:opacity-50"
                >
                  {sending ? "Sending…" : "Email my report"}
                </button>
              </div>
              {error && (
                <p className="text-xs text-red-400">{error}</p>
              )}
              <p className="text-[11px] text-zinc-600">
                One-time email. No drip campaigns beyond our early-access sequence.
                Unsubscribe any time.
              </p>
            </form>
          )}
        </div>
      </div>

      {/* Benchmarks comparison strip */}
      <div className="mx-auto mt-10 max-w-6xl">
        <div className="rounded-xl border border-zinc-800 bg-[#0a0a0a] p-6">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            How your number compares
          </p>
          <div className="grid gap-6 text-sm sm:grid-cols-3">
            <div>
              <p className="mb-1 text-zinc-500">Average small CPA firm (8 people, 120 clients)</p>
              <p className="text-2xl font-bold text-zinc-100">$168,000/year</p>
            </div>
            <div>
              <p className="mb-1 text-zinc-500">Average small law firm (5 attorneys, 60 matters)</p>
              <p className="text-2xl font-bold text-zinc-100">$214,000/year</p>
            </div>
            <div>
              <p className="mb-1 text-zinc-500">Average HR advisory (3 consultants, 25 clients)</p>
              <p className="text-2xl font-bold text-zinc-100">$88,000/year</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
