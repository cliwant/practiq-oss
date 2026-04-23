import Link from "next/link";
import { CheckCircle2, Circle, Sparkles } from "lucide-react";

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  href?: string;
  /** Pre-computed by the server (don't let the client guess). */
  done: boolean;
  /**
   * Optional action override — used when the step isn't a simple link
   * (e.g. "Run briefings" calls a server action via HomeAgentCTA).
   */
  actionLabel?: string;
}

/**
 * First-run onboarding checklist.
 *
 * Shows up on /app Home when a new operator hasn't hit all the key
 * milestones yet. Auto-hides once every step is done. Linear-style
 * progressive empty-state that teaches the product without shouting.
 */
export function OnboardingChecklist({
  steps,
}: {
  steps: OnboardingStep[];
}) {
  const doneCount = steps.filter((s) => s.done).length;
  const total = steps.length;
  if (doneCount === total) return null; // stay out of the way

  const progress = Math.round((doneCount / total) * 100);

  return (
    <section className="mb-10 overflow-hidden rounded-2xl border border-zinc-900 bg-gradient-to-br from-[#0c0c0c] to-[#080808]">
      <div className="flex items-start gap-4 p-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[13.5px] font-bold text-zinc-100">
              Get started with Practiq
            </h2>
            <span className="text-[11px] font-medium tabular-nums text-zinc-500">
              {doneCount}/{total} · {progress}%
            </span>
          </div>
          <p className="mt-0.5 text-[12px] text-zinc-500">
            Five quick steps to unlock the full agent. You can skip steps —
            nothing here is required.
          </p>
          <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-zinc-900">
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <ol className="border-t border-zinc-900/80 divide-y divide-zinc-900/80">
        {steps.map((step) => (
          <li key={step.id}>
            {step.href ? (
              <Link
                href={step.href}
                className={`group flex items-start gap-3 px-5 py-3.5 transition-colors ${
                  step.done
                    ? "opacity-50"
                    : "hover:bg-zinc-900/30"
                }`}
              >
                {step.done ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                ) : (
                  <Circle className="mt-0.5 h-4 w-4 shrink-0 text-zinc-600 group-hover:text-zinc-400" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={`text-[13px] ${
                        step.done
                          ? "text-zinc-500 line-through decoration-zinc-800"
                          : "font-semibold text-zinc-100"
                      }`}
                    >
                      {step.title}
                    </span>
                    {!step.done && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 group-hover:text-zinc-300">
                        {step.actionLabel ?? "Do this →"}
                      </span>
                    )}
                  </div>
                  {!step.done && (
                    <p className="mt-0.5 text-[11.5px] text-zinc-500">
                      {step.description}
                    </p>
                  )}
                </div>
              </Link>
            ) : (
              <div className="flex items-start gap-3 px-5 py-3.5">
                {step.done ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                ) : (
                  <Circle className="mt-0.5 h-4 w-4 shrink-0 text-zinc-600" />
                )}
                <div className="min-w-0 flex-1">
                  <div
                    className={`text-[13px] ${
                      step.done
                        ? "text-zinc-500 line-through decoration-zinc-800"
                        : "font-semibold text-zinc-100"
                    }`}
                  >
                    {step.title}
                  </div>
                  {!step.done && (
                    <p className="mt-0.5 text-[11.5px] text-zinc-500">
                      {step.description}
                    </p>
                  )}
                </div>
              </div>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
