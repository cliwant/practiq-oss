/**
 * POST /api/ab/expose — log A/B test exposure events from client.
 *
 * Body: { visitorId, exposures: [{ testId, variant }, ...] }
 *
 * Fire-and-forget on the client. Deduplicates by (visitor_id, test_id, variant)
 * so multiple page loads don't double-count.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      visitorId?: string;
      exposures?: Array<{ testId: string; variant: string }>;
    };

    if (!body.visitorId || !Array.isArray(body.exposures) || body.exposures.length === 0) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ ok: true, skipped: "no supabase env" });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    // Check for existing exposures to avoid duplicate rows for the same visitor
    for (const exp of body.exposures) {
      if (!exp.testId || !exp.variant) continue;

      const { data: existing } = await supabase
        .from("ab_test_events")
        .select("id")
        .eq("visitor_id", body.visitorId)
        .eq("test_id", exp.testId)
        .eq("variant", exp.variant)
        .eq("event_type", "exposure")
        .limit(1);

      if (existing && existing.length > 0) continue;

      await supabase.from("ab_test_events").insert({
        visitor_id: body.visitorId,
        test_id: exp.testId,
        variant: exp.variant,
        event_type: "exposure",
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
