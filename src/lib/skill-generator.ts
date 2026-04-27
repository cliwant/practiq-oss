/**
 * Skill Generator — Wave-4 P2-05.
 *
 * The pattern learner already records AgentRule rows whenever the
 * operator approves / modifies / rejects an ApprovalItem. Once the same
 * rule has been confirmed enough times AND its confidence is high
 * enough, it should "graduate" from a soft hint into a first-class
 * Skill: a reusable template that future agents apply automatically
 * without operator review.
 *
 * Rather than introduce a new Skill table (and the Sub-agent that's
 * concurrently building the temporal-knowledge-graph schema), Skill
 * Generator stays inside the existing AgentRule shape and adds a
 * `promoted: true` / `promotedAt` flag inside the action JSON. That
 * way:
 *
 *   - Daily-briefing's `loadActiveRulesForPrompt` can filter for
 *     promoted rules and inject them into the system prompt with
 *     stronger language ("APPLY this template" rather than "consider
 *     this pattern").
 *   - The /app/settings/learned-patterns surface (Phase 1) renders a
 *     Promoted vs Candidate column.
 *   - Demotion is just a flag flip — no row deletes if the operator
 *     loses confidence in a skill.
 *
 * Promotion threshold (Hermes / Claude Code skill literature):
 *   - appliedCount >= 5
 *   - confidence >= 0.85
 *   - last 3 outcomes (verdictWeight from AuditLog) average >= 0.85
 *
 * Run as a nightly job — see /api/cron/skill-generator route.
 */

import { prisma } from "@/lib/prisma";

export interface PromotionDecision {
  ruleId: string;
  promoted: boolean;
  reason: string;
}

const PROMOTE_MIN_APPLIED = 5;
const PROMOTE_MIN_CONFIDENCE = 0.85;
const PROMOTE_RECENT_VERDICT_AVG = 0.85;

/**
 * Walk every active rule and decide whether it has earned promotion
 * (or whether a previously-promoted rule should be demoted). Returns
 * the list of decisions made — caller logs the count, but the rule
 * row is mutated in place so subsequent prompt builders see the
 * change immediately.
 */
export async function runSkillGeneration(opts: {
  userId?: string;
  dryRun?: boolean;
}): Promise<PromotionDecision[]> {
  const where = opts.userId ? { userId: opts.userId, enabled: true } : { enabled: true };
  const rules = await prisma.agentRule.findMany({
    where,
    select: {
      id: true,
      userId: true,
      clientId: true,
      ruleType: true,
      action: true,
      confidence: true,
      appliedCount: true,
    },
  });

  const decisions: PromotionDecision[] = [];

  for (const rule of rules) {
    const action = (rule.action ?? {}) as Record<string, unknown>;
    const wasPromoted = action.promoted === true;
    const recentVerdictAvg = await getRecentVerdictAvg(rule.userId, rule.clientId);
    const shouldPromote =
      rule.appliedCount >= PROMOTE_MIN_APPLIED &&
      rule.confidence >= PROMOTE_MIN_CONFIDENCE &&
      recentVerdictAvg >= PROMOTE_RECENT_VERDICT_AVG;

    if (shouldPromote && !wasPromoted) {
      const reason = `applied ${rule.appliedCount}× / confidence ${(rule.confidence * 100).toFixed(0)}% / recent verdict avg ${(recentVerdictAvg * 100).toFixed(0)}%`;
      decisions.push({ ruleId: rule.id, promoted: true, reason });
      if (!opts.dryRun) {
        await prisma.agentRule.update({
          where: { id: rule.id },
          data: {
            action: {
              ...action,
              promoted: true,
              promotedAt: new Date().toISOString(),
              promotedReason: reason,
            } as object,
          },
        });
      }
    } else if (!shouldPromote && wasPromoted) {
      const reason = `demote: applied ${rule.appliedCount}× / confidence ${(rule.confidence * 100).toFixed(0)}% / recent verdict avg ${(recentVerdictAvg * 100).toFixed(0)}%`;
      decisions.push({ ruleId: rule.id, promoted: false, reason });
      if (!opts.dryRun) {
        await prisma.agentRule.update({
          where: { id: rule.id },
          data: {
            action: {
              ...action,
              promoted: false,
              demotedAt: new Date().toISOString(),
              promotedReason: reason,
            } as object,
          },
        });
      }
    }
  }

  return decisions;
}

/**
 * Average verdictWeight (approve=1, modify=0.5, reject=0) over the
 * last 3 approval decisions for this scope. Returns 0 when fewer than
 * 3 verdicts exist (don't promote on thin evidence).
 */
async function getRecentVerdictAvg(
  userId: string,
  clientId: string | null,
): Promise<number> {
  const where: Parameters<typeof prisma.auditLog.findMany>[0] = {
    where: {
      userId,
      ...(clientId ? { clientId } : {}),
      action: { in: ["approval_approve", "approval_modify", "approval_reject"] },
    },
    orderBy: { createdAt: "desc" },
    take: 3,
    select: { details: true },
  };
  const recent = await prisma.auditLog.findMany(where);
  if (recent.length < 3) return 0;
  let sum = 0;
  let n = 0;
  for (const r of recent) {
    const d = r.details as { verdictWeight?: number } | null;
    if (d && typeof d.verdictWeight === "number") {
      sum += d.verdictWeight;
      n += 1;
    }
  }
  return n > 0 ? sum / n : 0;
}
