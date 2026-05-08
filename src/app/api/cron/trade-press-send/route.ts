/**
 * /api/cron/trade-press-send — daily Vercel cron at 15:00 UTC, Mon-Fri only.
 *
 * Schedule (matches apps-script/practiq-schedule-send.gs):
 *   2026-05-12 → AccountingToday      (Daniel Hood @ daniel.hood@arizent.com)
 *   2026-05-13 → CPAPracticeAdvisor   (Gail Perry  @ gperry@cpapracticeadvisor.com)
 *   2026-05-14 → AbovetheLaw          (Joe Patrice @ tips@abovethelaw.com)
 *   2026-05-18 → SHRM                 (Allen Smith @ asmith@shrm.org)
 *   2026-05-19 → MarketingProfs       (Ann Handley @ ann@marketingprofs.com)
 *
 * Same pattern as cold-send, single label per day.
 */

import {
  todayInTz,
  isWeekdayInTz,
  sendOrSkipDraftsForLabel,
  checkCronAuth,
} from '@/lib/outreach/gmail-send';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const PRESS_SCHEDULE: Record<string, string> = {
  '2026-05-12': 'AccountingToday',
  '2026-05-13': 'CPAPracticeAdvisor',
  '2026-05-14': 'AbovetheLaw',
  '2026-05-18': 'SHRM',
  '2026-05-19': 'MarketingProfs',
};

async function notifySlack(summary: {
  date: string;
  slug: string | null;
  result: Awaited<ReturnType<typeof sendOrSkipDraftsForLabel>> | null;
  reason?: string;
}) {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return;
  const lines: string[] = [];
  lines.push(`*Practiq trade-press-send cron* — ${summary.date} ET`);
  if (!summary.result) {
    lines.push(`Status: noop (${summary.reason || 'no press send today'})`);
  } else {
    const r = summary.result;
    lines.push(
      `Slug=${summary.slug} | dryRun=${r.dryRun} | attempted=${r.attempted} sent=${r.sent} skipped=${r.skipped} errors=${r.errors}`
    );
    for (const d of r.details) {
      lines.push(`• [${d.outcome}] ${d.to} — ${d.subject}${d.note ? ` (${d.note})` : ''}`);
    }
  }
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: lines.join('\n') }),
    });
  } catch {
    /* best-effort */
  }
}

export async function GET(req: Request) {
  if (!checkCronAuth(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Trade press uses ET (NY) since the editorial audience is east-coast leaning.
  const tz = 'America/New_York';
  const now = new Date();
  const date = todayInTz(now, tz);

  // ?force_slug=AccountingToday — manual override (same pattern as cold-send).
  const url = new URL(req.url);
  const forceSlug = url.searchParams.get('force_slug');
  const forceDryRun = url.searchParams.get('dry_run');
  const dryRun =
    forceDryRun !== null
      ? forceDryRun === 'true'
      : process.env.CRON_DRY_RUN === 'true';

  if (forceSlug) {
    const result = await sendOrSkipDraftsForLabel({
      labelName: `Practiq/Trade-Press/${forceSlug}`,
      dryRun,
    });
    await notifySlack({ date, slug: forceSlug, result });
    return NextResponse.json({ ...result, date, slug: forceSlug, forced: true });
  }

  if (!isWeekdayInTz(now, tz)) {
    await notifySlack({ date, slug: null, result: null, reason: 'weekend in ET' });
    return NextResponse.json({ status: 'noop', reason: 'weekend', date, dryRun });
  }

  const slug = PRESS_SCHEDULE[date];
  if (!slug) {
    await notifySlack({ date, slug: null, result: null, reason: 'no press send today' });
    return NextResponse.json({
      status: 'noop',
      reason: 'no press send scheduled',
      date,
      dryRun,
    });
  }

  const result = await sendOrSkipDraftsForLabel({
    labelName: `Practiq/Trade-Press/${slug}`,
    dryRun,
  });
  await notifySlack({ date, slug, result });
  return NextResponse.json({ ...result, date, slug });
}
