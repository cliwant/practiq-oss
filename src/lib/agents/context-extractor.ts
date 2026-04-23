/**
 * Document → ClientContext extractor.
 *
 * Takes raw document text (from a pasted snippet, an uploaded PDF, or
 * an Excel sheet rendered to text) plus the client dossier and asks
 * Claude to split it into structured ClientContext entries. Each entry
 * is persisted with createdBy=user and a tag indicating it came from
 * auto-extraction so the operator can quickly spot AI-generated facts.
 *
 * The extractor is intentionally conservative: if it's not sure, it
 * groups content under a single "note" entry rather than fabricating
 * a "metric" with invented numbers.
 */
import { getClaudeProvider } from "@/lib/claude/provider";
import { prisma } from "@/lib/prisma";

const VALID_CATEGORIES = new Set([
  "decision",
  "document",
  "note",
  "meeting_summary",
  "metric",
]);

export interface ExtractedContext {
  title: string;
  content: string;
  category: string;
  tags: string[];
  isPinned: boolean;
  confidence: number;
}

export interface ExtractionResult {
  contexts: ExtractedContext[];
  overallConfidence: number;
  warnings: string[];
  tokensIn: number;
  tokensOut: number;
}

const SYSTEM = `You parse unstructured documents about a specific client for an AI-native professional-services workspace. Each document becomes a small set of concise, referenceable knowledge-base entries that the agent will use in future briefings, drafts, and decisions.

Core rules:
1. Extract ONLY what the document actually says. Do not invent figures, dates, or names.
2. One coherent fact per entry. Don't stuff a whole page into one entry — split into 2-6 entries.
3. Pick the tightest applicable category:
   - decision   : a judgment already made (pricing, supplier switch, tax position)
   - document   : identification of a formal artifact that exists
   - note       : general observations, commentary, personality signals
   - meeting_summary : if this IS a meeting / call note
   - metric     : a quantitative data point (MRR, cost%, runway, etc.)
4. Use short titles (under 60 characters). Content should be 1-4 sentences of tight prose — no bullet lists.
5. Pin an entry only if it's the kind of fact the agent must always know (profile basics, communication style, recurring preferences). Never pin metrics that go stale monthly.
6. Tag each entry with 1-3 short lowercase tags relevant to the operator's workflow (e.g. "financial", "tax", "supplier", "seasonality").
7. Confidence 0.0-1.0 per entry. Set LOW (<0.4) when the document is ambiguous or you had to infer. Set HIGH (>0.85) only when the content is verbatim or direct paraphrase.
8. If the document is noise or doesn't contain useful facts about this client, return an empty entries array.

Output FORMAT — strict JSON matching this schema. No prose before or after.

{
  "entries": [
    {
      "title": string,            // <= 60 chars
      "content": string,          // 1-4 sentences
      "category": "decision" | "document" | "note" | "meeting_summary" | "metric",
      "tags": string[],           // 1-3 lowercase kebab or plain words
      "isPinned": boolean,
      "confidence": number        // 0.0 - 1.0
    }
  ],
  "overallConfidence": number,
  "warnings": string[]            // e.g. ["contained scanned portions we could not read"]
}`;

export async function extractContexts(args: {
  clientId: string;
  userId: string;
  sourceName: string;
  rawText: string;
}): Promise<ExtractionResult> {
  const { clientId, userId, sourceName, rawText } = args;

  if (!rawText.trim()) {
    throw new Error("raw text is empty");
  }
  if (rawText.length > 200_000) {
    throw new Error(
      `document too large (${rawText.length} chars). Split into smaller sections (<200k chars each).`,
    );
  }

  const client = await prisma.client.findFirst({
    where: { id: clientId, userId },
    select: { name: true, industry: true, userRole: true },
  });
  if (!client) throw new Error("Client not found or not owned");

  const userPrompt = `<client>
<name>${client.name}</name>
<industry>${client.industry}</industry>
<operator_role>${client.userRole}</operator_role>
</client>

<source name="${sourceName}">
${rawText.slice(0, 180_000)}
</source>

Extract knowledge-base entries for this client, following the rules in the system prompt. Return JSON only.`;

  const response = await getClaudeProvider().complete({
    system: SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
    maxTokens: 4000,
  });
  const text = response.text;

  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  let parsed: {
    entries?: Array<Partial<ExtractedContext> & { [k: string]: unknown }>;
    overallConfidence?: number;
    warnings?: string[];
  };
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(
      `Claude returned invalid JSON for context extraction: ${
        err instanceof Error ? err.message : String(err)
      }. Raw start: ${cleaned.slice(0, 200)}`,
    );
  }

  const entries: ExtractedContext[] = [];
  for (const raw of parsed.entries ?? []) {
    const title = typeof raw.title === "string" ? raw.title.trim() : "";
    const content = typeof raw.content === "string" ? raw.content.trim() : "";
    const category =
      typeof raw.category === "string" && VALID_CATEGORIES.has(raw.category)
        ? raw.category
        : "note";
    const tags = Array.isArray(raw.tags)
      ? raw.tags
          .filter((t): t is string => typeof t === "string")
          .map((t) => t.toLowerCase().slice(0, 40))
          .slice(0, 5)
      : [];
    const isPinned = raw.isPinned === true;
    const confidence =
      typeof raw.confidence === "number"
        ? Math.max(0, Math.min(1, raw.confidence))
        : 0.5;

    if (!title || !content) continue;
    entries.push({ title, content, category, tags, isPinned, confidence });
  }

  return {
    contexts: entries,
    overallConfidence:
      typeof parsed.overallConfidence === "number"
        ? parsed.overallConfidence
        : 0.5,
    warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
    tokensIn: response.inputTokens ?? 0,
    tokensOut: response.outputTokens ?? 0,
  };
}

/**
 * Persist an extraction result as ClientContext rows. Auto-tags every
 * created row with `source:auto` and `source:<sourceName>` so the
 * operator can filter/roll-back easily.
 */
export async function persistExtraction(args: {
  clientId: string;
  userId: string;
  sourceName: string;
  result: ExtractionResult;
}): Promise<{ createdIds: string[] }> {
  const { clientId, userId, sourceName, result } = args;
  const createdIds: string[] = [];

  await prisma.$transaction(async (tx) => {
    for (const entry of result.contexts) {
      const row = await tx.clientContext.create({
        data: {
          clientId,
          title: entry.title,
          content: entry.content,
          category: entry.category,
          tags: [...new Set([...entry.tags, "auto-extracted", `source:${sourceName.slice(0, 32)}`])],
          isPinned: entry.isPinned,
          createdBy: userId,
        },
      });
      createdIds.push(row.id);
    }
    await tx.auditLog.create({
      data: {
        clientId,
        userId,
        action: "context_extracted",
        details: {
          sourceName,
          entryCount: result.contexts.length,
          overallConfidence: result.overallConfidence,
          warnings: result.warnings,
        },
      },
    });
  });

  return { createdIds };
}
