import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getClaudeProvider,
  type ChatMessage,
  type ContentBlock,
  type ToolDefinition,
} from "@/lib/claude/provider";
import { tools as RAW_TOOL_DEFINITIONS } from "@/lib/claude/tools";
import { executeTool } from "@/lib/claude/tool-handlers";

// The Anthropic SDK's `Tool` type widens `input_schema.properties` to
// `unknown` and `description` to `string | undefined`. Our local
// `ToolDefinition` is structurally compatible at runtime — narrow it
// once at module load so the rest of the file uses our type.
const TOOL_DEFINITIONS: ToolDefinition[] =
  RAW_TOOL_DEFINITIONS as unknown as ToolDefinition[];
import type { Client, ClientContext } from "@/types/domain";

export const runtime = "nodejs";

const MAX_TOKENS = 2048;
/**
 * Cap how many tool-use rounds we'll do per chat turn. Anthropic's
 * docs recommend ≤5; we set 4 because real workflows in this product
 * never chain more than a couple of tools (search → draft, or
 * search → search → draft). This is a soft circuit-breaker against
 * the model getting stuck in a tool loop.
 */
const MAX_TOOL_ROUNDS = 4;

/**
 * POST /api/chat
 *
 * Per-client chat backed by the Anthropic SDK. The assistant is given:
 *   - Client profile (name, industry, relationship length, preferences)
 *   - Recent knowledge-base entries (ClientContext), pinned first
 *   - Rolling conversation history (last ~20 turns)
 *
 * Streams Server-Sent Events back to the browser. First event carries the
 * conversationId so the client can keep appending to the same thread.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // No hard API-key requirement anymore — the provider selects SDK or
  // CLI transparently based on env (see src/lib/claude/provider.ts).

  let body: { clientId?: string; message?: string; conversationId?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { clientId, message, conversationId } = body;
  if (!clientId || !message) {
    return new Response(
      JSON.stringify({ error: "clientId and message are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // Ownership check: client must belong to the authed user.
  const dbClient = await prisma.client.findFirst({
    where: { id: clientId, userId: session.user.id },
  });
  if (!dbClient) {
    return new Response(JSON.stringify({ error: "Client not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Pinned contexts first (always relevant), then recent updates. Keep the
  // window small — we copy content verbatim into the system prompt and
  // long contexts dominate the token budget fast.
  const contexts = await prisma.clientContext.findMany({
    where: { clientId },
    orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
    take: 10,
  });

  // Resume or create the conversation thread.
  let convId = conversationId;
  let priorMessages: { role: "user" | "assistant"; content: string }[] = [];
  if (convId) {
    const owned = await prisma.conversation.findFirst({
      where: { id: convId, userId: session.user.id, clientId },
    });
    if (!owned) {
      return new Response(
        JSON.stringify({ error: "Conversation not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }
    const rows = await prisma.conversationMessage.findMany({
      where: { conversationId: convId },
      orderBy: { createdAt: "asc" },
      take: 20,
    });
    priorMessages = rows.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
  } else {
    const conv = await prisma.conversation.create({
      data: {
        clientId,
        userId: session.user.id,
        title: message.slice(0, 50),
      },
    });
    convId = conv.id;
  }

  // Persist the user turn immediately so refresh mid-stream leaves a trail.
  await prisma.conversationMessage.create({
    data: { conversationId: convId, role: "user", content: message },
  });

  const systemPrompt = renderSystemPrompt(dbClient, contexts);
  // Working copy of the message history used by the tool-use loop.
  // Starts as the prior conversation + the new user turn. Grows by
  // up to 2 messages per tool round (assistant w/ tool_use, then
  // user w/ tool_result).
  const workingMessages: ChatMessage[] = [
    ...priorMessages,
    { role: "user", content: message },
  ];

  // SSE stream wrapping the SDK's async iterator.
  //
  // `send` is defensive: if the client disconnects mid-stream (browser
  // navigates away, Playwright closes the page, Turbopack HMR, etc.) the
  // underlying controller becomes closed and further enqueues throw
  // "Invalid state: Controller is already closed". We swallow that and
  // set a flag so the rest of the stream loop exits cleanly.
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let clientGone = false;
      const send = (payload: unknown) => {
        if (clientGone) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch (err) {
          // ERR_INVALID_STATE / "Controller is already closed". The
          // consumer disconnected. Finish persisting what we have and
          // stop sending.
          clientGone = true;
          if (err instanceof Error && !/already closed/i.test(err.message)) {
            console.warn("SSE enqueue failed:", err.message);
          }
        }
      };

      send({ type: "conversation", conversationId: convId });

      // Aggregate text across all tool-use rounds — the operator sees
      // it as a single assistant turn even when the model interleaved
      // tool calls. We persist this to ConversationMessage.content and
      // record any tool calls to ConversationMessage.toolCalls.
      let aggregateText = "";
      let totalDeltas = 0;
      const toolCallTrace: Array<{
        id: string;
        name: string;
        input: Record<string, unknown>;
        result: string;
        isError: boolean;
      }> = [];
      let providerName = "(?)";
      try {
        const provider = getClaudeProvider();
        providerName = provider.name;

        // Tool-use loop. Each iteration is one stream from the model.
        // We exit when the model finishes without requesting a tool
        // (stopReason !== "tool_use") or hit MAX_TOOL_ROUNDS.
        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          // Per-round capture of text + tool_use blocks for the
          // assistant turn we'll need to feed back if the model wants
          // to keep using tools.
          let roundText = "";
          const roundToolUses: Array<{
            id: string;
            name: string;
            input: Record<string, unknown>;
          }> = [];
          let stopReason: string | undefined;

          for await (const ev of provider.stream({
            system: systemPrompt,
            messages: workingMessages,
            maxTokens: MAX_TOKENS,
            tools: TOOL_DEFINITIONS,
          })) {
            if (ev.type === "delta") {
              totalDeltas++;
              roundText += ev.text;
              aggregateText += ev.text;
              send({ type: "text", text: ev.text });
            } else if (ev.type === "tool_use") {
              roundToolUses.push({
                id: ev.id,
                name: ev.name,
                input: ev.input,
              });
              // Tell the UI the agent is acting so it can show a
              // "thinking" / "running tool" indicator if it wants.
              send({
                type: "tool_use",
                tool: ev.name,
                input: ev.input,
              });
            } else if (ev.type === "error") {
              console.error(`[chat] provider error: ${ev.error}`);
              send({ type: "error", error: ev.error });
            } else if (ev.type === "done") {
              stopReason = ev.stopReason;
              if (!roundText && ev.text) {
                // CLI path edge case — provider may emit a single done
                // with full text instead of streamed deltas.
                roundText = ev.text;
                aggregateText += ev.text;
                send({ type: "text", text: ev.text });
              }
            }
          }

          // No tool calls → we're done. Save the assistant turn outside
          // the loop and finish.
          if (roundToolUses.length === 0) {
            break;
          }

          // The model wants to use one or more tools. Build the
          // assistant turn (text + tool_use blocks), execute the tools,
          // append a user turn with the tool_result blocks, and re-loop.
          const assistantBlocks: ContentBlock[] = [];
          if (roundText) {
            assistantBlocks.push({ type: "text", text: roundText });
          }
          for (const tu of roundToolUses) {
            assistantBlocks.push({
              type: "tool_use",
              id: tu.id,
              name: tu.name,
              input: tu.input,
            });
          }
          workingMessages.push({
            role: "assistant",
            content: assistantBlocks,
          });

          const resultBlocks: ContentBlock[] = [];
          for (const tu of roundToolUses) {
            const result = await executeTool(tu.name, tu.input, {
              userId: session.user.id,
              clientId: dbClient.id,
              clientName: dbClient.name,
              conversationId: convId,
            });
            resultBlocks.push({
              type: "tool_result",
              tool_use_id: tu.id,
              content: result.content,
              is_error: result.isError || undefined,
            });
            toolCallTrace.push({
              id: tu.id,
              name: tu.name,
              input: tu.input,
              result: result.content,
              isError: result.isError,
            });
            // Surface tool result to UI so the user can see what the
            // tool returned (or what the agent just did).
            send({
              type: "tool_result",
              tool: tu.name,
              isError: result.isError,
            });
          }
          workingMessages.push({ role: "user", content: resultBlocks });

          // If the model gave us a stopReason that isn't "tool_use" but
          // emitted tools anyway (shouldn't happen, but defensive), treat
          // it as a no-op and break.
          if (stopReason && stopReason !== "tool_use") {
            break;
          }
        }

        // One-line per-chat log for observability (kept intentionally —
        // helps diagnose CLI vs SDK routing + token usage during dev).
        console.log(
          `[chat] provider=${providerName} deltas=${totalDeltas} tools=${toolCallTrace.length} fullLen=${aggregateText.length} client=${dbClient.name}`,
        );

        if (aggregateText || toolCallTrace.length > 0) {
          // Truncate long tool results so we don't blow up the JSON
          // payload in storage; the audit log keeps the full version.
          const persistedToolCalls =
            toolCallTrace.length > 0
              ? toolCallTrace.map((t) => ({
                  id: t.id,
                  name: t.name,
                  input: t.input,
                  result: t.result.slice(0, 1000),
                  isError: t.isError,
                }))
              : null;
          await prisma.conversationMessage.create({
            data: {
              conversationId: convId,
              role: "assistant",
              content: aggregateText,
              // Prisma JSON column accepts plain JS values as long as they
              // are JSON-serializable; cast through unknown to satisfy the
              // narrow `InputJsonValue` type without `any`.
              toolCalls: persistedToolCalls as unknown as Parameters<
                typeof prisma.conversationMessage.create
              >[0]["data"]["toolCalls"],
            },
          });
        }

        send({ type: "done" });
      } catch (err) {
        console.error("Chat stream failed:", err);
        send({
          type: "error",
          error: err instanceof Error ? err.message : String(err),
        });
      } finally {
        if (!clientGone) {
          try {
            controller.close();
          } catch {
            // already closed — nothing to do
          }
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

// ─── System prompt builder ───────────────────────────────────────────────
// Kept local (not shared with src/lib/claude/system-prompt.ts) because we
// need the Prisma row shape (Json preferences, DateTime fields) rather than
// the frontend domain type.
function renderSystemPrompt(
  client: {
    name: string;
    industry: string;
    userRole: string;
    relationshipMonths: number;
    preferences: unknown;
  },
  contexts: Array<{
    title: string;
    content: string;
    category: string;
    isPinned: boolean;
  }>,
): string {
  const prefs = (client.preferences ?? {}) as Partial<{
    reportTone: string;
    preferredFormats: string[];
    brandColor: string;
    contactEmail: string;
  }>;
  const tone = prefs.reportTone ?? "professional";
  const formats = prefs.preferredFormats?.join(", ") ?? "docx, xlsx";

  const pinned = contexts.filter((c) => c.isPinned);
  const recent = contexts.filter((c) => !c.isPinned);

  const renderCtx = (list: typeof contexts) =>
    list.length === 0
      ? "(none)"
      : list
          .map(
            (c) =>
              `- [${c.category}] ${c.title}\n  ${c.content.slice(0, 500)}`,
          )
          .join("\n");

  return `You are the AI-native agent embedded in the ${client.name} workspace, acting on behalf of a Fractional ${client.userRole}.

This client is one of many the operator manages. Stay strictly scoped to ${client.name}: never reference other clients, never leak their data.

━━━ Client profile ━━━
• Company: ${client.name}
• Industry: ${client.industry}
• Relationship length: ${client.relationshipMonths} months
• Report tone: ${tone}
• Preferred deliverable formats: ${formats}

━━━ Pinned knowledge (always relevant) ━━━
${renderCtx(pinned)}

━━━ Recent knowledge ━━━
${renderCtx(recent)}

━━━ Your behavior ━━━
1. Answer using this client's specific context. Cite entries by title when useful.
2. When you need data you don't have, ask the operator or suggest they upload a source document.
3. Prepare deliverables (drafts, memos, reminders) proactively when the conversation implies one is needed. Offer the draft; let the operator approve.
4. Maintain consistency with prior decisions recorded in the knowledge base. Flag contradictions explicitly.
5. Never produce regulatory or legal judgments. Defer those to the human professional.
6. Keep responses tight. Prefer structure (bullets, short sections) over long prose.`;
}

// Re-export types so the route stays type-safe against the domain model
// even though the system prompt consumes the Prisma shape directly.
export type { Client, ClientContext };
