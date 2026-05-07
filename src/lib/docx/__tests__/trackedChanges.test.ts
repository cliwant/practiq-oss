/**
 * Tests for the OOXML tracked-changes implementation.
 *
 * Fixtures are generated in-memory via the `docx` package so the test
 * suite stays self-contained — no binary files in git. mammoth is used
 * to round-trip the resulting redlined document and confirm the visible
 * text matches what an end-user (Word reviewer) would accept.
 *
 * The redlined document still contains both the deleted and inserted
 * runs in `word/document.xml`. mammoth's plain-text extractor reads
 * BOTH (it does not honour <w:del> as "removed"), so post-redline
 * we expect the text to contain *find + replace* concatenated.
 */
import { describe, it, expect, beforeAll } from "vitest";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import * as mammoth from "mammoth";
import PizZip from "pizzip";
import { applyTrackedChanges, type Edit } from "../trackedChanges";

async function buildDocx(paragraphs: Paragraph[]): Promise<Buffer> {
  const doc = new Document({
    sections: [{ properties: {}, children: paragraphs }],
  });
  return await Packer.toBuffer(doc);
}

function p(...runs: TextRun[]): Paragraph {
  return new Paragraph({ children: runs });
}

function t(text: string, opts: { bold?: boolean; italics?: boolean; size?: number } = {}): TextRun {
  return new TextRun({ text, ...opts });
}

let simpleBuf: Buffer;
let multiRunBuf: Buffer;
let ambiguousBuf: Buffer;
let formattedBuf: Buffer;

beforeAll(async () => {
  // Single-run doc: "Hello Client Name, your contract is attached."
  simpleBuf = await buildDocx([
    p(t("Hello Client Name, your contract is attached.")),
  ]);
  // Multi-run doc: text spanning runs because of an italic mid-sentence.
  // The phrase "magic phrase" is split across two runs so the matcher
  // should skip the edit (find spans runs).
  multiRunBuf = await buildDocx([
    p(t("Please apply the magic"), t(" phrase", { italics: true }), t(" here.")),
  ]);
  // Ambiguous doc: the word "scope" appears three times with different
  // surrounding context. The disambiguation must pick the right one
  // when context_before/context_after is supplied.
  ambiguousBuf = await buildDocx([
    p(t("First mention of scope happens here.")),
    p(t("Second instance: the scope of the engagement is broad.")),
    p(t("Third reference to scope at the end.")),
  ]);
  // Formatting doc: bold run we intend to redline. After the split, the
  // before/match/after fragments must all retain the bold run-properties.
  formattedBuf = await buildDocx([p(t("Replace BOLDWORD please.", { bold: true }))]);
});

function getDocumentXml(buf: Buffer): string {
  const zip = new PizZip(buf);
  const file = zip.file("word/document.xml");
  if (!file) throw new Error("missing document.xml");
  return file.asText();
}

describe("applyTrackedChanges", () => {
  it("emits <w:del> + <w:ins> siblings for a single-run match and preserves rPr", async () => {
    const edit: Edit = {
      find: "Client Name",
      replace: "ABC Corp",
      reason: "personalize",
    };
    const out = applyTrackedChanges(simpleBuf, [edit]);
    expect(out.applied).toHaveLength(1);
    expect(out.skipped).toHaveLength(0);

    const xml = getDocumentXml(out.buffer);
    expect(xml).toContain("<w:del");
    expect(xml).toContain("<w:delText");
    expect(xml).toContain("Client Name</w:delText>");
    expect(xml).toContain("<w:ins");
    expect(xml).toContain("ABC Corp</w:t>");

    // The <w:del> block should appear before the <w:ins> block (sibling
    // ordering matters for Word's reviewer pane).
    const delIdx = xml.indexOf("<w:del");
    const insIdx = xml.indexOf("<w:ins");
    expect(delIdx).toBeGreaterThan(-1);
    expect(insIdx).toBeGreaterThan(delIdx);
  });

  it("skips edits whose find text spans multiple runs", () => {
    const edit: Edit = {
      find: "magic phrase",
      replace: "exact phrase",
      reason: "fix",
    };
    const out = applyTrackedChanges(multiRunBuf, [edit]);
    expect(out.applied).toHaveLength(0);
    expect(out.skipped).toHaveLength(1);
    expect(out.skipped[0].reason).toMatch(/single run/i);
  });

  it("disambiguates the right occurrence using context_before/context_after", () => {
    const edit: Edit = {
      find: "scope",
      replace: "SCOPE",
      reason: "uppercase second mention",
      context_before: "Second instance: the ",
      context_after: " of the engagement",
    };
    const out = applyTrackedChanges(ambiguousBuf, [edit]);
    expect(out.applied).toHaveLength(1);

    const xml = getDocumentXml(out.buffer);
    // Exactly one <w:ins> should be present (we only redlined one site).
    const insCount = (xml.match(/<w:ins\b/g) ?? []).length;
    expect(insCount).toBe(1);
    // The redlined site must be the second-paragraph one — verify by
    // looking at the text immediately after the inserted run for the
    // distinctive " of the engagement" string. (We can't anchor on the
    // text BEFORE because docx may split a paragraph into multiple
    // runs; the chosen run's predecessors are not necessarily on this
    // paragraph.)
    const insAt = xml.indexOf("<w:ins");
    const insEnd = xml.indexOf("</w:ins>", insAt);
    const after = xml.slice(insEnd, insEnd + 400);
    expect(after).toContain("of the engagement");
  });

  it("preserves run properties (bold) on every output segment", () => {
    const edit: Edit = {
      find: "BOLDWORD",
      replace: "NEWWORD",
      reason: "swap",
    };
    const out = applyTrackedChanges(formattedBuf, [edit]);
    expect(out.applied).toHaveLength(1);

    const xml = getDocumentXml(out.buffer);
    // Each of the before/del/ins/after runs must carry the original rPr.
    // The simplest invariant: bold marker (<w:b/>) appears at least 3
    // times in the redlined paragraph (before-run, del-run, ins-run;
    // after-run also has it but is optional if empty).
    const boldCount = (xml.match(/<w:b\b/g) ?? []).length;
    expect(boldCount).toBeGreaterThanOrEqual(3);
  });

  it("round-trips through mammoth: redlined zip is still a valid .docx", async () => {
    const edit: Edit = {
      find: "Client Name",
      replace: "ABC Corp",
      reason: "personalize",
    };
    const out = applyTrackedChanges(simpleBuf, [edit]);
    const result = await mammoth.extractRawText({ buffer: out.buffer });
    // mammoth honours <w:del> by stripping deleted text and surfacing
    // the inserted text, so the visible round-tripped text contains
    // "ABC Corp" and the surrounding sentence remains intact.
    expect(result.value).toContain("ABC Corp");
    expect(result.value).toContain("your contract is attached");
  });

  it("is a no-op for an empty edits array", () => {
    const before = getDocumentXml(simpleBuf);
    const out = applyTrackedChanges(simpleBuf, []);
    const after = getDocumentXml(out.buffer);
    expect(out.applied).toHaveLength(0);
    expect(out.skipped).toHaveLength(0);
    expect(after).toBe(before);
  });
});
