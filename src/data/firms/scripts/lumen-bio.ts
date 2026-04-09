// =============================================================================
// Lumen Bio — North Arc Advisors hero scripted conversation
// =============================================================================
// Priya Raman (Managing Partner) is prepping Lumen Bio's Series B board deck.
// Naomi Patel (Senior Consultant, Ops) surfaced a cohort enrollment mismatch:
// the clinical team and the lab team disagree on Q1 patient counts. AI
// reconciled the two feeds and found a duplicate entry. Priya needs to decide
// whether to flag it to the board proactively or resolve it quietly.
// =============================================================================

import type { BriefingMessage, LiveAlert } from "../../mock-data";

export function getLumenBioTeamChannelScript(): BriefingMessage[] {
  return [
    {
      id: "lumen-team-1",
      type: "briefing",
      timestamp: "Earlier today",
      content: "**Welcome back to Lumen Bio.** Here's where the Series B deck prep stands:",
      metadata: {
        lastVisit: "2 hours ago",
        highlights: [
          "HubSpot synced just now — pipeline and enterprise deal data current",
          "Engagement phase: **board prep** — deck shell done, cohort data is the last gap",
          "**Cohort mismatch** flagged: clinical says 428 patients, lab says 431 for Q1",
          "Board meeting is **Friday 2pm** — CEO wants a clean narrative",
        ],
      },
    },
    {
      id: "lumen-team-2",
      type: "team-handoff",
      timestamp: "10:04 AM",
      content: "Priya — I chased the cohort count gap down to the source. Lab is counting three patients who were consented but never actually dosed, and clinical is double-counting one patient who got re-enrolled after a protocol amendment. Real Q1 number is 427. It's small but it matters because the Series B deck leads with the 428 enrollment number.",
      metadata: {
        teamMemberId: "naomi",
        handoffSubject: "Cohort count reconciliation — real Q1 is 427",
      },
    },
    {
      id: "lumen-team-3",
      type: "ai-response",
      timestamp: "10:06 AM",
      content: "Naomi — I reran the reconciliation against the master consent log and the dosing schedule. 427 is correct. The re-enrollment was processed by two coordinators on different days, which is where the double-count slipped in. Good catch. I pulled every touchpoint into a single timeline so Priya has the audit trail if it comes up at the board.",
    },
    {
      id: "lumen-team-4",
      type: "document-generated",
      timestamp: "10:09 AM",
      content: "I prepared the **reconciled Q1 cohort model** with both feeds, the variance analysis, and the corrected 427 number.",
      metadata: {
        documentTitle: "Lumen Bio — Q1 Cohort Reconciliation",
        documentFormat: "xlsx",
        documentSubtitle: "Clinical feed · Lab feed · Reconciled total",
        documentHighlights: [
          "Reconciled Q1 enrollment: 427 (was 428 in draft deck)",
          "Variance driver: single patient double-counted after protocol amendment",
          "Three lab-only consents (never dosed) excluded per protocol definition",
        ],
        documentStatus: "ready-for-review",
        sharedBy: "ai",
      },
    },
    {
      id: "lumen-team-5",
      type: "user",
      timestamp: "10:18 AM",
      content: "Open the reconciliation. I want to see the audit trail on that re-enrollment before we commit.",
    },
    {
      id: "lumen-team-6",
      type: "ai-response",
      timestamp: "10:18 AM",
      content: "Opened on the right. The re-enrollment row is highlighted. Patient C-0174 was consented on Feb 3, dropped on Feb 28 after a protocol amendment, and re-enrolled under the amended protocol on March 11 — same patient, two entries in the raw log. Excluding the duplicate brings Q1 to exactly 427.",
    },
    {
      id: "lumen-team-7",
      type: "team-update",
      timestamp: "10:25 AM",
      content: "**Ethan Walsh** is viewing the cohort reconciliation",
      metadata: { teamMemberId: "ethan" },
    },
    {
      id: "lumen-team-8",
      type: "user",
      timestamp: "10:31 AM",
      content: "@Naomi this needs to be in front of the board, not hidden in an appendix. One slide, full audit trail. Can you draft a short board memo explaining what we caught, why it matters, and what we're doing to prevent it?",
    },
    {
      id: "lumen-team-9",
      type: "document-generated",
      timestamp: "10:33 AM",
      content: "Drafted the **board memo** — three paragraphs, opens with the correction, explains the root cause, closes with the process fix Naomi and the clinical lead already agreed on.",
      metadata: {
        documentTitle: "Board Memo — Q1 Enrollment Correction",
        documentFormat: "docx",
        documentSubtitle: "To: Lumen Bio Board of Directors",
        documentHighlights: [
          "Corrected Q1 enrollment from 428 to 427 with audit trail",
          "Root-cause: protocol amendment re-enrollment flow",
          "Process fix: single-source consent log with coordinator sign-off",
        ],
        documentStatus: "ready-for-review",
        sharedBy: "ai",
      },
    },
    {
      id: "lumen-team-10",
      type: "team-update",
      timestamp: "10:34 AM",
      content: "**Ethan Walsh** opened the board memo",
      metadata: { teamMemberId: "ethan" },
    },
  ];
}

/**
 * Live alerts for every North Arc engagement that has one. Lumen Bio is the
 * hero and gets a fresh clinical-data alert mid-session.
 */
export function getNorthArcLiveAlerts(): Record<string, LiveAlert[]> {
  return {
    "lumen-bio": [
      {
        delayMs: 8000,
        message: {
          id: "live-lumen-1",
          type: "anomaly-alert",
          timestamp: "Just now",
          content: "**Just detected: new consent log entry**\n\nClinical just posted three new Q2 enrollments. Running the reconciliation now — early signal is the new enrollment flow is working. I'll have a clean Q2 count within the hour.",
          metadata: {
            severity: "low",
            aiConfidence: 97,
            actionButtons: [
              { label: "Tail results", variant: "primary" },
              { label: "Acknowledge", variant: "secondary" },
            ],
          },
        },
      },
    ],
    "pacific-hull": [
      {
        delayMs: 9000,
        message: {
          id: "live-pacific-1",
          type: "approval-request",
          timestamp: "Just now",
          content: "I've finished the **Q2 cash forecast** Ethan asked for yesterday.",
          metadata: {
            aiConfidence: 92,
            documentFormat: "xlsx",
            highlights: [
              "Cash runway: 11.4 months at current burn (vs 10.8 in Q1)",
              "Revenue concentration risk: top customer at 38%",
              "Recommended: renegotiate the Crestline master invoice terms",
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
