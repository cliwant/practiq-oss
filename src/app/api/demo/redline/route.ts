/**
 * POST /api/demo/redline
 *
 * Public, anonymous, IP-rate-limited (3 / 24h). Wedge-of-the-product
 * demo for cold-email recipients: feed in a primary Word memo + 1-3
 * prior memos for the same client, and get back a tracked-changes
 * .docx where the AI has suggested revisions in the firm's voice
 * with citations to which prior memo each revision draws from.
 *
 * Two input modes (mutually exclusive):
 *   - { mode: "sample" } — load the canned Acme Manufacturing
 *     scenario shipped in src/lib/demo/sample-memos.ts. Builds the
 *     three .docx files at request time.
 *   - { mode: "byo", primary: <base64 docx>, priors: [<base64 docx>...] }
 *     — operator's own files. Capped at 1 primary + 3 priors,
 *     ~5MB each (Vercel function payload budget). Files are NEVER
 *     persisted; we process in memory and drop after responding.
 *
 * Response shape:
 *   {
 *     docxBase64: string,        // tracked-changes .docx for download
 *     filename: string,
 *     previewHtml: string,       // mammoth-rendered HTML with ins/del styled
 *     edits: Edit[],             // applied edits (with reasons + sources)
 *     skipped: { edit, reason }[],
 *     timingMs: { llm: number, redline: number, render: number, total: number },
 *     rateLimitRemaining: number,
 *   }
 *
 * The cron infrastructure at /api/cron/* and the outreach paths in
 * src/lib/outreach/ are deliberately untouched per task constraints.
 */
import { NextRequest, NextResponse } from "next/server";
import {
  applyTrackedChanges,
  type Edit,
} from "@/lib/docx/trackedChanges";
import {
  SAMPLE_PRIMARY,
  SAMPLE_PRIORS,
  buildSampleDocx,
  memoToPlainText,
  type SampleMemo,
} from "@/lib/demo/sample-memos";
import { renderTrackedChangesHtml } from "@/lib/demo/render-preview";
import {
  checkDemoRateLimit,
  DEMO_RATE_LIMIT,
} from "@/lib/demo/rate-limit";
import { getClaudeProvider } from "@/lib/claude/provider";

export const runtime = "nodejs";
export const maxDuration = 90; // seconds — LLM call + redline + render

const MAX_PRIORS = 3;
const MAX_BYO_BYTES = 5 * 1024 * 1024; // 5MB per file

interface RequestBody {
  mode: "sample" | "byo";
  primary?: string; // base64 docx
  priors?: string[]; // base64 docx[]
  /** Plain-text fallback for primary when the user hasn't got a .docx */
  primaryText?: string;
  priorTexts?: string[];
  primaryFilename?: string;
  /** Optional client name for the LLM context (BYO only) */
  clientName?: string;
}

interface LlmEditProposal {
  find: string;
  replace: string;
  reason: string;
  source_memo: string; // which prior memo motivated this edit
  context_before?: string;
  context_after?: string;
}

interface LlmResponse {
  edits: LlmEditProposal[];
  voice_notes?: string[];
}

const SYSTEM_PROMPT = `You are Practiq's redline copilot for a boutique CPA firm.

Your job: take the partner's draft memo + 1-3 prior memos for the
same client, and propose tracked-change revisions to the draft so
it reads in the firm's established voice for THIS client.

Strict rules for the edits you propose:

1. Each edit MUST be a small, surgical replacement — typically 5-30
   words. Replace one phrase or one sentence at a time. Never
   propose a full-paragraph rewrite.

2. Each edit's "find" string MUST appear VERBATIM somewhere in the
   primary draft. Do not paraphrase it. The downstream system uses
   substring matching to locate the run; if "find" doesn't match
   exactly, the edit is silently dropped.

3. Each edit MUST cite which prior memo (by title) motivated it in
   the "source_memo" field. If you can't cite a prior memo as the
   source of the change, do not propose the edit.

4. Stay in the firm's voice. Do not add new substantive accounting
   conclusions, change numbers, or introduce new findings — your
   role is wording / convention alignment, not technical review.

5. Aim for 3-7 high-quality edits total. Do not pad. If the draft
   is already aligned with prior conventions, return fewer edits.

6. Each "reason" should be 1 sentence, plain English, citing the
   convention. Example: "Prior Q3 2025 memo describes this as a
   'lower of cost or net realizable value adjustment' rather than
   'inventory write-down' — using the established firm wording."

Output: a JSON object matching the redline_proposal schema. No
prose outside the structured output.`;

