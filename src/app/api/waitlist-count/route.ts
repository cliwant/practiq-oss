/**
 * GET /api/waitlist-count — returns public waitlist counter.
 *
 * Returns a floored, slightly inflated number for social proof display.
 * Floor ensures visitors don't see "3 people on the waitlist" at day 1.
 * Inflation is removed as real signups grow past the floor.
 *
 * Cached for 5 minutes at the edge to avoid hammering Supabase.
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const revalidate = 300;

// Floor ensures social proof reads sensibly even at cold start.
// When real signups exceed the floor, the floor is ignored.
const DISPLAY_FLOOR = 47;

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { count: DISPLAY_FLOOR, displayed: DISPLAY_FLOOR },
        { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    const { count, error } = await supabase
      .from("waitlist")
      .select("*", { count: "exact", head: true });

    if (error) {
      return NextResponse.json(
        { count: DISPLAY_FLOOR, displayed: DISPLAY_FLOOR },
        { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
      );
    }

    const realCount = count ?? 0;
    const displayed = Math.max(realCount, DISPLAY_FLOOR);

    return NextResponse.json(
      { count: realCount, displayed },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
    );
  } catch {
    return NextResponse.json(
      { count: DISPLAY_FLOOR, displayed: DISPLAY_FLOOR },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
    );
  }
}
