"use client";

import { useState, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";

type Vertical = "accounting" | "law" | "hr" | "consulting" | "marketing";

type Answer = { value: string; label: string; score: number };
type Question = {
  id: string;
  text: string;
  answers: Answer[];
  dimension: "acute" | "maturity" | "tooling";
};

// Scores are 0-10 per question. 10 questions × 10 max = 100 max composite.
// Dimensions: acute = 4 questions (40 pts), maturity = 3 questions (30 pts),
// tooling = 3 questions (30 pts).
const QUESTIONS: Question[] = [
  {
    id: "client_count",
    text: "How many active clients does your firm currently manage?",
    dimension: "acute",
    answers: [
      { value: "under_20", label: "Fewer than 20", score: 2 },
      { value: "20_50", label: "20 to 50", score: 5 },
      { value: "50_100", label: "50 to 100", score: 8 },
      { value: "100_200", label: "100 to 200", score: 10 },
      { value: "over_200", label: "More than 200", score: 10 },
    ],
  },
  {
    id: "team_size",
    text: "How many people work at your firm (including you)?",
    dimension: "acute",
    answers: [
      { value: "1", label: "Just me (solo)", score: 6 },
      { value: "2_5", label: "2 to 5", score: 9 },
      { value: "6_10", label: "6 to 10", score: 10 },
      { value: "11_25", label: "11 to 25", score: 8 },
      { value: "over_25", label: "More than 25", score: 5 },
    ],
  },
  {
    id: "context_rebuild",
    text: "When a team member switches between clients, how long does it typically take to 'rebuild context' (remember where you left off)?",
    dimension: "acute",
    answers: [
      { value: "under_2", label: "Under 2 minutes — context is always fresh", score: 1 },
      { value: "2_5", label: "2 to 5 minutes — manageable friction", score: 4 },
      { value: "5_15", label: "5 to 15 minutes — noticeable daily tax", score: 8 },
      { value: "15_plus", label: "15+ minutes — major productivity drain", score: 10 },
      { value: "cant_measure", label: "I can't even measure this — that's part of the problem", score: 10 },
    ],
  },
  {
    id: "bottleneck",
    text: "What's the single biggest operational bottleneck at your firm right now?",
    dimension: "acute",
    answers: [
      { value: "finding_new_clients", label: "Finding new clients", score: 2 },
      { value: "context_switching", label: "Time lost switching between client files", score: 10 },
      { value: "deliverable_prep", label: "Preparing deliverables (reports, statements, docs)", score: 10 },
      { value: "team_capacity", label: "Team capacity (need to hire but can't find qualified people)", score: 9 },
      { value: "billing_collections", label: "Billing, collections, administrative overhead", score: 4 },
    ],
  },
  {
    id: "workflow_docs",
    text: "How well-documented are your firm's recurring client workflows (month-end close, tax filing, matter intake, etc.)?",
    dimension: "maturity",
    answers: [
      { value: "none", label: "Undocumented — we just know how to do it", score: 2 },
      { value: "in_heads", label: "Partially documented — mostly in senior partners' heads", score: 5 },
      { value: "checklists", label: "Checklists and templates per workflow", score: 8 },
      { value: "playbooks", label: "Full playbooks with decision trees + edge cases", score: 10 },
    ],
  },
  {
    id: "onboarding_time",
    text: "How long does it take to onboard a new team member to autonomy on client work?",
    dimension: "maturity",
    answers: [
      { value: "over_6m", label: "6+ months — we barely do it", score: 3 },
      { value: "3_6m", label: "3 to 6 months", score: 6 },
      { value: "1_3m", label: "1 to 3 months", score: 9 },
      { value: "under_1m", label: "Under a month — our playbooks are that tight", score: 10 },
    ],
  },
  {
    id: "repeatable_work",
    text: "What percentage of your firm's work is structurally repeatable (same workflow across many clients)?",
    dimension: "maturity",
    answers: [
      { value: "under_25", label: "Under 25% — mostly bespoke engagements", score: 3 },
      { value: "25_50", label: "25-50% — half the work follows patterns", score: 6 },
      { value: "50_75", label: "50-75% — most of the work has patterns", score: 9 },
      { value: "over_75", label: "More than 75% — we're basically a production line", score: 10 },
    ],
  },
  {
    id: "core_tools",
    text: "Which tools do you use for core client data? (Pick the closest match.)",
    dimension: "tooling",
    answers: [
      { value: "excel_email", label: "Excel + email only", score: 2 },
      { value: "legacy_pms", label: "Legacy practice management (installed on-premises)", score: 4 },
      { value: "cloud_pms", label: "Cloud practice management (TaxDome, Clio, Karbon, Gusto, etc.)", score: 10 },
      { value: "mixed", label: "Mix of cloud + spreadsheets + email", score: 7 },
    ],
  },
  {
    id: "integrations",
    text: "How many of your core tools connect / share data automatically (vs. copy-paste between systems)?",
    dimension: "tooling",
    answers: [
      { value: "none", label: "None — copy-paste is the workflow", score: 2 },
      { value: "some", label: "1-2 core integrations (e.g., accounting ↔ billing)", score: 5 },
      { value: "most", label: "Most tools sync via native integrations or middleware", score: 9 },
      { value: "fully_connected", label: "Fully connected stack — data flows everywhere", score: 10 },
    ],
  },
  {
    id: "ai_history",
    text: "Has your firm tried AI tools (ChatGPT, Claude, Copilot, industry-specific AI products)?",
    dimension: "tooling",
    answers: [
      { value: "no", label: "No — haven't tried yet", score: 5 },
      { value: "exploring", label: "Trying informally (individual team members use ChatGPT)", score: 7 },
      { value: "adopted", label: "Adopted at least one AI tool into a recurring workflow", score: 10 },
      { value: "disappointed", label: "Tried, didn't stick — current tools didn't fit our workflow", score: 8 },
    ],
  },
];

function getVisitorId(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|; )practiq_visitor=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

function bandFor(score: number): {
  label: string;
  subtext: string;
  color: string;
  bg: string;
} {
  if (score >= 70) {
    return {
      label: "Ready Now",
      subtext: "Your firm is structurally positioned to adopt AI-Native workflows today.",
      color: "text-emerald-400",
      bg: "from-emerald-950/40 to-[#0a0a0a] border-emerald-500/30",
    };
  }
  if (score >= 40) {
    return {
      label: "Partial Readiness",
      subtext: "Your firm has the need, but there are 1-2 specific gaps to close before AI adoption pays off.",
      color: "text-amber-400",
      bg: "from-amber-950/30 to-[#0a0a0a] border-amber-500/30",
    };
  }
  return {
    label: "Not Yet",
    subtext: "AI adoption conversation may be premature for your current firm stage. Focus on firm-level bottlenecks first.",
    color: "text-zinc-400",
    bg: "from-zinc-900 to-[#0a0a0a] border-zinc-700",
  };
}

export function ReadinessQuizClient() {
  const [vertical, setVertical] = useState<Vertical | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allAnswered =
    vertical !== null &&
    QUESTIONS.every((q) => answers[q.id] !== undefined);

  // Compute scores
  const dimensionScores = QUESTIONS.reduce(
    (acc, q) => {
      const ans = q.answers.find((a) => a.value === answers[q.id]);
      if (ans) acc[q.dimension] += ans.score;
      return acc;
    },
    { acute: 0, maturity: 0, tooling: 0 }
  );
  const totalScore = dimensionScores.acute + dimensionScores.maturity + dimensionScores.tooling;
  const band = bandFor(totalScore);

  const handleSubmit = async (e: FormEvent) => {
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
          utm_source: "readiness-quiz",
          utm_medium: "cta",
          utm_campaign: "quiz-email-report",
          landing_variant: `quiz_${band.label.toLowerCase().replace(/\s+/g, "_")}`,
          page_url: typeof window !== "undefined" ? window.location.href : null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Could not send. Please try again.");
      }
      const visitorId = getVisitorId();
      if (visitorId) {
        await fetch("/api/ab/convert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            visitorId,
            testId: "readiness_quiz_completed",
            variant: vertical ?? "unknown",
            eventName: "quiz_email_capture",
            metadata: {
              vertical,
              total_score: totalScore,
              band: band.label,
              dimension_scores: dimensionScores,
              answers: Object.fromEntries(
                Object.entries(answers).map(([k, v]) => [k, v])
              ),
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

  return (
    <section className="px-6 pb-16">
      <div className="mx-auto max-w-3xl">
        {/* Vertical picker (first step) */}
        {vertical === null ? (
          <div className="rounded-2xl border border-zinc-800 bg-[#0a0a0a] p-8">
            <h2 className="mb-6 text-xl font-bold text-zinc-100">
              First, pick your vertical
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { v: "accounting" as Vertical, label: "Accounting / Tax / Bookkeeping" },
                { v: "law" as Vertical, label: "Law Firm" },
                { v: "hr" as Vertical, label: "HR Advisory" },
                { v: "consulting" as Vertical, label: "Consulting" },
                { v: "marketing" as Vertical, label: "Agency / Marketing" },
              ].map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setVertical(opt.v)}
                  className="rounded-xl border border-zinc-800 bg-black px-5 py-4 text-left text-sm font-semibold text-zinc-100 transition-all hover:border-zinc-500 hover:bg-zinc-900"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between">
              <p className="text-xs text-zinc-500">
                Vertical:{" "}
                <span className="font-semibold text-zinc-300">
                  {vertical === "marketing" ? "Agency / Marketing" : vertical.charAt(0).toUpperCase() + vertical.slice(1)}
                </span>
              </p>
              <button
                type="button"
                onClick={() => {
                  setVertical(null);
                  setAnswers({});
                }}
                className="text-xs text-zinc-500 underline hover:text-zinc-300"
              >
                Change
              </button>
            </div>

            {/* Questions */}
            <div className="space-y-6">
              {QUESTIONS.map((q, idx) => (
                <div
                  key={q.id}
                  className="rounded-xl border border-zinc-800 bg-[#0a0a0a] p-6"
                >
                  <div className="mb-4 flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-zinc-400">
                      {idx + 1}
                    </span>
                    <h3 className="text-sm font-bold text-zinc-100 sm:text-base">
                      {q.text}
                    </h3>
                  </div>
                  <div className="grid gap-2 pl-9">
                    {q.answers.map((ans) => (
                      <label
                        key={ans.value}
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors ${
                          answers[q.id] === ans.value
                            ? "border-emerald-500/50 bg-emerald-500/5 text-zinc-100"
                            : "border-zinc-800 bg-black/30 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900/50"
                        }`}
                      >
                        <input
                          type="radio"
                          name={q.id}
                          value={ans.value}
                          checked={answers[q.id] === ans.value}
                          onChange={(e) =>
                            setAnswers((prev) => ({
                              ...prev,
                              [q.id]: e.target.value,
                            }))
                          }
                          className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 accent-emerald-500"
                        />
                        <span>{ans.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Result card (appears when all answered) */}
            <AnimatePresence>
              {allAnswered && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`mt-8 rounded-2xl border bg-gradient-to-b p-8 ${band.bg}`}
                >
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                    Your readiness score
                  </p>
                  <div className="mb-4 flex items-baseline gap-3">
                    <span className="text-6xl font-extrabold tracking-[-0.04em] text-zinc-100 sm:text-7xl">
                      {totalScore}
                    </span>
                    <span className="text-xl text-zinc-500">/ 100</span>
                  </div>
                  <p className={`mb-2 text-2xl font-bold ${band.color}`}>
                    {band.label}
                  </p>
                  <p className="mb-6 text-sm leading-relaxed text-zinc-300">
                    {band.subtext}
                  </p>

                  <div className="mb-6 grid gap-3 border-t border-zinc-800 pt-4 text-sm">
                    <div className="flex items-baseline justify-between">
                      <span className="text-zinc-500">Acute need</span>
                      <span className="font-mono text-zinc-100">
                        {dimensionScores.acute} / 40
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-zinc-500">Workflow maturity</span>
                      <span className="font-mono text-zinc-100">
                        {dimensionScores.maturity} / 30
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-zinc-500">Tooling fit</span>
                      <span className="font-mono text-zinc-100">
                        {dimensionScores.tooling} / 30
                      </span>
                    </div>
                  </div>

                  {sent ? (
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-5 text-center">
                      <div className="mb-2 text-2xl">✓</div>
                      <p className="text-sm font-bold text-zinc-100">
                        Your personalized report is on its way.
                      </p>
                      <p className="mt-1 text-xs text-zinc-400">
                        Check inbox for the full readiness breakdown +
                        vertical-specific benchmark comparison + 5-step
                        implementation path.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-3">
                      <p className="mb-2 text-xs text-zinc-400">
                        Email my full personalized report + vertical benchmarks:
                      </p>
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <input
                          type="email"
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
                        One-time email. No spam. Unsubscribe removes you from
                        our list entirely.
                      </p>
                    </form>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </section>
  );
}
