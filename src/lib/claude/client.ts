/**
 * Legacy raw Anthropic SDK client.
 *
 * Prefer `getClaudeProvider()` from `./provider` for new code — it
 * abstracts over Anthropic-direct, OpenRouter, and the Claude Code CLI
 * with a unified streaming + tool-use interface. This client exists
 * only for any remaining call sites that still want the raw SDK shape.
 *
 * **2026-05-07 mandate**: ALL LLM API calls in the venture-harness studio
 * MUST route through OpenRouter unless `CLAUDE_PROVIDER=sdk` is set
 * explicitly. OpenRouter wins when OPENROUTER_API_KEY is present, even
 * if ANTHROPIC_API_KEY is also present (operator policy: single key,
 * single bill, model fallback infra). ANTHROPIC_API_KEY remains in env
 * as a compatibility fallback only — see venture-harness/CLAUDE.md.
 *
 * The Anthropic SDK is pointed at OpenRouter's Anthropic-compatible
 * `/v1/messages` endpoint via baseURL override. Tool use, streaming,
 * and the entire Messages API surface pass through unchanged. New code
 * must NOT instantiate `new Anthropic({ apiKey: ANTHROPIC_API_KEY })`
 * directly — go through this module or `./provider`.
 *
 * Note: when using OpenRouter, callers must pass model names in the
 * `vendor/model` form (e.g. `anthropic/claude-sonnet-4.5`). The
 * provider abstraction in `./provider` handles this rewrite for you,
 * which is another reason to prefer it.
 */
import Anthropic from "@anthropic-ai/sdk";

const explicitMode = process.env.CLAUDE_PROVIDER?.trim().toLowerCase();
const hasOpenRouterKey = !!process.env.OPENROUTER_API_KEY?.trim();
const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY?.trim();

// Mandate: OpenRouter wins when its key is configured (matches provider.ts
// auto-resolution). The only way to force Anthropic-direct is the explicit
// CLAUDE_PROVIDER=sdk escape hatch, which exists for fallback verification.
const useOpenRouter =
  explicitMode === "sdk"
    ? false
    : explicitMode === "openrouter"
      ? hasOpenRouterKey
      : hasOpenRouterKey || !hasAnthropicKey;

const anthropic = useOpenRouter
  ? new Anthropic({
      apiKey: process.env.OPENROUTER_API_KEY!,
      baseURL: "https://openrouter.ai/api",
      defaultHeaders: {
        "HTTP-Referer":
          process.env.OPENROUTER_HTTP_REFERER?.trim() ||
          process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
          "https://practiq.dev",
        "X-Title": "Practiq",
      },
    })
  : new Anthropic({
      // Fallback path — only reached when CLAUDE_PROVIDER=sdk is set or
      // OPENROUTER_API_KEY is unset entirely. New code MUST NOT rely on
      // this branch silently activating.
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

export { anthropic };
