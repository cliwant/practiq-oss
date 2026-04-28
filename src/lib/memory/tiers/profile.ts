/**
 * T0 — Client Profile (always-inline core memory).
 *
 * Letta-equivalent of "core memory": data so foundational the agent
 * sees it on every single call without retrieval cost. Identity,
 * industry, relationship length, communication preferences. Cap is
 * tight (~250 tokens) precisely because this lives in the prompt
 * unconditionally — if it grows to 1K tokens we've made the chat
 * route more expensive on every single turn for content that's
 * mostly stable.
 *
 * Output is plain English sentences, not JSON, because the
 * downstream model performs better when this layer reads like a
 * brief than when it has to parse a key-value map. The profile
 * builder makes deliberate stylistic choices (mention industry
 * first, then relationship length, then explicit operator
 * preferences) so the model sees the same "shape" each time and
 * caches well.
 *
 * Caller passes a pre-loaded `ClientLite` (already authorised). We
 * never re-query Prisma here — the composer batches reads.
 */

import { approxTokenCount, truncateToTokenCap } from "../token-counter";

export interface ProfileInputClient {
  id: string;
  name: string;
  industry: string;
  userRole: string;
  relationshipMonths: number;
  preferences: Record<string, unknown> | null;
}

export interface TierBlock {
  tier: "T0" | "T1" | "T2" | "T3" | "T4";
  /** Markdown body to paste into the system prompt. Empty when tier is missing. */
  body: string;
  /** Approximate token count of `body`. */
  tokensApprox: number;
  /** Short label for observability — what's actually inside this tier this run. */
  summary: string;
  /** True when the tier had data; false when we returned an empty body as fallback. */
  hadData: boolean;
}

export function loadT0Profile(
  client: ProfileInputClient,
  cap: number,
): TierBlock {
  const lines: string[] = [];
  lines.push(
    `Client: ${client.name} (${client.industry}, relationship ${client.relationshipMonths}mo${
      client.relationshipMonths >= 12 ? " — long-tenured" : ""
    }).`,
  );

  const prefs = client.preferences ?? {};
  const tone =
    typeof (prefs as Record<string, unknown>).reportTone === "string"
      ? ((prefs as Record<string, unknown>).reportTone as string)
      : null;
  if (tone) {
    lines.push(`Reporting tone: ${tone}.`);
  }

  const role =
    typeof (prefs as Record<string, unknown>).primaryContactRole === "string"
      ? ((prefs as Record<string, unknown>).primaryContactRole as string)
      : null;
  if (role) {
    lines.push(`Primary recipient role: ${role}.`);
  }

  const fmtPrefs = (prefs as Record<string, unknown>).preferredFormats;
  if (Array.isArray(fmtPrefs) && fmtPrefs.length > 0) {
    const formats = fmtPrefs
      .filter((f): f is string => typeof f === "string")
      .slice(0, 4)
      .join(", ");
    if (formats) lines.push(`Preferred formats: ${formats}.`);
  }

  const note =
    typeof (prefs as Record<string, unknown>).note === "string"
      ? ((prefs as Record<string, unknown>).note as string)
      : null;
  if (note && note.trim().length > 0) {
    // Operator-authored note can be long; clamp to 200 chars so it
    // doesn't blow past the tier cap on its own.
    const clamped =
      note.length > 200 ? note.slice(0, 197).trim() + "…" : note.trim();
    lines.push(`Operator note: ${clamped}`);
  }

  // Always include the operator's role *as known to this client* so
  // the agent doesn't suggest tasks outside its remit.
  lines.push(
    `Operator's role on this client: ${client.userRole || "general accounting"}.`,
  );

  const raw = `## T0 Client profile\n\n${lines.join(" ")}\n`;
  const body = truncateToTokenCap(raw, cap);
  return {
    tier: "T0",
    body,
    tokensApprox: approxTokenCount(body),
    summary: `name + industry + ${tone ? "tone" : "no-tone"} + ${
      role ? "role" : "no-role"
    }`,
    hadData: true,
  };
}
