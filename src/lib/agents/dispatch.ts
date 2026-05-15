/**
 * Subagent dispatch with token budgets — Wave-4 RUN 13 + RUN 14.
 *
 * Replaces the bare `runAgentForUser` fan-out with an orchestration
 * layer that:
 *
 *   1. **Serialises by (clientId × agentType)** — the same agent type
 *      can NEVER run twice on the same client concurrently within one
 *      dispatch invocation. Per-key worker pattern.
 *   2. **Concurrency-bounds across distinct keys** — N keys can run in
 *      parallel (default 3 to be gentle on Anthropic's RPM ceiling).
 *   3. **Cumulative token budget** — sum of input + output tokens over
 *      every completed task. Skip remaining tasks when running +
 *      expected > budget. Default 100K.
 *   4. **Per-firm spend ceiling pre-check** — dispatch entry-point
 *      probes `assertSpendUnderCeiling`. Over-ceiling firms get every
 *      task counted as `skippedSpendCeiling` and the dispatcher
 *      returns immediately.
 *
 *   --- RUN 14 (P2-01 hardening) additions ---
 *
 *   5. **Cross-invocation idempotency** — pre-flight query against
 *      `agent_tasks` indexed by `(userId, dedupKey, status)` skips a
 *      task if a `completed` AgentTask for the same dedupKey exists
 *      from earlier today, OR if a `running` task started < 10 min
 *      ago is still in flight. Default dedup key is
 *      `${clientId}::${agentType}::${UTC-YYYY-MM-DD}`. Caller can
 *      override per-task to support more granular slots (e.g.
 *      hourly).
 *   6. **Bounded retry on transient failure** — Anthropic 5xx /
 *      OpenRouter 429 / network timeouts retry up to 3× with
 *      exponential backoff (~1s, 2s, 4s with jitter). Permanent
 *      failures (parse-error wrapped in `PermanentAgentError`,
 *      auth, "not found") don't retry — re-running the same prompt
 *      against a malformed-output model won't help.
 *   7. **Cost transparency** — `runAgent` now persists `usdCost` on
 *      the AgentTask + AuditLog row. The dispatcher rolls those up
 *      into `DispatchResult.usdCost` so the cron + Approval Queue
 *      surfaces "this nightly briefing cost $0.83 across 5 clients"
 *      at a glance.
 *
 * Why in-process (no Bull / Redis):
 *   - ARM64 Windows dev: no Redis daemon, no native binaries.
 *   - Vercel serverless: lambdas are stateless, a Redis-backed queue
 *     would survive across invocations but Bull's worker model needs
 *     a long-running process — exactly what we don't have.
 *   - When we outgrow the in-process model (probably Phase 2 once a
 *     single firm has 500+ clients), we swap the dispatcher's internal
 *     queue for BullMQ without changing the public API.
 */

