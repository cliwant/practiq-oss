import { describe, expect, it } from "vitest";
import { renderShadowEntry, type AuditShadowEvent } from "./audit-shadow";

const baseEvent: AuditShadowEvent = {
  approvalItemId: "appr_123",
  clientId: "cli_kim_restaurant",
  userId: "usr_jen",
  itemType: "briefing",
  itemTitle: "Morning briefing — Kim's Restaurant",
  decision: "approve",
  originalContent: {
    summary: ["Food cost +12% vs Feb", "Cash position healthy"],
    watch: [],
  },
  reviewer: { userId: "usr_jen", email: "jen@parkcpa.com" },
  aiNotes: "Pinned a question about the new supplier",
  aiConfidence: 0.94,
  timestamp: new Date("2026-04-28T01:23:45.000Z"),
};

describe("renderShadowEntry", () => {
  it("emits the H2 header + decision verb + item type", () => {
    const md = renderShadowEntry(baseEvent);
    expect(md).toContain(
      "## 2026-04-28T01:23:45.000Z — APPROVE — briefing: Morning briefing — Kim's Restaurant",
    );
  });

  it("includes structured client + reviewer + confidence fields", () => {
    const md = renderShadowEntry(baseEvent);
    expect(md).toContain("**Approval ID**: appr_123");
    expect(md).toContain("**Client ID**: cli_kim_restaurant");
    expect(md).toContain("**Reviewer**: jen@parkcpa.com");
    expect(md).toContain("**AI confidence**: 94%");
  });

  it("falls back to userId when reviewer email is missing", () => {
    const md = renderShadowEntry({
      ...baseEvent,
      reviewer: { userId: "usr_jen", email: null },
    });
    expect(md).toContain("**Reviewer**: usr_jen");
  });

  it("renders Original draft as JSON code block", () => {
    const md = renderShadowEntry(baseEvent);
    expect(md).toMatch(/### Original draft\n```json\n[\s\S]*?Food cost \+12%/);
  });

  it("emits Modified content section only when modifiedContent is set", () => {
    const without = renderShadowEntry(baseEvent);
    expect(without).not.toContain("### Modified content");

    const withMod = renderShadowEntry({
      ...baseEvent,
      decision: "modify",
      modifiedContent: { summary: ["Edited"], watch: [] },
    });
    expect(withMod).toContain("### Modified content");
    expect(withMod).toContain('"summary": [\n    "Edited"');
  });

  it("includes reviewer notes when present, omits the section when not", () => {
    const without = renderShadowEntry(baseEvent);
    expect(without).not.toContain("### Reviewer notes");

    const withNotes = renderShadowEntry({
      ...baseEvent,
      reviewerNotes: "Spoke with Kim — supplier change confirmed.",
    });
    expect(withNotes).toContain("### Reviewer notes");
    expect(withNotes).toContain("Spoke with Kim — supplier change confirmed.");
  });

  it("renders n/a confidence when null", () => {
    const md = renderShadowEntry({ ...baseEvent, aiConfidence: null });
    expect(md).toContain("**AI confidence**: n/a");
  });

  it("survives unserializable content without throwing", () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    const md = renderShadowEntry({
      ...baseEvent,
      originalContent: cyclic,
    });
    expect(md).toContain("(unserializable:");
  });

  it("ends with a horizontal rule for grep -A boundary detection", () => {
    const md = renderShadowEntry(baseEvent);
    expect(md.trimEnd().endsWith("---")).toBe(true);
  });
});
