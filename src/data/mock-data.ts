// =============================================================================
// Mock Data — Fractional AI Command Center (AI-Native Agent Paradigm)
// =============================================================================
// Jennifer Hayes's firm: Meridian Accounting Group, 6 people, 120 clients
// =============================================================================

// ---------------------------------------------------------------------------
// Team
// ---------------------------------------------------------------------------
export interface TeamMember {
  id: string;
  name: string;
  initials: string;
  role: string;
  avatarColor: string;
  status: "online" | "away" | "offline";
  clientCount: number;
  completedThisWeek: number;
}

export const team: TeamMember[] = [
  { id: "jennifer", name: "Jennifer Hayes", initials: "JP", role: "Managing Partner, CPA", avatarColor: "#6366F1", status: "online", clientCount: 15, completedThisWeek: 8 },
  { id: "lisa", name: "Lisa Chen", initials: "LC", role: "Senior Accountant, CPA", avatarColor: "#EC4899", status: "online", clientCount: 35, completedThisWeek: 12 },
  { id: "mike", name: "Mike Rodriguez", initials: "MR", role: "Senior Accountant", avatarColor: "#F97316", status: "away", clientCount: 30, completedThisWeek: 9 },
  { id: "anna", name: "Anna Torres", initials: "AK", role: "Junior Accountant", avatarColor: "#14B8A6", status: "online", clientCount: 25, completedThisWeek: 7 },
  { id: "tom", name: "Tom Barrett", initials: "TL", role: "Admin / Billing", avatarColor: "#8B5CF6", status: "offline", clientCount: 10, completedThisWeek: 4 },
  { id: "sarah", name: "Sarah Walsh", initials: "SW", role: "Admin Support", avatarColor: "#EAB308", status: "offline", clientCount: 5, completedThisWeek: 3 },
];

export function getMember(id: string) {
  return team.find((m) => m.id === id)!;
}

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------
export type CloseStatus = "done" | "in-progress" | "ready" | "pending" | "blocked";
export type QBSyncStatus = "synced" | "stale" | "error" | "none";

/**
 * Generic status that replaces the accounting-specific QBSyncStatus in UI.
 * Every client in every vertical populates this.
 */
export type IntegrationStatus = "synced" | "stale" | "error" | "none";

export interface ClientWorkspace {
  id: string;
  /** Which firm owns this client. Added in Phase N.1 for multi-vertical support. */
  firmId?: string;
  name: string;
  shortName: string;
  industry: string;
  industryIcon: string;
  color: string;
  colorLight: string;
  entityType: string;
  assignedTo: string;

  // ── Generic multi-vertical fields (populated for every client) ──────────
  /** Generic integration sync status — replaces vertical-specific fields in UI. */
  integrationStatus?: IntegrationStatus;
  /** Human-readable integration name, e.g. "QuickBooks" | "Clio" | "HubSpot" | "Figma" | "BambooHR" */
  integrationLabel?: string;
  /** When the integration last synced, e.g. "Just now" | "2 days ago" */
  integrationLastSync?: string;
  /** Vertical-specific workflow phase id. Each vertical defines its own set. */
  workflowStatus?: string;
  /** Display label for the workflow status, e.g. "Discovery phase" | "In production" */
  workflowStatusLabel?: string;
  /** Optional note shown under the workflow status */
  workflowStatusNote?: string;

  // ── Accounting-specific fields (kept for Russo's Kitchen narrative) ────
  qbSync: QBSyncStatus;
  qbLastSync?: string;
  monthlyCloseStatus: CloseStatus;
  monthlyCloseNote?: string;

  metrics: Record<string, string>;
  contact: { name: string; email: string };
  preferences: { tone: string; reportStyle: string; frequency: string };
  monthlyFee: string;
  knowledgeCount: number;
  documentCount: number;
  conversationCount: number;
}

