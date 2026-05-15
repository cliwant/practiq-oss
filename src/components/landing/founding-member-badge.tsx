"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

/**
 * FoundingMemberBadge — small urgency display for landing page CTA area.
 *
 * Shows remaining spots in the Founding Member tier. The first 50 signups
 * lock in $10/client/month for life (33% off) and priority onboarding. This creates urgency
 * without being manipulative — the limit is real.
 *
 * Reads live count from /api/waitlist-count and computes spots remaining.
 * Hides entirely once the founding tier is full.
 */

const FOUNDING_MEMBER_LIMIT = 50;

export function FoundingMemberBadge() {
  const [spotsLeft, setSpotsLeft] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/waitlist-count")
      .then((r) => r.json())
      .then((d) => {
        const real = typeof d.count === "number" ? d.count : 0;
        const remaining = Math.max(0, FOUNDING_MEMBER_LIMIT - real);
        setSpotsLeft(remaining);
      })
      .catch(() => {
        // fallback: show limit (pre-launch state)
        setSpotsLeft(FOUNDING_MEMBER_LIMIT);
      });
  }, []);

  if (spotsLeft === null || spotsLeft === 0) return null;

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/5 px-3 py-1.5">
      <Sparkles className="w-3 h-3 text-amber-400" />
      <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
        {spotsLeft} Founding Member {spotsLeft === 1 ? "spot" : "spots"} left
      </p>
    </div>
  );
}

/**
 * FoundingMemberBanner — larger explainer card for waitlist signup section.
 * Explains what Founding Member status means.
 */
export function FoundingMemberBanner() {
  return (
    <div className="bento-card p-6 mb-6 border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-amber-400" />
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400 mb-2">
            Founding Member
          </p>
          <h3 className="text-base font-bold text-zinc-100 mb-2 leading-snug">
            First 50 firms lock $10/client/month for life (33% off forever).
          </h3>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Priority onboarding, direct feedback line to the founders, and
            locked-in Founding Member pricing that never increases, even after
            public launch.
          </p>
        </div>
      </div>
    </div>
  );
}
