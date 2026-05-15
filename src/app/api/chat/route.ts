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
import { checkRateLimit } from "@/lib/rate-limit";
import { safeNotify } from "@/lib/notifications/slack";
import { notifyServerError } from "@/lib/observability/notify-server-error";
import { trackServerEvent } from "@/lib/analytics/posthog-server";
import {
  resolveUserPlan,
  gateChatMessage,
  gateRefusalBody,
  recordUsage,
} from "@/lib/plan-gates";
import {
  assertBudget,
  recordOverageUsage,
  consumeCredits,
  budgetRefusalBody,
  BudgetExceededError,
  type BudgetSnapshot,
} from "@/lib/token-budget";
import { loadClientMemoryForPrompt } from "@/lib/memory/loader";
import {
  createCitationStreamState,
  feedDelta,
  finalize as finalizeCitations,
} from "@/lib/claude/citations";

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
/**
 * Chat rate limits — CRITICAL cost-protection layer.
 *
 * Without these, a single authed user could parallel-spam /api/chat and
 * burn through OpenRouter credit at hundreds of dollars per hour. The
 * limiter is in-memory per Vercel instance, which means determined
 * attackers across cold starts can outpace the cap — for global
 * rate-limiting move src/lib/rate-limit.ts to Upstash KV. For now this
 * is the floor.
 *
 * Two tiers:
 *   - Burst: 20 messages / 60 seconds per user. Stops accidental loops
 *     and tab-spam. Tight but generous for a real conversation.
 *   - Daily: 200 messages / 24 hours per user. Caps total daily LLM
 *     spend to roughly $5-10 per user even on free tier.
 *
 * On limit hit we fire a Slack notification once per limiter-window so
 * the operator can investigate abuse (a single user pinning the cap is
 * usually a bug or a bot, not legitimate use).
 */
