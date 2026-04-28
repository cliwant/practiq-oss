/**
 * /admin/agent-metrics — Stretch RUN (post-RUN-16).
 *
 * Operator-facing tail-latency observability for the agent pipeline.
 * RUN 14 added `usdCost`, `attempt`, `agentVersion`, `dedupKey` to
 * `AgentTask`; RUN 13 added the dispatcher's per-firm spend-ceiling
 * + budget gate. Together they're enough to surface:
 *
 *   - Aggregate stats over the last 14 days (runs, USD, p95
 *     duration, success rate, retry rate).
 *   - Per-agent-type breakdown so the operator can see which agent
 *     dominates spend / latency / failure.
 *   - Top spenders leaderboard (top 10 firms by USD over the window).
 *   - Slowest tasks table (top 10 by durationMs) — useful to chase
 *     individual problem clients.
 *   - Failure / retry distribution.
 *
 * No PostHog wire (lives in Vercel env, not strictly needed for the
 * MVP dashboard) — pure Prisma aggregates rendered server-side. We
 * can add PostHog event emission later for cross-session histograms.
 *
 * Auth: hosted on admin.grindworks.ai under middleware that verifies
 * the practiq_admin_session cookie. Marketing domain (practiq.dev)
 * never serves /admin/*.
 */
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Agent metrics — Practiq Admin",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

const WINDOW_DAYS = 14;

// ─────────────────────────────────────────────────────────────────
// Aggregate types — keep close to what we render
// ─────────────────────────────────────────────────────────────────

interface AggregateStats {
  totalRuns: number;
  succeeded: number;
  failed: number;
  retries: number;
  meanDurationMs: number;
  p50DurationMs: number;
  p95DurationMs: number;
  p99DurationMs: number;
  totalUsd: number;
  meanUsd: number;
}

interface AgentBreakdownRow extends AggregateStats {
  agentType: string;
  versions: string[];
}

interface FirmRow {
  userId: string;
  email: string;
  firmName: string | null;
  totalRuns: number;
  totalUsd: number;
  succeeded: number;
}

interface SlowRow {
  taskId: string;
  agentType: string;
  agentVersion: string | null;
  attempt: number;
  durationMs: number;
  usdCost: number | null;
  status: string;
  clientName: string;
  firmName: string | null;
  completedAt: Date | null;
}

// ─────────────────────────────────────────────────────────────────
// Aggregation queries
// ─────────────────────────────────────────────────────────────────

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(p * sorted.length));
  return sorted[idx];
}

function durationOf(t: { startedAt: Date | null; completedAt: Date | null }): number | null {
  if (!t.startedAt || !t.completedAt) return null;
  return t.completedAt.getTime() - t.startedAt.getTime();
}

async function loadAggregate(since: Date): Promise<AggregateStats> {
  const tasks = await prisma.agentTask.findMany({
    where: { createdAt: { gte: since } },
    select: {
      status: true,
      attempt: true,
      startedAt: true,
      completedAt: true,
      usdCost: true,
    },
  });
  const totalRuns = tasks.length;
  const succeeded = tasks.filter((t) => t.status === "completed").length;
  const failed = tasks.filter((t) => t.status === "failed").length;
  const retries = tasks.reduce((s, t) => s + (t.attempt > 0 ? t.attempt : 0), 0);
  const durations = tasks
    .map(durationOf)
    .filter((d): d is number => d !== null && d >= 0);
  const usds = tasks
    .map((t) => (t.usdCost ? Number(t.usdCost) : 0))
    .filter((u) => u >= 0);
  const meanDurationMs =
    durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;
  const totalUsd = usds.reduce((a, b) => a + b, 0);
  return {
    totalRuns,
    succeeded,
    failed,
    retries,
    meanDurationMs,
    p50DurationMs: percentile(durations, 0.5),
    p95DurationMs: percentile(durations, 0.95),
    p99DurationMs: percentile(durations, 0.99),
    totalUsd,
    meanUsd: usds.length > 0 ? totalUsd / usds.length : 0,
  };
}

