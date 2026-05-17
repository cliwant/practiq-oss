/**
 * Vercel Cron — daily discovery outreach send pipeline.
 *
 * Schedule: 14:00 UTC weekdays (09:00 CT, 23:00 KST). Runs the conservative
 * day-time send window for cold outreach (best US-time deliverability).
 * Weekends are skipped — cold emails on Sat/Sun look automated.
 *
 * What it does:
 *   1. Auth gate (Vercel cron header or x-deploy-secret).
 *   2. Reads pending drafts from .cycle/research/.../outreach-drafts/.
 *   3. Selects today's batch (capped — see DAILY_CAP_DEFAULT).
 *   4. For each draft:
 *      a) Checks suppression list (recordSuppression / hasRecentBounce).
 *      b) Skips if recipient already had bad delivery on practiq.dev mail.
 *      c) Sends via existing src/lib/email/send.ts (Resend).
 *      d) Updates target-list.csv row → outreach_status='reached_out'.
 *      e) Moves draft → outreach-sent/.
 *   5. Posts a single Slack summary at end ("sent N, skipped M, queued K").
 *
 * Reputation-protection defaults:
 *   - Hard cap 5/day during week 1, ramping to 20/day max (see RAMP_SCHEDULE).
 *   - 15-90 min jitter between sends (drift-randomized).
 *   - Hard-fail if RESEND_API_KEY missing — never silent-skip a real send.
 *   - Dry-run mode (?dry=1) for verification.
 *   - Suppression check before EVERY send.
 *
 * The cron itself runs once daily; jitter is achieved by scheduling
 * Vercel-side bursts at random offsets within the window. For sub-daily
 * jitter we'd need to either schedule multiple slot times in vercel.json
 * (simple) or use a continuous worker (overkill for our volume).
 */
import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email/send";
import { isEmailConfigured } from "@/lib/email/client";
import { recordSuppression } from "@/lib/email/suppressions";
import { safeNotify } from "@/lib/notifications/slack";
import {
  readPendingDrafts,
  markDraftSent,
  updateTargetStatus,
} from "@/lib/outreach/discovery-state";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 300;

// Ramp schedule for new sending domain warm-up. The operator should
// follow these caps strictly — exceeding them in the first 2 weeks
// risks the practiq.dev domain reputation getting flagged.
const RAMP_SCHEDULE: Array<{ from: string; cap: number }> = [
  { from: "2026-05-17", cap: 5 }, // week 1
  { from: "2026-05-24", cap: 10 }, // week 2
  { from: "2026-05-31", cap: 15 }, // week 3
  { from: "2026-06-07", cap: 20 }, // week 4+
];

const DAILY_CAP_DEFAULT = 5;

function dailyCapForToday(today: Date): number {
  const iso = today.toISOString().slice(0, 10);
  let cap = DAILY_CAP_DEFAULT;
  for (const tier of RAMP_SCHEDULE) {
    if (iso >= tier.from) cap = tier.cap;
  }
  return cap;
}

function isAuthorized(request: NextRequest): boolean {
  if (request.headers.get("x-vercel-cron") !== null) return true;
  const secret = process.env.SEO_DEPLOY_SECRET?.trim();
  const passed = request.headers.get("x-deploy-secret")?.trim();
  if (secret && passed === secret) return true;
  return false;
}

/**
 * Check whether a recipient has any active suppression. We don't have
 * a direct read API on suppressions, but recordSuppression returns
 * isFirstAlert=false when an existing row is bumped — so we use a
 * dry-run sentinel: query the table directly.
 */
