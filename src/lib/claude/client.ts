/**
 * Legacy raw Anthropic SDK client.
 *
 * Prefer `getClaudeProvider()` from `./provider` for new code — it
 * abstracts over Anthropic-direct, OpenRouter, and the Claude Code CLI
 * with a unified streaming + tool-use interface. This client exists
 * only for any remaining call sites that still want the raw SDK shape.
 *
 * If OPENROUTER_API_KEY is set and ANTHROPIC_API_KEY is empty, this
 * client transparently routes through OpenRouter's Anthropic-compatible
 * `/v1/messages` endpoint via baseURL override. Tool use, streaming,
 * and the entire Messages API surface pass through unchanged.
 *
 * Note: when using OpenRouter, callers must pass model names in the
 * `vendor/model` form (e.g. `anthropic/claude-sonnet-4.5`). The
 * provider abstraction in `./provider` handles this rewrite for you,
 * which is another reason to prefer it.
 */
import Anthropic from "@anthropic-ai/sdk";

const useOpenRouter =
  !process.env.ANTHROPIC_API_KEY?.trim() &&
  !!process.env.OPENROUTER_API_KEY?.trim();

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
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

export { anthropic };
