import Link from "next/link";
import { Sparkles, ArrowRight, Lock } from "lucide-react";

interface PlanUsageMeterProps {
  /** "free" | "solo" | "practice" | "firm" */
  planKey: string;
  /** Number of real clients (excluding sample). */
  clientCount: number;
  /** Hard cap on clients for this plan; null = unlimited. */
  clientCeiling: number | null;
  /** AI chat messages used this billing period. */
  chatUsedThisPeriod: number;
  /** Plan-included chat messages per period; null = unlimited. */
  chatCap: number | null;
  /** Whether the user is currently inside the free trial window. */
  inTrialWindow: boolean;
}

/**
 * Plan-aware usage meter + soft conversion CTA.
 *
 * Renders only for plans where there's headroom information worth
 * showing — free trial users always see it, paid users see it once
 * usage crosses 60% of any cap. The component picks the most relevant
 * upgrade target (Solo → Practice → Firm) based on which limit is
 * about to bite, and links the CTA to /pricing#<target> with a
 * `utm_source=app_meter` so we can attribute conversions back here.
 *
 * Two design decisions:
 *
 *  1. **Meter, not modal.** Conversion modals at the wrong moment
 *     train users to dismiss them; an inline meter that quietly
 *     escalates color (zinc → amber → red) as the cap approaches
 *     respects the user's flow while still being unmissable when
 *     they truly are at the limit.
 *
 *  2. **Single source of plan data.** The caps are passed in from
 *     the server (resolved via `clientCeiling()` and `chatMessageCap()`
 *     in `lib/stripe/plans.ts`) so this component never has to
 *     re-derive them and there's no drift between marketing copy
 *     on /pricing and the in-app caps.
 */
export function PlanUsageMeter({
  planKey,
  clientCount,
  clientCeiling,
  chatUsedThisPeriod,
  chatCap,
  inTrialWindow,
}: PlanUsageMeterProps) {
  // Decide whether to render at all. Hidden on Firm (effectively
  // unlimited, no upsell target) once they're below 60% on every cap.
  const clientPct =
    clientCeiling && clientCeiling > 0 ? clientCount / clientCeiling : 0;
  const chatPct = chatCap && chatCap > 0 ? chatUsedThisPeriod / chatCap : 0;
  const peakPct = Math.max(clientPct, chatPct);

  const hideForPaidLowUsage = !inTrialWindow && planKey !== "free" && peakPct < 0.6;
  if (hideForPaidLowUsage) return null;

  // Stage 1c — display-layer copy aligned with the per-client pricing
  // shift. The underlying plan keys (free/solo/practice/firm) stay
  // intact for Stage 3 schema migration. The labels here are the only
  // user-facing surface so they get the new $10/$15 per client copy.
  const upgradeTarget =
    planKey === "free" || planKey === "solo"
      ? { slug: "practice", label: "$10/client/month founding" }
      : planKey === "practice"
        ? { slug: "firm", label: "$15/client/month standard" }
        : null;

  // Color tier — zinc when fine, amber > 60%, red > 90%. Whichever cap
  // is closest to its ceiling drives the tone.
  const tone =
    peakPct >= 0.9
      ? {
          ring: "border-red-500/30",
          bg: "bg-red-500/5",
          fg: "text-red-300",
          fade: "text-red-400/70",
          bar: "bg-red-500",
          link: "bg-red-500 text-red-950 hover:bg-red-400",
        }
      : peakPct >= 0.6
        ? {
            ring: "border-amber-500/30",
            bg: "bg-amber-500/5",
            fg: "text-amber-300",
            fade: "text-amber-400/70",
            bar: "bg-amber-500",
            link: "bg-amber-500 text-amber-950 hover:bg-amber-400",
          }
        : {
            ring: "border-zinc-800",
            bg: "bg-[#0a0a0a]",
            fg: "text-zinc-200",
            fade: "text-zinc-500",
            bar: "bg-zinc-300",
            link: "bg-zinc-100 text-zinc-950 hover:bg-white",
          };

  return (
    <section
      className={`mb-8 rounded-2xl border ${tone.ring} ${tone.bg} px-5 py-4`}
      aria-label="Plan usage and upgrade prompt"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border ${tone.ring} ${tone.bg}`}
          >
            <Sparkles className={`h-3.5 w-3.5 ${tone.fg}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`text-[13px] font-bold ${tone.fg}`}>
                {planKey === "free"
                  ? inTrialWindow
                    ? "Free trial — usage today"
                    : "Trial ended — upgrade to keep going"
                  : `${capitalize(planKey)} plan — usage this period`}
              </h2>
              {planKey === "free" && !inTrialWindow && (
                <span className="inline-flex items-center gap-1 rounded-md border border-red-900/50 bg-red-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-red-400">
                  <Lock className="h-2.5 w-2.5" /> Locked
                </span>
              )}
            </div>
            <p className={`mt-1 text-[12px] leading-relaxed ${tone.fade}`}>
              Practiq scales as you add clients and run more agents. Upgrade
              before you hit a cap so nothing is paused mid-week.
            </p>
          </div>
        </div>

        {upgradeTarget && (
          <Link
            href={`/pricing?utm_source=app_meter&utm_medium=usage_nudge&utm_campaign=${upgradeTarget.slug}#${upgradeTarget.slug}`}
            className={`hidden shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-[12px] font-bold tracking-tight transition-colors sm:inline-flex ${tone.link}`}
            aria-label={`Upgrade to ${upgradeTarget.label}`}
          >
            Upgrade
            <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <UsageBar
          label="Client workspaces"
          used={clientCount}
          cap={clientCeiling}
          pct={clientPct}
          barClass={tone.bar}
          fadeClass={tone.fade}
          fgClass={tone.fg}
        />
        <UsageBar
          label="AI chat messages"
          used={chatUsedThisPeriod}
          cap={chatCap}
          pct={chatPct}
          barClass={tone.bar}
          fadeClass={tone.fade}
          fgClass={tone.fg}
        />
      </div>

      {upgradeTarget && (
        <div className="mt-3 sm:hidden">
          <Link
            href={`/pricing?utm_source=app_meter&utm_medium=usage_nudge&utm_campaign=${upgradeTarget.slug}#${upgradeTarget.slug}`}
            className={`flex w-full items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-[12px] font-bold tracking-tight transition-colors ${tone.link}`}
          >
            Upgrade to {upgradeTarget.label}
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </section>
  );
}

function UsageBar({
  label,
  used,
  cap,
  pct,
  barClass,
  fadeClass,
  fgClass,
}: {
  label: string;
  used: number;
  cap: number | null;
  pct: number;
  barClass: string;
  fadeClass: string;
  fgClass: string;
}) {
  const percent = Math.min(100, Math.round(pct * 100));
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[11.5px]">
        <span className={fadeClass}>{label}</span>
        <span className={`tabular-nums font-semibold ${fgClass}`}>
          {used.toLocaleString()}
          {cap === null ? "" : ` / ${cap.toLocaleString()}`}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-900">
        <div
          className={`h-full ${barClass} transition-all`}
          style={{ width: `${cap === null ? 8 : percent}%` }}
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          role="progressbar"
        />
      </div>
    </div>
  );
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
