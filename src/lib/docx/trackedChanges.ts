/**
 * Apply Word tracked-changes (<w:ins>/<w:del>) to a .docx buffer.
 *
 * This is an INDEPENDENT REIMPLEMENTATION based on the public OOXML
 * tracked-changes spec (ECMA-376 §17.13.5). We do not derive this from
 * any AGPL'd or otherwise restrictively-licensed code.
 *
 * Algorithm overview:
 *   1. Unzip the .docx (it's a zip of XML parts).
 *   2. Parse word/document.xml as a string and locate runs (<w:r>) whose
 *      visible text matches an Edit's `find` string in the right context.
 *   3. Split the matching run into three segments (before / match /
 *      after). Wrap the match segment with a <w:del> using <w:delText>
 *      for the deleted text, and emit a sibling <w:ins> with the
 *      replacement <w:t>. Both wrappers carry the same author and
 *      timestamp so Word groups them together for accept/reject.
 *   4. Preserve the original run's <w:rPr> on every segment so font /
 *      size / bold survive the split.
 *   5. Repackage the zip and return the bytes.
 *
 * Limitations (intentional, MVP scope):
 *   - `find` must exist verbatim inside a single run. Multi-run matches
 *     (e.g. text broken by formatting changes) are skipped with a
 *     warning. In practice Word emits one run per format span, so this
 *     hits the common case.
 *   - We do not currently update the document's revision tracking
 *     header (<w:trackChanges/>). Word still renders the markup
 *     correctly because the ins/del elements are self-describing; the
 *     operator just won't see "Track Changes" toggled on.
 */
import PizZip from "pizzip";

export interface Edit {
  find: string;
  replace: string;
  context_before?: string;
  context_after?: string;
  reason: string;
  author?: string;
  timestamp?: string;
}

export interface ApplyResult {
  buffer: Buffer;
  applied: Edit[];
  skipped: { edit: Edit; reason: string }[];
  /** Monotonic revision id assigned to the first edit; subsequent edits use revisionStart+i. */
  revisionStart: number;
}

const DEFAULT_AUTHOR = "FractionalOS Agent";

/**
 * Apply tracked changes to a .docx buffer. Returns the rewritten zip
 * plus a manifest of which edits landed and which were skipped.
 */
export function applyTrackedChanges(
  buffer: Buffer,
  edits: Edit[],
  options: { author?: string; revisionStart?: number } = {},
): ApplyResult {
  const author = options.author ?? DEFAULT_AUTHOR;
  const revisionStart = options.revisionStart ?? 1;

  const zip = new PizZip(buffer);
  const docFile = zip.file("word/document.xml");
  if (!docFile) {
    throw new Error("Not a valid .docx — missing word/document.xml");
  }
  let xml = docFile.asText();

  const applied: Edit[] = [];
  const skipped: { edit: Edit; reason: string }[] = [];

  edits.forEach((edit, i) => {
    const revisionId = revisionStart + i;
    const timestamp = edit.timestamp ?? new Date().toISOString();
    const result = applyOneEdit(xml, edit, {
      author: edit.author ?? author,
      timestamp,
      revisionId,
    });
    if (result.ok) {
      xml = result.xml;
      applied.push(edit);
    } else {
      skipped.push({ edit, reason: result.reason });
    }
  });

  zip.file("word/document.xml", xml);
  const out = zip.generate({ type: "nodebuffer", compression: "DEFLATE" });
  return { buffer: out, applied, skipped, revisionStart };
}

