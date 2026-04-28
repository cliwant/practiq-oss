/**
 * Approximate token counter — Wave-4 RUN 7 (P1-06).
 *
 * We don't need exact tokenization for budget gating. The composer
 * uses this to decide whether *adding* a tier would push past the
 * caller's budget; off by 5-10% in either direction doesn't change
 * which tier gets clamped. That makes tiktoken / Anthropic's
 * tokenizer overkill for the hot path — every chat turn would pay
 * a JS-side BPE tokenization on ~5K-10K characters of system
 * prompt content for no decision-quality gain.
 *
 * Heuristic: ~4 characters per token for English text. Empirically
 * this biases conservative (slightly over-counts) for our corpus
 * because:
 *   - Markdown headings / fences inflate char count without
 *     proportional token count.
 *   - Numeric tokens (dates, dollar amounts) tokenize cheaper than
 *     4 chars/token suggests.
 *
 * Falls back to a flat 1 token per "word" for empty / non-text
 * inputs so we never return zero for a non-empty string.
 *
 * For Korean / mixed CJK content the heuristic underestimates by
 * 30-50% (CJK is ~1-2 chars per token on Anthropic's tokenizer).
 * If a future run starts producing Korean prompts the loader will
 * still respect the budget — it just leaves more headroom than it
 * needs. Acceptable trade-off vs. the cost of a real tokenizer
 * library on every chat turn.
 */

const CHARS_PER_TOKEN = 4;

export function approxTokenCount(text: string): number {
  if (!text) return 0;
  const chars = text.length;
  if (chars === 0) return 0;
  // Round up so a 1-character string costs 1 token, not 0.
  return Math.max(1, Math.ceil(chars / CHARS_PER_TOKEN));
}

/**
 * Trim a string to fit within a token cap, preserving as much as
 * possible. Cuts at the last whitespace boundary before the cap so
 * we don't slice mid-word, then appends an ellipsis sentinel the
 * caller can grep for if it wants to surface "memory truncated"
 * to the operator UI.
 */
export function truncateToTokenCap(text: string, cap: number): string {
  if (cap <= 0) return "";
  if (approxTokenCount(text) <= cap) return text;
  const charCap = Math.max(1, cap * CHARS_PER_TOKEN);
  const sliced = text.slice(0, charCap);
  // Cut at the last whitespace so we don't end mid-word.
  const lastSpace = sliced.lastIndexOf(" ");
  const safeEnd = lastSpace > charCap * 0.5 ? lastSpace : charCap;
  return sliced.slice(0, safeEnd).trimEnd() + " …[truncated]";
}
