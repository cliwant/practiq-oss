/**
 * Heuristic binary-file detector. Given a text-decoded file body,
 * returns true when the content is > 5% control characters / null
 * bytes in the first ~2000 chars. Used by the new-client uploader
 * to reject PDF/DOCX bytes (which we can't parse yet) before we
 * send them through Claude.
 *
 * Keeps markdown + CSV + plain .txt safe. PDFs hit 40–60% bad bytes
 * even in the first kB so the 5% threshold is generous.
 */
export function isMostlyBinary(text: string, sampleSize = 2000): boolean {
  const sample = text.slice(0, sampleSize);
  if (sample.length === 0) return false;
  let bad = 0;
  for (let i = 0; i < sample.length; i++) {
    const c = sample.charCodeAt(i);
    // Null byte or ASCII control char (except tab, LF, CR).
    if (c === 0 || (c < 32 && c !== 9 && c !== 10 && c !== 13)) bad++;
  }
  return bad / sample.length > 0.05;
}
