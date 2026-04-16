/**
 * Integration partner data.
 *
 * Each integration drives a detail page at /integrations/{slug} —
 * buyer-intent SEO surface for "Practiq + QuickBooks integration" etc.
 *
 * Status semantics:
 * - "live": integration is working in production today
 * - "beta": partial integration available to early-access customers
 * - "roadmap": prioritized, typically in next 2 quarters
 * - "partner-requested": accepting early requests
 *
 * Naming used here reflects the current early-access phase — integrations
 * are real partnerships where Practiq's API is being wired to each platform.
 */

export type IntegrationVertical =
  | "accounting"
  | "law"
  | "hr"
  | "consulting"
  | "agency"
  | "cross";

export type IntegrationStatus = "live" | "beta" | "roadmap" | "partner-requested";

export type IntegrationCategory =
  | "practice-mgmt"
  | "accounting"
  | "payroll-hris"
  | "crm"
  | "case-mgmt"
  | "project-mgmt"
  | "document"
  | "communication"
  | "data";

export interface Integration {
  slug: string;
  name: string;
  tagline: string;
  category: IntegrationCategory;
  categoryLabel: string;
  vertical: IntegrationVertical;
  verticalLabel: string;
  status: IntegrationStatus;
  statusLabel: string;
  whatItDoes: string;
  capabilities: string[];
  dataFlowDirection: "read" | "write" | "bidirectional";
  useCases: { title: string; description: string }[];
  setupTime: string;
  prerequisites: string[];
  competitorNote?: string;
  pricingNote: string;
  metaDescription: string;
}

