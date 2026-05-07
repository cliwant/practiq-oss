/**
 * Tests for the streaming citation sentinel parser.
 *
 * The parser must:
 *  - Pass through plain text when there is no <CITATIONS> block.
 *  - Detect the sentinel even when split arbitrarily across deltas.
 *  - Surface malformed JSON as a parseFailed result without losing the
 *    visible text the user already saw.
 *  - Gracefully degrade if the sentinel never closes.
 */
import { describe, it, expect } from "vitest";
import {
  createCitationStreamState,
  feedDelta,
  finalize,
  type Citation,
} from "../citations";

function feedAll(chunks: string[]) {
  const state = createCitationStreamState();
  let forwarded = "";
  for (const c of chunks) {
    forwarded += feedDelta(state, c).forward;
  }
  const final = finalize(state);
  return { forwarded, ...final };
}

describe("citations streaming parser", () => {
  it("passes plain text through unchanged when no citations block is present", () => {
    const { visible, citations, parseFailed } = feedAll(["Hello world."]);
    // The parser holds back the trailing OPEN_TAG.length-1 chars as a
    // partial-sentinel buffer; finalize() flushes them into `visible`.
    expect(visible).toBe("Hello world.");
    expect(citations).toBeNull();
    expect(parseFailed).toBe(false);
  });

  it("parses standard citations block at end of stream", () => {
    const stream =
      'Text [1] more [2].\n<CITATIONS>[{"ref":1,"doc_id":"a","page":1,"quote":"q1"},{"ref":2,"doc_id":"b","page":3,"quote":"q2"}]</CITATIONS>';
    const { visible, citations, parseFailed } = feedAll([stream]);
    expect(visible).toBe("Text [1] more [2].\n");
    expect(parseFailed).toBe(false);
    expect(citations).toHaveLength(2);
    expect(citations?.[0]).toMatchObject({
      ref: 1,
      doc_id: "a",
      page: 1,
      quote: "q1",
    });
    expect(citations?.[1].ref).toBe(2);
  });

  it("handles a sentinel split byte-by-byte across deltas", () => {
    const stream =
      'Hello [1].\n<CITATIONS>[{"ref":1,"doc_id":"d","page":2,"quote":"x"}]</CITATIONS>';
    const chunks = stream.split("");
    const { visible, citations, parseFailed } = feedAll(chunks);
    expect(visible).toBe("Hello [1].\n");
    expect(parseFailed).toBe(false);
    expect(citations).toHaveLength(1);
  });

  it("flags malformed JSON in the citations block but preserves visible text", () => {
    const { visible, citations, parseFailed, parseError } = feedAll([
      "text\n",
      "<CITATIONS>not json</CITATIONS>",
    ]);
    expect(visible).toBe("text\n");
    expect(citations).toBeNull();
    expect(parseFailed).toBe(true);
    expect(parseError).toBeTruthy();
  });

  it("degrades gracefully when the sentinel never closes", () => {
    const { visible, citations, parseFailed } = feedAll([
      "text\n",
      '<CITATIONS>[{"ref":1',
    ]);
    // Visible portion should be preserved.
    expect(visible).toBe("text\n");
    // No usable citations; parse failure is the expected signal.
    expect(citations).toBeNull();
    expect(parseFailed).toBe(true);
  });

  it("preserves PAGE_BREAK token inside quote strings", () => {
    const stream =
      'See [1].\n<CITATIONS>[{"ref":1,"doc_id":"d","page":7,"quote":"first half[[PAGE_BREAK]]second half"}]</CITATIONS>';
    const { citations, parseFailed } = feedAll([stream]);
    expect(parseFailed).toBe(false);
    expect(citations).toHaveLength(1);
    expect(citations![0].quote).toBe("first half[[PAGE_BREAK]]second half");
  });

  it("parses multiple citations preserving ref numbers", () => {
    const refs = [1, 2, 3, 4, 5];
    const arr = refs.map((r) => ({
      ref: r,
      doc_id: `d${r}`,
      page: r,
      quote: `q${r}`,
    }));
    const stream = `body\n<CITATIONS>${JSON.stringify(arr)}</CITATIONS>`;
    const { citations, parseFailed } = feedAll([stream]);
    expect(parseFailed).toBe(false);
    expect(citations).toHaveLength(5);
    expect((citations as Citation[]).map((c) => c.ref)).toEqual(refs);
  });
});
