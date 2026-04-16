/**
 * POST /api/ab/convert — log A/B test conversion events.
 *
 * Body: { visitorId, testId, variant, eventName, metadata? }
 *
 * Conversion events are NOT deduplicated — we count every click, signup, etc.
 * Use event_name to distinguish CTA clicks, waitlist signups, demo views, etc.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      visitorId?: string;
      testId?: string;
      variant?: string;
      eventName?: string;
      metadata?: Record<string, unknown>;
    };

    if (!body.visitorId || !body.testId || !body.variant || !body.eventName) {
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

    await supabase.from("ab_test_events").insert({
      visitor_id: body.visitorId,
      test_id: body.testId,
      variant: body.variant,
      event_type: "conversion",
      event_name: body.eventName,
      metadata: body.metadata ?? {},
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
