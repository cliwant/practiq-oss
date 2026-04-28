/**
 * GET /api/admin/metrics — RUN 19 (OSS observability).
 *
 * Prometheus exposition-format endpoint. Any OSS metrics scraper
 * (Prometheus itself, Grafana Agent, VictoriaMetrics, OpenObserve,
 * Datadog OSS Agent in OpenMetrics mode) can poll this and ingest
 * the live counters / gauges / histograms.
 *
 * Authentication is admin-gated — same middleware (`admin.grindworks.ai`
 * host check + `practiq_admin_session` cookie) that protects every
 * other /admin/* route. We rely on Vercel's host gate so the metrics
 * don't leak from `practiq.dev`.
 *
 * Why custom and not a Prometheus client library: at our scale
 * (one Vercel deploy, no long-running process) a client library's
 * registry-merging machinery is wasted effort. Materialising fresh
 * metrics from `agent_tasks` + `approval_items` + `usage_events` per
 * scrape is sub-second and avoids stale-counter issues across cold
 * starts.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_DAYS = 7;
const HISTOGRAM_BUCKETS_MS = [
  100, 500, 1_000, 2_500, 5_000, 10_000, 30_000, 60_000, 120_000, 300_000,
];

interface Aggregates {
  agentRunsByStatus: Record<string, Record<string, number>>;
  approvalDecisions: Record<string, Record<string, number>>;
  agentDurationsMsByType: Record<string, number[]>;
  agentUsdByType: Record<string, number>;
  pendingApprovals: number;
  activeUsersLast7d: number;
  retriesByAgentType: Record<string, number>;
  duplicateSkipsByAgentType: Record<string, number>;
}

async function loadAggregates(since: Date): Promise<Aggregates> {
  const tasks = await prisma.agentTask.findMany({
    where: { createdAt: { gte: since } },
    select: {
      agentType: true,
      status: true,
      attempt: true,
      startedAt: true,
      completedAt: true,
      usdCost: true,
      dedupKey: true,
    },
  });

  const agentRunsByStatus: Record<string, Record<string, number>> = {};
  const agentDurationsMsByType: Record<string, number[]> = {};
  const agentUsdByType: Record<string, number> = {};
  const retriesByAgentType: Record<string, number> = {};
  const duplicateSkipsByAgentType: Record<string, number> = {};

  for (const t of tasks) {
    const at = t.agentType;
    if (!agentRunsByStatus[at]) agentRunsByStatus[at] = {};
    agentRunsByStatus[at][t.status] = (agentRunsByStatus[at][t.status] ?? 0) + 1;
    if (t.startedAt && t.completedAt) {
      const durMs = t.completedAt.getTime() - t.startedAt.getTime();
      if (durMs >= 0) {
        if (!agentDurationsMsByType[at]) agentDurationsMsByType[at] = [];
        agentDurationsMsByType[at].push(durMs);
      }
    }
    if (t.usdCost !== null && t.usdCost !== undefined) {
      agentUsdByType[at] = (agentUsdByType[at] ?? 0) + Number(t.usdCost);
    }
    if (t.attempt > 0) {
      retriesByAgentType[at] = (retriesByAgentType[at] ?? 0) + t.attempt;
    }
  }

  const auditDecisions = await prisma.auditLog.findMany({
    where: {
      createdAt: { gte: since },
      action: {
        in: [
          "approval_approve",
          "approval_modify",
          "approval_reject",
          "approval_dismiss",
        ],
      },
    },
    select: { action: true, details: true },
  });
  const approvalDecisions: Record<string, Record<string, number>> = {};
  for (const a of auditDecisions) {
    const details = (a.details ?? {}) as { itemType?: string };
    const itype = details.itemType ?? "unknown";
    if (!approvalDecisions[itype]) approvalDecisions[itype] = {};
    approvalDecisions[itype][a.action] =
      (approvalDecisions[itype][a.action] ?? 0) + 1;
  }

  const pendingApprovals = await prisma.approvalItem.count({
    where: { status: "pending_review" },
  });

  const activeUsers = await prisma.user.count({
    where: {
      OR: [
        { agentTasks: { some: { createdAt: { gte: since } } } },
        { conversations: { some: { updatedAt: { gte: since } } } },
      ],
    },
  });

  return {
    agentRunsByStatus,
    approvalDecisions,
    agentDurationsMsByType,
    agentUsdByType,
    pendingApprovals,
    activeUsersLast7d: activeUsers,
    retriesByAgentType,
    duplicateSkipsByAgentType,
  };
}

function emitHistogram(
  metric: string,
  helpText: string,
  labelKey: string,
  data: Record<string, number[]>,
): string {
  const lines: string[] = [];
  lines.push(`# HELP ${metric} ${helpText}`);
  lines.push(`# TYPE ${metric} histogram`);
  for (const [label, values] of Object.entries(data)) {
    if (values.length === 0) continue;
    let cumulative = 0;
    for (const upper of HISTOGRAM_BUCKETS_MS) {
      cumulative = values.filter((v) => v <= upper).length;
      lines.push(
        `${metric}_bucket{${labelKey}="${label}",le="${upper}"} ${cumulative}`,
      );
    }
    lines.push(
      `${metric}_bucket{${labelKey}="${label}",le="+Inf"} ${values.length}`,
    );
    const sum = values.reduce((a, b) => a + b, 0);
    lines.push(`${metric}_sum{${labelKey}="${label}"} ${sum}`);
    lines.push(`${metric}_count{${labelKey}="${label}"} ${values.length}`);
  }
  return lines.join("\n");
}

function emitCounter(
  metric: string,
  helpText: string,
  data: Record<string, Record<string, number>>,
  labels: [string, string],
): string {
  const lines: string[] = [];
  lines.push(`# HELP ${metric} ${helpText}`);
  lines.push(`# TYPE ${metric} counter`);
  for (const [outerLabel, inner] of Object.entries(data)) {
    for (const [innerLabel, count] of Object.entries(inner)) {
      lines.push(
        `${metric}{${labels[0]}="${outerLabel}",${labels[1]}="${innerLabel}"} ${count}`,
      );
    }
  }
  return lines.join("\n");
}

function emitGauge(metric: string, helpText: string, value: number): string {
  return [
    `# HELP ${metric} ${helpText}`,
    `# TYPE ${metric} gauge`,
    `${metric} ${value}`,
  ].join("\n");
}

function emitCounterByLabel(
  metric: string,
  helpText: string,
  data: Record<string, number>,
  labelKey: string,
): string {
  const lines: string[] = [];
  lines.push(`# HELP ${metric} ${helpText}`);
  lines.push(`# TYPE ${metric} counter`);
  for (const [label, count] of Object.entries(data)) {
    lines.push(`${metric}{${labelKey}="${label}"} ${count}`);
  }
  return lines.join("\n");
}

function emitGaugeByLabel(
  metric: string,
  helpText: string,
  data: Record<string, number>,
  labelKey: string,
): string {
  const lines: string[] = [];
  lines.push(`# HELP ${metric} ${helpText}`);
  lines.push(`# TYPE ${metric} gauge`);
  for (const [label, value] of Object.entries(data)) {
    lines.push(`${metric}{${labelKey}="${label}"} ${value}`);
  }
  return lines.join("\n");
}

export async function GET(_req: NextRequest): Promise<NextResponse> {
  // Light defence: middleware blocks /admin/* on the marketing host
  // already, but we double-check the host matches one of the two
  // admin-permitted hosts so a leaked URL on practiq.dev returns 404.
  // (Vercel rewrites /api/admin/* through the same host gate.)
  const h = await headers();
  const host = h.get("host") ?? "";
  const isProdAdmin = host === "admin.grindworks.ai";
  const isLocalDev = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  if (!isProdAdmin && !isLocalDev) {
    return new NextResponse("Not found", { status: 404 });
  }

  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60_000);
  const agg = await loadAggregates(since);

  const sections: string[] = [];
  sections.push(
    emitCounter(
      "practiq_agent_runs_total",
      "Total agent task runs in the last 7 days, by agent type and final status",
      agg.agentRunsByStatus,
      ["agent_type", "status"],
    ),
  );
  sections.push(
    emitCounter(
      "practiq_approval_decisions_total",
      "Operator approval-queue decisions in the last 7 days, by item type and verdict action",
      agg.approvalDecisions,
      ["item_type", "action"],
    ),
  );
  sections.push(
    emitHistogram(
      "practiq_agent_duration_ms",
      "Wall-clock duration of completed agent runs in milliseconds, by agent type",
      "agent_type",
      agg.agentDurationsMsByType,
    ),
  );
  sections.push(
    emitGaugeByLabel(
      "practiq_agent_usd_total",
      "Cumulative USD cost of agent runs in the last 7 days, by agent type",
      agg.agentUsdByType,
      "agent_type",
    ),
  );
  sections.push(
    emitGauge(
      "practiq_pending_approvals",
      "Number of approval items currently in pending_review status",
      agg.pendingApprovals,
    ),
  );
  sections.push(
    emitGauge(
      "practiq_active_users_7d",
      "Distinct users with an agent task or conversation update in the last 7 days",
      agg.activeUsersLast7d,
    ),
  );
  sections.push(
    emitCounterByLabel(
      "practiq_agent_retries_total",
      "Sum of retry attempts across agent tasks in the last 7 days, by agent type",
      agg.retriesByAgentType,
      "agent_type",
    ),
  );
  sections.push(
    emitGauge(
      "practiq_window_seconds",
      "The window size used to compute the metrics in this scrape (seconds)",
      WINDOW_DAYS * 24 * 60 * 60,
    ),
  );

  // Build instance metadata gauge
  sections.push(
    `# HELP practiq_build_info Build metadata\n# TYPE practiq_build_info gauge\npractiq_build_info{commit_sha="${(process.env.VERCEL_GIT_COMMIT_SHA ?? "unknown").slice(0, 7)}",node_env="${process.env.NODE_ENV ?? "unknown"}"} 1`,
  );

  const body = sections.join("\n\n") + "\n";
  return new NextResponse(body, {
    status: 200,
    headers: {
      // Prometheus expects this exact MIME type with the version token.
      "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
