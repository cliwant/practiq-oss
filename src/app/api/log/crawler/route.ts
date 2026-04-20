/**
 * POST /api/log/crawler — record a bot/crawler hit in Supabase.
 *
 * Called by the Edge middleware on every bot-detected request.
 * Fire-and-forget — the middleware does NOT wait for this response.
 *
 * IMPORTANT: this route is intentionally permissive (no auth) because the
 * middleware is the only legitimate caller, and middleware can't authenticate
 * itself easily. The threat model: an attacker could spam fake bot hits to
 * pollute analytics. Accepted risk for now — stats are directional, not
 * billing-relevant. If abuse becomes an issue, add HMAC of payload + timestamp
 * with a shared secret known only to middleware.
 *
 * Apply this DDL in Supabase before deploy:
 *   See supabase/migrations/20260414100000_crawler_hits.sql
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { safeNotify } from "@/lib/notifications/slack";

interface CrawlerHitPayload {
  botName?: string;
  category?: string;
  userAgent?: string;
  path?: string;
  referer?: string | null;
  country?: string | null;
  ipHash?: string | null;
  hitAt?: string;
}

export const runtime = "nodejs"; // need full Node API for Supabase admin client

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CrawlerHitPayload;

    if (!body.botName || !body.path) {
      return NextResponse.json({ ok: false, error: "missing fields" }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;

    if (!url || !key) {
      // Don't 500 — just log and acknowledge. Middleware is fire-and-forget.
      console.warn("[crawler-log] Supabase env vars missing");
      return NextResponse.json({ ok: true, stored: false });
    }

    const supabase = createClient(url, key, { auth: { persistSession: false } });

    // Detect novelty BEFORE insert: if this bot has never been seen, ping
    // Slack. Use a single-row select with limit=1 to keep it cheap even
    // on a large crawler_hits table.
    let isFirstHit = false;
    try {
      const { data: prior, error: priorErr } = await supabase
        .from("crawler_hits")
        .select("bot_name")
        .eq("bot_name", body.botName)
        .limit(1);
      if (!priorErr && (!prior || prior.length === 0)) {
        isFirstHit = true;
      }
    } catch {
      // If the novelty query blows up (e.g. table missing), don't notify.
      isFirstHit = false;
    }

    const { error } = await supabase.from("crawler_hits").insert({
      bot_name: body.botName,
      bot_category: body.category ?? "other",
      user_agent: body.userAgent ?? null,
      path: body.path,
      referer: body.referer ?? null,
      country: body.country ?? null,
      ip_hash: body.ipHash ?? null,
      hit_at: body.hitAt ?? new Date().toISOString(),
    });

    if (error) {
      // Common: table doesn't exist yet (migration not applied). Log + ack.
      console.warn("[crawler-log] insert failed:", error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 200 });
      // Note: 200 not 500 — middleware should not retry.
    }

    if (isFirstHit) {
      safeNotify("bot_first_hit", {
        botName: body.botName,
        category: body.category ?? "other",
        path: body.path,
        country: body.country ?? null,
      });
    }

    return NextResponse.json({ ok: true, stored: true });
  } catch (err) {
    console.warn("[crawler-log] handler error:", err);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
