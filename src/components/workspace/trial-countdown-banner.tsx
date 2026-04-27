"use client";

import Link from "next/link";
import { useState } from "react";
import { Clock, X, Sparkles } from "lucide-react";

interface TrialCountdownBannerProps {
  /** Plan key — only show when "free" */
  planKey: string;
  /** True when current date is inside the 14-day trial window */
  inTrialWindow: boolean;
  /** ISO date string when the trial expires (or empty) */
  trialEndsAt: string | null;
  /** True when on the founding-member discounted price */
  isFoundingMember: boolean;
}

/**
 * Wave-4 P4-02: trial countdown banner + P4-07: founding member badge.
 *
 * Shown at the top of /app for users on the free plan inside the
 * 14-day trial window. Dismissable for the rest of the session via
 * sessionStorage. Renders a "Founding member" pill instead when the
 * user is on the founding price — that flag implies a paid subscription
 * so the trial countdown is irrelevant.
 *
 * Why a single component for both: the visual real estate is the same
 * (top-of-app horizontal stripe) and we never want both displayed at
 * the same time. Single component = single branch in the layout.
 */
export function TrialCountdownBanner({
  planKey,
  inTrialWindow,
  trialEndsAt,
  isFoundingMember,
}: TrialCountdownBannerProps) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("practiq_trial_banner_dismissed") === "1";
  });

  if (dismissed) return null;

  // Founding member badge — paid users see this instead.
  if (isFoundingMember) {
    return (
      <div className="border-b border-amber-500/20 bg-amber-500/5">
        <div className="flex items-center justify-between gap-4 px-4 py-2 text-sm">
          <div className="flex items-center gap-2 text-amber-300">
            <Sparkles className="h-4 w-4" />
            <span className="font-medium">Founding Member</span>
            <span className="text-amber-400/70 hidden sm:inline">
              · Lifetime founding price · Thank you for backing Practiq early
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              sessionStorage.setItem("practiq_trial_banner_dismissed", "1");
              setDismissed(true);
            }}
            className="text-amber-400/70 hover:text-amber-200 transition-colors"
            aria-label="Dismiss banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // Trial countdown — only relevant on free plan inside trial window.
  if (planKey !== "free" || !inTrialWindow || !trialEndsAt) return null;

  const daysLeft = Math.max(
    0,
    Math.ceil(
      (new Date(trialEndsAt).getTime() - Date.now()) /
        (24 * 60 * 60 * 1000),
    ),
  );

  // Color shifts as the deadline approaches.
  const tone =
    daysLeft <= 2
      ? {
          border: "border-red-500/30",
          bg: "bg-red-500/5",
          text: "text-red-300",
          fade: "text-red-400/70",
          link: "text-red-200 hover:text-red-100",
        }
      : daysLeft <= 7
        ? {
            border: "border-amber-500/30",
            bg: "bg-amber-500/5",
            text: "text-amber-300",
            fade: "text-amber-400/70",
            link: "text-amber-200 hover:text-amber-100",
          }
        : {
            border: "border-zinc-800",
            bg: "bg-[#0a0a0a]",
            text: "text-zinc-200",
            fade: "text-zinc-500",
            link: "text-zinc-100 hover:text-white",
          };

  return (
    <div className={`border-b ${tone.border} ${tone.bg}`}>
      <div className="flex items-center justify-between gap-4 px-4 py-2 text-sm">
        <div className={`flex items-center gap-2 ${tone.text}`}>
          <Clock className="h-4 w-4" />
          <span className="font-medium">
            {daysLeft === 0
              ? "Trial expired"
              : daysLeft === 1
                ? "1 day left in trial"
                : `${daysLeft} days left in trial`}
          </span>
          <span className={`hidden sm:inline ${tone.fade}`}>
            · Pick a plan to keep your clients, agents, and patterns
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/pricing"
            className={`font-medium transition-colors ${tone.link}`}
          >
            Upgrade
          </Link>
          <button
            type="button"
            onClick={() => {
              sessionStorage.setItem("practiq_trial_banner_dismissed", "1");
              setDismissed(true);
            }}
            className={`${tone.fade} hover:${tone.text} transition-colors`}
            aria-label="Dismiss banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
