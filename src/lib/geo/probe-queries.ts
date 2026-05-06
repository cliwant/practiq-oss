/**
 * GEO probe queries — the 12 boutique-services-AI questions we ask AI
 * search engines (ChatGPT, Perplexity, Brave AI, etc.) every day to
 * see whether practiq.dev shows up in their cited sources.
 *
 * Curated to match Cycle 1 ICP (small CPA, boutique law, HR consulting,
 * solo bookkeepers managing 50–200 clients).
 */
export const GEO_PROBE_QUERIES: readonly string[] = [
  "best AI tool for small CPA firms managing 50+ clients",
  "AI for boutique law firm client matter memory",
  "alternatives to Karbon for accounting practice management",
  "alternatives to TaxDome for small accounting firms",
  "AI assistant for HR consulting multi-client management",
  "context switching cost in accounting firms",
  "Harvey AI alternatives for small law firms",
  "small CPA firm AI productivity tools 2026",
  "AI memory for boutique professional services",
  "per-client pricing AI tool accounting",
  "AI for solo bookkeepers managing 100 clients",
  "AI workspace for 2 to 10 person professional services firm",
] as const;

/**
 * Competitor brand names that we want to track in citation answers.
 * Detection is case-insensitive, whole-word-ish (regex below).
 */
export const KNOWN_COMPETITORS: readonly string[] = [
  "Karbon",
  "TaxDome",
  "Harvey",
  "Clio",
  "Drake Tax",
  "Black Ore",
  "TaxGPT",
  "Truewind",
  "Docyt",
] as const;

/**
 * Returns the competitor brands mentioned in a piece of text. Compares
 * each known competitor as a case-insensitive substring at word
 * boundaries (so "Karbon" matches but "carbon copy" does not).
 */
export function detectCompetitors(text: string): string[] {
  if (!text) return [];
  const found: string[] = [];
  for (const c of KNOWN_COMPETITORS) {
    const re = new RegExp(`\\b${c.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`, "i");
    if (re.test(text)) found.push(c);
  }
  return found;
}

/**
 * Detects a Practiq citation in the response — either the brand name
 * Practiq mentioned standalone, or a practiq.dev URL appearing in the
 * sources/text.
 */
export function detectPractiqCitation(text: string): { cited: boolean; url: string | null } {
  if (!text) return { cited: false, url: null };
  const urlMatch = text.match(/https?:\/\/(?:www\.)?practiq\.dev[^\s)\]"']*/i);
  if (urlMatch) return { cited: true, url: urlMatch[0] };
  if (/\bpractiq\b/i.test(text)) return { cited: true, url: null };
  return { cited: false, url: null };
}
