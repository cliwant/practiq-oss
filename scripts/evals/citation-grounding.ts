/**
 * Citation grounding eval suite (8 cases).
 *
 * Sends prompts with synthetic document context, parses the model's
 * `<CITATIONS>` block via the same streaming parser the chat route uses
 * (src/lib/claude/citations.ts), and scores three axes per case:
 *
 *   - **Compliance**: did the answer include `[N]` markers AND a parseable
 *     <CITATIONS> JSON block?
 *   - **Accuracy**: every `[N]` reference must map to a citation entry,
 *     and the cited `quote` must actually appear at the cited `page` of
 *     the cited `doc_id`.
 *   - **No-hallucination**: zero cites pointing at a non-existent page or
 *     non-existent doc_id; for "info absent" cases, the model must say so
 *     and emit zero citations.
 *
 * Pass criteria: a case passes iff all three axes hold.
 *
 * The model is given the same system-prompt protocol the production chat
 * route uses (inline `[N]` + trailing `<CITATIONS>` JSON, with
 * `[[PAGE_BREAK]]` for cross-page quotes).
 */
import Anthropic from "@anthropic-ai/sdk";
import {
  createCitationStreamState,
  feedDelta,
  finalize,
  type Citation,
} from "../../src/lib/claude/citations";
import {
  ENGAGEMENT_LETTER,
  ENGAGEMENT_LETTER_SECONDARY,
  SCHEDULE_A,
  flattenFixture,
  type DocFixture,
} from "./fixtures";
import type { EvalCaseResult } from "./types";

const SYSTEM_PROMPT = `You are an evidence-grounded assistant. Every factual claim MUST cite the source document via inline [N] markers, followed by a hidden citation block at the very end of your response in this exact format:

<CITATIONS>[{"ref":1,"doc_id":"...","page":N,"quote":"..."}, ...]</CITATIONS>

Rules:
- The visible answer NEVER mentions the <CITATIONS> sentinel.
- Each [N] in prose must have a matching {"ref":N, ...} entry.
- The "quote" field must be a verbatim substring (or a "[[PAGE_BREAK]]"-joined cross-page quote) from the cited doc_id at the cited page.
- If the answer requires text from a page not present in the source documents, OR if the requested information is absent, do NOT fabricate citations — say "I do not have that in the source documents." and emit <CITATIONS>[]</CITATIONS>.
- Do not cite pages or doc_ids that were not provided to you.`;

interface CitationCase {
  id: string;
  question: string;
  docs: DocFixture[];
  /** Optional substrings that must appear in the visible answer. */
  expectVisible?: string[];
  /** If true, the correct behavior is to emit zero citations. */
  expectAbsent?: boolean;
  /** Optional additional doc_ids the model must cite (subset). */
  expectDocIds?: string[];
}

const CASES: CitationCase[] = [
  {
    id: "1_engagement_fee",
    question: "What is the engagement fee in the contract?",
    docs: [ENGAGEMENT_LETTER],
    expectVisible: ["12,000", "1,000"],
    expectDocIds: [ENGAGEMENT_LETTER.doc_id],
  },
  {
    id: "2_parties_multi_cite",
    question: "List all parties to the agreement.",
    docs: [ENGAGEMENT_LETTER],
    expectVisible: ["Park Accounting Group", "Acme Manufacturing"],
    expectDocIds: [ENGAGEMENT_LETTER.doc_id],
  },
  {
    id: "3_term_single",
    question: "What is the term of this engagement?",
    docs: [ENGAGEMENT_LETTER],
    expectVisible: ["one", "year"],
    expectDocIds: [ENGAGEMENT_LETTER.doc_id],
  },
  {
    id: "4_trick_absent",
    question: "What discount rate did Mr. Smith negotiate in this contract?",
    docs: [ENGAGEMENT_LETTER],
    expectAbsent: true,
  },
  {
    id: "5_cross_page_indemnification",
    question: "Summarize the indemnification clause in this contract.",
    docs: [ENGAGEMENT_LETTER],
    expectVisible: ["indemnif"],
    expectDocIds: [ENGAGEMENT_LETTER.doc_id],
  },
  {
    id: "6_numeric_schedule_a",
    question: "What is the total annual amount in Schedule A?",
    docs: [ENGAGEMENT_LETTER, SCHEDULE_A],
    expectVisible: ["12,000"],
    expectDocIds: [SCHEDULE_A.doc_id],
  },
  {
    id: "7_negation_no_noncompete",
    question: "Is there a non-compete clause in this engagement letter?",
    docs: [ENGAGEMENT_LETTER],
    expectAbsent: true,
  },
  {
    id: "8_ambiguous_two_contracts",
    question: "What are the engagement fees? Cover every contract provided.",
    docs: [ENGAGEMENT_LETTER, ENGAGEMENT_LETTER_SECONDARY],
    expectVisible: ["12,000", "18,000"],
    expectDocIds: [
      ENGAGEMENT_LETTER.doc_id,
      ENGAGEMENT_LETTER_SECONDARY.doc_id,
    ],
  },
];

interface RunOpts {
  client: Anthropic;
  model: string;
  pricingInputPerM: number;
  pricingOutputPerM: number;
}

