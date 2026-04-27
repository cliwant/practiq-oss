/**
 * Anomaly Detector — Wave-4 P2-02.
 *
 * Reads each active client's ClientContext + recent ConversationMessages,
 * asks Claude to flag transactions / claims / facts that look out of
 * pattern, and writes one ApprovalItem of type "anomaly_alert" per
 * confirmed signal. Runs on a 2h cadence via the existing agent runner
 * scheduler.
 *
 * Design choices:
 *
 *   - **No QuickBooks dependency.** P2-07 will add a real QB scanner
 *     later; for the lovable-mark milestone we stay with what's in the
 *     DB so users see the agent doing real work even before they
 *     connect a bank feed. The detector reasons over text — context
 *     entries, conversation messages, prior approval history.
 *   - **Conservative outputs.** confidence < 0.65 → no ApprovalItem
 *     written. Operator's queue must NOT fill with low-signal noise.
 *   - **Severity classification matches DESIGN.md badges.** high /
 *     medium / low map to priority scores 80 / 50 / 25 so the queue
 *     sorts naturally.
 *   - **Pattern learner integration.** Same loadActiveRulesForPrompt
 *     pull as daily-briefing — anomalies tagged similar to a previously-
 *     dismissed one get downweighted ("operator already saw this
 *     pattern; don't surface again").
 *
 * Output contract for parseOutput is strict JSON with the same JSON-
 * stripping resilience as daily-briefing.ts (the CLI provider can
 * sometimes wrap output in markdown).
 */

import type { AgentDefinition } from "./runner";
import {
  loadActiveRulesForPrompt,
  renderRulesForPrompt,
} from "@/lib/pattern-learner";

interface AnomalyOutput {
  anomalies: Array<{
    title: string;
    description: string;
    severity: "high" | "medium" | "low";
    /** Reference to the source: "context:<title>" or "message:<id>" */
    sourceRef?: string;
    /** Optional next action the operator should take */
    suggestedAction?: string;
    confidence: number;
  }>;
  overallConfidence: number;
}

const SYSTEM = `You are the Anomaly Detector inside Practiq, an AI-native workspace for accountants and fractional professionals managing many clients at once.

Today is {{today}}. You're scanning ONE client for transactions, claims, or facts that look out of pattern compared to the rest of the knowledge base. Your operator triages your output ~90 seconds per anomaly.

Priorities:
1. Surface only **concrete, evidence-backed** anomalies. Reference the specific context entry or conversation message that triggered the signal in sourceRef.
2. Severity calibration: "high" = potential financial / regulatory risk; "medium" = pattern break worth a question; "low" = curiosity. Most days you should produce 0-2 anomalies for a given client. Most clients on most days have nothing anomalous.
3. Respect the operator's role ({{userRole}}). Don't claim regulatory positions; flag them for human judgment.
4. Confidence < 0.65 → don't include the anomaly at all. The operator's queue must not fill with low-signal noise.

Output FORMAT — strict JSON, no prose before or after:

{
  "anomalies": [
    {
      "title": string,           // imperative summary, ≤80 chars
      "description": string,     // 1-3 sentences pointing to evidence
      "severity": "high" | "medium" | "low",
      "sourceRef": string?,      // "context:<title>" or "message:<id>"
      "suggestedAction": string?,// 1 sentence the operator can act on
      "confidence": number       // 0.0-1.0, ≥ 0.65 to surface
    }
  ],
  "overallConfidence": number    // your overall confidence in today's scan
}

If no anomalies meet the bar, return {"anomalies":[], "overallConfidence":<0.0-1.0>}. Empty is the correct answer most days.

CRITICAL: Your ENTIRE response must be valid JSON conforming to the schema above. Do NOT wrap in markdown code fences. The first character must be { and the last must be }.`;

export const ANOMALY_DETECTOR_AGENT: AgentDefinition<unknown, AnomalyOutput> = {
  type: "anomaly_detector",
  label: "Anomaly detector",

  async buildPrompt(ctx) {
    const today = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const rules = await loadActiveRulesForPrompt({
      userId: ctx.client.userId,
      clientId: ctx.client.id,
      limit: 4,
    });
    const rulesBlock = renderRulesForPrompt(rules);

    const systemPrompt =
      SYSTEM.replace("{{today}}", today).replace(
        "{{userRole}}",
        ctx.client.userRole,
      ) + rulesBlock;

    const renderEntries = (cs: typeof ctx.contexts) =>
      cs
        .map(
          (c) =>
            `<entry title="${c.title}" category="${c.category}" updated="${c.updatedAt.toISOString()}">${c.content}</entry>`,
        )
        .join("\n");

    const userPrompt = `<client>
<name>${ctx.client.name}</name>
<industry>${ctx.client.industry}</industry>
<relationship_months>${ctx.client.relationshipMonths}</relationship_months>
</client>

<knowledge_base>
${renderEntries(ctx.contexts.slice(0, 30))}
</knowledge_base>

<recent_agent_runs>
${
  ctx.recentTasks
    .filter((t) => t.summary)
    .slice(0, 5)
    .map((t) => `- [${t.agentType}] ${t.summary}`)
    .join("\n") || "(none)"
}
</recent_agent_runs>

Scan ${ctx.client.name}'s knowledge base for anomalies. Return strict JSON.`;

    return {
      systemPrompt,
      userPrompt,
      maxTokens: 1200,
    };
  },

  parseOutput(raw) {
    const stripped = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();
    try {
      const parsed = JSON.parse(stripped) as Partial<AnomalyOutput> | null;
      if (!parsed || typeof parsed !== "object") throw new Error("not object");
      const anomalies = Array.isArray(parsed.anomalies)
        ? parsed.anomalies
            .filter((a): a is AnomalyOutput["anomalies"][number] => {
              if (!a || typeof a !== "object") return false;
              const ax = a as Record<string, unknown>;
              return (
                typeof ax.title === "string" &&
                typeof ax.description === "string" &&
                (ax.severity === "high" ||
                  ax.severity === "medium" ||
                  ax.severity === "low") &&
                typeof ax.confidence === "number"
              );
            })
            .filter((a) => a.confidence >= 0.65)
        : [];
      const overallConfidence =
        typeof parsed.overallConfidence === "number"
          ? Math.max(0, Math.min(1, parsed.overallConfidence))
          : 0.5;
      return { anomalies, overallConfidence };
    } catch {
      return { anomalies: [], overallConfidence: 0.3 };
    }
  },

  buildApprovalItems(output, ctx) {
    return output.anomalies.map((a) => ({
      type: "anomaly_alert",
      title: `${ctx.client.name}: ${a.title}`,
      priority: a.severity === "high" ? 80 : a.severity === "medium" ? 50 : 25,
      aiConfidence: a.confidence,
      content: {
        description: a.description,
        severity: a.severity,
        sourceRef: a.sourceRef,
        suggestedAction: a.suggestedAction,
      },
      aiNotes: a.suggestedAction ?? a.description,
    }));
  },

  summarize(output) {
    const high = output.anomalies.filter((a) => a.severity === "high").length;
    const total = output.anomalies.length;
    if (total === 0) return "No anomalies detected";
    return `${total} anomal${total === 1 ? "y" : "ies"}${
      high > 0 ? ` (${high} high)` : ""
    }`;
  },
};
