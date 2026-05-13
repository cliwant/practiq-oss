/**
 * GET /api/founding/status — current FoundingSlot snapshot for client
 * components that can't import the server-only FoundingCounter.
 *
 * Why: /signup is a client component (it owns useState + form handlers),
 * but the founding-member splash there needs to render a live "X of 50
 * claimed" pill. The /pricing and /founding-member pages embed the
 * server-only <FoundingCounter /> directly; this route is the
 * client-component-friendly equivalent.
 *
 * Atomicity guarantee: this endpoint is READ-ONLY. The only writer to
 * FoundingSlot is the Stripe webhook (atomic UPDATE … WHERE
 * claimedCount < cap). Re-rendering or hammering this route never
 * mutates state.
 *
 * Cache: 60 s edge cache + stale-while-revalidate keeps load minimal
 * during organic traffic. The cohort fills at < 1/day in steady state.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Default cap matches the FoundingCounter fallback so the API never
// emits a "0 of 50" pre-seed value. The seed migration sets cap=50.
const FALLBACK_CAP = 50;

interface FoundingStatusBody {
  claimed: number;
  cap: number;
  remaining: number;
  filled: boolean;
}

// Note: an internal `seeded` boolean used to ride along on this response
// to tell whether the FoundingSlot row had been inserted yet. The 2026-
// 05-13 R3 dogfood report flagged it as an operator-state leak — public
// clients have no use for it, and exposing it tells the world whether
// the cohort migration shipped. Removed from the response shape (the DB
// state is still derivable internally from `claimed === 0 && cap > 0`).

export async function GET() {
  try {
    const row = await prisma.foundingSlot.findUnique({
      where: { id: "singleton" },
      select: { claimedCount: true, cap: true },
    });

    if (!row) {
      return NextResponse.json<FoundingStatusBody>(
        {
          claimed: 0,
          cap: FALLBACK_CAP,
          remaining: FALLBACK_CAP,
          filled: false,
        },
        {
          headers: {
            "Cache-Control":
              "public, s-maxage=60, stale-while-revalidate=300",
          },
        },
      );
    }

    const remaining = Math.max(0, row.cap - row.claimedCount);
    return NextResponse.json<FoundingStatusBody>(
      {
        claimed: row.claimedCount,
        cap: row.cap,
        remaining,
        filled: row.claimedCount >= row.cap,
      },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  } catch {
    // DB blip → don't fail the public signup splash. Fall back to the
    // cap-only shape (same posture FoundingCounter takes server-side).
    return NextResponse.json<FoundingStatusBody>(
      {
        claimed: 0,
        cap: FALLBACK_CAP,
        remaining: FALLBACK_CAP,
        filled: false,
      },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=30, stale-while-revalidate=120",
        },
      },
    );
  }
}