export const clients: ClientWorkspace[] = [
  {
    id: "russos-kitchen",
    name: "Russo's Kitchen",
    shortName: "KR",
    industry: "Food & Beverage",
    industryIcon: "🍽",
    color: "#F97316",
    colorLight: "#FFF7ED",
    entityType: "C-Corp",
    assignedTo: "jennifer",
    qbSync: "synced",
    qbLastSync: "Just now",
    monthlyCloseStatus: "ready",
    monthlyCloseNote: "QB synced, ready for March close",
    metrics: { "Monthly Revenue": "$28,400", "COGS": "31.2%", "Net Income": "$4,156", "AR Outstanding": "$4,200", "Employees": "8" },
    contact: { name: "Marco Russo", email: "marco@russoskitchen.com" },
    preferences: { tone: "casual", reportStyle: "simple P&L", frequency: "monthly" },
    monthlyFee: "$500",
    knowledgeCount: 47,
    documentCount: 23,
    conversationCount: 31,
  },
  {
    id: "techstart",
    name: "Ardmore Analytics",
    shortName: "AA",
    industry: "SaaS",
    industryIcon: "💻",
    color: "#3B82F6",
    colorLight: "#EFF6FF",
    entityType: "C-Corp",
    assignedTo: "jennifer",
    qbSync: "stale",
    qbLastSync: "2 days ago",
    monthlyCloseStatus: "blocked",
    monthlyCloseNote: "Unreconciled bank item ($4,200)",
    metrics: { "MRR": "$145,000", "Burn Rate": "$28K/mo", "Runway": "18 months", "AR Outstanding": "$18,000", "Employees": "12" },
    contact: { name: "Alex Cho", email: "alex@ardmoreanalytics.com" },
    preferences: { tone: "growth-focused", reportStyle: "investor-grade with MRR/ARR", frequency: "weekly" },
    monthlyFee: "$1,200",
    knowledgeCount: 62,
    documentCount: 34,
    conversationCount: 45,
  },
  {
    id: "downtown-medical",
    name: "Bayview Family Medicine",
    shortName: "BF",
    industry: "Medical Practice",
    industryIcon: "🏥",
    color: "#10B981",
    colorLight: "#ECFDF5",
    entityType: "Partnership",
    assignedTo: "lisa",
    qbSync: "synced",
    qbLastSync: "1 hour ago",
    monthlyCloseStatus: "in-progress",
    monthlyCloseNote: "Payroll entries needed",
    metrics: { "Monthly Revenue": "$92,000", "Providers": "3", "Patient Visits": "450/mo", "Insurance AR": "$24,500", "Employees": "11" },
    contact: { name: "Dr. James Chen", email: "jchen@bayviewfamilymed.com" },
    preferences: { tone: "professional", reportStyle: "revenue per provider", frequency: "monthly" },
    monthlyFee: "$800",
    knowledgeCount: 38,
    documentCount: 19,
    conversationCount: 22,
  },
  {
    id: "harbor-coffee",
    name: "Harbor Coffee Co.",
    shortName: "HC",
    industry: "Food & Beverage",
    industryIcon: "☕",
    color: "#92400E",
    colorLight: "#FFFBEB",
    entityType: "LLC",
    assignedTo: "mike",
    qbSync: "synced",
    qbLastSync: "3 hours ago",
    monthlyCloseStatus: "ready",
    metrics: { "Monthly Revenue": "$18,200", "COGS": "28.5%", "Net Income": "$2,840", "Locations": "2" },
    contact: { name: "Maria Santos", email: "maria@harborcoffee.com" },
    preferences: { tone: "casual", reportStyle: "simple", frequency: "monthly" },
    monthlyFee: "$400",
    knowledgeCount: 21,
    documentCount: 12,
    conversationCount: 15,
  },
  {
    id: "green-consulting",
    name: "Green Consulting",
    shortName: "GC",
    industry: "Consulting",
    industryIcon: "📊",
    color: "#6366F1",
    colorLight: "#EEF2FF",
    entityType: "S-Corp",
    assignedTo: "mike",
    qbSync: "synced",
    qbLastSync: "30 min ago",
    monthlyCloseStatus: "ready",
    monthlyCloseNote: "Invoice review pending",
    metrics: { "Monthly Revenue": "$34,000", "Utilization": "78%", "AR Outstanding": "$8,500", "Employees": "4" },
    contact: { name: "David Green", email: "david@greenconsulting.com" },
    preferences: { tone: "formal", reportStyle: "detailed with benchmarks", frequency: "monthly" },
    monthlyFee: "$600",
    knowledgeCount: 29,
    documentCount: 16,
    conversationCount: 18,
  },
  {
    id: "sunset-realty",
    name: "Sunset Realty Group",
    shortName: "SR",
    industry: "Real Estate",
    industryIcon: "🏠",
    color: "#8B5CF6",
    colorLight: "#F5F3FF",
    entityType: "LLC",
    assignedTo: "lisa",
    qbSync: "synced",
    qbLastSync: "1 hour ago",
    monthlyCloseStatus: "ready",
    monthlyCloseNote: "Loan balance review needed",
    metrics: { "Monthly Revenue": "$56,000", "Properties": "12", "Occupancy": "94%", "NOI": "$31,200" },
    contact: { name: "Rachel Kim", email: "rachel@sunsetrealty.com" },
    preferences: { tone: "professional", reportStyle: "property-level P&L", frequency: "monthly" },
    monthlyFee: "$700",
    knowledgeCount: 33,
    documentCount: 21,
    conversationCount: 19,
  },
  {
    id: "main-st-dental",
    name: "Main St Dental",
    shortName: "MD",
    industry: "Medical Practice",
    industryIcon: "🦷",
    color: "#06B6D4",
    colorLight: "#ECFEFF",
    entityType: "S-Corp",
    assignedTo: "anna",
    qbSync: "synced",
    qbLastSync: "2 hours ago",
    monthlyCloseStatus: "pending",
    metrics: { "Monthly Revenue": "$48,000", "Procedures": "220/mo", "Insurance AR": "$11,200" },
    contact: { name: "Dr. Susan Park", email: "susan@mainstdental.com" },
    preferences: { tone: "casual", reportStyle: "simple with charts", frequency: "monthly" },
    monthlyFee: "$500",
    knowledgeCount: 18,
    documentCount: 10,
    conversationCount: 12,
  },
  {
    id: "acme-logistics",
    name: "Sterling Route Freight",
    shortName: "SF",
    industry: "Transportation",
    industryIcon: "🚛",
    color: "#EF4444",
    colorLight: "#FEF2F2",
    entityType: "LLC",
    assignedTo: "anna",
    qbSync: "error",
    qbLastSync: "Failed 6 hours ago",
    monthlyCloseStatus: "blocked",
    monthlyCloseNote: "QB sync error — reconnect needed",
    metrics: { "Monthly Revenue": "$72,000", "Trucks": "8", "Fuel Cost": "22%", "AR Outstanding": "$15,800" },
    contact: { name: "James Park", email: "james@sterlingroute.com" },
    preferences: { tone: "direct", reportStyle: "fleet cost breakdown", frequency: "monthly" },
    monthlyFee: "$650",
    knowledgeCount: 25,
    documentCount: 14,
    conversationCount: 16,
  },
  {
    id: "bright-daycare",
    name: "Little Acorns Learning Center",
    shortName: "LA",
    industry: "Education",
    industryIcon: "🎓",
    color: "#EC4899",
    colorLight: "#FDF2F8",
    entityType: "LLC",
    assignedTo: "lisa",
    qbSync: "synced",
    qbLastSync: "Yesterday",
    monthlyCloseStatus: "done",
    metrics: { "Monthly Revenue": "$22,000", "Enrollment": "45", "Staff": "6" },
    contact: { name: "Jenny Oh", email: "jenny@littleacornslc.com" },
    preferences: { tone: "friendly", reportStyle: "simple", frequency: "monthly" },
    monthlyFee: "$350",
    knowledgeCount: 14,
    documentCount: 8,
    conversationCount: 9,
  },
  {
    id: "pacific-plumbing",
    name: "Pacific Plumbing",
    shortName: "PP",
    industry: "Home Services",
    industryIcon: "🔧",
    color: "#0EA5E9",
    colorLight: "#F0F9FF",
    entityType: "S-Corp",
    assignedTo: "mike",
    qbSync: "synced",
    qbLastSync: "Yesterday",
    monthlyCloseStatus: "done",
    metrics: { "Monthly Revenue": "$38,500", "Jobs Completed": "64", "Avg Ticket": "$602" },
    contact: { name: "Pete Nguyen", email: "pete@pacificplumbing.com" },
    preferences: { tone: "casual", reportStyle: "simple", frequency: "monthly" },
    monthlyFee: "$450",
    knowledgeCount: 16,
    documentCount: 11,
    conversationCount: 13,
  },
  {
    id: "chen-law",
    name: "Chen Law Office",
    shortName: "CL",
    industry: "Legal",
    industryIcon: "⚖️",
    color: "#475569",
    colorLight: "#F8FAFC",
    entityType: "LLC",
    assignedTo: "jennifer",
    qbSync: "synced",
    qbLastSync: "Yesterday",
    monthlyCloseStatus: "done",
    metrics: { "Monthly Revenue": "$42,000", "Billable Hours": "320", "Realization": "88%" },
    contact: { name: "Helen Chen", email: "helen@chenlaw.com" },
    preferences: { tone: "formal", reportStyle: "detailed", frequency: "monthly" },
    monthlyFee: "$600",
    knowledgeCount: 22,
    documentCount: 15,
    conversationCount: 14,
  },
  // Additional 19 clients for 50+ scenario realism
  { id: "valley-fitness", name: "Valley Fitness Studio", shortName: "VF", industry: "Health & Wellness", industryIcon: "💪", color: "#F59E0B", colorLight: "#FFFBEB", entityType: "LLC", assignedTo: "anna", qbSync: "synced", qbLastSync: "2 hours ago", monthlyCloseStatus: "ready", metrics: { "Monthly Revenue": "$26,500", "Members": "184", "Churn": "3.2%" }, contact: { name: "Marcus Lee", email: "marcus@valleyfitness.com" }, preferences: { tone: "casual", reportStyle: "simple", frequency: "monthly" }, monthlyFee: "$420", knowledgeCount: 18, documentCount: 11, conversationCount: 14 },
  { id: "northwind-design", name: "Northwind Design Co.", shortName: "ND", industry: "Creative Agency", industryIcon: "🎨", color: "#A855F7", colorLight: "#FAF5FF", entityType: "S-Corp", assignedTo: "lisa", qbSync: "synced", qbLastSync: "30 min ago", monthlyCloseStatus: "in-progress", metrics: { "Monthly Revenue": "$68,000", "Active Projects": "12", "Utilization": "82%" }, contact: { name: "Sophia Park", email: "sophia@northwind.design" }, preferences: { tone: "professional", reportStyle: "detailed", frequency: "monthly" }, monthlyFee: "$750", knowledgeCount: 31, documentCount: 19, conversationCount: 22 },
  { id: "redrock-construction", name: "Redrock Construction", shortName: "RC", industry: "Construction", industryIcon: "🏗", color: "#D97706", colorLight: "#FFFBEB", entityType: "LLC", assignedTo: "mike", qbSync: "synced", qbLastSync: "1 hour ago", monthlyCloseStatus: "blocked", monthlyCloseNote: "Job costing variance needs review", metrics: { "Monthly Revenue": "$215,000", "Active Jobs": "7", "Job Cost %": "68%" }, contact: { name: "Daniel Cruz", email: "dan@redrockconstruction.com" }, preferences: { tone: "direct", reportStyle: "job-cost breakdown", frequency: "monthly" }, monthlyFee: "$1,500", knowledgeCount: 42, documentCount: 28, conversationCount: 31 },
  { id: "silver-spoon", name: "Silver Spoon Catering", shortName: "SS", industry: "Food & Beverage", industryIcon: "🍴", color: "#DC2626", colorLight: "#FEF2F2", entityType: "LLC", assignedTo: "jennifer", qbSync: "synced", qbLastSync: "Just now", monthlyCloseStatus: "ready", metrics: { "Monthly Revenue": "$54,000", "Events": "23", "Food Cost %": "32%" }, contact: { name: "Linda Park", email: "linda@silverspooncatering.com" }, preferences: { tone: "casual", reportStyle: "simple", frequency: "monthly" }, monthlyFee: "$580", knowledgeCount: 24, documentCount: 16, conversationCount: 18 },
  { id: "horizon-tech", name: "Horizon Tech Labs", shortName: "HT", industry: "SaaS", industryIcon: "🚀", color: "#0EA5E9", colorLight: "#F0F9FF", entityType: "C-Corp", assignedTo: "lisa", qbSync: "synced", qbLastSync: "1 hour ago", monthlyCloseStatus: "in-progress", monthlyCloseNote: "Awaiting Stripe reconciliation", metrics: { "MRR": "$82,000", "Burn Rate": "$45K/mo", "Runway": "14 months", "Employees": "8" }, contact: { name: "Ryan Kim", email: "ryan@horizontech.io" }, preferences: { tone: "growth-focused", reportStyle: "investor-grade", frequency: "weekly" }, monthlyFee: "$1,100", knowledgeCount: 56, documentCount: 32, conversationCount: 41 },
  { id: "evergreen-landscaping", name: "Evergreen Landscaping", shortName: "EL", industry: "Home Services", industryIcon: "🌳", color: "#15803D", colorLight: "#F0FDF4", entityType: "LLC", assignedTo: "anna", qbSync: "stale", qbLastSync: "3 days ago", monthlyCloseStatus: "pending", metrics: { "Monthly Revenue": "$31,000", "Crews": "4", "Avg Job": "$485" }, contact: { name: "Carlos Rivera", email: "carlos@evergreenland.com" }, preferences: { tone: "casual", reportStyle: "simple", frequency: "monthly" }, monthlyFee: "$390", knowledgeCount: 14, documentCount: 9, conversationCount: 11 },
  { id: "bayside-yacht", name: "Bayside Yacht Brokers", shortName: "BY", industry: "Real Estate", industryIcon: "⛵", color: "#0891B2", colorLight: "#ECFEFF", entityType: "S-Corp", assignedTo: "jennifer", qbSync: "synced", qbLastSync: "5 hours ago", monthlyCloseStatus: "done", metrics: { "Monthly Revenue": "$128,000", "Sales": "3", "Commission": "$32K" }, contact: { name: "Vincent Ho", email: "vincent@baysideyacht.com" }, preferences: { tone: "professional", reportStyle: "detailed", frequency: "monthly" }, monthlyFee: "$950", knowledgeCount: 28, documentCount: 17, conversationCount: 19 },
  { id: "uptown-bakery", name: "Uptown Artisan Bakery", shortName: "UB", industry: "Food & Beverage", industryIcon: "🥐", color: "#B45309", colorLight: "#FFFBEB", entityType: "LLC", assignedTo: "anna", qbSync: "synced", qbLastSync: "Yesterday", monthlyCloseStatus: "done", metrics: { "Monthly Revenue": "$19,500", "COGS": "29%", "Customers": "1,240" }, contact: { name: "Emma Wilson", email: "emma@uptownbakery.com" }, preferences: { tone: "friendly", reportStyle: "simple", frequency: "monthly" }, monthlyFee: "$320", knowledgeCount: 12, documentCount: 7, conversationCount: 9 },
  { id: "westgate-auto", name: "Westgate Auto Repair", shortName: "WA", industry: "Home Services", industryIcon: "🚗", color: "#64748B", colorLight: "#F8FAFC", entityType: "LLC", assignedTo: "mike", qbSync: "synced", qbLastSync: "2 hours ago", monthlyCloseStatus: "ready", metrics: { "Monthly Revenue": "$45,000", "Jobs": "187", "Avg Ticket": "$240" }, contact: { name: "Tony Marsh", email: "tony@westgateauto.com" }, preferences: { tone: "direct", reportStyle: "simple", frequency: "monthly" }, monthlyFee: "$430", knowledgeCount: 17, documentCount: 11, conversationCount: 13 },
  { id: "cypress-veterinary", name: "Cypress Veterinary Clinic", shortName: "CV", industry: "Medical Practice", industryIcon: "🐾", color: "#16A34A", colorLight: "#F0FDF4", entityType: "Partnership", assignedTo: "lisa", qbSync: "synced", qbLastSync: "1 hour ago", monthlyCloseStatus: "in-progress", metrics: { "Monthly Revenue": "$78,000", "Patients": "340", "Revenue/Patient": "$229" }, contact: { name: "Dr. Amy Tanaka", email: "amy@cypressvet.com" }, preferences: { tone: "professional", reportStyle: "revenue per provider", frequency: "monthly" }, monthlyFee: "$680", knowledgeCount: 25, documentCount: 16, conversationCount: 18 },
  { id: "summit-coaching", name: "Summit Coaching Group", shortName: "SC", industry: "Consulting", industryIcon: "🎯", color: "#7C3AED", colorLight: "#F5F3FF", entityType: "S-Corp", assignedTo: "jennifer", qbSync: "synced", qbLastSync: "30 min ago", monthlyCloseStatus: "ready", metrics: { "Monthly Revenue": "$36,000", "Active Clients": "18", "Sessions": "92" }, contact: { name: "Olivia Stark", email: "olivia@summitcoaching.com" }, preferences: { tone: "warm", reportStyle: "simple", frequency: "monthly" }, monthlyFee: "$510", knowledgeCount: 19, documentCount: 12, conversationCount: 15 },
  { id: "lighthouse-pr", name: "Lighthouse PR Agency", shortName: "LP", industry: "Creative Agency", industryIcon: "📣", color: "#E11D48", colorLight: "#FFF1F2", entityType: "LLC", assignedTo: "lisa", qbSync: "stale", qbLastSync: "2 days ago", monthlyCloseStatus: "pending", monthlyCloseNote: "Client invoices not yet received", metrics: { "Monthly Revenue": "$58,000", "Clients": "14", "Margin": "42%" }, contact: { name: "James Walker", email: "james@lighthousepr.com" }, preferences: { tone: "professional", reportStyle: "detailed", frequency: "monthly" }, monthlyFee: "$720", knowledgeCount: 27, documentCount: 18, conversationCount: 21 },
  { id: "ironworks-gym", name: "Ironworks Gym", shortName: "IG", industry: "Health & Wellness", industryIcon: "🏋", color: "#1F2937", colorLight: "#F8FAFC", entityType: "LLC", assignedTo: "anna", qbSync: "synced", qbLastSync: "4 hours ago", monthlyCloseStatus: "done", metrics: { "Monthly Revenue": "$33,000", "Members": "275", "Trainers": "5" }, contact: { name: "Brandon Cole", email: "brandon@ironworks.fit" }, preferences: { tone: "casual", reportStyle: "simple", frequency: "monthly" }, monthlyFee: "$380", knowledgeCount: 15, documentCount: 9, conversationCount: 11 },
  { id: "velvet-events", name: "Velvet Events Co.", shortName: "VE", industry: "Creative Agency", industryIcon: "🎪", color: "#BE185D", colorLight: "#FDF2F8", entityType: "LLC", assignedTo: "mike", qbSync: "synced", qbLastSync: "1 hour ago", monthlyCloseStatus: "in-progress", metrics: { "Monthly Revenue": "$92,000", "Events": "8", "Avg Event": "$11.5K" }, contact: { name: "Natalia Romano", email: "natalia@velvetevents.com" }, preferences: { tone: "warm", reportStyle: "detailed", frequency: "monthly" }, monthlyFee: "$890", knowledgeCount: 33, documentCount: 22, conversationCount: 26 },
  { id: "arctic-hvac", name: "Arctic HVAC Services", shortName: "AH", industry: "Home Services", industryIcon: "❄", color: "#0284C7", colorLight: "#F0F9FF", entityType: "LLC", assignedTo: "mike", qbSync: "synced", qbLastSync: "Yesterday", monthlyCloseStatus: "ready", metrics: { "Monthly Revenue": "$67,000", "Service Calls": "143", "Avg Ticket": "$468" }, contact: { name: "Greg Hammond", email: "greg@arctichvac.com" }, preferences: { tone: "direct", reportStyle: "simple", frequency: "monthly" }, monthlyFee: "$580", knowledgeCount: 22, documentCount: 14, conversationCount: 17 },
  { id: "novacore-biotech", name: "Cobalt Therapeutics", shortName: "CT", industry: "SaaS", industryIcon: "🧬", color: "#9333EA", colorLight: "#FAF5FF", entityType: "C-Corp", assignedTo: "jennifer", qbSync: "synced", qbLastSync: "2 hours ago", monthlyCloseStatus: "in-progress", metrics: { "Monthly Revenue": "$245,000", "R&D Spend": "62%", "Runway": "22 months" }, contact: { name: "Dr. Yuki Tanaka", email: "yuki@cobalttx.com" }, preferences: { tone: "growth-focused", reportStyle: "investor-grade", frequency: "monthly" }, monthlyFee: "$1,800", knowledgeCount: 71, documentCount: 48, conversationCount: 56 },
  { id: "ridgeline-rentals", name: "Ridgeline Vacation Rentals", shortName: "RR", industry: "Real Estate", industryIcon: "🏔", color: "#0F766E", colorLight: "#F0FDFA", entityType: "LLC", assignedTo: "lisa", qbSync: "synced", qbLastSync: "3 hours ago", monthlyCloseStatus: "done", metrics: { "Monthly Revenue": "$84,000", "Properties": "18", "Occupancy": "78%" }, contact: { name: "Mia Anderson", email: "mia@ridgelinerentals.com" }, preferences: { tone: "professional", reportStyle: "property-level", frequency: "monthly" }, monthlyFee: "$820", knowledgeCount: 31, documentCount: 19, conversationCount: 22 },
  { id: "harbor-marine", name: "Harbor Marine Supply", shortName: "HM", industry: "Retail", industryIcon: "⚓", color: "#0369A1", colorLight: "#F0F9FF", entityType: "LLC", assignedTo: "anna", qbSync: "synced", qbLastSync: "Yesterday", monthlyCloseStatus: "done", metrics: { "Monthly Revenue": "$41,000", "Inventory Turn": "4.2x", "Margin": "38%" }, contact: { name: "Captain Bill Hayes", email: "bill@harbormarine.com" }, preferences: { tone: "casual", reportStyle: "simple", frequency: "monthly" }, monthlyFee: "$420", knowledgeCount: 16, documentCount: 10, conversationCount: 13 },
  { id: "luna-skincare", name: "Luna Skincare Co.", shortName: "LS", industry: "Retail", industryIcon: "✨", color: "#DB2777", colorLight: "#FDF2F8", entityType: "LLC", assignedTo: "lisa", qbSync: "synced", qbLastSync: "1 hour ago", monthlyCloseStatus: "ready", metrics: { "Monthly Revenue": "$52,000", "DTC %": "68%", "AOV": "$87" }, contact: { name: "Jasmine Chen", email: "jasmine@lunaskin.co" }, preferences: { tone: "warm", reportStyle: "detailed", frequency: "monthly" }, monthlyFee: "$640", knowledgeCount: 24, documentCount: 15, conversationCount: 18 },
];

