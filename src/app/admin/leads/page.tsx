/**
 * /admin/leads — Active Leads inbox.
 *
 * Operator-facing single view of inbound prospects, merged across:
 *   - public.waitlist
 *   - public.workflow_audits
 *   - practiq.policy_generations
 *   - public.newsletter_subscribers
 *
 * Keyed by lowercased email. Stat strip + filters + sortable table
 * with expandable rows. Inline status + notes are managed by the
 * client-side LeadRow component which PATCHes back to the API.
 *
 * Auth: middleware enforces admin host + cookie. Same posture as
 * /admin/signups and /admin/incidents.
 */
import { createClient } from "@supabase/supabase-js";
import { loadLeads, LEAD_STATUSES, type LeadStatus } from "@/lib/admin/leads";
import { LeadRow } from "./LeadRow";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface SearchParams {
  status?: string;
  vertical?: string;
  source?: string;
  sort?: string;
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const search = await searchParams;
  const statusFilter = (search?.status ?? "all") as LeadStatus | "all";
  const verticalFilter = search?.vertical ?? "all";
  const sourceFilter = search?.source ?? "all";
  const sortFilter = (search?.sort ?? "recent") as "recent" | "warmth";

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    return (
      <ErrorBox message="Supabase environment variables are not configured." />
    );
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const bundle = await loadLeads(supabase, {
    status: statusFilter,
    vertical: verticalFilter,
    sourcePlatform: sourceFilter,
    sort: sortFilter,
    limit: 500,
  });

  return (
    <div className="max-w-6xl mx-auto py-12 px-6">
      <header className="mb-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-2">
          Operator inbox
        </p>
        <h1 className="text-3xl md:text-4xl font-black text-zinc-100 tracking-tight mb-3">
          Active Leads
        </h1>
        <p className="text-zinc-400 text-sm max-w-2xl">
          All inbound prospects merged by email across waitlist, workflow
          audits, AI policy generator, and newsletter. Set a status, jot a
          note, open the underlying artifacts. PII is shown un-masked here
          because this view is admin-only and you need the raw email to
          reply.
        </p>
      </header>

      {/* Stat strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <Stat label="New (last 7d)" value={bundle.stats.newLast7d} />
        <Stat label="Awaiting reply" value={bundle.stats.awaitingReply} />
        <Stat label="In conversation" value={bundle.stats.inActiveConversation} />
        <Stat label="Design partners" value={bundle.stats.designPartner} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <FilterGroup
          label="Status"
          paramKey="status"
          current={statusFilter}
          options={[
            { value: "all", label: "All" },
            ...LEAD_STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, " ") })),
          ]}
          otherParams={{
            vertical: verticalFilter,
            source: sourceFilter,
            sort: sortFilter,
          }}
        />
        {bundle.facets.verticals.length > 0 && (
          <FilterGroup
            label="Vertical"
            paramKey="vertical"
            current={verticalFilter}
            options={[
              { value: "all", label: "All" },
              ...bundle.facets.verticals.map((v) => ({ value: v, label: v })),
            ]}
            otherParams={{
              status: statusFilter,
              source: sourceFilter,
              sort: sortFilter,
            }}
          />
        )}
        {bundle.facets.sourcePlatforms.length > 0 && (
          <FilterGroup
            label="Source"
            paramKey="source"
            current={sourceFilter}
            options={[
              { value: "all", label: "All" },
              ...bundle.facets.sourcePlatforms.map((s) => ({
                value: s,
                label: s,
              })),
            ]}
            otherParams={{
              status: statusFilter,
              vertical: verticalFilter,
              sort: sortFilter,
            }}
          />
        )}
        <FilterGroup
          label="Sort"
          paramKey="sort"
          current={sortFilter}
          options={[
            { value: "recent", label: "Most recent" },
            { value: "warmth", label: "Warmest" },
          ]}
          otherParams={{
            status: statusFilter,
            vertical: verticalFilter,
            source: sourceFilter,
          }}
        />
      </div>

      {bundle.errors.length > 0 && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 mb-6 text-sm text-red-300">
          <div className="text-[10px] font-bold uppercase tracking-widest mb-1">
            Source errors
          </div>
          <ul className="font-mono text-xs space-y-1">
            {bundle.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <section>
        <h2 className="text-lg font-bold text-zinc-100 mb-4">
          Leads ({bundle.total.toLocaleString()})
        </h2>
        {bundle.leads.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-[#0a0a0a] p-8 text-center text-sm text-zinc-500">
            No leads match this filter.
          </div>
        ) : (
          <div className="space-y-2">
            {bundle.leads.map((l) => (
              <LeadRow key={l.email} lead={l} />
            ))}
          </div>
        )}
      </section>

      <footer className="mt-12 text-xs text-zinc-600 text-center">
        Page is dynamic · reload to refresh · sources: waitlist ·
        workflow_audits · practiq.policy_generations · newsletter_subscribers
        · practiq.lead_status
      </footer>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-[#0a0a0a] p-4">
      <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
        {label}
      </div>
      <div className="text-3xl font-black text-zinc-100">{value}</div>
    </div>
  );
}

function FilterGroup({
  label,
  options,
  current,
  paramKey,
  otherParams,
}: {
  label: string;
  options: { value: string; label: string }[];
  current: string;
  paramKey: string;
  otherParams: Record<string, string>;
}) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
        {label}
      </div>
      <div className="flex flex-wrap gap-1">
        {options.map((o) => {
          const params = new URLSearchParams({
            ...otherParams,
            [paramKey]: o.value,
          });
          const href = `/admin/leads?${params.toString()}`;
          const active = current === o.value;
          return (
            <a
              key={o.value}
              href={href}
              className={
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-colors capitalize " +
                (active
                  ? "bg-zinc-100 text-zinc-950"
                  : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800")
              }
            >
              {o.label}
            </a>
          );
        })}
      </div>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="max-w-2xl mx-auto py-12 px-6">
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6 text-red-300 text-sm">
        {message}
      </div>
    </div>
  );
}
