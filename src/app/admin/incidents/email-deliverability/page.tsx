/**
 * /admin/incidents/email-deliverability — Wave 16.
 *
 * Source: practiq.email_suppressions, written by recordSuppression()
 * from src/lib/email/tracking.ts every time the Resend webhook reports
 * a bounce or complaint. One row per recipient — repeat bounces bump
 * counters + last_seen_at instead of creating new rows.
 *
 * What the operator gets here:
 *   - Health snapshot: paying-customer bounces (open, last 7d), total
 *     open complaints, open bounces, resolved-this-week.
 *   - Filterable list of every suppressed address with masked
 *     recipient, last tag, bounce/complaint counts.
 *   - "Mark resolved" server-action for triaged addresses.
 *
 * Auth: middleware enforces admin host + cookie.
 */
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { markSuppressionResolved } from "@/lib/email/suppressions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface SuppressionRow {
  id: string;
  recipient: string;
  recipient_domain: string;
  reason: string;
  bounce_type: string | null;
  last_tag: string | null;
  last_message_id: string | null;
  bounce_count: number;
  complaint_count: number;
  is_paying_customer: boolean;
  status: string;
  last_slack_at: string | null;
  first_seen_at: string;
  last_seen_at: string;
  resolved_at: string | null;
}

interface SearchParams {
  reason?: string;
  status?: string;
  paying?: string;
  domain?: string;
}

const REASON_OPTIONS = ["all", "bounce", "complaint"];
const STATUS_OPTIONS = ["all", "open", "resolved"];
const PAYING_OPTIONS = ["all", "yes", "no"];

function reasonBadge(r: string): { color: string; label: string } {
  switch (r) {
    case "complaint":
      return { color: "bg-red-500/15 text-red-400", label: "COMPLAINT" };
    case "bounce":
      return { color: "bg-amber-500/15 text-amber-400", label: "BOUNCE" };
    default:
      return { color: "bg-zinc-800 text-zinc-400", label: r.toUpperCase() };
  }
}

