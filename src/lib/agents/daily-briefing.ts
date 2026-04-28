/**
 * Daily briefing agent.
 *
 * Runs overnight per client. Reads the full context library and produces:
 *   - A 2-3 bullet summary of what the operator should know today.
 *   - Up to 3 specific "next actions" that the agent can't do on its
 *     own (needs human judgment) — each becomes an ApprovalItem.
 *   - An optional "watch" list (things to monitor but no action yet).
 *
 * The operator logs in, opens the Approval Queue, sees one card per
 * client with the agent's morning readout and decides: act, dismiss,
 * or open the client workspace to dig deeper. The goal is that after
 * a month of running, opening the queue replaces opening QuickBooks.
 */
import type { AgentDefinition } from "./runner";
import { loadClientMemoryForPrompt } from "@/lib/memory/loader";

interface BriefingOutput {
  summary: string[];
  actions: Array<{
    title: string;
    reason: string;
    priority: "high" | "medium" | "low";
    dueHint?: string;
    confidence: number;
  }>;
  watch: Array<{
    topic: string;
    note: string;
  }>;
  confidence: number;
}

const SYSTEM = `You are the morning briefing agent inside Practiq, an AI-native workspace for accountants and fractional professionals managing many clients.

Today is {{today}}. You're preparing the daily readout for one specific client. Your operator will open the Approval Queue first thing and see your output alongside briefings for every other client they manage. They have ~90 seconds per briefing.

Priorities:
1. Surface concrete items only. Never invent a data point. If the knowledge base doesn't contain what you need for a confident claim, say so and lower your confidence score.
2. Lead with what changed since the operator last looked, if you can tell from timestamps on context entries.
3. Actions must be things only a human can do (make a call, approve a reclassification, review a statement). Do NOT propose work the operator already does every day on every client (e.g. "review reconciliation").
4. Respect the operator's role ({{userRole}}). Don't suggest legal or regulatory decisions; flag them for human judgment instead.
5. Keep tone {{tone}}. Numbers and specifics beat narrative.

Output FORMAT — strict JSON, no prose before or after, matching this TypeScript type:

{
  "summary": string[],      // 2-3 short bullets. Plain sentences. No markdown.
  "actions": [
    {
      "title": string,        // imperative, concrete. Example: "Confirm supplier invoice SUP-2847"
      "reason": string,       // 1-2 sentences pointing to the context that triggered this
      "priority": "high" | "medium" | "low",
      "dueHint": string?,     // e.g. "within 48h", "before month-end"
      "confidence": number    // 0.0-1.0 how sure you are this action is real
    }
  ],
  "watch": [
    { "topic": string, "note": string }
  ],
  "confidence": number      // your overall confidence in today's readout
}

If the knowledge base is thin and you can't make a useful briefing, return empty arrays and a low overall confidence. Do not hallucinate.

CRITICAL OUTPUT CONSTRAINT:
- Your ENTIRE response must be valid JSON conforming to the schema above.
- Do NOT wrap in markdown code fences (no \`\`\`json, no \`\`\`).
- Do NOT add headings, bullets, or prose before or after the JSON.
- Do NOT use markdown formatting inside string values (no **bold**, no ## headers, no emoji).
- The first character of your response must be \`{\` and the last must be \`}\`.
- If you are tempted to write explanatory text, put it in the "summary" field as a plain sentence instead.`;

