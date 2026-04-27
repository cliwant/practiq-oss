/**
 * Unit tests for seed-sample-client. We mock Prisma fully — these
 * tests are about call-shape correctness (idempotency, the right
 * mix of records, JSON-path predicates), not actual SQL behavior.
 */
import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";

// Mock Prisma BEFORE importing the module under test.
const mockPrisma = vi.hoisted(() => {
  const ctxModel = {
    create: vi.fn(),
    count: vi.fn(),
  };
  const clientModel = {
    findFirst: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  };
  const conversationModel = { create: vi.fn() };
  const conversationMessageModel = { createMany: vi.fn() };
  const agentTaskModel = { create: vi.fn() };
  const approvalItemModel = { createMany: vi.fn(), count: vi.fn() };
  const auditLogModel = { create: vi.fn(), deleteMany: vi.fn() };
  // $transaction can be called as $transaction(fn) with a callback OR
  // as $transaction([promises]) with an array. We support both.
  const $transaction = vi.fn(async (arg: unknown) => {
    if (typeof arg === "function") return await (arg as (tx: unknown) => Promise<unknown>)(client);
    return await Promise.all(arg as Promise<unknown>[]);
  });
  const client = {
    client: clientModel,
    clientContext: ctxModel,
    conversation: conversationModel,
    conversationMessage: conversationMessageModel,
    agentTask: agentTaskModel,
    approvalItem: approvalItemModel,
    auditLog: auditLogModel,
    $transaction,
  };
  return client;
});

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

import {
  seedSampleClient,
  findSampleClientId,
  removeSampleClient,
} from "./seed-sample-client";

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("seedSampleClient", () => {
  it("creates a fresh sample client with all expected sub-records", async () => {
    mockPrisma.client.findFirst.mockResolvedValue(null);
    mockPrisma.client.create.mockResolvedValue({ id: "sample-client-id" });
    mockPrisma.clientContext.create.mockResolvedValue({});
    // Two conversations are created (food cost + lease renewal).
    let convCounter = 0;
    mockPrisma.conversation.create.mockImplementation(async () => ({
      id: `conv-id-${++convCounter}`,
    }));
    mockPrisma.conversationMessage.createMany.mockResolvedValue({ count: 2 });
    // Two agent tasks (current briefing + historical briefing).
    let taskCounter = 0;
    mockPrisma.agentTask.create.mockImplementation(async () => ({
      id: `task-id-${++taskCounter}`,
    }));
    mockPrisma.approvalItem.createMany.mockResolvedValue({ count: 3 });
    mockPrisma.auditLog.create.mockResolvedValue({});

    const result = await seedSampleClient({ userId: "user-1" });

    expect(result.clientId).toBe("sample-client-id");
    expect(result.contextCount).toBe(8);
    expect(result.approvalItemCount).toBe(3);

    // Client gets the isSample flag (the single most important
    // invariant — banner + idempotency + cleanup all key off it).
    const clientCreateCall = mockPrisma.client.create.mock.calls[0][0];
    expect(clientCreateCall.data.preferences.isSample).toBe(true);
    expect(clientCreateCall.data.name).toBe("Acme Coffee Co");

    // 8 ClientContext rows, 2 of them pinned.
    expect(mockPrisma.clientContext.create).toHaveBeenCalledTimes(8);
    const pinnedCalls = mockPrisma.clientContext.create.mock.calls.filter(
      ([arg]) => arg.data.isPinned === true,
    );
    expect(pinnedCalls.length).toBe(2);

    // 2 conversations (food-cost + lease renewal), each with a 2-message
    // exchange (user → assistant).
    expect(mockPrisma.conversation.create).toHaveBeenCalledTimes(2);
    expect(mockPrisma.conversationMessage.createMany).toHaveBeenCalledTimes(2);
    for (const call of mockPrisma.conversationMessage.createMany.mock.calls) {
      const msgs = call[0].data;
      expect(msgs).toHaveLength(2);
      expect(msgs.map((m: { role: string }) => m.role)).toEqual([
        "user",
        "assistant",
      ]);
    }

    // 2 agent tasks (current pending briefing + an older completed one
    // whose approval is in 'approved' status — closing the loop).
    expect(mockPrisma.agentTask.create).toHaveBeenCalledTimes(2);
    for (const call of mockPrisma.agentTask.create.mock.calls) {
      expect(call[0].data.agentType).toBe("daily_briefing");
      expect(call[0].data.status).toBe("completed");
    }

    // 3 approval items: briefing (pending) + action (pending) + briefing
    // (approved). Linked to one of the two agent tasks.
    const approvalCall = mockPrisma.approvalItem.createMany.mock.calls[0][0];
    expect(approvalCall.data).toHaveLength(3);
    const types = approvalCall.data.map((i: { type: string }) => i.type);
    expect(types).toContain("briefing");
    expect(types).toContain("action");
    const statuses = approvalCall.data.map(
      (i: { status: string }) => i.status,
    );
    expect(statuses).toContain("pending_review");
    expect(statuses).toContain("approved");
    for (const item of approvalCall.data) {
      expect(item.agentTaskId).toMatch(/^task-id-/);
      expect(item.content.isSample).toBe(true);
    }

    // 1 audit log entry tagged isSample.
    const auditCall = mockPrisma.auditLog.create.mock.calls[0][0];
    expect(auditCall.data.details.isSample).toBe(true);
  });

  it("is idempotent — second call returns the existing sample without creating new rows", async () => {
    mockPrisma.client.findFirst.mockResolvedValue({ id: "existing-id" });
    mockPrisma.clientContext.count.mockResolvedValue(8);
    mockPrisma.approvalItem.count.mockResolvedValue(3);

    const result = await seedSampleClient({ userId: "user-1" });

    expect(result.clientId).toBe("existing-id");
    expect(result.contextCount).toBe(8);
    expect(result.approvalItemCount).toBe(3);

    // Critical: no creates ran on the second call.
    expect(mockPrisma.client.create).not.toHaveBeenCalled();
    expect(mockPrisma.clientContext.create).not.toHaveBeenCalled();
    expect(mockPrisma.conversation.create).not.toHaveBeenCalled();
    expect(mockPrisma.agentTask.create).not.toHaveBeenCalled();
  });

  it("scopes the idempotency check to the requesting user", async () => {
    mockPrisma.client.findFirst.mockResolvedValue(null);
    mockPrisma.client.create.mockResolvedValue({ id: "new-id" });
    mockPrisma.clientContext.create.mockResolvedValue({});
    let convCounter = 0;
    mockPrisma.conversation.create.mockImplementation(async () => ({
      id: `c-${++convCounter}`,
    }));
    mockPrisma.conversationMessage.createMany.mockResolvedValue({ count: 2 });
    let taskCounter = 0;
    mockPrisma.agentTask.create.mockImplementation(async () => ({
      id: `t-${++taskCounter}`,
    }));
    mockPrisma.approvalItem.createMany.mockResolvedValue({ count: 3 });
    mockPrisma.auditLog.create.mockResolvedValue({});

    await seedSampleClient({ userId: "user-X" });

    const findFirstCall = mockPrisma.client.findFirst.mock.calls[0][0];
    expect(findFirstCall.where.userId).toBe("user-X");
    expect(findFirstCall.where.preferences).toEqual({
      path: ["isSample"],
      equals: true,
    });
  });
});

