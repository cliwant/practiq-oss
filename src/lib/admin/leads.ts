/**
 * Lead aggregation for /admin/leads.
 *
 * The operator-facing "Active Leads" inbox merges four inbound sources
 * by email (case-insensitive) into a single Lead per person:
 *
 *   public.waitlist                 — early-access signups
 *   public.workflow_audits          — workflow audit tool submissions
 *   practiq.policy_generations      — AI policy generator submissions
 *   public.newsletter_subscribers   — blog/footer newsletter signups
 *
 * Plus the operator-managed practiq.lead_status row, which carries the
 * conversation status + freeform notes.
 *
 * Design choices:
 *  - Email is normalized to lowercase. This is the merge key, so two
 *    rows with different casing land in the same Lead.
 *  - We pull recent rows (last 1000 per source) — leads older than that
 *    are not in scope for an "active inbox". If we exceed that volume
 *    in any source we cap at 1000 and continue.
 *  - We compute a "warmth" score per lead: recent activity (last 14d)
 *    + multi-tool engagement (more than one source) = warmer.
 *  - PII (emails, firm names) is intentionally NOT masked — this view
 *    is admin-only behind middleware host + cookie gating, and the
 *    operator needs the raw email to actually reply.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type LeadStatus =
  | "new"
  | "replied"
  | "meeting_scheduled"
  | "design_partner"
  | "not_a_fit";

export const LEAD_STATUSES: LeadStatus[] = [
  "new",
  "replied",
  "meeting_scheduled",
  "design_partner",
  "not_a_fit",
];

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  new: "New",
  replied: "Replied",
  meeting_scheduled: "Meeting scheduled",
  design_partner: "Design partner",
  not_a_fit: "Not a fit",
};

export const LEAD_STATUS_BADGE: Record<LeadStatus, string> = {
  new: "bg-blue-500/15 text-blue-300",
  replied: "bg-amber-500/15 text-amber-300",
  meeting_scheduled: "bg-violet-500/15 text-violet-300",
  design_partner: "bg-emerald-500/15 text-emerald-300",
  not_a_fit: "bg-zinc-700/40 text-zinc-400",
};

export type LeadSource =
  | "waitlist"
  | "workflow_audit"
  | "policy_generation"
  | "newsletter";

export interface LeadHistoryItem {
  source: LeadSource;
  at: string; // ISO timestamp
  id: string | null;
  detail: string;
  // Optional links to deep-content the operator can open
  link?: string | null;
  // Extra structured fields the row pane can render
  meta?: Record<string, unknown>;
}

export interface Lead {
  email: string; // lowercased
  displayEmail: string; // first-seen casing
  name: string | null;
  firmName: string | null;
  vertical: string | null;
  firmSize: string | null;
  clientCount: string | null;
  ipCountry: string | null;
  sourcePlatforms: string[]; // distinct utm_source / source_platform values
  firstSeen: string; // earliest timestamp across all sources
  lastSeen: string; // latest timestamp across all sources
  toolsUsed: LeadSource[]; // distinct sources this lead has engaged with
  history: LeadHistoryItem[]; // newest first
  status: LeadStatus;
  notes: string | null;
  statusUpdatedAt: string | null;
  warmth: number; // 0-100 heuristic score
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

function normEmail(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

function maxIso(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

function minIso(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a < b ? a : b;
}

interface WaitlistRow {
  email: string;
  firm_name: string | null;
  firm_vertical: string | null;
  firm_size: string | null;
  client_count: string | null;
  contact_name: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  ip_country: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

interface WorkflowAuditRow {
  id: string;
  email: string;
  name: string | null;
  firm_name: string | null;
  firm_vertical: string | null;
  firm_size: string | null;
  client_count: string | null;
  source_platform: string | null;
  lane: string | null;
  campaign: string | null;
  ip_country: string | null;
  created_at: string;
}

interface PolicyGenRow {
  id: string;
  email: string;
  name: string | null;
  firm_name: string | null;
  firm_vertical: string | null;
  firm_size: string | null;
  states: string[] | null;
  source_platform: string | null;
  campaign: string | null;
  created_at: string;
}

interface NewsletterRow {
  email: string;
  source: string | null;
  post_slug: string | null;
  subscribed_at: string;
}

interface LeadStatusRow {
  email: string;
  status: LeadStatus;
  notes: string | null;
  updated_at: string;
}

export interface LeadsFilter {
  status?: LeadStatus | "all";
  vertical?: string | "all";
  sourcePlatform?: string | "all";
  sort?: "recent" | "warmth";
  limit?: number;
}

export interface LeadsBundle {
  leads: Lead[];
  total: number;
  /** Aggregates across the full (unfiltered) result set */
  stats: {
    newLast7d: number;
    awaitingReply: number;
    inActiveConversation: number;
    designPartner: number;
  };
  facets: {
    verticals: string[];
    sourcePlatforms: string[];
  };
  errors: string[];
}