async function loadAgentBreakdown(since: Date): Promise<AgentBreakdownRow[]> {
  const tasks = await prisma.agentTask.findMany({
    where: { createdAt: { gte: since } },
    select: {
      agentType: true,
      agentVersion: true,
      status: true,
      attempt: true,
      startedAt: true,
      completedAt: true,
      usdCost: true,
    },
  });
  const byType = new Map<string, typeof tasks>();
  for (const t of tasks) {
    const arr = byType.get(t.agentType) ?? [];
    arr.push(t);
    byType.set(t.agentType, arr);
  }
  const rows: AgentBreakdownRow[] = [];
  for (const [agentType, group] of byType) {
    const durations = group
      .map(durationOf)
      .filter((d): d is number => d !== null && d >= 0);
    const usds = group
      .map((t) => (t.usdCost ? Number(t.usdCost) : 0))
      .filter((u) => u >= 0);
    const totalUsd = usds.reduce((a, b) => a + b, 0);
    const versions = Array.from(
      new Set(group.map((t) => t.agentVersion).filter(Boolean) as string[]),
    ).sort();
    rows.push({
      agentType,
      versions,
      totalRuns: group.length,
      succeeded: group.filter((g) => g.status === "completed").length,
      failed: group.filter((g) => g.status === "failed").length,
      retries: group.reduce((s, g) => s + (g.attempt > 0 ? g.attempt : 0), 0),
      meanDurationMs:
        durations.length > 0
          ? durations.reduce((a, b) => a + b, 0) / durations.length
          : 0,
      p50DurationMs: percentile(durations, 0.5),
      p95DurationMs: percentile(durations, 0.95),
      p99DurationMs: percentile(durations, 0.99),
      totalUsd,
      meanUsd: usds.length > 0 ? totalUsd / usds.length : 0,
    });
  }
  rows.sort((a, b) => b.totalUsd - a.totalUsd);
  return rows;
}

async function loadTopFirms(since: Date, limit = 10): Promise<FirmRow[]> {
  const grouped = await prisma.agentTask.groupBy({
    by: ["userId"],
    where: { createdAt: { gte: since } },
    _sum: { usdCost: true },
    _count: { _all: true },
  });
  const userIds = grouped.map((g) => g.userId);
  if (userIds.length === 0) return [];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true, firmName: true },
  });
  const userById = new Map(users.map((u) => [u.id, u]));
  const succeededByUser = new Map<string, number>();
  const succeeded = await prisma.agentTask.groupBy({
    by: ["userId"],
    where: { createdAt: { gte: since }, status: "completed" },
    _count: { _all: true },
  });
  for (const s of succeeded) succeededByUser.set(s.userId, s._count._all);

  const rows: FirmRow[] = grouped.map((g) => {
    const u = userById.get(g.userId);
    return {
      userId: g.userId,
      email: u?.email ?? "(deleted)",
      firmName: u?.firmName ?? null,
      totalRuns: g._count._all,
      totalUsd: Number(g._sum.usdCost ?? 0),
      succeeded: succeededByUser.get(g.userId) ?? 0,
    };
  });
  rows.sort((a, b) => b.totalUsd - a.totalUsd);
  return rows.slice(0, limit);
}

async function loadSlowestTasks(since: Date, limit = 10): Promise<SlowRow[]> {
  const tasks = await prisma.agentTask.findMany({
    where: {
      createdAt: { gte: since },
      startedAt: { not: null },
      completedAt: { not: null },
    },
    select: {
      id: true,
      agentType: true,
      agentVersion: true,
      attempt: true,
      startedAt: true,
      completedAt: true,
      usdCost: true,
      status: true,
      client: { select: { name: true } },
      user: { select: { firmName: true } },
    },
  });
  const rows: SlowRow[] = tasks
    .map((t) => ({
      taskId: t.id,
      agentType: t.agentType,
      agentVersion: t.agentVersion,
      attempt: t.attempt,
      durationMs: durationOf(t) ?? 0,
      usdCost: t.usdCost ? Number(t.usdCost) : null,
      status: t.status,
      clientName: t.client?.name ?? "(unknown)",
      firmName: t.user?.firmName ?? null,
      completedAt: t.completedAt,
    }))
    .sort((a, b) => b.durationMs - a.durationMs);
  return rows.slice(0, limit);
}

// ─────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────

