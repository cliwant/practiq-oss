import { describe, it, expect, vi } from "vitest";
import { withDbRetry, isTransient } from "./db-retry";

describe("isTransient", () => {
  it("classifies known transient errors", () => {
    expect(isTransient("Connection terminated unexpectedly")).toBe(true);
    expect(isTransient("socket hang up")).toBe(true);
    expect(isTransient("ECONNRESET while reading response")).toBe(true);
    expect(isTransient("connection closed by server")).toBe(true);
    expect(isTransient("pool exhausted: P2024")).toBe(true);
  });

  it("lets non-transient errors through", () => {
    expect(isTransient("Unique constraint failed")).toBe(false);
    expect(isTransient("Record not found")).toBe(false);
    expect(isTransient("Invalid input syntax")).toBe(false);
  });
});

describe("withDbRetry", () => {
  it("returns the result on first-try success", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const out = await withDbRetry(fn);
    expect(out).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries once on transient error then succeeds", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("Connection terminated unexpectedly"))
      .mockResolvedValue("recovered");
    const out = await withDbRetry(fn);
    expect(out).toBe("recovered");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("rethrows non-transient errors immediately (no retry)", async () => {
    const fn = vi
      .fn()
      .mockRejectedValue(new Error("Unique constraint failed"));
    await expect(withDbRetry(fn)).rejects.toThrow("Unique constraint");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("stops after max attempts even if transient", async () => {
    const fn = vi
      .fn()
      .mockRejectedValue(new Error("Connection terminated unexpectedly"));
    await expect(withDbRetry(fn, { attempts: 3 })).rejects.toThrow(
      "Connection terminated",
    );
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