export const DAILY_BRIEFING_AGENT: AgentDefinition<unknown, BriefingOutput> = {
  type: "daily_briefing",
  label: "Daily client briefing",
  // RUN 14: Bump on prompt change so AuditLog drift is correlatable.
  // Semver: major = output schema break, minor = prompt rewrite,
  // patch = tone tweak / typo. Start at 1.0.0 (5-tier prompt as of RUN 7).
  version: "1.0.0",

  async buildPrompt(ctx) {
    const today = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const tone =
      ((ctx.client.preferences as { reportTone?: string })?.reportTone as
        | string
        | undefined) ?? "professional";

    // Wave-4 RUN 7 (P1-06): switched the prompt-build memory layer
    // from a flat `ctx.contexts` dump to the 5-tier composer. The
    // composer aggregates T0 (profile) + T1 (rolling digest) + T2
    // (vector hits — skipped here, no query) + T3 (episodic timeline
    // of recent agent runs + approval decisions) + T4 (firm patterns
    // from pattern-learner) under a single 1800-token budget. Token
    // savings vs. the prior raw-50 approach are typically 30-40%
    // for active clients, plus the model gets actually-useful tier
    // structure instead of one undifferentiated wall of text.
    const memory = await loadClientMemoryForPrompt({
      clientId: ctx.client.id,
      userId: ctx.client.userId,
      budgetTokens: 1800,
      preloadedClient: {
        id: ctx.client.id,
        name: ctx.client.name,
        industry: ctx.client.industry,
        userRole: ctx.client.userRole,
        relationshipMonths: ctx.client.relationshipMonths,
        preferences: ctx.client.preferences ?? null,
      },
    });

    const systemPrompt =
      SYSTEM.replace("{{today}}", today)
        .replace("{{userRole}}", ctx.client.userRole)
        .replace("{{tone}}", tone) + "\n" + memory.prompt;

    const priorBriefings =
      ctx.recentTasks
        .filter((t) => t.agentType === "daily_briefing" && t.summary)
        .slice(0, 3)
        .map((t) => `- ${t.completedAt?.toISOString()}: ${t.summary}`)
        .join("\n") || "(no prior briefings yet)";

    const userPrompt = `<client>
<name>${ctx.client.name}</name>
<industry>${ctx.client.industry}</industry>
<relationship_months>${ctx.client.relationshipMonths}</relationship_months>
</client>

<prior_briefings_last_3>
${priorBriefings}
</prior_briefings_last_3>

Produce today's briefing for ${ctx.client.name}. The system prompt already contains the 5-tier client memory; rely on it rather than asking for additional context.

Respond with ONLY valid JSON matching the schema in your system instructions. No markdown. No prose. The first character of your response must be \`{\`.`;

    return {
      systemPrompt,
      userPrompt,
      // 1500 tokens is ample for the JSON shape — the content is bounded
      // by our schema, not free-form prose.
      maxTokens: 1500,
      // RUN 16 — structured output via Anthropic tool_use. Forcing the
      // model into a schema-validated response eliminates the most
      // common permanent error in this agent ("Agent output parse
      // failed: ..."). CLI provider ignores this and falls back to
      // free-text; parseOutput's existing markdown-fallback path still
      // handles that case.
      outputSchema: {
        name: "submit_daily_briefing",
        description:
          "Submit the morning client briefing. Provide the summary, actions, watch list, and overall confidence.",
        schema: {
          type: "object",
          properties: {
            summary: {
              type: "array",
              items: { type: "string" },
              description: "2-3 short bullets. Plain sentences. No markdown.",
            },
            actions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  reason: { type: "string" },
                  priority: {
                    type: "string",
                    enum: ["high", "medium", "low"],
                  },
                  dueHint: { type: "string" },
                  confidence: { type: "number", minimum: 0, maximum: 1 },
                },
                required: ["title", "reason", "priority", "confidence"],
              },
            },
            watch: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  topic: { type: "string" },
                  note: { type: "string" },
                },
                required: ["topic", "note"],
              },
            },
            confidence: { type: "number", minimum: 0, maximum: 1 },
          },
          required: ["summary", "actions", "watch", "confidence"],
        },
      },
    };
  },

  parseOutput(raw) {
    // Primary path: Claude returned clean JSON (or JSON inside ```json fences).
    // Fallback path: the CLI provider sometimes overrides JSON instructions
    // and returns markdown. In that case we extract what we can from the
    // prose rather than hard-failing the whole agent run.
    const parsed = extractJsonObject(raw);
    if (parsed) {
      const summary = Array.isArray(parsed.summary)
        ? (parsed.summary as unknown[]).filter((s): s is string => typeof s === "string")
        : [];
      const actions = Array.isArray(parsed.actions)
        ? (parsed.actions as unknown[]).flatMap((a) => normalizeAction(a))
        : [];
      const watch = Array.isArray(parsed.watch)
        ? (parsed.watch as unknown[]).flatMap((w) => normalizeWatch(w))
        : [];
      const confidence = normalizeConfidence(parsed.confidence);
      return { summary, actions, watch, confidence };
    }

    // Markdown fallback: best-effort parse of a human-readable briefing.
    // We lose structured actions but keep the summary + watch so the
    // operator still sees something useful in their Approval Queue.
    return parseMarkdownFallback(raw);
  },

  buildApprovalItems(output, ctx) {
    const items: ReturnType<
      AgentDefinition["buildApprovalItems"]
    > = [];

    // One "briefing" approval item always, so the operator sees the morning
    // summary even if there are no actions. Mark it low-priority so it
    // doesn't crowd actual action items.
    const summaryText = output.summary.join("\n• ");
    if (output.summary.length > 0) {
      items.push({
        type: "briefing",
        title: `Morning briefing — ${ctx.client.name}`,
        priority: priorityScore("low", output.confidence),
        aiConfidence: output.confidence,
        content: {
          summary: output.summary,
          watch: output.watch,
        },
        aiNotes: summaryText,
      });
    }

    // Each proposed action becomes its own approval item.
    for (const action of output.actions) {
      items.push({
        type: "action",
        title: action.title,
        priority: priorityScore(action.priority, action.confidence),
        aiConfidence: action.confidence,
        content: {
          action: action.title,
          reason: action.reason,
          dueHint: action.dueHint,
        },
        aiNotes: action.reason,
      });
    }

    return items;
  },

  summarize(output) {
    const actionCount = output.actions.length;
    const high = output.actions.filter((a) => a.priority === "high").length;
    return `${actionCount} action${
      actionCount === 1 ? "" : "s"
    }${high > 0 ? `, ${high} high priority` : ""}. Confidence ${(
      output.confidence * 100
    ).toFixed(0)}%`;
  },
};

