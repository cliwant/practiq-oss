/**
 * Lightweight .docx builder for AI-prepared client deliverables.
 *
 * The shape the agents produce is a small Section[] tree — each section
 * is a heading plus one or more Block children (paragraphs, bullet
 * lists, key-value tables). We translate that into a real Word file
 * using `docx` which is already bundled (see package.json).
 *
 * We intentionally keep formatting sparse. Operators will re-open the
 * file in Word and tweak heading colors / logos at their own pace —
 * fighting Word's layout model from a headless process is a losing
 * game for anything beyond the minimum professional look.
 */
import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  TextRun,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
} from "docx";

export type Block =
  | { kind: "paragraph"; text: string }
  | { kind: "bullets"; items: string[] }
  | { kind: "kv"; rows: Array<{ label: string; value: string }> };

export interface Section {
  heading?: string;
  blocks: Block[];
}

export interface DocxSpec {
  title: string;
  subtitle?: string;
  sections: Section[];
  preparedFor?: string;
  preparedBy?: string;
  preparedAt?: Date;
}

export async function buildDocx(spec: DocxSpec): Promise<Buffer> {
  const children: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.LEFT,
      children: [new TextRun({ text: spec.title, bold: true })],
    }),
  ];

  if (spec.subtitle) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: spec.subtitle,
            color: "71717a",
            italics: true,
          }),
        ],
      }),
    );
  }

  const meta: string[] = [];
  if (spec.preparedFor) meta.push(`For: ${spec.preparedFor}`);
  if (spec.preparedBy) meta.push(`Prepared by: ${spec.preparedBy}`);
  if (spec.preparedAt)
    meta.push(
      `Date: ${spec.preparedAt.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })}`,
    );
  if (meta.length > 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: meta.join(" · "),
            size: 18, // 9pt
            color: "52525b",
          }),
        ],
        spacing: { after: 280 },
      }),
    );
  }

  const body: (Paragraph | Table)[] = [...children];

  for (const section of spec.sections) {
    if (section.heading) {
      body.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 280, after: 140 },
          children: [new TextRun({ text: section.heading, bold: true })],
        }),
      );
    }
    for (const block of section.blocks) {
      if (block.kind === "paragraph") {
        body.push(
          new Paragraph({
            children: [new TextRun({ text: block.text })],
            spacing: { after: 140 },
          }),
        );
      } else if (block.kind === "bullets") {
        for (const item of block.items) {
          body.push(
            new Paragraph({
              bullet: { level: 0 },
              children: [new TextRun({ text: item })],
              spacing: { after: 60 },
            }),
          );
        }
      } else if (block.kind === "kv") {
        body.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: block.rows.map(
              (r) =>
                new TableRow({
                  children: [
                    new TableCell({
                      width: { size: 35, type: WidthType.PERCENTAGE },
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({ text: r.label, bold: true }),
                          ],
                        }),
                      ],
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [new TextRun({ text: r.value })],
                        }),
                      ],
                    }),
                  ],
                }),
            ),
          }),
        );
        body.push(new Paragraph({ children: [], spacing: { after: 140 } }));
      }
    }
  }

  const doc = new Document({
    creator: "Practiq",
    title: spec.title,
    sections: [{ properties: {}, children: body }],
  });

  return Packer.toBuffer(doc);
}
