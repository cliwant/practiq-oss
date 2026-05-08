/**
 * reply-classifier.ts — LLM-based reply classification for Practiq cold
 * outreach. Routes through OpenRouter (`anthropic/claude-sonnet-4.5`)
 * per the studio LLM mandate (see CLAUDE.md). Reuses the existing
 * Anthropic SDK client at `src/lib/claude/client.ts` which is already
 * wired to OpenRouter when OPENROUTER_API_KEY is set.
 */
import { anthropic } from "@/lib/claude/client";

export type ReplyCategory =
  | "interested"
  | "book_demo"
  | "not_now"
  | "not_interested"
  | "unsubscribe"
  | "out_of_office"
  | "bounced"
  | "clarifying_q"
  | "other";

export type ReplyClassification = {
  category: ReplyCategory;
  summary: string;
  suggested_response: string;
  confidence: number;
};

const SYSTEM_PROMPT = `You are classifying a single email reply received in
response to a B2B cold outreach campaign for Practiq, an AI ops layer for
boutique professional services firms (CPAs, lawyers, consultants).

Read the reply text and emit ONE JSON object with this schema:

{
  "category": "interested" | "book_demo" | "not_now" | "not_interested" | "unsubscribe" | "out_of_office" | "bounced" | "clarifying_q" | "other",
  "summary": "<one short sentence rephrasing what they said>",
  "suggested_response": "<one or two sentences the operator could say back>",
  "confidence": <number between 0 and 1>
}

Category guidance (single-label, pick the best fit):
- "interested": wants to hear more, asks questions about the product, "send me the loom", "tell me more"
- "book_demo": wants to schedule a call, suggests times, says "happy to chat"
- "not_now": soft pass, "not a fit right now", "circle back next quarter"
- "not_interested": hard pass, "no thanks", "remove me", short "no"
- "unsubscribe": explicit unsubscribe / opt-out request
- "out_of_office": auto-reply with vacation / OOO / "I am away" boilerplate
- "bounced": delivery failure / mailer-daemon (look for "Undeliverable", "550 5.1.1", "Address not found")
- "clarifying_q": asks a question that doesn't yet say yes or no
- "other": anything that doesn't fit the above

Output ONLY the JSON object — no markdown fences, no commentary.`;

function extractJson(text: string): string {
  // Strip optional ```json fences and surrounding prose.
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) return fence[1].trim();
  // Find the first { ... } balanced object.
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return text.trim();
}

export async function classifyReply({
  fromEmail,
  subject,
  bodyText,
}: {
  fromEmail: string;
  subject: string;
  bodyText: string;
}): Promise<ReplyClassification> {
  // Trim aggressively — most signal is in the first ~600 chars.
  const trimmedBody = bodyText.slice(0, 2400);
  const userPrompt = `From: ${fromEmail}
Subject: ${subject}

Body:
${trimmedBody}`;

  // anthropic/claude-sonnet-4.5 is the studio default for production
  // agents. Routes through OpenRouter automatically (see client.ts).
  const message = await anthropic.messages.create({
    model: "anthropic/claude-sonnet-4.5",
    max_tokens: 600,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text =
    message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("\n") || "";

  let parsed: ReplyClassification;
  try {
    const json = extractJson(text);
    parsed = JSON.parse(json) as ReplyClassification;
  } catch {
    // Fallback to a conservative classification on parse failure so
    // the operator still gets a Slack ping with the raw text.
    parsed = {
      category: "other",
      summary: text.slice(0, 120) || "(LLM returned no parseable JSON)",
      suggested_response: "Manual review required.",
      confidence: 0.0,
    };
  }

  // Normalize: clamp confidence, validate category.
  const validCategories: ReplyCategory[] = [
    "interested",
    "book_demo",
    "not_now",
    "not_interested",
    "unsubscribe",
    "out_of_office",
    "bounced",
    "clarifying_q",
    "other",
  ];
  if (!validCategories.includes(parsed.category)) {
    parsed.category = "other";
  }
  if (typeof parsed.confidence !== "number" || isNaN(parsed.confidence)) {
    parsed.confidence = 0.0;
  }
  parsed.confidence = Math.max(0, Math.min(1, parsed.confidence));
  parsed.summary = String(parsed.summary ?? "").slice(0, 400);
  parsed.suggested_response = String(parsed.suggested_response ?? "").slice(
    0,
    400
  );
  return parsed;
}

export function statusForCategory(
  category: ReplyCategory,
  currentStatus: string
): string {
  switch (category) {
    case "interested":
    case "book_demo":
    case "clarifying_q":
      return "in_conversation";
    case "not_now":
      return "deprioritized";
    case "not_interested":
    case "unsubscribe":
      return "closed_lost";
    case "bounced":
      return "bounced";
    case "out_of_office":
      // OOO is not a real response — keep current status.
      return currentStatus || "in_conversation";
    default:
      return currentStatus || "replied_other";
  }
}

export function urgencyTier(c: ReplyClassification): "hot" | "neutral" | "negative" {
  if (
    c.category === "interested" ||
    c.category === "book_demo" ||
    (c.category === "clarifying_q" && c.confidence > 0.7)
  ) {
    return "hot";
  }
  if (
    c.category === "not_now" ||
    c.category === "not_interested" ||
    c.category === "unsubscribe" ||
    c.category === "bounced"
  ) {
    return "negative";
  }
  return "neutral";
}
