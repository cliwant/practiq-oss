/**
 * T3 — Episodic Timeline (recent agent runs + approval decisions).
 *
 * Zep's "Episode subgraph" plays this role: raw chronological data
 * that grounds every other tier. For Practiq the natural source is
 * our own `AgentTask` rows (what the agents did) and `AuditLog`
 * rows for `approval_*` actions (what the operator decided).
 *
 * **Why we need it**: without an episodic stream the model
 * routinely re-proposes work that was already done. "Send a
 * reminder to Park CPA" — but we sent one Tuesday. "Reconcile Feb
 * bank" — but Emily just approved that yesterday. T3 surfaces the
 * last few "what happened on this client" lines so the model has
 * the "we already did that" guard rail for free.
 *
 * **Cap**: 300 tokens by default. Each episode line is ~30-50 chars
 * after truncation, so we comfortably fit 6-8 events even at the
 * tight cap.
 *
 * Filters out `digest` agent type (the compactor's own bookkeeping
 * runs would otherwise dominate the timeline once the cron is hot).
 */

import { prisma } from "@/lib/prisma";
import { approxTokenCount, truncateToTokenCap } from "../token-counter";
import type { TierBlock } from "./profile";

const VERDICT_LABEL: Record<string, string> = {
  approval_approve: "approved",
  approval_modify: "modified + approved",
  approval_reject: "rejected",
  approval_dismiss: "dismissed",
};

export async function loadT3Episodic(opts: {
  clientId: string;
  cap: number;
  taskLimit?: number;
  decisionLimit?: number;
}): Promise<TierBlock> {
  const taskLimit = opts.taskLimit ?? 5;
  const decisionLimit = opts.decisionLimit ?? 3;

  const [tasks, decisions] = await Promise.all([
    prisma.agentTask.findMany({
      where: {
        clientId: opts.clientId,
        agentType: { not: "digest" },
        completedAt: { not: null },
      },
      orderBy: { completedAt: "desc" },
      take: taskLimit,
      select: {
        agentType: true,
        summary: true,
        completedAt: true,
      },
    }),
    prisma.auditLog.findMany({
      where: {
        clientId: opts.clientId,
        action: {
          in: [
            "approval_approve",
            "approval_modify",
            "approval_reject",
            "approval_dismiss",
          ],
        },
      },
      orderBy: { createdAt: "desc" },
      take: decisionLimit,
      select: {
        action: true,
        details: true,
        createdAt: true,
      },
    }),
  ]);

  type TimelineEntry = {
    at: Date;
    line: string;
  };
  const entries: TimelineEntry[] = [];

  for (const t of tasks) {
    if (!t.completedAt) continue;
    const summary =
      t.summary && t.summary.length > 80 ? t.summary.slice(0, 77).trim() + "…" : t.summary || "(no summary)";
    entries.push({
      at: t.completedAt,
      line: `${t.completedAt.toISOString().slice(0, 10)} · ${t.agentType} · ${summary}`,
    });
  }
  for (const d of decisions) {
    const verdict = VERDICT_LABEL[d.action] ?? d.action;
    const details = (d.details ?? {}) as {
      itemType?: string;
      itemTitle?: string;
    };
    const itemTitle = details.itemTitle
      ? details.itemTitle.length > 60
        ? details.itemTitle.slice(0, 57).trim() + "…"
        : details.itemTitle
      : details.itemType ?? "approval item";
    entries.push({
      at: d.createdAt,
      line: `${d.createdAt.toISOString().slice(0, 10)} · operator ${verdict} · ${itemTitle}`,
    });
  }

  if (entries.length === 0) {
    return {
      tier: "T3",
      body: "",
      tokensApprox: 0,
      summary: "no episodic events yet",
      hadData: false,
    };
  }

  // Newest first.
  entries.sort((a, b) => b.at.getTime() - a.at.getTime());
  const lines = entries.map((e) => `- ${e.line}`).join("\n");
  const raw = `## T3 Episodic timeline (newest first)\n\n${lines}\n`;
  const body = truncateToTokenCap(raw, opts.cap);
  return {
    tier: "T3",
    body,
    tokensApprox: approxTokenCount(body),
    summary: `${tasks.length} tasks + ${decisions.length} decisions`,
    hadData: true,
  };
}
