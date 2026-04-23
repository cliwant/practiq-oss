import { describe, it, expect } from "vitest";
import { isMostlyBinary } from "./text-binary";

describe("isMostlyBinary", () => {
  it("accepts plain text", () => {
    expect(isMostlyBinary("Hello world, this is plain text.")).toBe(false);
  });

  it("accepts markdown with code fences and tables", () => {
    const md = `# Heading

\`\`\`ts
const x = 1;
\`\`\`

| a | b |
|---|---|
| 1 | 2 |`;
    expect(isMostlyBinary(md)).toBe(false);
  });

  it("accepts CSV with commas and newlines", () => {
    const csv = `name,role,rate\nAlice,CPA,150\nBob,Partner,200\n`;
    expect(isMostlyBinary(csv)).toBe(false);
  });

  it("rejects content with many null bytes", () => {
    const trash = "\x00\x00\x00\x01\x02\x03\x04\x05hello\x00\x00".repeat(200);
    expect(isMostlyBinary(trash)).toBe(true);
  });

  it("rejects a pdf-like byte stream (lots of control chars)", () => {
    const pdfBytes = Array.from({ length: 500 }, (_, i) =>
      String.fromCharCode((i * 7 + 1) % 32),
    ).join("");
    expect(isMostlyBinary(pdfBytes)).toBe(true);
  });

  it("handles empty string without throwing", () => {
    expect(isMostlyBinary("")).toBe(false);
  });

  it("respects the sampleSize override", () => {
    // Bad bytes only in the first 100 chars; if we sample just 50 we flag.
    const badStart = "\x00".repeat(50) + "ok ".repeat(2000);
    expect(isMostlyBinary(badStart, 50)).toBe(true);
    expect(isMostlyBinary(badStart, 2000)).toBe(false);
  });
});
