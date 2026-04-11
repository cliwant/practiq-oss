// =============================================================================
// Hendrix v. Riverpoint Realty — Chen Morgan LLP hero scripted conversation
// =============================================================================
// Mirror of Russo's Kitchen scripted pattern, translated into a boutique
// litigation matter. Sarah Vidal (Senior Associate) ran an AI-assisted
// privilege review on 2,400+ discovery documents and flagged three borderline
// entries for Helen Chen (Managing Partner) before the log ships to opposing
// counsel. Discovery deadline is Friday.
// =============================================================================

import type { BriefingMessage, LiveAlert } from "../../mock-data";

export function getHendrixTeamChannelScript(): BriefingMessage[] {
  return [
    {
      id: "hendrix-team-1",
      type: "briefing",
      timestamp: "Earlier today",
      content: "**Welcome back to Hendrix v. Riverpoint Realty.** Here's where things stand:",
      metadata: {
        lastVisit: "4 hours ago",
        highlights: [
          "Clio synced just now — 2,412 discovery docs loaded",
          "Case phase: **discovery review** — Sarah finished the first-pass privilege log last night",
          "**3 borderline privilege calls** flagged for your review",
          "Discovery deadline is **Friday** — opposing counsel expecting the log",
        ],
      },
    },
    {
      id: "hendrix-team-2",
      type: "team-handoff",
      timestamp: "8:51 AM",
      content: "Helen — privilege log is done on my end but three entries I want you to look at before we ship. Two are internal emails where outside consultants were on the chain (entries 847 and 1203), and one is a memo Morgan drafted but never sent (entry 2018). I have a view but it really should be your call.",
      metadata: {
        teamMemberId: "sarah",
        handoffSubject: "Privilege log — 3 borderline calls",
      },
    },
    {
      id: "hendrix-team-3",
      type: "ai-response",
      timestamp: "8:53 AM",
      content: "Sarah — I cross-checked the three flagged entries against the Upjohn test and our prior Hendrix privilege rulings. Entries 847 and 1203 are outside the attorney-client umbrella because the consultants weren't acting at our direction. Entry 2018 is closer — the draft memo probably falls under work-product, but Helen should make the call on whether to assert it.",
    },
    {
      id: "hendrix-team-4",
      type: "document-generated",
      timestamp: "8:56 AM",
      content: "I prepared the **privilege log** with Sarah's classifications and my three annotations. Ready for your review before we ship to opposing counsel.",
      metadata: {
        documentTitle: "Hendrix v. Riverpoint — Privilege Log",
        documentFormat: "xlsx",
        documentSubtitle: "2,412 entries · 3 flagged for Helen",
        documentHighlights: [
          "Entry 847 — Riverpoint/consultant email chain (non-privileged under Upjohn)",
          "Entry 1203 — similar pattern, different consultant (non-privileged)",
          "Entry 2018 — Morgan's unsent draft memo (work-product candidate)",
        ],
        documentStatus: "ready-for-review",
        sharedBy: "ai",
      },
    },
    {
      id: "hendrix-team-5",
      type: "user",
      timestamp: "9:14 AM",
      content: "Open the log. I want to read the three flagged entries myself before we commit.",
    },
    {
      id: "hendrix-team-6",
      type: "ai-response",
      timestamp: "9:14 AM",
      content: "Opened on the right. The three flagged rows are highlighted. For entries 847 and 1203, the consultants were Riverpoint's own vendors — no engagement letter with us, so the privilege doesn't attach. Entry 2018 is the interesting one: Morgan wrote it preparing for the deposition, which is core work-product.",
    },
    {
      id: "hendrix-team-7",
      type: "team-update",
      timestamp: "9:22 AM",
      content: "**Sarah Vidal** is viewing the privilege log",
      metadata: { teamMemberId: "sarah" },
    },
    {
      id: "hendrix-team-8",
      type: "user",
      timestamp: "9:28 AM",
      content: "@Sarah good thinking on flagging these. Let's drop 847 and 1203 as non-privileged and assert work-product on 2018 with a short basis note. Can you draft the privilege log cover memo to opposing counsel? Firm voice, nothing we can't stand behind at a hearing.",
    },
    {
      id: "hendrix-team-9",
      type: "document-generated",
      timestamp: "9:30 AM",
      content: "Drafted the **privilege log cover memo** — formal firm voice, leads with the log certification, defends the work-product assertion on entry 2018 in three sentences.",
      metadata: {
        documentTitle: "Cover Memo — Privilege Log Production",
        documentFormat: "docx",
        documentSubtitle: "To: Hartwell & Beam LLP (opposing counsel)",
        documentHighlights: [
          "Log certification paragraph citing Fed. R. Civ. P. 26(b)(5)(A)",
          "Work-product basis for entry 2018 grounded in Hickman v. Taylor",
          "Offer to meet-and-confer on any challenged entries",
        ],
        documentStatus: "ready-for-review",
        sharedBy: "ai",
      },
    },
    {
      id: "hendrix-team-10",
      type: "team-update",
      timestamp: "9:31 AM",
      content: "**David Morgan** opened the cover memo",
      metadata: { teamMemberId: "david-m" },
    },
  ];
}

/**
 * Live alerts for every Chen Morgan matter that has one. Hendrix is the hero
 * and gets a discovery-deadline alert mid-session.
 */
export function getChenMorganLiveAlerts(): Record<string, LiveAlert[]> {
  return {
    "hendrix-riverpoint": [
      {
        delayMs: 8000,
        message: {
          id: "live-hendrix-1",
          type: "anomaly-alert",
          timestamp: "Just now",
          content: "**Just detected: opposing counsel scheduling motion**\n\nHartwell & Beam just filed a motion to compel production by Thursday 5pm — 24 hours earlier than our current deadline. The privilege log has to ship tonight if we're going to make it.",
          metadata: {
            severity: "high",
            aiConfidence: 99,
            actionButtons: [
              { label: "Open motion", variant: "primary" },
              { label: "Draft response", variant: "secondary" },
              { label: "Acknowledge", variant: "secondary" },
            ],
          },
        },
      },
    ],
    "apex-labs-series-c": [
      {
        delayMs: 9000,
        message: {
          id: "live-apex-1",
          type: "approval-request",
          timestamp: "Just now",
          content: "I've finished the **lead investor signature block review** for the Apex Labs Series C SPA.",
          metadata: {
            aiConfidence: 95,
            documentFormat: "docx",
            highlights: [
              "All 11 investor signature blocks match Carta cap table",
              "One Delaware-filed name mismatch flagged (Stenton Capital LLC)",
              "Escrow agent authorization page still missing",
            ],
            actionButtons: [
              { label: "Approve", variant: "primary" },
              { label: "Preview", variant: "secondary" },
            ],
          },
        },
      },
    ],
  };
}
