/**
 * Synthetic fixtures for the wedge eval suites.
 *
 * Rather than ship binary contract / trial-balance assets in the repo, we
 * generate them at test time. This keeps the suite hermetic and avoids
 * accidentally committing real client data.
 *
 * Each fixture has:
 *   - `doc_id` — stable identifier the model is told to cite
 *   - `pages` — an array of strings, one per page; index 0 = page 1
 *   - `text` — the concatenated prose with [[PAGE_BREAK]] sentinels (the
 *     same convention the live citation contract uses)
 *
 * For the redline suite we generate a real .docx Buffer via the `docx`
 * npm package (already a runtime dep) so applyTrackedChanges has a
 * legitimate OOXML zip to splice into.
 */
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from "docx";

export interface DocFixture {
  doc_id: string;
  title: string;
  pages: string[];
}

export const ENGAGEMENT_LETTER: DocFixture = {
  doc_id: "engagement_acme_2026",
  title: "Engagement Letter — Acme Manufacturing Inc.",
  pages: [
    `ENGAGEMENT LETTER

This Engagement Letter ("Agreement") is entered into on January 15, 2026 between Park Accounting Group LLC ("Firm") and Acme Manufacturing Inc. ("Client").

1. PARTIES
The parties to this Agreement are Park Accounting Group LLC, a Delaware limited liability company, and Acme Manufacturing Inc., a Texas corporation.

2. SCOPE OF SERVICES
The Firm agrees to provide monthly bookkeeping, quarterly financial review, and annual tax preparation services as described in Schedule A.`,
    `3. ENGAGEMENT FEE
The engagement fee for the services described herein shall be twelve thousand dollars ($12,000) per annum, billed in equal monthly installments of one thousand dollars ($1,000) on the first business day of each month.

Late payments shall accrue interest at one and one-half percent (1.5%) per month.

4. TERM
The initial term of this engagement shall be one (1) year, commencing February 1, 2026, and shall automatically renew for successive one-year terms unless either party provides written notice of non-renewal at least sixty (60) days prior to the renewal date.`,
    `5. INDEMNIFICATION
The Client agrees to indemnify and hold harmless the Firm, its partners, employees, and agents from and against any and all claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys' fees) arising out of or related to the Client's breach of this Agreement, the Client's negligent or willful acts, or any third-party claim arising from work product the Client modifies after delivery.

This indemnification shall survive the termination of this Agreement.

6. TERMINATION
Either party may terminate this Agreement upon thirty (30) days' written notice.`,
  ],
};

export const ENGAGEMENT_LETTER_SECONDARY: DocFixture = {
  doc_id: "engagement_globex_2026",
  title: "Engagement Letter — Globex Holdings",
  pages: [
    `ENGAGEMENT LETTER

This Engagement Letter is entered into on March 1, 2026 between Park Accounting Group LLC ("Firm") and Globex Holdings ("Client").

1. PARTIES
Park Accounting Group LLC and Globex Holdings, a California limited partnership.

2. SCOPE OF SERVICES
Quarterly bookkeeping and annual tax preparation.`,
    `3. ENGAGEMENT FEE
The fee for services shall be eighteen thousand dollars ($18,000) per annum, billed quarterly at four thousand five hundred dollars ($4,500) per quarter.

4. TERM
One year commencing April 1, 2026.`,
  ],
};

export const SCHEDULE_A: DocFixture = {
  doc_id: "schedule_a_acme_2026",
  title: "Schedule A — Acme Engagement Detail",
  pages: [
    `SCHEDULE A — DETAIL OF SERVICES

Monthly bookkeeping        $   500.00
Quarterly review           $   200.00
Annual tax return          $   300.00
                           __________
Total monthly retainer     $ 1,000.00
Total annual               $12,000.00`,
  ],
};

/**
 * Render a fixture to the [[PAGE_BREAK]] flat-string convention the model
 * sees in the system prompt.
 */
export function flattenFixture(fix: DocFixture): string {
  return `[doc_id: ${fix.doc_id}]\n[title: ${fix.title}]\n\n${fix.pages
    .map((p, i) => `[PAGE ${i + 1}]\n${p}`)
    .join("\n[[PAGE_BREAK]]\n")}`;
}

/**
 * Build a real .docx Buffer for redline tests. The `docx` package emits
 * runs in a way that places `<w:rPr>` properties before each text run so
 * formatting-preservation tests have something to assert against.
 */
export async function buildRedlineFixture(args: {
  paragraphs: { text: string; bold?: boolean; italic?: boolean }[];
}): Promise<Buffer> {
  const children = args.paragraphs.map(
    (p) =>
      new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [
          new TextRun({ text: p.text, bold: p.bold, italics: p.italic }),
        ],
      }),
  );

  const doc = new Document({
    sections: [{ children }],
  });
  return Packer.toBuffer(doc);
}
