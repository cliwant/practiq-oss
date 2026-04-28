/**
 * .docx generator (RUN 9 — P2-06).
 *
 * Pure-TS via the `docx` npm package. Produces a Buffer the caller
 * streams directly to the operator's browser via the
 * /api/outputs/[id]/download endpoint. No filesystem write, no
 * Python FastAPI hop, no /tmp dependency.
 *
 * **Layout**: matches the existing ApprovalItem.content shape used by
 * the generate_document tool — `format` + `title` + `sections[]`,
 * each section `{ heading, content }`. Maps cleanly to docx's
 * Document → Paragraph hierarchy.
 *
 * **Branding**: the body is intentionally minimal. The model
 * generates the prose; the generator stays out of styling decisions
 * so we don't drift from what was approved in the ApprovalItem
 * preview. Operator preferences (logo, brand color, font) attach in
 * Phase 2 once we have those persisted on the Client row.
 */
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  PageBreak,
  AlignmentType,
} from "docx";
import type { DocumentSection, GeneratorClientMeta } from "./types";

export interface DocxBuildInput {
  title: string;
  sections: DocumentSection[];
  client: GeneratorClientMeta;
  /** ISO date stamp shown in the footer. */
  generatedAt: Date;
}

export async function buildDocxBuffer(input: DocxBuildInput): Promise<Buffer> {
  const children: Paragraph[] = [];

  // Header — client name + report title.
  children.push(
    new Paragraph({
      text: input.client.name,
      alignment: AlignmentType.LEFT,
      spacing: { after: 80 },
      style: "Strong",
    }),
  );
  children.push(
    new Paragraph({
      text: input.title,
      heading: HeadingLevel.TITLE,
      spacing: { after: 240 },
    }),
  );

  // Subtitle row — industry + relationship + date.
  const subtitle: string[] = [];
  if (input.client.industry) subtitle.push(input.client.industry);
  if (input.client.relationshipMonths) {
    subtitle.push(`Relationship ${input.client.relationshipMonths}mo`);
  }
  subtitle.push(input.generatedAt.toISOString().slice(0, 10));
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: subtitle.join(" · "),
          italics: true,
          color: "595959",
        }),
      ],
      spacing: { after: 480 },
    }),
  );

  // Body — section heading + paragraphs split on blank lines so the
  // model can use \n\n as paragraph breaks. We don't try to parse
  // markdown bold/italic in this version; the model usually emits
  // plain prose for these deliverables.
  for (let si = 0; si < input.sections.length; si++) {
    const s = input.sections[si];
    children.push(
      new Paragraph({
        text: s.heading,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 320, after: 120 },
      }),
    );
    for (const para of s.content.split(/\n\s*\n/)) {
      const trimmed = para.trim();
      if (!trimmed) continue;
      children.push(
        new Paragraph({
          children: [new TextRun({ text: trimmed })],
          spacing: { after: 120 },
        }),
      );
    }
    // Page break between sections that are clearly long (> 1500 chars).
    // Avoids a single slim section pushing onto an empty page.
    if (s.content.length > 1500 && si < input.sections.length - 1) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }
  }

  // Footer attribution.
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text:
            "Drafted by Practiq — review with your client before forwarding.",
          italics: true,
          color: "8C8C8C",
          size: 18,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 800 },
    }),
  );

  const doc = new Document({
    creator: "Practiq",
    title: input.title,
    description: `Practiq-generated ${input.title} for ${input.client.name}`,
    styles: {
      paragraphStyles: [
        {
          id: "Strong",
          name: "Strong",
          basedOn: "Normal",
          next: "Normal",
          run: { bold: true, size: 22 },
        },
      ],
    },
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  // `Packer.toBuffer` returns a Node Buffer the caller streams.
  return await Packer.toBuffer(doc);
}