describe("findSampleClientId", () => {
  it("returns the sample id when present", async () => {
    mockPrisma.client.findFirst.mockResolvedValue({ id: "sample-id" });
    expect(await findSampleClientId("u-1")).toBe("sample-id");
  });

  it("returns null when no sample exists", async () => {
    mockPrisma.client.findFirst.mockResolvedValue(null);
    expect(await findSampleClientId("u-1")).toBeNull();
  });
});

describe("removeSampleClient", () => {
  it("deletes the sample client + audit logs and returns true", async () => {
    mockPrisma.client.findFirst.mockResolvedValue({ id: "sample-id" });
    mockPrisma.auditLog.deleteMany.mockResolvedValue({ count: 1 });
    mockPrisma.client.delete.mockResolvedValue({ id: "sample-id" });

    const result = await removeSampleClient("u-1");

    expect(result).toBe(true);
    // Audit deleteMany must run before the cascading client delete.
    const auditCall = mockPrisma.auditLog.deleteMany.mock.calls[0][0];
    expect(auditCall.where.userId).toBe("u-1");
    expect(auditCall.where.clientId).toBe("sample-id");
    expect(auditCall.where.details).toEqual({
      path: ["isSample"],
      equals: true,
    });
    expect(mockPrisma.client.delete).toHaveBeenCalledWith({
      where: { id: "sample-id" },
    });
  });

  it("returns false (no-op) when there's no sample to remove", async () => {
    mockPrisma.client.findFirst.mockResolvedValue(null);

    const result = await removeSampleClient("u-1");

    expect(result).toBe(false);
    expect(mockPrisma.client.delete).not.toHaveBeenCalled();
    expect(mockPrisma.auditLog.deleteMany).not.toHaveBeenCalled();
  });
});
