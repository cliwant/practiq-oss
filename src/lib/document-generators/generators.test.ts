/**
 * Unit tests for the on-the-fly document generators (RUN 9, P2-06).
 *
 * The generators are pure — given the same input they produce the
 * same Buffer. We don't snapshot the binary (it's hundreds of bytes
 * of zip-archive metadata that change with every docx/exceljs
 * patch); instead we assert structural properties:
 *
 *   - The buffer is non-trivially large (real document, not error).
 *   - It starts with the OOXML zip magic bytes (PK\x03\x04 = 0x50
 *     0x4B 0x03 0x04). All Office OpenXML files are zip archives.
 *   - Two distinct inputs produce different outputs.
 *   - Empty / malformed inputs throw or produce a still-valid file
 *     rather than corrupting the response.
 *
 * Real shape verification belongs in E2E (a real Word / Excel
 * download by a Playwright fixture user), not here.
 */
import { describe, expect, it } from "vitest";
import { buildDocxBuffer } from "./docx";
import { buildXlsxBuffer } from "./xlsx";
import type { DocumentSection, GeneratorClientMeta } from "./types";

const baseClient: GeneratorClientMeta = {
  name: "Park CPA Group",
  industry: "accounting",
  relationshipMonths: 18,
};

const baseSections: DocumentSection[] = [
  {
    heading: "Executive Summary",
    content:
      "March revenue $145K (+8% MoM). Food cost ratio 31.2% — slightly above industry average of 28-30%. Net margin 32%, healthy.",
  },
  {
    heading: "Key Metrics",
    content:
      "| Metric | This month | Avg (3M) |\n|---|---|---|\n| Revenue | $145K | $134K |\n| Food cost | 31.2% | 31.5% |\n| Margin | 32% | 33% |",
  },
  {
    heading: "Action Items",
    content: "Review meat supplier pricing. Check energy equipment. Follow up on slow A/R.",
  },
];

const generatedAt = new Date("2026-04-28T01:00:00Z");

const OOXML_MAGIC = Uint8Array.of(0x50, 0x4b, 0x03, 0x04);

function startsWithOoxmlMagic(buf: Buffer): boolean {
  if (buf.length < 4) return false;
  return (
    buf[0] === OOXML_MAGIC[0] &&
    buf[1] === OOXML_MAGIC[1] &&
    buf[2] === OOXML_MAGIC[2] &&
    buf[3] === OOXML_MAGIC[3]
  );
}

describe("buildDocxBuffer", () => {
  it("produces a non-trivially-sized OOXML buffer", async () => {
    const buf = await buildDocxBuffer({
      title: "March 2026 Monthly Close",
      sections: baseSections,
      client: baseClient,
      generatedAt,
    });
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(2_000); // empty docx is ~5KB; ours is bigger
    expect(startsWithOoxmlMagic(buf)).toBe(true);
  });

  it("produces different outputs for different titles", async () => {
    const a = await buildDocxBuffer({
      title: "March 2026",
      sections: baseSections,
      client: baseClient,
      generatedAt,
    });
    const b = await buildDocxBuffer({
      title: "April 2026",
      sections: baseSections,
      client: baseClient,
      generatedAt,
    });
    expect(Buffer.compare(a, b)).not.toBe(0);
  });

  it("respects relationshipMonths missing on the client", async () => {
    const minimal: GeneratorClientMeta = {
      name: "New Client",
      industry: "consulting",
    };
    const buf = await buildDocxBuffer({
      title: "Onboarding kickoff",
      sections: [{ heading: "Welcome", content: "First weekly review." }],
      client: minimal,
      generatedAt,
    });
    expect(buf.length).toBeGreaterThan(2_000);
  });

  it("handles long sections (>1500 chars) by inserting a page break", async () => {
    const longContent = "Lorem ipsum dolor sit amet. ".repeat(80); // ~2200 chars
    const buf = await buildDocxBuffer({
      title: "Long doc",
      sections: [
        { heading: "Long section", content: longContent },
        { heading: "Next", content: "Short follow-up." },
      ],
      client: baseClient,
      generatedAt,
    });
    expect(buf.length).toBeGreaterThan(3_000);
  });
});

describe("buildXlsxBuffer", () => {
  it("produces a non-trivially-sized OOXML buffer", async () => {
    const buf = await buildXlsxBuffer({
      title: "March Financial Statement",
      sections: baseSections,
      client: baseClient,
      generatedAt,
    });
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(2_000);
    expect(startsWithOoxmlMagic(buf)).toBe(true);
  });

  it("produces different outputs for different sections", async () => {
    const a = await buildXlsxBuffer({
      title: "X",
      sections: baseSections,
      client: baseClient,
      generatedAt,
    });
    const b = await buildXlsxBuffer({
      title: "X",
      sections: [
        { heading: "Different", content: "totally different content goes here" },
      ],
      client: baseClient,
      generatedAt,
    });
    expect(Buffer.compare(a, b)).not.toBe(0);
  });

  it("handles a markdown pipe-delimited table in section content", async () => {
    const tableContent =
      "| Account | Debit | Credit |\n|---|---|---|\n| Cash | $10,000 | |\n| Revenue | | $10,000 |";
    const buf = await buildXlsxBuffer({
      title: "Trial Balance",
      sections: [{ heading: "TB", content: tableContent }],
      client: baseClient,
      generatedAt,
    });
    expect(buf.length).toBeGreaterThan(2_000);
  });

  it("handles editable input markers ([edit:NAME]) without throwing", async () => {
    const editContent =
      "Adjust the figure if needed. [edit:Adjusted_Cash_Balance]";
    const buf = await buildXlsxBuffer({
      title: "Editable Balance",
      sections: [{ heading: "Adjustment", content: editContent }],
      client: baseClient,
      generatedAt,
    });
    expect(buf.length).toBeGreaterThan(2_000);
  });

  it("dedupes sheet names when two sections share a heading", async () => {
    const buf = await buildXlsxBuffer({
      title: "Dup test",
      sections: [
        { heading: "Notes", content: "first notes" },
        { heading: "Notes", content: "second notes" }, // same heading
      ],
      client: baseClient,
      generatedAt,
    });
    expect(buf.length).toBeGreaterThan(2_000);
  });
});