import type { AgentDefinition, AgentRunResult } from "./runner";
import {
  runAgent,
  isTransientAgentError,
  PermanentAgentError,
} from "./runner";
import { prisma } from "@/lib/prisma";
import {
  assertSpendUnderCeiling,
  SpendCeilingExceededError,
} from "@/lib/spend-ceiling";
// Stage 3d.2: agent paths write UsageEvent rows so per-client billing
// counts agent token usage against the firm's monthly allowance. Without
// this, nightly agent runs would consume tokens invisible to
// snapshotForPaid.used, effectively bypassing the base allowance.
import { recordUsage } from "@/lib/plan-gates";

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
  /**
   * Optional dedup key override. Defaults to
   * `${clientId}::${agent.type}::${UTC-YYYY-MM-DD}`. Use a finer-grain
   * suffix (e.g. `…::hour-09`) when an agent should run multiple
   * times per day for the same client.
   */
  dedupKey?: string;
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
   * Max retry attempts per task on transient failure. Default 2 (so
   * up to 3 total tries). Permanent failures (parse error, auth,
   * not-found) never retry regardless of this value.
   */
  maxRetries?: number;
  /**
   * Disable cross-invocation idempotency. Test-only knob. Default false
   * means dedup is on. When true, tasks always run regardless of
   * whether the same dedupKey ran earlier.
   */
  skipDedupCheck?: boolean;
  /**
   * If true, ignore SpendCeilingExceededError and run anyway. Use
   * sparingly — meant for one-off operator-triggered runs that need
   * to push past the auto-block.
   */
  bypassSpendCeiling?: boolean;
  /**
   * userId for the spend-ceiling check. Required unless
   * bypassSpendCeiling is true. Also used to scope the dedup query.
   */
  userId?: string;
  /**
   * Optional usage reader override — primarily for tests. In production
   * the dispatcher reads from AuditLog after each run.
   */
  readUsageForTask?: (
    taskId: string,
  ) => Promise<{ inputTokens: number; outputTokens: number; usdCost: number }>;
  /**
   * Optional dedup query override — primarily for tests. In production
   * the dispatcher queries `agent_tasks` directly.
   */
  checkDedup?: (
    userId: string,
    dedupKey: string,
  ) => Promise<{ id: string; status: string } | null>;
  /**
   * Optional sleeper override — primarily for tests so backoff doesn't
   * actually wait wall-clock seconds. Defaults to setTimeout-based.
   */
  sleep?: (ms: number) => Promise<void>;
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
  /**
   * Number skipped because the same dedupKey already ran (or is
   * running) — RUN 14 cross-invocation idempotency.
   */
  skippedDuplicate: number;
  /**
   * Number of transient retries that were attempted across the
   * dispatch (not the number of tasks that retried — the total
   * attempts that succeeded after one or more retries). Pairs with
   * `failed` to surface "n tasks retried, m permanently failed".
   */
  retried: number;
  /** Sum of input tokens reported by Claude across completed runs. */
  inputTokens: number;
  /** Sum of output tokens. */
  outputTokens: number;
  /**
   * Sum of computed USD cost across completed runs. Same accounting
   * basis as `spend-ceiling.computeUsdCost` so this value flows
   * directly into the per-firm spend totals.
   */
  usdCost: number;
  /** Per-task results (only the completed ones — skipped tasks are counted but not detailed). */
  runs: AgentRunResult[];
  /** Total wall-clock duration of the dispatch in ms. */
  durationMs: number;
}

const DEFAULT_CONCURRENCY = 3;
const DEFAULT_BUDGET_TOKENS = 100_000;
const DEFAULT_TASK_EXPECTED = 2_500;
const DEFAULT_MAX_RETRIES = 2;
const RETRY_BASE_MS = 1_000;
/** "Stale running" cutoff for dedup query — a `running` task older than this
 *  is treated as a crashed/abandoned run and dedup permits a fresh attempt. */
const STALE_RUNNING_MS = 10 * 60_000;
/** RUN 17: minimum interval between mid-dispatch spend-ceiling re-checks.
 *  Throttles `assertSpendUnderCeiling` to at most once per 30s so a
 *  long-running dispatch (200 clients × ~3-5s each) doesn't hammer the
 *  UsageEvent aggregate. Picked 30s because spend-ceiling state changes
 *  on the timescale of human chat turns + agent runs (multi-second), so
 *  30s catches mid-flight ceiling breaches before the dispatch wastes
 *  another full minute of work. */
const SPEND_RECHECK_INTERVAL_MS = 30_000;

/**
 * Default dedup key: one slot per (client × agent × UTC date).
 *
 * Why UTC: cron runs at "0 17 * * *" UTC. A user in Asia/Seoul vs
 * America/Los_Angeles would otherwise hit the same dedup key on
 * consecutive UTC days but different local days, racing each other.
 * UTC-grouped dedup keeps the contract simple ("once per UTC day").
 */
function defaultDedupKey(clientId: string, agentType: string): string {
  const isoDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return `${clientId}::${agentType}::${isoDate}`;
}

