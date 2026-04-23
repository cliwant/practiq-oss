/**
 * Lightweight .xlsx builder for financial-statement-style deliverables.
 *
 * Powered by exceljs (already in package.json). We accept a simple
 * XlsxSpec — sheets, each sheet a list of rows, with a few opinionated
 * formatting helpers (bold-header row, auto-width, number formatting).
 * Not a general-purpose Excel DSL — just enough to ship the artifact
 * shapes our agents produce.
 */
import ExcelJS from "exceljs";

export interface XlsxSheet {
  name: string;
  columns: Array<{
    header: string;
    key: string;
    width?: number;
    numFmt?: string; // e.g. "#,##0.00", "0.0%"
  }>;
  rows: Array<Record<string, string | number | null | undefined>>;
  /** Emphasized "totals" row that gets rendered bold and with a top border. */
  totals?: Record<string, string | number | null | undefined>;
}

export interface XlsxSpec {
  title?: string;
  sheets: XlsxSheet[];
  preparedFor?: string;
  preparedAt?: Date;
}

export async function buildXlsx(spec: XlsxSpec): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Practiq";
  if (spec.title) wb.title = spec.title;
  wb.created = spec.preparedAt ?? new Date();

  for (const sheetSpec of spec.sheets) {
    const ws = wb.addWorksheet(sheetSpec.name.slice(0, 31) || "Sheet1");
    ws.columns = sheetSpec.columns.map((c) => ({
      header: c.header,
      key: c.key,
      width: c.width ?? Math.max(12, c.header.length + 4),
      style: c.numFmt ? { numFmt: c.numFmt } : undefined,
    }));

    // Header row styling
    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFF4F4F5" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF18181B" },
    };
    headerRow.height = 22;

    for (const row of sheetSpec.rows) {
      ws.addRow(row);
    }

    if (sheetSpec.totals) {
      const totalsRow = ws.addRow(sheetSpec.totals);
      totalsRow.font = { bold: true };
      totalsRow.border = {
        top: { style: "thin", color: { argb: "FF52525B" } },
      };
    }
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf as ArrayBuffer);
}
