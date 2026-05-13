/**
 * FoundingCounter — RUN-post-lovable polish (audit fix #11).
 *
 * Reads the singleton FoundingSlot row (cap default 50) and renders a
 * compact "X of 50 spots claimed" banner. Pure server component — no
 * client-side polling, no real-time updates. The number refreshes on
 * every page load, which is enough for a public scarcity signal.
 *
 * Why a server component (and not a /api/founding-status route):
 *   - The pricing/founding-member pages already render server-side.
 *     Adding a client fetch would just incur an extra round-trip + a
 *     hydration flash for a value that changes ~daily at most.
 *   - Stripe webhook is the only writer (atomic increment); the read
 *     side is safe to materialise inline.
 *
 * Failure mode: if the singleton row hasn't been seeded yet (fresh
 * DB / before first checkout), we render "Limited to 50 firms" without
 * a number rather than the count, so the page never shows "0 of 50"
 * which would be confusing.
 *
 * Side-effect safety: this component does NOT mutate FoundingSlot. The
 * Stripe webhook in src/app/api/stripe/webhook/route.ts holds the
 * single write path with the atomic UPDATE … WHERE claimed_count < cap
 * pattern. Re-rendering the component a million times produces zero
 * writes.
 */
import { prisma } from "@/lib/prisma";

interface FoundingCounterProps {
  /** Visual variant. "hero" = large stack on landing pages. "inline" = compact pill for nav / sticky footer. */
  variant?: "hero" | "inline";
  /** When true, omit the cap from the rendered text (e.g. when the cap is a brand promise that's already on the page). */
  hideCap?: boolean;
}

interface SlotSnapshot {
  claimed: number;
  cap: number;
  ok: boolean;
}

async function readSlotSnapshot(): Promise<SlotSnapshot> {
  try {
    const row = await prisma.foundingSlot.findUnique({
      where: { id: "singleton" },
      select: { claimedCount: true, cap: true },
    });
    if (!row) {
      // Singleton hasn't been seeded — render the cap-only fallback.
      return { claimed: 0, cap: 50, ok: false };
    }
    return { claimed: row.claimedCount, cap: row.cap, ok: true };
  } catch {
    // DB blip → don't fail the public page render. Return the
    // cap-only fallback.
    return { claimed: 0, cap: 50, ok: false };
  }
}

export async function FoundingCounter({
  variant = "hero",
  hideCap = false,
}: FoundingCounterProps) {
  const snap = await readSlotSnapshot();

  // When the singleton row is missing OR there's a DB blip, render the
  // cap-only fallback so the public page never shows "0 of 50" which
  // would be confusing pre-launch.
  if (!snap.ok) {
    if (variant === "inline") {
      return (
        <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-400">
          Limited to {snap.cap} firms
        </span>
      );
    }
    return (
      <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-400">
        Limited to {snap.cap} firms · founding cohort
      </p>
    );
  }

  const remaining = Math.max(0, snap.cap - snap.claimed);
  const filled = snap.claimed >= snap.cap;
  const lowSlots = remaining > 0 && remaining <= 10;
  const fractionFilled = snap.cap > 0 ? snap.claimed / snap.cap : 0;

  if (variant === "inline") {
    return (
      <span
        className={`text-[11px] font-bold uppercase tracking-widest ${filled ? "text-zinc-400" : lowSlots ? "text-amber-300" : "text-emerald-400"}`}
        title={`${snap.claimed} of ${snap.cap} founding slots claimed`}
      >
        {filled ? (
          "All 50 spots claimed"
        ) : lowSlots ? (
          <>Only {remaining} {remaining === 1 ? "spot" : "spots"} left</>
        ) : hideCap ? (
          <>{snap.claimed} firms joined</>
        ) : (
          <>
            {snap.claimed} of {snap.cap} claimed
          </>
        )}
      </span>
    );
  }

  // Hero variant — stacked label + big numeric + progress bar.
  return (
    <div
      className={`inline-flex flex-col gap-2 rounded-2xl border ${filled ? "border-zinc-800 bg-zinc-900/40" : lowSlots ? "border-amber-500/40 bg-amber-500/5" : "border-emerald-500/30 bg-emerald-500/5"} px-5 py-4`}
      role="status"
      aria-live="polite"
      title={`${snap.claimed} of ${snap.cap} founding slots claimed`}
    >
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
        Founding cohort
      </span>
      <span className="font-mono text-[18px] font-extrabold text-zinc-100">
        {filled ? (
          "Cohort full"
        ) : (
          <>
            <span className={lowSlots ? "text-amber-300" : "text-emerald-400"}>
              {snap.claimed}
            </span>
            <span className="text-zinc-400"> / {snap.cap} claimed</span>
          </>
        )}
      </span>
      <div className="h-1.5 w-44 overflow-hidden rounded-full bg-zinc-900">
        <div
          className={`h-full ${filled ? "bg-zinc-700" : lowSlots ? "bg-amber-400" : "bg-emerald-400"} transition-[width] duration-700`}
          style={{ width: `${Math.min(100, fractionFilled * 100).toFixed(1)}%` }}
        />
      </div>
      {!filled && lowSlots && (
        <span className="text-[11px] font-medium text-amber-300">
          Only {remaining} {remaining === 1 ? "spot" : "spots"} left.
        </span>
      )}
    </div>
  );
}
