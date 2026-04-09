// =============================================================================
// Fjallberg Outdoor — Wildcard Studio hero scripted conversation
// =============================================================================
// Maya Okonkwo (Creative Director) is leading the Spring 2026 concept deck
// for Fjallberg Outdoor. Jun Nakamura (Senior Designer) pushed a new cut of
// the hero campaign key art, but it drifts from the brand's "heritage craft"
// guardrails. Leo Haskins (Strategy) flagged it. AI drafted a creative
// rationale email to walk Fjallberg's CMO through the pivot.
// =============================================================================

import type { BriefingMessage, LiveAlert } from "../../mock-data";

export function getFjallbergTeamChannelScript(): BriefingMessage[] {
  return [
    {
      id: "fjallberg-team-1",
      type: "briefing",
      timestamp: "Earlier today",
      content: "**Welcome back to Fjallberg Outdoor.** Here's where the Spring 2026 concept deck stands:",
      metadata: {
        lastVisit: "3 hours ago",
        highlights: [
          "Figma synced just now — hero key art v12 posted",
          "Campaign phase: **concept approval** — Jun's new cut is live",
          "**Brand guardrail mismatch** flagged by Leo",
          "Fjallberg CMO presentation is **Friday afternoon**",
        ],
      },
    },
    {
      id: "fjallberg-team-2",
      type: "team-handoff",
      timestamp: "9:15 AM",
      content: "Maya — Jun's new hero cut is gorgeous but it's drifting from the heritage-craft guardrails we set in November. The lighting and the palette say tech-apparel, not trail-heritage. I don't want to kill it, I just want to make sure we're intentional before it goes in front of Elena.",
      metadata: {
        teamMemberId: "leo",
        handoffSubject: "Hero key art — off-guardrail but compelling",
      },
    },
    {
      id: "fjallberg-team-3",
      type: "ai-response",
      timestamp: "9:17 AM",
      content: "Leo — I ran Jun's v12 against the November brand manual. It's a clean modern aesthetic, but the cool palette and clean lines index to Arc'teryx / Patagonia territory, not Fjallberg's positioning. That said, Elena mentioned in the Q4 review that she wanted \"more 2026 energy\" — this might be what she was pointing at.",
    },
    {
      id: "fjallberg-team-4",
      type: "document-generated",
      timestamp: "9:21 AM",
      content: "I prepared a **campaign rationale** showing both directions side-by-side with KPI projections. Maya can decide which way to run, and we have a defensible story either way.",
      metadata: {
        documentTitle: "Fjallberg Spring 2026 — Campaign Rationale",
        documentFormat: "xlsx",
        documentSubtitle: "Heritage vs Modern cut · KPI projections · Recommendation",
        documentHighlights: [
          "Heritage direction — safer, tracks to Fjallberg's 18-month brand arc",
          "Modern direction — 14% higher engagement projected on Gen Z audiences",
          "Recommendation: hybrid — lead with modern, anchor with heritage",
        ],
        documentStatus: "ready-for-review",
        sharedBy: "ai",
      },
    },
    {
      id: "fjallberg-team-5",
      type: "user",
      timestamp: "9:36 AM",
      content: "Open the rationale. I want to see the engagement projection before I talk to Jun about a hybrid.",
    },
    {
      id: "fjallberg-team-6",
      type: "ai-response",
      timestamp: "9:36 AM",
      content: "Opened on the right. The Gen Z engagement projection is based on the last three Fjallberg campaigns vs comparable modern outdoor campaigns on Meta and TikTok. The 14% lift on the modern cut comes from pattern-matching against Arc'teryx and Cotopaxi creative from the last 18 months.",
    },
    {
      id: "fjallberg-team-7",
      type: "team-update",
      timestamp: "9:44 AM",
      content: "**Jun Nakamura** is viewing the campaign rationale",
      metadata: { teamMemberId: "jun" },
    },
    {
      id: "fjallberg-team-8",
      type: "user",
      timestamp: "9:51 AM",
      content: "@Jun — the rationale makes the case for a hybrid. Let's pitch Elena on the modern hero with a heritage anchor in the lookbook. Can AI draft the rationale email to her? Warm, confident voice. Lead with the insight, not the pivot.",
    },
    {
      id: "fjallberg-team-9",
      type: "document-generated",
      timestamp: "9:53 AM",
      content: "Drafted the **rationale email** to Elena — warm voice, leads with the Gen Z insight, frames the hybrid as \"Fjallberg evolving into its next decade\" instead of a pivot.",
      metadata: {
        documentTitle: "Email — Fjallberg Spring 2026 direction",
        documentFormat: "email",
        documentSubtitle: "To: elena.rhodes@fjallberg.com",
        documentHighlights: [
          "Opens with the Gen Z engagement finding",
          "Presents modern + heritage as complementary, not competing",
          "Offers two creative variants for her Friday review",
        ],
        documentStatus: "ready-for-review",
        sharedBy: "ai",
      },
    },
    {
      id: "fjallberg-team-10",
      type: "team-update",
      timestamp: "9:55 AM",
      content: "**Isa Rivas** opened the rationale email",
      metadata: { teamMemberId: "isa" },
    },
  ];
}

/** Live alerts for every Wildcard Studio account that has one. */
export function getWildcardLiveAlerts(): Record<string, LiveAlert[]> {
  return {
    "fjallberg-outdoor": [
      {
        delayMs: 8000,
        message: {
          id: "live-fjallberg-1",
          type: "anomaly-alert",
          timestamp: "Just now",
          content: "**Just detected: TikTok algorithm shift**\n\nFjallberg's hero campaign is now competing with a surge of \"heritage craft\" content in the outdoor category. Modern cuts are trending 22% higher in the last 48 hours. Our recommendation holds — maybe even strengthens.",
          metadata: {
            severity: "medium",
            aiConfidence: 91,
            actionButtons: [
              { label: "Add to rationale", variant: "primary" },
              { label: "Flag for Elena", variant: "secondary" },
              { label: "Acknowledge", variant: "secondary" },
            ],
          },
        },
      },
    ],
    "northstar-coffee": [
      {
        delayMs: 9500,
        message: {
          id: "live-northstar-1",
          type: "approval-request",
          timestamp: "Just now",
          content: "I've finished the **Northstar Coffee product launch teaser**.",
          metadata: {
            aiConfidence: 94,
            documentFormat: "pdf",
            highlights: [
              "Three teaser variants (vertical / square / 16:9)",
              "Copy decks finalized in Northstar's voice",
              "Launch timing aligned with the Q2 bean drop",
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
