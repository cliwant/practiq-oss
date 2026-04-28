/**
 * T4 — Firm Patterns (promoted AgentRule entries from pattern learner).
 *
 * Bridges the existing pattern-learner write-side (RUN 2 P2-04) into
 * every agent's prompt — not just daily-briefing. Today only daily-
 * briefing reads `loadActiveRulesForPrompt`; anomaly-detector,
 * comms-drafter, runner-managed agents, and chat all see a void
 * where the operator's repeated decisions should be.
 *
 * This tier is the difference between "AI repeats Jennifer's
 * food-cost reclassification suggestion every time" and "AI applies
 * Jennifer's pattern automatically and only flags the deviations."
 * It's the third AI-Native principle (Pattern Learning & Auto-Apply)
 * showing up as load-time prompt content rather than promise.
 *
 * **Cap**: 250 tokens by default. We pull at most 4 active rules so
 * the budget always fits.
 *
 * **Promoted vs candidate**: P2-05 (skill-generator) tags rules as
 * `promoted: true` in their action JSON when applied≥5 + confidence
 * ≥0.85 + recent verdict avg ≥0.85. We surface promoted rules with
 * stronger language ("APPLY this template") so the model treats
 * them as defaults rather than hints. Candidate rules get the
 * existing softer "consider this pattern" framing.
 */

import {
  loadActiveRulesForPrompt,
  renderRulesForPrompt,
} from "@/lib/pattern-learner";
import { approxTokenCount, truncateToTokenCap } from "../token-counter";
import type { TierBlock } from "./profile";

export async function loadT4FirmPatterns(opts: {
  userId: string;
  clientId: string;
  cap: number;
  limit?: number;
}): Promise<TierBlock> {
  const rules = await loadActiveRulesForPrompt({
    userId: opts.userId,
    clientId: opts.clientId,
    limit: opts.limit ?? 4,
  }).catch(() => []);

  if (rules.length === 0) {
    return {
      tier: "T4",
      body: "",
      tokensApprox: 0,
      summary: "no active patterns",
      hadData: false,
    };
  }

  // renderRulesForPrompt produces its own H2 heading. We replace it
  // with the T4-namespaced one so the composer's Markdown is
  // consistent. Promoted rules get a leading "APPLY:" label so the
  // model treats them as defaults; candidates stay as "Consider:".
  const promoted = rules.filter((r) => r.action?.promoted === true);
  const candidates = rules.filter((r) => r.action?.promoted !== true);

  const sections: string[] = [];
  // Strip the H2 header that renderRulesForPrompt embeds so we can
  // wrap both rule sets under our own T4 H2. The helper's header is
  // always the first non-empty line and is followed by the
  // descriptive paragraph and a blank line.
  const stripHeader = (rendered: string): string => {
    const lines = rendered.split("\n");
    let i = 0;
    // Skip leading blank lines.
    while (i < lines.length && lines[i].trim() === "") i++;
    // Skip the first H2 line.
    if (i < lines.length && lines[i].startsWith("## ")) i++;
    // Skip the descriptive paragraph + the blank line that follows it.
    while (i < lines.length && lines[i].trim() === "") i++;
    if (i < lines.length && !lines[i].startsWith("- ") && !/^\d+\./.test(lines[i])) {
      i++; // paragraph
    }
    while (i < lines.length && lines[i].trim() === "") i++;
    return lines.slice(i).join("\n").trim();
  };
  if (promoted.length > 0) {
    sections.push(`### APPLY (promoted)\n${stripHeader(renderRulesForPrompt(promoted))}`);
  }
  if (candidates.length > 0) {
    sections.push(`### Consider (candidate)\n${stripHeader(renderRulesForPrompt(candidates))}`);
  }

  const raw = `## T4 Firm patterns (operator's repeated decisions)\n\n${sections.join("\n\n")}\n`;
  const body = truncateToTokenCap(raw, opts.cap);
  return {
    tier: "T4",
    body,
    tokensApprox: approxTokenCount(body),
    summary: `promoted=${promoted.length}, candidate=${candidates.length}`,
    hadData: true,
  };
}