function applyOneEdit(
  xml: string,
  edit: Edit,
  meta: { author: string; timestamp: string; revisionId: number },
): { ok: true; xml: string } | { ok: false; reason: string } {
  if (!edit.find) {
    return { ok: false, reason: "empty find string" };
  }

  // Find every <w:r>...</w:r> run in the document and inspect its visible
  // text. We don't use a streaming XML parser because tracked-changes
  // needs to splice the exact byte range back in, and string-level
  // splicing keeps that easy.
  const runRegex = /<w:r\b[^>]*>([\s\S]*?)<\/w:r>/g;
  type Candidate = { start: number; end: number; runText: string; runXml: string };
  const candidates: Candidate[] = [];
  let m: RegExpExecArray | null;
  while ((m = runRegex.exec(xml)) !== null) {
    const runXml = m[0];
    const runText = extractRunText(runXml);
    if (runText.includes(edit.find)) {
      candidates.push({
        start: m.index,
        end: m.index + runXml.length,
        runText,
        runXml,
      });
    }
  }

  if (candidates.length === 0) {
    return {
      ok: false,
      reason: `'find' not found inside any single run (may span runs or be absent)`,
    };
  }

  // Disambiguate using context_before / context_after when supplied.
  let chosen = candidates[0];
  if (candidates.length > 1 && (edit.context_before || edit.context_after)) {
    const scored = candidates
      .map((c) => {
        const before = xml.slice(Math.max(0, c.start - 200), c.start);
        const after = xml.slice(c.end, c.end + 200);
        let score = 0;
        if (edit.context_before && before.includes(edit.context_before)) {
          score += 1;
        }
        if (edit.context_after && after.includes(edit.context_after)) {
          score += 1;
        }
        return { c, score };
      })
      .sort((a, b) => b.score - a.score);
    chosen = scored[0].c;
  }

  // Inside the chosen run, split visible text around the match.
  const idx = chosen.runText.indexOf(edit.find);
  const before = chosen.runText.slice(0, idx);
  const after = chosen.runText.slice(idx + edit.find.length);

  // Pull the run properties so we preserve formatting on every segment.
  const rPrMatch = chosen.runXml.match(/<w:rPr\b[\s\S]*?<\/w:rPr>/);
  const rPr = rPrMatch ? rPrMatch[0] : "";

  const replacement = buildReplacementXml({
    rPr,
    before,
    matched: edit.find,
    replace: edit.replace,
    after,
    author: meta.author,
    timestamp: meta.timestamp,
    revisionId: meta.revisionId,
  });

  const newXml =
    xml.slice(0, chosen.start) + replacement + xml.slice(chosen.end);
  return { ok: true, xml: newXml };
}

/**
 * Extract the plain visible text of a run by concatenating its <w:t>
 * children. Preserves spaces from `xml:space="preserve"` runs.
 */
function extractRunText(runXml: string): string {
  const parts: string[] = [];
  const tRegex = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g;
  let m: RegExpExecArray | null;
  while ((m = tRegex.exec(runXml)) !== null) {
    parts.push(decodeXmlEntities(m[1]));
  }
  return parts.join("");
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function encodeXmlEntities(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildReplacementXml(args: {
  rPr: string;
  before: string;
  matched: string;
  replace: string;
  after: string;
  author: string;
  timestamp: string;
  revisionId: number;
}): string {
  const { rPr, before, matched, replace, after, author, timestamp, revisionId } =
    args;
  const authorAttr = encodeXmlEntities(author);
  const tsAttr = encodeXmlEntities(timestamp);

  const beforeRun = before
    ? `<w:r>${rPr}<w:t xml:space="preserve">${encodeXmlEntities(before)}</w:t></w:r>`
    : "";
  const afterRun = after
    ? `<w:r>${rPr}<w:t xml:space="preserve">${encodeXmlEntities(after)}</w:t></w:r>`
    : "";

  // <w:del> wraps a <w:r> that uses <w:delText> (not <w:t>) for the
  // removed text — this is what Word looks for to render the strikethrough.
  const delBlock = matched
    ? `<w:del w:id="${revisionId}" w:author="${authorAttr}" w:date="${tsAttr}"><w:r>${rPr}<w:delText xml:space="preserve">${encodeXmlEntities(matched)}</w:delText></w:r></w:del>`
    : "";

  // <w:ins> wraps a normal <w:r>/<w:t> with the inserted text.
  const insBlock = replace
    ? `<w:ins w:id="${revisionId + 100000}" w:author="${authorAttr}" w:date="${tsAttr}"><w:r>${rPr}<w:t xml:space="preserve">${encodeXmlEntities(replace)}</w:t></w:r></w:ins>`
    : "";

  return beforeRun + delBlock + insBlock + afterRun;
}