export async function runCitationGroundingSuite(
  opts: RunOpts,
): Promise<EvalCaseResult[]> {
  const out: EvalCaseResult[] = [];
  for (const c of CASES) {
    const startedAt = Date.now();
    const docsBlob = c.docs.map(flattenFixture).join("\n\n---\n\n");
    const userPrompt = `${docsBlob}\n\nQUESTION: ${c.question}`;

    const stream = await opts.client.messages.stream({
      model: opts.model,
      max_tokens: 1200,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const state = createCitationStreamState();
    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        feedDelta(state, event.delta.text);
      }
    }
    const final = finalize(state);
    const finalMessage = await stream.finalMessage();
    const inputTokens = finalMessage.usage?.input_tokens ?? 0;
    const outputTokens = finalMessage.usage?.output_tokens ?? 0;
    const costUsd =
      (inputTokens * opts.pricingInputPerM) / 1_000_000 +
      (outputTokens * opts.pricingOutputPerM) / 1_000_000;

    const visible = final.visible;
    const cits = final.citations ?? [];
    const compliance = scoreCompliance(visible, final, c);
    const accuracy = scoreAccuracy(visible, cits, c);
    const noHallucination = scoreNoHallucination(cits, c);

    const passed = compliance && accuracy && noHallucination;
    out.push({
      suite: "citation_grounding",
      caseId: c.id,
      passed,
      axes: {
        compliance,
        accuracy,
        no_hallucination: noHallucination,
        citation_count: cits.length,
        parse_failed: final.parseFailed,
      },
      notes: `${c.question.slice(0, 60)} → ${cits.length} cites${final.parseFailed ? ` [parse-fail: ${final.parseError}]` : ""}`,
      costUsd,
      durationMs: Date.now() - startedAt,
    });
    console.log(
      `[citation] ${c.id} ${passed ? "PASS" : "FAIL"} compliance=${compliance} accuracy=${accuracy} no_halluc=${noHallucination} ($${costUsd.toFixed(4)})`,
    );
  }
  return out;
}

function scoreCompliance(
  visible: string,
  final: ReturnType<typeof finalize>,
  c: CitationCase,
): boolean {
  if (final.parseFailed) return false;
  if (c.expectAbsent) {
    // Empty citation array is the compliant answer here — but the model
    // still has to emit the <CITATIONS>[]</CITATIONS> sentinel, which
    // means the parser found AND parsed the block. That's exactly what
    // `final.citations !== null` checks.
    return final.citations !== null;
  }
  // Otherwise we expect at least one [N] marker in the prose AND a
  // parsed citations array.
  const hasMarker = /\[\d+\]/.test(visible);
  return hasMarker && (final.citations?.length ?? 0) > 0;
}

function scoreAccuracy(
  visible: string,
  cits: Citation[],
  c: CitationCase,
): boolean {
  if (c.expectAbsent) {
    // Accuracy axis here = the visible text actually disclaims having
    // the info (vs silently dropping the question).
    const v = visible.toLowerCase();
    return (
      v.includes("not") &&
      (v.includes("source") || v.includes("document") || v.includes("contract"))
    );
  }
  // Every [N] in prose has a matching ref entry.
  const refsInProse = new Set<number>();
  const re = /\[(\d+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(visible)) !== null) refsInProse.add(Number(m[1]));
  for (const n of refsInProse) {
    if (!cits.find((cc) => cc.ref === n)) return false;
  }
  // Every cited quote actually appears at the cited page of the cited doc.
  for (const cit of cits) {
    const doc = c.docs.find((d) => d.doc_id === cit.doc_id);
    if (!doc) return false;
    const page = doc.pages[cit.page - 1];
    if (!page) return false;
    // Allow [[PAGE_BREAK]] in the model's quote — split, check each side.
    const fragments = cit.quote.split("[[PAGE_BREAK]]");
    let cursorPage = cit.page;
    for (const frag of fragments) {
      const target = doc.pages[cursorPage - 1];
      if (!target) return false;
      // Loose match: collapse whitespace before substring check.
      const norm = (s: string) => s.replace(/\s+/g, " ").trim();
      if (!norm(target).includes(norm(frag).slice(0, 40))) {
        return false;
      }
      cursorPage += 1;
    }
  }
  // Optional substring expectations on the visible answer.
  if (c.expectVisible) {
    const lower = visible.toLowerCase();
    for (const exp of c.expectVisible) {
      if (!lower.includes(exp.toLowerCase())) return false;
    }
  }
  if (c.expectDocIds) {
    for (const id of c.expectDocIds) {
      if (!cits.find((cc) => cc.doc_id === id)) return false;
    }
  }
  return true;
}

function scoreNoHallucination(cits: Citation[], c: CitationCase): boolean {
  if (c.expectAbsent) return cits.length === 0;
  for (const cit of cits) {
    const doc = c.docs.find((d) => d.doc_id === cit.doc_id);
    if (!doc) return false;
    if (cit.page < 1 || cit.page > doc.pages.length) return false;
  }
  return true;
}

export const CITATION_CASE_COUNT = CASES.length;
