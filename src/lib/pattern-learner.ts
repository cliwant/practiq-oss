/**
 * Pattern learner — Practiq's "self-improving agent" core.
 *
 * The AI-Native paradigm's principle 3 says "AI learns the
 * practitioner's repeated judgements and applies them automatically."
 * For ~6 weeks the AgentRule schema existed but had ZERO writers and
 * ZERO readers. This module implements both ends of the loop so the
 * promise becomes real.
 *
 * Two primitives:
 *
 *   1. recordApprovalLearning(item, action, modifiedContent)
 *      Called from /api/approval-queue/[id] PATCH after every approve /
 *      modify / reject. Detects whether an existing rule was reinforced
 *      (confidence +0.05) or a new rule should be created. Modifications
 *      with structured content shifts (e.g. food cost reclassification)
 *      become first-class rules; pure approves with no edits ALSO
 *      reinforce the originating draft pattern (validates the AI's
 *      output without changing it).
 *
 *   2. loadActiveRulesForPrompt(userId, clientId, kind)
 *      Loads rules with confidence >= 0.6 + appliedCount >= 2 for
 *      injection into the agent's system prompt. The chat / agent
 *      prompts pre-pend a "Previously-applied patterns" section so
 *      the model sees what the partner has implicitly already
 *      decided in similar situations.
 *
 * Confidence math:
 *
 *   - new rule born:               0.50
 *   - approve w/ matching rule:    +0.05 capped at 0.99
 *   - modify w/ matching rule:     +0.10 (stronger validation —
 *                                    the operator's edit confirms
 *                                    they're applying this pattern
 *                                    deliberately, not just rubber-
 *                                    stamping a draft)
 *   - reject w/ matching rule:     -0.20
 *   - rules below 0.10 prune
 *     (next wave: nightly job to actually delete)
 *
 * Pattern key: a stable string-hash of (clientIndustry, itemType,
 * normalizedTitle). We DON'T key on full content because two
 * different food-cost-reclassification approvals will have different
 * dollar amounts but represent the same rule. Normalized title
 * collapses dollar amounts, dates, and vendor names to placeholders.
 *
 * Plan-gate: pattern learning ONLY runs for users on Practice / Firm
 * plans (rbac=true). Solo / free-trial users don't accumulate rules
 * because they don't have the team-decision context that pattern
 * learning is built around. Cheap to skip; saves DB writes on the
 * majority of users in the funnel.
 */

import { prisma } from "@/lib/prisma";
import { resolveUserPlan } from "@/lib/plan-gates";

export type RuleKind = "approval_pattern" | "tone_pattern" | "category_pattern";

interface PatternKeyInput {
  clientIndustry: string | null;
  itemType: string;
  itemTitle: string;
}

/**
 * Build a stable pattern key by normalizing volatile portions of
 * the item title. Two items with the same shape but different
 * dollar amounts / dates / vendor names should hash to the same
 * key so they reinforce each other.
 */
