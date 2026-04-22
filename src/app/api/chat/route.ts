import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { anthropic } from "@/lib/claude/client";
import type { Client, ClientContext } from "@/types/domain";

export const runtime = "nodejs";

// Current stable Sonnet. Pinned on routes so runtime swaps stay deterministic.
const MODEL = "claude-sonnet-4-5-20250929";
const MAX_TOKENS = 2048;

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

  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({
        error:
          "ANTHROPIC_API_KEY is not set. Add it to the studio root .env.local.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

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
  const messages = [
    ...priorMessages,
    { role: "user" as const, content: message },
  ];

  // SSE stream wrapping the SDK's async iterator.
  const encoder = new TextEncoder();
  const send = (controller: ReadableStreamDefaultController, payload: unknown) =>
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));

  const stream = new ReadableStream({
    async start(controller) {
      send(controller, { type: "conversation", conversationId: convId });

      let fullResponse = "";
      try {
        const sdkStream = anthropic.messages.stream({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: systemPrompt,
          messages,
        });

        for await (const event of sdkStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            fullResponse += event.delta.text;
            send(controller, { type: "text", text: event.delta.text });
          }
        }

        if (fullResponse) {
          await prisma.conversationMessage.create({
            data: {
              conversationId: convId,
              role: "assistant",
              content: fullResponse,
            },
          });
        }

        send(controller, { type: "done" });
      } catch (err) {
        console.error("Chat stream failed:", err);
        send(controller, {
          type: "error",
          error: err instanceof Error ? err.message : String(err),
        });
      } finally {
        controller.close();
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
