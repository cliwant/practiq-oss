/**
 * Unified Claude provider.
 *
 * Practiq calls into Claude from three places — the streaming chat
 * route, the autonomous agent runner, and the extractor/artifact
 * routes — and each of those needs to work regardless of whether
 * the operator has an Anthropic API key with credits, an OpenRouter
 * key, or only a Claude Code subscription.
 *
 * Three provider implementations live behind this abstraction:
 *
 *   - sdk        : @anthropic-ai/sdk → Anthropic REST API. Needs a
 *                  valid ANTHROPIC_API_KEY with billing. Best for
 *                  production when you want first-party Anthropic
 *                  routing.
 *
 *   - openrouter : @anthropic-ai/sdk pointed at OpenRouter's
 *                  Anthropic-compatible /v1/messages endpoint via
 *                  baseURL override. Needs OPENROUTER_API_KEY.
 *                  Useful when you want a single key to access
 *                  Anthropic + OpenAI + Google models with a unified
 *                  bill, or when Anthropic direct is unavailable.
 *                  Tool use + streaming pass through unchanged.
 *
 *   - cli        : spawn("claude", …) → the Claude Code CLI. Uses
 *                  whatever OAuth/subscription auth the CLI already
 *                  carries. Great for local dogfood when no API
 *                  billing is available. Slight token overhead (CLI
 *                  injects its own system context) but works out of
 *                  the box.
 *
 * Selection (in order of precedence):
 *   1. process.env.CLAUDE_PROVIDER = "sdk" | "openrouter" | "cli" | "auto"
 *      (default "auto")
 *   2. "auto" resolution order:
 *        a. ANTHROPIC_API_KEY set + non-empty → sdk
 *        b. OPENROUTER_API_KEY set + non-empty → openrouter
 *        c. otherwise → cli
 *
 * Model naming: Anthropic-direct uses bare names (e.g. "claude-sonnet-4-5-…"),
 * OpenRouter uses prefixed names (e.g. "anthropic/claude-sonnet-4.5"). The
 * provider rewrites the default model when the chosen mode is openrouter so
 * callers don't have to think about it. Callers passing an explicit `model`
 * field are responsible for using the correct naming convention.
 *
 * All callers should import from this file and stop importing the
 * raw SDK directly — the streaming format here is the SDK's delta
 * event shape, which all three providers produce.
 */
