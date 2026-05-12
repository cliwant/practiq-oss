/**
 * /admin/analytics/tools-funnel — operator dashboard for the new free
 * tool surfaces (3 topic landing pages → workflow audit → AI policy
 * generator → demo workspace → waitlist signup).
 *
 * Data is already flowing into Supabase. This page surfaces it so the
 * operator stops needing to write SQL to see what's converting:
 *
 *   1. Headline metrics: audits completed, policies generated, sample
 *      workspace explorers, audit → signup conversion.
 *   2. Per-topic-page funnel (pageview → sns_cta_clicked → audit
 *      started → audit completed → signup) in 7d and 30d.
 *   3. By firm vertical: audits, policies, primary gap distribution.
 *   4. SNS attribution breakdown (source_platform × lane × topic).
 *   5. Recent submissions feed with expandable raw LLM output.
 *   6. Demo workspace interaction depth (avg surfaces / visit).
 *
 * Renders ENTIRELY server-side. Reads workflow_audits +
 * policy_generations via the Supabase service client (so we don't have
 * to mirror the rows into the Prisma layer), and analytics_events via
 * Prisma like the sibling /admin/analytics page.
 *
 * Auth: middleware enforces admin host (admin.grindworks.ai) + cookie.
 * No additional check here — same posture as /admin/analytics.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Tools funnel — Practiq Admin",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
  },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ── Shared constants ────────────────────────────────────────────────

const TOPIC_PAGES: { slug: string; label: string }[] = [
  {
    slug: "professional-services-ai-evidence-layer",
    label: "PS AI Evidence Layer",
  },
  { slug: "legal-ai-review-workflow", label: "Legal AI Review" },
  { slug: "client-context-memory", label: "Client Context Memory" },
];

const VERTICAL_LABELS: Record<string, string> = {
  cpa: "CPA",
  law: "Law",
  hr: "HR",
  marketing: "Marketing",
  consulting: "Consulting",
  other: "Other",
  legal: "Legal",
};

const PRIMARY_GAP_LABELS: Record<string, string> = {
  source: "Source",
  review_state: "Review state",
  client_context: "Client context",
  handoff: "Handoff",
  multiple: "Multiple",
};

// ── Types ──────────────────────────────────────────────────────────

interface WorkflowAuditRow {
  id: string;
  email: string;
  name: string | null;
  firm_name: string | null;
  firm_vertical: string | null;
  firm_size: string | null;
  client_count: string | null;
  responses: Record<string, unknown> | null;
  report: {
    headline?: string;
    primary_gap?: string;
    diagnosis_paragraphs?: string[];
    recommendations?: { title?: string; body?: string }[];
  } | null;
  landing_slug: string | null;
  source_platform: string | null;
  lane: string | null;
  topic: string | null;
  campaign: string | null;
  created_at: string;
}

interface PolicyGenerationRow {
  id: string;
  email: string;
  name: string | null;
  firm_name: string | null;
  firm_vertical: string | null;
  firm_size: string | null;
  states: string[] | null;
  responses: Record<string, unknown> | null;
  policy: {
    policy_title?: string;
    sections?: { heading?: string; body?: string }[];
    key_obligations?: string[];
  } | null;
  pdf_url: string | null;
  landing_slug: string | null;
  source_platform: string | null;
  lane: string | null;
  topic: string | null;
  campaign: string | null;
  created_at: string;
}

// ── Data loaders ────────────────────────────────────────────────────

function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function loadAudits(sinceDays: number): Promise<WorkflowAuditRow[]> {
  const client = supabase();
  if (!client) return [];
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
  const { data, error } = await client
    .from("workflow_audits")
    .select(
      "id, email, name, firm_name, firm_vertical, firm_size, client_count, responses, report, landing_slug, source_platform, lane, topic, campaign, created_at",
    )
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false })
    .limit(2000);
  if (error) {
    console.error("[tools-funnel] workflow_audits error:", error);
    return [];
  }
  return (data ?? []) as WorkflowAuditRow[];
}

async function loadPolicies(sinceDays: number): Promise<PolicyGenerationRow[]> {
  const client = supabase();
  if (!client) return [];
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
  // practiq schema requires explicit .schema() — supabase-js silently
  // returns 42501 if either the PostgREST db_schema or the service_role
  // grants are wrong (see memory).
  const { data, error } = await client
    .schema("practiq")
    .from("policy_generations")
    .select(
      "id, email, name, firm_name, firm_vertical, firm_size, states, responses, policy, pdf_url, landing_slug, source_platform, lane, topic, campaign, created_at",
    )
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false })
    .limit(2000);
  if (error) {
    console.error("[tools-funnel] policy_generations error:", error);
    return [];
  }
  return (data ?? []) as PolicyGenerationRow[];
}

// Count analytics events of a given type in a window where a JSON
// property matches a value. Uses Prisma path filter on the `properties`
// JSON column. Filters are bounded (limited types + windows) so the
// queries don't sweep the entire table.
async function countEventsByLandingSlug(
  type: string,
  landingSlug: string,
  sinceDays: number,
): Promise<number> {
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
  return prisma.analyticsEvent.count({
    where: {
      type,
      createdAt: { gte: since },
      properties: {
        path: ["landing_slug"],
        equals: landingSlug,
      },
    },
  });
}

// Count workflow_audit_step_advanced events at a specific step number
// for a landing slug — proxies "audit started" (step 1).
async function countAuditStarts(
  landingSlug: string,
  sinceDays: number,
): Promise<number> {
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
  return prisma.analyticsEvent.count({
    where: {
      type: "workflow_audit_step_advanced",
      createdAt: { gte: since },
      AND: [
        { properties: { path: ["landing_slug"], equals: landingSlug } },
        { properties: { path: ["step_number"], equals: 1 } },
      ],
    },
  });
}

// Count distinct visitors who fired $pageview for a given landing_slug.
async function countDistinctVisitors(
  landingSlug: string,
  sinceDays: number,
): Promise<number> {
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
  const rows = await prisma.analyticsEvent.groupBy({
    by: ["distinctId"],
    where: {
      type: "$pageview",
      createdAt: { gte: since },
      properties: { path: ["landing_slug"], equals: landingSlug },
    },
  });
  return rows.length;
}

// Audit → signup conversion: count distinctIds that fired
// workflow_audit_completed AND waitlist_signed_up within 24h after.
// Fetches recent completions and signups, joins in memory because
// Prisma can't express the temporal window across distinctIds.
async function loadAuditToSignupConversion(
  sinceDays: number,
): Promise<{ completions: number; converted: number }> {
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
  const [completions, signups] = await Promise.all([
    prisma.analyticsEvent.findMany({
      where: {
        type: "workflow_audit_completed",
        createdAt: { gte: since },
      },
      select: { distinctId: true, createdAt: true },
    }),
    prisma.analyticsEvent.findMany({
      where: {
        type: "waitlist_signed_up",
        createdAt: { gte: since },
      },
      select: { distinctId: true, createdAt: true },
    }),
  ]);
  // Bucket signups by distinctId for O(1) lookup.
  const signupsByDistinct = new Map<string, Date[]>();
  for (const s of signups) {
    if (!s.distinctId) continue;
    const arr = signupsByDistinct.get(s.distinctId) ?? [];
    arr.push(s.createdAt);
    signupsByDistinct.set(s.distinctId, arr);
  }
  let converted = 0;
  for (const c of completions) {
    if (!c.distinctId) continue;
    const cands = signupsByDistinct.get(c.distinctId);
    if (!cands) continue;
    const within24h = cands.some((t) => {
      const dt = t.getTime() - c.createdAt.getTime();
      return dt >= 0 && dt <= 24 * 60 * 60 * 1000;
    });
    if (within24h) converted++;
  }
  return { completions: completions.length, converted };
}

// Count signups attributed to a specific landing variant via the typed
// `properties.landing_slug` field on the waitlist_signed_up event.
async function countSignupsByLandingSlug(
  landingSlug: string,
  sinceDays: number,
): Promise<number> {
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
  return prisma.analyticsEvent.count({
    where: {
      type: "waitlist_signed_up",
      createdAt: { gte: since },
      properties: { path: ["landing_slug"], equals: landingSlug },
    },
  });
}

// Demo-workspace interaction depth — average distinct surfaces touched
// per distinctId within the window. Considers any analytics event tagged
// with landing_slug=demo-workspace and reads
// properties.demo_workspace_surface for the surface label.
async function loadDemoWorkspaceDepth(
  sinceDays: number,
): Promise<{ visitors: number; avgSurfaces: number }> {
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
  const rows = await prisma.analyticsEvent.findMany({
    where: {
      createdAt: { gte: since },
      properties: { path: ["landing_slug"], equals: "demo-workspace" },
    },
    select: { distinctId: true, properties: true, type: true },
  });
  const bySurface = new Map<string, Set<string>>();
  for (const r of rows) {
    if (!r.distinctId) continue;
    const props = r.properties as Record<string, unknown> | null;
    const surface =
      props && typeof props.demo_workspace_surface === "string"
        ? (props.demo_workspace_surface as string)
        : r.type === "demo_workspace_interaction" &&
            props &&
            typeof props.surface === "string"
          ? (props.surface as string)
          : null;
    if (!surface) continue;
    const set = bySurface.get(r.distinctId) ?? new Set<string>();
    set.add(surface);
    bySurface.set(r.distinctId, set);
  }
  const visitors = bySurface.size;
  const totalSurfaces = Array.from(bySurface.values()).reduce(
    (s, set) => s + set.size,
    0,
  );
  return {
    visitors,
    avgSurfaces: visitors > 0 ? totalSurfaces / visitors : 0,
  };
}

// ── Aggregators ────────────────────────────────────────────────────

interface FunnelRow {
  slug: string;
  label: string;
  pageviews: number;
  ctaClicks: number;
  auditStarts: number;
  auditCompletions: number;
  signups: number;
}

async function loadTopicFunnel(sinceDays: number): Promise<FunnelRow[]> {
  const audits = await loadAudits(sinceDays);
  return Promise.all(
    TOPIC_PAGES.map(async (t) => {
      const [pageviews, ctaClicks, auditStarts, signups] = await Promise.all([
        countEventsByLandingSlug("$pageview", t.slug, sinceDays),
        countEventsByLandingSlug("sns_cta_clicked", t.slug, sinceDays),
        countAuditStarts(t.slug, sinceDays),
        countSignupsByLandingSlug(t.slug, sinceDays),
      ]);
      const auditCompletions = audits.filter(
        (a) => a.landing_slug === t.slug,
      ).length;
      return {
        slug: t.slug,
        label: t.label,
        pageviews,
        ctaClicks,
        auditStarts,
        auditCompletions,
        signups,
      };
    }),
  );
}

interface VerticalRow {
  vertical: string;
  audits: number;
  policies: number;
  primaryGap: Record<string, number>;
}

function aggregateByVertical(
  audits: WorkflowAuditRow[],
  policies: PolicyGenerationRow[],
): VerticalRow[] {
  const map = new Map<string, VerticalRow>();
  const ensure = (v: string): VerticalRow => {
    const key = v || "other";
    let row = map.get(key);
    if (!row) {
      row = { vertical: key, audits: 0, policies: 0, primaryGap: {} };
      map.set(key, row);
    }
    return row;
  };
  for (const a of audits) {
    const row = ensure(a.firm_vertical ?? "other");
    row.audits++;
    const gap = a.report?.primary_gap ?? "unknown";
    row.primaryGap[gap] = (row.primaryGap[gap] ?? 0) + 1;
  }
  for (const p of policies) {
    const row = ensure(p.firm_vertical ?? "other");
    row.policies++;
  }
  return Array.from(map.values()).sort(
    (a, b) => b.audits + b.policies - (a.audits + a.policies),
  );
}

interface SnsRow {
  source: string;
  lane: string;
  topic: string;
  audits: number;
  policies: number;
  signups: number;
}

async function loadSnsAttribution(sinceDays: number): Promise<SnsRow[]> {
  const [audits, policies, signups] = await Promise.all([
    loadAudits(sinceDays),
    loadPolicies(sinceDays),
    loadSignupEvents(sinceDays),
  ]);
  const key = (s: string | null, l: string | null, t: string | null) =>
    `${s ?? "(direct)"}::${l ?? "(none)"}::${t ?? "(none)"}`;
  const map = new Map<string, SnsRow>();
  const ensure = (s: string | null, l: string | null, t: string | null) => {
    const k = key(s, l, t);
    let row = map.get(k);
    if (!row) {
      row = {
        source: s ?? "(direct)",
        lane: l ?? "(none)",
        topic: t ?? "(none)",
        audits: 0,
        policies: 0,
        signups: 0,
      };
      map.set(k, row);
    }
    return row;
  };
  for (const a of audits)
    ensure(a.source_platform, a.lane, a.topic ?? a.landing_slug).audits++;
  for (const p of policies)
    ensure(p.source_platform, p.lane, p.topic ?? p.landing_slug).policies++;
  for (const s of signups) ensure(s.source, s.lane, s.topic).signups++;
  return Array.from(map.values())
    .sort(
      (a, b) =>
        b.audits + b.policies + b.signups - (a.audits + a.policies + a.signups),
    )
    .slice(0, 30);
}

interface SignupSummary {
  source: string | null;
  lane: string | null;
  topic: string | null;
}

async function loadSignupEvents(sinceDays: number): Promise<SignupSummary[]> {
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
  const rows = await prisma.analyticsEvent.findMany({
    where: {
      type: "waitlist_signed_up",
      createdAt: { gte: since },
    },
    select: { properties: true },
    take: 2000,
  });
  return rows.map((r) => {
    const props = (r.properties ?? {}) as Record<string, unknown>;
    return {
      source:
        typeof props.source_platform === "string"
          ? (props.source_platform as string)
          : null,
      lane: typeof props.lane === "string" ? (props.lane as string) : null,
      topic:
        typeof props.topic === "string"
          ? (props.topic as string)
          : typeof props.landing_slug === "string"
            ? (props.landing_slug as string)
            : null,
    };
  });
}

// ── Page ────────────────────────────────────────────────────────────

export default async function ToolsFunnelPage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    return (
      <ErrorBox message="Supabase environment variables are not configured." />
    );
  }

  const [
    audits30,
    policies30,
    funnel7d,
    funnel30d,
    conv7d,
    demoDepth30,
    snsRows,
  ] = await Promise.all([
    loadAudits(30),
    loadPolicies(30),
    loadTopicFunnel(7),
    loadTopicFunnel(30),
    loadAuditToSignupConversion(7),
    loadDemoWorkspaceDepth(30),
    loadSnsAttribution(30),
  ]);

  const verticalRows = aggregateByVertical(audits30, policies30);
  const conversionPct =
    conv7d.completions > 0
      ? ((conv7d.converted / conv7d.completions) * 100).toFixed(1)
      : "—";

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 text-zinc-100">
      <header className="mb-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-2">
          Free tool surfaces
        </p>
        <h1 className="text-3xl md:text-4xl font-black text-zinc-100 tracking-tight mb-3">
          Tools funnel
        </h1>
        <p className="text-zinc-400 text-sm max-w-2xl">
          Workflow audit, AI policy generator, demo workspace. Conversion
          from SNS topic pages through to the waitlist. All data is
          dynamic — reload to refresh.
        </p>
        <div className="mt-4 text-[11px] text-zinc-500">
          <Link
            href="/admin/analytics"
            className="underline-offset-2 hover:text-zinc-300 hover:underline"
          >
            ← Back to product analytics
          </Link>
        </div>
      </header>

      {/* Headline metrics (last 30d) */}
      <Section title="Headline metrics — last 30 days">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat
            label="Workflow audits"
            value={audits30.length}
            sub="completed (LLM report saved)"
          />
          <Stat
            label="AI policies"
            value={policies30.length}
            sub="generated (LLM policy saved)"
          />
          <Stat
            label="Sample workspace"
            value={demoDepth30.visitors}
            sub="distinct visitors (30d)"
          />
          <Stat
            label="Audit → signup"
            value={conv7d.converted}
            sub={`${conversionPct}% of ${conv7d.completions} audits (7d, within 24h)`}
          />
        </div>
      </Section>

      {/* Per-topic funnel — 7d / 30d side by side */}
      <Section title="Topic page funnel">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <FunnelTable label="Last 7 days" rows={funnel7d} />
          <FunnelTable label="Last 30 days" rows={funnel30d} />
        </div>
      </Section>

      {/* By vertical */}
      <Section title="By firm vertical (30d)">
        <VerticalTable rows={verticalRows} />
      </Section>

      {/* SNS attribution */}
      <Section title="SNS attribution (source × lane × topic, 30d)">
        <SnsTable rows={snsRows} />
      </Section>

      {/* Demo workspace depth */}
      <Section title="Demo workspace interaction depth (30d)">
        <div className="bento-card p-6">
          <div className="flex items-baseline gap-4">
            <span className="text-3xl font-black text-zinc-100">
              {demoDepth30.avgSurfaces.toFixed(2)}
            </span>
            <span className="text-sm text-zinc-500">
              surfaces per visitor (across {demoDepth30.visitors} visitor
              {demoDepth30.visitors === 1 ? "" : "s"})
            </span>
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            Counted: dashboard, clients_list, client_detail, approval_queue.
            Higher numbers = stronger engagement with the read-only sample.
          </p>
        </div>
      </Section>

      {/* Recent submissions feed */}
      <Section
        title={`Recent submissions feed — last ${Math.min(20, audits30.length)} audits + last ${Math.min(20, policies30.length)} policies`}
      >
        <RecentFeed
          audits={audits30.slice(0, 20)}
          policies={policies30.slice(0, 20)}
        />
      </Section>

      <footer className="mt-12 text-xs text-zinc-600 text-center">
        Sources: Supabase{" "}
        <code className="text-zinc-400">public.workflow_audits</code>,{" "}
        <code className="text-zinc-400">practiq.policy_generations</code>,{" "}
        <code className="text-zinc-400">practiq.analytics_events</code>.
      </footer>
    </div>
  );
}

