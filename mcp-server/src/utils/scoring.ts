/**
 * Client health scoring algorithm.
 *
 * Four dimensions, each scored 0-100:
 *   1. Interaction recency — when was the last touch?
 *   2. Deadline status — any overdue deadlines?
 *   3. Engagement depth — how many interactions total?
 *   4. Risk signals — any negative keywords in notes/interactions?
 *
 * Final score = weighted average. Band thresholds:
 *   80-100 = Healthy
 *   60-79  = Watch
 *   40-59  = At Risk
 *   0-39   = Critical
 */

import type {
  Client,
  Deadline,
  HealthBand,
  HealthDimensions,
  HealthResult,
  Interaction,
} from "../store/types.js";
import { daysSince } from "./date-utils.js";

const RISK_KEYWORDS = [
  "unhappy",
  "frustrated",
  "cancel",
  "terminate",
  "complaint",
  "dispute",
  "overdue",
  "late payment",
  "at risk",
  "churn",
  "dissatisfied",
  "escalat",
  "problem",
  "issue",
  "concern",
];

function scoreInteractionRecency(lastInteraction: string | undefined): number {
  if (!lastInteraction) return 0;
  const days = daysSince(lastInteraction);
  if (days <= 7) return 100;
  if (days <= 14) return 85;
  if (days <= 30) return 70;
  if (days <= 60) return 50;
  if (days <= 90) return 30;
  return 10;
}

function scoreDeadlineStatus(deadlines: Deadline[]): number {
  if (deadlines.length === 0) return 80; // no deadlines = neutral-good
  const activeDeadlines = deadlines.filter((d) => !d.completed);
  if (activeDeadlines.length === 0) return 100;

  const overdueCount = activeDeadlines.filter(
    (d) => new Date(d.dueDate).getTime() < Date.now(),
  ).length;

  if (overdueCount === 0) return 90;
  const overdueRatio = overdueCount / activeDeadlines.length;
  if (overdueRatio <= 0.25) return 60;
  if (overdueRatio <= 0.5) return 40;
  return 20;
}

function scoreEngagementDepth(interactions: Interaction[]): number {
  const count = interactions.length;
  if (count >= 20) return 100;
  if (count >= 10) return 80;
  if (count >= 5) return 60;
  if (count >= 2) return 40;
  if (count >= 1) return 25;
  return 10;
}

function scoreRiskSignals(
  client: Client,
  interactions: Interaction[],
): number {
  let riskCount = 0;
  const searchText = [
    client.notes,
    ...interactions.map((i) => i.summary),
    ...interactions.flatMap((i) => i.actionItems),
  ]
    .join(" ")
    .toLowerCase();

  for (const keyword of RISK_KEYWORDS) {
    if (searchText.includes(keyword)) {
      riskCount++;
    }
  }

  if (riskCount === 0) return 100;
  if (riskCount <= 1) return 75;
  if (riskCount <= 3) return 50;
  if (riskCount <= 5) return 30;
  return 10;
}

function getBand(score: number): HealthBand {
  if (score >= 80) return "Healthy";
  if (score >= 60) return "Watch";
  if (score >= 40) return "At Risk";
  return "Critical";
}

function buildSummary(dimensions: HealthDimensions, band: HealthBand): string {
  const parts: string[] = [];

  if (dimensions.interactionRecency < 50) {
    parts.push("No recent interaction — consider reaching out");
  }
  if (dimensions.deadlineStatus < 50) {
    parts.push("Overdue deadlines need attention");
  }
  if (dimensions.engagementDepth < 40) {
    parts.push("Low engagement depth — relationship may need nurturing");
  }
  if (dimensions.riskSignals < 50) {
    parts.push("Risk signals detected in notes or interactions");
  }

  if (parts.length === 0) {
    if (band === "Healthy") return "Client is in good standing across all dimensions.";
    return "Client status is acceptable but monitor for changes.";
  }

  return parts.join(". ") + ".";
}

export function computeHealth(
  client: Client,
  interactions: Interaction[],
  deadlines: Deadline[],
): HealthResult {
  const dimensions: HealthDimensions = {
    interactionRecency: scoreInteractionRecency(client.lastInteraction),
    deadlineStatus: scoreDeadlineStatus(deadlines),
    engagementDepth: scoreEngagementDepth(interactions),
    riskSignals: scoreRiskSignals(client, interactions),
  };

  const score = Math.round(
    dimensions.interactionRecency * 0.30 +
      dimensions.deadlineStatus * 0.30 +
      dimensions.engagementDepth * 0.15 +
      dimensions.riskSignals * 0.25,
  );

  const band = getBand(score);

  return {
    clientSlug: client.slug,
    clientName: client.name,
    score,
    band,
    dimensions,
    summary: buildSummary(dimensions, band),
  };
}