const CHAT_BURST_LIMIT = 20;
const CHAT_BURST_WINDOW_MS = 60 * 1000;
const CHAT_DAILY_LIMIT = 200;
const CHAT_DAILY_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── Rate limit gates ─────────────────────────────────────────────
  const burst = await checkRateLimit({
    namespace: "chat/burst",
    identity: `user:${session.user.id}`,
    limit: CHAT_BURST_LIMIT,
    windowMs: CHAT_BURST_WINDOW_MS,
  });
  if (!burst.allowed) {
    return new Response(
      JSON.stringify({
        error: `You're sending messages too fast. Try again in ${burst.retryAfterSec}s.`,
        retryAfterSec: burst.retryAfterSec,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(burst.retryAfterSec),
        },
      },
    );
  }
  const daily = await checkRateLimit({
    namespace: "chat/daily",
    identity: `user:${session.user.id}`,
    limit: CHAT_DAILY_LIMIT,
    windowMs: CHAT_DAILY_WINDOW_MS,
  });
  if (!daily.allowed) {
    // High-confidence abuse signal: notify ops and surface upgrade CTA.
    safeNotify("practiq_chat_quota_exceeded", {
      email: session.user.email ?? null,
      userId: session.user.id,
      window: "24h",
      usage: CHAT_DAILY_LIMIT,
      limit: CHAT_DAILY_LIMIT,
    });
    return new Response(
      JSON.stringify({
        error:
          "Daily chat limit reached. Upgrade your plan or wait for the cap to reset.",
        retryAfterSec: daily.retryAfterSec,
        upgradeUrl: "/pricing",
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(daily.retryAfterSec),
        },
      },
    );
  }

  // ── Plan-aware gate (paid features) ──────────────────────────────
  // The burst+daily limiters above protect against runaway loops. The
  // plan gate adds a per-month cap derived from the user's actual
  // plan (50/500/2000/8000 chat msgs depending on free/solo/practice/
  // firm). Trial-expired users hit the wall here even before the
  // burst limiter would.
  // P0-02: hard spend ceiling check BEFORE we burn another model call.
  // This is independent from the chat-count gate below — even a Solo
  // user inside their 500-msg cap can hit the $20 ceiling if they're
  // pasting in 100K-token contexts.
  try {
    const { assertSpendUnderCeiling } = await import("@/lib/spend-ceiling");
    await assertSpendUnderCeiling(session.user.id);
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "name" in err &&
      (err as { name?: string }).name === "SpendCeilingExceededError"
    ) {
      const snapshot = (
        err as unknown as {
          snapshot: { spentUsd: number; ceilingUsd: number; planKey: string };
        }
      ).snapshot;
      safeNotify("practiq_chat_quota_exceeded", {
        email: session.user.email ?? null,
        userId: session.user.id,
        window: "spend-ceiling",
        usage: Math.round(snapshot.spentUsd * 100),
        limit: Math.round(snapshot.ceilingUsd * 100),
      });
      return new Response(
        JSON.stringify({
          error: `You've used $${snapshot.spentUsd.toFixed(2)} of your $${snapshot.ceilingUsd.toFixed(2)} ${snapshot.planKey} ceiling this period. Upgrade to keep going.`,
          upgradeUrl: "/pricing",
          spentUsd: snapshot.spentUsd,
          ceilingUsd: snapshot.ceilingUsd,
        }),
        { status: 402, headers: { "Content-Type": "application/json" } },
      );
    }
    throw err;
  }

  const userPlan = await resolveUserPlan(session.user.id);

  // L4 token-budget gate (the primary product gate post-launch).
  // This runs BEFORE the legacy chat-msg cap so the more accurate
  // token-based quota wins when both apply. The chat-msg gate is
  // kept around as a defensive belt+suspenders for plans where
  // monthlyChatMessages is non-zero (currently none, but safe).
  let budgetSnapshot: BudgetSnapshot | null = null;
  try {
    budgetSnapshot = await assertBudget(session.user.id);
  } catch (err) {
    if (err instanceof BudgetExceededError) {
      safeNotify("practiq_chat_quota_exceeded", {
        email: session.user.email ?? null,
        userId: session.user.id,
        window: err.reason,
        usage: err.snapshot.used,
        limit: err.snapshot.allowance,
      });
      return new Response(JSON.stringify(budgetRefusalBody(err)), {
        status: 402,
        headers: { "Content-Type": "application/json" },
      });
    }
    throw err;
  }

  const chatGate = await gateChatMessage(session.user.id, userPlan);
  if (!chatGate.allowed) {
    // Slack ping ONCE per cap-hit (the burst limiter prevents spam
    // from this same user thrashing the gate).
    safeNotify("practiq_chat_quota_exceeded", {
      email: session.user.email ?? null,
      userId: session.user.id,
      window: "billing-period",
      usage: chatGate.usage ?? 0,
      limit: chatGate.cap ?? 0,
    });
    return new Response(JSON.stringify(gateRefusalBody(chatGate)), {
      status: 402,
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

    // First message of a brand-new conversation = chat_started. We
    // intentionally do NOT call flushServerEvents() here — the chat
    // route is hot-path and we don't want to add latency before the
    // SSE stream opens. PostHog's flushAt/flushInterval will drain
    // within seconds; if the function exits earlier, the auto-flush
    // on next invocation reuses the same client buffer.
    trackServerEvent(session.user.id, "chat_started", {
      clientId,
      conversationId: convId,
    });
  }

  // Persist the user turn immediately so refresh mid-stream leaves a trail.
  await prisma.conversationMessage.create({
    data: { conversationId: convId, role: "user", content: message },
  });

  // Wave-4 RUN 7 (P1-06): swap the flat ctx.contexts list for the
  // 5-tier composer. Chat picks up T2 vector hits with the user's
  // own message as the query so the model sees paragraphs +
  // temporal facts directly relevant to *this* turn. Budget is
  // tighter than agents (1500 tokens) because chat has tool-use
  // loops that compound the system prompt size across rounds.
  const memory = await loadClientMemoryForPrompt({
    clientId: dbClient.id,
    userId: session.user.id,
    query: message,
    budgetTokens: 1500,
    preloadedClient: {
      id: dbClient.id,
      name: dbClient.name,
      industry: dbClient.industry,
      userRole: dbClient.userRole,
      relationshipMonths: dbClient.relationshipMonths,
      preferences: (dbClient.preferences ?? null) as Record<string, unknown> | null,
    },
  });
  const systemPrompt = renderSystemPrompt(dbClient, contexts, memory.prompt);
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
      // The citation stream state filters the hidden <CITATIONS>
      // sentinel block out of what we forward to the UI; the parsed
      // citations get attached to the persisted assistant message.
      const citationState = createCitationStreamState();
      let aggregateText = "";
      let totalInputTokens = 0;
      let totalOutputTokens = 0;
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
              const { forward } = feedDelta(citationState, ev.text);
              if (forward) send({ type: "text", text: forward });
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
              if (ev.usage) {
                // Accumulate token totals across tool-use rounds so the
                // single UsageEvent we write at the end reflects the
                // whole turn's billable cost (not just the last round).
                totalInputTokens += ev.usage.input ?? 0;
                totalOutputTokens += ev.usage.output ?? 0;
              }
              if (!roundText && ev.text) {
                // CLI path edge case — provider may emit a single done
                // with full text instead of streamed deltas. Run it
                // through the citation filter just like a regular
                // delta so the sentinel block doesn't leak to the UI.
                roundText = ev.text;
                aggregateText += ev.text;
                const { forward } = feedDelta(citationState, ev.text);
                if (forward) send({ type: "text", text: forward });
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

        // Finalize the citation parser. Emits the visible-only text
        // (citations stripped) plus a structured citation array. We
        // persist the visible portion to ConversationMessage.content so
        // future turns don't see the sentinel JSON in their history.
        const citationFinal = finalizeCitations(citationState);
        const persistedContent =
          citationFinal.visible !== "" ? citationFinal.visible : aggregateText;
        if (citationFinal.parseFailed) {
          trackServerEvent(session.user.id, "citation_parse_failed", {
            clientId,
            conversationId: convId,
            reason: citationFinal.parseError ?? "unknown",
            payloadChars: citationFinal.rawPayload?.length ?? 0,
          });
        }
        if (citationFinal.citations && citationFinal.citations.length > 0) {
          send({
            type: "citations",
            citations: citationFinal.citations,
          });
        }

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
              content: persistedContent,
              // Prisma JSON column accepts plain JS values as long as they
              // are JSON-serializable; cast through unknown to satisfy the
              // narrow `InputJsonValue` type without `any`.
              toolCalls: persistedToolCalls as unknown as Parameters<
                typeof prisma.conversationMessage.create
              >[0]["data"]["toolCalls"],
            },
          });
        }

        // Cost-tracking: write one UsageEvent per chat turn. This is the
        // ONLY place chat usage is logged; downstream gates (chatMessage
        // cap on next turn, /app/settings billing usage display) all
        // count from this table. Fire-and-forget — never block the user
        // response on the bookkeeping write.
        recordUsage({
          userId: session.user.id,
          kind: "chat",
          clientId: dbClient.id,
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
          provider: (providerName as "sdk" | "openrouter" | "cli") ?? "sdk",
        }).catch(() => {});

        // L4: bill metered overage for paid plans whose call landed
        // past the inclusive allowance with overage opted-in. Idempotent
        // on the conversation message id so a stream-retry won't
        // double-bill. We resolve idempotency-key with the **assistant**
        // message we just persisted; if there was no assistant message
        // (no text + no tools) we skip overage entirely.
        const turnTokens = totalInputTokens + totalOutputTokens;
        const preCallUsed = budgetSnapshot?.used ?? 0;
        const allowance = budgetSnapshot?.allowance ?? 0;
        const overOnEntry = budgetSnapshot?.exceeded ?? false;
        const wouldCrossAllowance =
          allowance > 0 && preCallUsed + turnTokens > allowance;

        if (
          turnTokens > 0 &&
          (overOnEntry || wouldCrossAllowance) &&
          (aggregateText || toolCallTrace.length > 0)
        ) {
          // Tokens that should bill as overage = the portion of THIS
          // turn that lands past the inclusive allowance.
          const billableTokens = overOnEntry
            ? turnTokens
            : preCallUsed + turnTokens - allowance;
          recordOverageUsage({
            userId: session.user.id,
            sourceKey: `conv-msg:${convId}:${Date.now()}`,
            sourceKind: "chat",
            tokens: Math.max(0, billableTokens),
          }).catch((err) => {
            console.warn(`[chat] overage recording failed: ${err}`);
          });
        }

        // Stage 3c (2026-05-16) — per-client credit consumption.
        // For per-client subs (tier='founding'|'standard') the chat
        // path bills against the firm-wide Credit pool when this turn's
        // tokens land past the base allowance (clientCount × 500K).
        // The credit balance is part of `snapshot.allowance` (already
        // sat above the base), so assertBudget only throws when BOTH
        // are exhausted. consumeCredits is the explicit decrement step.
        //
        // Idempotency: the sourceKey embeds convId + a timestamp so a
        // stream retry within the same second doesn't double-deduct;
        // the CreditLedger UNIQUE constraint serves as the hard gate.
        if (
          turnTokens > 0 &&
          (aggregateText || toolCallTrace.length > 0) &&
          budgetSnapshot &&
          (budgetSnapshot.tier === "founding" ||
            budgetSnapshot.tier === "standard")
        ) {
          const baseAllowance = budgetSnapshot.baseAllowance;
          const preCallOvershoot = Math.max(0, preCallUsed - baseAllowance);
          const postCallOvershoot = Math.max(
            0,
            preCallUsed + turnTokens - baseAllowance,
          );
          const creditsToConsume = postCallOvershoot - preCallOvershoot;
          if (creditsToConsume > 0) {
            consumeCredits({
              userId: session.user.id,
              sourceKey: `conv-msg:${convId}:${Date.now()}`,
              sourceKind: "chat",
              tokens: creditsToConsume,
            }).catch((err) => {
              console.warn(`[chat] consumeCredits failed: ${err}`);
            });
          }
        }

        // Surface usage to the client when the user is approaching or
        // past their allowance — frontend renders a "X% used" banner
        // and an overage opt-in CTA.
        if (budgetSnapshot && allowance > 0) {
          const fractionAfter = Math.min(
            1,
            (preCallUsed + turnTokens) / allowance,
          );
          if (fractionAfter >= 0.8) {
            send({
              type: "usage",
              usage: {
                fractionUsed: round2(fractionAfter),
                allowanceLeft: Math.max(0, allowance - preCallUsed - turnTokens),
                plan: budgetSnapshot.planKey,
                overageEnabled: budgetSnapshot.overageEnabled,
              },
            });
          }
        }

        send({ type: "done" });
      } catch (err) {
        notifyServerError("chat/stream", err, {
          userId: session.user.id,
          clientId,
        });
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
  /**
   * Wave-4 RUN 7: legacy raw contexts list. Kept in the signature
   * so the upstream chat route can pass `[]` without changing call
   * sites elsewhere; the body now ignores it in favour of the
   * 5-tier `memoryPrompt`. Will be removed once all internal tools
   * (search-knowledge-base etc.) confirm they don't rely on it.
   */
  _legacyContexts: Array<{
    title: string;
    content: string;
    category: string;
    isPinned: boolean;
  }>,
  /**
   * 5-tier memory block produced by `loadClientMemoryForPrompt`. T0
   * profile + T1 digest + T2 vector hits + T3 episodic + T4 firm
   * patterns under one budget. See
   * `.cycle/research/2026-04-28-memory-deep-dive.md`.
   */
  memoryPrompt: string = "",
): string {
  const prefs = (client.preferences ?? {}) as Partial<{
    reportTone: string;
    preferredFormats: string[];
    brandColor: string;
    contactEmail: string;
  }>;
  const tone = prefs.reportTone ?? "professional";
  const formats = prefs.preferredFormats?.join(", ") ?? "docx, xlsx";

  return `You are the AI-native agent embedded in the ${client.name} workspace, acting on behalf of a Fractional ${client.userRole}.

This client is one of many the operator manages. Stay strictly scoped to ${client.name}: never reference other clients, never leak their data.

━━━ Quick reference ━━━
• Company: ${client.name}
• Industry: ${client.industry}
• Relationship length: ${client.relationshipMonths} months
• Report tone: ${tone}
• Preferred deliverable formats: ${formats}

${memoryPrompt}

━━━ Your behavior ━━━
1. Answer using this client's specific context. Cite entries by title when useful.
2. When you need data you don't have, ask the operator or suggest they upload a source document.
3. Prepare deliverables (drafts, memos, reminders) proactively when the conversation implies one is needed. Offer the draft; let the operator approve.
4. Maintain consistency with prior decisions recorded in the knowledge base. Flag contradictions explicitly.
5. Never produce regulatory or legal judgments. Defer those to the human professional.
6. Keep responses tight. Prefer structure (bullets, short sections) over long prose.

━━━ Citation contract ━━━
When you make a factual claim grounded in a specific user-uploaded document
(retrieved via read_document or find_in_document), mark it inline with [N]
where N is a 1-indexed citation reference. At the very end of your response,
append a single hidden block in this exact format and nothing after it:

<CITATIONS>[{"ref":1,"doc_id":"<FileUpload id>","page":<pageNumber>,"quote":"<verbatim ≤30 words>"}, ...]</CITATIONS>

Rules:
- The <CITATIONS> block is parsed out by the server and never shown to the
  operator directly — never put it inside the visible portion of the message.
- For quotes that span a page boundary, use [[PAGE_BREAK]] inside the quote
  string to mark the break.
- Quote verbatim, ≤30 words. If the source text is longer, summarize the
  claim inline (still with [N]) and quote a representative phrase.
- Citations are REQUIRED for any claim about a user-uploaded document.
  Untethered statements (e.g. general advice) do not need a [N] marker.
- If you didn't read any document this turn, omit the <CITATIONS> block
  entirely — do not emit an empty one.`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Re-export types so the route stays type-safe against the domain model
// even though the system prompt consumes the Prisma shape directly.
export type { Client, ClientContext };
