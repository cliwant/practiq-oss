/**
 * /api/cron/cold-send — daily Vercel cron at 15:00 UTC, Mon-Fri only.
 *
 * 15:00 UTC = 10 AM CT during CDT (May-Nov), 9 AM CT during CST (Nov-May).
 * The cron expression `0 15 * * 1-5` already excludes weekends, so the
 * handler does not need to re-check day-of-week.
 *
 * Logic:
 *   1. Auth: verify Bearer token matches CRON_SECRET.
 *   2. Get today's date in America/Chicago.
 *   3. Look up the date in COLD_SCHEDULE (Day1..Day10). If no match: noop.
 *   4. Find drafts labeled `Practiq/Cold/Day{N}`.
 *   5. For each: skip if body still has personalization placeholder or
 *      if To: header is empty. Otherwise drafts.send (or dry-run).
 *   6. Return JSON summary; (best-effort) post a Slack notification.
 *
 * Schedule (revised 2026-05-08 per operator request: every weekday no
 * gaps, starting today; ramped 2 → 3 → 2 for warmup pacing):
 *   2026-05-08 → Day1   (Fri  CDT) - 2 sends (warmup)
 *   2026-05-11 → Day2   (Mon  CDT) - 2 sends (warmup)
 *   2026-05-12 → Day3   (Tue  CDT) - 3 sends
 *   2026-05-13 → Day4   (Wed  CDT) - 3 sends
 *   2026-05-14 → Day5   (Thu  CDT) - 3 sends
 *   2026-05-15 → Day6   (Fri  CDT) - 3 sends
 *   2026-05-18 → Day7   (Mon  CDT) - 3 sends
 *   2026-05-19 → Day8   (Tue  CDT) - 3 sends
 *   2026-05-20 → Day9   (Wed  CDT) - 3 sends
 *   2026-05-21 → Day10  (Thu  CDT) - 3 sends
 *   2026-05-22 → Day11  (Fri  CDT) - 3 sends
 *   (2026-05-25 Memorial Day — skipped)
 *   2026-05-26 → Day12  (Tue  CDT) - 3 sends
 *   2026-05-27 → Day13  (Wed  CDT) - 3 sends
 *   2026-05-28 → Day14  (Thu  CDT) - 3 sends
 *   2026-05-29 → Day15  (Fri  CDT) - 3 sends
 *   2026-06-01 → Day16  (Mon  CDT) - 2 sends (wind-down)
 *   2026-06-02 → Day17  (Tue  CDT) - 2 sends (wind-down)
 */

import {
  todayInTz,
  isWeekdayInTz,
  sendOrSkipDraftsForLabel,
  checkCronAuth,
} from '@/lib/outreach/gmail-send';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // up to 5 min — labels.list + drafts.get are slow

const COLD_SCHEDULE: Record<string, string> = {
  '2026-05-08': 'Day1',
  '2026-05-11': 'Day2',
  '2026-05-12': 'Day3',
  '2026-05-13': 'Day4',
  '2026-05-14': 'Day5',
  '2026-05-15': 'Day6',
  '2026-05-18': 'Day7',
  '2026-05-19': 'Day8',
  '2026-05-20': 'Day9',
  '2026-05-21': 'Day10',
  '2026-05-22': 'Day11',
  // 2026-05-25 Memorial Day (US federal holiday) — skipped
  '2026-05-26': 'Day12',
  '2026-05-27': 'Day13',
  '2026-05-28': 'Day14',
  '2026-05-29': 'Day15',
  '2026-06-01': 'Day16',
  '2026-06-02': 'Day17',
};

async function notifySlack(summary: {
  date: string;
  dayLabel: string | null;
  result: Awaited<ReturnType<typeof sendOrSkipDraftsForLabel>> | null;
  reason?: string;
}) {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return;

  // Suppress noop notifications. Most weekdays have no scheduled cold batch,
  // and the cron runs every weekday — without this filter the channel gets
  // a "no batch scheduled" message every quiet day. The operator can check
  // Vercel runtime logs for cron-tick visibility.
  if (!summary.result) return;

  // Suppress when result has no real activity (label exists but is empty —
  // e.g. operator already manually fired the batch via the force_day route).
  const r = summary.result;
  if (r.attempted === 0) return;

  const lines: string[] = [];
  lines.push(`*Practiq cold-send cron* — ${summary.date} CT`);
  lines.push(
    `Day=${summary.dayLabel} | dryRun=${r.dryRun} | attempted=${r.attempted} sent=${r.sent} skipped=${r.skipped} errors=${r.errors}`
  );
  for (const d of r.details) {
    lines.push(`• [${d.outcome}] ${d.to} — ${d.subject}${d.note ? ` (${d.note})` : ''}`);
  }
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: lines.join('\n') }),
    });
  } catch {
    /* best-effort, don't block the cron */
  }
}

export async function GET(req: Request) {
  if (!checkCronAuth(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const tz = 'America/Chicago';
  const now = new Date();
  const date = todayInTz(now, tz);

  // ?force_day=Day1 — manual override that bypasses the date lookup. Useful
  //   for ad-hoc verification / re-runs after the operator personalizes a
  //   draft post-cron-fire. Still subject to CRON_DRY_RUN unless ?dry_run=
  //   is also passed. Auth-gated by the same Bearer-token check above.
  const url = new URL(req.url);
  const forceDay = url.searchParams.get('force_day');
  const forceDryRun = url.searchParams.get('dry_run');
  const dryRun =
    forceDryRun !== null
      ? forceDryRun === 'true'
      : process.env.CRON_DRY_RUN === 'true';

  if (forceDay) {
    const result = await sendOrSkipDraftsForLabel({
      labelName: `Practiq/Cold/${forceDay}`,
      dryRun,
    });
    await notifySlack({ date, dayLabel: forceDay, result });
    return NextResponse.json({ ...result, date, dayLabel: forceDay, forced: true });
  }

  // Defensive: even though the cron expression excludes weekends, double-
  // check in case someone hits the endpoint manually.
  if (!isWeekdayInTz(now, tz)) {
    await notifySlack({ date, dayLabel: null, result: null, reason: 'weekend in CT' });
    return NextResponse.json({ status: 'noop', reason: 'weekend', date, dryRun });
  }

  const dayLabel = COLD_SCHEDULE[date];
  if (!dayLabel) {
    await notifySlack({
      date,
      dayLabel: null,
      result: null,
      reason: 'no cold batch scheduled',
    });
    return NextResponse.json({
      status: 'noop',
      reason: 'no cold batch scheduled',
      date,
      dryRun,
    });
  }

  const result = await sendOrSkipDraftsForLabel({
    labelName: `Practiq/Cold/${dayLabel}`,
    dryRun,
  });
  await notifySlack({ date, dayLabel, result });
  return NextResponse.json({ ...result, date, dayLabel });
}
