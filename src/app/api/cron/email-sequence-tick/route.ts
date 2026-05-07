/**
 * Daily lifecycle email tick — drives Day 3 / Day 7 / Day 14 sends
 * after `signup_completed`. Welcome (Day 0) is fired synchronously
 * from the signup route; this cron only handles the follow-ups.
 *
 * Schedule: daily at 04:00 UTC (vercel.json). 04:00 UTC ≈ midnight ET
 * which keeps the actual Resend dispatch outside US business hours
 * but still in the morning for EU recipients.
 *
 * Idempotency: every send writes a `sequence_email_sent` analytics
 * event with `properties.step ∈ {welcome, day3, day7, day14}` keyed
 * on the user's id (also stored in `userId`). Before sending we check
 * for the absence of that row. Re-running the cron is a no-op.
 *
 * Gating:
 *   - Day 3: only if user has 0 `feature_used` events
 *   - Day 7: always send (modulo idempotency)
 *   - Day 14: only if user has < 5 `$pageview` events (low-engagement
 *     proxy). The intent is the graceful re-engagement nudge — don't
 *     send it to active users, that would feel like noise.
 *
 * Auth: same x-vercel-cron / x-deploy-secret pattern as the rest of
 * the cron tree.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/send";
import { trackEvent } from "@/lib/analytics/track";
import {
  SEQUENCE_BUILDERS,
  type SequenceStep,
  type SequenceUser,
} from "@/lib/email/sequences";

export const runtime = "nodejs";
export const maxDuration = 120;

// Day-step targets. Each entry says: "for users created N days ago
// (±buffer), send this step". The 24h buffer keeps a single Vercel
// cron miss from skipping users.
const STEPS: Array<{
  step: SequenceStep;
  daysSinceSignup: number;
  bufferHours: number;
}> = [
  { step: "day3", daysSinceSignup: 3, bufferHours: 24 },
  { step: "day7", daysSinceSignup: 7, bufferHours: 24 },
  { step: "day14", daysSinceSignup: 14, bufferHours: 24 },
];

function isAuthorized(request: NextRequest): boolean {
  if (request.headers.get("x-vercel-cron") !== null) return true;
  const expected = process.env.SEO_DEPLOY_SECRET?.trim();
  const passed = request.headers.get("x-deploy-secret")?.trim();
  if (expected && passed && expected === passed) return true;
  const auth = request.headers.get("authorization") ?? "";
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && auth === `Bearer ${cronSecret}`) return true;
  return false;
}

function firstNameFrom(user: { name: string | null; email: string }): string {
  const raw = (user.name ?? user.email).split(/[@\s]/)[0].replace(/[^a-zA-Z]/g, "");
  if (raw.length === 0) return "";
  return raw[0].toUpperCase() + raw.slice(1);
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}

async function handle(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "cron-only endpoint" }, { status: 401 });
  }

  try {
    return await handleInner();
  } catch (err) {
    const { safeNotify } = await import("@/lib/notifications/slack");
    safeNotify(
      "error",
      {
        where: "cron:email-sequence-tick",
        message: err instanceof Error ? err.message : String(err),
      },
      { severity: "critical" },
    );
    console.error("[email-sequence-tick] fatal:", err);
    return NextResponse.json({ ok: false, error: "internal" }, { status: 500 });
  }
}

async function handleInner() {
  const summary: Record<string, number> = {
    day3_eligible: 0,
    day3_sent: 0,
    day3_skipped_already_sent: 0,
    day3_skipped_has_feature: 0,
    day7_eligible: 0,
    day7_sent: 0,
    day7_skipped_already_sent: 0,
    day14_eligible: 0,
    day14_sent: 0,
    day14_skipped_already_sent: 0,
    day14_skipped_engaged: 0,
    errors: 0,
  };

  const now = Date.now();

  for (const { step, daysSinceSignup, bufferHours } of STEPS) {
    // Window: signups created between (now - days - buffer) and (now - days).
    // The lower bound makes the cron tolerant to one missed run.
    const upper = new Date(now - daysSinceSignup * 24 * 60 * 60 * 1000);
    const lower = new Date(
      now - (daysSinceSignup * 24 + bufferHours) * 60 * 60 * 1000,
    );

    const candidates = await prisma.user.findMany({
      where: {
        createdAt: { gte: lower, lte: upper },
      },
      select: {
        id: true,
        email: true,
        name: true,
        firmVertical: true,
      },
    });

    summary[`${step}_eligible`] = candidates.length;

    for (const u of candidates) {
      try {
        // Idempotency check: did we already send this step?
        const already = await prisma.analyticsEvent.findFirst({
          where: {
            type: "sequence_email_sent",
            userId: u.id,
            properties: { path: ["step"], equals: step },
          },
          select: { id: true },
        });
        if (already) {
          summary[`${step}_skipped_already_sent`] += 1;
          continue;
        }

        // Per-step gating.
        if (step === "day3") {
          // "feature_used" not currently in our taxonomy; we approximate
          // with `workflow_started` (the canonical first-feature signal).
          // If we add a true feature_used event later, swap the type
          // filter and the heuristic stays correct.
          const hasFeature = await prisma.analyticsEvent.findFirst({
            where: {
              userId: u.id,
              type: "workflow_started",
            },
            select: { id: true },
          });
          if (hasFeature) {
            summary.day3_skipped_has_feature += 1;
            continue;
          }
        } else if (step === "day14") {
          const pageviewCount = await prisma.analyticsEvent.count({
            where: {
              userId: u.id,
              type: "$pageview",
            },
          });
          if (pageviewCount >= 5) {
            summary.day14_skipped_engaged += 1;
            continue;
          }
        }

        const seqUser: SequenceUser = {
          id: u.id,
          email: u.email,
          firstName: firstNameFrom(u),
          firmVertical: u.firmVertical ?? null,
        };
        const builder = SEQUENCE_BUILDERS[step];
        const mail = builder(seqUser);

        const result = await sendEmail({
          to: u.email,
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
          tag: `sequence-${step}`,
        });

        if (!result.ok && result.provider !== "dev-logged") {
          summary.errors += 1;
          console.error(
            `[email-sequence-tick] ${step} send failed for ${u.email}: ${result.error}`,
          );
          continue;
        }

        // Record the idempotency marker. We log it even on dev-logged
        // sends so a local run does not retransmit on every cron tick.
        await trackEvent({
          type: "sequence_email_sent",
          userId: u.id,
          properties: { step },
        });
        summary[`${step}_sent`] += 1;
      } catch (err) {
        summary.errors += 1;
        console.error(
          `[email-sequence-tick] ${step} threw for user ${u.id}:`,
          err,
        );
      }
    }
  }

  if (summary.errors > 0) {
    const { safeNotify } = await import("@/lib/notifications/slack");
    safeNotify(
      "error",
      {
        where: "cron:email-sequence-tick",
        message: `Per-user errors: ${summary.errors}`,
      },
      { severity: "warning" },
    );
  }

  return NextResponse.json({ ok: true, summary });
}
