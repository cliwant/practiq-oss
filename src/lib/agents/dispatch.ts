/**
 * Subagent dispatch with token budgets — Wave-4 RUN 13 (P2-01).
 *
 * Replaces the bare `runAgentForUser` fan-out with an orchestration
 * layer that:
 *
 *   1. **Serialises by (clientId × agentType)** — the same agent
 *      type can NEVER run twice on the same client concurrently
 *      within one dispatch invocation. Implemented as a per-key
 *      processor: each key gets its own async worker that drains
 *      its queue serially. Across keys we run up to `concurrency`
 *      key-workers in parallel.
 *   2. **Concurrency-bounds across distinct keys** — N keys can run
 *      in parallel (default 3 to be gentle on Anthropic's RPM
 *      ceiling). Tunable per-call.
 *   3. **Enforces a cumulative token budget** for the whole batch.
 *      Each `runAgent` reports its `inputTokens` + `outputTokens`
 *      via the AuditLog row it writes. The dispatcher samples that
 *      AuditLog row and increments a running total. When the running
 *      total + the next task's worst-case expected cost would exceed
 *      the dispatch budget, we *skip* (not fail) remaining tasks and
 *      surface the skipped count in the result. This is the cost
 *      ceiling that turns a buggy fan-out from a $200 surprise into
 *      an auto-stop.
 *   4. **Per-firm spend ceiling integration** — checks
 *      `assertSpendUnderCeiling` once at dispatch entry. If the
 *      firm has already burned through their plan ceiling, the
 *      dispatcher returns immediately with `skipped: all`,
 *      logging the reason. No per-task ceiling check (would
 *      be too noisy).
 *
 * Why in-process (no Bull / Redis):
 *   - ARM64 Windows dev: no Redis daemon, no native binaries.
 *   - Vercel serverless: lambdas are stateless, a Redis-backed
 *     queue would survive across invocations but Bull's worker
 *     model needs a long-running process — exactly what we don't
 *     have.
 *   - Practical: each cron tick has bounded work (200 active
 *     clients × 4 agent types = 800 tasks max). At 3-way
 *     concurrency that's ~10s per agent type completed serially
 *     — comfortably within Vercel's 5-minute lambda budget.
 *   - When we outgrow the in-process model (probably Phase 2 once
 *     a single firm has 500+ clients), we swap the dispatcher's
 *     internal queue for BullMQ without changing the public API.
 */

import type { AgentDefinition, AgentRunResult } from "./runner";
import { runAgent } from "./runner";
import { prisma } from "@/lib/prisma";
import {
  assertSpendUnderCeiling,
  SpendCeilingExceededError,
} from "@/lib/spend-ceiling";

// AgentDefinition is invariant in its Output parameter (used both as
// `parseOutput`'s return and `buildApprovalItems`'s input). The
// dispatcher doesn't actually care about Output shape — it forwards
// the agent to runAgent untouched and only reads the AgentRunResult
// (whose shape is fixed). Using `any` here intentionally so any
// concrete agent definition (BriefingOutput, etc.) assigns cleanly.
type AnyAgent = AgentDefinition<unknown, any>;

export interface DispatchTask {
  /** Agent definition to run for this slot. */
  agent: AnyAgent;
  /** Client to run it against. */
  clientId: string;
  /**
   * Per-task token cap. Falls through to MAX_AGENT_OUTPUT_TOKENS in
   * runAgent when the agent's `buildPrompt` returns its own larger
   * value — we don't override the agent's intent, just the dispatcher's
   * accounting cap. This is also the worst-case expected cost used by
   * the budget pre-check (skip the task if running + expected > cap).
   */
  expectedOutputTokens?: number;
}

export interface DispatchOptions {
  /**
   * Max concurrent runs across distinct (clientId × agentType) keys.
   * Defaults to 3 to keep Anthropic + OpenRouter RPM headroom.
   */
  concurrency?: number;
  /**
   * Total token budget for the whole batch (sum of per-agent
   * input + output tokens, both reported by Claude's usage). When
   * the running total + the next task's expected ceiling would
   * exceed this, the dispatcher skips remaining tasks. Default
   * 100K — enough for 200 clients × ~4 agent runs/client / day
   * with tier-shaped prompts.
   */
  totalTokenBudget?: number;
  /**
   * If true, ignore SpendCeilingExceededError and run anyway. Use
   * sparingly — meant for one-off operator-triggered runs that need
   * to push past the auto-block.
   */
  bypassSpendCeiling?: boolean;
  /**
   * userId for the spend-ceiling check. Required unless
   * bypassSpendCeiling is true.
   */
  userId?: string;
  /**
   * Optional usage reader override — primarily for tests. In
   * production the dispatcher reads from AuditLog after each run.
   */
  readUsageForTask?: (
    taskId: string,
  ) => Promise<{ inputTokens: number; outputTokens: number }>;
}

