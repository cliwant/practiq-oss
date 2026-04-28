/**
 * Digest Compactor — Wave-4 RUN 7 (P1-03).
 *
 * Nightly cron writes one rolling 30-day digest per active client
 * into `ClientContext` with `category: "digest"`. The T1 tier
 * reader picks up the freshest row at every prompt build, so this
 * job is what makes the "where did we leave off" memory tier
 * actually work.
 *
 * **Active client** = any Client owned by a user where there's at
 * least one ConversationMessage, AgentTask, or ApprovalItem in
 * the last 30 days. Dormant clients don't get a digest until they
 * see activity again — saves Haiku spend.
 *
 * **Source data** assembled per client:
 *   - last 30 days of `ConversationMessage` rows (role + truncated
 *     content)
 *   - last 30 days of `AgentTask.summary` rows
 *   - last 30 days of `AuditLog` `approval_*` decisions with their
 *     reviewer notes
 *
 * **Output**: one 400-word plain-English digest written by Haiku
 * 4 (cheap, fast). Stored as a NEW ClientContext row; previous
 * digest rows for that client are flipped to
 * `category: "digest_archive"` so the T1 reader only ever sees
 * the freshest one but auditors can replay the timeline.
 *
 * **Cost ceiling**: ~3K input + 600 output × 200 active clients
 * × Haiku price = ~$0.30 per nightly run. The cron route gates on
 * `CRON_SECRET` and on `process.env.DIGEST_COMPACTOR_DISABLED ===
 * "1"` for emergency kill.
 *
 * **Idempotency**: if the same client gets compacted twice in 24
 * hours, the second run still runs (we don't gate by date). This
 * is intentional — if an operator manually triggered a re-run via
 * the dev-test endpoint, we want it to actually take effect.
 */

import { prisma } from "@/lib/prisma";
import { getClaudeProvider } from "@/lib/claude/provider";
import { safeNotify } from "@/lib/notifications/slack";

const ACTIVITY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

const SYSTEM_PROMPT = `You are the rolling-digest compactor inside Practiq, an AI-Native workspace for accountants and fractional professionals managing many clients at once.

Your job: write ONE rolling digest covering the last 30 days of activity on a single client. The digest goes into a memory tier that every future agent run + chat turn will see, so it must be:

1. Plain past-tense English sentences. No markdown headings, no bullet lists, no emoji.
2. ≤ 400 words total. Aim for 250-350 — leave room for the final agent prompt.
3. Focus on persistent state: ongoing concerns, settled decisions, recurring patterns, scheduled work, open questions.
4. Skip ephemeral details: timestamps, message IDs, individual numeric variances unless they're material (>10% YoY or > $5K).
5. If something contradicts an earlier belief, mention the resolution explicitly ("supplier was X until Q3, now Y").
6. Never invent data. If the input is thin, write a shorter digest.
7. Never quote the operator or client verbatim — paraphrase.

Output: just the digest text, no preamble, no labels, no JSON.`;

export interface CompactionResult {
  clientId: string;
  status: "ok" | "skipped" | "error";
  digestId?: string;
  digestLength?: number;
  inputTokens?: number;
  outputTokens?: number;
  error?: string;
}

/**
 * Compact a single client's activity into a fresh digest. Returns
 * the new ClientContext id on success. Idempotent — running twice
 * just produces a newer digest.
 */
