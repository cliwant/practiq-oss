/**
 * business-days.ts — weekday-only date math used by the follow-up cron
 * to decide when Touch 2 / Touch 3 are due.
 *
 * Holidays observed: only US federal holidays falling within the active
 * Practiq cold-outreach campaign window (currently just Memorial Day
 * 2026-05-25). Add new ISO dates here if the window extends past 2026.
 */

const HOLIDAYS_ISO = new Set(["2026-05-25"]);

function dateOnlyIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Number of weekdays elapsed from `since` (exclusive) to `now` (inclusive). */
export function businessDaysBetween(since: Date, now: Date): number {
  if (since >= now) return 0;
  let count = 0;
  const cursor = new Date(
    Date.UTC(since.getUTCFullYear(), since.getUTCMonth(), since.getUTCDate())
  );
  cursor.setUTCDate(cursor.getUTCDate() + 1);
  const limit = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  while (cursor <= limit) {
    const dow = cursor.getUTCDay();
    const iso = dateOnlyIso(cursor);
    if (dow !== 0 && dow !== 6 && !HOLIDAYS_ISO.has(iso)) {
      count += 1;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}