export function getClient(id: string) {
  return clients.find((c) => c.id === id);
}

// ---------------------------------------------------------------------------
// Client groups — for sidebar grouping (50+ scenario)
// ---------------------------------------------------------------------------
export interface ClientGroup {
  id: string;
  label: string;
  clientIds: string[];
}

export type GroupBy = "priority" | "team" | "industry" | "status";

export function getClientGroups(groupBy: GroupBy): ClientGroup[] {
  if (groupBy === "priority") {
    const critical: string[] = [];
    const needsReview: string[] = [];
    const inProgress: string[] = [];
    const upToDate: string[] = [];

    clients.forEach((c) => {
      const hasAlert = attentionItems.some((a) => a.clientId === c.id);
      const hasPendingApproval = approvalQueue.some((a) => a.clientId === c.id && a.status === "pending");

      if (c.qbSync === "error" || c.monthlyCloseStatus === "blocked") {
        critical.push(c.id);
      } else if (hasAlert || hasPendingApproval) {
        needsReview.push(c.id);
      } else if (c.monthlyCloseStatus === "in-progress" || c.monthlyCloseStatus === "ready") {
        inProgress.push(c.id);
      } else {
        upToDate.push(c.id);
      }
    });

    return [
      { id: "critical", label: "Needs you now", clientIds: critical },
      { id: "review", label: "Pending review", clientIds: needsReview },
      { id: "progress", label: "In progress", clientIds: inProgress },
      { id: "ok", label: "Up to date", clientIds: upToDate },
    ].filter((g) => g.clientIds.length > 0);
  }

  if (groupBy === "team") {
    const byMember: Record<string, string[]> = {};
    clients.forEach((c) => {
      if (!byMember[c.assignedTo]) byMember[c.assignedTo] = [];
      byMember[c.assignedTo].push(c.id);
    });
    return Object.entries(byMember).map(([memberId, clientIds]) => ({
      id: memberId,
      label: getMember(memberId).name.split(" ")[0],
      clientIds,
    }));
  }

  if (groupBy === "industry") {
    const byIndustry: Record<string, string[]> = {};
    clients.forEach((c) => {
      if (!byIndustry[c.industry]) byIndustry[c.industry] = [];
      byIndustry[c.industry].push(c.id);
    });
    return Object.entries(byIndustry).map(([industry, clientIds]) => ({
      id: industry,
      label: industry,
      clientIds,
    }));
  }

  // status
  const byStatus: Record<string, string[]> = {};
  clients.forEach((c) => {
    if (!byStatus[c.monthlyCloseStatus]) byStatus[c.monthlyCloseStatus] = [];
    byStatus[c.monthlyCloseStatus].push(c.id);
  });
  return Object.entries(byStatus).map(([status, clientIds]) => ({
    id: status,
    label: status,
    clientIds,
  }));
}