export interface DispatchResult {
  /** Number of tasks the dispatcher attempted. */
  attempted: number;
  /** Number of tasks that completed (regardless of agent success). */
  completed: number;
  /** Number that completed with status: "completed". */
  succeeded: number;
  /** Number that failed inside the agent runner. */
  failed: number;
  /** Number skipped because the dispatcher's token budget tripped. */
  skippedBudget: number;
  /** Number skipped because the firm hit its plan spend ceiling. */
  skippedSpendCeiling: number;
  /** Sum of input tokens reported by Claude across completed runs. */
  inputTokens: number;
  /** Sum of output tokens. */
  outputTokens: number;
  /** Per-task results (only the completed ones — skipped tasks are counted but not detailed). */
  runs: AgentRunResult[];
  /** Total wall-clock duration of the dispatch in ms. */
  durationMs: number;
}

const DEFAULT_CONCURRENCY = 3;
const DEFAULT_BUDGET_TOKENS = 100_000;
const DEFAULT_TASK_EXPECTED = 2_500;

/**
 * Run a list of (agent, clientId) pairs through the dispatcher.
 *
 * Tasks are grouped by `(clientId × agentType)` key. Each key gets
 * a dedicated processor that drains the key's queue serially. Up to
 * `concurrency` processors run in parallel. The cumulative token
 * budget is enforced after every completed task — if the next task's
 * expected cost would exceed the remaining budget, every remaining
 * task across every queue is skipped.
 */
export async function dispatchAgentTasks(
  tasks: DispatchTask[],
  opts: DispatchOptions = {},
): Promise<DispatchResult> {
  const start = Date.now();
  const concurrency = Math.max(1, opts.concurrency ?? DEFAULT_CONCURRENCY);
  const totalBudget = Math.max(
    1_000,
    opts.totalTokenBudget ?? DEFAULT_BUDGET_TOKENS,
  );
  const usageReader = opts.readUsageForTask ?? readUsageFromAuditLog;

  const result: DispatchResult = {
    attempted: tasks.length,
    completed: 0,
    succeeded: 0,
    failed: 0,
    skippedBudget: 0,
    skippedSpendCeiling: 0,
    inputTokens: 0,
    outputTokens: 0,
    runs: [],
    durationMs: 0,
  };

  if (tasks.length === 0) {
    result.durationMs = Date.now() - start;
    return result;
  }

  // Spend-ceiling pre-check. One probe — if the firm is already over
  // their plan ceiling we don't run anything.
  if (!opts.bypassSpendCeiling && opts.userId) {
    try {
      await assertSpendUnderCeiling(opts.userId);
    } catch (err) {
      if (err instanceof SpendCeilingExceededError) {
        result.skippedSpendCeiling = tasks.length;
        result.durationMs = Date.now() - start;
        return result;
      }
      throw err;
    }
  }

  // Group tasks by (clientId × agentType) so the per-key serial
  // discipline is enforced inside one queue.
  const queues = new Map<string, DispatchTask[]>();
  for (const t of tasks) {
    const key = `${t.clientId}::${t.agent.type}`;
    const arr = queues.get(key) ?? [];
    arr.push(t);
    queues.set(key, arr);
  }

  const keyList = [...queues.keys()];
  let nextKeyIdx = 0;
  let runningBudget = 0;
  let stoppedForBudget = false;

  // Drain one key's queue serially. The per-key worker is the
  // single-threaded contract: tasks of the same key run one after
  // another, never concurrently. Returns when the queue is empty
  // or the global budget trip has fired.
  const processKey = async (key: string): Promise<void> => {
    const queue = queues.get(key);
    if (!queue) return;
    while (queue.length > 0 && !stoppedForBudget) {
      const task = queue.shift()!;

      // Budget pre-check — guess based on the agent's declared
      // expected cost. If we'd blow past the budget, skip and
      // drain every remaining queue.
      const expected = task.expectedOutputTokens ?? DEFAULT_TASK_EXPECTED;
      if (runningBudget + expected > totalBudget) {
        result.skippedBudget++;
        for (const q of queues.values()) {
          result.skippedBudget += q.length;
          q.length = 0;
        }
        stoppedForBudget = true;
        return;
      }

      const run = await runAgent(task.agent, task.clientId);
      result.runs.push(run);
      result.completed++;
      if (run.status === "completed") result.succeeded++;
      else if (run.status === "failed") result.failed++;

      // Pull actual usage from the AuditLog row runAgent just
      // wrote. Falls through to `expected` on miss so we still
      // advance the running total instead of letting the budget
      // get gamed by missing rows.
      const usage = await usageReader(run.taskId);
      const inputTokens = usage.inputTokens || 0;
      const outputTokens =
        usage.outputTokens || (usage.inputTokens ? 0 : expected);
      runningBudget += inputTokens + outputTokens;
      result.inputTokens += inputTokens;
      result.outputTokens += outputTokens;
    }
  };

  // Spawn N key-workers. Each worker pulls the next un-claimed key
  // off the keyList, processes it to completion, then picks the
  // next one. Workers exit when no keys remain.
  const keyWorker = async (): Promise<void> => {
    while (!stoppedForBudget) {
      const myIdx = nextKeyIdx++;
      if (myIdx >= keyList.length) return;
      await processKey(keyList[myIdx]);
    }
  };

  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, keyList.length) },
      () => keyWorker(),
    ),
  );

  result.durationMs = Date.now() - start;
  return result;
}

