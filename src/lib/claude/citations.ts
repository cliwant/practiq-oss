/**
 * Citation contract — streaming sentinel parser.
 *
 * Every grounded answer in the chat route obeys this protocol (enforced
 * via the system prompt):
 *
 *   1. Inline `[N]` superscript markers cite each factual claim.
 *   2. The response ends with a hidden block:
 *        <CITATIONS>[{"ref":1,"doc_id":"…","page":N,"quote":"…"}, …]</CITATIONS>
 *   3. Cross-page quotes use `[[PAGE_BREAK]]` inside the quote string.
 *   4. The visible portion of the response NEVER contains the
 *      <CITATIONS> sentinel.
 *
 * This module wraps the raw text stream and:
 *   - Buffers a small tail (`<CITATIONS>` is 11 chars).
 *   - Once the opening sentinel is detected, stops forwarding deltas to
 *     the UI and accumulates everything until `</CITATIONS>`.
 *   - At end-of-stream, attempts to JSON.parse the body and returns the
 *     parsed `Citation[]` alongside the visible text.
 *   - On parse failure the visible text falls back to whatever was
 *     forwarded; the raw payload + error reason are surfaced via
 *     `parseFailed`/`rawPayload` so the route can fire a
 *     `citation_parse_failed` analytics event without breaking the
 *     conversation.
 *
 * Edge cases handled:
 *   - Sentinel split across deltas (the buffer keeps the last 12 chars).
 *   - Unclosed sentinel (we treat the full tail as visible).
 *   - Sentinel that arrives in the same delta as some visible text
 *     (we forward the prefix, hold the tail).
 */

const OPEN_TAG = "<CITATIONS>";
const CLOSE_TAG = "</CITATIONS>";

export interface Citation {
  ref: number;
  doc_id: string;
  page: number;
  quote: string;
}

export interface CitationStreamState {
  /** True once we've seen `<CITATIONS>` in the stream. */
  inCitations: boolean;
  /** Accumulated visible text we've forwarded to the UI. */
  visible: string;
  /** Accumulated body between the open and close sentinels. */
  citationBody: string;
  /** Tail of the visible stream we haven't yet forwarded (may contain a partial sentinel). */
  tail: string;
}

export function createCitationStreamState(): CitationStreamState {
  return { inCitations: false, visible: "", citationBody: "", tail: "" };
}

export interface DeltaResult {
  /** Text the route should forward to the UI. May be empty. */
  forward: string;
}

/**
 * Feed a delta chunk into the parser. Returns the substring (possibly
 * empty) that the route should forward to the SSE stream. State is
 * mutated in-place — caller keeps the same object for the duration of
 * the turn.
 */
export function feedDelta(
  state: CitationStreamState,
  delta: string,
): DeltaResult {
  if (state.inCitations) {
    // Already buffering the JSON body. Don't forward anything else.
    state.citationBody += delta;
    const closeIdx = state.citationBody.indexOf(CLOSE_TAG);
    if (closeIdx >= 0) {
      // Trim the close tag and anything after it (defensive — model
      // shouldn't emit text after </CITATIONS> but be safe).
      state.citationBody = state.citationBody.slice(0, closeIdx);
    }
    return { forward: "" };
  }

  // Append to tail and look for the opening sentinel.
  state.tail += delta;
  const openIdx = state.tail.indexOf(OPEN_TAG);
  if (openIdx >= 0) {
    // Forward everything before the sentinel.
    const flushable = state.tail.slice(0, openIdx);
    state.visible += flushable;
    // Move whatever was after `<CITATIONS>` into the citation body.
    const after = state.tail.slice(openIdx + OPEN_TAG.length);
    state.tail = "";
    state.inCitations = true;
    // Recurse to handle the body (may already contain the close tag).
    const followup = feedDelta(state, after);
    return { forward: flushable + followup.forward };
  }

  // No sentinel in tail. Hold back the last (OPEN_TAG.length - 1) chars
  // in case the next delta completes the sentinel; forward the rest.
  const holdSize = OPEN_TAG.length - 1;
  if (state.tail.length <= holdSize) {
    return { forward: "" };
  }
  const flushable = state.tail.slice(0, state.tail.length - holdSize);
  state.tail = state.tail.slice(state.tail.length - holdSize);
  state.visible += flushable;
  return { forward: flushable };
}

export interface FinalizeResult {
  visible: string;
  citations: Citation[] | null;
  parseFailed: boolean;
  rawPayload: string | null;
  parseError: string | null;
}

/**
 * Drain any remaining tail and parse the citation JSON. Call once at
 * end-of-stream.
 */
export function finalize(state: CitationStreamState): FinalizeResult {
  // If we never entered the citation block, the tail is just unflushed
  // visible text — forward it.
  if (!state.inCitations) {
    state.visible += state.tail;
    state.tail = "";
    return {
      visible: state.visible,
      citations: null,
      parseFailed: false,
      rawPayload: null,
      parseError: null,
    };
  }

  // We did enter the citation block. Try to parse it.
  const raw = state.citationBody.trim();
  if (!raw) {
    return {
      visible: state.visible,
      citations: null,
      parseFailed: true,
      rawPayload: "",
      parseError: "empty <CITATIONS> body",
    };
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return {
        visible: state.visible,
        citations: null,
        parseFailed: true,
        rawPayload: raw,
        parseError: "citations payload is not an array",
      };
    }
    const cits: Citation[] = [];
    for (const c of parsed) {
      if (typeof c !== "object" || c === null) continue;
      const o = c as Record<string, unknown>;
      const ref = Number(o.ref);
      const doc_id = typeof o.doc_id === "string" ? o.doc_id : "";
      const page = Number(o.page);
      const quote = typeof o.quote === "string" ? o.quote : "";
      if (!Number.isFinite(ref) || !doc_id || !Number.isFinite(page)) continue;
      cits.push({ ref, doc_id, page, quote });
    }
    return {
      visible: state.visible,
      citations: cits,
      parseFailed: false,
      rawPayload: raw,
      parseError: null,
    };
  } catch (e) {
    return {
      visible: state.visible,
      citations: null,
      parseFailed: true,
      rawPayload: raw,
      parseError: e instanceof Error ? e.message : String(e),
    };
  }
}
