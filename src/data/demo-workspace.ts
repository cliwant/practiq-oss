/**
 * Sample data for the read-only /demo/workspace experience.
 *
 * EVERYTHING in this file is fictional. No real CPA firms, no real
 * accounting clients, no real numbers. The dataset is designed to
 * feel plausible for a small boutique CPA firm (6 people, ~50 clients)
 * so a visitor can experience how Practiq would look once they're
 * actually using it — without having to sign up first.
 *
 * Every visible surface that renders this data MUST also display
 * "(Sample)" or a sticky banner. See ventures/.../src/app/demo/workspace/
 * for the consumer pages. If you change shapes here, also update
 * those page components.
 */

// ── Firm ────────────────────────────────────────────────────────────

export interface SampleFirm {
  name: string;
  size: string;
  industryFocus: string;
}

export const SAMPLE_FIRM: SampleFirm = {
  name: "Park Accounting Group (Sample)",
  size: "6 people",
  industryFocus: "Boutique CPA — restaurants, services, real estate, professional",
};

// ── Clients ─────────────────────────────────────────────────────────

export type ClientSector =
  | "restaurants"
  | "service"
  | "real-estate"
  | "professional"
  | "other";

export interface SampleClient {
  id: string;
  name: string;
  sector: ClientSector;
  industry: string;
  entityType: "S-Corp" | "C-Corp" | "LLC" | "Partnership" | "Sole Prop";
  monthlyRevenue: number;
  color: string;
  partner: "Jordan" | "Avery" | "Casey";
  staff: "Emily" | "Marcus" | "Priya";
  anomaly?: {
    severity: "high" | "medium" | "low";
    headline: string;
    detail: string;
  };
  closeStatus: "complete" | "in-progress" | "docs-pending";
  lastActivity: string;
}

const COLOR_BY_SECTOR: Record<ClientSector, string[]> = {
  restaurants: ["#f97316", "#ea580c", "#dc2626", "#b45309"],
  service: ["#3b82f6", "#2563eb", "#1d4ed8", "#0ea5e9"],
  "real-estate": ["#10b981", "#059669", "#047857", "#14b8a6"],
  professional: ["#8b5cf6", "#7c3aed", "#a855f7", "#6366f1"],
  other: ["#64748b", "#475569", "#52525b"],
};

function pickColor(sector: ClientSector, idx: number): string {
  const palette = COLOR_BY_SECTOR[sector];
  return palette[idx % palette.length];
}

