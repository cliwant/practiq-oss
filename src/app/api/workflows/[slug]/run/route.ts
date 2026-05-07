/**
 * POST /api/workflows/[slug]/run
 *
 * Starts a vertical workflow inside a per-client conversation. The route
 * looks up the workflow by slug, creates a new Conversation, and seeds
 * it with the workflow's system_prompt_fragment as the first synthetic
 * user/assistant pair so the existing chat handler picks the framing up
 * from priorMessages on the next turn.
 *
 * Body: { clientId: string, uploaded_doc_ids?: string[] }
 * Returns: { conversationId, clientId, slug }
 *
 * The frontend redirects to /app/clients/{clientId}?conversation={id}
 * after success.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWorkflowBySlug } from "@/lib/workflows/builtin";
import { trackServerEvent } from "@/lib/analytics/posthog-server";

export const runtime = "nodejs";

type Params = { params: Promise<{ slug: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const workflow = getWorkflowBySlug(slug);
  if (!workflow) {
    return NextResponse.json(
      { error: `Unknown workflow: ${slug}` },
      { status: 404 },
    );
  }

  let body: { clientId?: string; uploaded_doc_ids?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const { clientId } = body;
  if (!clientId) {
    return NextResponse.json(
      { error: "clientId is required" },
      { status: 400 },
    );
  }

  // Ownership check.
  const client = await prisma.client.findFirst({
    where: { id: clientId, userId: session.user.id },
    select: { id: true, name: true },
  });
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  // Build the synthetic seed turn. We persist the framing as a "user"
  // message so the chat handler's priorMessages window picks it up
  // (the handler only loads role: user|assistant). Marking the prefix
  // [WORKFLOW: …] makes it easy for both the model and a human reader
  // to recognise this as scaffolding rather than an operator question.
  const seedUser =
    `[WORKFLOW: ${workflow.slug}] ${workflow.name}\n\n` +
    `${workflow.system_prompt_fragment}\n\n` +
    `Suggested tools: ${workflow.suggested_tools.join(", ")}.\n` +
    `When the operator's first real prompt arrives, follow this framing. ` +
    `Acknowledge briefly, list the inputs you need, and wait for them.`;

  const seedAssistant =
    `Workflow loaded: ${workflow.name}.\n\n` +
    `${workflow.description}\n\n` +
    `Inputs I'll need: ${workflow.example_inputs.join("; ")}\n\n` +
    `Upload the documents and tell me which one is which, then I'll start.`;

  const conv = await prisma.conversation.create({
    data: {
      clientId: client.id,
      userId: session.user.id,
      title: workflow.name,
      messages: {
        create: [
          { role: "user", content: seedUser },
          { role: "assistant", content: seedAssistant },
        ],
      },
    },
    select: { id: true },
  });

  // Audit trail: a workflow start is a non-trivial framing event that
  // shapes every subsequent assistant turn. Logging it gives the
  // operator's firm a verifiable record of the prompt scaffolding used.
  await prisma.auditLog.create({
    data: {
      clientId: client.id,
      userId: session.user.id,
      action: "workflow_started",
      details: {
        workflowSlug: workflow.slug,
        workflowVertical: workflow.vertical,
        conversationId: conv.id,
        uploadedDocIds: body.uploaded_doc_ids ?? [],
      },
    },
  });

  // Fire-and-forget analytics.
  trackServerEvent(session.user.id, "workflow_started", {
    workflowSlug: workflow.slug,
    workflowVertical: workflow.vertical,
    clientId: client.id,
    conversationId: conv.id,
  }).catch(() => {});

  return NextResponse.json({
    conversationId: conv.id,
    clientId: client.id,
    slug: workflow.slug,
  });
}
