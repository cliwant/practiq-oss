// =============================================================================
// Helix Robotics — Lattice Partners HR hero scripted conversation
// =============================================================================
// Dana Vu (Managing Partner, Total Rewards) is leading Helix Robotics on a
// VP Engineering compensation review. Elena Rios (Senior Consultant, Comp &
// Benefits) pulled the Radford bands and built the recommended range. The
// Helix CEO pushed back on the number — worried it breaks internal parity.
// Dana needs to frame this for a board review by Friday.
// =============================================================================

import type { BriefingMessage, LiveAlert } from "../../mock-data";

export function getHelixTeamChannelScript(): BriefingMessage[] {
  return [
    {
      id: "helix-team-1",
      type: "briefing",
      timestamp: "Earlier today",
      content: "**Welcome back to Helix Robotics.** Here's where the VP Eng comp review stands:",
      metadata: {
        lastVisit: "2 hours ago",
        highlights: [
          "Radford comp data synced just now — Q1 update live",
          "Engagement stage: **comp review** — recommendation drafted",
          "**CEO pushback** flagged on internal parity",
          "Helix board comp discussion is **Friday morning**",
        ],
      },
    },
    {
      id: "helix-team-2",
      type: "team-handoff",
      timestamp: "9:28 AM",
      content: "Dana — I finished the VP Eng band against Radford P75 and the recommendation lands at $340K base / $510K TC for the role. Problem: the current Director of Platform is at $298K TC. The new VP Eng would be 72% higher. CEO said on our call yesterday she can't have \"that big a gap inside the same function.\"",
      metadata: {
        teamMemberId: "elena-r",
        handoffSubject: "VP Eng comp — CEO parity concern",
      },
    },
    {
      id: "helix-team-3",
      type: "ai-response",
      timestamp: "9:30 AM",
      content: "Elena — I ran the parity analysis against 14 similar-stage robotics companies in our Radford cut. The VP Eng to Director TC gap is typically 55-75%, and Helix's current Director band is actually 8% below P50 for his role. The issue isn't the VP Eng number — it's that the Director is underpaid. If we recommend adjusting both, the gap looks normal.",
    },
    {
      id: "helix-team-4",
      type: "document-generated",
      timestamp: "9:33 AM",
      content: "I prepared the **comp band memo** with both options. Dana can decide which way to take it to the board.",
      metadata: {
        documentTitle: "Helix Robotics — VP Eng Comp Band Memo",
        documentFormat: "xlsx",
        documentSubtitle: "Radford P75 · Internal parity analysis · Two scenarios",
        documentHighlights: [
          "Scenario A — VP Eng at P75, existing band unchanged (72% gap)",
          "Scenario B — VP Eng at P75 + Director adjustment to P50 (61% gap)",
          "Recommendation: Scenario B — defensible at the board and internally",
        ],
        documentStatus: "ready-for-review",
        sharedBy: "ai",
      },
    },
    {
      id: "helix-team-5",
      type: "user",
      timestamp: "9:48 AM",
      content: "Open the memo. I want to see the parity analysis before I decide how to frame Scenario B to the CEO.",
    },
    {
      id: "helix-team-6",
      type: "ai-response",
      timestamp: "9:48 AM",
      content: "Opened on the right. The 14-company parity table is in the bottom half. Helix's current Director band is the lowest in the cohort — three percentage points under P25. The adjustment isn't generous, it's corrective. The VP Eng number stays at P75 because that's where the board already said they wanted to compete for leadership talent.",
    },
    {
      id: "helix-team-7",
      type: "team-update",
      timestamp: "9:56 AM",
      content: "**Marco Singh** is viewing the comp band memo",
      metadata: { teamMemberId: "marco" },
    },
    {
      id: "helix-team-8",
      type: "user",
      timestamp: "10:03 AM",
      content: "@Elena agreed — Scenario B is the right call. Can AI draft a short cover email I can send to the CEO before the board meeting? I want her to feel like we heard her parity concern and that the fix is bigger than just the one role.",
    },
    {
      id: "helix-team-9",
      type: "document-generated",
      timestamp: "10:05 AM",
      content: "Drafted the **CEO cover email** — warm tone, acknowledges the parity concern first, then walks through why adjusting both positions is the right answer.",
      metadata: {
        documentTitle: "Email — VP Eng comp recommendation",
        documentFormat: "email",
        documentSubtitle: "To: kiran@helixrobotics.com",
        documentHighlights: [
          "Opens by acknowledging the internal parity concern",
          "Frames the Director adjustment as corrective, not generous",
          "Closes with a one-line preview for Friday's board slide",
        ],
        documentStatus: "ready-for-review",
        sharedBy: "ai",
      },
    },
    {
      id: "helix-team-10",
      type: "team-update",
      timestamp: "10:06 AM",
      content: "**Marco Singh** opened the CEO cover email",
      metadata: { teamMemberId: "marco" },
    },
  ];
}

/** Live alerts for Lattice Partners engagements. */
export function getLatticeLiveAlerts(): Record<string, LiveAlert[]> {
  return {
    "helix-robotics": [
      {
        delayMs: 8000,
        message: {
          id: "live-helix-1",
          type: "anomaly-alert",
          timestamp: "Just now",
          content: "**Just detected: Radford Q1 update pushed**\n\nThe Q1 Radford cut just dropped. For the VP Engineering role at robotics companies in Helix's stage, P75 moved up 3.1%. The recommendation holds at $510K TC — actually now slightly below the new P75.",
          metadata: {
            severity: "low",
            aiConfidence: 98,
            actionButtons: [
              { label: "Update memo", variant: "primary" },
              { label: "Acknowledge", variant: "secondary" },
            ],
          },
        },
      },
    ],
    "meridian-people-ops": [
      {
        delayMs: 9500,
        message: {
          id: "live-meridian-1",
          type: "approval-request",
          timestamp: "Just now",
          content: "I've finished the **Meridian Q1 culture pulse synthesis**.",
          metadata: {
            aiConfidence: 89,
            documentFormat: "docx",
            highlights: [
              "327 responses (82% of eligible employees)",
              "Top theme: manager quality variance across teams",
              "Two early burnout signals flagged — Sales + Support",
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
