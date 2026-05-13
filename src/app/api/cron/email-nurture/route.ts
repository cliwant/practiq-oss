/**
 * Daily email nurture cron — sends scheduled emails to waitlist signups.
 *
 * Logic:
 *   1. Query all waitlist signups
 *   2. For each, compute days since signup (integer)
 *   3. If days matches a scheduled step (0, 3, 7, 14, 21, 30), send that email
 *   4. Deduplicate via nurture_sends table — never send same step twice
 *
 * Schedule: daily at 13:00 UTC (= 9 AM ET, aligns with professional services
 * inbox peak on east coast).
 *
 * Migration required (apply separately):
 *   create table if not exists nurture_sends (
 *     id uuid primary key default gen_random_uuid(),
 *     email text not null,
 *     day integer not null,
 *     sent_at timestamptz not null default now(),
 *     unique(email, day)
 *   );
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/send";
import { reportUserError } from "@/lib/notifications/user-error";
import { getEmailForDay, type VerticalSlug } from "@/lib/email-templates";

export const runtime = "nodejs";
export const maxDuration = 120;

// Scheduled nurture days — must match NURTURE_SCHEDULE keys in email-templates.ts
const NURTURE_DAYS = [0, 3, 7, 14, 21, 30] as const;

export async function GET(request: NextRequest) {
  const isVercelCron = request.headers.get("x-vercel-cron") !== null;
  const expectedSecret = process.env.SEO_DEPLOY_SECRET?.trim();
  const passedSecret = request.headers.get("x-deploy-secret")?.trim();
  const isSecretAuth = expectedSecret && passedSecret === expectedSecret;

  if (!isVercelCron && !isSecretAuth) {
    return NextResponse.json({ error: "cron-only endpoint" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "supabase env missing" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  // Load all waitlist signups
  // Note: waitlist table does NOT have a first_name column. Email templates
  // use firstName only for greeting (`Hi ${firstName}, ` vs `Hi there,`), so
  // we pass null and let templates handle fallback. If we ever collect first
  // name in the signup form, add the column and select it here.
  const { data: signups, error: fetchErr } = await supabase
    .from("waitlist")
    .select("email, firm_vertical, created_at");

  if (fetchErr) {
    return NextResponse.json(
      { ok: false, error: "fetch failed: " + fetchErr.message },
      { status: 500 }
    );
  }

  if (!signups || signups.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, sent: 0 });
  }

  // Email transport is the studio's shared Resend pipeline via sendEmail.

  let sent = 0;
  let skipped = 0;
  let errors = 0;
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const now = Date.now();

  for (const signup of signups) {
    const email = signup.email as string;
    const signedUpAt = new Date(signup.created_at as string);
    const daysSinceSignup = Math.floor((now - signedUpAt.getTime()) / MS_PER_DAY);

    // Check if this day matches a scheduled step
    if (!NURTURE_DAYS.includes(daysSinceSignup as typeof NURTURE_DAYS[number])) {
      skipped++;
      continue;
    }

    // Dedupe — already sent this day?
    const { data: existing } = await supabase
      .from("nurture_sends")
      .select("id")
      .eq("email", email)
      .eq("day", daysSinceSignup)
      .limit(1);

    if (existing && existing.length > 0) {
      skipped++;
      continue;
    }

    // Build and send (firstName=null — waitlist doesn't collect it; template falls back to "Hi there,")
    const tpl = getEmailForDay(daysSinceSignup, {
      email,
      vertical: (signup.firm_vertical as VerticalSlug) ?? "unknown",
      firstName: null,
      signedUpAt,
    });

    if (!tpl) {
      skipped++;
      continue;
    }

    const result = await sendEmail({
      to: email,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
      tag: `nurture-day-${daysSinceSignup}`,
    });
    if (!result.ok && result.provider === "resend") {
      console.error(
        `[nurture] Resend send failed for ${email} day ${daysSinceSignup}: ${result.error}`,
      );
      await reportUserError({
        surface: "other",
        endpoint: "GET /api/cron/email-nurture",
        status: 500,
        errorMessage: `Resend send (nurture-day-${daysSinceSignup}): ${result.error ?? "unknown"}`,
        userContext: { email },
        stepIfApplicable: `Resend sendEmail (nurture-day-${daysSinceSignup})`,
      });
      errors++;
      continue;
    }

    // Log send for dedup
    await supabase.from("nurture_sends").insert({
      email,
      day: daysSinceSignup,
    });

    sent++;
  }

  return NextResponse.json({
    ok: true,
    processed: signups.length,
    sent,
    skipped,
    errors,
  });
}
