/**
 * Background agent execution engine.
 *
 * Agents run on a schedule (node-cron) or on demand. Each agent takes the
 * full context of one client, asks Claude to produce a structured result,
 * persists it as an AgentTask + ApprovalItem(s), and logs to AuditLog.
 *
 * The runner itself knows nothing about specific agent types — individual
 * agents register themselves by exporting a definition that matches the
 * AgentDefinition interface. See `./daily-briefing.ts` for an example.
 */
import { prisma } from "@/lib/prisma";
import { getClaudeProvider } from "@/lib/claude/provider";

export interface AgentDefinition<Input = unknown, Output = unknown> {
  /** Unique agent type name, persisted on AgentTask.agentType. */
  type: string;
  /** Human-readable label for logs. */
  label: string;
  /** Build the user prompt and token budget from the client's state. */
  buildPrompt: (ctx: AgentBuildContext) => Promise<{
    systemPrompt: string;
    userPrompt: string;
    maxTokens: number;
  }>;
  /** Parse Claude's response into a structured Output. */
  parseOutput: (raw: string) => Output;
  /**
   * Decide whether the parsed output warrants one or more ApprovalItems.
   * Return an empty array if nothing actionable came out of this run.
   */
  buildApprovalItems: (
    output: Output,
    ctx: AgentBuildContext,
  ) => Array<{
    type: string;
    title: string;
    priority: number;
    aiConfidence?: number;
    content: unknown;
    aiNotes?: string;
    deadline?: Date;
  }>;
  /** Optional short summary for the AgentTask row (shown in activity feed). */
  summarize?: (output: Output) => string | undefined;
}

export interface AgentBuildContext {
  client: {
    id: string;
    userId: string;
    name: string;
    industry: string;
    userRole: string;
    relationshipMonths: number;
    preferences: Record<string, unknown>;
  };
  contexts: Array<{
    title: string;
    content: string;
    category: string;
    isPinned: boolean;
    tags: string[];
    updatedAt: Date;
  }>;
  recentTasks: Array<{
    agentType: string;
    summary: string | null;
    completedAt: Date | null;
  }>;
}

export interface AgentRunResult {
  taskId: string;
  status: "completed" | "failed" | "skipped";
  summary?: string;
  approvalItemIds: string[];
  durationMs: number;
  error?: string;
}

/**
 * Execute an agent against a single client. Creates an AgentTask row at
 * "running" state, calls Claude, updates the row with the result, and
 * persists any ApprovalItems. All writes go through Prisma transactions
 * so a partial failure doesn't leave orphans.
 */
