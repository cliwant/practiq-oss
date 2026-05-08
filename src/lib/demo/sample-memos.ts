/**
 * Sample scenario for the public /demo redline experience.
 *
 * One realistic boutique-CPA scenario — Acme Manufacturing Ltd. The
 * primary memo is a Q3 2026 close memo draft that contains 2-3
 * phrases the partner would normally re-word based on their prior
 * memo conventions for this client. The two prior memos (2025 Q3 and
 * 2026 Q1) establish those conventions: how depreciation is
 * presented, how expense categorization is described, and the voice
 * used for the management commentary.
 *
 * All content is fictional but realistically detailed. We keep the
 * scenario shipped as plain text + a `buildSampleDocx` function that
 * synthesizes a .docx Buffer at request time using the existing
 * `docx` library. This keeps the repo free of binary fixtures and
 * lets us tweak wording without re-zipping a Word file.
 */
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from "docx";

export interface SampleMemo {
  /** Display title for UI + Word doc title style */
  title: string;
  /** Plain client name */
  clientName: string;
  /** ISO date for the memo period */
  asOf: string;
  /** Section headings + paragraphs. Used to build runtime .docx */
  sections: Array<{ heading: string; paragraphs: string[] }>;
}

/**
 * Primary doc — the partner's draft for Q3 2026.
 *
 * The phrases the partner would normally edit based on prior memo
 * convention:
 *   1. "Inventory write-down" → prior memos use "lower of cost or
 *      net realizable value adjustment" (this firm's Acme convention).
 *   2. "MD&A — operating results were mixed this quarter" → priors
 *      strike a more confident, declarative tone for Acme's audit
 *      committee, e.g. "Operating performance reflected continued
 *      execution against the FY26 plan."
 *   3. "Depreciation expense was applied" → priors always say
 *      "Straight-line depreciation continued under existing useful
 *      life assumptions" for this client.
 */
export const SAMPLE_PRIMARY: SampleMemo = {
  title: "Q3 2026 Close Memo — DRAFT",
  clientName: "Acme Manufacturing Ltd.",
  asOf: "2026-09-30",
  sections: [
    {
      heading: "Engagement Summary",
      paragraphs: [
        "This memo summarizes the third-quarter close for Acme Manufacturing Ltd. for the period ending September 30, 2026. The close was performed under our standard procedures, and management has provided the trial balance, schedules, and supporting reconciliations.",
        "Acme operates two business lines: industrial fasteners (approximately 68% of revenue) and contract precision machining (approximately 32% of revenue). All figures presented are unaudited and prepared on the same basis as prior quarters.",
      ],
    },
    {
      heading: "Revenue and Margin",
      paragraphs: [
        "Revenue for Q3 2026 was $14.82M, up 4.1% over Q3 2025. Gross margin held at 31.2% versus 31.0% in the prior comparable quarter. Volume in the fasteners line was the primary driver; precision machining was roughly flat as a large automotive program neared completion.",
        "We did not identify any unusual revenue cut-off issues during the quarter. Two large precision-machining shipments dated September 28 and 29 were properly recognized in the period, with bills of lading on file.",
      ],
    },
    {
      heading: "Inventory",
      paragraphs: [
        "Inventory at quarter-end was $6.41M, down $0.18M from June 30. Management performed a partial cycle count covering approximately 41% of inventory value. We agreed the count to the perpetual records and noted no unreconciled differences greater than our materiality threshold.",
        "Management recorded an inventory write-down of $112,000 against slow-moving fastener SKUs that have not had a sales transaction in the last 18 months. We reviewed the supporting analysis and concur with the amount.",
      ],
    },
    {
      heading: "Property, Plant and Equipment",
      paragraphs: [
        "There were no significant additions or disposals during the quarter. Depreciation expense was applied for the period in the amount of $328,000, consistent with the FY26 budget.",
        "We re-performed the depreciation calculation on a sample of three asset classes representing 62% of net PP&E and noted no exceptions.",
      ],
    },
    {
      heading: "Management Discussion and Analysis (MD&A)",
      paragraphs: [
        "Operating results were mixed this quarter. While the fasteners business grew, the precision-machining business is approaching the end of a multi-year contract and management has not yet replaced the lost run-rate. Cash from operations was $1.92M for the quarter and $5.61M year-to-date.",
        "Management is in the late stages of negotiating two replacement programs in precision machining, which they expect to begin contributing in Q1 2027. We will continue to monitor.",
      ],
    },
    {
      heading: "Conclusions",
      paragraphs: [
        "Subject to the matters noted above, the Q3 2026 close is complete. There were no proposed adjusting journal entries above our quarterly materiality threshold.",
      ],
    },
  ],
};

