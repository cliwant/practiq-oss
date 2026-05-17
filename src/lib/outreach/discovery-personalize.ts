/**
 * Discovery-outreach personalization engine.
 *
 * Takes a single target row (from target-list.csv) and produces a fully
 * personalized email — subject + body — by routing template selection
 * through Claude (via OpenRouter per studio LLM mandate).
 *
 * Reputation-protection principles encoded here:
 *   1. Personalization MUST reference a specific detail about the target
 *      (firm name, role, vertical, location, LinkedIn snippet if present).
 *      If we can't find a real detail to anchor on, downgrade to "skip"
 *      rather than send a fake-personal email.
 *   2. We never invent facts. Claude is prompt-fenced: "only use details
 *      from the provided context; if uncertain, omit."
 *   3. Plain-text-friendly. No HTML decorations, tracking pixels, or
 *      images — those are spam signals in cold outreach.
 *   4. Subject line is plain (no [Brand], no emojis, no ALL CAPS).
 *
 * Output is a SendEmailInput-shaped object plus a confidence score that
 * the send pipeline uses to decide auto-send vs queue-for-review.
 */
import { anthropic } from "@/lib/claude/client";

export interface DiscoveryTarget {
  firm_name: string;
  contact_name: string; // full name preferred; first-name fallback OK
  role?: string;
  vertical?: "accounting" | "law" | "hr" | "consulting" | "agency" | string;
  location?: string;
  team_size?: number | string;
  client_count_estimate?: number | string;
  /** LinkedIn URL — for context only, never embedded in the email body. */
  linkedin_url?: string;
  /** A 1-3 sentence snippet of their LinkedIn summary or "About" if available. */
  linkedin_snippet?: string;
  /** Firm domain or website if known. */
  firm_url?: string;
  /** A short note about the firm gleaned from their website if scraped. */
  firm_snippet?: string;
  /** Where we got their contact. Determines tone + opener strategy. */
  source_channel: "network" | "reddit" | "inbound" | "cold_targeted" | "review";
  /** Anything specific we already noted while sourcing them. */
  personalization_note?: string;
}

export interface DiscoveryEmailOutput {
  subject: string;
  text: string; // plain text body
  html: string; // simple HTML (no decoration)
  /** Operator + safety review hint — < 0.6 means hold for review. */
  confidence: number;
  /** Why Claude flagged the confidence level — usually "no firm-specific anchor available". */
  notes: string;
  /** The "would have referenced" details we found in input. */
  anchors_used: string[];
}

const SAFETY_REFUSALS = new Set([
  "INSUFFICIENT_CONTEXT",
  "OPERATOR_REVIEW_REQUIRED",
]);

const SYSTEM_PROMPT = `You write 80-150 word cold outreach emails for Practiq, an AI
workspace for boutique professional services firms (accounting / law / HR
advisory / consulting / marketing agency) managing 30-200 client relationships.

The voice: founder-to-founder. Not marketing. Not sales. The recipient is
a busy partner at a 2-20 person firm.

Your job: write ONE email (subject + body) that this specific recipient
would NOT immediately delete. The bar for "personal" is: they would
genuinely think a human read about them before writing.

Hard constraints:
  - NEVER invent specifics. If the input context doesn't give you a concrete
    detail to anchor on, return {"refuse": "INSUFFICIENT_CONTEXT"}.
  - NEVER refer to fake events ("I saw your tweet about X" unless X is in
    the input). NEVER mention the recipient's clients by name.
  - NEVER use words / phrases that signal automation: "I came across your
    profile", "I noticed you", "as a leader in the space", "growth strategies",
    "thought leader", "synergy", "leverage".
  - NEVER include marketing CTAs ("Schedule a demo", "Book a meeting" as
    primary ask). The primary ask is a 25-min conversation.
  - NEVER include emojis in the subject line. Subject must be plain English
    in sentence case, under 60 chars.
  - NEVER include unsubscribe links — this is one-to-one operator-from-personal-
    inbox style, not bulk marketing.

Soft preferences:
  - Open with 1-2 sentences anchored on a specific detail from the input.
  - Briefly state why you're reaching out (problem hypothesis + why them
    specifically).
  - Close with a specific, low-pressure ask (25-min chat in next 2 weeks,
    "skip if it's not your thing" type out).
  - Signature: "— Seungdo" (founder of Practiq). Don't add titles or logos.

Output exactly one JSON object:

{
  "refuse": null | "INSUFFICIENT_CONTEXT",
  "subject": "<60-char subject>",
  "body": "<80-150 word plain-text body, no markdown>",
  "confidence": <0.0-1.0, how confident the personalization is real & ungeneric>,
  "anchors_used": ["<detail 1>", "<detail 2>"],
  "notes": "<one sentence explaining the confidence rating>"
}`;