// ── UI helpers ─────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <h2 className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-4">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: number;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-[#0a0a0a] p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
        {label}
      </p>
      <p className="text-2xl font-extrabold tracking-tight text-zinc-100">
        {value.toLocaleString()}
      </p>
      {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
    </div>
  );
}

function FunnelTable({ label, rows }: { label: string; rows: FunnelRow[] }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-[#0a0a0a] overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800/60 bg-zinc-900/40">
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
          {label}
        </span>
      </div>
      <table className="w-full text-xs">
        <thead className="text-[10px] uppercase tracking-widest text-zinc-500">
          <tr className="border-b border-zinc-800/60">
            <th className="text-left px-3 py-2 font-bold">Page</th>
            <th className="text-right px-3 py-2 font-bold">PV</th>
            <th className="text-right px-3 py-2 font-bold">CTA</th>
            <th className="text-right px-3 py-2 font-bold">Start</th>
            <th className="text-right px-3 py-2 font-bold">Done</th>
            <th className="text-right px-3 py-2 font-bold">Signup</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.slug} className="border-t border-zinc-800/60">
              <td className="px-3 py-2 text-zinc-300">{r.label}</td>
              <td className="px-3 py-2 text-right font-mono text-zinc-100">
                {r.pageviews}
              </td>
              <td className="px-3 py-2 text-right font-mono text-zinc-100">
                {r.ctaClicks}
              </td>
              <td className="px-3 py-2 text-right font-mono text-zinc-100">
                {r.auditStarts}
              </td>
              <td className="px-3 py-2 text-right font-mono text-emerald-400">
                {r.auditCompletions}
              </td>
              <td className="px-3 py-2 text-right font-mono text-emerald-400">
                {r.signups}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VerticalTable({ rows }: { rows: VerticalRow[] }) {
  if (rows.length === 0) return <EmptyBox message="No submissions yet." />;
  return (
    <div className="rounded-xl border border-zinc-800 bg-[#0a0a0a] overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-zinc-900/40 text-[10px] uppercase tracking-widest text-zinc-400">
          <tr>
            <th className="text-left px-4 py-3 font-bold">Vertical</th>
            <th className="text-right px-4 py-3 font-bold">Audits</th>
            <th className="text-right px-4 py-3 font-bold">Policies</th>
            <th className="text-left px-4 py-3 font-bold">
              Primary gap distribution (audits)
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const total = Object.values(r.primaryGap).reduce(
              (s, n) => s + n,
              0,
            );
            const items = Object.entries(r.primaryGap)
              .sort((a, b) => b[1] - a[1])
              .map(([gap, n]) => {
                const pct = total > 0 ? Math.round((n / total) * 100) : 0;
                return `${PRIMARY_GAP_LABELS[gap] ?? gap}: ${n} (${pct}%)`;
              });
            return (
              <tr key={r.vertical} className="border-t border-zinc-800/60">
                <td className="px-4 py-3 text-zinc-200">
                  {VERTICAL_LABELS[r.vertical] ?? r.vertical}
                </td>
                <td className="px-4 py-3 text-right font-mono text-zinc-100">
                  {r.audits}
                </td>
                <td className="px-4 py-3 text-right font-mono text-zinc-100">
                  {r.policies}
                </td>
                <td className="px-4 py-3 text-zinc-400 text-xs">
                  {items.length > 0 ? items.join(" · ") : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SnsTable({ rows }: { rows: SnsRow[] }) {
  if (rows.length === 0) return <EmptyBox message="No SNS-attributed traffic yet." />;
  return (
    <div className="rounded-xl border border-zinc-800 bg-[#0a0a0a] overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-zinc-900/40 text-[10px] uppercase tracking-widest text-zinc-400">
          <tr>
            <th className="text-left px-4 py-3 font-bold">Source</th>
            <th className="text-left px-4 py-3 font-bold">Lane</th>
            <th className="text-left px-4 py-3 font-bold">Topic</th>
            <th className="text-right px-4 py-3 font-bold">Audits</th>
            <th className="text-right px-4 py-3 font-bold">Policies</th>
            <th className="text-right px-4 py-3 font-bold">Signups</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-zinc-800/60">
              <td className="px-4 py-3 font-mono text-xs text-zinc-200">
                {r.source}
              </td>
              <td className="px-4 py-3 text-zinc-400 text-xs">{r.lane}</td>
              <td className="px-4 py-3 font-mono text-xs text-zinc-300 break-all">
                {r.topic}
              </td>
              <td className="px-4 py-3 text-right font-mono">{r.audits}</td>
              <td className="px-4 py-3 text-right font-mono">{r.policies}</td>
              <td className="px-4 py-3 text-right font-mono text-emerald-400">
                {r.signups}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecentFeed({
  audits,
  policies,
}: {
  audits: WorkflowAuditRow[];
  policies: PolicyGenerationRow[];
}) {
  if (audits.length === 0 && policies.length === 0) {
    return <EmptyBox message="No submissions yet." />;
  }
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-xl border border-zinc-800 bg-[#0a0a0a]">
        <div className="px-4 py-3 border-b border-zinc-800/60 bg-zinc-900/40">
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
            Workflow audits ({audits.length})
          </span>
        </div>
        <div>
          {audits.map((a) => (
            <AuditRow key={a.id} a={a} />
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-zinc-800 bg-[#0a0a0a]">
        <div className="px-4 py-3 border-b border-zinc-800/60 bg-zinc-900/40">
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
            AI policies ({policies.length})
          </span>
        </div>
        <div>
          {policies.map((p) => (
            <PolicyRow key={p.id} p={p} />
          ))}
        </div>
      </div>
    </div>
  );
}

function AuditRow({ a }: { a: WorkflowAuditRow }) {
  return (
    <details className="border-t border-zinc-800/60 first:border-t-0 group">
      <summary className="px-4 py-3 cursor-pointer hover:bg-zinc-900/30 list-none">
        <div className="flex items-baseline justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-mono text-zinc-200 truncate">
              {a.email}
            </div>
            <div className="text-[11px] text-zinc-500 truncate">
              {a.firm_name ?? "—"} ·{" "}
              {VERTICAL_LABELS[a.firm_vertical ?? ""] ??
                a.firm_vertical ??
                "—"}{" "}
              ·{" "}
              {PRIMARY_GAP_LABELS[a.report?.primary_gap ?? ""] ??
                a.report?.primary_gap ??
                "—"}{" "}
              · {a.source_platform ?? "direct"}
            </div>
          </div>
          <div className="text-[10px] font-mono text-zinc-500 shrink-0">
            {formatRelative(a.created_at)}
          </div>
        </div>
      </summary>
      <div className="px-4 pb-4 pt-1 text-xs text-zinc-400 space-y-2">
        {a.report?.headline && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
              Headline
            </div>
            <div className="text-zinc-200">{a.report.headline}</div>
          </div>
        )}
        {Array.isArray(a.report?.diagnosis_paragraphs) &&
          a.report!.diagnosis_paragraphs!.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
                Diagnosis
              </div>
              {a.report!.diagnosis_paragraphs!.map((p, i) => (
                <p key={i} className="text-zinc-300 mb-1 leading-relaxed">
                  {p}
                </p>
              ))}
            </div>
          )}
        {Array.isArray(a.report?.recommendations) &&
          a.report!.recommendations!.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
                Recommendations ({a.report!.recommendations!.length})
              </div>
              <ul className="list-disc pl-5 text-zinc-300 space-y-1">
                {a.report!.recommendations!.map((r, i) => (
                  <li key={i}>
                    <span className="font-semibold text-zinc-100">
                      {r.title ?? "—"}
                    </span>
                    {r.body ? <>: {r.body}</> : null}
                  </li>
                ))}
              </ul>
            </div>
          )}
      </div>
    </details>
  );
}

function PolicyRow({ p }: { p: PolicyGenerationRow }) {
  const sectionCount = Array.isArray(p.policy?.sections)
    ? p.policy!.sections!.length
    : 0;
  return (
    <details className="border-t border-zinc-800/60 first:border-t-0 group">
      <summary className="px-4 py-3 cursor-pointer hover:bg-zinc-900/30 list-none">
        <div className="flex items-baseline justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-mono text-zinc-200 truncate">
              {p.email}
            </div>
            <div className="text-[11px] text-zinc-500 truncate">
              {p.firm_name ?? "—"} ·{" "}
              {VERTICAL_LABELS[p.firm_vertical ?? ""] ??
                p.firm_vertical ??
                "—"}{" "}
              · {sectionCount} section{sectionCount === 1 ? "" : "s"} ·{" "}
              {p.source_platform ?? "direct"}
            </div>
          </div>
          <div className="text-[10px] font-mono text-zinc-500 shrink-0">
            {formatRelative(p.created_at)}
          </div>
        </div>
      </summary>
      <div className="px-4 pb-4 pt-1 text-xs text-zinc-400 space-y-2">
        {p.policy?.policy_title && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
              Policy title
            </div>
            <div className="text-zinc-200">{p.policy.policy_title}</div>
          </div>
        )}
        {Array.isArray(p.policy?.sections) &&
          p.policy!.sections!.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
                Sections
              </div>
              <ul className="list-disc pl-5 text-zinc-300 space-y-1">
                {p.policy!.sections!.map((s, i) => (
                  <li key={i}>
                    <span className="font-semibold text-zinc-100">
                      {s.heading ?? "—"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        <div className="flex items-center gap-3 pt-2">
          {p.pdf_url ? (
            <a
              href={p.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:text-emerald-300 underline-offset-2 hover:underline text-xs"
            >
              View PDF →
            </a>
          ) : (
            <a
              href={`/api/ai-policy-generator/${p.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-300 hover:text-zinc-100 underline-offset-2 hover:underline text-xs"
            >
              Render PDF →
            </a>
          )}
        </div>
      </div>
    </details>
  );
}

function EmptyBox({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-[#0a0a0a] p-8 text-center text-sm text-zinc-500">
      {message}
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="max-w-3xl mx-auto py-32 px-6">
      <div className="rounded-xl border border-zinc-800 bg-[#0a0a0a] p-8">
        <div className="text-[10px] font-bold uppercase tracking-widest text-red-400 mb-2">
          Error
        </div>
        <p className="text-zinc-200">{message}</p>
      </div>
    </div>
  );
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}
