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
import { recallArchival } from "@/lib/memory/recall-archival";

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
      case "recall_archival":
        return ok(await recallArchivalHandler(input, ctx));
      case "draft_email":
        return ok(await draftEmail(input, ctx));
      case "generate_document":
        return ok(await generateDocument(input, ctx));
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

  // Trigram similarity (pg_trgm) — much better than ILIKE for fuzzy
  // recall. Returns rows ranked by combined title + content similarity
  // to the query, falling through to recency for ties. The 0.15
  // threshold is empirical: stricter than the default 0.3 because
  // accounting/legal terminology has a lot of common stems
  // ("payable", "invoice", "withholding") and we want partial-match
  // recall, not exact recall.
  //
  // Pinned rows get a +0.5 score boost so they always surface above
  // similarly-relevant non-pinned. The query plan uses the GIN
  // trigram indexes on title + content so this stays sub-100ms even
  // at 1000+ rows per client.
  //
  // Why we kept this on Postgres rather than reaching for a vector DB:
  //   1. Trigram is good-enough for keyword recall on accounting prose.
  //   2. pgvector embeddings are deferred to a later wave — adding
  //      them is cheap when we get there since this function is the
  //      single call site.
  //   3. Zero new infrastructure, zero new SDK keys, zero embedding
  //      cost on the hot path.
  type SearchRow = {
    id: string;
    title: string;
    content: string;
    category: string;
    is_pinned: boolean;
    updated_at: Date;
    score: number;
  };
  const rows = await prisma.$queryRaw<SearchRow[]>`
    SELECT
      id,
      title,
      content,
      category,
      is_pinned,
      updated_at,
      (
        GREATEST(
          similarity(title,   ${query}),
          similarity(content, ${query})
        ) + (CASE WHEN is_pinned THEN 0.5 ELSE 0 END)
      ) AS score
    FROM practiq.client_contexts
    WHERE client_id = ${ctx.clientId}
      AND (
        title   % ${query}
        OR content % ${query}
        OR title   ILIKE ${"%" + query + "%"}
        OR content ILIKE ${"%" + query + "%"}
      )
    ORDER BY score DESC, updated_at DESC
    LIMIT ${limit}
  `;

  if (rows.length === 0) {
    return `No knowledge-base entries matched "${query}". Either the fact isn't stored yet, or the operator hasn't added it.`;
  }

  return rows
    .map((r) => {
      const pinned = r.is_pinned ? " (pinned)" : "";
      const scorePct = Math.round((r.score - (r.is_pinned ? 0.5 : 0)) * 100);
      return `[${r.category}${pinned} · ~${scorePct}% match] ${r.title}\n${r.content.slice(0, 500)}`;
    })
    .join("\n\n");
}

// ── recall_archival ──────────────────────────────────────────────────
//
// Letta-style self-paging primitive (P1-07). Lets the model reach into
// the archive mid-turn when the preloaded context isn't enough.
// Combines hybrid (trigram+cosine) recall over ClientContext with
// time-windowed retrieval over ClientFact. Logged to AuditLog so
// recall calls show up in the regulatory trail.

async function recallArchivalHandler(
  input: Record<string, unknown>,
  ctx: ToolContext,
): Promise<string> {
  const query = String(input.query ?? "").trim();
  if (!query) return "(empty query — refine and try again)";

  // Defense in depth.
  const owned = await prisma.client.findFirst({
    where: { id: ctx.clientId, userId: ctx.userId },
    select: { id: true },
  });
  if (!owned) return "(client not found or not accessible)";

  const limit = Number(input.limit ?? 5) || 5;
  const period = parsePeriod(input.period_from, input.period_to);

  const result = await recallArchival({
    clientId: ctx.clientId,
    userId: ctx.userId,
    query,
    period,
    limit,
  });

  // Audit so we can later answer "did the model actually need to page?"
  await prisma.auditLog.create({
    data: {
      clientId: ctx.clientId,
      userId: ctx.userId,
      action: "tool_recall_archival",
      details: {
        conversationId: ctx.conversationId,
        query,
        contextHits: result.counts.contextHits,
        factHits: result.counts.factHits,
        periodFrom: period?.from?.toISOString(),
        periodTo: period?.to?.toISOString(),
      },
    },
  });

  return result.markdown;
}

/**
 * Parse the optional `period_from` / `period_to` ISO inputs into a
 * `{ from?, to? }` shape. Invalid dates are dropped silently — the
 * model gets a strict-ish surface (it's the LLM, not user input) and
 * the recall just falls back to "all time".
 */
