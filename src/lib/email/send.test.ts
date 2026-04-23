import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { sendEmail } from "./send";

describe("sendEmail (unconfigured)", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  const originalKey = process.env.RESEND_API_KEY;

  beforeEach(() => {
    // Force "no API key" path.
    delete process.env.RESEND_API_KEY;
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    if (originalKey) process.env.RESEND_API_KEY = originalKey;
    logSpy.mockRestore();
  });

  it("returns dev-logged on missing API key", async () => {
    const res = await sendEmail({
      to: "someone@firm.com",
      subject: "Hi",
      html: "<p>hi</p>",
      text: "hi",
    });
    expect(res.ok).toBe(true);
    expect(res.provider).toBe("dev-logged");
  });

  it("writes the full payload to console when dev-logging", async () => {
    await sendEmail({
      to: "someone@firm.com",
      subject: "Important subject",
      html: "<p>body</p>",
      text: "body text",
      tag: "welcome",
    });
    const all = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(all).toContain("someone@firm.com");
    expect(all).toContain("Important subject");
    expect(all).toContain("body text");
    expect(all).toContain("welcome");
  });

  it("skips invalid recipient address without logging", async () => {
    const res = await sendEmail({
      to: "not-an-email",
      subject: "s",
      html: "",
      text: "",
    });
    expect(res.ok).toBe(false);
    expect(res.provider).toBe("skipped");
    expect(res.error).toMatch(/invalid/i);
  });

  it("skips empty recipient without throwing", async () => {
    const res = await sendEmail({
      to: "",
      subject: "s",
      html: "",
      text: "",
    });
    expect(res.ok).toBe(false);
    expect(res.provider).toBe("skipped");
  });
});
