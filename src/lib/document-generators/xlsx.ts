/**
 * .xlsx generator (RUN 9 — P2-06).
 *
 * Pure-TS via `exceljs`. Produces a Buffer streamed by
 * /api/outputs/[id]/download. No filesystem write — same zero-storage
 * policy as the docx generator.
 *
 * **Layout strategy** for the section-shaped ApprovalItem content:
 *
 *   - Sheet 1 ("Summary"): client name, title, generated date, a
 *     section index (heading → row 1 of detail), so the operator
 *     can navigate quickly when there are many sections.
 *   - One sheet per section: heading as title row, content split on
 *     blank lines into rows; if the content looks like a table
 *     (contains lines with `|` separators or repeated tabs), we
 *     parse those into proper Excel cells instead of dumping the
 *     entire content into A1.
 *
 * **Editable cells convention**: we mark "input" cells (numeric
 * placeholders that the operator may want to override) with a
 * subtle fill (#FFF8E1) — matches the design-doc convention. The
 * model can flag editable spots by writing `[edit:NAME]` markers
 * into the prose; the parser substitutes them with empty fillable
 * cells. Falls back gracefully when the model doesn't use the
 * marker.
 */
import ExcelJS from "exceljs";
import type { DocumentSection, GeneratorClientMeta } from "./types";

export interface XlsxBuildInput {
  title: string;
  sections: DocumentSection[];
  client: GeneratorClientMeta;
  generatedAt: Date;
}

const EDIT_MARKER_RE = /\[edit:([^\]]+)\]/g;
const FILL_INPUT = "FFF8E1"; // Soft yellow — Excel uses ARGB sans alpha-as-FF
const FILL_HEADER = "F0F4FA";
const BORDER_THIN = { style: "thin" as const, color: { argb: "FFCCCCCC" } };

export async function buildXlsxBuffer(input: XlsxBuildInput): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Practiq";
  wb.created = input.generatedAt;
  wb.modified = input.generatedAt;
  wb.title = input.title;
  wb.description = `Practiq-generated ${input.title} for ${input.client.name}`;

  // Summary sheet.
  const summary = wb.addWorksheet("Summary", {
    properties: { tabColor: { argb: "FF2563EB" } },
  });
  summary.columns = [
    { header: "Field", key: "field", width: 32 },
    { header: "Value", key: "value", width: 60 },
  ];
  summary.getRow(1).font = { bold: true };
  summary.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: `FF${FILL_HEADER}` },
  };
  summary.addRow({ field: "Client", value: input.client.name });
  summary.addRow({ field: "Industry", value: input.client.industry });
  if (input.client.relationshipMonths) {
    summary.addRow({
      field: "Relationship",
      value: `${input.client.relationshipMonths} months`,
    });
  }
  summary.addRow({ field: "Title", value: input.title });
  summary.addRow({
    field: "Generated",
    value: input.generatedAt.toISOString().slice(0, 10),
  });
  summary.addRow({});
  summary.addRow({ field: "Section index", value: "" }).font = { bold: true };
  for (const s of input.sections) {
    summary.addRow({
      field: s.heading,
      value: `${s.content.length} chars · see sheet "${truncateSheetName(s.heading)}"`,
    });
  }

  // Per-section sheets.
  const usedNames = new Set<string>(["Summary"]);
  for (const s of input.sections) {
    const name = uniqueSheetName(s.heading, usedNames);
    usedNames.add(name);
    const sh = wb.addWorksheet(name);
    sh.columns = [
      { header: "Item", key: "item", width: 36 },
      { header: "Detail", key: "detail", width: 60 },
    ];
    sh.getRow(1).font = { bold: true };
    sh.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: `FF${FILL_HEADER}` },
    };

    // Try to detect pipe-delimited tables — common when the model
    // emits Markdown-style tables in the section content.
    const tableLines = parsePipeTable(s.content);
    if (tableLines && tableLines.rows.length > 0) {
      // Replace the default 2-column header with the parsed table headers.
      sh.spliceColumns(1, 2);
      sh.columns = tableLines.headers.map((h) => ({
        header: h,
        key: slugify(h),
        width: Math.max(14, Math.min(40, h.length + 8)),
      }));
      sh.getRow(1).font = { bold: true };
      sh.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: `FF${FILL_HEADER}` },
      };
      for (const row of tableLines.rows) {
        const obj: Record<string, string> = {};
        tableLines.headers.forEach((h, i) => {
          obj[slugify(h)] = row[i] ?? "";
        });
        sh.addRow(obj);
      }
    } else {
      // Free-form prose — split on blank lines into rows. Detect
      // [edit:NAME] markers and create editable input cells.
      const paragraphs = s.content.split(/\n\s*\n/).filter((p) => p.trim());
      for (const p of paragraphs) {
        const matches = [...p.matchAll(EDIT_MARKER_RE)];
        if (matches.length === 0) {
          sh.addRow({ item: "Detail", detail: p.trim() });
          continue;
        }
        // For each [edit:X] marker, emit a label row + an editable input row.
        for (const m of matches) {
          const label = m[1].trim();
          const before = p.slice(0, m.index ?? 0).trim();
          if (before) {
            sh.addRow({ item: "Note", detail: before });
          }
          const r = sh.addRow({ item: label, detail: "" });
          r.getCell(2).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: `FF${FILL_INPUT}` },
          };
          r.getCell(2).border = {
            top: BORDER_THIN,
            left: BORDER_THIN,
            bottom: BORDER_THIN,
            right: BORDER_THIN,
          };
        }
      }
    }
  }

  // Reasonable default: freeze the header row + zoom 110% for legibility.
  for (const sheet of wb.worksheets) {
    sheet.views = [{ state: "frozen", ySplit: 1, zoomScale: 110 }];
  }

  // ExcelJS's `writeBuffer` returns ArrayBuffer-shape data. Wrap to
  // a Node Buffer so the caller's `Response` body is correctly typed.
  const ab = await wb.xlsx.writeBuffer();
  return Buffer.from(ab);
}

interface PipeTable {
  headers: string[];
  rows: string[][];
}

function parsePipeTable(text: string): PipeTable | null {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length < 2) return null;
  const tableLines = lines.filter((l) => /\|/.test(l));
  if (tableLines.length < 2) return null;
  // Markdown table alignment row, e.g. |---|:---:|---:|
  const sep = tableLines[1].replace(/\s/g, "");
  if (!/^\|?(-+:?:?\|)+-*\|?$/.test(sep)) return null;

  const split = (line: string): string[] =>
    line
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((c) => c.trim());

  const headers = split(tableLines[0]);
  const rows: string[][] = [];
  for (let i = 2; i < tableLines.length; i++) {
    rows.push(split(tableLines[i]));
  }
  return { headers, rows };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 32) || "col";
}

function truncateSheetName(name: string): string {
  // Excel sheet names are limited to 31 chars + can't contain []:*?/\
  return name.replace(/[[\]:*?/\\]/g, " ").slice(0, 31).trim() || "Section";
}

function uniqueSheetName(name: string, used: Set<string>): string {
  const base = truncateSheetName(name);
  if (!used.has(base)) return base;
  // Append _2, _3 until unique within Excel's 31-char ceiling.
  for (let i = 2; i < 100; i++) {
    const candidate = `${base.slice(0, 28)}_${i}`;
    if (!used.has(candidate)) return candidate;
  }
  return `Section_${used.size + 1}`;
}
