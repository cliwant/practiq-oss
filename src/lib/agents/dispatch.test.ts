/**
 * Unit tests for the subagent dispatcher (RUN 13, P2-01).
 *
 * Coverage:
 *   - empty task list returns a zeroed DispatchResult and never
 *     touches the spend ceiling or runAgent.
 *   - SpendCeilingExceededError at dispatch entry skips every task
 *     into `skippedSpendCeiling`.
 *   - cumulative token budget trip pushes the rest into
 *     `skippedBudget` without invoking runAgent again.
 *   - same (clientId × agentType) tasks run strictly serially —
 *     no concurrent in-flight counter ever exceeds 1 per key.
 *   - distinct keys honour the concurrency cap — global in-flight
 *     never exceeds opts.concurrency.
 *   - successful runs sum input/output tokens from the injected
 *     usage reader.
 *   - bypassSpendCeiling=true skips the assertion even when it
 *     would normally throw.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  AgentDefinition,
  AgentRunResult,
} from "./runner";

// vi.mock is hoisted; use vi.hoisted so the mock fns exist when
// the factory runs.
const {
  runAgentMock,
  assertSpendUnderCeilingMock,
  SpendCeilingExceededErrorRef,
} = vi.hoisted(() => {
  class SpendCeilingExceededError extends Error {
    constructor() {
      super("ceiling exceeded");
      this.name = "SpendCeilingExceededError";
    }
  }
  return {
    runAgentMock: vi.fn(),
    assertSpendUnderCeilingMock: vi.fn().mockResolvedValue(undefined),
    SpendCeilingExceededErrorRef: SpendCeilingExceededError,
  };
});

vi.mock("./runner", () => ({
  runAgent: runAgentMock,
}));

vi.mock("@/lib/spend-ceiling", () => ({
  assertSpendUnderCeiling: assertSpendUnderCeilingMock,
  SpendCeilingExceededError: SpendCeilingExceededErrorRef,
}));

// Prisma is referenced only by the default usage reader. We supply
// our own readUsageForTask in every test so the prisma mock can be
// minimal.
vi.mock("@/lib/prisma", () => ({
  prisma: {
    auditLog: { findFirst: vi.fn().mockResolvedValue(null) },
    client: { findMany: vi.fn().mockResolvedValue([]) },
  },
}));

import { dispatchAgentTasks } from "./dispatch";

function makeAgent(type: string): AgentDefinition<unknown, unknown> {
  return {
    type,
    label: type,
    buildPrompt: async () => ({
      systemPrompt: "",
      userPrompt: "",
      maxTokens: 1024,
    }),
    parseOutput: () => ({}),
    buildApprovalItems: () => [],
  };
}

function makeRun(taskId: string, status: AgentRunResult["status"] = "completed"): AgentRunResult {
  return {
    taskId,
    status,
    approvalItemIds: [],
    durationMs: 1,
  };
}

beforeEach(() => {
  runAgentMock.mockReset();
  assertSpendUnderCeilingMock.mockReset();
  assertSpendUnderCeilingMock.mockResolvedValue(undefined);
});

describe("dispatchAgentTasks — early exits", () => {
  it("returns zeroed result for an empty task list and never probes the ceiling", async () => {
    const result = await dispatchAgentTasks([]);
    expect(result.attempted).toBe(0);
    expect(result.completed).toBe(0);
    expect(result.skippedBudget).toBe(0);
    expect(result.skippedSpendCeiling).toBe(0);
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
        readUsageForTask: async () => ({ inputTokens: 0, outputTokens: 0 }),
      },
    );
    expect(result.skippedSpendCeiling).toBe(0);
    expect(result.completed).toBe(1);
    expect(assertSpendUnderCeilingMock).not.toHaveBeenCalled();
  });
});

describe("dispatchAgentTasks — budget enforcement", () => {
  it("stops dispatch and counts remaining tasks as skippedBudget when running + expected exceeds total", async () => {
    const agent = makeAgent("daily_briefing");
    // 4 clients, 3,000 expected each → after 3 runs we'd be at 9,000.
    // Budget 10,000 means the 4th task's expected (3,000) trips the
    // skip BEFORE invoking runAgent on the 4th.
    runAgentMock.mockImplementation(async () => makeRun("t" + Math.random()));
    const tasks = [
      { agent, clientId: "c1", expectedOutputTokens: 3_000 },
      { agent, clientId: "c2", expectedOutputTokens: 3_000 },
      { agent, clientId: "c3", expectedOutputTokens: 3_000 },
      { agent, clientId: "c4", expectedOutputTokens: 3_000 },
    ];
    const result = await dispatchAgentTasks(tasks, {
      concurrency: 1, // serial so the budget trip is deterministic
      totalTokenBudget: 10_000,
      readUsageForTask: async () => ({ inputTokens: 1_500, outputTokens: 1_500 }),
    });

    expect(result.completed).toBe(3);
    expect(result.skippedBudget).toBe(1);
    expect(result.succeeded).toBe(3);
    expect(runAgentMock).toHaveBeenCalledTimes(3);
  });

  it("aggregates inputTokens / outputTokens from the usage reader across runs", async () => {
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
      readUsageForTask: async () => ({ inputTokens: 100, outputTokens: 200 }),
    });

    expect(result.completed).toBe(3);
    expect(result.inputTokens).toBe(300);
    expect(result.outputTokens).toBe(600);
  });
});

describe("dispatchAgentTasks — concurrency + per-key serial", () => {
  it("never runs two tasks of the same (clientId × agentType) key concurrently", async () => {
    const agent = makeAgent("daily_briefing");
    // Same client, same agent type, three back-to-back tasks. They
    // share a key, so they must run serially even with concurrency=3.
    const inFlightByKey = new Map<string, number>();
    let observedMax = 0;

    runAgentMock.mockImplementation(async (a, clientId) => {
      const key = `${clientId}::${a.type}`;
      const cur = (inFlightByKey.get(key) ?? 0) + 1;
      inFlightByKey.set(key, cur);
      observedMax = Math.max(observedMax, cur);
      // Yield so other workers have a chance to interleave if the
      // serialisation discipline is broken.
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
      readUsageForTask: async () => ({ inputTokens: 1, outputTokens: 1 }),
    });

    expect(result.completed).toBe(3);
    expect(observedMax).toBe(1); // never two of the same key in flight
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

    // 5 distinct clients, concurrency=2. Global in-flight should
    // never exceed 2.
    const tasks = Array.from({ length: 5 }, (_, i) => ({
      agent,
      clientId: `c${i}`,
    }));
    const result = await dispatchAgentTasks(tasks, {
      concurrency: 2,
      totalTokenBudget: 1_000_000,
      readUsageForTask: async () => ({ inputTokens: 1, outputTokens: 1 }),
    });

    expect(result.completed).toBe(5);
    expect(observedMax).toBeLessThanOrEqual(2);
  });

  it("counts failed agent runs into result.failed without aborting peers", async () => {
    const agent = makeAgent("daily_briefing");
    runAgentMock.mockImplementation(async (_, clientId) => {
      return makeRun("t-" + clientId, clientId === "c2" ? "failed" : "completed");
    });
    const tasks = [
      { agent, clientId: "c1" },
      { agent, clientId: "c2" },
      { agent, clientId: "c3" },
    ];
    const result = await dispatchAgentTasks(tasks, {
      concurrency: 3,
      totalTokenBudget: 1_000_000,
      readUsageForTask: async () => ({ inputTokens: 1, outputTokens: 1 }),
    });

    expect(result.completed).toBe(3);
    expect(result.succeeded).toBe(2);
    expect(result.failed).toBe(1);
  });
});
