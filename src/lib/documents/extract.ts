/**
 * Document text extraction with page tagging.
 *
 * Tier-1 product thesis: boutique professional services docs are
 * typically <100 pages. Full-text-with-page-tags consistently outperforms
 * chunked vector RAG on accuracy at this size — the model reads the whole
 * thing or runs a precise find. No similarity-threshold guesswork.
 *
 * Each page is bracketed with `[Page N]` markers. PDF pages come straight
 * from pdfjs. DOCX has no concept of pages, so we approximate with
 * paragraph-based pagination (~60 paragraphs / page) — close enough for
 * citation purposes, and Word's native page count varies by reader anyway.
 */
import fs from "node:fs/promises";
import path from "node:path";

export interface ExtractedDoc {
  /** Full text with `[Page N]` markers separating pages. */
  text: string;
  /** Plain text per page, indexed by page number (1-based). */
  pages: string[];
  /** Source format we extracted from. */
  format: "pdf" | "docx" | "txt" | "unknown";
}

const DOCX_PARAGRAPHS_PER_PAGE = 60;

/**
 * Extract a document by reading from disk. Returns page-tagged full text
 * plus a per-page array. Caller is responsible for ownership checks
 * before passing the file path in.
 */
export async function extractDocument(
  absolutePath: string,
): Promise<ExtractedDoc> {
  const ext = path.extname(absolutePath).toLowerCase();
  const buffer = await fs.readFile(absolutePath);

  if (ext === ".pdf") {
    return extractPdf(buffer);
  }
  if (ext === ".docx") {
    return extractDocx(buffer);
  }
  if (ext === ".txt" || ext === ".md") {
    const text = buffer.toString("utf-8");
    return {
      text: `[Page 1]\n${text}`,
      pages: [text],
      format: "txt",
    };
  }
  // Unknown — fall back to UTF-8 best-effort.
  const text = buffer.toString("utf-8");
  return {
    text: `[Page 1]\n${text}`,
    pages: [text],
    format: "unknown",
  };
}

async function extractPdf(buffer: Buffer): Promise<ExtractedDoc> {
  // Use legacy build to dodge the Node ESM/worker dance — we're running
  // server-side and don't need the worker thread.
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    // Disable worker; we are in a single-threaded API route.
    useWorkerFetch: false,
    useSystemFonts: false,
  });
  const doc = await loadingTask.promise;
  const pages: string[] = [];
  const tagged: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: unknown) => {
        if (typeof item === "object" && item !== null && "str" in item) {
          return (item as { str: string }).str;
        }
        return "";
      })
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    pages.push(pageText);
    tagged.push(`[Page ${i}]\n${pageText}`);
  }
  return { text: tagged.join("\n\n"), pages, format: "pdf" };
}

async function extractDocx(buffer: Buffer): Promise<ExtractedDoc> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  // Mammoth returns the doc as a single string with double-newline
  // paragraph separators. Approximate page boundaries by paragraph count.
  const paragraphs = result.value.split(/\n{2,}/).filter((p) => p.trim());
  const pages: string[] = [];
  for (let i = 0; i < paragraphs.length; i += DOCX_PARAGRAPHS_PER_PAGE) {
    pages.push(paragraphs.slice(i, i + DOCX_PARAGRAPHS_PER_PAGE).join("\n\n"));
  }
  if (pages.length === 0) pages.push(result.value);
  const tagged = pages.map((p, i) => `[Page ${i + 1}]\n${p}`);
  return { text: tagged.join("\n\n"), pages, format: "docx" };
}

/**
 * Find passages matching a query inside a doc's pages, returning each hit
 * with surrounding context and the page it came from. Case-insensitive
 * substring match (boutique docs are small enough that fancy ranking
 * isn't worth the surface area).
 */
export interface FindHit {
  page: number;
  /** ~100 chars before the match. */
  before: string;
  match: string;
  /** ~100 chars after the match. */
  after: string;
  /** 0-based offset within the page where the match begins. */
  offset: number;
}

export function findInPages(
  pages: string[],
  query: string,
  maxResults: number,
  contextChars = 100,
): FindHit[] {
  const hits: FindHit[] = [];
  const needle = query.toLowerCase();
  for (let p = 0; p < pages.length; p++) {
    const haystack = pages[p];
    const lc = haystack.toLowerCase();
    let from = 0;
    while (hits.length < maxResults) {
      const idx = lc.indexOf(needle, from);
      if (idx < 0) break;
      const start = Math.max(0, idx - contextChars);
      const end = Math.min(haystack.length, idx + needle.length + contextChars);
      hits.push({
        page: p + 1,
        before: haystack.slice(start, idx),
        match: haystack.slice(idx, idx + needle.length),
        after: haystack.slice(idx + needle.length, end),
        offset: idx,
      });
      from = idx + needle.length;
    }
    if (hits.length >= maxResults) break;
  }
  return hits;
}