// ---------------------------------------------------------------------------
// Needs Attention — AI-detected items requiring professional judgment
// ---------------------------------------------------------------------------
export type AttentionSeverity = "critical" | "high" | "medium" | "low";
export type AttentionType = "anomaly" | "deadline" | "blocked" | "low-confidence" | "review";

export interface AttentionItem {
  id: string;
  type: AttentionType;
  severity: AttentionSeverity;
  title: string;
  clientId: string;
  description: string;
  detectedAt: string;
  dueDate?: string;
  from?: string;
  aiConfidence?: number;
}

export const attentionItems: AttentionItem[] = [
  {
    id: "att-1",
    type: "anomaly",
    severity: "critical",
    title: "Unusual cash outflow $8,500",
    clientId: "techstart",
    description: "Stripe payment processing delay. QB shows 3/1, bank shows pending. Typical daily: $2,100. Needs manual reconciliation.",
    detectedAt: "3 hours ago",
    aiConfidence: 94,
  },
  {
    id: "att-2",
    type: "blocked",
    severity: "critical",
    title: "QuickBooks sync failed — reconnect needed",
    clientId: "acme-logistics",
    description: "QB connection failed 6 hours ago. March close cannot proceed until reconnected. API token may have expired.",
    detectedAt: "6 hours ago",
  },
  {
    id: "att-3",
    type: "review",
    severity: "high",
    title: "March P&L ready — food cost above benchmark",
    clientId: "russos-kitchen",
    from: "anna",
    description: "Anna prepared March close. Food cost 31.2% (benchmark: 30%). Meat/seafood $3,100 vs industry avg $2,950. Review needed.",
    detectedAt: "1 hour ago",
    aiConfidence: 91,
  },
  {
    id: "att-4",
    type: "deadline",
    severity: "high",
    title: "Q1 estimated tax — 3 clients unprepared",
    dueDate: "Apr 15",
    clientId: "",
    description: "Q1 estimated tax payments due for 8 clients. 5 prepared, 3 remaining: Ardmore, Sunset Realty, Green Consulting.",
    detectedAt: "Today",
  },
  {
    id: "att-5",
    type: "low-confidence",
    severity: "medium",
    title: "Payroll bonus accrual — needs judgment",
    clientId: "downtown-medical",
    from: "lisa",
    description: "Lisa flagged Bayview Family Medicine payroll entries. AI confidence 67% on bonus accrual classification. Needs Jennifer's decision.",
    detectedAt: "2 hours ago",
    aiConfidence: 67,
  },
];

// ---------------------------------------------------------------------------
// Approval Queue — Items ready for review/approval
// ---------------------------------------------------------------------------
export type ApprovalStatus = "pending" | "approved" | "changes-requested" | "in-review";
export type ApprovalFormat = "xlsx" | "docx" | "email" | "pdf";

export interface ApprovalQueueItem {
  id: string;
  clientId: string;
  title: string;
  format: ApprovalFormat;
  generatedBy: "ai" | "team";
  generatedByName?: string;
  aiConfidence: number;
  highlights: string[];
  status: ApprovalStatus;
  createdAt: string;
  waitingSince: string;
  version: number;
}

export const approvalQueue: ApprovalQueueItem[] = [
  {
    id: "aq-1",
    clientId: "russos-kitchen",
    title: "March Monthly Close — P&L + Balance Sheet",
    format: "xlsx",
    generatedBy: "ai",
    aiConfidence: 94,
    highlights: ["Food cost 31.2% (+1.2% vs benchmark)", "Energy cost +10% MoM"],
    status: "pending",
    createdAt: "Today 7:42 AM",
    waitingSince: "2h",
    version: 2,
  },
  {
    id: "aq-2",
    clientId: "downtown-medical",
    title: "Q1 Tax Summary — Partnership Return Draft",
    format: "docx",
    generatedBy: "ai",
    aiConfidence: 88,
    highlights: ["Provider compensation allocation needs review", "K-1 distributions calculated"],
    status: "pending",
    createdAt: "Today 6:30 AM",
    waitingSince: "3h",
    version: 1,
  },
  {
    id: "aq-3",
    clientId: "techstart",
    title: "Cash Flow Projection — Board Package",
    format: "xlsx",
    generatedBy: "team",
    generatedByName: "Lisa Chen",
    aiConfidence: 91,
    highlights: ["Runway calculation: 18 months", "Burn rate trending down 5%"],
    status: "pending",
    createdAt: "Yesterday 4:15 PM",
    waitingSince: "18h",
    version: 1,
  },
  {
    id: "aq-4",
    clientId: "harbor-coffee",
    title: "March Financial Statements",
    format: "xlsx",
    generatedBy: "ai",
    aiConfidence: 96,
    highlights: ["All metrics within normal range", "Revenue +3% MoM"],
    status: "pending",
    createdAt: "Today 7:15 AM",
    waitingSince: "2h",
    version: 1,
  },
  {
    id: "aq-5",
    clientId: "green-consulting",
    title: "Monthly Invoice Summary + Client Email",
    format: "email",
    generatedBy: "ai",
    aiConfidence: 93,
    highlights: ["AR $8,500 — 2 invoices overdue 30+", "Utilization down to 78%"],
    status: "pending",
    createdAt: "Today 8:00 AM",
    waitingSince: "1h",
    version: 1,
  },
  {
    id: "aq-6",
    clientId: "sunset-realty",
    title: "Property-Level P&L — March",
    format: "xlsx",
    generatedBy: "ai",
    aiConfidence: 89,
    highlights: ["Unit 5B vacancy impacting NOI", "Maintenance costs +8%"],
    status: "pending",
    createdAt: "Today 6:00 AM",
    waitingSince: "3h",
    version: 1,
  },
  {
    id: "aq-7",
    clientId: "russos-kitchen",
    title: "Client Email — March Financial Summary",
    format: "email",
    generatedBy: "ai",
    aiConfidence: 95,
    highlights: ["Tone: casual (per preference)", "Includes food cost warning"],
    status: "pending",
    createdAt: "Today 7:50 AM",
    waitingSince: "2h",
    version: 1,
  },
  {
    id: "aq-8",
    clientId: "main-st-dental",
    title: "March Reconciliation Summary",
    format: "xlsx",
    generatedBy: "team",
    generatedByName: "Anna Torres",
    aiConfidence: 90,
    highlights: ["Insurance AR review needed", "3 unmatched deposits"],
    status: "pending",
    createdAt: "Yesterday 5:30 PM",
    waitingSince: "16h",
    version: 1,
  },
];

// ---------------------------------------------------------------------------
// AI Working Now — Tasks AI is currently processing
// ---------------------------------------------------------------------------
export interface AITask {
  id: string;
  title: string;
  description: string;
  progress: number;
  total: number;
  unit: string;
  estimatedRemaining?: string;
  status: "running" | "paused" | "waiting-approval";
  issuesFound?: number;
  startedAt: string;
}

export const aiTasks: AITask[] = [
  {
    id: "ai-1",
    title: "Scanning QuickBooks for month-end close",
    description: "Checking transaction integrity and reconciliation status across all connected clients",
    progress: 40,
    total: 120,
    unit: "clients",
    estimatedRemaining: "2 hours",
    status: "running",
    issuesFound: 3,
    startedAt: "6:00 AM",
  },
  {
    id: "ai-2",
    title: "Generating March financial statements",
    description: "Creating P&L, Balance Sheet, and management summary drafts",
    progress: 15,
    total: 67,
    unit: "statements",
    estimatedRemaining: "1 hour",
    status: "running",
    startedAt: "7:00 AM",
  },
  {
    id: "ai-3",
    title: "Matching bank transactions",
    description: "Auto-categorizing and matching bank feed entries with QB records",
    progress: 847,
    total: 1234,
    unit: "transactions",
    status: "running",
    startedAt: "5:30 AM",
  },
  {
    id: "ai-4",
    title: "Preparing missing document reminders",
    description: "Draft emails ready for 8 clients with outstanding documents for Q1 filing",
    progress: 8,
    total: 8,
    unit: "emails",
    status: "waiting-approval",
    startedAt: "6:30 AM",
  },
  {
    id: "ai-5",
    title: "Learning pattern: Food cost reclassification",
    description: "Analyzing Jennifer's past approvals to build auto-classification rule",
    progress: 5,
    total: 5,
    unit: "instances",
    status: "waiting-approval",
    startedAt: "4:00 AM",
  },
];

// ---------------------------------------------------------------------------
// Completed Today — AI audit trail
// ---------------------------------------------------------------------------
export interface CompletedItem {
  id: string;
  title: string;
  detail: string;
  completedAt: string;
  category: "reconciliation" | "generation" | "communication" | "detection" | "learning";
  clientCount?: number;
  itemCount?: number;
}

export const completedToday: CompletedItem[] = [
  {
    id: "comp-1",
    title: "Reconciled 847 transactions",
    detail: "Matched with bank feeds across 15 clients. 0 discrepancies found.",
    completedAt: "8:15 AM",
    category: "reconciliation",
    clientCount: 15,
    itemCount: 847,
  },
  {
    id: "comp-2",
    title: "Generated 8 financial statement drafts",
    detail: "P&L + Balance Sheet for completed clients. Ready in Approval Queue.",
    completedAt: "7:42 AM",
    category: "generation",
    itemCount: 8,
  },
  {
    id: "comp-3",
    title: "Sent 5 reminder emails",
    detail: "Missing document notifications for Q1 tax prep. All auto-approved.",
    completedAt: "6:30 AM",
    category: "communication",
    itemCount: 5,
  },
  {
    id: "comp-4",
    title: "Detected 3 anomalies",
    detail: "Unusual transactions flagged and added to Needs Attention queue.",
    completedAt: "5:15 AM",
    category: "detection",
    itemCount: 3,
  },
  {
    id: "comp-5",
    title: "Learned food cost auto-classification",
    detail: "From Jennifer's 5 consecutive approvals on restaurant clients.",
    completedAt: "4:00 AM",
    category: "learning",
  },
  {
    id: "comp-6",
    title: "Updated QB sync for 42 clients",
    detail: "Pulled latest transactions and account balances from QuickBooks Online.",
    completedAt: "3:00 AM",
    category: "reconciliation",
    clientCount: 42,
  },
  {
    id: "comp-7",
    title: "Generated 3 tax estimate drafts",
    detail: "Q1 estimated tax calculations for Harbor Coffee, Main St Dental, Pacific Plumbing.",
    completedAt: "2:30 AM",
    category: "generation",
    itemCount: 3,
  },
  {
    id: "comp-8",
    title: "Archived 12 February documents",
    detail: "Moved approved February financials to archive with audit trail.",
    completedAt: "1:00 AM",
    category: "reconciliation",
    itemCount: 12,
  },
  {
    id: "comp-9",
    title: "Identified overdue AR for 4 clients",
    detail: "Flagged receivables aging 30+ days for Russo's Kitchen, Ardmore, Green Consulting, Sterling Route Freight.",
    completedAt: "12:30 AM",
    category: "detection",
    clientCount: 4,
  },
];