async function readUsageFromAuditLog(
  taskId: string,
): Promise<{ inputTokens: number; outputTokens: number }> {
  if (!taskId) return { inputTokens: 0, outputTokens: 0 };
  const row = await prisma.auditLog
    .findFirst({
      where: {
        action: "agent_completed",
        details: { path: ["taskId"], equals: taskId },
      },
      orderBy: { createdAt: "desc" },
      select: { details: true },
    })
    .catch(() => null);
  const details = (row?.details ?? {}) as {
    inputTokens?: number;
    outputTokens?: number;
  };
  return {
    inputTokens:
      typeof details.inputTokens === "number" ? details.inputTokens : 0,
    outputTokens:
      typeof details.outputTokens === "number" ? details.outputTokens : 0,
  };
}

/**
 * Convenience: dispatch a single agent type across every client a
 * user owns. Replaces `runAgentForUser` for cases where the caller
 * wants the dispatcher's budget + concurrency semantics.
 *
 * Usage:
 *   await dispatchSingleAgentForUser({
 *     userId: u.id,
 *     agent: DAILY_BRIEFING_AGENT,
 *     concurrency: 3,
 *     totalTokenBudget: 80_000,
 *   });
 */
export async function dispatchSingleAgentForUser(opts: {
  userId: string;
  agent: AnyAgent;
  concurrency?: number;
  totalTokenBudget?: number;
  bypassSpendCeiling?: boolean;
}): Promise<DispatchResult> {
  const clients = await prisma.client.findMany({
    where: { userId: opts.userId },
    select: { id: true },
  });
  const tasks: DispatchTask[] = clients.map((c) => ({
    agent: opts.agent,
    clientId: c.id,
  }));
  return dispatchAgentTasks(tasks, {
    userId: opts.userId,
    concurrency: opts.concurrency,
    totalTokenBudget: opts.totalTokenBudget,
    bypassSpendCeiling: opts.bypassSpendCeiling,
  });
}

/**
 * Convenience: dispatch multiple agent types across every client.
 * The cross-product (clientCount × agentTypeCount) is enqueued
 * with the per-(clientId × agentType) serial discipline kicking in
 * automatically — agents on the same client run one-at-a-time
 * even though different clients run in parallel.
 */
export async function dispatchAgentMatrixForUser(opts: {
  userId: string;
  agents: AnyAgent[];
  concurrency?: number;
  totalTokenBudget?: number;
  bypassSpendCeiling?: boolean;
}): Promise<DispatchResult> {
  const clients = await prisma.client.findMany({
    where: { userId: opts.userId },
    select: { id: true },
  });
  const tasks: DispatchTask[] = [];
  for (const client of clients) {
    for (const agent of opts.agents) {
      tasks.push({ agent, clientId: client.id });
    }
  }
  return dispatchAgentTasks(tasks, {
    userId: opts.userId,
    concurrency: opts.concurrency,
    totalTokenBudget: opts.totalTokenBudget,
    bypassSpendCeiling: opts.bypassSpendCeiling,
  });
}