/**
 * Normalize confidence to [0, 1]. Claude sometimes returns it as a
 * percentage (82) instead of a fraction (0.82), and sometimes as a
 * string. Treat >1 as percent-in-0-100 and divide by 100.
 */
function normalizeConfidence(v: unknown): number {
  let n: number;
  if (typeof v === "number") n = v;
  else if (typeof v === "string") n = Number.parseFloat(v);
  else return 0.5;
  if (!Number.isFinite(n)) return 0.5;
  if (n > 1) n = n / 100;
  return Math.max(0, Math.min(1, n));
}

function priorityScore(
  level: "high" | "medium" | "low",
  confidence: number,
): number {
  const base = level === "high" ? 80 : level === "medium" ? 50 : 20;
  // Scale slightly by confidence so low-confidence actions sink even
  // when they're marked high.
  return Math.round(base * Math.max(0.5, Math.min(1, confidence)));
}

// ── JSON extraction ───────────────────────────────────────────────────
//
// The CLI provider (Claude Code subscription path) sometimes overrides
// strict JSON instructions and emits markdown. We try three strategies
// in order before falling back to markdown parsing:
//   1. Raw JSON.parse after fence stripping
//   2. Scan for the first balanced {...} block and parse it
//   3. Null (caller falls back to markdown)
function extractJsonObject(raw: string): Record<string, unknown> | null {
  const stripped = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  // Strategy 1
  try {
    const parsed = JSON.parse(stripped);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // fall through
  }

  // Strategy 2: find the first balanced JSON object inside the text.
  const firstBrace = stripped.indexOf("{");
  if (firstBrace === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = firstBrace; i < stripped.length; i++) {
    const ch = stripped[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        const candidate = stripped.slice(firstBrace, i + 1);
        try {
          const parsed = JSON.parse(candidate);
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            return parsed as Record<string, unknown>;
          }
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function normalizeAction(a: unknown): BriefingOutput["actions"] {
  if (!a || typeof a !== "object") return [];
  const obj = a as Record<string, unknown>;
  const title = typeof obj.title === "string" ? obj.title : null;
  const reason = typeof obj.reason === "string" ? obj.reason : "";
  if (!title) return [];
  const priorityRaw = typeof obj.priority === "string" ? obj.priority.toLowerCase() : "medium";
  const priority: "high" | "medium" | "low" =
    priorityRaw === "high" || priorityRaw === "low" ? priorityRaw : "medium";
  const confidence = normalizeConfidence(obj.confidence);
  const dueHint = typeof obj.dueHint === "string" ? obj.dueHint : undefined;
  return [{ title, reason, priority, confidence, dueHint }];
}

function normalizeWatch(w: unknown): BriefingOutput["watch"] {
  if (!w || typeof w !== "object") return [];
  const obj = w as Record<string, unknown>;
  const topic = typeof obj.topic === "string" ? obj.topic : null;
  const note = typeof obj.note === "string" ? obj.note : "";
  if (!topic) return [];
  return [{ topic, note }];
}

// ── Markdown fallback ─────────────────────────────────────────────────
//
// When the CLI dodges the JSON instruction entirely, extract what we can:
//   - Bullet lines under any "summary" / "key" / "highlights" heading go
//     into summary[].
//   - Bullet lines under a "watch" / "monitor" heading go into watch[].
//   - We never fabricate actions from markdown (too lossy — operator
//     sees the raw briefing in the summary instead).
function parseMarkdownFallback(raw: string): BriefingOutput {
  const summary: string[] = [];
  const watch: BriefingOutput["watch"] = [];

  const lines = raw.split(/\r?\n/);
  let bucket: "summary" | "watch" | null = null;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const heading = line.match(/^#{1,6}\s+(.+)$/);
    if (heading) {
      const h = heading[1].toLowerCase();
      if (/(summary|brief|highlight|key|attention|today)/.test(h)) {
        bucket = "summary";
      } else if (/(watch|monitor|keep.eye)/.test(h)) {
        bucket = "watch";
      } else {
        bucket = null;
      }
      continue;
    }

    const bullet = line.match(/^(?:[-*+]|\d+\.)\s+(.+)$/);
    if (!bullet) continue;
    const text = bullet[1].replace(/\*\*(.+?)\*\*/g, "$1").trim();
    if (!text) continue;

    if (bucket === "summary") {
      summary.push(text);
    } else if (bucket === "watch") {
      watch.push({ topic: text.slice(0, 80), note: text });
    }
  }

  // If nothing parsed, at least surface the first non-empty paragraph
  // as a single summary bullet so the operator isn't looking at a blank
  // briefing.
  if (summary.length === 0) {
    const firstPara = raw
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .find((p) => p.length > 0 && !p.startsWith("```"));
    if (firstPara) {
      summary.push(firstPara.replace(/[#*_`]/g, "").slice(0, 280));
    }
  }

  return {
    summary,
    actions: [],
    watch,
    confidence: 0.4, // we parsed loosely — confidence reflects that
  };
}