export async function compactClientDigest(
  clientId: string,
): Promise<CompactionResult> {
  try {
    const since = new Date(Date.now() - ACTIVITY_WINDOW_MS);
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, userId: true, name: true, industry: true },
    });
    if (!client) {
      return { clientId, status: "error", error: "client not found" };
    }

    const [messages, tasks, decisions] = await Promise.all([
      prisma.conversationMessage.findMany({
        where: {
          conversation: { clientId, userId: client.userId },
          createdAt: { gte: since },
        },
        orderBy: { createdAt: "asc" },
        take: 200,
        select: { role: true, content: true, createdAt: true },
      }),
      prisma.agentTask.findMany({
        where: {
          clientId,
          completedAt: { gte: since, not: null },
          agentType: { not: "digest" },
        },
        orderBy: { completedAt: "asc" },
        take: 60,
        select: { agentType: true, summary: true, completedAt: true },
      }),
      prisma.auditLog.findMany({
        where: {
          clientId,
          action: {
            in: [
              "approval_approve",
              "approval_modify",
              "approval_reject",
              "approval_dismiss",
            ],
          },
          createdAt: { gte: since },
        },
        orderBy: { createdAt: "asc" },
        take: 100,
        select: { action: true, details: true, createdAt: true },
      }),
    ]);

    if (messages.length === 0 && tasks.length === 0 && decisions.length === 0) {
      return { clientId, status: "skipped", error: "no activity in window" };
    }

    const userPrompt = renderCompactorInput({
      clientName: client.name,
      industry: client.industry,
      since,
      messages,
      tasks,
      decisions,
    });

    const response = await getClaudeProvider().complete({
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
      maxTokens: 800,
      // Explicitly Haiku for cost. Provider config can override
      // via env if a deployment wants Sonnet for higher fidelity.
      model: process.env.DIGEST_COMPACTOR_MODEL ?? "claude-haiku-4",
    });

    const digestText = response.text.trim();
    if (digestText.length < 40) {
      return {
        clientId,
        status: "error",
        error: `digest too short (${digestText.length} chars)`,
      };
    }

    // Archive previous digests, then write the new one. Done in a
    // transaction so the T1 reader never sees zero rows.
    const newRow = await prisma.$transaction(async (tx) => {
      await tx.clientContext.updateMany({
        where: { clientId, category: "digest" },
        data: { category: "digest_archive" },
      });
      return tx.clientContext.create({
        data: {
          clientId,
          category: "digest",
          title: `Rolling 30-day digest — ${new Date().toISOString().slice(0, 10)}`,
          content: digestText,
          isPinned: false,
          tags: ["digest", "rolling", "30d"],
          // System-authored context owned by the client's owner so
          // the per-user filter elsewhere (firm-context, search) keeps
          // working without special-casing digest rows.
          createdBy: client.userId,
        },
        select: { id: true },
      });
    });

    return {
      clientId,
      status: "ok",
      digestId: newRow.id,
      digestLength: digestText.length,
      inputTokens: response.inputTokens ?? undefined,
      outputTokens: response.outputTokens ?? undefined,
    };
  } catch (err) {
    return {
      clientId,
      status: "error",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Compact every active client. Bounded concurrency so Anthropic
 * rate limits don't bite when a firm has 200+ active clients.
 */
export async function compactAllActiveClients(opts?: {
  concurrency?: number;
  /** Override of "active" definition for tests. */
  sinceMs?: number;
}): Promise<CompactionResult[]> {
  if (process.env.DIGEST_COMPACTOR_DISABLED === "1") {
    return [];
  }
  const since = new Date(Date.now() - (opts?.sinceMs ?? ACTIVITY_WINDOW_MS));

  // Active = client with any ConversationMessage / AgentTask /
  // ApprovalItem in the window. Use raw DB queries that DO NOT
  // load full rows — we just need ids.
  const [msgClients, taskClients, approvalClients] = await Promise.all([
    prisma.conversation.findMany({
      where: { messages: { some: { createdAt: { gte: since } } } },
      select: { clientId: true },
      distinct: ["clientId"],
    }),
    prisma.agentTask.findMany({
      where: {
        completedAt: { gte: since, not: null },
        agentType: { not: "digest" },
      },
      select: { clientId: true },
      distinct: ["clientId"],
    }),
    prisma.approvalItem.findMany({
      where: { createdAt: { gte: since } },
      select: { clientId: true },
      distinct: ["clientId"],
    }),
  ]);

  const ids = new Set<string>();
  for (const r of msgClients) ids.add(r.clientId);
  for (const r of taskClients) ids.add(r.clientId);
  for (const r of approvalClients) ids.add(r.clientId);
  const clientIds = [...ids];

  if (clientIds.length === 0) return [];

  const concurrency = Math.min(opts?.concurrency ?? 3, clientIds.length);
  const results: CompactionResult[] = [];
  let cursor = 0;
  const worker = async () => {
    while (true) {
      const i = cursor++;
      if (i >= clientIds.length) return;
      results[i] = await compactClientDigest(clientIds[i]);
    }
  };
  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  // Slack heartbeat for visibility — total count + how many failed.
  const errors = results.filter((r) => r.status === "error").length;
  if (errors > 0) {
    safeNotify("error", {
      where: "digest-compactor",
      message: `${errors}/${results.length} client digests failed`,
    });
  }
  return results;
}

function renderCompactorInput(input: {
  clientName: string;
  industry: string;
  since: Date;
  messages: Array<{ role: string; content: string; createdAt: Date }>;
  tasks: Array<{ agentType: string; summary: string | null; completedAt: Date | null }>;
  decisions: Array<{ action: string; details: unknown; createdAt: Date }>;
}): string {
  const sinceLabel = input.since.toISOString().slice(0, 10);
  const lines: string[] = [
    `<client name="${input.clientName}" industry="${input.industry}" since="${sinceLabel}"/>`,
    "",
    `<messages count="${input.messages.length}">`,
  ];
  for (const m of input.messages) {
    const truncated =
      m.content.length > 200 ? m.content.slice(0, 197) + "…" : m.content;
    lines.push(
      `${m.createdAt.toISOString().slice(0, 10)} ${m.role}: ${truncated}`,
    );
  }
  lines.push("</messages>", "", `<agent_runs count="${input.tasks.length}">`);
  for (const t of input.tasks) {
    if (!t.completedAt) continue;
    lines.push(
      `${t.completedAt.toISOString().slice(0, 10)} ${t.agentType}: ${t.summary ?? "(no summary)"}`,
    );
  }
  lines.push("</agent_runs>", "", `<approval_decisions count="${input.decisions.length}">`);
  for (const d of input.decisions) {
    const details = (d.details ?? {}) as { itemTitle?: string; reviewerNotes?: string | null };
    const note = details.reviewerNotes ? ` — note: ${details.reviewerNotes.slice(0, 120)}` : "";
    lines.push(
      `${d.createdAt.toISOString().slice(0, 10)} ${d.action} ${details.itemTitle ?? "(unknown)"}${note}`,
    );
  }
  lines.push("</approval_decisions>");
  return lines.join("\n");
}