function buildUserPrompt(t: DiscoveryTarget): string {
  const lines: string[] = [];
  lines.push(`Recipient context (use these details verbatim if you reference them):`);
  lines.push(`- Name: ${t.contact_name}`);
  if (t.role) lines.push(`- Role: ${t.role}`);
  lines.push(`- Firm: ${t.firm_name}`);
  if (t.vertical) lines.push(`- Vertical: ${t.vertical}`);
  if (t.location) lines.push(`- Location: ${t.location}`);
  if (t.team_size) lines.push(`- Team size: ${t.team_size}`);
  if (t.client_count_estimate) lines.push(`- Client count (est): ${t.client_count_estimate}`);
  if (t.linkedin_snippet) lines.push(`- LinkedIn summary: "${t.linkedin_snippet}"`);
  if (t.firm_snippet) lines.push(`- About the firm: "${t.firm_snippet}"`);
  if (t.personalization_note) lines.push(`- Sourcing note: ${t.personalization_note}`);
  lines.push(`- How we found them: ${t.source_channel}`);
  lines.push("");
  lines.push(`Write the email now.`);
  return lines.join("\n");
}

/**
 * Generate a personalized email for one discovery target.
 *
 * Returns `null` if Claude refuses for INSUFFICIENT_CONTEXT — the caller
 * should mark the target as "needs richer enrichment" and skip the send.
 */
export async function personalizeForTarget(
  target: DiscoveryTarget,
): Promise<DiscoveryEmailOutput | null> {
  const response = await anthropic.messages.create({
    model: "anthropic/claude-sonnet-4.5",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserPrompt(target) }],
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("")
    .trim();

  // Strip ```json fences if Claude wraps the response
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();

  let parsed: {
    refuse: string | null;
    subject?: string;
    body?: string;
    confidence?: number;
    anchors_used?: string[];
    notes?: string;
  };
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(
      `personalize parse failed: ${err instanceof Error ? err.message : err}\nRaw: ${text.slice(0, 400)}`,
    );
  }

  if (parsed.refuse && SAFETY_REFUSALS.has(parsed.refuse)) {
    return null;
  }
  if (!parsed.subject || !parsed.body) {
    return null;
  }

  // Light HTML wrap — preserve plain text feel.
  const html = parsed.body
    .split(/\n\n+/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`)
    .join("\n");

  return {
    subject: parsed.subject,
    text: parsed.body,
    html,
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
    anchors_used: Array.isArray(parsed.anchors_used) ? parsed.anchors_used : [],
    notes: parsed.notes ?? "",
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Batch-personalize a list of targets, returning successes + skips
 * separately. Throttled internally to avoid rate-limit issues.
 */
export async function personalizeBatch(
  targets: DiscoveryTarget[],
  concurrency = 3,
): Promise<{ ready: Array<{ target: DiscoveryTarget; email: DiscoveryEmailOutput }>; skipped: Array<{ target: DiscoveryTarget; reason: string }> }> {
  const ready: Array<{ target: DiscoveryTarget; email: DiscoveryEmailOutput }> = [];
  const skipped: Array<{ target: DiscoveryTarget; reason: string }> = [];

  // Simple chunked parallelism — keep concurrency modest to avoid
  // anthropic rate limits + protect our token spend.
  for (let i = 0; i < targets.length; i += concurrency) {
    const slice = targets.slice(i, i + concurrency);
    const results = await Promise.all(
      slice.map(async (t) => {
        try {
          const email = await personalizeForTarget(t);
          if (!email) return { kind: "skip" as const, target: t, reason: "insufficient_context" };
          return { kind: "ready" as const, target: t, email };
        } catch (err) {
          return {
            kind: "skip" as const,
            target: t,
            reason: `error: ${err instanceof Error ? err.message : err}`,
          };
        }
      }),
    );
    for (const r of results) {
      if (r.kind === "ready") ready.push({ target: r.target, email: r.email });
      else skipped.push({ target: r.target, reason: r.reason });
    }
  }

  return { ready, skipped };
}
