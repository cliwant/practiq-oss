/**
 * Render a tracked-changes .docx as HTML preview for the browser.
 *
 * Why not just use `mammoth` directly? Mammoth's default options
 * strip <w:ins> and <w:del> markup. We use a transform that maps
 * those wrapper elements onto styled <span> tags so insertions
 * render green and deletions render with red strikethrough — the
 * exact visual the partner gets when they open the docx in Word.
 *
 * This runs on the server (`mammoth` is Node-only). We return the
 * HTML string + an "outline" with edit summary so the front-end can
 * render a side-by-side preview without re-parsing.
 */
import mammoth from "mammoth";

export interface RenderPreviewInput {
  docxBuffer: Buffer;
}

export interface RenderPreviewResult {
  /** Sanitized HTML with ins/del styled inline. */
  html: string;
  /** Mammoth warnings (mostly missing-style notes). Surface for QA. */
  warnings: string[];
}

const STYLE_MAP = [
  "p[style-name='Title'] => h1.preview-title:fresh",
  "p[style-name='Heading 1'] => h2:fresh",
  "p[style-name='Heading 2'] => h3:fresh",
  "p[style-name='Heading 3'] => h4:fresh",
];

/**
 * Convert a docx buffer to preview HTML. Insertions and deletions
 * are wrapped in span.redline-ins / span.redline-del which the
 * page-side stylesheet colors. Mammoth itself doesn't expose a
 * straightforward way to map <w:ins>/<w:del>, so we do a post-pass
 * on the raw document.xml: extract ins/del run content, mark it
 * with sentinel tokens, then run mammoth, then replace the
 * sentinels with span tags. Pragmatic — gets us a faithful preview
 * without forking mammoth.
 */
export async function renderTrackedChangesHtml(
  input: RenderPreviewInput,
): Promise<RenderPreviewResult> {
  // Mammoth strips <w:ins>/<w:del> by default. We pre-process the
  // docx bytes in memory: rewrite the document.xml so insertion
  // text is wrapped with sentinel `⟦INS⟧…⟧/INS⟧` markers and
  // deletion text with `⟦DEL⟧…⟧/DEL⟧`. After mammoth converts the
  // body to HTML, we string-replace the sentinels with styled
  // spans. Sentinel chars chosen to be unlikely in legitimate memo
  // prose.
  const PizZip = (await import("pizzip")).default;
  const zip = new PizZip(input.docxBuffer);
  const docFile = zip.file("word/document.xml");
  if (!docFile) {
    throw new Error("Invalid .docx — missing word/document.xml");
  }

  const original = docFile.asText();
  const annotated = annotateInsDel(original);
  zip.file("word/document.xml", annotated);
  const annotatedBuffer = zip.generate({
    type: "nodebuffer",
    compression: "DEFLATE",
  }) as Buffer;

  const mammothResult = await mammoth.convertToHtml(
    { buffer: annotatedBuffer },
    {
      styleMap: STYLE_MAP,
      includeDefaultStyleMap: true,
    },
  );

  const replaced = mammothResult.value
    .replace(
      /⟦INS⟧/g,
      '<span class="redline-ins">',
    )
    .replace(/⟦\/INS⟧/g, "</span>")
    .replace(/⟦DEL⟧/g, '<span class="redline-del">')
    .replace(/⟦\/DEL⟧/g, "</span>");

  return {
    html: replaced,
    warnings: mammothResult.messages.map((m) => m.message),
  };
}

/**
 * Walk the document XML and inject sentinel tokens around insertion
 * and deletion text. Insertion text lives in <w:ins>...<w:t>...</w:t></w:ins>;
 * deletion text lives in <w:del>...<w:delText>...</w:delText></w:del>.
 * Mammoth will convert the wrapped text as if it were normal,
 * giving us a single HTML stream we can string-replace.
 */
function annotateInsDel(xml: string): string {
  // Wrap text inside <w:ins> blocks. Using a sentinel-substitution
  // approach so we don't break the OOXML structure.
  const insRegex = /<w:ins\b[^>]*>([\s\S]*?)<\/w:ins>/g;
  const delRegex = /<w:del\b[^>]*>([\s\S]*?)<\/w:del>/g;

  let out = xml.replace(insRegex, (_full, inner: string) => {
    // Wrap each <w:t>…</w:t> body with sentinels.
    const wrapped = inner.replace(
      /(<w:t\b[^>]*>)([\s\S]*?)(<\/w:t>)/g,
      (_m, open: string, text: string, close: string) =>
        `${open}⟦INS⟧${text}⟦/INS⟧${close}`,
    );
    // Re-emit as <w:ins>… so mammoth still recognizes the structure.
    return `<w:ins w:id="0" w:author="ignored" w:date="2026-01-01T00:00:00Z">${wrapped}</w:ins>`;
  });

  out = out.replace(delRegex, (_full, inner: string) => {
    // Mammoth ignores <w:delText> by default. Convert it to <w:t>
    // first so the body comes through, then wrap in DEL sentinels.
    const promoted = inner.replace(/<w:delText\b/g, "<w:t").replace(
      /<\/w:delText>/g,
      "</w:t>",
    );
    const wrapped = promoted.replace(
      /(<w:t\b[^>]*>)([\s\S]*?)(<\/w:t>)/g,
      (_m, open: string, text: string, close: string) =>
        `${open}⟦DEL⟧${text}⟦/DEL⟧${close}`,
    );
    // Strip the surrounding <w:del> wrapper — mammoth would skip it
    // otherwise. Inserting the wrapped content directly preserves the
    // sentinel-tokenized text in the output stream.
    return wrapped;
  });

  return out;
}
