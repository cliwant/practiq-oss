// =============================================================================
// Kim's Restaurant — Park Accounting Group hero scripted conversation
// =============================================================================
// Wraps the existing `getKimsTeamChannel()` function from mock-data.ts.
// The actual scripted content lives in mock-data.ts (unchanged in Phase N.1).
// Phase N.3+ will add parallel scripts for law, consulting, agency, HR.
// =============================================================================

import { getKimsTeamChannel, getLiveAlerts } from "../../mock-data";
import type { BriefingMessage, LiveAlert } from "../../mock-data";

export function getKimsTeamChannelScript(): BriefingMessage[] {
  return getKimsTeamChannel();
}

/**
 * Live alerts for every Park Accounting client that has them, keyed by client id.
 * Today: kims-restaurant, techstart, downtown-medical (each has its own alert sequence
 * in the existing mock-data.getLiveAlerts function).
 */
export function getKimsLiveAlerts(): Record<string, LiveAlert[]> {
  const clientIds = ["kims-restaurant", "techstart", "downtown-medical"];
  const alerts: Record<string, LiveAlert[]> = {};
  for (const id of clientIds) {
    alerts[id] = getLiveAlerts(id);
  }
  return alerts;
}
