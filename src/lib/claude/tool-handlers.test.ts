/**
 * Unit tests for tool-handlers. We mock Prisma fully — these are
 * about call-shape correctness (ownership scoping, defense-in-depth,
 * error wrapping), not actual SQL behavior.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockPrisma = vi.hoisted(() => {
  return {
    client: { findFirst: vi.fn() },
    clientContext: { findMany: vi.fn() },
    approvalItem: { create: vi.fn() },
    auditLog: { create: vi.fn() },
    // RUN 14: search_knowledge_base migrated from prisma.clientContext.findMany
    // to a raw trigram-similarity query (`$queryRaw`). Tests assert
    // the call shape against this.
    $queryRaw: vi.fn().mockResolvedValue([]),
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

import { executeTool } from "./tool-handlers";

const baseCtx = {
  userId: "user-1",
  clientId: "client-1",
  clientName: "Acme Coffee",
  conversationId: "conv-1",
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("executeTool — dispatcher", () => {
  it("returns is_error for unknown tools instead of throwing", async () => {
    const result = await executeTool("does_not_exist", {}, baseCtx);
    expect(result.isError).toBe(true);
    expect(result.content).toMatch(/unknown tool/i);
  });

  it("wraps handler exceptions as is_error: true", async () => {
    mockPrisma.client.findFirst.mockRejectedValue(new Error("DB down"));
    const result = await executeTool(
      "search_knowledge_base",
      { query: "anything" },
      baseCtx,
    );
    expect(result.isError).toBe(true);
    expect(result.content).toMatch(/failed/i);
  });
});

describe("search_knowledge_base", () => {
  it("returns empty-query notice when query is blank", async () => {
    const result = await executeTool(
      "search_knowledge_base",
      { query: "  " },
      baseCtx,
    );
    expect(result.isError).toBe(false);
    expect(result.content).toMatch(/empty query/i);
    expect(mockPrisma.clientContext.findMany).not.toHaveBeenCalled();
  });

  it("returns access notice when client doesn't belong to user", async () => {
    mockPrisma.client.findFirst.mockResolvedValue(null);
    const result = await executeTool(
      "search_knowledge_base",
      { query: "lease" },
      baseCtx,
    );
    expect(result.isError).toBe(false);
    expect(result.content).toMatch(/not found|not accessible/i);
    // Critical: we never even attempted to query contexts.
    expect(mockPrisma.$queryRaw).not.toHaveBeenCalled();
  });

  it("runs a trigram-similarity query scoped to clientId and renders results", async () => {
    mockPrisma.client.findFirst.mockResolvedValue({ id: "client-1" });
    mockPrisma.$queryRaw.mockResolvedValue([
      {
        id: "ctx-1",
        title: "Lease — Mission St",
        content: "Lease at 2418 Mission St runs through 2027-12-31.",
        category: "document",
        is_pinned: true,
        updated_at: new Date(),
        score: 0.82,
      },
    ]);

    const result = await executeTool(
      "search_knowledge_base",
      { query: "lease mission" },
      baseCtx,
    );

    // Ownership check used both ids.
    expect(mockPrisma.client.findFirst.mock.calls[0][0].where).toEqual({
      id: "client-1",
      userId: "user-1",
    });

    // Trigram raw query was actually invoked.
    expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);

    expect(result.isError).toBe(false);
    expect(result.content).toMatch(/Lease — Mission St/);
    expect(result.content).toMatch(/pinned/i);
  });

  it("returns a friendly empty-result message when the trigram query is empty", async () => {
    mockPrisma.client.findFirst.mockResolvedValue({ id: "client-1" });
    mockPrisma.$queryRaw.mockResolvedValue([]);

    const result = await executeTool(
      "search_knowledge_base",
      { query: "doesnt-exist-anywhere" },
      baseCtx,
    );

    expect(result.isError).toBe(false);
    expect(result.content).toMatch(
      /no knowledge-base entries matched/i,
    );
  });
});

describe("draft_email", () => {
  it("rejects missing fields without DB writes", async () => {
    const r1 = await executeTool("draft_email", { to: "x@y.com" }, baseCtx);
    expect(r1.content).toMatch(/subject/i);
    expect(mockPrisma.approvalItem.create).not.toHaveBeenCalled();

    const r2 = await executeTool(
      "draft_email",
      { to: "x@y.com", subject: "Hi" },
      baseCtx,
    );
    expect(r2.content).toMatch(/body/i);
    expect(mockPrisma.approvalItem.create).not.toHaveBeenCalled();
  });

  it("creates an ApprovalItem of type email_draft with the right payload", async () => {
    mockPrisma.client.findFirst.mockResolvedValue({
      id: "client-1",
      name: "Acme Coffee",
    });
    mockPrisma.approvalItem.create.mockResolvedValue({ id: "appr-123" });
    mockPrisma.auditLog.create.mockResolvedValue({});

    const result = await executeTool(
      "draft_email",
      {
        to: "sarah@acmecoffee.com",
        subject: "March close — ready for review",
        body: "Hi Sarah,\n\nMarch close is ready. Highlights: revenue +12%.",
        cc: ["partner@firm.com"],
      },
      baseCtx,
    );

    const createCall = mockPrisma.approvalItem.create.mock.calls[0][0];
    expect(createCall.data.type).toBe("email_draft");
    expect(createCall.data.status).toBe("pending_review");
    expect(createCall.data.userId).toBe("user-1");
    expect(createCall.data.clientId).toBe("client-1");
    expect(createCall.data.title).toBe("March close — ready for review");
    expect(createCall.data.content.to).toBe("sarah@acmecoffee.com");
    expect(createCall.data.content.cc).toEqual(["partner@firm.com"]);
    expect(createCall.data.content.sourceConversationId).toBe("conv-1");

    // Audit log captures the chat → draft chain.
    const auditCall = mockPrisma.auditLog.create.mock.calls[0][0];
    expect(auditCall.data.action).toBe("tool_draft_email_created");
    expect(auditCall.data.details.approvalItemId).toBe("appr-123");

    expect(result.isError).toBe(false);
    expect(result.content).toMatch(/saved as ApprovalItem appr-123/i);
  });

  it("filters non-string entries out of cc", async () => {
    mockPrisma.client.findFirst.mockResolvedValue({
      id: "client-1",
      name: "Acme",
    });
    mockPrisma.approvalItem.create.mockResolvedValue({ id: "appr-1" });
    mockPrisma.auditLog.create.mockResolvedValue({});

    await executeTool(
      "draft_email",
      {
        to: "x@y.com",
        subject: "Test",
        body: "Body",
        cc: ["a@b.com", null, "", 42, "c@d.com"],
      },
      baseCtx,
    );

    const cc = mockPrisma.approvalItem.create.mock.calls[0][0].data.content.cc;
    expect(cc).toEqual(["a@b.com", "42", "c@d.com"]);
  });

  it("blocks the draft when the client doesn't belong to the user", async () => {
    mockPrisma.client.findFirst.mockResolvedValue(null);

    const result = await executeTool(
      "draft_email",
      { to: "x@y.com", subject: "S", body: "B" },
      baseCtx,
    );
    expect(result.content).toMatch(/not found|not accessible/i);
    expect(mockPrisma.approvalItem.create).not.toHaveBeenCalled();
    expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
  });
});
