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
import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { recallArchival } from "@/lib/memory/recall-archival";
import { hybridSearchKnowledgeBase } from "@/lib/hybrid-search";
import { extractDocument, findInPages } from "@/lib/documents/extract";
import { applyTrackedChanges, type Edit } from "@/lib/docx/trackedChanges";

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
      case "read_document":
        return ok(await readDocument(input, ctx));
      case "find_in_document":
        return ok(await findInDocument(input, ctx));
      case "edit_document":
        return ok(await editDocument(input, ctx));
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

  // RUN 24 audit fix #10: route through `hybridSearchKnowledgeBase`
  // (P1-05) so chat sees BOTH trigram + pgvector cosine signals
  // instead of trigram alone. Embeddings have been backfilled in
  // production (RUN 12), so the cosine pass actually fires now.
  // The hybrid module already handles ownership checks + the 0.4×
  // trigram + 0.6× cosine score blend + graceful degradation when
  // the embedding service is down.
  const hits = await hybridSearchKnowledgeBase({
    clientId: ctx.clientId,
    userId: ctx.userId,
    query,
    limit,
  }).catch((err) => {
    console.warn(
      `[tool:search_knowledge_base] hybrid search failed, returning empty: ${err instanceof Error ? err.message : String(err)}`,
    );
    return [] as Awaited<ReturnType<typeof hybridSearchKnowledgeBase>>;
  });

  if (hits.length === 0) {
    return `No knowledge-base entries matched "${query}". Either the fact isn't stored yet, or the operator hasn't added it.`;
  }

  return hits
    .map((r) => {
      const scorePct = Math.round(r.score * 100);
      return `[~${scorePct}% match] ${r.title}\n${r.content.slice(0, 500)}`;
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

// ── read_document / find_in_document / edit_document ─────────────────
//
// These three tools replace any vector-chunk RAG layer for documents
// the operator uploaded inside the client workspace. Boutique
// professional docs (engagement letters, lease agreements, prior-year
// returns) are typically <100 pages — full-text-with-page-tags + a
// precise find primitive beat embedding similarity on accuracy and
// auditability. Citations land on a real page number, not a fuzzy
// chunk score.

async function loadOwnedFileUpload(
  docId: string,
  ctx: ToolContext,
): Promise<{ path: string; filename: string } | null> {
  // Defense in depth — verify the upload belongs to this user AND this
  // client. Cross-client doc reads are a leak vector if the chat ever
  // resolves doc_id from a different workspace.
  const upload = await prisma.fileUpload.findFirst({
    where: { id: docId, userId: ctx.userId, clientId: ctx.clientId },
    select: { filePath: true, originalFilename: true },
  });
  if (!upload) return null;
  return { path: upload.filePath, filename: upload.originalFilename };
}

async function readDocument(
  input: Record<string, unknown>,
  ctx: ToolContext,
): Promise<string> {
  const docId = String(input.doc_id ?? "").trim();
  if (!docId) return "(missing 'doc_id')";

  const owned = await loadOwnedFileUpload(docId, ctx);
  if (!owned) return "(document not found or not accessible)";

  let extracted;
  try {
    extracted = await extractDocument(owned.path);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return `(extraction failed for ${owned.filename}: ${msg})`;
  }

  const pageFrom = clampPage(input.page_from, 1, extracted.pages.length);
  const pageTo = clampPage(
    input.page_to,
    pageFrom,
    extracted.pages.length,
  );

  const slice = extracted.pages
    .slice(pageFrom - 1, pageTo)
    .map((p, i) => `[Page ${pageFrom + i}]\n${p}`)
    .join("\n\n");

  return (
    `Document: ${owned.filename} (${extracted.format}, ${extracted.pages.length} pages total).\n` +
    `Showing pages ${pageFrom}-${pageTo}.\n\n${slice}`
  );
}

function clampPage(raw: unknown, lo: number, hi: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < lo) return lo;
  if (n > hi) return hi;
  return Math.floor(n);
}

async function findInDocument(
  input: Record<string, unknown>,
  ctx: ToolContext,
): Promise<string> {
  const docId = String(input.doc_id ?? "").trim();
  const query = String(input.query ?? "").trim();
  if (!docId) return "(missing 'doc_id')";
  if (!query) return "(missing 'query')";

  const maxResults = Math.min(
    Math.max(Number(input.max_results ?? 5) || 5, 1),
    20,
  );

  const owned = await loadOwnedFileUpload(docId, ctx);
  if (!owned) return "(document not found or not accessible)";

  let extracted;
  try {
    extracted = await extractDocument(owned.path);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return `(extraction failed for ${owned.filename}: ${msg})`;
  }

  const hits = findInPages(extracted.pages, query, maxResults);
  if (hits.length === 0) {
    return `No matches for "${query}" in ${owned.filename}.`;
  }

  const lines = hits.map(
    (h) =>
      `[Page ${h.page}] ...${h.before}**${h.match}**${h.after}...`,
  );
  return `Found ${hits.length} match${hits.length === 1 ? "" : "es"} for "${query}" in ${owned.filename}:\n\n${lines.join("\n\n")}`;
}

async function editDocument(
  input: Record<string, unknown>,
  ctx: ToolContext,
): Promise<string> {
  const docId = String(input.doc_id ?? "").trim();
  const title = String(input.title ?? "").trim();
  const rawEdits = Array.isArray(input.edits) ? input.edits : [];

  if (!docId) return "(missing 'doc_id')";
  if (!title) return "(missing 'title')";
  if (rawEdits.length === 0) return "(missing 'edits' — provide at least one)";

  const edits: Edit[] = [];
  for (const raw of rawEdits) {
    if (typeof raw !== "object" || raw === null) continue;
    const o = raw as Record<string, unknown>;
    const find = typeof o.find === "string" ? o.find : "";
    const replace = typeof o.replace === "string" ? o.replace : "";
    const reason = typeof o.reason === "string" ? o.reason : "";
    if (!find || !reason) continue;
    edits.push({
      find,
      replace,
      reason,
      context_before:
        typeof o.context_before === "string" ? o.context_before : undefined,
      context_after:
        typeof o.context_after === "string" ? o.context_after : undefined,
    });
  }
  if (edits.length === 0) {
    return "(every edit needs non-empty 'find' and 'reason')";
  }

  const owned = await loadOwnedFileUpload(docId, ctx);
  if (!owned) return "(document not found or not accessible)";
  if (!owned.path.toLowerCase().endsWith(".docx")) {
    return `(edit_document only supports .docx; ${owned.filename} is not)`;
  }

  let buffer: Buffer;
  try {
    buffer = await fs.readFile(owned.path);
  } catch (e) {
    return `(could not read source: ${e instanceof Error ? e.message : String(e)})`;
  }

  let result;
  try {
    result = applyTrackedChanges(buffer, edits, {
      author: `${ctx.clientName} Agent`,
    });
  } catch (e) {
    return `(tracked-changes engine failed: ${e instanceof Error ? e.message : String(e)})`;
  }

  // Persist redlined output under a per-client outputs dir.
  const outDir = path.join(
    process.env.STORAGE_ROOT ?? "./storage",
    "outputs",
    ctx.clientId,
  );
  await fs.mkdir(outDir, { recursive: true });
  const outName = `${slugify(title)}-${Date.now()}.docx`;
  const outPath = path.join(outDir, outName);
  await fs.writeFile(outPath, result.buffer);

  const item = await prisma.approvalItem.create({
    data: {
      clientId: ctx.clientId,
      userId: ctx.userId,
      type: "tracked_changes_docx",
      title,
      status: "pending_review",
      priority: 60,
      aiConfidence: 0.8,
      content: {
        sourceDocId: docId,
        sourceFilename: owned.filename,
        outputPath: outPath,
        applied: result.applied.map((e) => ({
          find: e.find,
          replace: e.replace,
          reason: e.reason,
        })),
        skipped: result.skipped.map((s) => ({
          reason: s.reason,
          edit: { find: s.edit.find, reason: s.edit.reason },
        })),
        sourceConversationId: ctx.conversationId,
      } as unknown as Parameters<
        typeof prisma.approvalItem.create
      >[0]["data"]["content"],
      aiNotes:
        `Redlined ${owned.filename} with ${result.applied.length} of ${edits.length} edit${edits.length === 1 ? "" : "s"}. ` +
        (result.skipped.length > 0
          ? `${result.skipped.length} skipped (text not found in a single run).`
          : `All edits landed.`),
    },
    select: { id: true },
  });

  await prisma.auditLog.create({
    data: {
      clientId: ctx.clientId,
      userId: ctx.userId,
      action: "tool_edit_document_drafted",
      details: {
        approvalItemId: item.id,
        conversationId: ctx.conversationId,
        sourceDocId: docId,
        editsRequested: edits.length,
        editsApplied: result.applied.length,
        editsSkipped: result.skipped.length,
      },
    },
  });

  const skippedSummary =
    result.skipped.length > 0
      ? ` ${result.skipped.length} skipped (text not found in a single run — see ApprovalItem for details).`
      : "";

  return (
    `Redlined draft saved as ApprovalItem ${item.id}. ` +
    `Source: ${owned.filename}. Edits applied: ${result.applied.length}/${edits.length}.${skippedSummary} ` +
    `The operator will review each tracked change side-by-side and accept or reject.`
  );
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}
