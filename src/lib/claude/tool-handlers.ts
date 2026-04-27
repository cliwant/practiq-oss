/**
 * Tool handlers — the server-side executors for each tool the model
 * can call from the chat route.
 *
 * Anthropic's Tool Use protocol is a multi-turn loop:
 *
 *   1. Model emits a `tool_use` content block with id+name+input.
 *   2. Server runs the matching handler.
 *   3. Server appends a `user` message with a `tool_result` block
 *      keyed to the same `tool_use_id`.
 *   4. Model continues with that result in context.
 *
 * Every handler is keyed to a tool name in `tools.ts`, returns a string
 * (the text the model will see as the tool result), and is scoped to a
 * single client (the chat route already verified ownership before
 * spinning up the loop).
 *
 * Critical safety properties:
 *   - All DB queries scope by `clientId` AND `userId`. Even though the
 *     route already gated on ownership, defense-in-depth means a tool
 *     handler that's reused elsewhere can't accidentally leak.
 *   - Side-effecting tools (`draft_email`) create *pending* artifacts
 *     in the Approval Queue, never directly send/dispatch. The human
 *     approves before anything leaves the system.
 *   - Errors are caught and returned as the tool result with
 *     `is_error: true` so the model can recover gracefully instead of
 *     the whole stream blowing up.
 */
import { prisma } from "@/lib/prisma";

export interface ToolContext {
  /** Authed user id — used for both ownership checks and audit trails. */
  userId: string;
  /** Client whose workspace the chat is running in. */
  clientId: string;
  /** Client display name (used to title the email_draft approval item). */
  clientName: string;
  /** Conversation id that triggered the tool call (for audit linking). */
  conversationId: string;
}

export interface ToolExecutionResult {
  /** Plain-text result fed back to the model. */
  content: string;
  /** Mark errors so the model knows it failed and can recover. */
  isError: boolean;
}

/**
 * Top-level dispatcher. Returns a tool_result content payload as
 * plain text. Always succeeds — handler errors are wrapped as
 * `is_error: true` so the stream loop never crashes.
 */
export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolExecutionResult> {
  try {
    switch (name) {
      case "search_knowledge_base":
        return ok(await searchKnowledgeBase(input, ctx));
      case "draft_email":
        return ok(await draftEmail(input, ctx));
      default:
        return err(`Unknown tool: ${name}`);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[tool ${name}] failed:`, e);
    return err(`Tool ${name} failed: ${msg}`);
  }
}

function ok(content: string): ToolExecutionResult {
  return { content, isError: false };
}
function err(content: string): ToolExecutionResult {
  return { content, isError: true };
}

// ── search_knowledge_base ────────────────────────────────────────────
//
// Why we need this: the chat system prompt only inlines the top 10
// pinned/recent contexts. If the operator has accumulated 50+ entries,
// the model can't see all of them. This tool lets it pull additional
// entries by keyword on demand, scoped to the current client.
//
// Implementation: Postgres ILIKE on title + content. Keyword match is
// fine for the MVP — pgvector is deferred per ARCHITECTURE.md. We
// return up to `limit` rows, oldest pinned first, then newest.

async function searchKnowledgeBase(
  input: Record<string, unknown>,
  ctx: ToolContext,
): Promise<string> {
  const query = String(input.query ?? "").trim();
  if (!query) return "(empty query — refine and try again)";

  const limit = Math.min(
    Math.max(Number(input.limit ?? 5) || 5, 1),
    20, // hard cap so the model doesn't ask for a thousand
  );

  // Defense in depth: also assert the client belongs to this user.
  const owned = await prisma.client.findFirst({
    where: { id: ctx.clientId, userId: ctx.userId },
    select: { id: true },
  });
  if (!owned) return "(client not found or not accessible)";

  // Split into 1-3 word fragments; require at least one to appear in
  // either title or content. ILIKE is case-insensitive.
  const words = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length >= 2)
    .slice(0, 5);
  const orClauses =
    words.length > 0
      ? words.flatMap((w) => [
          { title: { contains: w, mode: "insensitive" as const } },
          { content: { contains: w, mode: "insensitive" as const } },
        ])
      : [{ content: { contains: query, mode: "insensitive" as const } }];

  const results = await prisma.clientContext.findMany({
    where: {
      clientId: ctx.clientId,
      OR: orClauses,
    },
    orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
    take: limit,
    select: {
      title: true,
      content: true,
      category: true,
      isPinned: true,
      updatedAt: true,
    },
  });

  if (results.length === 0) {
    return `No knowledge-base entries matched "${query}". Either the fact isn't stored yet, or the operator hasn't added it.`;
  }

  return results
    .map((r) => {
      const pinned = r.isPinned ? " (pinned)" : "";
      return `[${r.category}${pinned}] ${r.title}\n${r.content.slice(0, 500)}`;
    })
    .join("\n\n");
}

// ── draft_email ──────────────────────────────────────────────────────
//
// The model decides "this conversation needs an email" and calls this
// tool. We persist the draft as an `ApprovalItem` of type "email_draft"
// — the operator reviews it in the Approval Queue and decides whether
// to send. We never actually send from this handler.
//
// Returns a confirmation string so the model can keep the conversation
// flowing ("OK I drafted that — it's in your queue. Want me to also
// pull the contract?").

async function draftEmail(
  input: Record<string, unknown>,
  ctx: ToolContext,
): Promise<string> {
  const to = String(input.to ?? "").trim();
  const subject = String(input.subject ?? "").trim();
  const body = String(input.body ?? "").trim();

  if (!to) return "(missing 'to' — cannot draft email without a recipient)";
  if (!subject) return "(missing 'subject' — give the email a clear subject)";
  if (!body) return "(missing 'body' — provide the email content)";

  // Defense in depth.
  const owned = await prisma.client.findFirst({
    where: { id: ctx.clientId, userId: ctx.userId },
    select: { id: true, name: true },
  });
  if (!owned) return "(client not found or not accessible)";

  const item = await prisma.approvalItem.create({
    data: {
      clientId: ctx.clientId,
      userId: ctx.userId,
      type: "email_draft",
      title: subject,
      status: "pending_review",
      // Email drafts are user-initiated (chat), so default priority is
      // medium-low — the operator already knows the chat happened.
      priority: 30,
      aiConfidence: 0.85,
      content: {
        to,
        subject,
        body,
        // Optional cc as a string array if the model passed it.
        // Drop null/undefined before stringifying — `String(null)`
        // returns the literal "null" which would otherwise leak in.
        cc: Array.isArray(input.cc)
          ? (input.cc as unknown[])
              .filter((v) => v !== null && v !== undefined)
              .map((v) => String(v))
              .filter((v) => v.length > 0)
          : undefined,
        sourceConversationId: ctx.conversationId,
      },
      aiNotes: `Draft requested in chat for ${ctx.clientName}. Recipient: ${to}.`,
    },
    select: { id: true },
  });

  // Audit so the regulatory trail captures the chat → draft chain.
  await prisma.auditLog.create({
    data: {
      clientId: ctx.clientId,
      userId: ctx.userId,
      action: "tool_draft_email_created",
      details: {
        approvalItemId: item.id,
        conversationId: ctx.conversationId,
        to,
        subject,
        bodyChars: body.length,
      },
    },
  });

  return `Email draft saved as ApprovalItem ${item.id}. To: ${to}. Subject: "${subject}". The operator will review it in the Approval Queue.`;
}
