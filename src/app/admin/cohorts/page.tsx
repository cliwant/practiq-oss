/**
 * /admin/cohorts — weekly signup cohorts with retention (Tier 5).
 *
 * Groups signup_completed events by ISO week. For each cohort:
 *   - cohort size
 *   - 7d / 14d / 30d return rate (% of users who fired ANY event in
 *     the window after signup)
 *   - events-per-user distribution (mean, median)
 */
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Cohorts — Practiq Admin",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
  },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isoWeekKey(d: Date): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      ((date.getTime() - firstThursday.getTime()) / 86400000 -
        3 +
        ((firstThursday.getUTCDay() + 6) % 7)) /
        7,
    );
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

interface CohortRow {
  weekKey: string;
  size: number;
  returnedIn7: number;
  returnedIn14: number;
  returnedIn30: number;
  eventsMean: number;
  eventsMedian: number;
}

export default async function CohortsPage() {
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const signups = await prisma.analyticsEvent.findMany({
    where: { type: "signup_completed", createdAt: { gte: since } },
    select: { userId: true, distinctId: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  // Group signups into cohorts.
  const cohortMap = new Map<
    string,
    { ids: string[]; signupAt: Map<string, Date> }
  >();
  for (const s of signups) {
    const id = s.userId ?? s.distinctId ?? "";
    if (!id) continue;
    const k = isoWeekKey(s.createdAt);
    if (!cohortMap.has(k)) cohortMap.set(k, { ids: [], signupAt: new Map() });
    const c = cohortMap.get(k)!;
    if (!c.signupAt.has(id)) {
      c.ids.push(id);
      c.signupAt.set(id, s.createdAt);
    }
  }

  // For each cohort, count return rates by querying any event after signup.
  const rows: CohortRow[] = [];
  for (const [weekKey, c] of cohortMap.entries()) {
    if (c.ids.length === 0) continue;
    const returns = await prisma.analyticsEvent.findMany({
      where: {
        OR: [{ userId: { in: c.ids } }, { distinctId: { in: c.ids } }],
      },
      select: { userId: true, distinctId: true, createdAt: true },
    });
    const eventsByUser = new Map<string, number>();
    const returnedIn = { 7: new Set<string>(), 14: new Set<string>(), 30: new Set<string>() };
    for (const r of returns) {
      const id = r.userId ?? r.distinctId ?? "";
      if (!id || !c.signupAt.has(id)) continue;
      eventsByUser.set(id, (eventsByUser.get(id) ?? 0) + 1);
      const days = (+r.createdAt - +c.signupAt.get(id)!) / 86400000;
      if (days > 0) {
        if (days <= 7) returnedIn[7].add(id);
        if (days <= 14) returnedIn[14].add(id);
        if (days <= 30) returnedIn[30].add(id);
      }
    }
    const counts = c.ids.map((id) => eventsByUser.get(id) ?? 0).sort((a, b) => a - b);
    const mean =
      counts.reduce((a, b) => a + b, 0) / Math.max(1, counts.length);
    const median = counts[Math.floor(counts.length / 2)] ?? 0;
    rows.push({
      weekKey,
      size: c.ids.length,
      returnedIn7: returnedIn[7].size,
      returnedIn14: returnedIn[14].size,
      returnedIn30: returnedIn[30].size,
      eventsMean: Math.round(mean * 10) / 10,
      eventsMedian: median,
    });
  }
  rows.sort((a, b) => (a.weekKey < b.weekKey ? 1 : -1));

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-zinc-100 tracking-[-0.03em]">
          Signup cohorts
        </h1>
        <p className="text-sm text-zinc-400 mt-2">
          Weekly cohorts over the past 90 days, with 7/14/30-day return
          rates and per-user event volume.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="text-sm text-zinc-500 italic">
          No signup_completed events in the last 90 days.
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 bg-[#0a0a0a] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/60 text-[10px] uppercase tracking-widest text-zinc-500">
              <tr>
                <Th>Cohort week</Th>
                <Th>Size</Th>
                <Th>7d return</Th>
                <Th>14d return</Th>
                <Th>30d return</Th>
                <Th>Events / user (mean)</Th>
                <Th>Events / user (median)</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.weekKey} className="border-t border-zinc-800/60">
                  <Td>
                    <span className="font-mono text-zinc-300">{r.weekKey}</span>
                  </Td>
                  <Td>{r.size}</Td>
                  <Td>{pct(r.returnedIn7, r.size)}</Td>
                  <Td>{pct(r.returnedIn14, r.size)}</Td>
                  <Td>{pct(r.returnedIn30, r.size)}</Td>
                  <Td>{r.eventsMean.toFixed(1)}</Td>
                  <Td>{r.eventsMedian}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-12 text-xs text-zinc-500">
        <Link href="/admin/journeys" className="hover:text-zinc-300">
          ← Journeys
        </Link>{" "}
        ·{" "}
        <Link href="/admin/funnels" className="hover:text-zinc-300">
          ← Funnels
        </Link>
      </div>
    </div>
  );
}

function pct(n: number, d: number): string {
  if (d <= 0) return "—";
  return `${Math.round((n / d) * 100)}% (${n})`;
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left px-4 py-3 font-bold">{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 text-zinc-200">{children}</td>;
}