// ---------------------------------------------------------------------------
// Weekly Overview
// ---------------------------------------------------------------------------
export interface WeeklyOverview {
  monthlyClose: { completed: number; total: number; delta: number };
  taxSeason: { docsCollected: number; docsTotal: number; urgentReminders: number };
  teamWorkload: { memberId: string; completed: number; total: number }[];
  quality: { reworkRate: number; reworkRatePrev: number; aiConfidenceAvg: number; aiConfidencePrev: number };
  cost: { apiUsage: number; apiBudget: number; costPerClient: number; costTarget: number };
}

export const weeklyOverview: WeeklyOverview = {
  monthlyClose: { completed: 67, total: 120, delta: 15 },
  taxSeason: { docsCollected: 42, docsTotal: 85, urgentReminders: 12 },
  teamWorkload: [
    { memberId: "lisa", completed: 12, total: 35 },
    { memberId: "mike", completed: 9, total: 30 },
    { memberId: "anna", completed: 7, total: 25 },
    { memberId: "jennifer", completed: 8, total: 15 },
    { memberId: "tom", completed: 4, total: 10 },
  ],
  quality: { reworkRate: 3.2, reworkRatePrev: 4.1, aiConfidenceAvg: 91, aiConfidencePrev: 88 },
  cost: { apiUsage: 12, apiBudget: 50, costPerClient: 0.18, costTarget: 0.25 },
};

// ---------------------------------------------------------------------------
// Weekly stats (simplified, kept for backward compat)
// ---------------------------------------------------------------------------
export const weeklyStats = {
  totalClients: 120,
  dueThisWeek: 12,
  completed: 8,
  taxPrepRemaining: 3,
  teamHoursThisWeek: 142,
};

// ---------------------------------------------------------------------------
// Russo's Kitchen — AI Chat Messages
// ---------------------------------------------------------------------------
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  attachment?: { type: "document"; name: string; format: string };
}

export const russosKitchenChat: ChatMessage[] = [
  {
    id: "cm-1",
    role: "user",
    content: "Start the March close for Russo's Kitchen.",
    timestamp: "9:00 AM",
  },
  {
    id: "cm-2",
    role: "assistant",
    content: "Starting March close for Russo's Kitchen.\n\n**Checklist:**\n- **Bank reconciliation** — Complete (difference $0)\n- **Credit card reconciliation** — Complete (difference $0)\n- **Accounts receivable aging** — Reviewed ($4,200 outstanding, 30+ days)\n- **Accounts payable aging** — Reviewed ($6,200 outstanding)\n- **Inventory adjustment** — Needs your review\n- **Fixed asset depreciation** — Auto-calculated, needs approval\n- **Accrued payroll** — Auto-calculated\n\n**Key data:**\n- March transactions: 347\n- Unclassified: 0\n- Adjusting entries: 3 pending\n\nReady to generate the March P&L?",
    timestamp: "9:01 AM",
  },
  {
    id: "cm-3",
    role: "user",
    content: "Yes, generate March P&L and Balance Sheet. Same format as last month.",
    timestamp: "9:02 AM",
  },
  {
    id: "cm-4",
    role: "assistant",
    content: "Generated March financial statements for Russo's Kitchen.\n\n**Included:**\n- Profit & Loss Statement (revenue, expenses, net income)\n- Balance Sheet (assets, liabilities, equity)\n- Management summary (1 page)\n- Month-over-month comparison\n- Industry benchmark comparison (Food & Beverage)\n\n**Key findings:**\n- **Net income**: $4,156 (margin 14.6%)\n- **Food cost**: $8,832 (31.2%) — above 30% benchmark\n  - Meat/seafood: $3,100 (vs. industry avg $2,950)\n  - Vegetables: $2,800 (normal)\n  - Beverages: $2,932 (normal)\n- **Energy cost**: $2,100 — up 10% from February\n\n**Recommendation:**\n→ Review meat supplier pricing with Kim\n→ Check energy cost spike (seasonal or equipment issue?)\n\nReady to send to Kim, or would you like to edit first?",
    timestamp: "9:03 AM",
    attachment: { type: "document", name: "Russo's Kitchen_March_2026_Financials.xlsx", format: "xlsx" },
  },
  {
    id: "cm-5",
    role: "user",
    content: "Looks good. Draft the client email to send with this.",
    timestamp: "9:10 AM",
  },
  {
    id: "cm-6",
    role: "assistant",
    content: "Here's the client communication for Marco:\n\n---\n\n**Dear Marco,**\n\nYour March 2026 financial statements are ready for review.\n\n**Key Highlights:**\n- Revenue: $28,400 (up 12% from February)\n- Gross Margin: 68.8%\n- Net Income: $4,156 (14.6% profit margin)\n\n**Areas to Watch:**\n- Food Cost at 31.2% — slightly above industry average of 30%. I'd recommend we review your meat supplier pricing.\n- Energy costs increased 10% month-over-month. Worth checking for equipment issues.\n\nAttached: Complete financial statements for March.\n\nYour next quarterly tax estimate is due April 15. I'll prepare that memo next week.\n\nBest regards,\nJennifer Hayes, CPA\nMeridian Accounting Group\n\n---\n\nTone matched to Marco's preference (casual, direct). Shall I send or edit?",
    timestamp: "9:11 AM",
  },
];

// ---------------------------------------------------------------------------
// Russo's Kitchen — Close Checklist
// ---------------------------------------------------------------------------
export interface ChecklistItem {
  id: string;
  label: string;
  status: "done" | "pending" | "needs-review";
  detail?: string;
}

export const kimsCloseChecklist: ChecklistItem[] = [
  { id: "cl-1", label: "Bank reconciliation", status: "done", detail: "Difference $0" },
  { id: "cl-2", label: "Credit card reconciliation", status: "done", detail: "Difference $0" },
  { id: "cl-3", label: "Accounts receivable aging", status: "done", detail: "$4,200 outstanding (30+ days)" },
  { id: "cl-4", label: "Accounts payable aging", status: "done", detail: "$6,200 outstanding" },
  { id: "cl-5", label: "Inventory adjustment", status: "needs-review", detail: "Food inventory variance $340" },
  { id: "cl-6", label: "Fixed asset depreciation", status: "pending", detail: "Auto-calculated, needs approval" },
  { id: "cl-7", label: "Accrued payroll", status: "done", detail: "$9,200 recorded" },
];

// ---------------------------------------------------------------------------
// Upcoming deadlines
// ---------------------------------------------------------------------------
export interface UpcomingEvent {
  id: string;
  date: string;
  dateShort: string;
  title: string;
  clientId: string;
  type: "deadline" | "meeting" | "filing";
}

export const upcomingEvents: UpcomingEvent[] = [
  { id: "ev-1", date: "2026-04-07", dateShort: "Today", title: "Weekly team standup", clientId: "", type: "meeting" },
  { id: "ev-2", date: "2026-04-08", dateShort: "Apr 8", title: "March close deadline (batch 1)", clientId: "", type: "deadline" },
  { id: "ev-3", date: "2026-04-10", dateShort: "Apr 10", title: "Bayview Family Medicine payroll review", clientId: "downtown-medical", type: "meeting" },
  { id: "ev-4", date: "2026-04-15", dateShort: "Apr 15", title: "Q1 estimated tax payments (8 clients)", clientId: "", type: "filing" },
  { id: "ev-5", date: "2026-04-15", dateShort: "Apr 15", title: "Ardmore board package due", clientId: "techstart", type: "deadline" },
  { id: "ev-6", date: "2026-04-18", dateShort: "Apr 18", title: "March close deadline (batch 2)", clientId: "", type: "deadline" },
];

// ---------------------------------------------------------------------------
// Team activity
// ---------------------------------------------------------------------------
export interface ActivityItem {
  id: string;
  memberId: string;
  action: string;
  target: string;
  clientId: string;
  timeAgo: string;
}

export const activityFeed: ActivityItem[] = [
  { id: "act-1", memberId: "anna", action: "completed March close for", target: "Little Acorns", clientId: "bright-daycare", timeAgo: "1h ago" },
  { id: "act-2", memberId: "lisa", action: "flagged payroll entries for", target: "Bayview Family Medicine", clientId: "downtown-medical", timeAgo: "2h ago" },
  { id: "act-3", memberId: "mike", action: "generated P&L for", target: "Pacific Plumbing", clientId: "pacific-plumbing", timeAgo: "3h ago" },
  { id: "act-4", memberId: "jennifer", action: "approved March close for", target: "Chen Law Office", clientId: "chen-law", timeAgo: "4h ago" },
  { id: "act-5", memberId: "anna", action: "synced QuickBooks for", target: "Russo's Kitchen", clientId: "russos-kitchen", timeAgo: "5h ago" },
  { id: "act-6", memberId: "lisa", action: "generated tax estimate for", target: "Sunset Realty Group", clientId: "sunset-realty", timeAgo: "Yesterday" },
];

// ---------------------------------------------------------------------------
// Client-level AI Activity (for workspace overview tab)
// ---------------------------------------------------------------------------
export interface ClientAIActivity {
  id: string;
  clientId: string;
  action: string;
  detail: string;
  date: string;
  status: "completed" | "flagged" | "draft" | "note";
}