/**
 * Pull leads from all sources, merge by email, and return a filtered &
 * sorted view. The supabase client should be the service-role client
 * (it needs read access to both the public and practiq schemas).
 */
export async function loadLeads(
  supabase: SupabaseClient,
  filter: LeadsFilter = {},
): Promise<LeadsBundle> {
  const limit = Math.min(filter.limit ?? 500, 2000);
  const errors: string[] = [];

  const [waitlistRes, auditRes, policyRes, newsletterRes, statusRes] =
    await Promise.all([
      supabase
        .from("waitlist")
        .select(
          "email, firm_name, firm_vertical, firm_size, client_count, contact_name, utm_source, utm_campaign, ip_country, created_at, metadata",
        )
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase
        .from("workflow_audits")
        .select(
          "id, email, name, firm_name, firm_vertical, firm_size, client_count, source_platform, lane, campaign, ip_country, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase
        .schema("practiq")
        .from("policy_generations")
        .select(
          "id, email, name, firm_name, firm_vertical, firm_size, states, source_platform, campaign, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase
        .from("newsletter_subscribers")
        .select("email, source, post_slug, subscribed_at")
        .order("subscribed_at", { ascending: false })
        .limit(1000),
      supabase
        .schema("practiq")
        .from("lead_status")
        .select("email, status, notes, updated_at"),
    ]);

  if (waitlistRes.error) errors.push(`waitlist: ${waitlistRes.error.message}`);
  if (auditRes.error)
    errors.push(`workflow_audits: ${auditRes.error.message}`);
  if (policyRes.error)
    errors.push(`policy_generations: ${policyRes.error.message}`);
  if (newsletterRes.error)
    errors.push(`newsletter_subscribers: ${newsletterRes.error.message}`);
  if (statusRes.error)
    errors.push(`lead_status: ${statusRes.error.message}`);

  const waitlist = (waitlistRes.data ?? []) as WaitlistRow[];
  const audits = (auditRes.data ?? []) as WorkflowAuditRow[];
  const policies = (policyRes.data ?? []) as PolicyGenRow[];
  const newsletter = (newsletterRes.data ?? []) as NewsletterRow[];
  const statuses = (statusRes.data ?? []) as LeadStatusRow[];

  // Build the status lookup so we can attach status + notes per lead.
  const statusByEmail = new Map<string, LeadStatusRow>();
  for (const s of statuses) {
    const e = normEmail(s.email);
    if (e) statusByEmail.set(e, s);
  }

  // Merge by lowercased email.
  const map = new Map<string, Lead>();

  function getOrCreate(rawEmail: string): Lead | null {
    const email = normEmail(rawEmail);
    if (!email) return null;
    let lead = map.get(email);
    if (!lead) {
      const s = statusByEmail.get(email);
      lead = {
        email,
        displayEmail: rawEmail.trim(),
        name: null,
        firmName: null,
        vertical: null,
        firmSize: null,
        clientCount: null,
        ipCountry: null,
        sourcePlatforms: [],
        firstSeen: "",
        lastSeen: "",
        toolsUsed: [],
        history: [],
        status: (s?.status as LeadStatus) ?? "new",
        notes: s?.notes ?? null,
        statusUpdatedAt: s?.updated_at ?? null,
        warmth: 0,
      };
      map.set(email, lead);
    }
    return lead;
  }

  function addPlatform(lead: Lead, value: string | null | undefined) {
    if (!value) return;
    const v = value.trim();
    if (!v) return;
    if (!lead.sourcePlatforms.includes(v)) lead.sourcePlatforms.push(v);
  }

  function addTool(lead: Lead, source: LeadSource) {
    if (!lead.toolsUsed.includes(source)) lead.toolsUsed.push(source);
  }

  // Waitlist
  for (const r of waitlist) {
    const lead = getOrCreate(r.email);
    if (!lead) continue;
    lead.name = lead.name ?? (typeof r.contact_name === "string" ? r.contact_name : null);
    lead.firmName = lead.firmName ?? r.firm_name;
    lead.vertical = lead.vertical ?? r.firm_vertical;
    lead.firmSize = lead.firmSize ?? r.firm_size;
    lead.clientCount = lead.clientCount ?? r.client_count;
    lead.ipCountry = lead.ipCountry ?? r.ip_country;
    addPlatform(lead, r.utm_source);
    addTool(lead, "waitlist");
    lead.firstSeen = minIso(lead.firstSeen || null, r.created_at) ?? r.created_at;
    lead.lastSeen = maxIso(lead.lastSeen || null, r.created_at) ?? r.created_at;
    const workflowPain =
      r.metadata && typeof r.metadata === "object" && "workflow_pain" in r.metadata
        ? String((r.metadata as Record<string, unknown>).workflow_pain ?? "")
        : "";
    lead.history.push({
      source: "waitlist",
      at: r.created_at,
      id: null,
      detail: "Joined waitlist",
      meta: {
        firm_name: r.firm_name,
        firm_vertical: r.firm_vertical,
        firm_size: r.firm_size,
        client_count: r.client_count,
        utm_source: r.utm_source,
        utm_campaign: r.utm_campaign,
        workflow_pain: workflowPain || null,
      },
    });
  }

  // Workflow audits
  for (const r of audits) {
    const lead = getOrCreate(r.email);
    if (!lead) continue;
    lead.name = lead.name ?? r.name;
    lead.firmName = lead.firmName ?? r.firm_name;
    lead.vertical = lead.vertical ?? r.firm_vertical;
    lead.firmSize = lead.firmSize ?? r.firm_size;
    lead.clientCount = lead.clientCount ?? r.client_count;
    lead.ipCountry = lead.ipCountry ?? r.ip_country;
    addPlatform(lead, r.source_platform);
    addTool(lead, "workflow_audit");
    lead.firstSeen = minIso(lead.firstSeen || null, r.created_at) ?? r.created_at;
    lead.lastSeen = maxIso(lead.lastSeen || null, r.created_at) ?? r.created_at;
    lead.history.push({
      source: "workflow_audit",
      at: r.created_at,
      id: r.id,
      detail: "Submitted workflow audit",
      link: `/admin/analytics/tools-funnel?audit=${r.id}`,
      meta: {
        firm_vertical: r.firm_vertical,
        firm_size: r.firm_size,
        client_count: r.client_count,
        source_platform: r.source_platform,
        lane: r.lane,
        campaign: r.campaign,
      },
    });
  }

  // Policy generations
  for (const r of policies) {
    const lead = getOrCreate(r.email);
    if (!lead) continue;
    lead.name = lead.name ?? r.name;
    lead.firmName = lead.firmName ?? r.firm_name;
    lead.vertical = lead.vertical ?? r.firm_vertical;
    lead.firmSize = lead.firmSize ?? r.firm_size;
    addPlatform(lead, r.source_platform);
    addTool(lead, "policy_generation");
    lead.firstSeen = minIso(lead.firstSeen || null, r.created_at) ?? r.created_at;
    lead.lastSeen = maxIso(lead.lastSeen || null, r.created_at) ?? r.created_at;
    lead.history.push({
      source: "policy_generation",
      at: r.created_at,
      id: r.id,
      detail: "Generated AI policy",
      link: `/api/ai-policy-generator/${r.id}/pdf`,
      meta: {
        firm_vertical: r.firm_vertical,
        firm_size: r.firm_size,
        states: r.states,
        source_platform: r.source_platform,
        campaign: r.campaign,
      },
    });
  }

  // Newsletter
  for (const r of newsletter) {
    const lead = getOrCreate(r.email);
    if (!lead) continue;
    addPlatform(lead, r.source);
    addTool(lead, "newsletter");
    lead.firstSeen =
      minIso(lead.firstSeen || null, r.subscribed_at) ?? r.subscribed_at;
    lead.lastSeen =
      maxIso(lead.lastSeen || null, r.subscribed_at) ?? r.subscribed_at;
    lead.history.push({
      source: "newsletter",
      at: r.subscribed_at,
      id: null,
      detail: r.post_slug
        ? `Subscribed to newsletter (from /blog/${r.post_slug})`
        : "Subscribed to newsletter",
      meta: { source: r.source, post_slug: r.post_slug },
    });
  }

  // Finalize each lead: sort history newest-first, compute warmth.
  const now = Date.now();
  for (const lead of map.values()) {
    lead.history.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
    const lastSeenMs = lead.lastSeen ? new Date(lead.lastSeen).getTime() : 0;
    const ageMs = lastSeenMs ? now - lastSeenMs : Number.MAX_SAFE_INTEGER;
    // Recency: 60 points if within 14 days, scaled linearly to 0 at 60 days.
    let recencyScore = 0;
    if (ageMs < FOURTEEN_DAYS_MS) {
      recencyScore = 60;
    } else if (ageMs < 60 * 24 * 60 * 60 * 1000) {
      const decay =
        1 -
        (ageMs - FOURTEEN_DAYS_MS) /
          (60 * 24 * 60 * 60 * 1000 - FOURTEEN_DAYS_MS);
      recencyScore = Math.max(0, Math.round(60 * decay));
    }
    // Multi-tool: 10 points per distinct source past the first, capped at 30.
    const breadthScore = Math.min(30, (lead.toolsUsed.length - 1) * 10);
    // Engagement intensity: 1 point per history event past 1, capped at 10.
    const intensityScore = Math.min(10, Math.max(0, lead.history.length - 1));
    lead.warmth = recencyScore + breadthScore + intensityScore;
  }

  // Apply filter.
  let all = Array.from(map.values());

  if (filter.status && filter.status !== "all") {
    all = all.filter((l) => l.status === filter.status);
  }
  if (filter.vertical && filter.vertical !== "all") {
    all = all.filter((l) => l.vertical === filter.vertical);
  }
  if (filter.sourcePlatform && filter.sourcePlatform !== "all") {
    all = all.filter((l) =>
      l.sourcePlatforms.includes(filter.sourcePlatform as string),
    );
  }

  // Stats across the FILTERED set so the strip reflects the current view.
  const sevenDaysAgo = now - SEVEN_DAYS_MS;
  const stats = {
    newLast7d: all.filter((l) => {
      const first = l.firstSeen ? new Date(l.firstSeen).getTime() : 0;
      return first >= sevenDaysAgo;
    }).length,
    awaitingReply: all.filter((l) => l.status === "new").length,
    inActiveConversation: all.filter(
      (l) => l.status === "replied" || l.status === "meeting_scheduled",
    ).length,
    designPartner: all.filter((l) => l.status === "design_partner").length,
  };

  // Sort.
  const sort = filter.sort ?? "recent";
  if (sort === "warmth") {
    all.sort((a, b) => b.warmth - a.warmth);
  } else {
    all.sort((a, b) => (a.lastSeen < b.lastSeen ? 1 : a.lastSeen > b.lastSeen ? -1 : 0));
  }

  const total = all.length;
  const leads = all.slice(0, limit);

  // Facets from the *full* (unfiltered) set so the dropdowns don't
  // collapse to a single option once a filter is applied.
  const allLeads = Array.from(map.values());
  const verticalSet = new Set<string>();
  const platformSet = new Set<string>();
  for (const l of allLeads) {
    if (l.vertical) verticalSet.add(l.vertical);
    for (const p of l.sourcePlatforms) platformSet.add(p);
  }

  return {
    leads,
    total,
    stats,
    facets: {
      verticals: Array.from(verticalSet).sort(),
      sourcePlatforms: Array.from(platformSet).sort(),
    },
    errors,
  };
}

/**
 * Upsert a lead status. Used by the PATCH route. Returns the updated row.
 */
export async function setLeadStatus(
  supabase: SupabaseClient,
  email: string,
  status: LeadStatus,
  updatedBy: string,
): Promise<{ error: string | null }> {
  const normalized = normEmail(email);
  if (!normalized) return { error: "invalid email" };
  if (!LEAD_STATUSES.includes(status)) return { error: "invalid status" };

  const { error } = await supabase
    .schema("practiq")
    .from("lead_status")
    .upsert(
      {
        email: normalized,
        status,
        updated_at: new Date().toISOString(),
        updated_by: updatedBy,
      },
      { onConflict: "email" },
    );
  if (error) return { error: error.message };
  return { error: null };
}

/**
 * Set the notes field for a lead. Used by the POST note route.
 */
export async function setLeadNote(
  supabase: SupabaseClient,
  email: string,
  notes: string,
  updatedBy: string,
): Promise<{ error: string | null }> {
  const normalized = normEmail(email);
  if (!normalized) return { error: "invalid email" };
  const cleaned = notes.trim().slice(0, 10_000);

  // Pull existing status so the upsert doesn't reset it to 'new'.
  const { data: existing } = await supabase
    .schema("practiq")
    .from("lead_status")
    .select("status")
    .eq("email", normalized)
    .maybeSingle();
  const status = (existing?.status as LeadStatus) ?? "new";

  const { error } = await supabase
    .schema("practiq")
    .from("lead_status")
    .upsert(
      {
        email: normalized,
        status,
        notes: cleaned || null,
        updated_at: new Date().toISOString(),
        updated_by: updatedBy,
      },
      { onConflict: "email" },
    );
  if (error) return { error: error.message };
  return { error: null };
}
