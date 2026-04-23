import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { safeNotify } from "@/lib/notifications/slack";

/**
 * Newsletter signup API route.
 * Stores email in Supabase `newsletter_subscribers`. Does not send email —
 * confirmation/delivery can be added later.
 *
 * --- Supabase migration (apply manually via psql or Supabase SQL editor) ---
 *
 *   create table if not exists newsletter_subscribers (
 *     id uuid primary key default gen_random_uuid(),
 *     email text unique not null,
 *     source text,
 *     post_slug text,
 *     subscribed_at timestamptz not null default now()
 *   );
 *
 *   create index if not exists newsletter_subscribers_email_idx
 *     on newsletter_subscribers (email);
 *
 * ---------------------------------------------------------------------------
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      email?: unknown;
      source?: unknown;
      postSlug?: unknown;
    };

    const emailRaw = typeof body.email === "string" ? body.email.trim() : "";
    const source = typeof body.source === "string" ? body.source : null;
    const postSlug = typeof body.postSlug === "string" ? body.postSlug : null;

    if (!emailRaw || !EMAIL_RE.test(emailRaw)) {
      return NextResponse.json(
        { ok: false, error: "Valid email is required" },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error("[newsletter] Missing Supabase env vars");
      return NextResponse.json(
        { ok: false, error: "Server configuration error" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    const { error } = await supabase.from("newsletter_subscribers").insert({
      email: emailRaw.toLowerCase(),
      source,
      post_slug: postSlug,
    });

    if (error) {
      // 23505 = unique_violation — treat as success (idempotent subscribe).
      // NOTE: do NOT notify on already-subscribed (too noisy).
      if (error.code === "23505") {
        return NextResponse.json({ ok: true, alreadySubscribed: true });
      }
      console.error("[newsletter] Supabase error:", error);
      return NextResponse.json(
        { ok: false, error: "Failed to subscribe" },
        { status: 500 }
      );
    }

    // New subscriber — ping Slack (fire-and-forget)
    safeNotify("newsletter", {
      email: emailRaw.toLowerCase(),
      source,
      postSlug,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[newsletter] Unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
