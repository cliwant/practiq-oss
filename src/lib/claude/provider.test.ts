/**
 * Unit tests for the Claude provider abstraction (RUN 16).
 *
 * Covers the two RUN 16 additions:
 *   1. **Structured output via tool_use** — when CompleteRequest
 *      carries an `outputSchema`, the SDK provider must inject a
 *      synthetic tool definition + tool_choice and return the
 *      tool_use block's input as JSON-stringified text.
 *   2. **Provider fallback chain** — when the primary throws a
 *      transient error (5xx / 429 / network), the fallback is
 *      invoked. Permanent errors (auth / 4xx / schema) propagate.
 *
 * The Anthropic SDK is fully mocked — we only validate that the
 * provider builds the right request shape and unwraps the right
 * response, not the SDK's own behaviour.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

// ─────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────

const { sdkCreateMock, sdkStreamMock } = vi.hoisted(() => ({
  sdkCreateMock: vi.fn(),
  sdkStreamMock: vi.fn(),
}));

vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: class FakeAnthropic {
      messages = {
        create: sdkCreateMock,
        stream: sdkStreamMock,
      };
      constructor(_opts: unknown) {
        void _opts;
      }
    },
  };
});

import {
  __resetProviderForTests,
  getClaudeProvider,
  type CompleteRequest,
} from "./provider";

afterEach(() => {
  vi.clearAllMocks();
  __resetProviderForTests();
});

// ─────────────────────────────────────────────────────────────────
// Structured output (tool_use)
// ─────────────────────────────────────────────────────────────────

describe("provider — structured output via tool_use", () => {
  it("when outputSchema is set, forces a tool_use call and returns the input as JSON text", async () => {
    process.env.ANTHROPIC_API_KEY = "ak_test";
    process.env.OPENROUTER_API_KEY = ""; // disable fallback for this test
    const briefingInput = {
      summary: ["Headline metric is up.", "One follow-up needed."],
      actions: [
        {
          title: "Confirm supplier invoice",
          reason: "Mentioned in last conversation",
          priority: "high",
          confidence: 0.9,
        },
      ],
      watch: [],
      confidence: 0.92,
    };
    sdkCreateMock.mockResolvedValue({
      content: [
        {
          type: "tool_use",
          id: "tu-1",
          name: "submit_daily_briefing",
          input: briefingInput,
        },
      ],
      usage: { input_tokens: 42, output_tokens: 18 },
      stop_reason: "tool_use",
    });

    const provider = getClaudeProvider();
    const req: CompleteRequest = {
      system: "system prompt",
      messages: [{ role: "user", content: "produce briefing" }],
      maxTokens: 1500,
      outputSchema: {
        name: "submit_daily_briefing",
        schema: {
          type: "object",
          properties: { summary: { type: "array" } },
          required: ["summary"],
        },
      },
    };
    const res = await provider.complete(req);

    // Provider unwrapped tool_use input → JSON text.
    expect(JSON.parse(res.text)).toEqual(briefingInput);
    expect(res.stopReason).toBe("tool_use");
    expect(res.inputTokens).toBe(42);
    expect(res.outputTokens).toBe(18);

    // Verify the SDK call shape.
    const call = sdkCreateMock.mock.calls[0][0];
    expect(call.tool_choice).toEqual({
      type: "tool",
      name: "submit_daily_briefing",
    });
    // The synthetic tool was added to the tools array.
    const tools = call.tools;
    expect(Array.isArray(tools)).toBe(true);
    expect(tools.some((t: { name: string }) => t.name === "submit_daily_briefing")).toBe(true);
  });

  it("preserves caller-supplied tools alongside the synthetic outputSchema tool", async () => {
    process.env.ANTHROPIC_API_KEY = "ak_test";
    process.env.OPENROUTER_API_KEY = "";
    sdkCreateMock.mockResolvedValue({
      content: [
        {
          type: "tool_use",
          id: "tu",
          name: "submit",
          input: { ok: true },
        },
      ],
      usage: { input_tokens: 1, output_tokens: 1 },
      stop_reason: "tool_use",
    });

    const provider = getClaudeProvider();
    await provider.complete({
      system: "s",
      messages: [{ role: "user", content: "go" }],
      maxTokens: 100,
      tools: [
        {
          name: "search_knowledge_base",
          input_schema: { type: "object", properties: {} },
        },
      ],
      outputSchema: {
        name: "submit",
        schema: { type: "object", properties: { ok: { type: "boolean" } } },
      },
    });

    const tools = sdkCreateMock.mock.calls[0][0].tools;
    expect(tools.map((t: { name: string }) => t.name)).toEqual([
      "search_knowledge_base",
      "submit",
    ]);
  });

  it("throws a schema-mismatch permanent error when the model returns no matching tool_use", async () => {
    process.env.ANTHROPIC_API_KEY = "ak_test";
    process.env.OPENROUTER_API_KEY = "";
    sdkCreateMock.mockResolvedValue({
      content: [{ type: "text", text: "I don't want to use the tool." }],
      usage: { input_tokens: 1, output_tokens: 1 },
      stop_reason: "end_turn",
    });

    const provider = getClaudeProvider();
    await expect(
      provider.complete({
        system: "s",
        messages: [{ role: "user", content: "go" }],
        maxTokens: 100,
        outputSchema: {
          name: "submit",
          schema: { type: "object", properties: {} },
        },
      }),
    ).rejects.toThrow(/schema mismatch/i);
  });

  it("legacy free-text path still works when outputSchema is absent", async () => {
    process.env.ANTHROPIC_API_KEY = "ak_test";
    process.env.OPENROUTER_API_KEY = "";
    sdkCreateMock.mockResolvedValue({
      content: [
        { type: "text", text: "Hello from the model." },
      ],
      usage: { input_tokens: 5, output_tokens: 5 },
      stop_reason: "end_turn",
    });

    const provider = getClaudeProvider();
    const res = await provider.complete({
      system: "s",
      messages: [{ role: "user", content: "go" }],
      maxTokens: 100,
    });
    expect(res.text).toBe("Hello from the model.");
    expect(res.stopReason).toBe("end_turn");
    // Without outputSchema we shouldn't have set tool_choice.
    expect(sdkCreateMock.mock.calls[0][0].tool_choice).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────
// Fallback chain
// ─────────────────────────────────────────────────────────────────

describe("provider — fallback chain", () => {
  it("falls back to OpenRouter when primary throws a transient 503", async () => {
    process.env.ANTHROPIC_API_KEY = "ak_test";
    process.env.OPENROUTER_API_KEY = "or_test";
    delete process.env.CLAUDE_DISABLE_FALLBACK;

    sdkCreateMock
      // First call (Anthropic-direct) — transient failure
      .mockRejectedValueOnce(new Error("503 service overloaded"))
      // Second call (OpenRouter shim) — succeeds
      .mockResolvedValueOnce({
        content: [{ type: "text", text: "from-fallback" }],
        usage: { input_tokens: 1, output_tokens: 1 },
        stop_reason: "end_turn",
      });

    const provider = getClaudeProvider();
    const res = await provider.complete({
      system: "s",
      messages: [{ role: "user", content: "go" }],
      maxTokens: 100,
    });
    expect(res.text).toBe("from-fallback");
    expect(sdkCreateMock).toHaveBeenCalledTimes(2);
    // Second call should have used the OpenRouter default model.
    const fallbackCall = sdkCreateMock.mock.calls[1][0];
    expect(fallbackCall.model).toContain("anthropic/");
  });

  it("does NOT fall back on a permanent (auth) error — rethrows", async () => {
    process.env.ANTHROPIC_API_KEY = "ak_test";
    process.env.OPENROUTER_API_KEY = "or_test";
    delete process.env.CLAUDE_DISABLE_FALLBACK;

    sdkCreateMock.mockRejectedValueOnce(new Error("401 Invalid API key"));

    const provider = getClaudeProvider();
    await expect(
      provider.complete({
        system: "s",
        messages: [{ role: "user", content: "go" }],
        maxTokens: 100,
      }),
    ).rejects.toThrow(/invalid api key/i);
    expect(sdkCreateMock).toHaveBeenCalledTimes(1);
  });

  it("CLAUDE_DISABLE_FALLBACK=1 keeps the primary even when fallback key is set", async () => {
    process.env.ANTHROPIC_API_KEY = "ak_test";
    process.env.OPENROUTER_API_KEY = "or_test";
    process.env.CLAUDE_DISABLE_FALLBACK = "1";

    sdkCreateMock.mockRejectedValueOnce(new Error("503 service overloaded"));

    const provider = getClaudeProvider();
    await expect(
      provider.complete({
        system: "s",
        messages: [{ role: "user", content: "go" }],
        maxTokens: 100,
      }),
    ).rejects.toThrow(/503/);
    expect(sdkCreateMock).toHaveBeenCalledTimes(1);
    delete process.env.CLAUDE_DISABLE_FALLBACK;
  });

  it("retries with the same outputSchema after fallback (structured output preserved)", async () => {
    process.env.ANTHROPIC_API_KEY = "ak_test";
    process.env.OPENROUTER_API_KEY = "or_test";
    delete process.env.CLAUDE_DISABLE_FALLBACK;

    sdkCreateMock
      .mockRejectedValueOnce(new Error("network ETIMEDOUT"))
      .mockResolvedValueOnce({
        content: [
          {
            type: "tool_use",
            id: "tu",
            name: "submit",
            input: { ok: true },
          },
        ],
        usage: { input_tokens: 1, output_tokens: 1 },
        stop_reason: "tool_use",
      });

    const provider = getClaudeProvider();
    const res = await provider.complete({
      system: "s",
      messages: [{ role: "user", content: "go" }],
      maxTokens: 100,
      outputSchema: {
        name: "submit",
        schema: { type: "object", properties: { ok: { type: "boolean" } } },
      },
    });
    expect(JSON.parse(res.text)).toEqual({ ok: true });
    // Both calls must have carried tool_choice.
    expect(sdkCreateMock.mock.calls[0][0].tool_choice).toEqual({
      type: "tool",
      name: "submit",
    });
    expect(sdkCreateMock.mock.calls[1][0].tool_choice).toEqual({
      type: "tool",
      name: "submit",
    });
  });
});