export const INTEGRATIONS: Integration[] = [
  // ─── ACCOUNTING ─────────────────────────────────────────────
  {
    slug: "quickbooks-online",
    name: "QuickBooks Online",
    tagline: "Real-time client books context + proactive monthly close prep",
    category: "accounting",
    categoryLabel: "Accounting",
    vertical: "accounting",
    verticalLabel: "Accounting firms",
    status: "beta",
    statusLabel: "Beta — available to Founding Members",
    whatItDoes:
      "Practiq connects to QuickBooks Online via OAuth, pulls client book data every 4 hours, and surfaces anomalies, close readiness, and trend shifts so your CPAs don't have to log in to each client file to find out.",
    capabilities: [
      "Per-client book connection via QuickBooks OAuth (one-time setup)",
      "Automatic 4-hour sync of transactions, accounts, and P&L snapshots",
      "Anomaly detection across categorizations, unusual amounts, and split-account drift",
      "Monthly close readiness scoring — which clients are 100% ready vs blocking on doc X",
      "Trend shift alerts (e.g., revenue concentration change, expense anomaly)",
      "Per-client context briefing auto-generated before partner touchpoints",
    ],
    dataFlowDirection: "read",
    useCases: [
      {
        title: "Before a client meeting",
        description:
          "Partner walks into the Thursday check-in with a 30-second briefing: what changed since last meeting, what's anomalous this month, what close-blocking issues exist.",
      },
      {
        title: "Monthly close preparation",
        description:
          "Close starts on day 25 of the month with a pre-built list of which clients are blocking on documents, which are ready to close immediately, and which have unusual activity to review.",
      },
      {
        title: "Tax season triage",
        description:
          "Mid-January, Practiq surfaces which client files have incomplete 1099 data, which have anomalous entries that need investigation, and which are ready to compile.",
      },
    ],
    setupTime: "15 minutes per client (OAuth + initial sync)",
    prerequisites: [
      "QuickBooks Online Accountant account",
      "Client must approve accountant access (standard QBO workflow)",
      "Practiq early-access account",
    ],
    competitorNote:
      "Most firms currently use QuickBooks Online Accountant + TaxDome + Excel as their context management stack. Practiq adds an AI-native layer on top of this existing stack — it doesn't replace QuickBooks or TaxDome.",
    pricingNote:
      "QuickBooks Online Accountant pricing is your responsibility (typically free or included for accountants). Practiq early-access is free for Founding Members.",
    metaDescription:
      "Practiq + QuickBooks Online integration — real-time client books context, monthly close readiness scoring, and anomaly detection for small CPA firms.",
  },
  {
    slug: "xero",
    name: "Xero",
    tagline: "Multi-client Xero book context with weekly close readiness",
    category: "accounting",
    categoryLabel: "Accounting",
    vertical: "accounting",
    verticalLabel: "Accounting firms",
    status: "roadmap",
    statusLabel: "Roadmap — Q2 2026",
    whatItDoes:
      "Practiq's Xero integration will mirror QuickBooks Online capabilities: OAuth-based per-client sync, anomaly detection, monthly close readiness, and pre-meeting briefings.",
    capabilities: [
      "Xero OAuth per-client connection",
      "4-hour sync cadence (same as QBO integration)",
      "Multi-entity support for holding-company structures common in Xero-heavy markets",
      "Weekly close readiness dashboard for firms doing more than monthly close",
      "Currency-aware anomaly detection for multi-currency Xero files",
    ],
    dataFlowDirection: "read",
    useCases: [
      {
        title: "Australian & UK firm support",
        description:
          "Firms running Xero-dominant books (common in AU/UK/NZ markets) get the same Practiq context layer as QBO-heavy US firms.",
      },
      {
        title: "Multi-entity client context",
        description:
          "Holding-company or consolidated structures map to Xero's tracking categories; Practiq surfaces consolidated and entity-level context.",
      },
    ],
    setupTime: "15 minutes per client when live",
    prerequisites: ["Xero Partner account"],
    pricingNote: "Xero Partner pricing is separate. Practiq early-access is free for Founding Members.",
    metaDescription:
      "Practiq + Xero integration (roadmap Q2 2026) — per-client book context, monthly close readiness, and anomaly detection for Xero-heavy firms.",
  },

  // ─── LAW ─────────────────────────────────────────────
  {
    slug: "clio",
    name: "Clio",
    tagline: "Matter context surfacing across your Clio matters",
    category: "case-mgmt",
    categoryLabel: "Legal Practice Management",
    vertical: "law",
    verticalLabel: "Law firms",
    status: "beta",
    statusLabel: "Beta — available to Founding Members",
    whatItDoes:
      "Practiq connects to Clio Manage via Clio's REST API, reads matter metadata, time entries, document activity, and deadline data, and surfaces the matter-level context each attorney would otherwise reconstruct at the start of every matter touchpoint.",
    capabilities: [
      "Clio Manage OAuth connection (one-time, firm-level)",
      "Matter context pulled every 2 hours across all active matters",
      "Deadline surfacing with risk scoring (what's due when, what's likely to slip)",
      "Time entry anomaly detection (missing hours, stale entries, under-reporting)",
      "Pre-meeting matter briefings automatically generated before each calendar event",
      "Conflict-check workflow augmentation",
    ],
    dataFlowDirection: "read",
    useCases: [
      {
        title: "Before walking into court",
        description:
          "Attorney gets a 1-minute matter briefing before every court appearance: last activity, upcoming deadlines, document status, client communication history.",
      },
      {
        title: "Deadline triage Monday morning",
        description:
          "Monday starts with a prioritized list of the 5-7 deadlines that week, which documents are ready, and which require attorney attention vs paralegal follow-up.",
      },
      {
        title: "Handoff between attorneys",
        description:
          "When a matter transitions between attorneys (parental leave, promotion, reassignment), incoming attorney gets full matter context without spending 3-4 hours reading files.",
      },
    ],
    setupTime: "30 minutes for firm-level OAuth + initial sync",
    prerequisites: [
      "Clio Manage account (any tier)",
      "Firm administrator access for OAuth setup",
      "Practiq early-access account",
    ],
    competitorNote:
      "Practiq doesn't replace Clio. Clio remains the system of record for matters, billing, and documents. Practiq adds an AI-native context layer that reads Clio data and surfaces pattern-level insights.",
    pricingNote:
      "Clio subscription required (your existing Clio pricing). Practiq early-access is free for Founding Members.",
    metaDescription:
      "Practiq + Clio integration — matter-level AI context for small law firms. Deadline risk scoring, pre-meeting briefings, and handoff support.",
  },
  {
    slug: "mycase",
    name: "MyCase",
    tagline: "MyCase matter context with billing anomaly detection",
    category: "case-mgmt",
    categoryLabel: "Legal Practice Management",
    vertical: "law",
    verticalLabel: "Law firms",
    status: "roadmap",
    statusLabel: "Roadmap — Q2 2026",
    whatItDoes:
      "MyCase integration will mirror the Clio integration: matter context sync, deadline risk scoring, billing anomaly detection, and pre-meeting briefings — built on MyCase's API.",
    capabilities: [
      "MyCase API connection (firm-level OAuth)",
      "Matter activity sync every 2 hours",
      "Billing anomaly detection (MyCase's LEDES invoicing is deep — we augment it)",
      "Trust accounting surveillance for IOLTA compliance alerts",
      "Lead-to-matter conversion tracking (MyCase is strong on lead pipelines)",
    ],
    dataFlowDirection: "read",
    useCases: [
      {
        title: "IOLTA compliance monitoring",
        description:
          "Practiq watches trust account activity for compliance risk signals (comingling, delays in disbursement, small anomalies) before they become state bar issues.",
      },
      {
        title: "Insurance defense billing acceleration",
        description:
          "For firms doing LEDES invoicing, Practiq pre-reviews time entries against LEDES rules so billing cycles don't bottleneck on rejection corrections.",
      },
    ],
    setupTime: "30 minutes when live",
    prerequisites: ["MyCase account"],
    pricingNote: "MyCase subscription separate. Practiq early-access is free for Founding Members.",
    metaDescription:
      "Practiq + MyCase integration (roadmap Q2 2026) — matter context, IOLTA surveillance, and LEDES billing acceleration for small law firms.",
  },

  // ─── HR ─────────────────────────────────────────────
  {
    slug: "gusto",
    name: "Gusto",
    tagline: "Multi-client Gusto payroll context for HR advisors",
    category: "payroll-hris",
    categoryLabel: "Payroll + HRIS",
    vertical: "hr",
    verticalLabel: "HR advisory firms",
    status: "beta",
    statusLabel: "Beta — available to Founding Members",
    whatItDoes:
      "Practiq connects to Gusto via the Gusto Partner API, reads per-client company payroll data, surfaces compliance anomalies across your book, and gives HR advisors multi-client context without logging into each Gusto instance.",
    capabilities: [
      "Gusto Partner OAuth connection (firm-level)",
      "Per-client payroll sync every 8 hours",
      "Multi-state compliance surveillance across all your clients' footprints",
      "Pay transparency law change detection (surfaces which client states + bands are affected)",
      "Benefits renewal timeline surfacing for all client companies",
      "Payroll anomaly detection (unusual hours, missed bonuses, tax withholding drift)",
    ],
    dataFlowDirection: "read",
    useCases: [
      {
        title: "Multi-state compliance triage",
        description:
          "When California updates a sick-leave rule, Practiq surfaces which of your 12 client companies have employees in California and what the specific exposure looks like per client.",
      },
      {
        title: "Benefits renewal season (Oct-Dec)",
        description:
          "Practiq surfaces all your clients' benefits renewal timelines in one view with upcoming decisions, rate changes, and enrollment windows — so you stop losing track of which client is renewing when.",
      },
      {
        title: "Quarterly compliance audit",
        description:
          "Pre-generated per-client compliance audit across wage, sick leave, pay transparency, and final paycheck rules by state.",
      },
    ],
    setupTime: "45 minutes for firm-level Gusto Partner setup",
    prerequisites: [
      "Gusto Partner account",
      "Client companies must grant you partner access (standard Gusto workflow)",
      "Practiq early-access account",
    ],
    competitorNote:
      "Gusto remains the payroll system of record. Practiq reads from Gusto to build the multi-client context layer HR advisors manage in spreadsheets today.",
    pricingNote:
      "Gusto pricing is your responsibility (per-client based on Gusto tiers). Practiq early-access free for Founding Members.",
    metaDescription:
      "Practiq + Gusto integration — multi-client payroll context for HR advisors. Multi-state compliance surveillance and benefits renewal tracking.",
  },
  {
    slug: "rippling",
    name: "Rippling",
    tagline: "Rippling-powered multi-entity HR context for advisors",
    category: "payroll-hris",
    categoryLabel: "Payroll + HRIS",
    vertical: "hr",
    verticalLabel: "HR advisory firms",
    status: "roadmap",
    statusLabel: "Roadmap — Q3 2026",
    whatItDoes:
      "Rippling integration will mirror Gusto's capabilities with added depth on IT + device management signals (since Rippling's HR + IT unified model is a distinct data source).",
    capabilities: [
      "Rippling API connection (firm-level)",
      "Per-client company sync with HR + IT + device data",
      "Onboarding/offboarding checklist surveillance",
      "Multi-state compliance (same as Gusto integration)",
      "Equity + RSU vesting timeline tracking for clients on Rippling Equity",
    ],
    dataFlowDirection: "read",
    useCases: [
      {
        title: "Rippling-heavy client portfolios",
        description:
          "HR advisors serving tech companies often have majority-Rippling client books. This integration lets them manage that portfolio in Practiq without tab-switching.",
      },
      {
        title: "Unified HR + IT onboarding oversight",
        description:
          "Rippling's integrated model means HR advisors can track whether laptops shipped, accounts provisioned, and onboarding completed — all from Practiq's cross-client dashboard.",
      },
    ],
    setupTime: "45 minutes when live",
    prerequisites: ["Rippling account"],
    pricingNote: "Rippling pricing separate. Practiq early-access free for Founding Members.",
    metaDescription:
      "Practiq + Rippling integration (roadmap Q3 2026) — multi-client HR context including IT + equity signals for HR advisors.",
  },

  // ─── CONSULTING / AGENCY ─────────────────────────────────────────────
  {
    slug: "hubspot",
    name: "HubSpot",
    tagline: "HubSpot CRM data surfaced per client engagement",
    category: "crm",
    categoryLabel: "CRM",
    vertical: "cross",
    verticalLabel: "Agencies & consulting firms",
    status: "roadmap",
    statusLabel: "Roadmap — Q2 2026",
    whatItDoes:
      "Practiq connects to HubSpot CRM to pull client pipeline, contact activity, and engagement history so account managers and consultants don't lose sight of the sales-to-delivery handoff.",
    capabilities: [
      "HubSpot private app connection",
      "Deal and contact sync every 4 hours",
      "Engagement stage transition tracking",
      "Pipeline velocity and stage conversion signals per client",
      "Account-level activity surfacing (meetings, emails, document exchanges)",
    ],
    dataFlowDirection: "read",
    useCases: [
      {
        title: "Sales-to-delivery handoff",
        description:
          "When a deal closes in HubSpot, Practiq automatically prepares the delivery team with full sales context: what was promised, stakeholders mapped, pricing negotiated, objections raised.",
      },
      {
        title: "Renewal risk signals",
        description:
          "For retainer clients, Practiq surfaces engagement-velocity changes in HubSpot (fewer meetings booked, longer email reply times) as early warning signals for renewal risk.",
      },
    ],
    setupTime: "20 minutes",
    prerequisites: ["HubSpot account (any tier)"],
    pricingNote: "HubSpot pricing separate. Practiq early-access free for Founding Members.",
    metaDescription:
      "Practiq + HubSpot integration (roadmap Q2 2026) — sales-to-delivery handoff context and renewal risk signals for consulting firms and agencies.",
  },
  {
    slug: "monday",
    name: "Monday",
    tagline: "Monday project status surfaced in client context view",
    category: "project-mgmt",
    categoryLabel: "Project Management",
    vertical: "cross",
    verticalLabel: "Agencies & consulting firms",
    status: "roadmap",
    statusLabel: "Roadmap — Q3 2026",
    whatItDoes:
      "Practiq reads Monday board data per client account to surface deliverable status, deadline risk, and team capacity signals inside the Practiq client-context view.",
    capabilities: [
      "Monday API connection (firm-level)",
      "Board-to-client mapping (one Monday board = one client account)",
      "Item status sync every 2 hours",
      "Deadline risk scoring based on Monday's timeline + actual progress",
      "Team capacity view across all client boards",
    ],
    dataFlowDirection: "read",
    useCases: [
      {
        title: "Account manager Monday review",
        description:
          "AM opens Practiq Monday morning and sees cross-account deliverable status without opening Monday directly — which accounts are on-track, which are slipping, which need escalation.",
      },
    ],
    setupTime: "30 minutes when live",
    prerequisites: ["Monday account"],
    pricingNote: "Monday subscription separate. Practiq early-access free for Founding Members.",
    metaDescription:
      "Practiq + Monday integration (roadmap Q3 2026) — client account deliverable status and deadline risk scoring for agencies.",
  },
  {
    slug: "asana",
    name: "Asana",
    tagline: "Asana client project surfacing across retainer accounts",
    category: "project-mgmt",
    categoryLabel: "Project Management",
    vertical: "cross",
    verticalLabel: "Agencies & consulting firms",
    status: "roadmap",
    statusLabel: "Roadmap — Q3 2026",
    whatItDoes:
      "Asana integration mirrors Monday's capabilities — project-per-client mapping, deliverable status sync, deadline risk scoring — built on Asana's API.",
    capabilities: [
      "Asana API connection",
      "Project-to-client mapping",
      "Task status sync every 2 hours",
      "Deadline + dependency risk analysis",
      "Capacity surfacing across team members",
    ],
    dataFlowDirection: "read",
    useCases: [
      {
        title: "Consulting firm project triage",
        description:
          "Consulting firms running client engagements in Asana get the same cross-client oversight as those on Monday.",
      },
    ],
    setupTime: "30 minutes when live",
    prerequisites: ["Asana account"],
    pricingNote: "Asana subscription separate. Practiq early-access free for Founding Members.",
    metaDescription:
      "Practiq + Asana integration (roadmap Q3 2026) — project-per-client status and deadline surfacing for consulting firms.",
  },
  {
    slug: "slack",
    name: "Slack",
    tagline: "Slack channel intel surfaced per client context",
    category: "communication",
    categoryLabel: "Team Communication",
    vertical: "cross",
    verticalLabel: "All firms",
    status: "partner-requested",
    statusLabel: "Partner requested — taking early requests",
    whatItDoes:
      "Slack integration (when built) would read client-specific channels and DMs to surface conversation context, commitments made in Slack but not logged elsewhere, and team coordination signals.",
    capabilities: [
      "Slack Connect + private channel data access (with per-client scope)",
      "Conversation sentiment and signal extraction",
      "Commitment tracking (things said in Slack that matter but aren't in the system of record)",
      "Team coordination visibility",
    ],
    dataFlowDirection: "read",
    useCases: [
      {
        title: "Commitments-made-in-Slack surveillance",
        description:
          "The single biggest risk at small firms — commitments made in Slack that the client remembers and nobody else wrote down. Practiq surfaces these so they don't fall through the cracks.",
      },
    ],
    setupTime: "To be determined based on Slack scope model",
    prerequisites: ["Slack workspace"],
    pricingNote: "Slack subscription separate. Practiq early-access free for Founding Members.",
    metaDescription:
      "Practiq + Slack integration (partner-requested) — client conversation context and commitment tracking for small firms.",
  },
];

export function getIntegration(slug: string): Integration | undefined {
  return INTEGRATIONS.find((i) => i.slug === slug);
}
