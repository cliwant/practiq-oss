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

If the knowledge base is thin and you can't make a useful briefing, return empty arrays and a low overall confidence. Do not hallucinate.`;

export const DAILY_BRIEFING_AGENT: AgentDefinition<unknown, BriefingOutput> = {
  type: "daily_briefing",
  label: "Daily client briefing",

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

    const systemPrompt = SYSTEM.replace("{{today}}", today)
      .replace("{{userRole}}", ctx.client.userRole)
      .replace("{{tone}}", tone);

    const pinned = ctx.contexts.filter((c) => c.isPinned);
    const recent = ctx.contexts.filter((c) => !c.isPinned);

    const renderCtx = (list: typeof ctx.contexts) =>
      list
        .map(
          (c) =>
            `<entry category="${c.category}" updated="${c.updatedAt.toISOString()}" pinned="${c.isPinned}">
<title>${c.title}</title>
<content>${c.content}</content>
</entry>`,
        )
        .join("\n");

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

<pinned_knowledge>
${pinned.length > 0 ? renderCtx(pinned) : "(none pinned)"}
</pinned_knowledge>

<recent_knowledge>
${recent.length > 0 ? renderCtx(recent) : "(no additional entries)"}
</recent_knowledge>

<prior_briefings_last_3>
${priorBriefings}
</prior_briefings_last_3>

Produce today's briefing for ${ctx.client.name}.`;

    return {
      systemPrompt,
      userPrompt,
      // 1500 tokens is ample for the JSON shape — the content is bounded
      // by our schema, not free-form prose.
      maxTokens: 1500,
    };
  },

  parseOutput(raw) {
    // Claude usually returns clean JSON when we tell it strictly, but it
    // sometimes wraps with ```json ... ``` fences. Strip those first.
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();
    const parsed = JSON.parse(cleaned);
    if (!parsed || typeof parsed !== "object") {
      throw new Error("Expected top-level JSON object");
    }
    const summary = Array.isArray(parsed.summary) ? parsed.summary : [];
    const actions = Array.isArray(parsed.actions) ? parsed.actions : [];
    const watch = Array.isArray(parsed.watch) ? parsed.watch : [];
    const confidence =
      typeof parsed.confidence === "number" ? parsed.confidence : 0.5;
    return { summary, actions, watch, confidence };
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

function priorityScore(
  level: "high" | "medium" | "low",
  confidence: number,
): number {
  const base = level === "high" ? 80 : level === "medium" ? 50 : 20;
  // Scale slightly by confidence so low-confidence actions sink even
  // when they're marked high.
  return Math.round(base * Math.max(0.5, Math.min(1, confidence)));
}
