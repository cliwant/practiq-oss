import { describe, it, expect } from "vitest";
import { applyTrackedChanges } from "@/lib/docx/trackedChanges";
import {
  buildSampleDocx,
  SAMPLE_PRIMARY,
  SAMPLE_PRIORS,
  memoToPlainText,
  SAMPLE_DESCRIPTORS,
} from "@/lib/demo/sample-memos";
import { renderTrackedChangesHtml } from "@/lib/demo/render-preview";

/**
 * Pipeline integration test for /demo/redline. Asserts the
 * non-LLM portions of the request flow:
 *   1. SampleMemo → .docx Buffer round trip
 *   2. Tracked-changes engine accepts a synthesized edit and emits
 *      ins/del XML
 *   3. mammoth-based preview renderer marks ins/del with the
 *      sentinel-derived span classes
 *
 * The actual LLM call is not exercised here — it's tested indirectly
 * by the deployed preview check before promotion to prod.
 */
describe("demo/redline pipeline", () => {
  it("descriptors expose primary + priors metadata", () => {
    expect(SAMPLE_DESCRIPTORS.primary.clientName).toContain("Acme");
    expect(SAMPLE_DESCRIPTORS.priors.length).toBe(SAMPLE_PRIORS.length);
    expect(SAMPLE_DESCRIPTORS.primary.wordCount).toBeGreaterThan(200);
  });

  it("buildSampleDocx produces a non-empty .docx Buffer", async () => {
    const buf = await buildSampleDocx(SAMPLE_PRIMARY);
    expect(buf.byteLength).toBeGreaterThan(2000);
    // .docx files start with the PK zip magic
    expect(buf[0]).toBe(0x50);
    expect(buf[1]).toBe(0x4b);
  });

  it("memoToPlainText preserves headings + paragraphs", () => {
    const txt = memoToPlainText(SAMPLE_PRIMARY);
    expect(txt).toContain("# Q3 2026 Close Memo — DRAFT");
    expect(txt).toContain("## Inventory");
    expect(txt).toContain("inventory write-down");
  });

  it("end-to-end: build sample → apply tracked changes → render preview HTML", async () => {
    const buf = await buildSampleDocx(SAMPLE_PRIMARY);
    const result = applyTrackedChanges(
      buf,
      [
        {
          find: "inventory write-down",
          replace: "lower of cost or net realizable value adjustment",
          reason: "Prior memo convention",
          author: "Practiq Demo",
        },
      ],
      { author: "Practiq Demo" },
    );
    expect(result.applied.length).toBe(1);
    expect(result.skipped.length).toBe(0);

    const rendered = await renderTrackedChangesHtml({
      docxBuffer: result.buffer,
    });
    expect(rendered.html).toContain("redline-ins");
    expect(rendered.html).toContain("redline-del");
    expect(rendered.html).toContain(
      "lower of cost or net realizable value adjustment",
    );
  });
});
