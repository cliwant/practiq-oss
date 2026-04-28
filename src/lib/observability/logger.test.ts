/**
 * Unit tests for the structured logger (RUN 19).
 *
 * Coverage:
 *   - log.info / warn / error / debug fire and carry context
 *   - level filter respects NODE_LOG_LEVEL (debug suppressed at info)
 *   - PRETTY off (production) emits JSON parseable by Vercel
 *   - .with(ctx) carries base context on every call
 *   - safeLogValue redacts sensitive keys + truncates long strings +
 *     caps deep recursion + caps array length
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

beforeEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
});

describe("log — basic emission", () => {
  it("emits info / warn / error with context as JSON when NODE_ENV=production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.NODE_LOG_LEVEL;
    delete process.env.NODE_LOG_PRETTY;
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const { log } = await import("./logger");
    log.info("hello", { firmId: "f-1" });
    log.warn("warn-msg", { code: 503 });
    log.error("err-msg", { error: "boom" });

    const infoLine = JSON.parse(consoleLog.mock.calls[0][0] as string);
    expect(infoLine.level).toBe("info");
    expect(infoLine.msg).toBe("hello");
    expect(infoLine.firmId).toBe("f-1");
    expect(typeof infoLine.time).toBe("string");

    expect(consoleWarn).toHaveBeenCalledOnce();
    const warnLine = JSON.parse(consoleWarn.mock.calls[0][0] as string);
    expect(warnLine.level).toBe("warn");

    const errLine = JSON.parse(consoleError.mock.calls[0][0] as string);
    expect(errLine.level).toBe("error");
  });

  it("filters out debug below the configured level", async () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.NODE_LOG_LEVEL = "info";
    delete process.env.NODE_LOG_PRETTY;
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
    const { log } = await import("./logger");
    log.debug("should-be-suppressed");
    log.info("should-pass");
    expect(consoleLog).toHaveBeenCalledOnce();
    const line = JSON.parse(consoleLog.mock.calls[0][0] as string);
    expect(line.msg).toBe("should-pass");
  });

  it("emits pretty when NODE_ENV=development (default) without crashing", async () => {
    vi.stubEnv("NODE_ENV", "development");
    delete process.env.NODE_LOG_LEVEL;
    delete process.env.NODE_LOG_PRETTY;
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
    const { log } = await import("./logger");
    log.info("hi", { x: 1 });
    expect(consoleLog).toHaveBeenCalledOnce();
    const printed = consoleLog.mock.calls[0][0] as string;
    // Pretty form starts with a tag emoji + level label, NOT a `{`.
    expect(printed.startsWith("{")).toBe(false);
    expect(printed).toContain("[info]");
    expect(printed).toContain("hi");
  });

  it(".with(ctx) merges base context into every emit", async () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.NODE_LOG_LEVEL = "debug";
    delete process.env.NODE_LOG_PRETTY;
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
    const { log } = await import("./logger");
    const child = log.with({ requestId: "r-1", userId: "u-1" });
    child.info("first", { foo: "bar" });
    child.info("second");
    const first = JSON.parse(consoleLog.mock.calls[0][0] as string);
    const second = JSON.parse(consoleLog.mock.calls[1][0] as string);
    expect(first.requestId).toBe("r-1");
    expect(first.userId).toBe("u-1");
    expect(first.foo).toBe("bar");
    expect(second.requestId).toBe("r-1");
    expect(second.foo).toBeUndefined();
  });
});

describe("safeLogValue", () => {
  it("redacts known sensitive keys", async () => {
    const { safeLogValue } = await import("./logger");
    const v = safeLogValue({
      Authorization: "Bearer secret",
      password: "hunter2",
      passwordHash: "abc",
      x_bootstrap_secret: "z",
      "Stripe-Signature": "t=1,v1=abc",
      "svix-signature": "v1,abc",
      ok: "value",
    });
    expect((v as Record<string, unknown>).Authorization).toBe("[redacted]");
    expect((v as Record<string, unknown>).password).toBe("[redacted]");
    expect((v as Record<string, unknown>).passwordHash).toBe("[redacted]");
    expect((v as Record<string, unknown>)["Stripe-Signature"]).toBe(
      "[redacted]",
    );
    expect((v as Record<string, unknown>)["svix-signature"]).toBe("[redacted]");
    expect((v as Record<string, unknown>).ok).toBe("value");
  });

  it("truncates long strings to 1000 chars", async () => {
    const { safeLogValue } = await import("./logger");
    const longStr = "a".repeat(5000);
    const v = safeLogValue(longStr) as string;
    expect(v.length).toBe(1001); // 1000 + '…'
    expect(v.endsWith("…")).toBe(true);
  });

  it("caps array length at 50", async () => {
    const { safeLogValue } = await import("./logger");
    const arr = Array.from({ length: 100 }, (_, i) => i);
    const v = safeLogValue(arr) as number[];
    expect(v.length).toBe(50);
  });

  it("caps recursion depth at 4", async () => {
    const { safeLogValue } = await import("./logger");
    let nested: unknown = { v: "leaf" };
    for (let i = 0; i < 6; i++) {
      nested = { wrap: nested };
    }
    const out = safeLogValue(nested) as Record<string, unknown>;
    // Walk down 5 levels — by then we should hit "[truncated]".
    let cur: unknown = out;
    for (let i = 0; i < 5; i++) {
      cur = (cur as Record<string, unknown>).wrap;
    }
    expect(cur).toBe("[truncated]");
  });
});
