/**
 * DOCX redline accuracy evals (5 cases).
 *
 * Each case feeds a synthesized .docx through `applyTrackedChanges` and
 * inspects the resulting OOXML for the expected `<w:del>` / `<w:ins>`
 * markup. These are deterministic — no Claude calls, $0 per run — so we
 * can include them in CI without budget concerns.
 *
 * Pass criteria per case: every assertion in the `assert` callback must
 * return true.
 */
import PizZip from "pizzip";
import { applyTrackedChanges, type Edit } from "../../src/lib/docx/trackedChanges";
import { buildRedlineFixture } from "./fixtures";
import type { EvalCaseResult } from "./types";

interface RedlineCase {
  id: string;
  description: string;
  build: () => Promise<Buffer>;
  edits: Edit[];
  assert: (xml: string, applied: number, skipped: number) => string | null;
}

const CASES: RedlineCase[] = [
  {
    id: "1_single_word_substitution",
    description: '"Client" → "Customer" appears once as del+ins',
    build: () =>
      buildRedlineFixture({
        paragraphs: [
          { text: "This Agreement is between the Firm and the Client." },
          { text: "Other paragraph with no match." },
        ],
      }),
    edits: [
      {
        find: "Client",
        replace: "Customer",
        reason: "rename per legal review",
      },
    ],
    assert: (xml, applied) => {
      if (applied !== 1) return `applied=${applied}, want 1`;
      const delMatches = xml.match(/<w:delText[^>]*>Client<\/w:delText>/g) || [];
      if (delMatches.length !== 1)
        return `expected 1 <w:delText>Client</w:delText>, got ${delMatches.length}`;
      if (!/<w:t[^>]*>Customer<\/w:t>/.test(xml))
        return "missing Customer insertion";
      if (!/<w:ins\b/.test(xml) || !/<w:del\b/.test(xml))
        return "missing <w:ins> or <w:del> wrapper";
      return null;
    },
  },
  {
    id: "2_multi_occurrence_disambiguation",
    description: '"scope" three times, redline only the contextual one',
    build: () =>
      buildRedlineFixture({
        paragraphs: [
          { text: "The scope of work is defined herein." },
          { text: "Project scope shall include monthly bookkeeping." },
          { text: "Any change to scope requires written approval." },
        ],
      }),
    edits: [
      {
        find: "scope",
        replace: "engagement scope",
        context_before: "Project ",
        context_after: " shall include",
        reason: "tighten language",
      },
    ],
    assert: (xml, applied) => {
      if (applied !== 1) return `applied=${applied}, want 1`;
      const dels = (xml.match(/<w:delText[^>]*>scope<\/w:delText>/g) || []).length;
      if (dels !== 1) return `expected 1 del of "scope", got ${dels}`;
      // The two non-targeted "scope" runs must remain untouched as <w:t>.
      const plain = (xml.match(/<w:t[^>]*>([^<]*scope[^<]*)<\/w:t>/g) || []).length;
      if (plain < 2) return `expected ≥2 untouched 'scope' runs, got ${plain}`;
      return null;
    },
  },
  {
    id: "3_long_phrase_preserved",
    description: '"to be determined" → "as set forth in Schedule B"',
    build: () =>
      buildRedlineFixture({
        paragraphs: [
          { text: "The fee is to be determined upon agreement." },
        ],
      }),
    edits: [
      {
        find: "to be determined",
        replace: "as set forth in Schedule B",
        reason: "specificity",
      },
    ],
    assert: (xml, applied) => {
      if (applied !== 1) return `applied=${applied}`;
      if (!/<w:delText[^>]*>to be determined<\/w:delText>/.test(xml))
        return "missing del of full phrase";
      if (!/<w:t[^>]*>as set forth in Schedule B<\/w:t>/.test(xml))
        return "missing ins of replacement phrase";
      return null;
    },
  },
  {
    id: "4_special_chars_xml_escaped",
    description: 'replacement text containing &, <, > is properly escaped',
    build: () =>
      buildRedlineFixture({
        paragraphs: [{ text: "Replace TOKEN here." }],
      }),
    edits: [
      {
        find: "TOKEN",
        replace: "A & B <foo> 'quote' \"d\"",
        reason: "stress test",
      },
    ],
    assert: (xml, applied) => {
      if (applied !== 1) return `applied=${applied}`;
      // Escaped form must be in the doc.
      if (!/A &amp; B &lt;foo&gt;/.test(xml))
        return "ampersand or angle brackets not escaped";
      // Raw unescaped sequence must NOT be in the doc as text content
      // (it would appear inside a <w:t> if the encoder had failed).
      if (/<w:t[^>]*>A & B <foo>/.test(xml))
        return "raw unescaped sequence leaked into <w:t>";
      return null;
    },
  },
  {
    id: "5_formatting_preserved",
    description: "bold run keeps <w:rPr> on every split segment",
    build: () =>
      buildRedlineFixture({
        paragraphs: [
          { text: "Plain leading. ", bold: false },
          { text: "BOLD_TARGET in middle.", bold: true },
          { text: " Plain trailing.", bold: false },
        ],
      }),
    edits: [
      {
        find: "BOLD_TARGET",
        replace: "BOLD_NEW",
        reason: "preserve formatting",
      },
    ],
    assert: (xml, applied) => {
      if (applied !== 1) return `applied=${applied}`;
      // The replacement must sit inside an <w:r> that carries <w:rPr>
      // with <w:b/>. We look for the rPr block immediately before the
      // inserted text run.
      const insBlock = xml.match(
        /<w:ins\b[^>]*>([\s\S]*?)<\/w:ins>/,
      );
      if (!insBlock) return "no <w:ins> block emitted";
      if (!/<w:rPr\b/.test(insBlock[1]))
        return "<w:rPr> not preserved on inserted run";
      if (!/<w:b\b/.test(insBlock[1]))
        return "bold property not preserved on inserted run";
      // Same expectation on the deletion block.
      const delBlock = xml.match(/<w:del\b[^>]*>([\s\S]*?)<\/w:del>/);
      if (!delBlock || !/<w:rPr\b/.test(delBlock[1]))
        return "<w:rPr> not preserved on deleted run";
      return null;
    },
  },
];

export async function runDocxRedlineSuite(): Promise<EvalCaseResult[]> {
  const out: EvalCaseResult[] = [];
  for (const c of CASES) {
    const startedAt = Date.now();
    const buf = await c.build();
    const result = applyTrackedChanges(buf, c.edits, { author: "eval-bot" });
    const xml = new PizZip(result.buffer).file("word/document.xml")!.asText();
    const failure = c.assert(xml, result.applied.length, result.skipped.length);
    const passed = failure === null;
    out.push({
      suite: "docx_redline",
      caseId: c.id,
      passed,
      axes: {
        applied: result.applied.length,
        skipped: result.skipped.length,
      },
      notes: failure ?? c.description,
      costUsd: 0,
      durationMs: Date.now() - startedAt,
    });
    console.log(
      `[redline] ${c.id} ${passed ? "PASS" : "FAIL"} ${failure ?? c.description}`,
    );
  }
  return out;
}

export const DOCX_REDLINE_CASE_COUNT = CASES.length;