export default async function AgentMetricsPage() {
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60_000);
  const [aggregate, breakdown, topFirms, slowest] = await Promise.all([
    loadAggregate(since),
    loadAgentBreakdown(since),
    loadTopFirms(since),
    loadSlowestTasks(since),
  ]);

  const successRate =
    aggregate.totalRuns > 0
      ? (aggregate.succeeded / aggregate.totalRuns) * 100
      : 0;
  const retryRate =
    aggregate.totalRuns > 0
      ? (aggregate.retries / aggregate.totalRuns) * 100
      : 0;

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-100">
          Agent metrics
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Last {WINDOW_DAYS} days · pulled live from{" "}
          <code className="text-xs">agent_tasks</code>
        </p>
      </div>

      {/* ── KPI cards ─────────────────────────────────────────── */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <KpiCard label="Total runs" value={aggregate.totalRuns.toLocaleString()} />
        <KpiCard
          label="Success rate"
          value={`${successRate.toFixed(1)}%`}
          tone={successRate >= 95 ? "good" : successRate >= 80 ? "warn" : "bad"}
        />
        <KpiCard
          label="Total spend"
          value={`$${aggregate.totalUsd.toFixed(2)}`}
        />
        <KpiCard
          label="Retry rate"
          value={`${retryRate.toFixed(1)}%`}
          tone={retryRate <= 5 ? "good" : retryRate <= 15 ? "warn" : "bad"}
        />
        <KpiCard
          label="Mean duration"
          value={fmtMs(aggregate.meanDurationMs)}
        />
        <KpiCard label="p50 / p95 / p99" value={`${fmtMs(aggregate.p50DurationMs)} · ${fmtMs(aggregate.p95DurationMs)} · ${fmtMs(aggregate.p99DurationMs)}`} small />
        <KpiCard label="Mean cost / run" value={`$${aggregate.meanUsd.toFixed(4)}`} />
        <KpiCard label="Failures" value={aggregate.failed.toString()} tone={aggregate.failed === 0 ? "good" : aggregate.failed <= 5 ? "warn" : "bad"} />
      </section>

      {/* ── Per-agent breakdown ──────────────────────────────── */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-zinc-100 mb-4">
          Per-agent breakdown
        </h2>
        <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-[#0a0a0a]">
          <table className="w-full text-[12px]">
            <thead className="bg-zinc-900/50 text-[10px] uppercase tracking-widest text-zinc-500">
              <tr>
                <th className="text-left px-4 py-3">Agent</th>
                <th className="text-right px-4 py-3">Runs</th>
                <th className="text-right px-4 py-3">Success</th>
                <th className="text-right px-4 py-3">Retries</th>
                <th className="text-right px-4 py-3">p50</th>
                <th className="text-right px-4 py-3">p95</th>
                <th className="text-right px-4 py-3">p99</th>
                <th className="text-right px-4 py-3">Spend</th>
                <th className="text-left px-4 py-3">Versions</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-zinc-500">
                    No agent runs in the last {WINDOW_DAYS} days.
                  </td>
                </tr>
              )}
              {breakdown.map((row) => {
                const pct =
                  row.totalRuns > 0
                    ? (row.succeeded / row.totalRuns) * 100
                    : 0;
                return (
                  <tr key={row.agentType} className="border-t border-zinc-900">
                    <td className="px-4 py-3 font-mono text-zinc-200">
                      {row.agentType}
                    </td>
                    <td className="text-right px-4 py-3 text-zinc-300">
                      {row.totalRuns}
                    </td>
                    <td
                      className={`text-right px-4 py-3 ${pct >= 95 ? "text-emerald-400" : pct >= 80 ? "text-amber-400" : "text-red-400"}`}
                    >
                      {pct.toFixed(1)}%
                    </td>
                    <td className="text-right px-4 py-3 text-zinc-400">
                      {row.retries}
                    </td>
                    <td className="text-right px-4 py-3 text-zinc-300 font-mono">
                      {fmtMs(row.p50DurationMs)}
                    </td>
                    <td className="text-right px-4 py-3 text-zinc-300 font-mono">
                      {fmtMs(row.p95DurationMs)}
                    </td>
                    <td className="text-right px-4 py-3 text-zinc-300 font-mono">
                      {fmtMs(row.p99DurationMs)}
                    </td>
                    <td className="text-right px-4 py-3 text-zinc-200 font-mono">
                      ${row.totalUsd.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 font-mono">
                      {row.versions.length > 0 ? row.versions.join(", ") : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Top firms by spend ────────────────────────────────── */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-zinc-100 mb-4">
          Top firms by spend (top 10)
        </h2>
        <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-[#0a0a0a]">
          <table className="w-full text-[12px]">
            <thead className="bg-zinc-900/50 text-[10px] uppercase tracking-widest text-zinc-500">
              <tr>
                <th className="text-left px-4 py-3">Firm</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-right px-4 py-3">Runs</th>
                <th className="text-right px-4 py-3">Successful</th>
                <th className="text-right px-4 py-3">Spend</th>
              </tr>
            </thead>
            <tbody>
              {topFirms.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                    No firm data yet.
                  </td>
                </tr>
              )}
              {topFirms.map((firm) => (
                <tr key={firm.userId} className="border-t border-zinc-900">
                  <td className="px-4 py-3 text-zinc-200">
                    {firm.firmName ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{firm.email}</td>
                  <td className="text-right px-4 py-3 text-zinc-300">
                    {firm.totalRuns}
                  </td>
                  <td className="text-right px-4 py-3 text-zinc-400">
                    {firm.succeeded}
                  </td>
                  <td className="text-right px-4 py-3 text-zinc-100 font-mono">
                    ${firm.totalUsd.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Slowest tasks ─────────────────────────────────────── */}
      <section className="mb-10">
        <h2 className="text-xl font-bold text-zinc-100 mb-4">
          Slowest tasks (top 10)
        </h2>
        <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-[#0a0a0a]">
          <table className="w-full text-[12px]">
            <thead className="bg-zinc-900/50 text-[10px] uppercase tracking-widest text-zinc-500">
              <tr>
                <th className="text-left px-4 py-3">Agent</th>
                <th className="text-left px-4 py-3">Client</th>
                <th className="text-left px-4 py-3">Firm</th>
                <th className="text-right px-4 py-3">Duration</th>
                <th className="text-right px-4 py-3">Cost</th>
                <th className="text-right px-4 py-3">Attempt</th>
                <th className="text-left px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {slowest.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                    No completed tasks in the window.
                  </td>
                </tr>
              )}
              {slowest.map((row) => (
                <tr key={row.taskId} className="border-t border-zinc-900">
                  <td className="px-4 py-3 font-mono text-zinc-300">
                    {row.agentType}
                    {row.agentVersion ? (
                      <span className="text-zinc-600">
                        {" "}
                        v{row.agentVersion}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-zinc-200">{row.clientName}</td>
                  <td className="px-4 py-3 text-zinc-400">
                    {row.firmName ?? "—"}
                  </td>
                  <td className="text-right px-4 py-3 text-zinc-100 font-mono">
                    {fmtMs(row.durationMs)}
                  </td>
                  <td className="text-right px-4 py-3 text-zinc-300 font-mono">
                    {row.usdCost !== null
                      ? `$${row.usdCost.toFixed(4)}`
                      : "—"}
                  </td>
                  <td className="text-right px-4 py-3 text-zinc-400">
                    {row.attempt}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Footer note ───────────────────────────────────────── */}
      <p className="text-[11px] text-zinc-600">
        Window: trailing {WINDOW_DAYS} days. Mean / p50 / p95 / p99 include
        only tasks with both startedAt and completedAt populated. Cost
        comes from <code>agent_tasks.usd_cost</code> (RUN 14) computed
        from provider-reported <code>input_tokens</code> +{" "}
        <code>output_tokens</code> against the spend-ceiling PRICING table.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// UI bits
// ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  tone = "neutral",
  small = false,
}: {
  label: string;
  value: string;
  tone?: "good" | "warn" | "bad" | "neutral";
  small?: boolean;
}) {
  const toneClass =
    tone === "good"
      ? "text-emerald-400"
      : tone === "warn"
        ? "text-amber-300"
        : tone === "bad"
          ? "text-red-400"
          : "text-zinc-100";
  return (
    <div className="rounded-xl border border-zinc-800 bg-[#0a0a0a] px-4 py-3">
      <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
        {label}
      </div>
      <div
        className={`mt-1 ${small ? "text-base" : "text-2xl"} font-extrabold tracking-tight ${toneClass}`}
      >
        {value}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    completed: {
      label: "Completed",
      cls: "bg-emerald-500/10 text-emerald-400",
    },
    failed: { label: "Failed", cls: "bg-red-500/10 text-red-400" },
    running: { label: "Running", cls: "bg-blue-500/10 text-blue-400" },
    pending: { label: "Pending", cls: "bg-zinc-700/30 text-zinc-400" },
    skipped: { label: "Skipped", cls: "bg-zinc-800/40 text-zinc-500" },
  };
  const meta = map[status] ?? { label: status, cls: "bg-zinc-800/40 text-zinc-400" };
  return (
    <span
      className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${meta.cls}`}
    >
      {meta.label}
    </span>
  );
}

function fmtMs(ms: number): string {
  if (!ms || ms < 0) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}