export const clientAIActivities: ClientAIActivity[] = [
  { id: "caa-1", clientId: "russos-kitchen", action: "Reconciled March bank transactions", detail: "347 transactions, 0 discrepancies", date: "Apr 5", status: "completed" },
  { id: "caa-2", clientId: "russos-kitchen", action: "Generated March P&L draft", detail: "Ready in Approval Queue (v2)", date: "Apr 5", status: "draft" },
  { id: "caa-3", clientId: "russos-kitchen", action: "Detected food cost variance", detail: "31.2% vs 30% benchmark (+1.2%)", date: "Apr 4", status: "flagged" },
  { id: "caa-4", clientId: "russos-kitchen", action: "Drafted payroll tax reminder", detail: "Q1 estimated tax due April 15", date: "Apr 3", status: "draft" },
  { id: "caa-5", clientId: "russos-kitchen", action: "AI chat note", detail: "Jennifer noted seasonal spike expected for food costs", date: "Apr 2", status: "note" },
  { id: "caa-6", clientId: "techstart", action: "Flagged unreconciled bank item", detail: "$4,200 Stripe payment mismatch", date: "Apr 5", status: "flagged" },
  { id: "caa-7", clientId: "techstart", action: "Generated cash flow projection", detail: "Board package draft ready", date: "Apr 4", status: "draft" },
  { id: "caa-8", clientId: "downtown-medical", action: "Reconciled February insurance payments", detail: "24 payments matched", date: "Apr 4", status: "completed" },
  { id: "caa-9", clientId: "downtown-medical", action: "Flagged payroll bonus accrual", detail: "Confidence 67% — needs judgment", date: "Apr 5", status: "flagged" },
];

// ---------------------------------------------------------------------------
// Client-level Documents (for workspace documents tab)
// ---------------------------------------------------------------------------
export interface ClientDocument {
  id: string;
  clientId: string;
  title: string;
  format: "xlsx" | "docx" | "pdf" | "email";
  source: "ai" | "uploaded" | "team";
  sourceName?: string;
  version: number;
  status: "approved" | "pending-review" | "draft" | "archived" | "ready-to-send";
  date: string;
  tags?: string[];
}

export const clientDocuments: ClientDocument[] = [
  { id: "doc-1", clientId: "russos-kitchen", title: "March Monthly Close (P&L + Balance Sheet)", format: "xlsx", source: "ai", version: 2, status: "pending-review", date: "Apr 5, 2026", tags: ["financial", "monthly-close"] },
  { id: "doc-2", clientId: "russos-kitchen", title: "February Monthly Close (P&L + Balance Sheet)", format: "xlsx", source: "ai", version: 1, status: "approved", date: "Mar 5, 2026", tags: ["financial", "monthly-close"] },
  { id: "doc-3", clientId: "russos-kitchen", title: "Q1 Payroll Tax Estimate", format: "docx", source: "ai", version: 1, status: "draft", date: "Apr 3, 2026", tags: ["tax"] },
  { id: "doc-4", clientId: "russos-kitchen", title: "2026 Lease Agreement", format: "pdf", source: "uploaded", version: 1, status: "archived", date: "Mar 1, 2026", tags: ["contract"] },
  { id: "doc-5", clientId: "russos-kitchen", title: "March Closing Reminder Email", format: "email", source: "ai", version: 1, status: "ready-to-send", date: "Apr 5, 2026", tags: ["communication"] },
  { id: "doc-6", clientId: "techstart", title: "Cash Flow Projection — Board Package", format: "xlsx", source: "team", sourceName: "Lisa Chen", version: 1, status: "pending-review", date: "Apr 4, 2026", tags: ["financial", "board"] },
  { id: "doc-7", clientId: "techstart", title: "February Investor Report", format: "docx", source: "ai", version: 1, status: "approved", date: "Mar 3, 2026", tags: ["financial", "investor"] },
  { id: "doc-8", clientId: "downtown-medical", title: "Q1 Tax Summary — Partnership Return Draft", format: "docx", source: "ai", version: 1, status: "pending-review", date: "Apr 5, 2026", tags: ["tax"] },
];

// ---------------------------------------------------------------------------
// Channels — multiple conversation threads
// ---------------------------------------------------------------------------
// A channel is either scoped to a specific client workspace (scope="client"),
// shared across the whole firm (scope="firm", e.g. #general), or a 1:1 DM
// between two team members (scope="dm"). The `type` field further describes
// client-scoped channels: a team thread, a 1:1-with-AI private, or a focused
// topic thread like "March monthly close".
export type ChannelScope = "client" | "firm" | "dm";
export type ChannelType = "team" | "private" | "topic";

export interface Channel {
  id: string;
  /**
   * Scope of the channel. Defaults to "client" for backwards compatibility
   * with existing clientChannels data. Firm-wide channels and DMs live in
   * parallel structures on FirmData.
   */
  scope?: ChannelScope;
  type: ChannelType;
  name: string;
  description?: string;
  participantIds: string[]; // team members in this channel
  unreadCount?: number;
  lastActivity?: string;
  /** Optional: only set on DM channels. Identifies the "other" participant
   *  from the active user's point of view. Mock layer uses team[0] as "me". */
  dmPeerId?: string;
  /** Optional: only set on channels with scope="client". Identifies which
   *  client this channel belongs to. Not required because clientChannels is
   *  keyed by clientId today. */
  clientId?: string;
}

export const clientChannels: Record<string, Channel[]> = {
  "russos-kitchen": [
    {
      id: "kims-team",
      type: "team",
      name: "Team channel",
      description: "Everyone working on Russo's Kitchen",
      participantIds: ["jennifer", "anna"],
      lastActivity: "32 min ago",
      unreadCount: 2,
    },
    {
      id: "kims-private",
      type: "private",
      name: "Private with AI",
      description: "Your private 1:1 with Practiq",
      participantIds: ["jennifer"],
      lastActivity: "Yesterday",
    },
    {
      id: "kims-q1-close",
      type: "topic",
      name: "March monthly close",
      description: "Focused thread for the March close package",
      participantIds: ["jennifer", "anna"],
      lastActivity: "1 hour ago",
      unreadCount: 1,
    },
  ],
  "techstart": [
    {
      id: "techstart-team",
      type: "team",
      name: "Team channel",
      description: "Everyone working on Ardmore Analytics",
      participantIds: ["jennifer", "lisa"],
      lastActivity: "1 hour ago",
      unreadCount: 1,
    },
    {
      id: "techstart-private",
      type: "private",
      name: "Private with AI",
      description: "Your private 1:1 with Practiq",
      participantIds: ["jennifer"],
      lastActivity: "2 days ago",
    },
    {
      id: "techstart-board",
      type: "topic",
      name: "Q1 board package",
      description: "Investor-grade reporting prep",
      participantIds: ["jennifer", "lisa"],
      lastActivity: "Yesterday",
    },
  ],
  "downtown-medical": [
    {
      id: "medical-team",
      type: "team",
      name: "Team channel",
      participantIds: ["jennifer", "lisa"],
      lastActivity: "2 hours ago",
      unreadCount: 1,
    },
    {
      id: "medical-private",
      type: "private",
      name: "Private with AI",
      participantIds: ["jennifer"],
      lastActivity: "Yesterday",
    },
  ],
};

export function getClientChannels(clientId: string): Channel[] {
  return clientChannels[clientId] || [
    {
      id: `${clientId}-team`,
      type: "team",
      name: "Team channel",
      participantIds: ["jennifer"],
      lastActivity: "Today",
    },
    {
      id: `${clientId}-private`,
      type: "private",
      name: "Private with AI",
      participantIds: ["jennifer"],
      lastActivity: "Today",
    },
  ];
}

// ---------------------------------------------------------------------------
// AI Proactive Briefings — generated when user switches to a client
// ---------------------------------------------------------------------------
export interface BriefingMessage {
  id: string;
  type: "briefing" | "proactive-action" | "approval-request" | "anomaly-alert" | "team-update" | "team-handoff" | "user" | "ai-response" | "document-shared" | "document-generated";
  content: string;
  timestamp: string;
  /**
   * Who sent this message. Used by the UI to distinguish user/AI/team at
   * render time without having to inspect `type`. Values:
   *   - "ai"        — Practiq (left-aligned, Sparkles icon)
   *   - "user"      — the active user (right-aligned, bubble)
   *   - "<memberId>" — a named team member (left-aligned, member avatar)
   * Optional so legacy scripted content without a senderId keeps working;
   * when absent, the UI infers from `type` as before.
   */
  senderId?: "ai" | "user" | string;
  metadata?: {
    clientId?: string;
    severity?: AttentionSeverity;
    aiConfidence?: number;
    documentTitle?: string;
    documentFormat?: ApprovalFormat;
    documentSubtitle?: string;
    documentHighlights?: string[];
    documentStatus?: "draft" | "ready-for-review" | "approved" | "shared";
    actionButtons?: { label: string; variant: "primary" | "secondary" | "danger" }[];
    changesCount?: number;
    lastVisit?: string;
    highlights?: string[];
    teamMemberId?: string;
    handoffSubject?: string;
    mentionedTo?: string;
    sharedBy?: string; // member id or "ai"
  };
}

