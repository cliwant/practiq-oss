/**
 * /admin/spend-calibration — Wave-4 P0-02 + P0-03 ops surface.
 *
 * Two stacked tables:
 *   1. Top spenders (last 30d) — % of plan ceiling consumed, alerts at
 *      80%+ in amber and 100%+ in red. Lets the operator see who's
 *      about to hit the wall.
 *   2. Calibration error by approval-item type — mean |verdict −
 *      confidence| over the last 30d, computed live from AuditLog.
 *      Tells the operator which agent types systemically over- or
 *      under-claim confidence.
 *
 * Server-side render only. Lives behind the same admin host as
 * /admin/analytics.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getTopSpendersThisPeriod } from "@/lib/spend-ceiling";

export const metadata: Metadata = {
  title: "Spend & Calibration — Practiq Admin",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface CalibrationRow {
  itemType: string;
  count: number;
  meanError: number;
  meanConfidence: number;
}

async function getCalibrationByType(): Promise<CalibrationRow[]> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const rows = await prisma.auditLog.findMany({
    where: {
      action: { in: ["approval_approve", "approval_modify", "approval_reject"] },
      createdAt: { gte: since },
    },
    select: { details: true, action: true },
    take: 5000,
  });

  const buckets = new Map<
    string,
    { errSum: number; confSum: number; n: number }
  >();
  for (const r of rows) {
    const d = r.details as {
      itemType?: string;
      calibrationError?: number;
      originalAiConfidence?: number;
    } | null;
    if (!d || typeof d.itemType !== "string") continue;
    if (d.calibrationError == null || d.originalAiConfidence == null) continue;
    const b = buckets.get(d.itemType) ?? { errSum: 0, confSum: 0, n: 0 };
    b.errSum += d.calibrationError;
    b.confSum += d.originalAiConfidence;
    b.n += 1;
    buckets.set(d.itemType, b);
  }

  return Array.from(buckets.entries())
    .map(([itemType, b]) => ({
      itemType,
      count: b.n,
      meanError: b.n > 0 ? b.errSum / b.n : 0,
      meanConfidence: b.n > 0 ? b.confSum / b.n : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

export default async function SpendCalibrationPage() {
  const [topSpenders, calibration] = await Promise.all([
    getTopSpendersThisPeriod(25),
    getCalibrationByType(),
  ]);

  return (
    <div className="space-y-12 p-6 lg:p-10">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-100">
            Spend & Calibration
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Per-firm Claude spend ceiling (P0-02) + confidence calibration
            tracking (P0-03), trailing 30 days.
          </p>
        </div>
        <Link
          href="/admin/analytics"
          className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          ← Analytics
        </Link>
      </header>

      <section>
        <h2 className="text-xl font-bold text-zinc-100 mb-4">
          Top spenders this period
        </h2>
        <div className="rounded-xl border border-zinc-800 bg-[#0a0a0a] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800/60 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                <th className="px-3 py-2 text-left">User</th>
                <th className="px-3 py-2 text-left">Plan</th>
                <th className="px-3 py-2 text-right">Spent</th>
                <th className="px-3 py-2 text-right">Ceiling</th>
                <th className="px-3 py-2 text-left">Used</th>
                <th className="px-3 py-2 text-right">Tokens (in/out)</th>
              </tr>
            </thead>
            <tbody>
              {topSpenders.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-8 text-center text-zinc-500"
                  >
                    No usage events recorded in the last 30 days.
                  </td>
                </tr>
              )}
              {topSpenders.map((s) => {
                const pct = Math.round(s.fractionUsed * 100);
                const colorBar =
                  pct >= 100
                    ? "bg-red-500"
                    : pct >= 80
                      ? "bg-amber-500"
                      : "bg-emerald-500";
                return (
                  <tr
                    key={s.userId}
                    className="border-t border-zinc-800/60 font-mono"
                  >
                    <td className="px-3 py-2 text-zinc-300">
                      u:{s.userId.slice(0, 8)}
                    </td>
                    <td className="px-3 py-2 text-zinc-200">{s.planKey}</td>
                    <td className="px-3 py-2 text-right text-zinc-100">
                      ${s.spentUsd.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-right text-zinc-400">
                      ${s.ceilingUsd.toFixed(2)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                          <div
                            className={`h-full ${colorBar}`}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                        <span
                          className={`text-xs ${pct >= 100 ? "text-red-400" : pct >= 80 ? "text-amber-400" : "text-zinc-400"}`}
                        >
                          {pct}%
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right text-zinc-500">
                      {(s.inputTokens / 1000).toFixed(0)}K /{" "}
                      {(s.outputTokens / 1000).toFixed(0)}K
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold text-zinc-100 mb-4">
          Calibration error by approval type
        </h2>
        <p className="text-xs text-zinc-500 mb-3">
          Mean |verdict − stated confidence|. Lower is better. Verdict
          weights: approve=1, modify=0.5, reject=0.
        </p>
        <div className="rounded-xl border border-zinc-800 bg-[#0a0a0a] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800/60 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                <th className="px-3 py-2 text-left">Item type</th>
                <th className="px-3 py-2 text-right">Decisions</th>
                <th className="px-3 py-2 text-right">Mean confidence</th>
                <th className="px-3 py-2 text-right">Mean |error|</th>
                <th className="px-3 py-2 text-left">Calibration</th>
              </tr>
            </thead>
            <tbody>
              {calibration.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-8 text-center text-zinc-500"
                  >
                    No approval decisions logged in the last 30 days.
                  </td>
                </tr>
              )}
              {calibration.map((row) => {
                const tier =
                  row.meanError <= 0.15
                    ? { label: "Well-calibrated", color: "text-emerald-400" }
                    : row.meanError <= 0.3
                      ? { label: "Some drift", color: "text-amber-400" }
                      : { label: "Over- or under-claiming", color: "text-red-400" };
                return (
                  <tr
                    key={row.itemType}
                    className="border-t border-zinc-800/60 font-mono"
                  >
                    <td className="px-3 py-2 text-zinc-200">{row.itemType}</td>
                    <td className="px-3 py-2 text-right text-zinc-300">
                      {row.count}
                    </td>
                    <td className="px-3 py-2 text-right text-zinc-300">
                      {(row.meanConfidence * 100).toFixed(0)}%
                    </td>
                    <td className="px-3 py-2 text-right text-zinc-100">
                      {(row.meanError * 100).toFixed(1)}%
                    </td>
                    <td className={`px-3 py-2 ${tier.color}`}>{tier.label}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