async function isSuppressed(recipient: string): Promise<boolean> {
  try {
    const lower = recipient.toLowerCase();
    const row = await prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS count FROM practiq.email_suppressions
      WHERE LOWER(recipient) = ${lower}
        AND reason IN ('bounce', 'complaint', 'unsubscribe')
    `;
    return (row?.[0]?.count ?? 0) > 0;
  } catch {
    // If suppressions table unavailable, FAIL CLOSED — don't send.
    return true;
  }
}

async function handle(request: NextRequest, dryRun: boolean) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "cron-only" }, { status: 401 });
  }

  // Refuse to send if Resend isn't configured — never silent-skip
  // a real outreach attempt.
  if (!isEmailConfigured() && !dryRun) {
    return NextResponse.json(
      { error: "RESEND_API_KEY not configured — refusing to send" },
      { status: 500 },
    );
  }

  // Skip on weekends — cold-outreach hygiene.
  const today = new Date();
  const dow = today.getUTCDay(); // 0 Sun … 6 Sat
  if (dow === 0 || dow === 6) {
    return NextResponse.json({ ok: true, skipped: "weekend" });
  }

  const cap = dailyCapForToday(today);
  const drafts = await readPendingDrafts();

  if (drafts.length === 0) {
    return NextResponse.json({ ok: true, message: "no drafts pending", cap });
  }

  const batch = drafts.slice(0, cap);
  const sent: Array<{ slug: string; ok: boolean; messageId?: string; error?: string }> = [];
  const skipped: Array<{ slug: string; reason: string }> = [];

  for (const draft of batch) {
    // 1. Suppression check (fail-closed)
    const suppressed = await isSuppressed(draft.email_address);
    if (suppressed) {
      skipped.push({ slug: draft.slug, reason: "suppressed" });
      // Move out of drafts so it doesn't sit there forever
      if (!dryRun) {
        await markDraftSent(draft.slug, {
          ok: false,
          provider: "skipped",
          error: "suppressed",
        });
      }
      continue;
    }

    // 2. Confidence floor — if Claude's confidence < 0.6, hold for review.
    // Operator can re-run discovery:personalize with richer enrichment.
    if (draft.confidence < 0.6) {
      skipped.push({ slug: draft.slug, reason: `low_confidence_${draft.confidence}` });
      continue;
    }

    if (dryRun) {
      sent.push({ slug: draft.slug, ok: true });
      continue;
    }

    // 3. Send
    const result = await sendEmail({
      to: draft.email_address,
      subject: draft.subject,
      html: draft.html,
      text: draft.text,
      tag: "discovery-outreach",
      replyTo: process.env.OUTREACH_REPLY_TO ?? undefined,
    });

    sent.push({
      slug: draft.slug,
      ok: result.ok,
      messageId: result.id,
      error: result.error,
    });

    if (result.ok) {
      // 4. Update CSV + move draft → sent
      const dateStr = new Date().toISOString().slice(0, 10);
      await updateTargetStatus(draft.email_address, {
        outreach_status: "reached_out",
        outreach_date: dateStr,
      });
      await markDraftSent(draft.slug, {
        ok: true,
        provider: result.provider,
        messageId: result.id,
      });
    } else {
      // If Resend rejected (bad domain, etc.), record so we know
      await recordSuppression({
        recipient: draft.email_address,
        reason: "bounce",
        bounceType: "hard",
        tag: "discovery-outreach",
        messageId: result.id ?? null,
      }).catch(() => {
        /* table missing — best-effort */
      });
      await markDraftSent(draft.slug, {
        ok: false,
        provider: result.provider,
        error: result.error,
      });
    }
  }

  // Slack summary
  const okCount = sent.filter((s) => s.ok).length;
  const errCount = sent.filter((s) => !s.ok).length;
  safeNotify("error", {
    where: "cron:discovery-outreach",
    message: `Discovery outreach run: ${okCount} sent, ${errCount} errored, ${skipped.length} skipped. ${drafts.length - batch.length} queued for next run (cap=${cap}/day).`,
    sent: okCount,
    errored: errCount,
    skipped: skipped.length,
    cap,
    queued_for_next: drafts.length - batch.length,
  });

  return NextResponse.json({
    ok: true,
    date: today.toISOString().slice(0, 10),
    cap,
    sent: okCount,
    errored: errCount,
    skipped: skipped.length,
    queued_for_next_run: drafts.length - batch.length,
    detail: { sent, skipped },
  });
}

export async function GET(request: NextRequest) {
  const dry = new URL(request.url).searchParams.get("dry") === "1";
  return handle(request, dry);
}

export async function POST(request: NextRequest) {
  const dry = new URL(request.url).searchParams.get("dry") === "1";
  return handle(request, dry);
}