function parsePeriod(
  rawFrom: unknown,
  rawTo: unknown,
): { from?: Date; to?: Date } | undefined {
  const parse = (raw: unknown): Date | undefined => {
    if (typeof raw !== "string" || !raw.trim()) return undefined;
    const d = new Date(raw);
    return isNaN(d.getTime()) ? undefined : d;
  };
  const from = parse(rawFrom);
  const to = parse(rawTo);
  if (!from && !to) return undefined;
  return { from, to };
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

// ── generate_document ────────────────────────────────────────────────
//
// The model calls this when the user asks for a deliverable (financial
// statement, monthly summary, tax memo, etc.). We persist the
// structured proposal (format + title + sections) as an ApprovalItem
// of type "document_draft" — the operator reviews it in the Approval
// Queue, edits as needed, and triggers final file generation. This
// matches the AI-Native Agent paradigm: AI prepares, partner approves.
//
// Until the Python FastAPI doc-render pipeline ships in Phase 2, the
// structured sections live as JSON on the ApprovalItem and the
// "approve" action saves a markdown export to /storage. This means
// `generate_document` is fully functional end-to-end TODAY — it's
// just that the user-facing artifact is a structured outline rather
// than a rendered .xlsx/.docx, until Phase 2.
//
// Previously this tool was registered in tools.ts but had no handler
// — the model would call it and get "Unknown tool: generate_document"
// as a tool_result, breaking the deliverable-prep flow that the
// product thesis is built on. Critical bug; this is the fix.

interface DocumentSection {
  heading: string;
  content: string;
}

async function generateDocument(
  input: Record<string, unknown>,
  ctx: ToolContext,
): Promise<string> {
  const format = String(input.format ?? "").trim().toLowerCase();
  const title = String(input.title ?? "").trim();
  const rawSections = Array.isArray(input.sections) ? input.sections : [];

  if (!format) {
    return "(missing 'format' — must be one of: docx, xlsx, pptx, pdf)";
  }
  if (!["docx", "xlsx", "pptx", "pdf"].includes(format)) {
    return `(unsupported format '${format}' — must be docx, xlsx, pptx, or pdf)`;
  }
  if (!title) {
    return "(missing 'title' — give the document a clear title)";
  }
  if (rawSections.length === 0) {
    return "(missing 'sections' — provide at least one section with heading + content)";
  }

  const sections: DocumentSection[] = rawSections
    .map((s) => {
      if (typeof s !== "object" || s === null) return null;
      const obj = s as Record<string, unknown>;
      const heading = typeof obj.heading === "string" ? obj.heading.trim() : "";
      const content = typeof obj.content === "string" ? obj.content.trim() : "";
      if (!heading || !content) return null;
      return { heading, content };
    })
    .filter((s): s is DocumentSection => s !== null);

  if (sections.length === 0) {
    return "(every section must have non-empty 'heading' and 'content')";
  }

  // Defense in depth.
  const owned = await prisma.client.findFirst({
    where: { id: ctx.clientId, userId: ctx.userId },
    select: { id: true, name: true },
  });
  if (!owned) return "(client not found or not accessible)";

  // Surface document drafts higher in the queue than email drafts —
  // they typically represent more work and the operator wants to
  // see them sooner. Confidence stays moderate (0.75) because
  // structured-content drafts are the model's interpretation of
  // intent, not deterministic output.
  const item = await prisma.approvalItem.create({
    data: {
      clientId: ctx.clientId,
      userId: ctx.userId,
      type: "document_draft",
      title,
      status: "pending_review",
      priority: 50,
      aiConfidence: 0.75,
      content: {
        format,
        title,
        sections,
        sourceConversationId: ctx.conversationId,
        // Word count + section count for the queue list rendering.
        sectionCount: sections.length,
        wordCount: sections.reduce(
          (sum, s) =>
            sum +
            s.heading.split(/\s+/).length +
            s.content.split(/\s+/).length,
          0,
        ),
      } as unknown as Parameters<
        typeof prisma.approvalItem.create
      >[0]["data"]["content"],
      aiNotes:
        `Drafted in chat for ${ctx.clientName}. Format: ${format.toUpperCase()}. ` +
        `Sections: ${sections.length}. ` +
        (format === "docx" || format === "xlsx"
          ? `Operator can download the rendered file from the Approval Queue or via /api/approval-queue/${"<id>"}/download once approved.`
          : `Operator will review the structured outline.`),
    },
    select: { id: true },
  });

  await prisma.auditLog.create({
    data: {
      clientId: ctx.clientId,
      userId: ctx.userId,
      action: "tool_generate_document_drafted",
      details: {
        approvalItemId: item.id,
        conversationId: ctx.conversationId,
        format,
        title,
        sectionCount: sections.length,
      },
    },
  });

  return (
    `Document draft saved as ApprovalItem ${item.id}. ` +
    `Format: ${format.toUpperCase()}. Title: "${title}". ` +
    `${sections.length} section${sections.length === 1 ? "" : "s"}. ` +
    `The operator will review the structured outline and trigger final file ` +
    `generation from the Approval Queue.`
  );
}