// ---------------------------------------------------------------------------
// Team handoff messages — pre-defined per client
// ---------------------------------------------------------------------------
export const teamHandoffs: Record<string, BriefingMessage[]> = {
  "russos-kitchen": [
    {
      id: "handoff-kims-1",
      type: "team-handoff",
      timestamp: "32 min ago",
      content: "Hey Jennifer — I wrapped up the March close prep. The food cost variance is real, not a data issue. I checked the supplier invoices and meat prices are up across the board. Want me to draft a note to Marco before you approve?",
      metadata: {
        teamMemberId: "anna",
        mentionedTo: "jennifer",
        handoffSubject: "March P&L — food cost above benchmark",
      },
    },
  ],
  "techstart": [
    {
      id: "handoff-techstart-1",
      type: "team-handoff",
      timestamp: "1h ago",
      content: "Jennifer, the Stripe reconciliation has been weird all week. This $4,200 entry is the third one I can't auto-match. I think we need to talk to Alex about how their finance team posts revenue. Worth a call?",
      metadata: {
        teamMemberId: "lisa",
        mentionedTo: "jennifer",
        handoffSubject: "Recurring Stripe reconciliation gaps",
      },
    },
  ],
  "downtown-medical": [
    {
      id: "handoff-medical-1",
      type: "team-handoff",
      timestamp: "2h ago",
      content: "I prepped the Q1 partnership return draft but flagged the bonus accrual entry — AI confidence is 67% and I'd rather you make the call. Dr. Chen has been particular about how those are split.",
      metadata: {
        teamMemberId: "lisa",
        mentionedTo: "jennifer",
        handoffSubject: "Q1 Partnership Return — bonus accrual",
      },
    },
  ],
  "redrock-construction": [
    {
      id: "handoff-redrock-1",
      type: "team-handoff",
      timestamp: "4h ago",
      content: "Job costing for the Maple Heights project is way off — actual labor is 42% over the bid. Daniel needs to know before we close March. Should I draft the email or do you want to call him?",
      metadata: {
        teamMemberId: "mike",
        mentionedTo: "jennifer",
        handoffSubject: "Maple Heights job cost variance",
      },
    },
  ],
};

export function getClientBriefing(clientId: string, channelId?: string): BriefingMessage[] {
  const client = getClient(clientId);
  if (!client) return [];

  // Channel-specific briefings
  if (channelId?.includes("private")) {
    return getPrivateChannelMessages(clientId);
  }
  if (channelId?.includes("topic") || channelId?.includes("close") || channelId?.includes("board")) {
    return getTopicChannelMessages(clientId, channelId);
  }

  // Special: Russo's Kitchen team channel — full mixed conversation scenario
  if (clientId === "russos-kitchen") {
    return getRussosTeamChannel();
  }

  // Default: team channel briefing (current behavior)
  const clientAttention = attentionItems.filter(a => a.clientId === clientId);
  const clientApprovals = approvalQueue.filter(a => a.clientId === clientId && a.status === "pending");
  const clientActivities = clientAIActivities.filter(a => a.clientId === clientId);

  const messages: BriefingMessage[] = [];

  // 1. Welcome briefing — what changed since last visit
  messages.push({
    id: `brief-${clientId}-welcome`,
    type: "briefing",
    timestamp: "Just now",
    content: `**Welcome back to ${client.name}.** Here's where things stand:`,
    metadata: {
      clientId,
      lastVisit: "3 hours ago",
      changesCount: clientActivities.length,
      highlights: [
        client.qbSync === "synced" ? `QuickBooks synced ${client.qbLastSync?.toLowerCase()}` : client.qbSync === "error" ? "QuickBooks sync failed — needs reconnection" : `QuickBooks data is stale (${client.qbLastSync})`,
        `Monthly close status: **${client.monthlyCloseStatus}**${client.monthlyCloseNote ? ` — ${client.monthlyCloseNote}` : ""}`,
        `${clientActivities.length} AI actions taken since last visit`,
        clientApprovals.length > 0 ? `${clientApprovals.length} item(s) waiting for your approval` : "No pending approvals",
      ],
    },
  });

  // 2. Team handoffs (right after briefing — these are urgent human-to-human)
  const handoffs = teamHandoffs[clientId] || [];
  handoffs.forEach((h) => messages.push(h));

  // 3. Anomaly alerts
  clientAttention.forEach((item) => {
    messages.push({
      id: `brief-${clientId}-att-${item.id}`,
      type: "anomaly-alert",
      timestamp: item.detectedAt,
      content: `**${item.title}**\n\n${item.description}`,
      metadata: {
        clientId,
        severity: item.severity,
        aiConfidence: item.aiConfidence,
        actionButtons: [
          { label: "Investigate", variant: "primary" },
          { label: "Dismiss", variant: "secondary" },
        ],
      },
    });
  });

  // 3. Approval requests
  clientApprovals.forEach((item) => {
    messages.push({
      id: `brief-${clientId}-aq-${item.id}`,
      type: "approval-request",
      timestamp: item.createdAt,
      content: `I've prepared **${item.title}** for your review.`,
      metadata: {
        clientId,
        aiConfidence: item.aiConfidence,
        documentTitle: item.title,
        documentFormat: item.format,
        highlights: item.highlights,
        actionButtons: [
          { label: "Approve", variant: "primary" },
          { label: "Request Changes", variant: "secondary" },
          { label: "Preview", variant: "secondary" },
        ],
      },
    });
  });

  // 4. Team updates
  const teamActivities = activityFeed.filter(a => a.clientId === clientId);
  teamActivities.forEach((act) => {
    messages.push({
      id: `brief-${clientId}-team-${act.id}`,
      type: "team-update",
      timestamp: act.timeAgo,
      content: `**${getMember(act.memberId).name}** ${act.action} ${act.target}`,
      metadata: { teamMemberId: act.memberId },
    });
  });

  return messages;
}

// Russo's Kitchen team channel — full mixed conversation scenario
// Shows: AI proactive briefing → team handoff → AI generates doc inline →
//   user asks question → AI responds → another team member chimes in →
//   document gets approved → email drafted and shared
export function getRussosTeamChannel(): BriefingMessage[] {
  return [
    {
      id: "kims-team-1",
      type: "briefing",
      timestamp: "Earlier today",
      content: "**Welcome back to Russo's Kitchen.** Here's where things stand:",
      metadata: {
        lastVisit: "3 hours ago",
        highlights: [
          "QuickBooks synced just now — March transactions current",
          "Monthly close: **ready** — Anna finished bank reconciliation last night",
          "**2 items** waiting for your review",
          "Anna left you a note about the food cost variance",
        ],
      },
    },
    {
      id: "kims-team-2",
      type: "team-handoff",
      timestamp: "9:42 AM",
      content: "Hey Jennifer — wrapped up the March close prep. The food cost variance is real, not a data issue. I checked the supplier invoices and meat prices are up across the board. Want me to draft a note to Marco before you approve?",
      metadata: {
        teamMemberId: "anna",
        handoffSubject: "March P&L — food cost above benchmark",
      },
    },
    {
      id: "kims-team-3",
      type: "ai-response",
      timestamp: "9:45 AM",
      content: "Anna — based on the 18 months of conversation history with Marco, he generally responds well to a direct framing if it's paired with concrete next steps. I can draft three versions if it helps.",
    },
    {
      id: "kims-team-4",
      type: "document-generated",
      timestamp: "9:48 AM",
      content: "I drafted the **March monthly close package** based on Anna's reconciliation. Two highlights flagged for your review.",
      metadata: {
        documentTitle: "Russo's Kitchen — March 2026 Close",
        documentFormat: "xlsx",
        documentSubtitle: "P&L · Balance Sheet · Cash Flow · Notes",
        documentHighlights: [
          "Food cost 31.2% — 1.2% above the 30% benchmark",
          "Energy expense up 10% MoM — supplier or seasonal?",
        ],
        documentStatus: "ready-for-review",
        sharedBy: "ai",
      },
    },
    {
      id: "kims-team-5",
      type: "user",
      timestamp: "10:02 AM",
      content: "Open the close package. I want to look at the food cost line before we send anything to Marco.",
    },
    {
      id: "kims-team-6",
      type: "ai-response",
      timestamp: "10:02 AM",
      content: "Opened on the right. The food cost section is highlighted. The 12% variance comes from the new Pacific Foods supplier — the meat/seafood line alone is $3,100 vs the historical $2,950.",
    },
    {
      id: "kims-team-7",
      type: "team-update",
      timestamp: "10:08 AM",
      content: "**Anna Torres** is viewing the close package",
      metadata: { teamMemberId: "anna" },
    },
    {
      id: "kims-team-8",
      type: "user",
      timestamp: "10:11 AM",
      content: "OK this looks right. @Anna good catch on the supplier shift. Let's send it to Marco with a short cover note explaining the variance. Can you draft something casual? Match his usual tone.",
    },
    {
      id: "kims-team-9",
      type: "document-generated",
      timestamp: "10:12 AM",
      content: "Drafted the cover email — casual tone with Russo's preferred direct framing. The food cost note is there but not alarmist.",
      metadata: {
        documentTitle: "Email — March close + food cost note",
        documentFormat: "email",
        documentSubtitle: "To: marco@russoskitchen.com",
        documentHighlights: [
          "Opens with March highlights (revenue +12%)",
          "Surfaces food cost variance with the supplier explanation",
          "Closes with offer to discuss on his next call",
        ],
        documentStatus: "ready-for-review",
        sharedBy: "ai",
      },
    },
    {
      id: "kims-team-10",
      type: "team-update",
      timestamp: "10:13 AM",
      content: "**Anna Torres** opened the email draft",
      metadata: { teamMemberId: "anna" },
    },
  ];
}

// Private channel — just user + AI, more candid/strategic
function getPrivateChannelMessages(clientId: string): BriefingMessage[] {
  const client = getClient(clientId);
  if (!client) return [];

  const candidNotes: Record<string, BriefingMessage[]> = {
    "russos-kitchen": [
      {
        id: `priv-kims-1`,
        type: "ai-response",
        timestamp: "Yesterday 4:32 PM",
        content: "Quick heads up — Anna is doing great work but the food cost discussion is going to need a frank conversation with Marco. The supplier change in Q4 was supposed to save money and now it's costing him. He may push back. Want me to draft a few framing options before your next call?",
      },
      {
        id: `priv-kims-2`,
        type: "user",
        timestamp: "Yesterday 4:35 PM",
        content: "Yeah let's prep that. Three options ranging from soft to direct.",
      },
      {
        id: `priv-kims-3`,
        type: "ai-response",
        timestamp: "Yesterday 4:36 PM",
        content: "On it. I'll have it ready before tomorrow morning. Also — based on his communication style I'd lean toward the middle option. Marco values direct numbers but doesn't like feeling cornered.",
      },
    ],
    "techstart": [
      {
        id: `priv-ts-1`,
        type: "ai-response",
        timestamp: "2 days ago",
        content: "Between us — Ardmore's burn pattern looks healthier than their public reports suggest. If they're going for Series B, the runway story is strong. But the recurring Stripe gaps are going to come up in due diligence and we should address them proactively.",
      },
    ],
  };

  return candidNotes[clientId] || [
    {
      id: `priv-${clientId}-empty`,
      type: "briefing",
      timestamp: "Just now",
      content: `This is your **private channel** with Practiq for ${client.name}. Nothing here is shared with the team. Use it for strategy, candid notes, or sensitive questions.`,
    },
  ];
}

