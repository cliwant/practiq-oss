/**
 * Tests for POST /api/workflows/[slug]/run.
 *
 * The route is thin: auth → workflow lookup → Conversation create →
 * AuditLog write → analytics fire-and-forget. We mock auth, prisma,
 * and the analytics client and assert the call shape.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = vi.hoisted(() => vi.fn());
const mockPrisma = vi.hoisted(() => ({
  client: { findFirst: vi.fn() },
  conversation: { create: vi.fn() },
  auditLog: { create: vi.fn() },
}));
const mockTrack = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock("@/lib/auth", () => ({ auth: mockAuth }));
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/analytics/posthog-server", () => ({
  trackServerEvent: mockTrack,
}));

import { POST } from "../route";

function makeReq(body: unknown): NextRequest {
  return new NextRequest("http://test.local/api/workflows/x/run", {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const params = (slug: string) => ({ params: Promise.resolve({ slug }) });

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.client.findFirst.mockResolvedValue({ id: "client-1", name: "Acme" });
  mockPrisma.conversation.create.mockResolvedValue({ id: "conv-123" });
  mockPrisma.auditLog.create.mockResolvedValue({});
});

describe("POST /api/workflows/[slug]/run", () => {
  it("returns 401 without a session", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(makeReq({ clientId: "c" }), params("cpa-monthly-close"));
    expect(res.status).toBe(401);
  });

  it("returns 404 for an unknown slug", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u-1" } });
    const res = await POST(makeReq({ clientId: "c" }), params("does-not-exist"));
    expect(res.status).toBe(404);
  });

  it("returns 400 when clientId is missing", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u-1" } });
    const res = await POST(
      makeReq({ uploaded_doc_ids: [] }),
      params("cpa-monthly-close"),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/clientId/);
  });

  it("returns 404 when client is not owned by the session user", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u-1" } });
    mockPrisma.client.findFirst.mockResolvedValueOnce(null);
    const res = await POST(
      makeReq({ clientId: "not-mine" }),
      params("cpa-monthly-close"),
    );
    expect(res.status).toBe(404);
  });

  it("creates a conversation, writes an audit log, and fires analytics on success", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u-1" } });
    const res = await POST(
      makeReq({ clientId: "client-1", uploaded_doc_ids: ["d1", "d2"] }),
      params("cpa-monthly-close"),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      conversationId: "conv-123",
      clientId: "client-1",
      slug: "cpa-monthly-close",
    });

    // Conversation creation seeded with two messages (user + assistant).
    expect(mockPrisma.conversation.create).toHaveBeenCalledTimes(1);
    const createArgs = mockPrisma.conversation.create.mock.calls[0][0];
    expect(createArgs.data.clientId).toBe("client-1");
    expect(createArgs.data.userId).toBe("u-1");
    expect(createArgs.data.messages.create).toHaveLength(2);
    expect(createArgs.data.messages.create[0].role).toBe("user");
    expect(createArgs.data.messages.create[0].content).toContain(
      "[WORKFLOW: cpa-monthly-close]",
    );
    expect(createArgs.data.messages.create[1].role).toBe("assistant");

    // Audit log captures the workflow_started event with vertical + uploaded ids.
    expect(mockPrisma.auditLog.create).toHaveBeenCalledTimes(1);
    const auditArgs = mockPrisma.auditLog.create.mock.calls[0][0];
    expect(auditArgs.data.action).toBe("workflow_started");
    expect(auditArgs.data.details.workflowSlug).toBe("cpa-monthly-close");
    expect(auditArgs.data.details.workflowVertical).toBe("cpa");
    expect(auditArgs.data.details.uploadedDocIds).toEqual(["d1", "d2"]);

    // Analytics: fire-and-forget but the call shape is observable.
    expect(mockTrack).toHaveBeenCalledWith(
      "u-1",
      "workflow_started",
      expect.objectContaining({
        workflowSlug: "cpa-monthly-close",
        workflowVertical: "cpa",
        clientId: "client-1",
        conversationId: "conv-123",
      }),
    );
  });

  it.each([
    ["cpa-monthly-close", "cpa"],
    ["hr-onboarding-checklist", "hr"],
    ["legal-engagement-letter-redline", "legal"],
    ["marketing-campaign-brief", "marketing-agency"],
  ])("accepts the built-in workflow %s (vertical=%s)", async (slug, vertical) => {
    mockAuth.mockResolvedValue({ user: { id: "u-1" } });
    const res = await POST(makeReq({ clientId: "client-1" }), params(slug));
    expect(res.status).toBe(200);
    const auditArgs = mockPrisma.auditLog.create.mock.calls[0][0];
    expect(auditArgs.data.details.workflowVertical).toBe(vertical);
  });
});