// 50 fictional clients. Deliberately non-stereotypical names, varied
// entity types, plausible revenue distributions for a boutique CPA's
// book of business.
const RAW_CLIENTS: Omit<SampleClient, "id" | "color">[] = [
  // Restaurants / F&B (15 — 30%)
  { name: "Northwind Kitchen", sector: "restaurants", industry: "Casual Dining", entityType: "S-Corp", monthlyRevenue: 142_000, partner: "Jordan", staff: "Emily", closeStatus: "in-progress", lastActivity: "3h ago", anomaly: { severity: "high", headline: "Unusual cash outflow $8,500", detail: "Tuesday disbursement is 4x your usual $2,100 daily average. Possibly a month-end supplier settlement, but the vendor record is missing." } },
  { name: "Bramble Cafe", sector: "restaurants", industry: "Coffee Shop", entityType: "LLC", monthlyRevenue: 38_000, partner: "Jordan", staff: "Emily", closeStatus: "complete", lastActivity: "Yesterday" },
  { name: "Atlas Pizzeria", sector: "restaurants", industry: "Quick Service", entityType: "S-Corp", monthlyRevenue: 92_000, partner: "Avery", staff: "Marcus", closeStatus: "complete", lastActivity: "2d ago" },
  { name: "Foundry Tap House", sector: "restaurants", industry: "Brewpub", entityType: "LLC", monthlyRevenue: 178_000, partner: "Jordan", staff: "Emily", closeStatus: "in-progress", lastActivity: "5h ago" },
  { name: "Sage & Honey Bakery", sector: "restaurants", industry: "Bakery", entityType: "Sole Prop", monthlyRevenue: 24_000, partner: "Avery", staff: "Priya", closeStatus: "docs-pending", lastActivity: "4d ago" },
  { name: "Riverbend BBQ", sector: "restaurants", industry: "Casual Dining", entityType: "S-Corp", monthlyRevenue: 156_000, partner: "Avery", staff: "Marcus", closeStatus: "complete", lastActivity: "3d ago" },
  { name: "Quill & Crumb", sector: "restaurants", industry: "Bistro", entityType: "LLC", monthlyRevenue: 88_000, partner: "Jordan", staff: "Emily", closeStatus: "in-progress", lastActivity: "1d ago" },
  { name: "Glacier Juice Bar", sector: "restaurants", industry: "Juice / Smoothie", entityType: "LLC", monthlyRevenue: 19_500, partner: "Casey", staff: "Priya", closeStatus: "complete", lastActivity: "6h ago" },
  { name: "Tributary Tavern", sector: "restaurants", industry: "Pub", entityType: "S-Corp", monthlyRevenue: 121_000, partner: "Jordan", staff: "Marcus", closeStatus: "in-progress", lastActivity: "8h ago" },
  { name: "Cedar Hill Catering", sector: "restaurants", industry: "Catering", entityType: "LLC", monthlyRevenue: 67_000, partner: "Avery", staff: "Emily", closeStatus: "docs-pending", lastActivity: "5d ago" },
  { name: "Mosaic Noodle Bar", sector: "restaurants", industry: "Casual Dining", entityType: "S-Corp", monthlyRevenue: 104_000, partner: "Jordan", staff: "Emily", closeStatus: "complete", lastActivity: "1d ago" },
  { name: "Lantern & Ladle", sector: "restaurants", industry: "Fine Dining", entityType: "LLC", monthlyRevenue: 215_000, partner: "Casey", staff: "Marcus", closeStatus: "in-progress", lastActivity: "2h ago" },
  { name: "Bowline Seafood Co", sector: "restaurants", industry: "Seafood", entityType: "S-Corp", monthlyRevenue: 134_000, partner: "Casey", staff: "Marcus", closeStatus: "complete", lastActivity: "2d ago" },
  { name: "Hearth & Halo Pizzas", sector: "restaurants", industry: "Quick Service", entityType: "LLC", monthlyRevenue: 71_000, partner: "Avery", staff: "Priya", closeStatus: "complete", lastActivity: "3d ago" },
  { name: "Vesper Wine Bar", sector: "restaurants", industry: "Wine Bar", entityType: "LLC", monthlyRevenue: 58_000, partner: "Casey", staff: "Emily", closeStatus: "in-progress", lastActivity: "12h ago" },

  // Service businesses (12 — 25%)
  { name: "Quartz Cleaning Co", sector: "service", industry: "Cleaning", entityType: "LLC", monthlyRevenue: 31_000, partner: "Avery", staff: "Priya", closeStatus: "complete", lastActivity: "2d ago" },
  { name: "Harbor HVAC", sector: "service", industry: "HVAC", entityType: "S-Corp", monthlyRevenue: 112_000, partner: "Jordan", staff: "Marcus", closeStatus: "in-progress", lastActivity: "1d ago", anomaly: { severity: "medium", headline: "Reconciliation unmatched: $4,200", detail: "QB transaction dated 3/1 but bank statement shows pending. Likely a Stripe payout that hasn't cleared." } },
  { name: "Beacon Plumbing", sector: "service", industry: "Plumbing", entityType: "S-Corp", monthlyRevenue: 86_000, partner: "Casey", staff: "Marcus", closeStatus: "complete", lastActivity: "4h ago" },
  { name: "Compass Detailing", sector: "service", industry: "Auto Detailing", entityType: "LLC", monthlyRevenue: 22_000, partner: "Avery", staff: "Priya", closeStatus: "docs-pending", lastActivity: "6d ago" },
  { name: "Tidewater Landscaping", sector: "service", industry: "Landscaping", entityType: "S-Corp", monthlyRevenue: 73_000, partner: "Avery", staff: "Emily", closeStatus: "complete", lastActivity: "2d ago" },
  { name: "Mainspring Pest Control", sector: "service", industry: "Pest Control", entityType: "LLC", monthlyRevenue: 45_000, partner: "Casey", staff: "Marcus", closeStatus: "in-progress", lastActivity: "9h ago" },
  { name: "Polaris Electricians", sector: "service", industry: "Electrical", entityType: "S-Corp", monthlyRevenue: 128_000, partner: "Jordan", staff: "Marcus", closeStatus: "in-progress", lastActivity: "3h ago" },
  { name: "Driftwood Movers", sector: "service", industry: "Moving", entityType: "LLC", monthlyRevenue: 54_000, partner: "Casey", staff: "Emily", closeStatus: "complete", lastActivity: "1d ago" },
  { name: "Aperture Photography Studio", sector: "service", industry: "Photography", entityType: "Sole Prop", monthlyRevenue: 12_500, partner: "Avery", staff: "Priya", closeStatus: "complete", lastActivity: "5d ago" },
  { name: "Lattice Web Studio", sector: "service", industry: "Web Design", entityType: "LLC", monthlyRevenue: 28_000, partner: "Jordan", staff: "Emily", closeStatus: "complete", lastActivity: "6h ago" },
  { name: "Halcyon Spa", sector: "service", industry: "Day Spa", entityType: "LLC", monthlyRevenue: 49_000, partner: "Casey", staff: "Priya", closeStatus: "in-progress", lastActivity: "11h ago" },
  { name: "Kestrel Locksmiths", sector: "service", industry: "Locksmith", entityType: "LLC", monthlyRevenue: 18_000, partner: "Avery", staff: "Marcus", closeStatus: "complete", lastActivity: "2d ago" },

  // Real estate LLCs (10 — 20%)
  { name: "Westwind Holdings", sector: "real-estate", industry: "Residential Rental", entityType: "LLC", monthlyRevenue: 41_000, partner: "Casey", staff: "Marcus", closeStatus: "complete", lastActivity: "1d ago" },
  { name: "Brickyard Partners", sector: "real-estate", industry: "Commercial Lease", entityType: "Partnership", monthlyRevenue: 132_000, partner: "Casey", staff: "Marcus", closeStatus: "in-progress", lastActivity: "4h ago" },
  { name: "Driftless Property Co", sector: "real-estate", industry: "Mixed-use Lease", entityType: "LLC", monthlyRevenue: 58_000, partner: "Jordan", staff: "Emily", closeStatus: "complete", lastActivity: "3d ago" },
  { name: "Aurora Rentals LLC", sector: "real-estate", industry: "Short-Term Rental", entityType: "LLC", monthlyRevenue: 32_000, partner: "Avery", staff: "Priya", closeStatus: "docs-pending", lastActivity: "7d ago" },
  { name: "Thornbridge Realty Group", sector: "real-estate", industry: "Brokerage", entityType: "S-Corp", monthlyRevenue: 96_000, partner: "Casey", staff: "Marcus", closeStatus: "complete", lastActivity: "2d ago" },
  { name: "Maplecrest Estates", sector: "real-estate", industry: "Residential Rental", entityType: "LLC", monthlyRevenue: 27_500, partner: "Casey", staff: "Emily", closeStatus: "complete", lastActivity: "5d ago" },
  { name: "Sundial Property Mgmt", sector: "real-estate", industry: "Property Management", entityType: "LLC", monthlyRevenue: 68_000, partner: "Jordan", staff: "Marcus", closeStatus: "in-progress", lastActivity: "10h ago" },
  { name: "Heron Bay Lofts LLC", sector: "real-estate", industry: "Residential Rental", entityType: "LLC", monthlyRevenue: 38_500, partner: "Avery", staff: "Priya", closeStatus: "complete", lastActivity: "4d ago" },
  { name: "Cobblestone Partners", sector: "real-estate", industry: "Commercial Lease", entityType: "Partnership", monthlyRevenue: 84_000, partner: "Casey", staff: "Emily", closeStatus: "in-progress", lastActivity: "1d ago" },
  { name: "Linden Park Holdings", sector: "real-estate", industry: "Residential Rental", entityType: "LLC", monthlyRevenue: 51_000, partner: "Jordan", staff: "Marcus", closeStatus: "complete", lastActivity: "2d ago" },

  // Professional / Medical (8 — 15%)
  { name: "Verdant Family Medicine", sector: "professional", industry: "Medical Practice", entityType: "S-Corp", monthlyRevenue: 184_000, partner: "Jordan", staff: "Marcus", closeStatus: "in-progress", lastActivity: "2h ago", anomaly: { severity: "low", headline: "Provider compensation classification", detail: "March payroll allocation between guaranteed payments and W-2 wages doesn't match prior quarters." } },
  { name: "Glassford Dental", sector: "professional", industry: "Dental Practice", entityType: "S-Corp", monthlyRevenue: 92_000, partner: "Avery", staff: "Emily", closeStatus: "complete", lastActivity: "1d ago" },
  { name: "Carrington Law Group", sector: "professional", industry: "Law Firm", entityType: "Partnership", monthlyRevenue: 215_000, partner: "Casey", staff: "Marcus", closeStatus: "in-progress", lastActivity: "5h ago" },
  { name: "Junction Veterinary Clinic", sector: "professional", industry: "Veterinary", entityType: "S-Corp", monthlyRevenue: 78_000, partner: "Jordan", staff: "Emily", closeStatus: "complete", lastActivity: "3d ago" },
  { name: "Lighthouse Optometry", sector: "professional", industry: "Optometry", entityType: "LLC", monthlyRevenue: 56_000, partner: "Avery", staff: "Priya", closeStatus: "complete", lastActivity: "4d ago" },
  { name: "Truepoint Counseling", sector: "professional", industry: "Therapy Practice", entityType: "LLC", monthlyRevenue: 34_000, partner: "Casey", staff: "Emily", closeStatus: "docs-pending", lastActivity: "8d ago" },
  { name: "Foxglove Pediatric Dental", sector: "professional", industry: "Dental Practice", entityType: "S-Corp", monthlyRevenue: 108_000, partner: "Jordan", staff: "Marcus", closeStatus: "in-progress", lastActivity: "6h ago" },
  { name: "Anchorline Chiropractic", sector: "professional", industry: "Chiropractic", entityType: "LLC", monthlyRevenue: 41_000, partner: "Avery", staff: "Priya", closeStatus: "complete", lastActivity: "2d ago" },

  // Other (5 — 10%)
  { name: "Hollow Drum Records", sector: "other", industry: "Indie Music Label", entityType: "LLC", monthlyRevenue: 14_500, partner: "Casey", staff: "Priya", closeStatus: "complete", lastActivity: "6d ago" },
  { name: "Ember Outdoor Gear", sector: "other", industry: "E-commerce / Retail", entityType: "LLC", monthlyRevenue: 62_000, partner: "Jordan", staff: "Marcus", closeStatus: "in-progress", lastActivity: "9h ago" },
  { name: "Highwater Brewing Supply", sector: "other", industry: "Wholesale", entityType: "S-Corp", monthlyRevenue: 87_000, partner: "Avery", staff: "Emily", closeStatus: "complete", lastActivity: "1d ago" },
  { name: "Talisman Books & Press", sector: "other", industry: "Independent Publishing", entityType: "LLC", monthlyRevenue: 19_000, partner: "Casey", staff: "Priya", closeStatus: "complete", lastActivity: "3d ago" },
  { name: "Stonefield Apiary", sector: "other", industry: "Specialty Agriculture", entityType: "LLC", monthlyRevenue: 8_500, partner: "Avery", staff: "Priya", closeStatus: "docs-pending", lastActivity: "11d ago" },
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const SAMPLE_CLIENTS: SampleClient[] = RAW_CLIENTS.map((c, i) => ({
  ...c,
  id: slugify(c.name),
  color: pickColor(c.sector, i),
}));

// Pick a single showcase client to deep-link from the dashboard so
// visitors can see what a fully-populated client detail page looks like.
export const SHOWCASE_CLIENT_ID = SAMPLE_CLIENTS[0].id; // "northwind-kitchen"

// ── Overnight findings ──────────────────────────────────────────────

export interface OvernightFinding {
  category: "anomaly" | "draft-ready" | "reminder-queued" | "workflow";
  headline: string;
  detail: string;
  clientId?: string;
}

export const SAMPLE_OVERNIGHT_FINDINGS: OvernightFinding[] = [
  // Anomalies (3)
  { category: "anomaly", headline: "Unusual cash outflow at Northwind Kitchen", detail: "Tuesday disbursement $8,500 is 4x the typical daily average. Review supplier record.", clientId: "northwind-kitchen" },
  { category: "anomaly", headline: "Reconciliation unmatched at Harbor HVAC", detail: "$4,200 March 1 deposit hasn't cleared bank. Likely Stripe payout delay.", clientId: "harbor-hvac" },
  { category: "anomaly", headline: "Payroll classification drift at Verdant Family Medicine", detail: "March allocation between guaranteed payments and W-2 wages diverges from prior quarters.", clientId: "verdant-family-medicine" },
  // Drafts ready (8)
  { category: "draft-ready", headline: "March P&L draft for Bramble Cafe", detail: "AI generated based on QB sync. Awaiting your review." },
  { category: "draft-ready", headline: "March P&L draft for Atlas Pizzeria", detail: "AI generated based on QB sync. Awaiting your review." },
  { category: "draft-ready", headline: "Q1 estimated tax memo for Quill & Crumb", detail: "Worksheet + cover memo ready for partner sign-off." },
  { category: "draft-ready", headline: "Bank reconciliation for Polaris Electricians", detail: "97% auto-matched. 3 transactions flagged for review." },
  { category: "draft-ready", headline: "Property roll-up for Brickyard Partners", detail: "Mar 2026 rent roll + GL roll-up. Awaiting review." },
  { category: "draft-ready", headline: "March P&L draft for Tributary Tavern", detail: "AI generated based on QB sync. Awaiting your review." },
  { category: "draft-ready", headline: "Owner letter for Carrington Law Group", detail: "March performance summary, ready for partner sign-off." },
  { category: "draft-ready", headline: "1099 reconciliation pack for Riverbend BBQ", detail: "Vendor list cross-checked against QB. Two mismatches need owner input." },
  // Reminders queued (5)
  { category: "reminder-queued", headline: "Doc reminder: Sage & Honey Bakery", detail: "Missing March bank statements. Reminder drafted in your firm's voice." },
  { category: "reminder-queued", headline: "Doc reminder: Cedar Hill Catering", detail: "Missing March vendor receipts and 2 contractor 1099 forms." },
  { category: "reminder-queued", headline: "Doc reminder: Compass Detailing", detail: "Missing payroll register for the 3/15 pay period." },
  { category: "reminder-queued", headline: "Doc reminder: Aurora Rentals LLC", detail: "Missing March rent roll and property tax payment confirmation." },
  { category: "reminder-queued", headline: "Doc reminder: Truepoint Counseling", detail: "Missing March merchant statements (Square and Stripe)." },
];

export const SAMPLE_ANOMALIES = SAMPLE_OVERNIGHT_FINDINGS.filter(
  (f) => f.category === "anomaly",
);

// ── AI working now (animated) ───────────────────────────────────────

export interface AiWorkItem {
  label: string;
  detail: string;
  percent: number;
}

export const SAMPLE_AI_WORKING_NOW: AiWorkItem[] = [
  {
    label: "Scanning month-end transactions across all clients",
    detail: "32 of 50 clients checked",
    percent: 64,
  },
  {
    label: "Generating March financial statement drafts",
    detail: "8 of 12 drafts written",
    percent: 67,
  },
  {
    label: "Matching bank feeds against QB ledger entries",
    detail: "1,148 of 1,684 transactions auto-matched",
    percent: 68,
  },
];

// ── Approval queue ──────────────────────────────────────────────────

export interface ApprovalItem {
  id: string;
  clientId: string;
  title: string;
  type: "P&L" | "Tax Memo" | "Reconciliation" | "Owner Letter" | "1099 Pack" | "Reminder Email";
  aiConfidence: number; // 0-100
  deadline: string;
  preview: {
    summary: string;
    bullets: string[];
  };
}

export const SAMPLE_APPROVAL_ITEMS: ApprovalItem[] = [
  {
    id: "appr-001",
    clientId: "bramble-cafe",
    title: "Bramble Cafe — March P&L draft",
    type: "P&L",
    aiConfidence: 94,
    deadline: "Today",
    preview: {
      summary: "Revenue holding steady at $38K, food cost up 2pts vs February.",
      bullets: [
        "Revenue $38,200 (+3% MoM)",
        "COGS 33.4% (vs 31.2% in Feb)",
        "Net margin 14.8%",
        "One uncategorized transaction ($420) needs owner classification",
      ],
    },
  },
  {
    id: "appr-002",
    clientId: "atlas-pizzeria",
    title: "Atlas Pizzeria — March P&L draft",
    type: "P&L",
    aiConfidence: 96,
    deadline: "Today",
    preview: {
      summary: "Strong month — revenue up 8%, labor cost ratio improved.",
      bullets: [
        "Revenue $92,400 (+8% MoM)",
        "Food cost 29.1% (industry healthy)",
        "Labor cost 31.5% (down from 33.8%)",
        "Net margin 17.2%",
      ],
    },
  },
  {
    id: "appr-003",
    clientId: "quill-crumb",
    title: "Quill & Crumb — Q1 estimated tax memo",
    type: "Tax Memo",
    aiConfidence: 88,
    deadline: "Apr 12 (3 days)",
    preview: {
      summary: "Q1 estimate based on TTM earnings + 110% safe harbor.",
      bullets: [
        "Q1 federal estimate: $11,400",
        "State estimate: $2,150",
        "Confidence 88% — owner's W-2 wages not yet confirmed",
        "Sources: QB GL, prior year 1040, March payroll register",
      ],
    },
  },
  {
    id: "appr-004",
    clientId: "polaris-electricians",
    title: "Polaris Electricians — March bank reconciliation",
    type: "Reconciliation",
    aiConfidence: 91,
    deadline: "Today",
    preview: {
      summary: "97% auto-matched. 3 transactions flagged for review.",
      bullets: [
        "1,184 of 1,221 transactions matched",
        "3 ambiguous: 2 vendor refunds + 1 owner draw",
        "Bank balance reconciles to $0 difference",
        "Suggested journal entries attached",
      ],
    },
  },
  {
    id: "appr-005",
    clientId: "brickyard-partners",
    title: "Brickyard Partners — Mar property roll-up",
    type: "P&L",
    aiConfidence: 92,
    deadline: "Apr 10",
    preview: {
      summary: "8-property roll-up. One tenant in arrears flagged.",
      bullets: [
        "Total rent collected: $128,400",
        "Maintenance expense $9,200 (within budget)",
        "Vacancy rate 6.2% (vs 5.5% target)",
        "Tenant in Unit 4B — 21 days past due, automated reminder ready",
      ],
    },
  },
  {
    id: "appr-006",
    clientId: "tributary-tavern",
    title: "Tributary Tavern — March P&L draft",
    type: "P&L",
    aiConfidence: 93,
    deadline: "Today",
    preview: {
      summary: "Revenue +12%, but liquor cost ratio creeping up.",
      bullets: [
        "Revenue $121,000 (+12% MoM)",
        "Food cost 30.8%",
        "Liquor cost 28.4% (vs 25-26% historical)",
        "Owner notes mentioned bourbon supplier change — likely cause",
      ],
    },
  },
  {
    id: "appr-007",
    clientId: "carrington-law-group",
    title: "Carrington Law Group — Owner letter draft",
    type: "Owner Letter",
    aiConfidence: 89,
    deadline: "Apr 8",
    preview: {
      summary: "Quarterly performance memo for managing partner review.",
      bullets: [
        "Revenue trending +18% YoY",
        "Realization rate 87.3% (industry top quartile)",
        "Two partner draws unusually timed — flagged for owner",
        "Tone matched to prior partner letters (data-forward, concise)",
      ],
    },
  },
  {
    id: "appr-008",
    clientId: "riverbend-bbq",
    title: "Riverbend BBQ — 1099 reconciliation pack",
    type: "1099 Pack",
    aiConfidence: 86,
    deadline: "Apr 15",
    preview: {
      summary: "Vendor list cross-checked. Two mismatches need owner input.",
      bullets: [
        "12 vendors qualify for 1099-NEC",
        "2 vendors missing W-9 — request drafted",
        "1 vendor's TIN doesn't match IRS lookup",
        "Total reportable: $47,800",
      ],
    },
  },
];

// ── Workflow progress ───────────────────────────────────────────────

export const SAMPLE_WORKFLOW_PROGRESS = {
  label: "March month-end close",
  complete: 8,
  total: 12,
  percent: 67,
  inProgress: 3,
  docsPending: 1,
};

// ── Helpers ─────────────────────────────────────────────────────────

export function getSampleClient(id: string): SampleClient | undefined {
  return SAMPLE_CLIENTS.find((c) => c.id === id);
}

export function getApprovalsForClient(clientId: string): ApprovalItem[] {
  return SAMPLE_APPROVAL_ITEMS.filter((a) => a.clientId === clientId);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}