// Topic channel — focused thread on a specific deliverable
function getTopicChannelMessages(clientId: string, channelId: string): BriefingMessage[] {
  const client = getClient(clientId);
  if (!client) return [];

  if (channelId.includes("close")) {
    return [
      {
        id: "topic-close-1",
        type: "briefing",
        timestamp: "Started 4 days ago",
        content: `**March monthly close — Russo's Kitchen**\n\nThis thread is focused on the March close package. Three of us are working on it: Anna prepared the books, Practiq drafted the statements, and Jennifer reviews.`,
      },
      {
        id: "topic-close-2",
        type: "team-update",
        timestamp: "4 days ago",
        content: "**Anna Torres** completed bank reconciliation",
        metadata: { teamMemberId: "anna" },
      },
      {
        id: "topic-close-3",
        type: "team-update",
        timestamp: "3 days ago",
        content: "**Anna Torres** posted adjusting entries",
        metadata: { teamMemberId: "anna" },
      },
      {
        id: "topic-close-4",
        type: "ai-response",
        timestamp: "Yesterday 7:42 AM",
        content: "I drafted the **March P&L and Balance Sheet** based on Anna's reconciliation. Food cost variance flagged for review. Both documents are in Artifacts.",
      },
      {
        id: "topic-close-5",
        type: "team-handoff",
        timestamp: "32 min ago",
        content: "Hey Jennifer — I wrapped up the March close prep. The food cost variance is real, not a data issue. I checked the supplier invoices and meat prices are up across the board. Want me to draft a note to Marco before you approve?",
        metadata: {
          teamMemberId: "anna",
          handoffSubject: "March P&L — food cost above benchmark",
        },
      },
    ];
  }

  if (channelId.includes("board")) {
    return [
      {
        id: "topic-board-1",
        type: "briefing",
        timestamp: "Started Monday",
        content: `**Q1 Board Package — Ardmore Analytics**\n\nFocused thread for Alex's Q1 board update. We need: P&L, cash flow, runway projection, and a 1-page executive summary.`,
      },
      {
        id: "topic-board-2",
        type: "team-handoff",
        timestamp: "Monday",
        content: "Jennifer — I've started the runway model with the Series A close numbers. The 18-month runway story holds even with the planned hires. Want me to share with Alex first or do you want to review?",
        metadata: {
          teamMemberId: "lisa",
          handoffSubject: "Runway model first draft",
        },
      },
      {
        id: "topic-board-3",
        type: "ai-response",
        timestamp: "Yesterday 2:15 PM",
        content: "Lisa — I pulled the Carta cap table and reconciled it with the Stripe revenue feed. The MRR number Alex shared in the last board update was off by $12K. I've corrected it in the draft. Worth flagging at the meeting.",
      },
    ];
  }

  return [];
}

// ---------------------------------------------------------------------------
// Live Alerts — messages that arrive AFTER initial briefing (for demo wow factor)
// Simulates AI proactively detecting things in real-time while user is in workspace
// ---------------------------------------------------------------------------
export interface LiveAlert {
  delayMs: number;
  message: BriefingMessage;
}

export function getLiveAlerts(clientId: string): LiveAlert[] {
  const client = getClient(clientId);
  if (!client) return [];

  // Different live alerts per client to make demo feel real
  const alerts: Record<string, LiveAlert[]> = {
    "russos-kitchen": [
      {
        delayMs: 8000,
        message: {
          id: `live-${clientId}-1`,
          type: "anomaly-alert",
          timestamp: "Just now",
          content: `**Just detected: Supplier price change**\n\nMeat supplier "Pacific Foods" raised prices 8% effective today. This will push food cost to 33.7% next month if no action is taken.`,
          metadata: {
            severity: "high",
            aiConfidence: 96,
            actionButtons: [
              { label: "Find Alternative", variant: "primary" },
              { label: "Negotiate", variant: "secondary" },
              { label: "Acknowledge", variant: "secondary" },
            ],
          },
        },
      },
    ],
    "techstart": [
      {
        delayMs: 6000,
        message: {
          id: `live-${clientId}-1`,
          type: "anomaly-alert",
          timestamp: "Just now",
          content: `**New Stripe payment received**\n\n$12,400 from "Acme Corp" — appears to be the missing reconciliation item from yesterday. Auto-matching now.`,
          metadata: {
            severity: "medium",
            aiConfidence: 99,
            actionButtons: [
              { label: "Approve Match", variant: "primary" },
              { label: "Review", variant: "secondary" },
            ],
          },
        },
      },
    ],
    "downtown-medical": [
      {
        delayMs: 7000,
        message: {
          id: `live-${clientId}-1`,
          type: "approval-request",
          timestamp: "Just now",
          content: `I've finished the **Q1 Insurance Reconciliation** you requested yesterday.`,
          metadata: {
            aiConfidence: 93,
            documentFormat: "xlsx",
            highlights: [
              "Blue Shield: $32,400 reconciled (98% match rate)",
              "Aetna: $18,200 reconciled — 2 disputed claims flagged",
              "Medicare: $12,800 fully reconciled",
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

  return alerts[clientId] || [
    {
      delayMs: 7000,
      message: {
        id: `live-${clientId}-1`,
        type: "anomaly-alert",
        timestamp: "Just now",
        content: `**Background scan complete**\n\nI just finished scanning ${client.name}'s latest QuickBooks data. No anomalies detected in the last 24 hours.`,
        metadata: {
          severity: "low",
          aiConfidence: 100,
          actionButtons: [
            { label: "Acknowledge", variant: "secondary" },
          ],
        },
      },
    },
  ];
}

// Background AI activity ticker — for "AI is alive" indicator in context panel
export interface ActivityTick {
  label: string;
  current: number;
  total: number;
  unit: string;
}

export const liveActivityTicks: ActivityTick[] = [
  { label: "Scanning client books", current: 47, total: 120, unit: "clients" },
  { label: "Drafting close packages", current: 18, total: 67, unit: "drafts" },
];

// ---------------------------------------------------------------------------
// Client Knowledge Items — what AI knows about each client
// Used by KnowledgeBase view to show real client-specific knowledge
// ---------------------------------------------------------------------------
export interface KnowledgeItem {
  id: string;
  category: "preference" | "history" | "pattern" | "contact" | "compliance";
  title: string;
  detail: string;
  lastUpdated: string;
  source: "ai-learned" | "team-noted" | "client-shared";
}

export const clientKnowledgeMap: Record<string, KnowledgeItem[]> = {
  "russos-kitchen": [
    { id: "k1", category: "preference", title: "Casual communication", detail: "Marco prefers short, direct emails. No corporate jargon. Mentions family in greetings.", lastUpdated: "2 weeks ago", source: "ai-learned" },
    { id: "k2", category: "pattern", title: "Seasonal food cost spike", detail: "Food cost rises 5-8% in March/April every year due to spring menu and supplier shifts.", lastUpdated: "1 week ago", source: "ai-learned" },
    { id: "k3", category: "history", title: "Switched suppliers in Q4 2025", detail: "Moved primary meat supplier from Heritage Meats to Pacific Foods. 12% cost reduction at the time.", lastUpdated: "3 months ago", source: "team-noted" },
    { id: "k4", category: "compliance", title: "S-Corp election deadline", detail: "Filed 2553 in Jan 2024. Annual review due each January.", lastUpdated: "2 months ago", source: "team-noted" },
    { id: "k5", category: "contact", title: "Best time to call: Tuesday 2-4 PM", detail: "Kitchen is closed for prep. Avoid weekends and dinner service hours.", lastUpdated: "1 month ago", source: "ai-learned" },
  ],
  "techstart": [
    { id: "k1", category: "preference", title: "Investor-grade reporting", detail: "Alex shares all reports with the board. Format must match Series A pitch deck style. No casual language.", lastUpdated: "1 week ago", source: "team-noted" },
    { id: "k2", category: "pattern", title: "Stripe revenue lag", detail: "Stripe payments often appear in QB 1-2 days after bank settlement. Reconciliation requires manual matching.", lastUpdated: "3 days ago", source: "ai-learned" },
    { id: "k3", category: "history", title: "Series A closed Q3 2025", detail: "$8.4M raised. Sequoia lead. Cap table updated in Carta — sync needed monthly.", lastUpdated: "5 months ago", source: "client-shared" },
    { id: "k4", category: "compliance", title: "Delaware franchise tax", detail: "Annual report due March 1. Calculated on assumed par value method.", lastUpdated: "1 month ago", source: "team-noted" },
  ],
  "downtown-medical": [
    { id: "k1", category: "preference", title: "Provider-level breakdowns", detail: "Dr. Chen wants revenue split by provider every month. Separate report per partner.", lastUpdated: "2 weeks ago", source: "team-noted" },
    { id: "k2", category: "compliance", title: "HIPAA-aware reporting", detail: "Never include patient identifiers in any document. Aggregate only.", lastUpdated: "6 months ago", source: "team-noted" },
    { id: "k3", category: "pattern", title: "Insurance payment delays", detail: "Blue Shield typically pays 30-45 days late. Aetna 15-20 days. Plan AR aging accordingly.", lastUpdated: "1 month ago", source: "ai-learned" },
  ],
};

export function getClientKnowledge(clientId: string): KnowledgeItem[] {
  return clientKnowledgeMap[clientId] || [];
}