export const SAMPLE_PRIOR_2025_Q3: SampleMemo = {
  title: "Q3 2025 Close Memo",
  clientName: "Acme Manufacturing Ltd.",
  asOf: "2025-09-30",
  sections: [
    {
      heading: "Engagement Summary",
      paragraphs: [
        "This memo summarizes the third-quarter close for Acme Manufacturing Ltd. for the period ending September 30, 2025.",
        "Acme operates two business lines: industrial fasteners and contract precision machining. All figures are unaudited and consistent with prior quarters.",
      ],
    },
    {
      heading: "Revenue and Margin",
      paragraphs: [
        "Revenue for Q3 2025 was $14.24M, up 3.6% over Q3 2024. Gross margin held at 31.0%, in line with the trailing twelve-month average.",
      ],
    },
    {
      heading: "Inventory",
      paragraphs: [
        "Inventory at quarter-end was $6.59M. Management recorded a lower of cost or net realizable value adjustment of $94,000 against slow-moving fastener SKUs. We reviewed the supporting analysis and concur with the amount.",
      ],
    },
    {
      heading: "Property, Plant and Equipment",
      paragraphs: [
        "There were no significant additions or disposals during the quarter. Straight-line depreciation continued under existing useful life assumptions, with quarterly expense of $314,000.",
      ],
    },
    {
      heading: "Management Discussion and Analysis (MD&A)",
      paragraphs: [
        "Operating performance reflected continued execution against the FY25 plan, with both business lines contributing growth on a year-over-year basis. Cash from operations was $1.84M for the quarter.",
        "Management remains focused on the renewal of the precision-machining program ladder beyond 2026.",
      ],
    },
    {
      heading: "Conclusions",
      paragraphs: [
        "Subject to the matters noted above, the Q3 2025 close is complete. No proposed adjusting journal entries above the quarterly materiality threshold.",
      ],
    },
  ],
};

export const SAMPLE_PRIOR_2026_Q1: SampleMemo = {
  title: "Q1 2026 Close Memo",
  clientName: "Acme Manufacturing Ltd.",
  asOf: "2026-03-31",
  sections: [
    {
      heading: "Engagement Summary",
      paragraphs: [
        "This memo summarizes the first-quarter close for Acme Manufacturing Ltd. for the period ending March 31, 2026.",
      ],
    },
    {
      heading: "Revenue and Margin",
      paragraphs: [
        "Revenue for Q1 2026 was $13.91M, up 2.9% over Q1 2025. Gross margin was 31.1%.",
      ],
    },
    {
      heading: "Inventory",
      paragraphs: [
        "Management recorded a lower of cost or net realizable value adjustment of $87,000 against aged fastener SKUs. We reviewed the supporting analysis and concur with the amount.",
      ],
    },
    {
      heading: "Property, Plant and Equipment",
      paragraphs: [
        "Straight-line depreciation continued under existing useful life assumptions. Quarterly expense was $321,000, consistent with the FY26 budget.",
      ],
    },
    {
      heading: "Management Discussion and Analysis (MD&A)",
      paragraphs: [
        "Operating performance reflected continued execution against the FY26 plan. Cash from operations was $1.78M for the quarter.",
      ],
    },
    {
      heading: "Conclusions",
      paragraphs: [
        "Subject to the matters noted above, the Q1 2026 close is complete.",
      ],
    },
  ],
};

/**
 * Build a .docx Buffer from a SampleMemo at request time. We keep
 * the conversion runtime so the repo doesn't carry binary fixtures
 * and the wording stays editable in source control.
 */
export async function buildSampleDocx(memo: SampleMemo): Promise<Buffer> {
  const children: Paragraph[] = [];

  // Header — client name
  children.push(
    new Paragraph({
      children: [new TextRun({ text: memo.clientName, bold: true })],
      alignment: AlignmentType.LEFT,
      spacing: { after: 80 },
    }),
  );

  // Title
  children.push(
    new Paragraph({
      text: memo.title,
      heading: HeadingLevel.TITLE,
      spacing: { after: 120 },
    }),
  );

  // As of
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: `As of ${memo.asOf}`, italics: true }),
      ],
      spacing: { after: 240 },
    }),
  );

  // Sections
  for (const section of memo.sections) {
    children.push(
      new Paragraph({
        text: section.heading,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      }),
    );
    for (const para of section.paragraphs) {
      // Each paragraph as a single run so the redline engine's
      // single-run constraint can match phrases inside it.
      children.push(
        new Paragraph({
          children: [new TextRun({ text: para })],
          spacing: { after: 120 },
        }),
      );
    }
  }

  const doc = new Document({
    creator: "Practiq Demo",
    title: memo.title,
    description: `Sample close memo for ${memo.clientName}`,
    sections: [{ children }],
  });

  return await Packer.toBuffer(doc);
}

/**
 * Plain-text rendition of a memo, used to build the LLM prompt for
 * the prior memos. Faster + cheaper than shipping the docx XML to
 * the model.
 */
export function memoToPlainText(memo: SampleMemo): string {
  const lines: string[] = [];
  lines.push(`# ${memo.title}`);
  lines.push(`Client: ${memo.clientName}`);
  lines.push(`As of: ${memo.asOf}`);
  lines.push("");
  for (const section of memo.sections) {
    lines.push(`## ${section.heading}`);
    for (const p of section.paragraphs) {
      lines.push(p);
      lines.push("");
    }
  }
  return lines.join("\n");
}

export const SAMPLE_PRIORS: SampleMemo[] = [SAMPLE_PRIOR_2025_Q3, SAMPLE_PRIOR_2026_Q1];

export const SAMPLE_DESCRIPTORS = {
  primary: {
    title: SAMPLE_PRIMARY.title,
    clientName: SAMPLE_PRIMARY.clientName,
    asOf: SAMPLE_PRIMARY.asOf,
    wordCount: estimateWordCount(SAMPLE_PRIMARY),
  },
  priors: SAMPLE_PRIORS.map((m) => ({
    title: m.title,
    clientName: m.clientName,
    asOf: m.asOf,
    wordCount: estimateWordCount(m),
  })),
};

function estimateWordCount(memo: SampleMemo): number {
  let n = 0;
  for (const s of memo.sections) {
    for (const p of s.paragraphs) {
      n += p.split(/\s+/).filter(Boolean).length;
    }
  }
  return n;
}