import { spawn, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { mkdtempSync, writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";

/**
 * Resolve the claude executable once at module load. Critical: if we
 * spawn with `shell: true` on Windows, cmd.exe drops empty-string
 * arguments (so `--setting-sources "" --tools ""` collapses to
 * `--setting-sources --tools` and the CLI parses "--tools" as the
 * value of --setting-sources, errors out). Spawning directly against
 * the resolved binary preserves every arg verbatim. Falls back to the
 * shell resolver if `where` fails.
 */
const CLAUDE_BIN: string = (() => {
  const whereCmd = process.platform === "win32" ? "where" : "which";
  try {
    const r = spawnSync(whereCmd, ["claude"], { encoding: "utf-8" });
    if (r.status === 0 && r.stdout) {
      const first = r.stdout.split(/\r?\n/).find((l) => l.trim());
      if (first) return first.trim();
    }
  } catch {}
  return "claude";
})();

/**
 * Neutral cwd for spawned Claude CLI subprocesses. Critical: without
 * this, the CLI inherits the Next.js server's cwd (the venture-harness
 * repo) and picks up its CLAUDE.md, .claude/rules/**, and project
 * awareness — which then contaminate every response with "you're
 * working on the Practiq codebase" context, overriding our per-client
 * system prompt. We create a single empty throwaway dir once and reuse
 * it for every spawn.
 */
/**
 * Render the messages array into a single stdin string for `claude -p`.
 *
 * The CLI only accepts one user prompt on stdin in text mode. We
 * handle two cases:
 *
 *   - Single-turn (one user message): send the content as-is. No role
 *     markers, no framing — the content flows naturally and the system
 *     prompt fully scopes the context.
 *
 *   - Multi-turn: wrap prior turns in a `<conversation_history>` block
 *     that's unambiguous to the model but doesn't leak literal
 *     "[[USER]]"/"[[ASSISTANT]]" tags into the response (we saw Claude
 *     quote those tags back to the operator, which looked broken).
 */
function messageContentToText(content: ChatMessage["content"]): string {
  if (typeof content === "string") return content;
  // Content-block messages — flatten to a CLI-readable text. Tool calls
  // can't actually execute on the CLI path (the SDK Tool Use API isn't
  // exposed via `claude -p`), but we still render them so the CLI
  // model has the conversational context.
  return content
    .map((b) => {
      if (b.type === "text") return b.text;
      if (b.type === "tool_use") {
        return `[tool_use ${b.name}(${JSON.stringify(b.input)})]`;
      }
      if (b.type === "tool_result") {
        return `[tool_result ${b.tool_use_id}: ${b.content}]`;
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

function renderHistoryForCli(messages: ChatMessage[]): string {
  if (messages.length === 0) return "";
  if (messages.length === 1 && messages[0].role === "user") {
    return messageContentToText(messages[0].content);
  }
  const prior = messages.slice(0, -1);
  const current = messages[messages.length - 1];
  const priorBlock = prior
    .map(
      (m) =>
        `<${m.role === "user" ? "human" : "assistant"}>\n${messageContentToText(m.content)}\n</${m.role === "user" ? "human" : "assistant"}>`,
    )
    .join("\n");
  const currentText =
    current.role === "user"
      ? messageContentToText(current.content)
      : `[The previous assistant message was:]\n${messageContentToText(current.content)}\n\n[Continue the conversation.]`;
  return `<conversation_history>\n${priorBlock}\n</conversation_history>\n\n${currentText}`;
}

const CLI_SANDBOX_CWD: string = (() => {
  try {
    return mkdtempSync(join(tmpdir(), "practiq-claude-sandbox-"));
  } catch {
    return tmpdir();
  }
})();

/**
 * Write the system prompt to a temp file so we can pass it via
 * --system-prompt-file instead of --system-prompt. The flag value
 * travels through Windows cmd.exe (shell:true) and gets mangled when
 * it contains newlines and special chars — which every real system
 * prompt does. Files sidestep escaping entirely. Returns the path and
 * a cleanup function.
 */
function writeSystemPromptFile(prompt: string): { path: string; cleanup: () => void } {
  const path = join(CLI_SANDBOX_CWD, `sys-${randomUUID()}.txt`);
  writeFileSync(path, prompt, "utf-8");
  // Pass forward-slashes to the CLI. Windows cmd.exe (shell:true) and
  // most cross-platform CLIs accept forward-slash paths; backslashes
  // can be mis-parsed as escape characters when flowing through the
  // shell argv.
  const cliPath = path.replace(/\\/g, "/");
  return {
    path: cliPath,
    cleanup: () => {
      try {
        unlinkSync(path);
      } catch {
        // ignore — tmp dir will be cleaned eventually
      }
    },
  };
}

export const DEFAULT_MODEL = "claude-sonnet-4-5-20250929";
export const DEFAULT_MODEL_ALIAS = "sonnet"; // CLI accepts aliases

/**
 * OpenRouter uses prefixed model names (`vendor/model`). Default to the
 * Anthropic-routed Sonnet 4.5 entry so behavior is functionally
 * equivalent to ANTHROPIC_API_KEY direct routing — same model class,
 * same Tool Use semantics, just billed through OpenRouter. Override per
 * call by passing an explicit `model` to CompleteRequest.
 */
export const DEFAULT_MODEL_OPENROUTER = "anthropic/claude-sonnet-4.5";

/**
 * OpenRouter's Anthropic-compatible base URL. The Anthropic SDK appends
 * `/v1/messages` to whatever baseURL we pass, so we point it at the
 * server root (no trailing slash, no `/v1`). Final request URL becomes
 * `https://openrouter.ai/api/v1/messages` — OpenRouter's documented
 * Anthropic shim that mirrors the Messages API verbatim, including
 * tool_use blocks and streaming deltas.
 */
const OPENROUTER_BASE_URL = "https://openrouter.ai/api";

/**
 * One block in a multi-modal message — Anthropic's content-block API
 * shape, narrowed to the three kinds we use:
 *   - text         : a plain text segment
 *   - tool_use     : the model's decision to invoke a tool (assistant role)
 *   - tool_result  : the tool's output going back to the model (user role)
 */
export type ContentBlock =
  | { type: "text"; text: string }
  | {
      type: "tool_use";
      id: string;
      name: string;
      input: Record<string, unknown>;
    }
  | {
      type: "tool_result";
      tool_use_id: string;
      content: string;
      is_error?: boolean;
    };

export interface ChatMessage {
  role: "user" | "assistant";
  /**
   * Either a plain string (vast majority of chat turns) or an array of
   * content blocks for multi-modal turns. Tool-use rounds use blocks:
   *   assistant: [text, tool_use]
   *   user:      [tool_result]
   */
  content: string | ContentBlock[];
}

/**
 * Tool definition matching Anthropic's `Tool` shape so we can pass
 * straight through to `messages.create({ tools })`. Defining this
 * locally instead of re-exporting `Anthropic.Tool` keeps callers
 * decoupled from the SDK type.
 */
export interface ToolDefinition {
  name: string;
  description?: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface CompleteRequest {
  system: string;
  messages: ChatMessage[];
  maxTokens: number;
  model?: string;
  /**
   * Optional tool definitions. Only the SDK provider supports tools; the
   * CLI provider ignores this field (passes it through to a vanilla
   * stream — the model will just produce text).
   */
  tools?: ToolDefinition[];
}

export type StreamEvent =
  | { type: "delta"; text: string }
  | {
      type: "tool_use";
      id: string;
      name: string;
      input: Record<string, unknown>;
    }
  | {
      type: "done";
      text: string;
      /**
       * `tool_use` when the model wants to invoke a tool and is waiting
       * for tool_result; `end_turn` for normal completion. Omitted for
       * legacy paths that don't track stop reason.
       */
      stopReason?: "end_turn" | "tool_use" | "max_tokens" | string;
      usage?: { input: number; output: number };
    }
  | { type: "error"; error: string };

export interface ClaudeProvider {
  name: "sdk" | "openrouter" | "cli";
  /** One-shot completion. Returns the concatenated assistant text. */
  complete(req: CompleteRequest): Promise<{
    text: string;
    inputTokens?: number;
    outputTokens?: number;
    stopReason?: "end_turn" | "tool_use" | "max_tokens" | string;
  }>;
  /** Streaming SSE-friendly events. Accumulator emits "done" last. */
  stream(req: CompleteRequest): AsyncIterable<StreamEvent>;
}

// ─── Prompt caching helpers ────────────────────────────────────────────
//
// Anthropic charges ~10x less for cache-hit input tokens. The system
// prompt for a given client is stable across:
//   - turns within a single chat session (~5-min cache TTL)
//   - tool-use rounds within one turn
//   - the nightly background-agent run AND that user's next morning chat
//
// Marking the system prompt as ephemeral-cacheable cuts billable input
// cost by 75-90% on every cache hit. The tradeoff: cache misses cost
// 1.25x normal — slightly more expensive than non-cached. So caching
// is only a win when there's a >25% chance of repeat use, which is
// trivially true for a per-client agent that the user opens every day.
//
// We cache:
//   - the full system prompt (one block, longest input)
//   - the tools array (rarely changes between requests; tagging the
//     last tool's cache_control marks the whole tools array as a cache
//     prefix per Anthropic's spec)
//
// We DON'T cache:
//   - messages (they change every turn)
//   - per-turn user input
//
// Cache analytics: usage.cache_creation_input_tokens and
// usage.cache_read_input_tokens come back on every response. Phase-2
// will surface them on /admin/analytics.

interface CacheableSystemBlock {
  type: "text";
  text: string;
  cache_control?: { type: "ephemeral" };
}

/**
 * Convert a string `system` prompt into a ContentBlockParam[] with
 * cache_control set on the (single) text block. If the system was
 * already passed as an array, we add cache_control to the LAST block
 * so any caller-side breakdown (e.g. multiple stable prefixes) is
 * preserved.
 *
 * Why ephemeral and not 1h cache: per-client system prompts get refreshed
 * frequently as ClientContext rows change. Ephemeral (~5 min) matches
 * actual chat-session granularity better. 1h caching is for very stable
 * prefixes like the Practiq core persona — not yet split out.
 */
function makeCacheableSystem(
  system: string | unknown[],
): CacheableSystemBlock[] {
  if (typeof system === "string") {
    if (system.length === 0) return [];
    return [
      {
        type: "text",
        text: system,
        cache_control: { type: "ephemeral" },
      },
    ];
  }
  if (Array.isArray(system) && system.length > 0) {
    const blocks = system as CacheableSystemBlock[];
    const last = blocks[blocks.length - 1];
    return [
      ...blocks.slice(0, -1),
      { ...last, cache_control: { type: "ephemeral" } },
    ];
  }
  return [];
}

/**
 * Mark the LAST tool in the array as cacheable — Anthropic treats
 * everything before a cache_control marker as a stable prefix, so this
 * caches the entire tools registry. Tools change rarely between
 * requests in normal use.
 */
function makeCacheableTools<T extends { name: string }>(
  tools: T[] | undefined,
): T[] | undefined {
  if (!tools || tools.length === 0) return tools;
  const last = tools[tools.length - 1];
  // Tools tagged with cache_control will be cached as a prefix. The
  // type-cast preserves the SDK's narrow Tool typing while letting us
  // attach the cache marker.
  return [
    ...tools.slice(0, -1),
    { ...last, cache_control: { type: "ephemeral" } } as T,
  ];
}

// ─── SDK provider ──────────────────────────────────────────────────────

interface SdkProviderConfig {
  apiKey: string;
  baseURL?: string;
  /**
   * Default model when CompleteRequest doesn't specify one. Different
   * routes use different naming conventions: Anthropic-direct uses bare
   * model IDs ("claude-sonnet-4-5-…"), OpenRouter uses vendor-prefixed
   * IDs ("anthropic/claude-sonnet-4.5").
   */
  defaultModel: string;
  /** Logical name surfaced on the returned ClaudeProvider. */
  name: "sdk" | "openrouter";
  /**
   * Extra HTTP headers — OpenRouter expects HTTP-Referer and X-Title for
   * attribution and rate-limit class assignment. Passed straight through
   * to the SDK constructor's `defaultHeaders`.
   */
  defaultHeaders?: Record<string, string>;
}

function makeSdkProvider(config: SdkProviderConfig): ClaudeProvider {
  const client = new Anthropic({
    apiKey: config.apiKey,
    ...(config.baseURL ? { baseURL: config.baseURL } : {}),
    ...(config.defaultHeaders ? { defaultHeaders: config.defaultHeaders } : {}),
  });
  const providerName = config.name;
  const providerDefaultModel = config.defaultModel;

  return {
    name: providerName,
    async complete(req) {
      // The SDK's `MessageParam` accepts both string and content-block
      // shapes, so we can hand `req.messages` straight through. We
      // narrow tool definitions through the locally-typed shape
      // (matches Anthropic.Tool structurally).
      // SDK accepts both string and content-block message shapes; cast
      // through unknown to bridge our local type to its widened type.
      const sdkMessages = req.messages as unknown as Parameters<
        typeof client.messages.create
      >[0]["messages"];
      const sdkTools = req.tools as unknown as Parameters<
        typeof client.messages.create
      >[0]["tools"];
      const res = await client.messages.create({
        model: req.model ?? providerDefaultModel,
        max_tokens: req.maxTokens,
        // Mark the system prompt as ephemeral-cacheable. The system
        // prompt for a given client is stable across the chat session
        // AND across the nightly background-agent runs — so caching
        // here cuts billable input tokens by ~75-90% on cache hits.
        // Anthropic ephemeral caches expire after ~5 min; that matches
        // a typical chat session well. Tools are also cached because
        // the tool registry never changes per request.
        // SDK accepts a ContentBlockParam[] for `system` with
        // `cache_control`. We cast through unknown so the existing
        // string-based `system` field stays compatible.
        system: makeCacheableSystem(req.system) as unknown as Parameters<
          typeof client.messages.create
        >[0]["system"],
        messages: sdkMessages,
        ...(req.tools && req.tools.length > 0
          ? { tools: makeCacheableTools(sdkTools) }
          : {}),
      });
      const text = res.content
        .map((b) => (b.type === "text" ? b.text : ""))
        .join("");
      return {
        text,
        inputTokens: res.usage?.input_tokens,
        outputTokens: res.usage?.output_tokens,
        stopReason: res.stop_reason ?? undefined,
      };
    },
    async *stream(req) {
      let fullText = "";
      try {
        const sdkMessages = req.messages as unknown as Parameters<
          typeof client.messages.stream
        >[0]["messages"];
        const sdkTools = req.tools as unknown as Parameters<
          typeof client.messages.stream
        >[0]["tools"];
        const s = client.messages.stream({
          model: req.model ?? providerDefaultModel,
          max_tokens: req.maxTokens,
          // Same prompt-caching strategy as the non-streaming path —
          // the system prompt for a client is stable across turns, so
          // we mark it cacheable to cut billable input tokens by
          // 75-90% on cache hits. See the `makeCacheableSystem`
          // helper below for the marshalling detail.
          system: makeCacheableSystem(req.system) as unknown as Parameters<
            typeof client.messages.stream
          >[0]["system"],
          messages: sdkMessages,
          ...(req.tools && req.tools.length > 0
            ? { tools: makeCacheableTools(sdkTools) }
            : {}),
        });
        for await (const ev of s) {
          if (
            ev.type === "content_block_delta" &&
            ev.delta.type === "text_delta"
          ) {
            fullText += ev.delta.text;
            yield { type: "delta", text: ev.delta.text };
          }
        }
        // Pull the resolved final message — tool_use blocks aren't
        // delta-streamed for us, they materialize here once the stream
        // closes. We emit one `tool_use` event per tool block so the
        // caller can execute and continue with `tool_result`.
        const finalMsg = await s.finalMessage();
        for (const block of finalMsg.content) {
          if (block.type === "tool_use") {
            yield {
              type: "tool_use",
              id: block.id,
              name: block.name,
              input: (block.input ?? {}) as Record<string, unknown>,
            };
          }
        }
        yield {
          type: "done",
          text: fullText,
          stopReason: finalMsg.stop_reason ?? undefined,
          usage:
            finalMsg.usage && typeof finalMsg.usage.input_tokens === "number"
              ? {
                  input: finalMsg.usage.input_tokens,
                  output: finalMsg.usage.output_tokens ?? 0,
                }
              : undefined,
        };
      } catch (err) {
        yield {
          type: "error",
          error: err instanceof Error ? err.message : String(err),
        };
      }
    },
  };
}

// ─── CLI provider ──────────────────────────────────────────────────────

/**
 * Parse the NDJSON line stream emitted by `claude -p --output-format
 * stream-json --verbose --include-partial-messages`.
 *
 * Interesting lines (we drop the rest):
 *   - { type: "stream_event", event: { type:"content_block_delta",
 *       delta:{ type:"text_delta", text:"..." } } }  → delta
 *   - { type: "result", subtype:"success", result:"..." }         → done
 *   - { type: "result", subtype:"error_during_execution", ... }   → error
 */
interface ParsedEvent {
  kind: "delta" | "final" | "error" | "ignored";
  text?: string;
  error?: string;
  inputTokens?: number;
  outputTokens?: number;
}

function parseCliLine(line: string): ParsedEvent {
  const trimmed = line.trim();
  if (!trimmed) return { kind: "ignored" };
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { kind: "ignored" };
  }
  const obj = parsed as Record<string, unknown>;

  if (obj.type === "stream_event") {
    const ev = obj.event as Record<string, unknown> | undefined;
    if (ev?.type === "content_block_delta") {
      const delta = ev.delta as Record<string, unknown> | undefined;
      if (delta?.type === "text_delta" && typeof delta.text === "string") {
        return { kind: "delta", text: delta.text };
      }
    }
    return { kind: "ignored" };
  }

  if (obj.type === "result") {
    if (obj.is_error) {
      return {
        kind: "error",
        error:
          typeof obj.result === "string"
            ? obj.result
            : String(obj.subtype ?? "cli error"),
      };
    }
    const usage = obj.usage as Record<string, unknown> | undefined;
    return {
      kind: "final",
      text: typeof obj.result === "string" ? obj.result : undefined,
      inputTokens:
        typeof usage?.input_tokens === "number" ? usage.input_tokens : undefined,
      outputTokens:
        typeof usage?.output_tokens === "number"
          ? usage.output_tokens
          : undefined,
    };
  }

  return { kind: "ignored" };
}

function makeCliProvider(): ClaudeProvider {
  async function runOnce(req: CompleteRequest): Promise<{
    fullText: string;
    inputTokens?: number;
    outputTokens?: number;
    emitter?: (ev: StreamEvent) => void;
  }> {
    const history = renderHistoryForCli(req.messages);
    const sysFile = writeSystemPromptFile(req.system);

    const args = [
      "-p",
      "--output-format",
      "stream-json",
      "--verbose",
      "--include-partial-messages",
      "--no-session-persistence",
      // Isolation flags: make the CLI behave as a pure function of
      // (system prompt, messages). Without these it leaks Claude Code's
      // workspace awareness — auto-memory across calls, user CLAUDE.md,
      // project settings, skills — into every response, which ruins
      // client-scoped reasoning (e.g. "No client specified, name one
      // of the 120+ I already know about").
      "--setting-sources",
      "",
      "--tools",
      "",
      "--disable-slash-commands",
      "--model",
      req.model ?? DEFAULT_MODEL_ALIAS,
      // Pass the system prompt via a file so Windows cmd.exe shell
      // escaping doesn't mangle newlines / quotes / special chars
      // (which every real system prompt contains).
      "--system-prompt-file",
      sysFile.path,
    ];

    return new Promise((resolve, reject) => {
      // shell:true so the Windows launcher resolves `claude` from PATH
      // without the caller knowing the install prefix.
      // Strip ANTHROPIC_API_KEY when it has no billing so the CLI
      // falls back to subscription OAuth. If we leave a credit-less
      // key in env, the CLI tries to use it and errors "Credit
      // balance is too low" before even attempting OAuth.
      const passEnv: NodeJS.ProcessEnv = { ...process.env };
      if (process.env.CLAUDE_PROVIDER === "cli") {
        // Operator explicitly chose CLI; they don't want key-auth.
        delete passEnv.ANTHROPIC_API_KEY;
      }

      const proc = spawn(CLAUDE_BIN, args, {
        // shell:false — cmd.exe drops empty-string args on Windows
        // which breaks --setting-sources "" and --tools "".
        shell: false,
        cwd: CLI_SANDBOX_CWD,
        env: passEnv,
      });

      let buffer = "";
      let fullText = "";
      let inputTokens: number | undefined;
      let outputTokens: number | undefined;
      let errored: string | null = null;

      const emitters: Array<(ev: StreamEvent) => void> = [];
      const addEmitter = (fn: (ev: StreamEvent) => void) => emitters.push(fn);
      const emit = (ev: StreamEvent) => {
        for (const fn of emitters) fn(ev);
      };

      proc.stdout.on("data", (chunk: Buffer) => {
        buffer += chunk.toString("utf-8");
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const parsed = parseCliLine(line);
          if (parsed.kind === "delta" && parsed.text) {
            fullText += parsed.text;
            emit({ type: "delta", text: parsed.text });
          } else if (parsed.kind === "final") {
            // Prefer the `result` field if we never got deltas (edge case).
            if (parsed.text && !fullText) fullText = parsed.text;
            inputTokens = parsed.inputTokens;
            outputTokens = parsed.outputTokens;
          } else if (parsed.kind === "error") {
            errored = parsed.error ?? "cli error";
          }
        }
      });

      proc.stderr.on("data", (chunk: Buffer) => {
        const s = chunk.toString("utf-8");
        if (s.toLowerCase().includes("error")) {
          // Surface CLI errors in the server log and capture the first
          // one to bubble up to the caller.
          console.error(`[cli:stderr] ${s.slice(0, 400)}`);
          errored = errored ?? s.slice(0, 400);
        }
      });

      proc.on("error", (err) => {
        sysFile.cleanup();
        reject(
          new Error(
            `Claude CLI spawn failed: ${err.message}. Is the 'claude' binary on PATH?`,
          ),
        );
      });

      proc.on("close", (code) => {
        sysFile.cleanup();
        if (errored) {
          emit({ type: "error", error: errored });
          reject(new Error(errored));
          return;
        }
        if (code !== 0 && !fullText) {
          const msg = `Claude CLI exited with code ${code}`;
          emit({ type: "error", error: msg });
          reject(new Error(msg));
          return;
        }
        emit({
          type: "done",
          text: fullText,
          usage:
            inputTokens !== undefined || outputTokens !== undefined
              ? { input: inputTokens ?? 0, output: outputTokens ?? 0 }
              : undefined,
        });
        resolve({ fullText, inputTokens, outputTokens });
      });

      proc.stdin.write(history);
      proc.stdin.end();

      // Return an emitter handle via resolve path — we can't attach
      // listeners after resolve for `complete()`, but `stream()` below
      // uses a different adapter.
      void addEmitter; // reserved for future fan-out
    });
  }

  return {
    name: "cli",
    async complete(req) {
      const r = await runOnce(req);
      return {
        text: r.fullText,
        inputTokens: r.inputTokens,
        outputTokens: r.outputTokens,
      };
    },
    async *stream(req) {
      // We mirror the SDK's async iterable by pushing events into a
      // queue from the child process and yielding them as they arrive.
      const history = renderHistoryForCli(req.messages);
      const sysFile = writeSystemPromptFile(req.system);
      const args = [
        "-p",
        "--output-format",
        "stream-json",
        "--verbose",
        "--include-partial-messages",
        "--no-session-persistence",
        // Same isolation package as runOnce above — keep in lockstep.
        "--setting-sources",
        "",
        "--tools",
        "",
        "--disable-slash-commands",
        "--model",
        req.model ?? DEFAULT_MODEL_ALIAS,
        "--system-prompt-file",
        sysFile.path,
      ];

      // Strip ANTHROPIC_API_KEY when it has no billing so the CLI
      // falls back to subscription OAuth. If we leave a credit-less
      // key in env, the CLI tries to use it and errors "Credit
      // balance is too low" before even attempting OAuth.
      const passEnv: NodeJS.ProcessEnv = { ...process.env };
      if (process.env.CLAUDE_PROVIDER === "cli") {
        // Operator explicitly chose CLI; they don't want key-auth.
        delete passEnv.ANTHROPIC_API_KEY;
      }

      const proc = spawn(CLAUDE_BIN, args, {
        // shell:false — cmd.exe drops empty-string args on Windows
        // which breaks --setting-sources "" and --tools "".
        shell: false,
        cwd: CLI_SANDBOX_CWD,
        env: passEnv,
      });

      proc.stderr.on("data", (chunk: Buffer) => {
        const s = chunk.toString("utf-8");
        if (s.toLowerCase().includes("error")) {
          console.error(`[cli:stderr] ${s.slice(0, 400)}`);
        }
      });

      const queue: StreamEvent[] = [];
      let done = false;
      let waiter: (() => void) | null = null;
      const push = (ev: StreamEvent) => {
        queue.push(ev);
        if (waiter) {
          const w = waiter;
          waiter = null;
          w();
        }
      };

      let buffer = "";
      let fullText = "";
      let inputTokens: number | undefined;
      let outputTokens: number | undefined;

      proc.stdout.on("data", (chunk: Buffer) => {
        buffer += chunk.toString("utf-8");
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const parsed = parseCliLine(line);
          if (parsed.kind === "delta" && parsed.text) {
            fullText += parsed.text;
            push({ type: "delta", text: parsed.text });
          } else if (parsed.kind === "final") {
            if (parsed.text && !fullText) fullText = parsed.text;
            inputTokens = parsed.inputTokens;
            outputTokens = parsed.outputTokens;
          } else if (parsed.kind === "error") {
            push({ type: "error", error: parsed.error ?? "cli error" });
          }
        }
      });

      proc.on("error", (err) => {
        sysFile.cleanup();
        push({
          type: "error",
          error: `Claude CLI spawn failed: ${err.message}`,
        });
        done = true;
        if (waiter) {
          waiter();
          waiter = null;
        }
      });

      proc.on("close", () => {
        sysFile.cleanup();
        push({
          type: "done",
          text: fullText,
          usage:
            inputTokens !== undefined || outputTokens !== undefined
              ? { input: inputTokens ?? 0, output: outputTokens ?? 0 }
              : undefined,
        });
        done = true;
        if (waiter) {
          waiter();
          waiter = null;
        }
      });

      proc.stdin.write(history);
      proc.stdin.end();

      // Consumer loop — yield as events become available.
      while (true) {
        if (queue.length > 0) {
          const ev = queue.shift()!;
          yield ev;
          if (ev.type === "done" || ev.type === "error") return;
        } else if (done) {
          return;
        } else {
          await new Promise<void>((r) => {
            waiter = r;
          });
        }
      }
    },
  };
}

// ─── Selection ──────────────────────────────────────────────────────────

let cached: ClaudeProvider | null = null;

/**
 * Build the OpenRouter-flavored SDK provider. Pulled out of
 * getClaudeProvider so the construction is in one place and the
 * attribution headers are explicit.
 *
 * Required env: OPENROUTER_API_KEY.
 *
 * Optional headers:
 *   - HTTP-Referer  : URL of the calling app. OpenRouter uses this to
 *                     populate the "Referrer" column in your dashboard
 *                     and to identify which integration is generating
 *                     traffic. Falls back to NEXT_PUBLIC_SITE_URL or a
 *                     hardcoded practiq.dev default.
 *   - X-Title       : Human-readable app name shown in OpenRouter's
 *                     analytics. Hardcoded "Practiq".
 *
 * These headers are recommended (not strictly required) — OpenRouter
 * still routes the request without them, but you lose useful
 * dashboard attribution.
 */
function makeOpenRouterProvider(): ClaudeProvider {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "OpenRouter provider selected but OPENROUTER_API_KEY is empty. " +
        "Set OPENROUTER_API_KEY in .env.local or change CLAUDE_PROVIDER.",
    );
  }
  const referer =
    process.env.OPENROUTER_HTTP_REFERER?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "https://practiq.dev";
  return makeSdkProvider({
    apiKey,
    baseURL: OPENROUTER_BASE_URL,
    defaultModel: DEFAULT_MODEL_OPENROUTER,
    name: "openrouter",
    defaultHeaders: {
      "HTTP-Referer": referer,
      "X-Title": "Practiq",
    },
  });
}

export function getClaudeProvider(): ClaudeProvider {
  if (cached) return cached;
  const mode = (process.env.CLAUDE_PROVIDER ?? "auto").toLowerCase();
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY?.trim();
  const hasOpenRouterKey = !!process.env.OPENROUTER_API_KEY?.trim();

  // Resolution order:
  //   - explicit CLAUDE_PROVIDER setting wins
  //   - "auto" prefers sdk → openrouter → cli (cheaper & more direct first)
  let chosen: "sdk" | "openrouter" | "cli";
  if (mode === "sdk") chosen = "sdk";
  else if (mode === "openrouter") chosen = "openrouter";
  else if (mode === "cli") chosen = "cli";
  else if (hasAnthropicKey) chosen = "sdk";
  else if (hasOpenRouterKey) chosen = "openrouter";
  else chosen = "cli";

  if (chosen === "sdk") {
    cached = makeSdkProvider({
      apiKey: process.env.ANTHROPIC_API_KEY!,
      defaultModel: DEFAULT_MODEL,
      name: "sdk",
    });
  } else if (chosen === "openrouter") {
    cached = makeOpenRouterProvider();
  } else {
    cached = makeCliProvider();
  }
  return cached;
}
