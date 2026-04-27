import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordApprovalLearning } from "@/lib/pattern-learner";
import { appendApprovalToShadow, renderShadowEntry } from "@/lib/audit-shadow";

type Params = { params: Promise<{ id: string }> };

const VALID_ACTIONS = new Set([
  "approve",
  "reject",
  "modify",
  "dismiss",
  "reset",
]);

/**
 * PATCH /api/approval-queue/[id]
 *
 * Body: { action: "approve" | "reject" | "modify" | "dismiss" | "reset",
 *         reviewerNotes?: string,
 *         content?: object  (only for action:"modify", replaces stored payload) }
 *
 * Every status change is appended to the AuditLog so the full decision
 * trail is traceable for compliance queries later.
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.approvalItem.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: {
    action?: string;
    reviewerNotes?: string;
    content?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.action || !VALID_ACTIONS.has(body.action)) {
    return NextResponse.json(
      {
        error: `action must be one of: ${[...VALID_ACTIONS].join(", ")}`,
      },
      { status: 400 },
    );
  }

  const statusMap: Record<string, string> = {
    approve: "approved",
    reject: "rejected",
    modify: "modified",
    dismiss: "dismissed",
    reset: "pending_review",
  };

  const nextStatus = statusMap[body.action];
  const now = new Date();

  // P1-01: render the Markdown shadow body BEFORE the transaction so we
  // can persist it in AuditLog.details (durable; outlives /tmp on Vercel)
  // AND we know what to append to disk after the tx commits.
  const userEmail =
    typeof session.user.email === "string" ? session.user.email : null;
  const shadowBody = renderShadowEntry({
    approvalItemId: existing.id,
    clientId: existing.clientId,
    userId: session.user.id,
    itemType: existing.type,
    itemTitle: existing.title,
    decision: body.action as
      | "approve"
      | "reject"
      | "modify"
      | "dismiss"
      | "reset",
    originalContent: existing.content,
    modifiedContent:
      body.action === "modify" ? body.content : undefined,
    reviewerNotes: body.reviewerNotes ?? null,
    aiNotes: existing.aiNotes,
    aiConfidence: existing.aiConfidence,
    reviewer: { userId: session.user.id, email: userEmail },
    timestamp: now,
  });

  const updated = await prisma.$transaction(async (tx) => {
    // Prisma's Json typing disallows arbitrary nullable values in update
    // payloads; only include `content` in the patch when we actually want
    // to overwrite it (i.e. modify action).
    const patch: Parameters<typeof tx.approvalItem.update>[0]["data"] = {
      status: nextStatus,
      reviewedAt: body.action === "reset" ? null : now,
      reviewerNotes: body.reviewerNotes ?? existing.reviewerNotes,
    };
    if (body.action === "modify" && body.content !== undefined) {
      patch.content = body.content as object;
    }
    const row = await tx.approvalItem.update({ where: { id }, data: patch });

    await tx.auditLog.create({
      data: {
        clientId: existing.clientId,
        userId: session.user!.id,
        action: `approval_${body.action}`,
        details: {
          approvalItemId: id,
          itemTitle: existing.title,
          itemType: existing.type,
          reviewerNotes: body.reviewerNotes ?? null,
          // P1-01: durable copy of the grep-able shadow Markdown so a
          // serverless cold start that loses /tmp doesn't lose the trail.
          shadowMarkdown: shadowBody,
        },
      },
    });

    return row;
  });

  // P1-01: best-effort fs append. Filesystem is the convenience copy;
  // the AuditLog row above is the system of record. Errors are swallowed.
  void appendApprovalToShadow({
    approvalItemId: existing.id,
    clientId: existing.clientId,
    userId: session.user.id,
    itemType: existing.type,
    itemTitle: existing.title,
    decision: body.action as
      | "approve"
      | "reject"
      | "modify"
      | "dismiss"
      | "reset",
    originalContent: existing.content,
    modifiedContent:
      body.action === "modify" ? body.content : undefined,
    reviewerNotes: body.reviewerNotes ?? null,
    aiNotes: existing.aiNotes,
    aiConfidence: existing.aiConfidence,
    reviewer: { userId: session.user.id, email: userEmail },
    timestamp: now,
  });

  // Pattern-learning hook — fire AFTER the transaction commits so we
  // never block the user's approval action on the learning-side write.
  // Skipped for free/Solo plans inside recordApprovalLearning(); a
  // non-blocking failure also won't surface to the user.
  if (
    body.action === "approve" ||
    body.action === "modify" ||
    body.action === "reject"
  ) {
    void recordApprovalLearning({
      item: {
        id: existing.id,
        userId: session.user.id,
        clientId: existing.clientId,
        type: existing.type,
        title: existing.title,
        content: existing.content,
        aiNotes: existing.aiNotes,
      },
      action: body.action,
      modifiedContent: body.action === "modify" ? body.content : undefined,
      reviewerNotes: body.reviewerNotes ?? null,
    });
  }

  return NextResponse.json({
    item: {
      id: updated.id,
      status: updated.status,
      reviewedAt: updated.reviewedAt?.toISOString() ?? null,
      reviewerNotes: updated.reviewerNotes,
    },
  });
}

/** GET a single item (mostly for refreshing after modification). */
export async function GET(_request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const item = await prisma.approvalItem.findFirst({
    where: { id, userId: session.user.id },
    include: {
      client: { select: { name: true, industry: true, preferences: true } },
    },
  });
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ item });
}