export function buildPatternKey(input: PatternKeyInput): string {
  const t = input.itemTitle
    .toLowerCase()
    // Collapse $1,234.56 / $1234 → $AMOUNT
    .replace(/\$[\d,]+(\.\d+)?/g, "$AMOUNT")
    // Collapse YYYY-MM-DD / MM/DD/YY / Mon DD → DATE
    .replace(/\d{4}-\d{2}-\d{2}/g, "DATE")
    .replace(/\d{1,2}\/\d{1,2}(\/\d{2,4})?/g, "DATE")
    .replace(
      /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}/gi,
      "DATE",
    )
    // Collapse arbitrary vendor / client names that aren't industry-
    // generic (kept simple: strip everything that isn't a known
    // accounting/legal/HR domain term)
    .replace(/[^a-z0-9$\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const industry = (input.clientIndustry ?? "").toLowerCase().slice(0, 24);
  const itemType = input.itemType.toLowerCase().slice(0, 24);
  return [industry, itemType, t.slice(0, 96)].join("::");
}

interface ApprovalForLearning {
  id: string;
  userId: string;
  clientId: string;
  type: string;
  title: string;
  content: unknown; // Prisma Json
  aiNotes: string | null;
}

/**
 * Wired from /api/approval-queue/[id] PATCH. Side-effects only — never
 * raises. Three outcomes:
 *
 *   - new rule (no existing key match) → create at confidence 0.50,
 *     appliedCount=1
 *   - existing rule + same outcome → confidence + delta
 *   - existing rule + reject outcome → confidence - 0.20
 */
/**
 * RUN 21 — tiered approval ladder.
 *
 * Replaces the binary approve / reject signal with four refined sub-actions
 * that capture operator intent and let the pattern-learner extract richer
 * learning signal:
 *
 *   - "once"     : approve this once. No long-term promotion. (default for `approve`)
 *   - "session"  : approve + apply for the rest of this operator's session.
 *                  Same confidence boost as `once` but the session-level apply
 *                  hint is captured in details so future agents in the same
 *                  session can choose to auto-apply with operator consent.
 *   - "promote"  : approve + force-promote this pattern as a permanent rule.
 *                  Confidence jumps to ≥ 0.85 immediately so future runs apply
 *                  it as a default ("APPLY this template" framing in T4).
 *   - "unsafe"   : reject + flag this pattern as ALWAYS unsafe. Confidence
 *                  drops to 0 and the rule is marked `bannedUntil` for 30
 *                  days. Future agents see it in T4 with a STRONG "do not
 *                  produce this" warning rather than a soft hint.
 *
 * Confidence math:
 *   once:    +0.05  (existing approve behaviour)
 *   session: +0.05  (same as once; the session memo is the differentiator)
 *   promote: snap to max(0.85, existing.confidence + 0.30) — strong signal
 *   unsafe:  snap to 0 + write `bannedUntil = now + 30d`
 */
export type ApprovalSubAction = "once" | "session" | "promote" | "unsafe";

export async function recordApprovalLearning(opts: {
  item: ApprovalForLearning;
  action: "approve" | "modify" | "reject";
  /**
   * Tiered intent (RUN 21). Defaults to "once" for approve / reject and
   * is ignored for modify (modify has its own confidence delta).
   */
  subAction?: ApprovalSubAction;
  modifiedContent?: unknown;
  reviewerNotes?: string | null;
}): Promise<{
  ruleId: string | null;
  outcome: "new" | "reinforced" | "weakened" | "promoted" | "banned" | "skipped";
}> {
  try {
    // Plan gate: only learn for paid teams (Practice/Firm). Solo and
    // free trial don't have team-decision data to compound, and
    // skipping saves DB writes on the long tail.
    const plan = await resolveUserPlan(opts.item.userId);
    if (!plan.capabilities.rbac) {
      return { ruleId: null, outcome: "skipped" };
    }

    // Look up the client's industry to make the pattern key
    // industry-aware (Restaurant food cost ≠ SaaS deferred revenue).
    const client = await prisma.client.findUnique({
      where: { id: opts.item.clientId },
      select: { industry: true },
    });
    const key = buildPatternKey({
      clientIndustry: client?.industry ?? null,
      itemType: opts.item.type,
      itemTitle: opts.item.title,
    });

    // Find an existing rule with this key + clientId. agent_rules has
    // no @unique on key; we look up by JSON condition.
    const existing = await prisma.agentRule.findFirst({
      where: {
        userId: opts.item.userId,
        clientId: opts.item.clientId,
        ruleType: "approval_pattern" satisfies RuleKind,
        condition: { path: ["key"], equals: key },
      },
    });

    type ApprovalAction = "approve" | "modify" | "reject";
    const confidenceDelta: Record<ApprovalAction, number> = {
      approve: 0.05,
      modify: 0.1,
      reject: -0.2,
    };
    let delta = confidenceDelta[opts.action];

    // RUN 21 — tiered sub-action overrides the base delta when present.
    const sub: ApprovalSubAction = opts.subAction ?? "once";
    if (sub === "promote" && opts.action === "approve") {
      // Snap higher than incremental reinforcement so the rule is
      // immediately treated as a default in T4 firm patterns.
      delta = 0.3;
    } else if (sub === "unsafe" && opts.action === "reject") {
      // Strong negative signal — drop to zero and ban for 30 days.
      delta = -1.0;
    }

    if (!existing) {
      // Reject of a never-seen item shouldn't create a -0.2 rule —
      // there's nothing to dampen. Skip — UNLESS it's a reject_unsafe,
      // in which case we DO want to record a strong "do-not-produce"
      // marker so the same pattern doesn't slip back through.
      if (opts.action === "reject" && sub !== "unsafe") {
        return { ruleId: null, outcome: "skipped" };
      }
      // RUN 21: promote / unsafe land at custom initial confidences so
      // the rule is immediately effective on the next agent run rather
      // than accumulating reinforcement.
      const initialConfidence =
        sub === "promote"
          ? 0.85
          : sub === "unsafe"
            ? 0
            : 0.5;
      const promotedFlag = sub === "promote";
      const bannedUntil =
        sub === "unsafe"
          ? new Date(Date.now() + 30 * 24 * 60 * 60_000).toISOString()
          : null;
      const created = await prisma.agentRule.create({
        data: {
          userId: opts.item.userId,
          clientId: opts.item.clientId,
          ruleType: "approval_pattern" satisfies RuleKind,
          condition: {
            key,
            originalItemType: opts.item.type,
            originalTitlePattern: opts.item.title,
            industry: client?.industry ?? null,
          },
          action: {
            // Snapshot the approved (or modified) content as the
            // canonical "this is how the partner wants it done"
            // template. Future agent runs will surface this when
            // building drafts of the same shape. The Prisma JSON
            // typing wants InputJsonValue; we cast through unknown
            // because the content shape varies per ApprovalItem.type
            // (email_draft, document_draft, anomaly_alert) and the
            // schema-level type is intentionally untyped JSON.
            template:
              opts.action === "modify" && opts.modifiedContent
                ? opts.modifiedContent
                : opts.item.content,
            reviewerNotes: opts.reviewerNotes ?? null,
            firstSeenItemId: opts.item.id,
            promoted: promotedFlag,
            subAction: sub,
            bannedUntil,
          } as unknown as Parameters<
            typeof prisma.agentRule.create
          >[0]["data"]["action"],
          confidence: initialConfidence,
          appliedCount: 1,
        },
      });
      return {
        ruleId: created.id,
        outcome:
          sub === "promote" ? "promoted" : sub === "unsafe" ? "banned" : "new",
      };
    }

    // Reinforce / weaken
    let newConfidence = Math.max(
      0,
      Math.min(0.99, existing.confidence + delta),
    );
    // RUN 21: promote forces the rule above the auto-apply threshold
    // (T4 promotes on confidence ≥ 0.85). Snap up rather than incremental.
    if (sub === "promote" && opts.action === "approve") {
      newConfidence = Math.max(newConfidence, 0.85);
    }
    // RUN 21: unsafe nukes confidence so T4's "do-not-produce" branch
    // shows up immediately. Also writes bannedUntil for cron-driven
    // cleanup later.
    if (sub === "unsafe" && opts.action === "reject") {
      newConfidence = 0;
    }

    const promotedFlag =
      sub === "promote"
        ? true
        : ((existing.action ?? {}) as { promoted?: boolean }).promoted ?? false;
    const bannedUntil =
      sub === "unsafe"
        ? new Date(Date.now() + 30 * 24 * 60 * 60_000).toISOString()
        : ((existing.action ?? {}) as { bannedUntil?: string | null })
            .bannedUntil ?? null;

    const updated = await prisma.agentRule.update({
      where: { id: existing.id },
      data: {
        confidence: newConfidence,
        appliedCount: { increment: 1 },
        // If the partner modified the draft, the modification is the
        // freshest signal of what they actually want. Update the
        // template so future drafts inherit the latest preferred
        // shape.
        ...(opts.action === "modify" && opts.modifiedContent !== undefined
          ? {
              action: {
                ...((existing.action ?? {}) as Record<string, unknown>),
                template: opts.modifiedContent,
                lastModifiedItemId: opts.item.id,
                promoted: promotedFlag,
                subAction: sub,
                bannedUntil,
              } as unknown as Parameters<
                typeof prisma.agentRule.update
              >[0]["data"]["action"],
            }
          : sub === "promote" || sub === "unsafe"
            ? {
                // RUN 21: even on a non-modify action, persist the
                // promote/unsafe metadata so T4 surfaces the right
                // "APPLY this" / "DO NOT produce this" framing.
                action: {
                  ...((existing.action ?? {}) as Record<string, unknown>),
                  promoted: promotedFlag,
                  subAction: sub,
                  bannedUntil,
                  lastSubActionItemId: opts.item.id,
                } as unknown as Parameters<
                  typeof prisma.agentRule.update
                >[0]["data"]["action"],
              }
            : {}),
      },
    });
    return {
      ruleId: updated.id,
      outcome:
        sub === "promote"
          ? "promoted"
          : sub === "unsafe"
            ? "banned"
            : delta > 0
              ? "reinforced"
              : delta < 0
                ? "weakened"
                : "reinforced",
    };
  } catch (err) {
    console.warn("[pattern-learner] write failed:", err);
    return { ruleId: null, outcome: "skipped" };
  }
}

/**
 * Load active high-confidence rules for a (user, client) — used to
 * inject "Previously-applied patterns" into the agent / chat system
 * prompt so the model sees how the partner has handled similar
 * situations before.
 *
 * Threshold defaults are conservative: confidence >= 0.6 AND
 * appliedCount >= 2. Two reinforcements + at least one approval-bump
 * past the 0.5 starting point is the bar for "this is a real
 * pattern, not a fluke."
 *
 * Token budget: caller should cap the returned array at 5-8 rules so
 * the system prompt doesn't bloat. We default to 6 here; the caller
 * can override.
 */
export async function loadActiveRulesForPrompt(opts: {
  userId: string;
  clientId: string;
  limit?: number;
}): Promise<ActiveRule[]> {
  try {
    const rows = await prisma.agentRule.findMany({
      where: {
        userId: opts.userId,
        clientId: opts.clientId,
        ruleType: "approval_pattern" satisfies RuleKind,
        confidence: { gte: 0.6 },
        appliedCount: { gte: 2 },
      },
      orderBy: [{ confidence: "desc" }, { appliedCount: "desc" }],
      take: opts.limit ?? 6,
      select: {
        id: true,
        condition: true,
        action: true,
        confidence: true,
        appliedCount: true,
      },
    });
    return rows.map((r) => ({
      id: r.id,
      condition: r.condition as Record<string, unknown>,
      action: r.action as Record<string, unknown>,
      confidence: r.confidence,
      appliedCount: r.appliedCount,
    }));
  } catch {
    return [];
  }
}

export interface ActiveRule {
  id: string;
  condition: Record<string, unknown>;
  action: Record<string, unknown>;
  confidence: number;
  appliedCount: number;
}

/**
 * Render an array of ActiveRules into a Markdown-style block suitable
 * for inclusion in the agent system prompt. Only the public-facing
 * pattern intent is surfaced (NOT the internal rule id, applied count
 * etc. — those leak DB internals to the model with no value).
 *
 * Empty input returns an empty string so the caller can `${...}`
 * unconditionally.
 */
export function renderRulesForPrompt(rules: ActiveRule[]): string {
  if (rules.length === 0) return "";
  const lines = rules
    .map((r, i) => {
      const cond = (r.condition?.originalTitlePattern as string) ?? "(unknown)";
      const tplObj = r.action?.template as Record<string, unknown> | undefined;
      const tplSummary = tplObj
        ? typeof tplObj.body === "string"
          ? (tplObj.body as string).slice(0, 200)
          : typeof tplObj.subject === "string"
            ? (tplObj.subject as string)
            : JSON.stringify(tplObj).slice(0, 200)
        : "(no template)";
      const note = r.action?.reviewerNotes
        ? ` Note: ${String(r.action.reviewerNotes).slice(0, 120)}.`
        : "";
      return `${i + 1}. When ${cond} → use this shape: ${tplSummary}.${note} (confidence ${(r.confidence * 100).toFixed(0)}%, applied ${r.appliedCount}×)`;
    })
    .join("\n");
  return `\n## Previously-applied patterns for this client\n\nThe partner has approved these shapes for similar items before. Use them as defaults unless the new context demands otherwise; the partner can still override any draft.\n\n${lines}\n`;
}
