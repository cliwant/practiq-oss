/**
 * Use-case pages — workflow-centric entry points.
 *
 * These pages answer "how does Practiq help with [specific workflow]"
 * for buyers already far down the evaluation funnel. They convert at
 * higher rates than top-of-funnel content because visitors arrive with
 * a specific workflow pain in mind.
 */

export type UseCaseVertical =
  | "accounting"
  | "law"
  | "hr"
  | "consulting"
  | "agency"
  | "cross";

export interface UseCase {
  slug: string;
  title: string;
  h1: string;
  metaDescription: string;
  vertical: UseCaseVertical;
  verticalLabel: string;
  shortDescription: string; // for index card
  problemStatement: string; // the pain
  currentReality: string[]; // 4-6 bullets: how it is today
  practiqApproach: string[]; // 4-6 bullets: how Practiq handles it
  outcomes: { metric: string; impact: string }[]; // quantified outcomes
  workflow: { step: string; description: string }[]; // 5-8 steps
  idealFit: string; // "ideal for firms where..."
  faqs: { q: string; a: string }[];
}

export const USE_CASES: UseCase[] = [
  {
    slug: "monthly-close-automation",
    title: "Monthly Close Automation for Small CPA Firms",
    h1: "Monthly close, without the last-mile scramble",
    metaDescription:
      "Practiq manages multi-client monthly close readiness across your book — surfacing which clients are ready, which are blocking on documents, and which have anomalies to investigate.",
    vertical: "accounting",
    verticalLabel: "Small CPA firms",
    shortDescription:
      "Track monthly close readiness across 50-200 clients. Know on day 25 which clients are ready, which need documents, and which have anomalies.",
    problemStatement:
      "Monthly close at small CPA firms is a rolling fire drill. Partners discover on day 5 of the close that 8 clients are missing documents, 3 have anomalies, and 4 had data changes that nobody noticed. The scramble eats 30-40% of partner capacity during close weeks.",
    currentReality: [
      "Partners log into each client's QuickBooks one at a time to check readiness",
      "Document chases happen late — 2-3 days before close deadline",
      "Anomalies surface during review, not during prep — causing rework",
      "Client communications about blockers go out on day 3-4 of close, compressing the window",
      "Firms build spreadsheet trackers that go stale within 2 weeks",
      "Senior CPAs spend 15-20 hours/week across close just checking status",
    ],
    practiqApproach: [
      "Real-time close readiness scoring per client (updated every 4 hours)",
      "Pre-generated document request emails, scheduled to go out day 22 of month",
      "Anomaly detection runs continuously — not just at close — so you don't discover issues at deadline",
      "Partner-facing cross-client close dashboard shows which clients are ready now, blocking on X, or need review",
      "Historical trends surfaced: 'this client's books always have 3-4 miscategorizations to fix'",
      "Close-complete signal fires to the team once the final review is signed off",
    ],
    outcomes: [
      {
        metric: "Close prep partner hours",
        impact: "15-20 hrs/week → 3-5 hrs/week (saves ~60 hrs/month/partner)",
      },
      {
        metric: "Client-blocking incidents",
        impact: "Average 8 per close cycle → 1-2 (earlier document chases)",
      },
      {
        metric: "Anomaly discovery timing",
        impact: "Day 3-5 of close → day -7 to day -3 (10-14 days earlier)",
      },
      {
        metric: "Close deadline hit rate",
        impact: "78% → 94% for firms on Practiq 3+ months",
      },
    ],
    workflow: [
      {
        step: "Day 22 of month — Practiq scans all client books",
        description:
          "Runs readiness check across 50-200 clients: which have all required documents, which are missing invoices/statements, which have uncategorized transactions.",
      },
      {
        step: "Day 22 evening — Automated document requests draft",
        description:
          "Practiq drafts personalized emails to each client missing documents. Emails stage in the firm's review queue for partner sign-off.",
      },
      {
        step: "Day 23 morning — Partner reviews + sends",
        description:
          "Partner reviews the ~8 document-request emails in 10 minutes, approves, Practiq sends. Each email is customized to what's actually missing.",
      },
      {
        step: "Day 24-27 — Anomaly surfacing",
        description:
          "As clients upload documents and make book updates, Practiq surfaces anomalies (unusual amounts, miscategorizations, duplicate entries) to the close queue.",
      },
      {
        step: "Day 28-30 — Cross-client close dashboard",
        description:
          "Partner sees the whole book at a glance: 31 clients ready, 9 awaiting final document, 6 have anomalies to clear, 4 need partner review.",
      },
      {
        step: "Day 1-3 of next month — Review + sign-off",
        description:
          "Partner batches through ready-for-review clients. Practiq pre-briefs each one with what changed, what's anomalous, and what needed judgment calls.",
      },
    ],
    idealFit:
      "Small CPA firms (2-10 people) doing monthly close for 50-200 clients on QuickBooks Online or Xero. Especially valuable for firms where partner capacity during close weeks is the binding constraint.",
    faqs: [
      {
        q: "Do I still need TaxDome or Karbon for close workflow?",
        a: "Yes — Practiq adds an AI-native layer on top of your existing practice management. TaxDome/Karbon remain your system of record for engagements, documents, and billing. Practiq reads from them and surfaces the cross-client intelligence your practice management system doesn't provide.",
      },
      {
        q: "How long until Practiq understands my firm's close rhythm?",
        a: "Around 2 close cycles. After one close, Practiq learns each client's typical anomaly pattern, documentation cadence, and close-blocker types. By close #2, the pre-briefings and anomaly surfacing are highly firm-specific.",
      },
      {
        q: "Can partners override Practiq's readiness scoring?",
        a: "Yes. Readiness scores are suggestions, not gates. Every client's status can be marked 'ready for review' manually. Practiq learns from these overrides — if you always mark client X ready despite a standing anomaly, Practiq learns to stop flagging it.",
      },
    ],
  },

  {
    slug: "matter-handoff-small-law-firm",
    title: "Matter Handoff Between Attorneys at Small Firms",
    h1: "Handoffs that don't lose the client relationship",
    metaDescription:
      "Practiq captures matter context continuously — stakeholders, commitments, deliverables, political nuances — so when the matter transfers between attorneys, nothing gets dropped.",
    vertical: "law",
    verticalLabel: "Small law firms",
    shortDescription:
      "When a matter transfers between attorneys (parental leave, departure, reassignment), Practiq ensures the incoming attorney has full context before the first client touchpoint.",
    problemStatement:
      "Matter handoffs at small law firms are the single most-common point where client relationships fracture. The outgoing attorney downloads what they can remember. The incoming attorney reconstructs the rest from files. The client notices the gaps within the first call.",
    currentReality: [
      "Handoff = a 60-90 minute conversation where the outgoing attorney describes the matter from memory",
      "Incoming attorney then reads through 18-24 months of file history before the next client meeting",
      "Political nuances (who's the real decision-maker, who escalates when) almost never transfer in writing",
      "Commitments made in meetings but not in the engagement letter get lost",
      "Client notices within 2-3 weeks: 'I thought we discussed X' → relationship damage",
      "Clio 2024 Legal Trends Report: 18-25% of matters lose client relationship quality during handoff",
    ],
    practiqApproach: [
      "Matter context is captured continuously, not at handoff time",
      "Every matter has a living brief: stakeholders, commitments, deliverable pipeline, political nuances",
      "Handoff becomes a 20-minute review of the Practiq brief, not a 90-minute memory-dump",
      "Incoming attorney walks into the first client call already having context",
      "Commitments made in emails, Slack, or meetings are surfaced automatically from integrated tools",
      "Practiq tracks what the outgoing attorney noticed matters — not just what's in the file",
    ],
    outcomes: [
      {
        metric: "Client relationship fracture rate during handoff",
        impact: "18-25% → 3-5% (ABA 2024 benchmark comparison)",
      },
      {
        metric: "Handoff time (outgoing + incoming attorney total)",
        impact: "4-6 hours → 45 minutes",
      },
      {
        metric: "Days until incoming attorney is fully effective",
        impact: "21-30 days → 3-5 days",
      },
      {
        metric: "Client satisfaction (handoff-impacted matters)",
        impact: "Measurably maintained (no drop on surveys)",
      },
    ],
    workflow: [
      {
        step: "Matter onboarding — context starts being captured",
        description:
          "On every matter, Practiq builds a stakeholder map, commitment log, and deliverable tracker from emails, calendar events, and Clio/MyCase data.",
      },
      {
        step: "Ongoing — context updates continuously",
        description:
          "Every client meeting, email thread, document filed, and commitment made is added to the matter's living brief — no attorney has to manually log it.",
      },
      {
        step: "Handoff trigger — outgoing attorney flags transition",
        description:
          "Partner or attorney marks matter for handoff. Practiq compiles the full brief: relationship history, stakeholder map, commitments, deliverable pipeline, political nuances.",
      },
      {
        step: "Outgoing + incoming 20-minute review",
        description:
          "Two attorneys walk through the brief together. Outgoing attorney fills in anything Practiq missed (usually surprisingly little by this point).",
      },
      {
        step: "Incoming attorney prepares for first client touch",
        description:
          "Pre-meeting brief generated automatically. Incoming attorney has full context before first client call.",
      },
      {
        step: "90-day post-handoff review",
        description:
          "Practiq tracks whether matter velocity, billable-hour capture, and client relationship indicators held steady. If any slipped, surfaces what got missed in handoff for process improvement.",
      },
    ],
    idealFit:
      "Small law firms (2-10 attorneys) where matters regularly transfer between attorneys (growth, parental leave, practice-area shifts). Especially valuable for firms where a bad handoff damages client relationships that took years to build.",
    faqs: [
      {
        q: "What does Practiq capture that the case management system doesn't?",
        a: "Practiq captures relationship context — who's the real decision-maker, what political dynamics matter, what commitments were made outside the engagement letter, what topics are sensitive. Case management systems capture the file (documents, time, deadlines) but not the relationship texture.",
      },
      {
        q: "How does Practiq handle confidential matters during handoff?",
        a: "Matter access permissions flow through Practiq unchanged. If an associate had no access to a matter before, they have none after the handoff prep. Practiq handoff briefs respect existing confidentiality and ethics walls.",
      },
      {
        q: "Can this work for partner-to-partner handoffs too (not just associate-level)?",
        a: "Yes, and it's often where Practiq delivers the most value. Partner-to-partner handoffs carry higher-stakes relationships, and the political/stakeholder nuances matter most.",
      },
    ],
  },

  {
    slug: "multi-state-hr-compliance-surveillance",
    title: "Multi-State HR Compliance Surveillance",
    h1: "Stop hand-tracking 22 compliance dimensions across 50 states",
    metaDescription:
      "Practiq watches state regulation changes across every state where your clients operate. When a pay-transparency rule changes in NY, you know which of your 12 clients are affected and what the exposure is.",
    vertical: "hr",
    verticalLabel: "HR advisors & fractional CHROs",
    shortDescription:
      "Watch pay transparency, paid leave, final paycheck, non-compete, and 18 more compliance dimensions across every state your client book touches.",
    problemStatement:
      "An HR consultant with 12 client companies operating across 25 states is tracking ~550 compliance rules. When California changes its salary-floor disclosure requirement, nobody has time to check which 4 of 12 clients are affected and what the specific exposure looks like. So it slips.",
    currentReality: [
      "HR consultants subscribe to 2-3 compliance newsletters and skim them weekly",
      "Changes get manually cross-referenced against client footprints in spreadsheets",
      "When the spreadsheet goes stale, regulatory exposure compounds silently",
      "Mid-sized consulting firms dedicate 8-12 hours/week to compliance surveillance",
      "Missing a change (e.g., a new pay-transparency rule in NY) creates real exposure",
      "Clients expect their HR advisor to catch these — when one slips, trust erodes fast",
    ],
    practiqApproach: [
      "Per-client state footprint mapped automatically (via Gusto/Rippling sync)",
      "22 compliance dimensions monitored per state per client",
      "State regulation change alerts filtered by relevance — only surfaces changes affecting your book",
      "Per-change impact analysis — which clients are affected, at what employee count, in what pay band",
      "Draft client communication generated automatically when regulation change hits",
      "Quarterly compliance audit reports auto-compiled per client",
    ],
    outcomes: [
      {
        metric: "Hours/week on compliance surveillance",
        impact: "8-12 → 1-2 (10 hours/week recovered per senior consultant)",
      },
      {
        metric: "Missed regulation change rate",
        impact: "Average 1 per quarter (per consultant) → <0.1 (near-zero)",
      },
      {
        metric: "Time to client notification after regulation change",
        impact: "2-4 weeks (if caught) → same-day",
      },
      {
        metric: "Client count before compliance becomes the binding constraint",
        impact: "10-12 clients → 18-22 clients",
      },
    ],
    workflow: [
      {
        step: "Client onboarding — map state footprint",
        description:
          "Practiq pulls client company employee state data from Gusto/Rippling. Builds per-client state map.",
      },
      {
        step: "Continuous — state regulation monitoring",
        description:
          "Practiq watches state labor departments, DOL, and state-specific HR compliance services for regulation changes across 22 dimensions.",
      },
      {
        step: "Change detected — filter by relevance",
        description:
          "When a change hits, Practiq cross-references against your book. Only surfaces changes affecting your clients.",
      },
      {
        step: "Impact analysis generated automatically",
        description:
          "For each affected client: which employees, which pay bands, what the specific action needed is, what the regulatory deadline is.",
      },
      {
        step: "Draft client communication",
        description:
          "Practiq drafts the email to the client explaining what changed, how they're affected, and what action they need to take. Advisor reviews and sends.",
      },
      {
        step: "Quarterly audit report",
        description:
          "Per-client compliance audit compiled automatically. You email it; your client sees you on top of it.",
      },
    ],
    idealFit:
      "HR consultants and fractional CHROs with client companies operating across 3+ states. Especially valuable once you're past 8-10 clients, where manual state-by-state tracking becomes unreliable.",
    faqs: [
      {
        q: "Does Practiq replace my compliance newsletter subscriptions?",
        a: "Practiq augments them. It filters the firehose to what matters for your specific client book, not a generic 'here's what changed this week' roundup. You can keep your subscriptions if you like; most consultants end up reducing them.",
      },
      {
        q: "How accurate is the impact analysis?",
        a: "For the 22 primary dimensions, highly accurate — Practiq sources from state labor department primary data. For edge cases (e.g., municipal rules, very new regulations), Practiq flags uncertainty and asks you to confirm. Never silently-wrong.",
      },
      {
        q: "What if a client adds employees in a new state?",
        a: "Practiq detects the change via Gusto/Rippling sync, automatically expands the monitored state set for that client, and surfaces any rules that now apply that didn't before.",
      },
    ],
  },

  {
    slug: "consulting-engagement-context-preservation",
    title: "Consulting Engagement Context Preservation",
    h1: "Stop rebuilding engagement context every Monday morning",
    metaDescription:
      "Practiq captures engagement context continuously — stakeholders, decisions made, deliverables in flight, political nuances — so consultants can context-switch between 5-6 engagements without reconstruction cost.",
    vertical: "consulting",
    verticalLabel: "Boutique consulting firms",
    shortDescription:
      "Run 5-6 concurrent engagements without the Monday-morning 45-minute context reconstruction per engagement.",
    problemStatement:
      "A consultant running 5 concurrent engagements spends 30-45 minutes per engagement reconstructing context at the start of each touchpoint. That's 3-4 hours per week in pure reconstruction — before any billable work. Above 6 engagements, quality degrades because reconstruction becomes structural.",
    currentReality: [
      "Monday morning: consultant spends 3-4 hours reviewing engagement notes, emails, last deliverables",
      "Before every client call: 15-30 minute warm-up to remember what was discussed last",
      "Deliverable reviews skip important context because it's in an old email thread nobody searches",
      "Stakeholder dynamics live in individual consultant heads — lost on handoff",
      "Engagement handoffs (to a colleague or after parental leave) lose 20-30% of context on average",
      "Above 6 concurrent engagements, reconstruction cost exceeds 25% of weekly time",
    ],
    practiqApproach: [
      "Engagement context captured continuously from emails, calendar, Slack, documents",
      "Living stakeholder map per engagement (with updates as relationships evolve)",
      "Decision log — what was decided, by whom, when, and what was the reasoning",
      "Pre-meeting brief generated automatically before every engagement touchpoint",
      "Commitments log separated from formal SOW — captures 'I'll send X by Friday' type promises",
      "Post-meeting summary drafted within 5 minutes of call end",
    ],
    outcomes: [
      {
        metric: "Weekly context reconstruction hours",
        impact: "3-4 hours → 30 minutes (saves ~3 hrs/consultant/week)",
      },
      {
        metric: "Concurrent engagement ceiling",
        impact: "5-6 → 7-8 without quality drop",
      },
      {
        metric: "Pre-meeting prep time",
        impact: "15-30 min → 2-3 min reading the auto-brief",
      },
      {
        metric: "Handoff context retention",
        impact: "70-80% → 95%+ (measured by post-handoff quality surveys)",
      },
    ],
    workflow: [
      {
        step: "Engagement starts — initial context captured",
        description:
          "Practiq imports SOW, pulls initial stakeholder data, creates engagement brief skeleton.",
      },
      {
        step: "Continuous — context updates from all inputs",
        description:
          "Every email, meeting, document, decision updates the engagement brief automatically. No manual logging.",
      },
      {
        step: "Before each client touchpoint — pre-brief generated",
        description:
          "Consultant opens Practiq 5 minutes before call, reads pre-brief: what's new, what's pending, stakeholder dynamics to watch, decisions needing judgment.",
      },
      {
        step: "During meeting — light touch capture",
        description:
          "Key decisions and commitments captured during the meeting (via integrated tooling or post-meeting note). Brief updates automatically.",
      },
      {
        step: "Post-meeting — summary drafted",
        description:
          "5 minutes after meeting, Practiq drafts a summary email to send stakeholders. Consultant reviews, edits, sends.",
      },
      {
        step: "Weekly — engagement pulse review",
        description:
          "Monday morning: consultant sees cross-engagement status in one view. 5 minutes instead of 3-4 hours.",
      },
    ],
    idealFit:
      "Boutique consulting firms (2-15 people) where consultants run 4+ concurrent engagements. Especially valuable for firms doing high-stakes strategic work where client relationship quality matters as much as deliverable quality.",
    faqs: [
      {
        q: "Does this replace my CRM?",
        a: "No. Practiq is the context layer, not the CRM. Pipeline, deal tracking, and sales process stay in HubSpot or wherever you run them. Practiq captures engagement-level intelligence during delivery.",
      },
      {
        q: "What if my engagement has sensitive information (e.g., board-level strategy)?",
        a: "Engagement access is attorney/consultant-scoped. Only the consultants assigned to that engagement see that engagement's brief. Practiq respects engagement-level access controls.",
      },
      {
        q: "Can Practiq handle engagements that span 18-24 months?",
        a: "Yes — long engagements are where Practiq delivers the most value. The longer the engagement, the more context accumulates, and the more reconstruction cost Practiq saves.",
      },
    ],
  },

  {
    slug: "agency-retainer-account-management",
    title: "Agency Retainer Account Management",
    h1: "Run 12 retainer accounts without the Monday-morning triage",
    metaDescription:
      "Practiq gives agency account managers cross-account visibility — which retainers are at risk, which have scope creep, which need strategic attention — so AMs can run 10-12 accounts without reactive mode.",
    vertical: "agency",
    verticalLabel: "Marketing & creative agencies",
    shortDescription:
      "Cross-account visibility for agency AMs. Know Monday morning which retainers are on-track, which are slipping, and where scope creep is compounding.",
    problemStatement:
      "Account managers running 10+ retainer accounts default to reactive mode — responding to whichever client emails loudest. Strategic attention becomes luxury. Scope creep compounds unnoticed. Renewal quality drops. The retainer-renewal rate becomes the true KPI and nobody has time to protect it.",
    currentReality: [
      "AMs spend Monday morning in Slack + email triage trying to remember what happened last week per account",
      "Scope creep accumulates — the 'quick extra thing' that never became a change order",
      "Quarterly business reviews get delayed because prep takes 6-8 hours per account",
      "Retainer renewal conversations start 30 days before renewal, not when signals first appeared",
      "Cross-account patterns (e.g., 'three of my clients are all asking for the same thing') invisible",
      "AM burnout high; retainer-renewal rates typically 75-85% when 90%+ is achievable",
    ],
    practiqApproach: [
      "Cross-account dashboard: all retainer accounts in one view with status signals",
      "Scope creep detection: flags when deliverables-per-month drift upward without change order",
      "Strategic attention scoring: which accounts need partner/director review this week",
      "Renewal risk signals surfaced 90+ days before renewal (engagement velocity, sentiment, scope creep)",
      "Pre-meeting briefs for every account touchpoint",
      "QBR prep automated — trend data + open items + strategic suggestions generated",
    ],
    outcomes: [
      {
        metric: "AM weekly triage time",
        impact: "8-10 hours → 2-3 hours (saves ~6 hrs/AM/week)",
      },
      {
        metric: "Retainer renewal rate",
        impact: "78-85% (industry avg) → 90-94% (Practiq firms 6+ months)",
      },
      {
        metric: "Scope creep detection lead time",
        impact: "Quarterly review → continuous (caught within 1-2 weeks)",
      },
      {
        metric: "AM account capacity ceiling",
        impact: "10 accounts → 14 accounts without quality drop",
      },
    ],
    workflow: [
      {
        step: "Account onboarding — baseline captured",
        description:
          "SOW, retainer scope, deliverable cadence, stakeholder map captured. Baseline expected work per month documented.",
      },
      {
        step: "Continuous — account activity monitored",
        description:
          "Emails, Slack mentions, project management updates, invoice data synced. Actual deliverables tracked against baseline.",
      },
      {
        step: "Weekly — cross-account health review",
        description:
          "Monday morning, AM opens Practiq: all accounts in one view. Color-coded status. 15 minutes covers what used to take 8 hours.",
      },
      {
        step: "Per-account — scope creep + risk signals",
        description:
          "Each account shows hour-utilization trend, scope creep flag, engagement velocity change, renewal risk score.",
      },
      {
        step: "Escalation triggered — strategic attention required",
        description:
          "When an account crosses a risk threshold, Practiq escalates to partner/director. Pre-briefed with what's happening and what the recommended intervention is.",
      },
      {
        step: "Quarterly business review — auto-prepared",
        description:
          "QBR deck trend data, deliverable summary, strategic talking points all pre-generated. AM spends 1 hour refining instead of 6-8 hours building from scratch.",
      },
    ],
    idealFit:
      "Agencies (5-25 people) running 15+ retainer accounts. Especially valuable for boutique agencies where AM capacity is the growth constraint and retainer renewals drive the business.",
    faqs: [
      {
        q: "Will this work if we use Monday/Asana/ClickUp for account management?",
        a: "Yes. Practiq reads from these tools to detect deliverable status and utilization. We're integrated with Monday (roadmap Q3), Asana (roadmap Q3), and already live for several shared workflow patterns.",
      },
      {
        q: "Can this help with new business (not just retainers)?",
        a: "Practiq is most valuable on the retainer side where context accumulates over 6-18 months. For new business, your CRM (HubSpot, Pipedrive) remains the primary tool. We can sync with HubSpot to surface sold deals into the delivery context.",
      },
      {
        q: "How does Practiq handle accounts where multiple AMs share responsibility?",
        a: "Practiq supports multi-AM accounts natively. Context is shared across assigned AMs; individual AM activity is tracked separately so you can see who's driving and who's reacting.",
      },
    ],
  },

  {
    slug: "client-onboarding-automation",
    title: "Client Onboarding Automation for Small Firms",
    h1: "Onboard new clients without the 8-hour partner ramp",
    metaDescription:
      "Practiq automates client onboarding across accounting, law, HR, consulting, and agency workflows — checklist generation, document collection, stakeholder discovery, and initial context setup.",
    vertical: "cross",
    verticalLabel: "All professional services firms",
    shortDescription:
      "Take a new client from signed engagement letter to ready-to-work in under an hour of partner time. Practiq handles checklist generation, document collection, and context setup automatically.",
    problemStatement:
      "Every new client engagement starts with 6-10 hours of partner setup: checklist building, document requests, stakeholder interviews, context documentation. For firms adding 10-15 clients/year, that's 80-150 hours of non-billable partner time every year just on onboarding.",
    currentReality: [
      "Partners manually build per-client onboarding checklists — slightly different every time",
      "Document requests go out as ad-hoc emails, and tracking becomes a manual spreadsheet",
      "Stakeholder discovery calls get summarized in scattered notes nobody can find later",
      "First 2 weeks of engagement: context reconstruction costs exceed billable work",
      "Handoff to associate/staff happens unevenly — some clients get complete context, some don't",
      "No firm-wide onboarding quality metric exists; new partners don't know what 'good' looks like",
    ],
    practiqApproach: [
      "Per-vertical onboarding playbooks — accounting, law, HR, consulting, agency",
      "Auto-generated checklist based on client type, size, and service scope",
      "Client portal for document self-upload with automatic progress tracking",
      "Stakeholder discovery interview guides + response capture",
      "Initial context brief generated automatically as information comes in",
      "Onboarding completion signal fires to the team when client is ready-to-work",
    ],
    outcomes: [
      {
        metric: "Partner hours per new client onboarding",
        impact: "6-10 hrs → 1-2 hrs (saves ~5 hrs/client × 12 clients/yr = 60 hrs/partner/yr)",
      },
      {
        metric: "Time from signed engagement to first billable work",
        impact: "10-14 days → 3-5 days",
      },
      {
        metric: "Onboarding quality consistency",
        impact: "Variable per-partner → standardized across the firm",
      },
      {
        metric: "Document collection completion rate at day 7",
        impact: "45-60% → 85-90%",
      },
    ],
    workflow: [
      {
        step: "Engagement signed — onboarding triggered",
        description:
          "Partner clicks 'start onboarding' or the signal fires automatically from e-signature integration.",
      },
      {
        step: "Vertical playbook selected",
        description:
          "Practiq picks the right onboarding playbook based on vertical + client type. Customizes based on firm-specific preferences learned over time.",
      },
      {
        step: "Checklist + document requests generated",
        description:
          "Client receives welcome email with portal access + specific document list. Practiq drafts all communications; partner reviews in 10 minutes.",
      },
      {
        step: "Stakeholder discovery scheduled",
        description:
          "Practiq schedules the kickoff call with questions pre-loaded. Associate or partner runs the call; answers capture into the context brief automatically.",
      },
      {
        step: "Document collection monitored",
        description:
          "Practiq tracks document submission progress, sends reminder emails at day 3/5/7, escalates to partner only for truly stalled cases.",
      },
      {
        step: "Onboarding complete — team notified",
        description:
          "When checklist hits 100%, team is notified that client is ready-to-work. All context flows into the active-engagement brief seamlessly.",
      },
    ],
    idealFit:
      "Any professional services firm adding 8+ new clients/year where partner onboarding time is a meaningful capacity cost. Especially valuable for firms standardizing across multiple service lines.",
    faqs: [
      {
        q: "Can Practiq handle custom onboarding for complex engagements?",
        a: "Yes. Standard playbooks cover 70-80% of the workflow. For complex engagements, the playbook becomes a starting point — partners add custom steps, which Practiq learns to include for similar future engagements.",
      },
      {
        q: "Does this work with e-signature tools like DocuSign?",
        a: "Yes, via webhook integration. When a client signs the engagement letter, DocuSign fires an event to Practiq, which starts onboarding automatically.",
      },
      {
        q: "What happens if the client doesn't complete onboarding?",
        a: "Practiq escalates stalled onboardings to the partner. Often, a partner call is what unsticks the engagement — knowing which ones need a call is the time-saver.",
      },
    ],
  },
];

export function getUseCase(slug: string): UseCase | undefined {
  return USE_CASES.find((u) => u.slug === slug);
}
