// =============================================================================
// Russo's Kitchen — Meridian Accounting Group hero scripted conversation
// =============================================================================
// Wraps the existing `getRussosTeamChannel()` function from mock-data.ts.
// The actual scripted content lives in mock-data.ts (unchanged in Phase N.1).
// Phase N.3+ will add parallel scripts for law, consulting, agency, HR.
// =============================================================================

import { getRussosTeamChannel, getLiveAlerts } from "../../mock-data";
import type { BriefingMessage, LiveAlert } from "../../mock-data";

export function getRussosTeamChannelScript(): BriefingMessage[] {
  return getRussosTeamChannel();
}

/**
 * Live alerts for every Meridian Accounting client that has them, keyed by client id.
 * Today: russos-kitchen, techstart, downtown-medical (each has its own alert sequence
 * in the existing mock-data.getLiveAlerts function).
 */
export function getRussosLiveAlerts(): Record<string, LiveAlert[]> {
  const clientIds = ["russos-kitchen", "techstart", "downtown-medical"];
  const alerts: Record<string, LiveAlert[]> = {};
  for (const id of clientIds) {
    alerts[id] = getLiveAlerts(id);
  }
  return alerts;
}
