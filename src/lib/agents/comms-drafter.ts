/**
 * Comms Drafter — Wave-4 P2-03.
 *
 * Once a day (17:00 local) this agent walks each active client and,
 * for any pending action item that requires the operator to nudge the
 * client (missing W-2, overdue invoice, document request follow-up),
 * drafts a tone-matched reminder email. Each draft becomes an
 * ApprovalItem of type "email_draft" — the operator reads the body,
 * clicks Approve, and the message goes out (Phase 1: send wired up
 * via Resend; for now the approval action just persists the draft).
 *
 * Why a separate agent vs. embedding in daily-briefing:
 *   - daily-briefing produces 3 categories (summary / action / watch)
 *     and is bound to morning timing. Comms drafting requires the
 *     entire pending-action queue, which is built up DURING the day.
 *   - Operator can disable comms drafting per client (preferences.
 *     commsDrafting === false) without losing the morning briefing.
 *   - Tone learning is per-client. The pattern learner already
 *     captures "this client prefers data-driven", "this owner reads
 *     short" — surface those rules in the system prompt so drafts
 *     don't all sound the same.
 *
 * Output contract: a list of email drafts, one per pending action
 * worth nudging the client about. The agent decides which actions
 * actually need an email vs. an internal note.
 */

import type { AgentDefinition } from "./runner";
import {
  loadActiveRulesForPrompt,
  renderRulesForPrompt,
} from "@/lib/pattern-learner";

interface CommsOutput {
  drafts: Array<{
    subject: string;
    body: string;
    /** Internal label so the operator knows which pending item this targets */
    targetTopic: string;
    /** Inferred recipient role: "owner" | "controller" | "team" | "unknown" */
    recipient: string;
    /** Estimated nudge urgency in days — sorter shows soonest-needed first */
    nudgeWithinDays: number;
    confidence: number;
  }>;
}

const SYSTEM = `You are the Comms Drafter inside Practiq, an AI-native workspace for accountants and fractional professionals.

Today is {{today}}. You're drafting client-facing emails for ${"{{clientName}}"} that nudge the recipient about pending items the operator (${"{{userRole}}"}) needs from them. The operator opens the Approval Queue, reviews each draft in ~30 seconds, and either approves (sends) or edits (refines + sends).

Tone calibration:
- Default: professional but warm. NOT robotic. NOT bureaucratic.
- {{tonePreference}} preferred for this client.
- Match prior approved drafts the operator has signed off on (see "Previously-applied patterns" below).
- Length target: 60-120 words for routine reminders, ≤ 200 words for first-time outreach about a new requirement.

Hard rules:
1. Never include figures or claims you can't back up from the knowledge base.
2. Never sign as the operator — leave the salutation generic so the operator can drop in their signature on send.
3. Never assume the recipient knows internal jargon. Explain technical asks plainly.
4. If you can't draft a confident email (insufficient context, unclear what the operator wants), produce zero drafts and a low overallConfidence — don't pad the queue.

Output FORMAT — strict JSON, no prose before or after:

{
  "drafts": [
    {
      "subject": string,             // ≤72 chars
      "body": string,                // 60-200 words
      "targetTopic": string,         // 1 line internal label
      "recipient": string,           // "owner" | "controller" | "team" | "unknown"
      "nudgeWithinDays": number,     // 1-30
      "confidence": number           // ≥ 0.65 to surface
    }
  ]
}

If nothing warrants an email today, return {"drafts": []}. The empty answer is the right answer most days.

CRITICAL: First character must be {, last must be }. No markdown fences.`;

export const COMMS_DRAFTER_AGENT: AgentDefinition<unknown, CommsOutput> = {
  type: "comms_drafter",
  label: "Client communication drafter",

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
        | undefined) ?? "professional, warm";

    const rules = await loadActiveRulesForPrompt({
      userId: ctx.client.userId,
      clientId: ctx.client.id,
      limit: 4,
    });
    const rulesBlock = renderRulesForPrompt(rules);

    const systemPrompt =
      SYSTEM.replace("{{today}}", today)
        .replace("{{clientName}}", ctx.client.name)
        .replace("{{userRole}}", ctx.client.userRole)
        .replace("{{tonePreference}}", tone) + rulesBlock;

    const renderEntries = (cs: typeof ctx.contexts) =>
      cs
        .filter((c) => c.category !== "private_note")
        .slice(0, 25)
        .map(
          (c) =>
            `<entry title="${c.title}" category="${c.category}">${c.content.slice(0, 800)}</entry>`,
        )
        .join("\n");

    const userPrompt = `<client>
<name>${ctx.client.name}</name>
<industry>${ctx.client.industry}</industry>
<relationship_months>${ctx.client.relationshipMonths}</relationship_months>
</client>

<knowledge_base>
${renderEntries(ctx.contexts)}
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

Draft outbound nudge emails for any pending items above that need the recipient's response. Strict JSON only.`;

    return {
      systemPrompt,
      userPrompt,
      maxTokens: 1800,
    };
  },

  parseOutput(raw) {
    const stripped = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();
    try {
      const parsed = JSON.parse(stripped) as Partial<CommsOutput> | null;
      if (!parsed || typeof parsed !== "object") throw new Error("not object");
      const drafts = Array.isArray(parsed.drafts)
        ? parsed.drafts
            .filter((d): d is CommsOutput["drafts"][number] => {
              if (!d || typeof d !== "object") return false;
              const dx = d as Record<string, unknown>;
              return (
                typeof dx.subject === "string" &&
                typeof dx.body === "string" &&
                typeof dx.targetTopic === "string" &&
                typeof dx.recipient === "string" &&
                typeof dx.nudgeWithinDays === "number" &&
                typeof dx.confidence === "number"
              );
            })
            .filter((d) => d.confidence >= 0.65)
        : [];
      return { drafts };
    } catch {
      return { drafts: [] };
    }
  },

  buildApprovalItems(output, ctx) {
    return output.drafts.map((d) => ({
      type: "email_draft",
      title: `${ctx.client.name}: ${d.subject}`,
      // Sooner-needed nudges sort higher.
      priority: Math.round(80 - Math.min(60, d.nudgeWithinDays * 2)),
      aiConfidence: d.confidence,
      content: {
        subject: d.subject,
        body: d.body,
        targetTopic: d.targetTopic,
        recipient: d.recipient,
        nudgeWithinDays: d.nudgeWithinDays,
      },
      aiNotes: `Drafted reminder about ${d.targetTopic} — recipient: ${d.recipient}, nudge within ${d.nudgeWithinDays}d.`,
    }));
  },

  summarize(output) {
    if (output.drafts.length === 0) return "No drafts today";
    const urgent = output.drafts.filter((d) => d.nudgeWithinDays <= 3).length;
    return `${output.drafts.length} email draft${output.drafts.length === 1 ? "" : "s"}${urgent > 0 ? ` (${urgent} urgent)` : ""}`;
  },
};
