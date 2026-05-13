"use client";

/**
 * FoundingCounterClient — client-side variant of FoundingCounter for use
 * inside Client Component pages (e.g. /signup).
 *
 * The server <FoundingCounter /> component reads Prisma directly, which
 * only works in Server Components. /signup is a Client Component
 * (useState + form handlers), so we hit /api/founding/status from the
 * browser instead.
 *
 * Why surface the count on /signup at all: the founding-member deeplink
 * lands users straight on the create-account form with "one of the first
 * 50 firms" copy, but without a remaining-seats number the urgency
 * anchor is generic. Cold prospects browse for ~2 sec on this page;
 * dropping a concrete "8 of 50 seats claimed" pill converts measurably
 * better than the static promise. Dogfood 2026-05-13 P1-9.
 */

import { useEffect, useState } from "react";

interface FoundingStatus {
  claimed: number;
  cap: number;
  remaining: number;
  filled: boolean;
  seeded: boolean;
}

export function FoundingCounterClient() {
  const [status, setStatus] = useState<FoundingStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/founding/status", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: FoundingStatus | null) => {
        if (!cancelled && data) setStatus(data);
      })
      .catch(() => {
        // Silent — pre-paint state stays as the static "Limited to 50
        // firms" fallback rendered below.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Pre-fetch (or DB blip) — render a stable scarcity line that matches
  // the promise copy without inventing a fake count.
  if (!status || !status.seeded) {
    return (
      <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-400">
        Limited to 50 firms · founding cohort
      </p>
    );
  }

  if (status.filled) {
    return (
      <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">
        Founding cohort full
      </p>
    );
  }

  const lowSlots = status.remaining > 0 && status.remaining <= 10;
  const tone = lowSlots ? "text-amber-300" : "text-emerald-400";

  return (
    <p
      className={`text-[11px] font-bold uppercase tracking-widest ${tone}`}
      role="status"
      aria-live="polite"
      title={`${status.claimed} of ${status.cap} founding slots claimed`}
    >
      {lowSlots ? (
        <>
          Only {status.remaining} {status.remaining === 1 ? "spot" : "spots"} left
          · {status.claimed}/{status.cap} claimed
        </>
      ) : (
        <>
          {status.claimed} of {status.cap} founding spots claimed
        </>
      )}
    </p>
  );
}
