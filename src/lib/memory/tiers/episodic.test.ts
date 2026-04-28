/**
 * Unit tests for T3 Episodic tier reader (RUN 17 chat ↔ agent
 * backpressure addition).
 *
 * Coverage:
 *   - completed AgentTask + AuditLog rows surface as historical bullets
 *   - in-flight AgentTask (status: "running", startedAt < 90s ago) shows
 *     up as a "Currently updating" live bullet ABOVE the historical
 *     timeline so the chat model parses the live state first
 *   - in-flight tasks older than 90s are NOT surfaced (treated as stale)
 *   - retry attempts in the running task are flagged in the bullet
 *   - tier hadData is true even when no completed history but a live
 *     task exists (so the composer doesn't drop the live signal)
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  agentTask: { findMany: vi.fn() },
  auditLog: { findMany: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

import { loadT3Episodic } from "./episodic";

beforeEach(() => {
  mockPrisma.agentTask.findMany.mockReset();
  mockPrisma.auditLog.findMany.mockReset();
});

describe("loadT3Episodic — RUN 17 backpressure: in-flight signal", () => {
  it("emits a 'Currently updating' bullet for a running task started < 90s ago", async () => {
    // Three findMany calls: completed tasks, audit decisions, running tasks.
    // We dispatch by call index (matches Promise.all order in the reader).
    mockPrisma.agentTask.findMany
      .mockResolvedValueOnce([
        {
          agentType: "daily_briefing",
          summary: "March monthly close drafted",
          completedAt: new Date("2026-04-25T08:00:00Z"),
        },
      ])
      .mockResolvedValueOnce([
        {
          agentType: "anomaly_detector",
          startedAt: new Date(Date.now() - 30_000), // 30 seconds ago
          attempt: 0,
        },
      ]);
    mockPrisma.auditLog.findMany.mockResolvedValue([]);

    const block = await loadT3Episodic({ clientId: "c-1", cap: 600 });

    expect(block.hadData).toBe(true);
    expect(block.body).toContain("Currently updating");
    expect(block.body).toContain("LIVE");
    expect(block.body).toContain("anomaly_detector");
    expect(block.body).toMatch(/started \d+s ago/);
    // Live section appears BEFORE the historical timeline.
    const liveIdx = block.body.indexOf("Currently updating");
    const histIdx = block.body.indexOf("March monthly close");
    expect(liveIdx).toBeGreaterThan(0);
    expect(liveIdx).toBeLessThan(histIdx);
    expect(block.summary).toContain("1 live");
  });

  it("flags retry attempt in the live bullet when attempt > 0", async () => {
    mockPrisma.agentTask.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          agentType: "daily_briefing",
          startedAt: new Date(Date.now() - 5_000),
          attempt: 2,
        },
      ]);
    mockPrisma.auditLog.findMany.mockResolvedValue([]);

    const block = await loadT3Episodic({ clientId: "c-1", cap: 600 });
    expect(block.body).toContain("(retry 2)");
  });

  it("does NOT surface a running task older than the 90s horizon (filtered by where clause)", async () => {
    // The reader's where clause does `startedAt: { gte: cutoff }`. We
    // simulate the DB filter by returning an empty list — verifies the
    // horizon constant is wired into the actual query the reader makes.
    mockPrisma.agentTask.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    mockPrisma.auditLog.findMany.mockResolvedValue([]);

    // Inspect the where clause the reader passed to findMany for the
    // "running tasks" query (the second call).
    await loadT3Episodic({ clientId: "c-1", cap: 600 });

    const runningCall = mockPrisma.agentTask.findMany.mock.calls[1][0];
    expect(runningCall.where.clientId).toBe("c-1");
    expect(runningCall.where.status).toBe("running");
    expect(runningCall.where.startedAt.gte).toBeInstanceOf(Date);
    const cutoff = runningCall.where.startedAt.gte as Date;
    const ageMs = Date.now() - cutoff.getTime();
    // Cutoff should be ~90 seconds ago (allow 5s slop for slow CI).
    expect(ageMs).toBeGreaterThanOrEqual(85_000);
    expect(ageMs).toBeLessThanOrEqual(95_000);
  });

  it("emits a tier block with hadData=true even when ONLY a live task exists (no history)", async () => {
    mockPrisma.agentTask.findMany
      .mockResolvedValueOnce([]) // no completed
      .mockResolvedValueOnce([
        {
          agentType: "comms_drafter",
          startedAt: new Date(Date.now() - 10_000),
          attempt: 0,
        },
      ]);
    mockPrisma.auditLog.findMany.mockResolvedValue([]); // no decisions

    const block = await loadT3Episodic({ clientId: "c-1", cap: 600 });
    expect(block.hadData).toBe(true);
    expect(block.body).toContain("LIVE");
    expect(block.body).toContain("comms_drafter");
  });

  it("returns empty TierBlock when neither history NOR live tasks exist", async () => {
    mockPrisma.agentTask.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    mockPrisma.auditLog.findMany.mockResolvedValue([]);

    const block = await loadT3Episodic({ clientId: "c-1", cap: 600 });
    expect(block.hadData).toBe(false);
    expect(block.body).toBe("");
    expect(block.tokensApprox).toBe(0);
  });
});

describe("loadT3Episodic — historical timeline regression", () => {
  it("renders completed agent tasks + operator decisions in newest-first order", async () => {
    mockPrisma.agentTask.findMany
      .mockResolvedValueOnce([
        {
          agentType: "daily_briefing",
          summary: "Older briefing",
          completedAt: new Date("2026-04-20T08:00:00Z"),
        },
        {
          agentType: "anomaly_detector",
          summary: "Newer anomaly",
          completedAt: new Date("2026-04-25T08:00:00Z"),
        },
      ])
      .mockResolvedValueOnce([]);
    mockPrisma.auditLog.findMany.mockResolvedValue([
      {
        action: "approval_modify",
        details: { itemTitle: "Lease counter-offer" },
        createdAt: new Date("2026-04-22T08:00:00Z"),
      },
    ]);

    const block = await loadT3Episodic({ clientId: "c-1", cap: 600 });
    expect(block.hadData).toBe(true);
    const idxNewer = block.body.indexOf("Newer anomaly");
    const idxModify = block.body.indexOf("Lease counter-offer");
    const idxOlder = block.body.indexOf("Older briefing");
    expect(idxNewer).toBeGreaterThan(0);
    expect(idxNewer).toBeLessThan(idxModify);
    expect(idxModify).toBeLessThan(idxOlder);
  });
});
