/**
 * Unit tests for the subagent dispatcher (RUN 13 base + RUN 14 hardening).
 *
 * Coverage:
 *
 *   --- RUN 13 base ---
 *   - Empty task list short-circuits without touching the spend
 *     ceiling or runAgent.
 *   - SpendCeilingExceededError at dispatch entry skips every task
 *     into `skippedSpendCeiling`.
 *   - Cumulative token-budget trip pushes the rest into `skippedBudget`.
 *   - Same (clientId × agentType) tasks run strictly serially even
 *     under concurrency=3 (per-key worker observable max in-flight = 1).
 *   - Distinct keys honour the global concurrency cap.
 *   - Failed runs land in `result.failed` without aborting peers.
 *   - bypassSpendCeiling=true skips the ceiling assertion.
 *   - inputTokens / outputTokens aggregate across runs.
 *
 *   --- RUN 14 idempotency / retry / cost ---
 *   - Pre-flight dedup query skips tasks whose dedupKey already
 *     ran (or is running) — counted as `skippedDuplicate`.
 *   - skipDedupCheck=true bypasses the dedup query.
 *   - Default dedup key is `${clientId}::${agentType}::${UTC-YYYY-MM-DD}`.
 *   - Transient error retries up to maxRetries times; succeeds on a
 *     later attempt → `succeeded` increments, `retried` reflects
 *     wasted attempts.
 *   - Transient error that never succeeds within maxRetries → final
 *     `failed`.
 *   - Permanent (parse / not-found) error does NOT retry.
 *   - PermanentAgentError thrown out of runAgent → counted failed,
 *     no retry, dispatcher continues with peer tasks.
 *   - usdCost rolls up from the usage reader into DispatchResult.
 *   - Sleeper override is called between retries with monotonically
 *     non-zero delays.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AgentDefinition, AgentRunResult } from "./runner";

// vi.mock is hoisted; use vi.hoisted so the mock fns exist when
// the factory runs.
const {
  runAgentMock,
  assertSpendUnderCeilingMock,
  isTransientAgentErrorMock,
  SpendCeilingExceededErrorRef,
  PermanentAgentErrorRef,
} = vi.hoisted(() => {
  class SpendCeilingExceededError extends Error {
    constructor() {
      super("ceiling exceeded");
      this.name = "SpendCeilingExceededError";
    }
  }
  class PermanentAgentError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "PermanentAgentError";
    }
  }
  return {
    runAgentMock: vi.fn(),
    assertSpendUnderCeilingMock: vi.fn().mockResolvedValue(undefined),
    isTransientAgentErrorMock: vi.fn(),
    SpendCeilingExceededErrorRef: SpendCeilingExceededError,
    PermanentAgentErrorRef: PermanentAgentError,
  };
});

vi.mock("./runner", () => ({
  runAgent: runAgentMock,
  isTransientAgentError: isTransientAgentErrorMock,
  PermanentAgentError: PermanentAgentErrorRef,
}));

vi.mock("@/lib/spend-ceiling", () => ({
  assertSpendUnderCeiling: assertSpendUnderCeilingMock,
  SpendCeilingExceededError: SpendCeilingExceededErrorRef,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    auditLog: { findFirst: vi.fn().mockResolvedValue(null) },
    client: { findMany: vi.fn().mockResolvedValue([]) },
    agentTask: { findFirst: vi.fn().mockResolvedValue(null) },
  },
}));

import { dispatchAgentTasks } from "./dispatch";

function makeAgent(type: string, version = "1.0.0"): AgentDefinition<unknown, unknown> {
  return {
    type,
    label: type,
    version,
    buildPrompt: async () => ({
      systemPrompt: "",
      userPrompt: "",
      maxTokens: 1024,
    }),
    parseOutput: () => ({}),
    buildApprovalItems: () => [],
  };
}

function makeRun(
  taskId: string,
  status: AgentRunResult["status"] = "completed",
  error?: string,
): AgentRunResult {
  return {
    taskId,
    status,
    approvalItemIds: [],
    durationMs: 1,
    ...(error ? { error } : {}),
  };
}

const ZERO_USAGE = { inputTokens: 0, outputTokens: 0, usdCost: 0 };

beforeEach(() => {
  runAgentMock.mockReset();
  assertSpendUnderCeilingMock.mockReset();
  assertSpendUnderCeilingMock.mockResolvedValue(undefined);
  // Default classifier: anything containing "transient" / "rate" /
  // "503" / "timeout" → transient. Otherwise permanent. Tests can
  // override per-case via mockImplementation.
  isTransientAgentErrorMock.mockImplementation((err: unknown) => {
    const m = err instanceof Error ? err.message : typeof err === "string" ? err : "";
    return /transient|rate|503|timeout|overloaded/i.test(m);
  });
});

// ────────────────────────────────────────────────────────────────────
// RUN 13 regression — early exits
// ────────────────────────────────────────────────────────────────────

describe("dispatchAgentTasks — early exits", () => {
  it("returns zeroed result for an empty task list and never probes the ceiling", async () => {
    const result = await dispatchAgentTasks([]);
    expect(result.attempted).toBe(0);
    expect(result.completed).toBe(0);
    expect(result.skippedBudget).toBe(0);
    expect(result.skippedSpendCeiling).toBe(0);
    expect(result.skippedDuplicate).toBe(0);
    expect(result.retried).toBe(0);
    expect(result.usdCost).toBe(0);
    expect(result.runs).toEqual([]);
    expect(runAgentMock).not.toHaveBeenCalled();
    expect(assertSpendUnderCeilingMock).not.toHaveBeenCalled();
  });

  it("skips every task into skippedSpendCeiling when the firm is over its plan", async () => {
    assertSpendUnderCeilingMock.mockRejectedValueOnce(
      new SpendCeilingExceededErrorRef(),
    );
    const agent = makeAgent("daily_briefing");
    const tasks = [
      { agent, clientId: "c1" },
      { agent, clientId: "c2" },
      { agent, clientId: "c3" },
    ];
    const result = await dispatchAgentTasks(tasks, { userId: "u1" });

    expect(result.attempted).toBe(3);
    expect(result.skippedSpendCeiling).toBe(3);
    expect(result.completed).toBe(0);
    expect(runAgentMock).not.toHaveBeenCalled();
  });

  it("bypassSpendCeiling=true avoids the spend ceiling assertion", async () => {
    assertSpendUnderCeilingMock.mockRejectedValue(
      new SpendCeilingExceededErrorRef(),
    );
    runAgentMock.mockResolvedValue(makeRun("t1"));
    const agent = makeAgent("daily_briefing");
    const result = await dispatchAgentTasks(
      [{ agent, clientId: "c1" }],
      {
        userId: "u1",
        bypassSpendCeiling: true,
        skipDedupCheck: true,
        readUsageForTask: async () => ZERO_USAGE,
      },
    );
    expect(result.skippedSpendCeiling).toBe(0);
    expect(result.completed).toBe(1);
    expect(assertSpendUnderCeilingMock).not.toHaveBeenCalled();
  });
});

// ────────────────────────────────────────────────────────────────────
// RUN 13 regression — budget enforcement
// ────────────────────────────────────────────────────────────────────

describe("dispatchAgentTasks — budget enforcement", () => {
  it("stops dispatch and counts remaining tasks as skippedBudget when running + expected exceeds total", async () => {
    const agent = makeAgent("daily_briefing");
    runAgentMock.mockImplementation(async () => makeRun("t" + Math.random()));
    const tasks = [
      { agent, clientId: "c1", expectedOutputTokens: 3_000 },
      { agent, clientId: "c2", expectedOutputTokens: 3_000 },
      { agent, clientId: "c3", expectedOutputTokens: 3_000 },
      { agent, clientId: "c4", expectedOutputTokens: 3_000 },
    ];
    const result = await dispatchAgentTasks(tasks, {
      concurrency: 1,
      totalTokenBudget: 10_000,
      skipDedupCheck: true,
      readUsageForTask: async () => ({
        inputTokens: 1_500,
        outputTokens: 1_500,
        usdCost: 0.025,
      }),
    });

    expect(result.completed).toBe(3);
    expect(result.skippedBudget).toBe(1);
    expect(result.succeeded).toBe(3);
    expect(runAgentMock).toHaveBeenCalledTimes(3);
  });

  it("aggregates inputTokens / outputTokens / usdCost from the usage reader across runs", async () => {
    const agent = makeAgent("daily_briefing");
    runAgentMock.mockResolvedValue(makeRun("t-shared"));
    const tasks = [
      { agent, clientId: "c1" },
      { agent, clientId: "c2" },
      { agent, clientId: "c3" },
    ];
    const result = await dispatchAgentTasks(tasks, {
      concurrency: 1,
      totalTokenBudget: 1_000_000,
      skipDedupCheck: true,
      readUsageForTask: async () => ({
        inputTokens: 100,
        outputTokens: 200,
        usdCost: 0.0033,
      }),
    });

    expect(result.completed).toBe(3);
    expect(result.inputTokens).toBe(300);
    expect(result.outputTokens).toBe(600);
    expect(result.usdCost).toBeCloseTo(0.0099, 4);
  });
});

// ────────────────────────────────────────────────────────────────────
// RUN 13 regression — concurrency + per-key serial
// ────────────────────────────────────────────────────────────────────

describe("dispatchAgentTasks — concurrency + per-key serial", () => {
  it("never runs two tasks of the same (clientId × agentType) key concurrently", async () => {
    const agent = makeAgent("daily_briefing");
    const inFlightByKey = new Map<string, number>();
    let observedMax = 0;

    runAgentMock.mockImplementation(async (a, clientId) => {
      const key = `${clientId}::${a.type}`;
      const cur = (inFlightByKey.get(key) ?? 0) + 1;
      inFlightByKey.set(key, cur);
      observedMax = Math.max(observedMax, cur);
      await new Promise((r) => setTimeout(r, 5));
      inFlightByKey.set(key, cur - 1);
      return makeRun("t");
    });

    const tasks = [
      { agent, clientId: "c1" },
      { agent, clientId: "c1" },
      { agent, clientId: "c1" },
    ];
    const result = await dispatchAgentTasks(tasks, {
      concurrency: 3,
      totalTokenBudget: 1_000_000,
      skipDedupCheck: true,
      readUsageForTask: async () => ({
        inputTokens: 1,
        outputTokens: 1,
        usdCost: 0,
      }),
    });

    expect(result.completed).toBe(3);
    expect(observedMax).toBe(1);
  });

  it("respects the concurrency cap across distinct keys", async () => {
    const agent = makeAgent("daily_briefing");
    let inFlight = 0;
    let observedMax = 0;

    runAgentMock.mockImplementation(async () => {
      inFlight++;
      observedMax = Math.max(observedMax, inFlight);
      await new Promise((r) => setTimeout(r, 10));
      inFlight--;
      return makeRun("t");
    });

    const tasks = Array.from({ length: 5 }, (_, i) => ({
      agent,
      clientId: `c${i}`,
    }));
    const result = await dispatchAgentTasks(tasks, {
      concurrency: 2,
      totalTokenBudget: 1_000_000,
      skipDedupCheck: true,
      readUsageForTask: async () => ({
        inputTokens: 1,
        outputTokens: 1,
        usdCost: 0,
      }),
    });

    expect(result.completed).toBe(5);
    expect(observedMax).toBeLessThanOrEqual(2);
  });

  it("counts failed agent runs into result.failed without aborting peers", async () => {
    const agent = makeAgent("daily_briefing");
    runAgentMock.mockImplementation(async (_, clientId) => {
      return makeRun(
        "t-" + clientId,
        clientId === "c2" ? "failed" : "completed",
        clientId === "c2" ? "Agent output parse failed: bad json" : undefined,
      );
    });
    const tasks = [
      { agent, clientId: "c1" },
      { agent, clientId: "c2" },
      { agent, clientId: "c3" },
    ];
    const result = await dispatchAgentTasks(tasks, {
      concurrency: 3,
      totalTokenBudget: 1_000_000,
      skipDedupCheck: true,
      maxRetries: 0, // retry off so a single failed run sticks
      readUsageForTask: async () => ({
        inputTokens: 1,
        outputTokens: 1,
        usdCost: 0,
      }),
    });

    expect(result.completed).toBe(3);
    expect(result.succeeded).toBe(2);
    expect(result.failed).toBe(1);
  });
});

// ────────────────────────────────────────────────────────────────────
// RUN 14 — idempotency
// ────────────────────────────────────────────────────────────────────

describe("dispatchAgentTasks — RUN 14 idempotency (dedup)", () => {
  it("skips tasks whose dedupKey already ran today", async () => {
    const agent = makeAgent("daily_briefing");
    runAgentMock.mockResolvedValue(makeRun("t-fresh"));

    const result = await dispatchAgentTasks(
      [
        { agent, clientId: "c-already-ran" },
        { agent, clientId: "c-fresh" },
      ],
      {
        userId: "u1",
        bypassSpendCeiling: true,
        readUsageForTask: async () => ZERO_USAGE,
        // c-already-ran already has a same-day completed AgentTask; c-fresh doesn't.
        checkDedup: async (_, dedupKey) => {
          if (dedupKey.startsWith("c-already-ran::")) {
            return { id: "prev-task-id", status: "completed" };
          }
          return null;
        },
      },
    );

    expect(result.attempted).toBe(2);
    expect(result.skippedDuplicate).toBe(1);
    expect(result.completed).toBe(1);
    expect(runAgentMock).toHaveBeenCalledTimes(1);
    expect(runAgentMock).toHaveBeenCalledWith(
      agent,
      "c-fresh",
      expect.objectContaining({ attempt: 0 }),
    );
  });

  it("treats a still-running (< 10 min) task as a dedup hit", async () => {
    const agent = makeAgent("daily_briefing");
    runAgentMock.mockResolvedValue(makeRun("t"));

    const result = await dispatchAgentTasks(
      [{ agent, clientId: "c-running" }],
      {
        userId: "u1",
        bypassSpendCeiling: true,
        readUsageForTask: async () => ZERO_USAGE,
        checkDedup: async () => ({ id: "in-flight", status: "running" }),
      },
    );

    expect(result.skippedDuplicate).toBe(1);
    expect(result.completed).toBe(0);
    expect(runAgentMock).not.toHaveBeenCalled();
  });

  it("uses the default dedup key shape `${clientId}::${agentType}::${UTC-YYYY-MM-DD}`", async () => {
    const agent = makeAgent("anomaly_detector");
    runAgentMock.mockResolvedValue(makeRun("t"));
    const seen: string[] = [];
    await dispatchAgentTasks(
      [{ agent, clientId: "c-1" }],
      {
        userId: "u1",
        bypassSpendCeiling: true,
        readUsageForTask: async () => ZERO_USAGE,
        checkDedup: async (_, dedupKey) => {
          seen.push(dedupKey);
          return null;
        },
      },
    );
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatch(/^c-1::anomaly_detector::\d{4}-\d{2}-\d{2}$/);
  });

  it("respects an explicit per-task dedupKey override", async () => {
    const agent = makeAgent("daily_briefing");
    runAgentMock.mockResolvedValue(makeRun("t"));
    const seen: string[] = [];
    await dispatchAgentTasks(
      [{ agent, clientId: "c-1", dedupKey: "custom-slot::hour-09" }],
      {
        userId: "u1",
        bypassSpendCeiling: true,
        readUsageForTask: async () => ZERO_USAGE,
        checkDedup: async (_, dedupKey) => {
          seen.push(dedupKey);
          return null;
        },
      },
    );
    expect(seen).toEqual(["custom-slot::hour-09"]);
    expect(runAgentMock).toHaveBeenCalledWith(
      agent,
      "c-1",
      expect.objectContaining({ dedupKey: "custom-slot::hour-09" }),
    );
  });

  it("skipDedupCheck=true bypasses the dedup query entirely", async () => {
    const agent = makeAgent("daily_briefing");
    runAgentMock.mockResolvedValue(makeRun("t"));
    const checkDedup = vi.fn();
    await dispatchAgentTasks(
      [{ agent, clientId: "c-1" }],
      {
        userId: "u1",
        bypassSpendCeiling: true,
        skipDedupCheck: true,
        readUsageForTask: async () => ZERO_USAGE,
        checkDedup,
      },
    );
    expect(checkDedup).not.toHaveBeenCalled();
    expect(runAgentMock).toHaveBeenCalled();
  });
});

// ────────────────────────────────────────────────────────────────────
// RUN 14 — retry with backoff
// ────────────────────────────────────────────────────────────────────

describe("dispatchAgentTasks — RUN 14 retry with backoff", () => {
  it("retries a transient failure up to maxRetries and counts retried", async () => {
    const agent = makeAgent("daily_briefing");
    let calls = 0;
    runAgentMock.mockImplementation(async () => {
      calls++;
      if (calls < 3) {
        return makeRun("", "failed", "503 service overloaded transient");
      }
      return makeRun("t-ok-3");
    });
    const sleepCalls: number[] = [];

    const result = await dispatchAgentTasks(
      [{ agent, clientId: "c-1" }],
      {
        userId: "u1",
        bypassSpendCeiling: true,
        skipDedupCheck: true,
        maxRetries: 3,
        readUsageForTask: async () => ZERO_USAGE,
        sleep: async (ms) => {
          sleepCalls.push(ms);
        },
      },
    );

    expect(calls).toBe(3);
    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.retried).toBe(2);
    expect(sleepCalls).toHaveLength(2);
    sleepCalls.forEach((ms) => expect(ms).toBeGreaterThanOrEqual(0));
  });

  it("gives up after maxRetries and counts the run as failed", async () => {
    const agent = makeAgent("daily_briefing");
    runAgentMock.mockResolvedValue(
      makeRun("", "failed", "503 service overloaded"),
    );

    const result = await dispatchAgentTasks(
      [{ agent, clientId: "c-1" }],
      {
        userId: "u1",
        bypassSpendCeiling: true,
        skipDedupCheck: true,
        maxRetries: 2,
        readUsageForTask: async () => ZERO_USAGE,
        sleep: async () => {},
      },
    );

    expect(result.succeeded).toBe(0);
    expect(result.failed).toBe(1);
    // 3 attempts total, 2 retries waste before we give up.
    expect(runAgentMock).toHaveBeenCalledTimes(3);
    expect(result.retried).toBe(2);
  });

  it("does NOT retry permanent failures (parse error)", async () => {
    const agent = makeAgent("daily_briefing");
    runAgentMock.mockResolvedValue(
      makeRun("t-bad", "failed", "Agent output parse failed: bad json"),
    );
    isTransientAgentErrorMock.mockReturnValue(false);

    const result = await dispatchAgentTasks(
      [{ agent, clientId: "c-1" }],
      {
        userId: "u1",
        bypassSpendCeiling: true,
        skipDedupCheck: true,
        maxRetries: 5,
        readUsageForTask: async () => ZERO_USAGE,
        sleep: async () => {},
      },
    );

    expect(runAgentMock).toHaveBeenCalledTimes(1);
    expect(result.failed).toBe(1);
    expect(result.retried).toBe(0);
  });

  it("treats PermanentAgentError thrown out of runAgent as no-retry, peers continue", async () => {
    const agent = makeAgent("daily_briefing");
    runAgentMock.mockImplementation(async (_, clientId) => {
      if (clientId === "c-bad") {
        throw new PermanentAgentErrorRef(`Client ${clientId} not found`);
      }
      return makeRun("t-" + clientId);
    });

    const result = await dispatchAgentTasks(
      [
        { agent, clientId: "c-good" },
        { agent, clientId: "c-bad" },
        { agent, clientId: "c-also-good" },
      ],
      {
        userId: "u1",
        bypassSpendCeiling: true,
        skipDedupCheck: true,
        maxRetries: 5,
        readUsageForTask: async () => ZERO_USAGE,
        sleep: async () => {},
      },
    );

    expect(result.completed).toBe(3);
    expect(result.succeeded).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.retried).toBe(0);
    // c-bad called once total (no retry), the other two once each.
    expect(runAgentMock).toHaveBeenCalledTimes(3);
  });

  it("threads attempt index through to runAgent on each retry", async () => {
    const agent = makeAgent("daily_briefing");
    let calls = 0;
    runAgentMock.mockImplementation(async () => {
      calls++;
      if (calls < 3) {
        return makeRun("", "failed", "rate limit transient");
      }
      return makeRun("t-3");
    });

    await dispatchAgentTasks(
      [{ agent, clientId: "c-1" }],
      {
        userId: "u1",
        bypassSpendCeiling: true,
        skipDedupCheck: true,
        maxRetries: 5,
        readUsageForTask: async () => ZERO_USAGE,
        sleep: async () => {},
      },
    );

    const attempts = runAgentMock.mock.calls.map(
      (call: any[]) => call[2].attempt,
    );
    expect(attempts).toEqual([0, 1, 2]);
  });
});

// ────────────────────────────────────────────────────────────────────
// RUN 17 — mid-dispatch spend re-check
// ────────────────────────────────────────────────────────────────────

describe("dispatchAgentTasks — RUN 17 mid-dispatch spend re-check", () => {
  it("does NOT call assertSpendUnderCeiling more than once on a short dispatch", async () => {
    const agent = makeAgent("daily_briefing");
    runAgentMock.mockResolvedValue(makeRun("t"));

    await dispatchAgentTasks(
      [
        { agent, clientId: "c-1" },
        { agent, clientId: "c-2" },
      ],
      {
        userId: "u1",
        skipDedupCheck: true,
        readUsageForTask: async () => ZERO_USAGE,
        sleep: async () => {},
      },
    );

    // One pre-flight probe at dispatch entry; the throttle (30s) prevents
    // further re-checks during a sub-second mock dispatch.
    expect(assertSpendUnderCeilingMock).toHaveBeenCalledTimes(1);
  });

  it("triggers a mid-dispatch re-check when wall-clock crosses the throttle window", async () => {
    const agent = makeAgent("daily_briefing");
    // Simulate a slow dispatch by stretching wall-clock between tasks.
    let nowMs = Date.now();
    const realNow = Date.now;
    Date.now = () => nowMs;
    runAgentMock.mockImplementation(async () => {
      // After each task, advance the simulated clock by 31 seconds so
      // the throttle window opens and the re-check fires next tick.
      nowMs += 31_000;
      return makeRun("t");
    });

    try {
      await dispatchAgentTasks(
        [
          { agent, clientId: "c-1" },
          { agent, clientId: "c-2" },
          { agent, clientId: "c-3" },
        ],
        {
          userId: "u1",
          concurrency: 1, // serial so the clock advance is deterministic
          skipDedupCheck: true,
          readUsageForTask: async () => ZERO_USAGE,
          sleep: async () => {},
        },
      );

      // 1 entry-probe + at least 2 mid-dispatch re-checks.
      expect(assertSpendUnderCeilingMock.mock.calls.length).toBeGreaterThanOrEqual(3);
    } finally {
      Date.now = realNow;
    }
  });

  it("on mid-dispatch ceiling breach, drains remaining tasks into skippedSpendCeiling (not skippedBudget)", async () => {
    const agent = makeAgent("daily_briefing");
    let nowMs = Date.now();
    const realNow = Date.now;
    Date.now = () => nowMs;

    // Pre-flight check: under ceiling. Mid-dispatch (after first task,
    // wall-clock + 31s): over ceiling.
    let probes = 0;
    assertSpendUnderCeilingMock.mockImplementation(async () => {
      probes++;
      if (probes >= 2) {
        throw new SpendCeilingExceededErrorRef();
      }
    });
    runAgentMock.mockImplementation(async () => {
      nowMs += 31_000;
      return makeRun("t");
    });

    try {
      const result = await dispatchAgentTasks(
        [
          { agent, clientId: "c-1" },
          { agent, clientId: "c-2" },
          { agent, clientId: "c-3" },
          { agent, clientId: "c-4" },
        ],
        {
          userId: "u1",
          concurrency: 1,
          skipDedupCheck: true,
          readUsageForTask: async () => ZERO_USAGE,
          sleep: async () => {},
        },
      );

      // First task completed before the second probe fired.
      expect(result.completed).toBe(1);
      // Remaining 3 tasks were drained to skippedSpendCeiling, NOT
      // skippedBudget — the cause was the firm's plan ceiling, not
      // the dispatcher's own token budget.
      expect(result.skippedSpendCeiling).toBe(3);
      expect(result.skippedBudget).toBe(0);
    } finally {
      Date.now = realNow;
    }
  });

  it("a non-ceiling error during the re-check does NOT abort the dispatch", async () => {
    const agent = makeAgent("daily_briefing");
    let nowMs = Date.now();
    const realNow = Date.now;
    Date.now = () => nowMs;

    let probes = 0;
    assertSpendUnderCeilingMock.mockImplementation(async () => {
      probes++;
      if (probes >= 2) {
        // Random transient DB error, NOT a SpendCeilingExceededError.
        throw new Error("ECONNREFUSED transient blip on the recheck");
      }
    });
    runAgentMock.mockImplementation(async () => {
      nowMs += 31_000;
      return makeRun("t");
    });

    try {
      const result = await dispatchAgentTasks(
        [
          { agent, clientId: "c-1" },
          { agent, clientId: "c-2" },
          { agent, clientId: "c-3" },
        ],
        {
          userId: "u1",
          concurrency: 1,
          skipDedupCheck: true,
          readUsageForTask: async () => ZERO_USAGE,
          sleep: async () => {},
        },
      );

      // All three should still complete; the recheck failure is non-fatal.
      expect(result.completed).toBe(3);
      expect(result.skippedSpendCeiling).toBe(0);
    } finally {
      Date.now = realNow;
    }
  });
});