/**
 * Run a list of (agent, clientId) pairs through the dispatcher.
 *
 * Tasks are grouped by `(clientId × agentType)` key. Each key gets a
 * dedicated processor that drains the key's queue serially. Up to
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
  const maxRetries = Math.max(0, opts.maxRetries ?? DEFAULT_MAX_RETRIES);
  const usageReader = opts.readUsageForTask ?? readUsageFromAuditLog;
  const dedupChecker = opts.checkDedup ?? checkDedupInDb;
  const sleeper = opts.sleep ?? defaultSleep;

  const result: DispatchResult = {
    attempted: tasks.length,
    completed: 0,
    succeeded: 0,
    failed: 0,
    skippedBudget: 0,
    skippedSpendCeiling: 0,
    skippedDuplicate: 0,
    retried: 0,
    inputTokens: 0,
    outputTokens: 0,
    usdCost: 0,
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
  let stoppedForSpendCeiling = false;
  let lastSpendCheckAt = Date.now(); // initial pre-check counts as t=0

  /**
   * RUN 17: mid-dispatch spend ceiling re-check. The dispatcher's
   * entry-point probe catches the firm that's already over their plan
   * ceiling, but a chat user rapid-firing simultaneously can push them
   * over mid-dispatch. We re-check at most once every
   * SPEND_RECHECK_INTERVAL_MS and, on throw, drain every remaining task
   * into `skippedSpendCeiling` (preferred over `skippedBudget` because
   * the cause is plan-ceiling, not the dispatcher's own budget).
   *
   * Skipped when bypassSpendCeiling = true or no userId (test path).
   */
  const maybeRecheckSpend = async (): Promise<void> => {
    if (opts.bypassSpendCeiling || !opts.userId) return;
    if (stoppedForBudget || stoppedForSpendCeiling) return;
    const now = Date.now();
    if (now - lastSpendCheckAt < SPEND_RECHECK_INTERVAL_MS) return;
    lastSpendCheckAt = now;
    try {
      await assertSpendUnderCeiling(opts.userId);
    } catch (err) {
      if (err instanceof SpendCeilingExceededError) {
        let queuedRest = 0;
        for (const q of queues.values()) {
          queuedRest += q.length;
          q.length = 0;
        }
        result.skippedSpendCeiling += queuedRest;
        stoppedForSpendCeiling = true;
        return;
      }
      // Non-spend-ceiling errors during re-check are non-fatal: a DB
      // blip on the recheck shouldn't kill the dispatch. We log and
      // continue, treating it as if the firm is still under ceiling.
      console.warn(
        `[dispatch] mid-dispatch spend re-check failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  };

  // Drain one key's queue serially.
  const processKey = async (key: string): Promise<void> => {
    const queue = queues.get(key);
    if (!queue) return;
    while (
      queue.length > 0 &&
      !stoppedForBudget &&
      !stoppedForSpendCeiling
    ) {
      const task = queue.shift()!;

      // Budget pre-check.
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

      // Cross-invocation dedup pre-check. Only when userId is set —
      // ad-hoc test paths skip this.
      const dedupKey =
        task.dedupKey ?? defaultDedupKey(task.clientId, task.agent.type);
      if (!opts.skipDedupCheck && opts.userId) {
        const existing = await dedupChecker(opts.userId, dedupKey);
        if (existing) {
          result.skippedDuplicate++;
          continue;
        }
      }

      // Retry loop. Each attempt creates a separate AgentTask row with
      // attempt=0, 1, 2, … so the audit trail shows every try.
      let finalRun: AgentRunResult | null = null;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const run = await runAgent(task.agent, task.clientId, {
            dedupKey,
            attempt,
          });
          if (run.status !== "failed") {
            finalRun = run;
            if (attempt > 0) result.retried += attempt;
            break;
          }
          // failed — retry only if transient AND we have attempts left.
          const transient = isTransientAgentError(run.error ?? "");
          if (!transient || attempt === maxRetries) {
            finalRun = run;
            if (attempt > 0) result.retried += attempt;
            break;
          }
          // Backoff before next attempt.
          await sleeper(backoffMs(attempt));
        } catch (err) {
          // runAgent throws PermanentAgentError on client-not-found
          // and similar fatal cases. Don't retry; record a synthetic
          // failed run and continue to the next task.
          if (err instanceof PermanentAgentError) {
            finalRun = {
              taskId: "",
              status: "failed",
              approvalItemIds: [],
              durationMs: 0,
              error: err.message,
            };
            break;
          }
          // Transient throw — retry if attempts remain.
          if (!isTransientAgentError(err) || attempt === maxRetries) {
            finalRun = {
              taskId: "",
              status: "failed",
              approvalItemIds: [],
              durationMs: 0,
              error: err instanceof Error ? err.message : String(err),
            };
            if (attempt > 0) result.retried += attempt;
            break;
          }
          await sleeper(backoffMs(attempt));
        }
      }

      // Record outcome.
      if (!finalRun) continue; // shouldn't happen — defensive
      result.runs.push(finalRun);
      result.completed++;
      if (finalRun.status === "completed") result.succeeded++;
      else if (finalRun.status === "failed") result.failed++;

      // Roll up usage + cost from the AuditLog row runAgent wrote.
      if (finalRun.taskId) {
        const usage = await usageReader(finalRun.taskId);
        const inputTokens = usage.inputTokens || 0;
        const outputTokens =
          usage.outputTokens || (usage.inputTokens ? 0 : expected);
        runningBudget += inputTokens + outputTokens;
        result.inputTokens += inputTokens;
        result.outputTokens += outputTokens;
        result.usdCost += usage.usdCost || 0;

        // Stage 3d.2 (2026-05-16) — write UsageEvent for the agent run.
        // This makes agent token usage visible to snapshotForPaid.used,
        // which is the per-client billing engine's count of "tokens used
        // this period". Without it, agents would burn tokens invisibly
        // and the credit-consumption math in /api/chat would understate
        // the firm's true overshoot.
        //
        // Fire-and-forget: a failure here must never break the agent
        // dispatch. The AuditLog row is the canonical record for
        // compliance; UsageEvent is the convenience read-model that
        // snapshotForPaid + assertBudget consume.
        if (opts.userId && (inputTokens > 0 || outputTokens > 0)) {
          recordUsage({
            userId: opts.userId,
            kind: "agent_run",
            agentType: task.agent.type,
            clientId: task.clientId,
            inputTokens,
            outputTokens,
            provider: "sdk",
          }).catch((err) => {
            console.warn(
              `[agent-dispatch] recordUsage failed taskId=${finalRun.taskId}: ${err}`,
            );
          });
        }
      }

      // RUN 17: mid-dispatch spend re-check. Throttled internally;
      // most ticks no-op. Fires only when wall-clock since last check
      // ≥ 30s, so a dispatch with ≤ 6 tasks won't even trigger one.
      await maybeRecheckSpend();
    }
  };

  // Spawn N key-workers. Each worker pulls the next un-claimed key
  // off the keyList, processes it to completion, then picks the next
  // one. Workers exit when no keys remain.
  const keyWorker = async (): Promise<void> => {
    while (!stoppedForBudget && !stoppedForSpendCeiling) {
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

  // Round usdCost to 4 decimals to match column precision and avoid
  // floating-point dust like 0.18000000000000005 leaking into JSON.
  result.usdCost = Math.round(result.usdCost * 10_000) / 10_000;

  result.durationMs = Date.now() - start;
  return result;
}

/**
 * Exponential backoff with full jitter. Attempt 0 → ~0..1s, attempt
 * 1 → ~0..2s, attempt 2 → ~0..4s. Bounded so a stuck retry loop
 * doesn't lock up the dispatcher.
 */
function backoffMs(attempt: number): number {
  const cap = Math.min(RETRY_BASE_MS * Math.pow(2, attempt), 8_000);
  return Math.floor(Math.random() * cap);
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function readUsageFromAuditLog(
  taskId: string,
): Promise<{ inputTokens: number; outputTokens: number; usdCost: number }> {
  if (!taskId) return { inputTokens: 0, outputTokens: 0, usdCost: 0 };
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
    usdCost?: number;
  };
  return {
    inputTokens:
      typeof details.inputTokens === "number" ? details.inputTokens : 0,
    outputTokens:
      typeof details.outputTokens === "number" ? details.outputTokens : 0,
    usdCost: typeof details.usdCost === "number" ? details.usdCost : 0,
  };
}

/**
 * Default dedup checker. Looks for a same-day completed task or a
 * still-fresh (< 10 min) running task for the same dedup key. Falls
 * through to null on DB error so a transient query failure doesn't
 * block the dispatch — it's better to occasionally double-run on a
 * DB blip than to silently skip everything.
 */
async function checkDedupInDb(
  userId: string,
  dedupKey: string,
): Promise<{ id: string; status: string } | null> {
  if (!dedupKey) return null;
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const staleCutoff = new Date(Date.now() - STALE_RUNNING_MS);
  try {
    const row = await prisma.agentTask.findFirst({
      where: {
        userId,
        dedupKey,
        OR: [
          { status: "completed", createdAt: { gte: startOfDay } },
          { status: "running", startedAt: { gte: staleCutoff } },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true },
    });
    return row;
  } catch {
    return null;
  }
}

/**
 * Convenience: dispatch a single agent type across every client a
 * user owns. Replaces `runAgentForUser` for cases where the caller
 * wants the dispatcher's budget + concurrency + retry + dedup
 * semantics.
 */
export async function dispatchSingleAgentForUser(opts: {
  userId: string;
  agent: AnyAgent;
  concurrency?: number;
  totalTokenBudget?: number;
  maxRetries?: number;
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
    maxRetries: opts.maxRetries,
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
  maxRetries?: number;
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
    maxRetries: opts.maxRetries,
    bypassSpendCeiling: opts.bypassSpendCeiling,
  });
}