export async function runAgent<O>(
  agent: AgentDefinition<unknown, O>,
  clientId: string,
): Promise<AgentRunResult> {
  const started = Date.now();

  const client = await prisma.client.findUnique({
    where: { id: clientId },
  });
  if (!client) throw new Error(`Client ${clientId} not found`);

  // Gather the client's working memory.
  const contexts = await prisma.clientContext.findMany({
    where: { clientId },
    orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
    take: 50,
  });
  const recentTasks = await prisma.agentTask.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { agentType: true, summary: true, completedAt: true },
  });

  const buildCtx: AgentBuildContext = {
    client: {
      id: client.id,
      userId: client.userId,
      name: client.name,
      industry: client.industry,
      userRole: client.userRole,
      relationshipMonths: client.relationshipMonths,
      preferences: (client.preferences ?? {}) as Record<string, unknown>,
    },
    contexts: contexts.map((c) => ({
      title: c.title,
      content: c.content,
      category: c.category,
      isPinned: c.isPinned,
      tags: c.tags,
      updatedAt: c.updatedAt,
    })),
    recentTasks,
  };

  // Mark the task running so concurrent scheduler ticks don't re-fire it.
  const task = await prisma.agentTask.create({
    data: {
      clientId: client.id,
      userId: client.userId,
      agentType: agent.type,
      status: "running",
      startedAt: new Date(),
      input: {
        contextCount: contexts.length,
        pinnedCount: contexts.filter((c) => c.isPinned).length,
      },
    },
  });

  try {
    const { systemPrompt, userPrompt, maxTokens } = await agent.buildPrompt(
      buildCtx,
    );

    const response = await getClaudeProvider().complete({
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      maxTokens,
    });
    const text = response.text;

    let parsedOutput: O;
    try {
      parsedOutput = agent.parseOutput(text);
    } catch (parseErr) {
      throw new Error(
        `Agent ${agent.type} output parse failed: ${
          parseErr instanceof Error ? parseErr.message : String(parseErr)
        }\nRaw: ${text.slice(0, 400)}`,
      );
    }

    const approvalDrafts = agent.buildApprovalItems(parsedOutput, buildCtx);
    const summary = agent.summarize?.(parsedOutput);

    // Persist the task result + any approval items + audit trail in one tx.
    const approvalItemIds = await prisma.$transaction(async (tx) => {
      await tx.agentTask.update({
        where: { id: task.id },
        data: {
          status: "completed",
          completedAt: new Date(),
          output: (parsedOutput as object) ?? {},
          summary,
        },
      });

      const createdIds: string[] = [];
      for (const draft of approvalDrafts) {
        const row = await tx.approvalItem.create({
          data: {
            clientId: client.id,
            userId: client.userId,
            agentTaskId: task.id,
            type: draft.type,
            title: draft.title,
            priority: draft.priority,
            aiConfidence: draft.aiConfidence,
            content: (draft.content as object) ?? {},
            aiNotes: draft.aiNotes,
            deadline: draft.deadline,
          },
        });
        createdIds.push(row.id);
      }

      await tx.auditLog.create({
        data: {
          clientId: client.id,
          userId: client.userId,
          agentType: agent.type,
          action: "agent_completed",
          details: {
            taskId: task.id,
            approvalItemCount: createdIds.length,
            summary: summary ?? null,
          },
        },
      });

      return createdIds;
    });

    return {
      taskId: task.id,
      status: "completed",
      summary,
      approvalItemIds,
      durationMs: Date.now() - started,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.agentTask.update({
      where: { id: task.id },
      data: {
        status: "failed",
        completedAt: new Date(),
        errorMessage: message,
      },
    });
    await prisma.auditLog.create({
      data: {
        clientId: client.id,
        userId: client.userId,
        agentType: agent.type,
        action: "agent_failed",
        details: { taskId: task.id, error: message },
      },
    });
    return {
      taskId: task.id,
      status: "failed",
      approvalItemIds: [],
      durationMs: Date.now() - started,
      error: message,
    };
  }
}

/**
 * Fan out an agent across every client belonging to a user.
 * Used by the nightly scheduler — it iterates users, then clients.
 */
export async function runAgentForUser<O>(
  agent: AgentDefinition<unknown, O>,
  userId: string,
): Promise<AgentRunResult[]> {
  const clients = await prisma.client.findMany({
    where: { userId },
    select: { id: true },
  });
  // Bounded concurrency: fan out across clients N-at-a-time. Serial was
  // ~40-50s per client end-to-end (Claude CLI subscription path), which
  // blew past Vercel's default 120s for any firm with 3+ clients. At
  // concurrency=3 we stay gentle on the Anthropic rate limit while
  // cutting wall-clock ~3x for typical firms.
  const concurrency = Math.min(3, clients.length);
  const results: AgentRunResult[] = new Array(clients.length);
  let cursor = 0;
  const worker = async () => {
    while (true) {
      const i = cursor++;
      if (i >= clients.length) return;
      try {
        results[i] = await runAgent(agent, clients[i].id);
      } catch (err) {
        results[i] = {
          taskId: "",
          status: "failed",
          approvalItemIds: [],
          durationMs: 0,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }
  };
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}
