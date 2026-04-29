import { NextRequest } from "next/server";
import { getClaudeProvider, type ChatMessage } from "@/lib/claude/provider";
import { identityFromRequest, checkRateLimit } from "@/lib/rate-limit";
import {
  assertDemoBudget,
  consumeDemoTokens,
  budgetRefusalBody,
  BudgetExceededError,
} from "@/lib/token-budget";
import { DEMO_ZONE } from "@/lib/stripe/plans";

export const runtime = "nodejs";

/**
 * POST /api/demo/chat
 *
 * Anonymous, IP-rate-limited demo endpoint surfaced from the public
 * /pricing and homepage hero. No auth, no client context, no DB writes
 * for content — strictly a "feel the AI" affordance bounded by token
 * cap so a single bad actor can't drain Anthropic credit.
 *
 * Three protections, in order of severity:
 *
 *   1. Per-IP request burst — 10 req / min / IP (cheap WAF for bot
 *      traffic before we even open the LLM call).
 *   2. Per-IP daily token cap — 5,000 tokens / IP / 24h sliding window.
 *      Pre-flight check via `assertDemoBudget` returns 401 with a
 *      sign-up CTA when exhausted.
 *   3. Hard per-call token ceiling (max_tokens 600) — bounds the worst
 *      case that any single call can cost.
 */
const DEMO_BURST_LIMIT = 10;
const DEMO_BURST_WINDOW_MS = 60 * 1000;
const DEMO_MAX_TOKENS_PER_CALL = 600;
const DEMO_SYSTEM_PROMPT =
  `You are Practiq, an AI assistant designed for boutique professional services firms.
Demo mode: respond concisely (≤150 words) to give the visitor a feel for context-aware help.
Do not invent client data; gently steer toward "Sign up to connect your real client workspace".
Never produce regulatory/legal/tax-strategy judgments.`;

export async function POST(request: NextRequest) {
  const identity = identityFromRequest(request);
  const ip = identity.startsWith("ip:") ? identity.slice(3) : "anonymous";

  // ── Burst rate limit (cheap, runs before any token math) ──
  const burst = await checkRateLimit({
    namespace: "demo/burst",
    identity,
    limit: DEMO_BURST_LIMIT,
    windowMs: DEMO_BURST_WINDOW_MS,
  });
  if (!burst.allowed) {
    return new Response(
      JSON.stringify({
        error: "Too many demo requests. Please slow down.",
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

  // ── Daily token cap (the actual cost gate) ──
  try {
    await assertDemoBudget(ip);
  } catch (err) {
    if (err instanceof BudgetExceededError) {
      // Demo exhaustion is a 401 with sign-up CTA, not a 402 — there's
      // no upgrade path here, just an account creation invitation.
      return new Response(JSON.stringify(budgetRefusalBody(err)), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    throw err;
  }

  let body: { message?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const message = (body.message ?? "").toString().trim();
  if (!message) {
    return new Response(JSON.stringify({ error: "message is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (message.length > 2000) {
    return new Response(
      JSON.stringify({
        error: "Demo messages are capped at 2,000 characters. Sign up for full access.",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // SSE stream with the same shape as /api/chat so the frontend can
  // share rendering. No tools, no conversation persistence, no
  // multi-round loop — demo is single-turn.
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let clientGone = false;
      const send = (payload: unknown) => {
        if (clientGone) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch {
          clientGone = true;
        }
      };

      let totalInputTokens = 0;
      let totalOutputTokens = 0;

      try {
        const provider = getClaudeProvider();
        const messages: ChatMessage[] = [{ role: "user", content: message }];
        for await (const ev of provider.stream({
          system: DEMO_SYSTEM_PROMPT,
          messages,
          maxTokens: DEMO_MAX_TOKENS_PER_CALL,
        })) {
          if (ev.type === "delta") {
            send({ type: "text", text: ev.text });
          } else if (ev.type === "done") {
            if (ev.usage) {
              totalInputTokens += ev.usage.input ?? 0;
              totalOutputTokens += ev.usage.output ?? 0;
            }
            if (ev.text) send({ type: "text", text: ev.text });
          } else if (ev.type === "error") {
            send({ type: "error", error: ev.error });
          }
        }

        // Increment the per-IP token counter AFTER the call so the
        // visible cost matches the LLM-billed cost. Best-effort —
        // a slow KV write should not block the SSE close.
        const turnTokens = totalInputTokens + totalOutputTokens;
        if (turnTokens > 0) {
          consumeDemoTokens(ip, turnTokens).catch((err) => {
            console.warn(`[demo] consumeDemoTokens failed: ${err}`);
          });
        }

        // Surface remaining demo budget so the UI can render a counter.
        const remaining = Math.max(
          0,
          DEMO_ZONE.tokensPerIpPerDay - turnTokens,
        );
        send({
          type: "demo_usage",
          usage: {
            tokensThisCall: turnTokens,
            tokensRemainingApprox: remaining,
            cap: DEMO_ZONE.tokensPerIpPerDay,
          },
        });
        send({ type: "done" });
      } catch (err) {
        send({
          type: "error",
          error: err instanceof Error ? err.message : String(err),
        });
      } finally {
        if (!clientGone) {
          try {
            controller.close();
          } catch {
            // already closed
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