function makePrimaryEditPrompt(
  primaryText: string,
  primaryTitle: string,
  priors: Array<{ title: string; text: string }>,
  clientName: string,
): string {
  const priorsBlock = priors
    .map(
      (p, i) =>
        `<prior_memo index="${i + 1}" title="${escapeXml(p.title)}">\n${p.text}\n</prior_memo>`,
    )
    .join("\n\n");

  return `<client_name>${escapeXml(clientName)}</client_name>

<primary_draft title="${escapeXml(primaryTitle)}">
${primaryText}
</primary_draft>

${priorsBlock}

Propose 3-7 tracked-change edits to the primary draft so it
reads in the firm's voice for this client, citing which prior
memo motivated each edit. Use the redline_proposal output
schema.`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const REDLINE_OUTPUT_SCHEMA = {
  name: "redline_proposal",
  description:
    "Structured set of tracked-change edits to the primary memo, each citing which prior memo motivated it.",
  schema: {
    type: "object" as const,
    properties: {
      edits: {
        type: "array",
        items: {
          type: "object",
          properties: {
            find: {
              type: "string",
              description:
                "Exact verbatim phrase from the primary draft to replace. Must match a single run.",
            },
            replace: {
              type: "string",
              description:
                "Replacement phrase in the firm's voice for this client.",
            },
            reason: {
              type: "string",
              description:
                "1-sentence rationale citing the prior memo convention.",
            },
            source_memo: {
              type: "string",
              description:
                "Title of the prior memo that motivated this edit.",
            },
            context_before: {
              type: "string",
              description:
                "Optional ~30 chars of text immediately before `find`, used to disambiguate when the same phrase appears multiple times.",
            },
            context_after: {
              type: "string",
              description:
                "Optional ~30 chars of text immediately after `find`.",
            },
          },
          required: ["find", "replace", "reason", "source_memo"],
        },
        minItems: 1,
        maxItems: 10,
      },
      voice_notes: {
        type: "array",
        items: { type: "string" },
        description:
          "Optional 1-2 short notes about the firm's voice patterns observed across prior memos.",
      },
    },
    required: ["edits"],
  },
};

export async function POST(request: NextRequest) {
  const started = Date.now();
  // 1. Rate limit by IP (anonymous endpoint)
  const rate = await checkDemoRateLimit(request);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: `You've used your ${DEMO_RATE_LIMIT.limit} free demo runs for the day.`,
        retryAfterSec: rate.retryAfterSec,
        limit: DEMO_RATE_LIMIT.limit,
        bookCallCta: true,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rate.retryAfterSec),
          "X-RateLimit-Limit": String(DEMO_RATE_LIMIT.limit),
          "X-RateLimit-Remaining": String(rate.remaining),
        },
      },
    );
  }

  // 2. Parse + validate body
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json(
      { error: "Body must be valid JSON" },
      { status: 400 },
    );
  }

  if (body.mode !== "sample" && body.mode !== "byo") {
    return NextResponse.json(
      { error: "mode must be 'sample' or 'byo'" },
      { status: 400 },
    );
  }

  // 3. Resolve primary + priors based on mode
  let primaryDocxBuffer: Buffer;
  let primaryText: string;
  let primaryTitle: string;
  let priors: Array<{ title: string; text: string }> = [];
  let clientName = "the client";
  let downloadFilename = "redlined-memo.docx";

  if (body.mode === "sample") {
    primaryDocxBuffer = await buildSampleDocx(SAMPLE_PRIMARY);
    primaryText = memoToPlainText(SAMPLE_PRIMARY);
    primaryTitle = SAMPLE_PRIMARY.title;
    clientName = SAMPLE_PRIMARY.clientName;
    downloadFilename = "Acme-Q3-2026-redlined.docx";
    priors = SAMPLE_PRIORS.map((m: SampleMemo) => ({
      title: m.title,
      text: memoToPlainText(m),
    }));
  } else {
    // BYO mode
    if (!body.primary && !body.primaryText) {
      return NextResponse.json(
        {
          error:
            "BYO mode requires either `primary` (base64 docx) or `primaryText`",
        },
        { status: 400 },
      );
    }
    if ((body.priors?.length ?? 0) > MAX_PRIORS) {
      return NextResponse.json(
        { error: `Too many prior memos. Max is ${MAX_PRIORS}.` },
        { status: 400 },
      );
    }
    clientName = body.clientName?.slice(0, 120) || "the client";
    downloadFilename = body.primaryFilename
      ? body.primaryFilename.replace(/\.docx$/i, "") + "-redlined.docx"
      : "redlined-memo.docx";

    if (body.primary) {
      const buf = decodeBase64(body.primary);
      if (!buf || buf.byteLength > MAX_BYO_BYTES) {
        return NextResponse.json(
          {
            error: `Primary file invalid or larger than ${MAX_BYO_BYTES} bytes`,
          },
          { status: 400 },
        );
      }
      primaryDocxBuffer = buf;
      primaryTitle = body.primaryFilename ?? "Primary memo";
      // Extract text via mammoth to feed the LLM
      const mammoth = (await import("mammoth")).default;
      const extracted = await mammoth.extractRawText({ buffer: buf });
      primaryText = extracted.value;
    } else {
      // primaryText path — synthesize a minimal docx so we have
      // something to apply tracked changes onto.
      const synthetic = await buildSampleDocx({
        title: body.primaryFilename ?? "Primary memo",
        clientName,
        asOf: new Date().toISOString().slice(0, 10),
        sections: [
          {
            heading: "Memo",
            paragraphs: (body.primaryText ?? "").split(/\n{2,}/).filter(Boolean),
          },
        ],
      });
      primaryDocxBuffer = synthetic;
      primaryTitle = body.primaryFilename ?? "Primary memo";
      primaryText = body.primaryText ?? "";
    }

    if (body.priors && body.priors.length > 0) {
      const mammoth = (await import("mammoth")).default;
      for (let i = 0; i < body.priors.length; i++) {
        const buf = decodeBase64(body.priors[i]);
        if (!buf || buf.byteLength > MAX_BYO_BYTES) {
          return NextResponse.json(
            { error: `Prior #${i + 1} invalid or too large` },
            { status: 400 },
          );
        }
        const extracted = await mammoth.extractRawText({ buffer: buf });
        priors.push({
          title: `Prior memo ${i + 1}`,
          text: extracted.value,
        });
      }
    } else if (body.priorTexts && body.priorTexts.length > 0) {
      priors = body.priorTexts.slice(0, MAX_PRIORS).map((t, i) => ({
        title: `Prior memo ${i + 1}`,
        text: t,
      }));
    }

    if (priors.length === 0) {
      return NextResponse.json(
        {
          error:
            "Provide at least one prior memo so the redline has firm-voice precedent to draw from.",
        },
        { status: 400 },
      );
    }
  }

  // 4. Call the LLM via OpenRouter (provider auto-resolves)
  const llmStart = Date.now();
  let llmResult: LlmResponse;
  try {
    const userPrompt = makePrimaryEditPrompt(
      primaryText,
      primaryTitle,
      priors,
      clientName,
    );
    const provider = getClaudeProvider();
    const response = await provider.complete({
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
      maxTokens: 4000,
      outputSchema: REDLINE_OUTPUT_SCHEMA,
    });
    const text = response.text;
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      // Some providers wrap in code fences when outputSchema is
      // ignored (e.g. CLI fallback). Strip and retry.
      const cleaned = text
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```\s*$/i, "")
        .trim();
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        throw new Error(
          `LLM returned non-JSON: ${text.slice(0, 200)}…`,
        );
      }
    }
    llmResult = parsed as LlmResponse;
    if (!Array.isArray(llmResult.edits)) {
      throw new Error("LLM response missing `edits` array");
    }
  } catch (err) {
    return NextResponse.json(
      {
        error: `Could not generate redline: ${
          err instanceof Error ? err.message : String(err)
        }`,
      },
      { status: 502 },
    );
  }
  const llmMs = Date.now() - llmStart;

  // 5. Apply tracked changes to the primary docx
  const redlineStart = Date.now();
  const edits: Edit[] = llmResult.edits.map((e) => ({
    find: e.find,
    replace: e.replace,
    reason: `${e.reason} (Source: ${e.source_memo})`,
    context_before: e.context_before,
    context_after: e.context_after,
    author: "Practiq Demo",
  }));
  const result = applyTrackedChanges(primaryDocxBuffer, edits, {
    author: "Practiq Demo",
  });
  const redlineMs = Date.now() - redlineStart;

  // 6. Render preview HTML
  const renderStart = Date.now();
  let previewHtml = "";
  let previewWarnings: string[] = [];
  try {
    const rendered = await renderTrackedChangesHtml({
      docxBuffer: result.buffer,
    });
    previewHtml = rendered.html;
    previewWarnings = rendered.warnings;
  } catch (err) {
    previewHtml = `<p class="text-zinc-400">Preview rendering failed: ${
      err instanceof Error ? err.message : String(err)
    }. The .docx download still works.</p>`;
  }
  const renderMs = Date.now() - renderStart;

  // 7. Respond. Files are in memory only — no persistence.
  const docxBase64 = result.buffer.toString("base64");
  const totalMs = Date.now() - started;

  return NextResponse.json(
    {
      docxBase64,
      filename: downloadFilename,
      previewHtml,
      previewWarnings,
      edits: result.applied.map((e) => ({
        find: e.find,
        replace: e.replace,
        reason: e.reason,
      })),
      skipped: result.skipped.map((s) => ({
        find: s.edit.find,
        reason: s.reason,
      })),
      voiceNotes: llmResult.voice_notes ?? [],
      timingMs: {
        llm: llmMs,
        redline: redlineMs,
        render: renderMs,
        total: totalMs,
      },
      rateLimitRemaining: rate.remaining,
      rateLimit: DEMO_RATE_LIMIT.limit,
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-RateLimit-Limit": String(DEMO_RATE_LIMIT.limit),
        "X-RateLimit-Remaining": String(rate.remaining),
      },
    },
  );
}

function decodeBase64(s: string): Buffer | null {
  try {
    // Strip optional data URL prefix
    const stripped = s.replace(/^data:[^;]+;base64,/i, "");
    return Buffer.from(stripped, "base64");
  } catch {
    return null;
  }
}

/**
 * GET — return scenario metadata only. Used by the demo page to
 * pre-populate the "what's loaded" UI without firing the LLM.
 */
export async function GET() {
  const { SAMPLE_DESCRIPTORS } = await import("@/lib/demo/sample-memos");
  return NextResponse.json({
    sample: SAMPLE_DESCRIPTORS,
    rateLimit: DEMO_RATE_LIMIT,
  });
}