function statusBadge(s: string): { color: string; label: string } {
  switch (s) {
    case "open":
      return { color: "bg-amber-500/15 text-amber-400", label: "OPEN" };
    case "resolved":
      return {
        color: "bg-emerald-500/15 text-emerald-400",
        label: "RESOLVED",
      };
    default:
      return { color: "bg-zinc-800 text-zinc-400", label: s.toUpperCase() };
  }
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s ago`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

function mask(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return "(masked)";
  return `${email[0]}***${email.slice(at)}`;
}

async function resolveSuppression(formData: FormData): Promise<void> {
  "use server";
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await markSuppressionResolved(id);
  revalidatePath("/admin/incidents/email-deliverability");
}

export default async function EmailDeliverabilityPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const search = await searchParams;
  const reasonFilter = search?.reason ?? "all";
  const statusFilter = search?.status ?? "open";
  const payingFilter = search?.paying ?? "all";
  const domainFilter = (search?.domain ?? "").trim().toLowerCase();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    return (
      <ErrorBox message="Supabase environment variables are not configured." />
    );
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  // List rows matching filter (latest 100 by last_seen_at).
  let q = supabase
    .schema("practiq")
    .from("email_suppressions")
    .select(
      "id, recipient, recipient_domain, reason, bounce_type, last_tag, last_message_id, bounce_count, complaint_count, is_paying_customer, status, last_slack_at, first_seen_at, last_seen_at, resolved_at",
    )
    .order("last_seen_at", { ascending: false })
    .limit(100);
  if (reasonFilter !== "all") q = q.eq("reason", reasonFilter);
  if (statusFilter !== "all") q = q.eq("status", statusFilter);
  if (payingFilter === "yes") q = q.eq("is_paying_customer", true);
  if (payingFilter === "no") q = q.eq("is_paying_customer", false);
  if (domainFilter) q = q.ilike("recipient_domain", `%${domainFilter}%`);

  const { data, error } = await q;
  if (error) {
    return (
      <ErrorBox message={`email_suppressions: ${error.message}`} />
    );
  }
  const rows = (data ?? []) as SuppressionRow[];

  // Stat strip — health snapshot (independent of the filter chips).
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const [openTotal, openComplaints, payingCustomerOpen, resolvedLast7d] =
    await Promise.all([
      supabase
        .schema("practiq")
        .from("email_suppressions")
        .select("id", { count: "exact", head: true })
        .eq("status", "open")
        .eq("reason", "bounce"),
      supabase
        .schema("practiq")
        .from("email_suppressions")
        .select("id", { count: "exact", head: true })
        .eq("status", "open")
        .eq("reason", "complaint"),
      supabase
        .schema("practiq")
        .from("email_suppressions")
        .select("id", { count: "exact", head: true })
        .eq("status", "open")
        .eq("is_paying_customer", true),
      supabase
        .schema("practiq")
        .from("email_suppressions")
        .select("id", { count: "exact", head: true })
        .eq("status", "resolved")
        .gte("resolved_at", sevenDaysAgo),
    ]);

  return (
    <div className="max-w-6xl mx-auto py-12 px-6">
      <header className="mb-10">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-2">
          Production triage · Deliverability
        </p>
        <h1 className="text-3xl md:text-4xl font-black text-zinc-100 tracking-tight mb-3">
          Email deliverability
        </h1>
        <p className="text-zinc-400 text-sm max-w-2xl">
          Every recipient that bounced or complained, one row each. Repeat
          bounces bump counters silently — Slack only fires on the first
          alert (or after a 24h re-fire window). Paying-customer bounces
          escalate to critical severity.
        </p>
      </header>

      {/* Stat strip */}
      <section className="mb-8">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">
          Health snapshot
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat
            label="Paying customer · open"
            value={payingCustomerOpen.count ?? 0}
            tone={
              (payingCustomerOpen.count ?? 0) > 0 ? "bad" : "good"
            }
            sublabel="Critical priority"
          />
          <Stat
            label="Open complaints"
            value={openComplaints.count ?? 0}
            tone={
              (openComplaints.count ?? 0) > 0 ? "bad" : "good"
            }
            sublabel="Sender-reputation risk"
          />
          <Stat
            label="Open bounces"
            value={openTotal.count ?? 0}
            tone={
              (openTotal.count ?? 0) > 25
                ? "bad"
                : (openTotal.count ?? 0) > 5
                  ? "warn"
                  : "good"
            }
            sublabel="Suppressed addresses"
          />
          <Stat
            label="Resolved · 7d"
            value={resolvedLast7d.count ?? 0}
            tone="neutral"
            sublabel="Triaged this week"
          />
        </div>
      </section>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-3 mb-8">
        <FilterGroup
          label="Reason"
          options={REASON_OPTIONS.map((r) => ({ value: r, label: r }))}
          current={reasonFilter}
          paramKey="reason"
          otherParams={{
            status: statusFilter,
            paying: payingFilter,
            domain: domainFilter,
          }}
        />
        <FilterGroup
          label="Status"
          options={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
          current={statusFilter}
          paramKey="status"
          otherParams={{
            reason: reasonFilter,
            paying: payingFilter,
            domain: domainFilter,
          }}
        />
        <FilterGroup
          label="Paying customer"
          options={PAYING_OPTIONS.map((p) => ({ value: p, label: p }))}
          current={payingFilter}
          paramKey="paying"
          otherParams={{
            reason: reasonFilter,
            status: statusFilter,
            domain: domainFilter,
          }}
        />
        <form
          action="/admin/incidents/email-deliverability"
          method="GET"
          className="flex flex-col gap-2"
        >
          <input type="hidden" name="reason" value={reasonFilter} />
          <input type="hidden" name="status" value={statusFilter} />
          <input type="hidden" name="paying" value={payingFilter} />
          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            Domain
          </label>
          <input
            type="text"
            name="domain"
            defaultValue={domainFilter}
            placeholder="example.com"
            className="bg-zinc-900 border border-zinc-700 text-zinc-100 placeholder:text-zinc-500 rounded-lg px-3 py-1.5 text-xs w-56"
          />
        </form>
      </div>

      {/* List */}
      <section className="mb-12">
        <h2 className="text-lg font-bold text-zinc-100 mb-4">
          Suppressions ({rows.length})
        </h2>
        {rows.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-[#0a0a0a] p-8 text-center text-sm text-zinc-500">
            No matching deliverability incidents.
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <SuppressionCard
                key={r.id}
                row={r}
                resolveAction={resolveSuppression}
              />
            ))}
          </div>
        )}
      </section>

      <footer className="mt-12 text-xs text-zinc-600 text-center">
        Page is dynamic · reload to refresh · source:{" "}
        <code className="text-zinc-400">practiq.email_suppressions</code>
      </footer>
    </div>
  );
}

function Stat({
  label,
  value,
  sublabel,
  tone = "neutral",
}: {
  label: string;
  value: number | string;
  sublabel?: string;
  tone?: "good" | "warn" | "bad" | "neutral";
}) {
  const toneClass =
    tone === "good"
      ? "text-emerald-400"
      : tone === "warn"
        ? "text-amber-400"
        : tone === "bad"
          ? "text-red-400"
          : "text-zinc-100";
  return (
    <div className="rounded-xl border border-zinc-800 bg-[#0a0a0a] p-4">
      <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
        {label}
      </div>
      <div className={`text-3xl font-black ${toneClass}`}>{value}</div>
      {sublabel && (
        <div className="text-[10px] text-zinc-600 mt-1">{sublabel}</div>
      )}
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
          const href = `/admin/incidents/email-deliverability?${params.toString()}`;
          const active = current === o.value;
          return (
            <a
              key={o.value}
              href={href}
              className={
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-colors " +
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

function SuppressionCard({
  row,
  resolveAction,
}: {
  row: SuppressionRow;
  resolveAction: (formData: FormData) => Promise<void>;
}) {
  const rBadge = reasonBadge(row.reason);
  const sBadge = statusBadge(row.status);
  return (
    <details className="rounded-xl border border-zinc-800 bg-[#0a0a0a] group open:border-zinc-700">
      <summary className="cursor-pointer p-4 list-none flex flex-col gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span
            className={
              "px-2 py-0.5 rounded text-[10px] font-bold tracking-wider " +
              rBadge.color
            }
          >
            {rBadge.label}
          </span>
          <span
            className={
              "px-2 py-0.5 rounded text-[10px] font-bold tracking-wider " +
              sBadge.color
            }
          >
            {sBadge.label}
          </span>
          {row.is_paying_customer && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-red-500/15 text-red-400">
              PAYING CUSTOMER
            </span>
          )}
          <span className="text-sm font-mono text-zinc-100 break-all">
            {mask(row.recipient)}
          </span>
          <span className="ml-auto text-[10px] text-zinc-500 font-mono">
            {relativeTime(row.last_seen_at)}
          </span>
        </div>
        <div className="flex flex-wrap gap-3 text-[11px] text-zinc-500">
          <span>domain: <span className="text-zinc-400">{row.recipient_domain || "—"}</span></span>
          {row.last_tag && <span>tag: <span className="text-zinc-400">{row.last_tag}</span></span>}
          <span>bounces: <span className="text-zinc-400">{row.bounce_count}</span></span>
          {row.complaint_count > 0 && (
            <span>complaints: <span className="text-red-400">{row.complaint_count}</span></span>
          )}
          {row.bounce_type && row.bounce_type !== "unknown" && (
            <span>type: {row.bounce_type}</span>
          )}
        </div>
      </summary>
      <div className="border-t border-zinc-800 px-4 py-3 space-y-3 text-xs">
        <DetailRow label="Recipient" value={mask(row.recipient)} />
        <DetailRow label="Domain" value={row.recipient_domain || "—"} />
        <DetailRow
          label="First seen"
          value={`${new Date(row.first_seen_at).toLocaleString()} · ${relativeTime(row.first_seen_at)}`}
        />
        <DetailRow
          label="Last seen"
          value={`${new Date(row.last_seen_at).toLocaleString()} · ${relativeTime(row.last_seen_at)}`}
        />
        {row.last_slack_at && (
          <DetailRow
            label="Last Slack"
            value={`${new Date(row.last_slack_at).toLocaleString()} · ${relativeTime(row.last_slack_at)}`}
          />
        )}
        {row.last_message_id && (
          <DetailRow label="Last message" value={row.last_message_id} />
        )}
        {row.resolved_at && (
          <DetailRow
            label="Resolved"
            value={`${new Date(row.resolved_at).toLocaleString()} · ${relativeTime(row.resolved_at)}`}
          />
        )}
        {row.status === "open" && (
          <form action={resolveAction} className="pt-2">
            <input type="hidden" name="id" value={row.id} />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-colors"
            >
              Mark resolved
            </button>
          </form>
        )}
      </div>
    </details>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 w-28 shrink-0">
        {label}
      </span>
      <span className="text-zinc-300 font-mono break-all">{value}</span>
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
