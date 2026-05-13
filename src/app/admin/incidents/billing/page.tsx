/**
 * /admin/incidents/billing — Billing incident ledger (Tier 3).
 *
 * Source: practiq.billing_incidents, written by the Stripe webhook
 * handler (src/app/api/stripe/webhook/route.ts) for four domain events:
 *   - payment_failed         (invoice.payment_failed)
 *   - subscription_canceled  (customer.subscription.deleted)
 *   - upcoming_renewal       (invoice.upcoming) — log only, no Slack
 *   - chargeback             (charge.dispute.created) — always critical
 *
 * Distinct from /admin/incidents/stripe which shows raw webhook
 * deliveries (every event, transport-layer audit). This page shows the
 * business-meaningful subset with operator-actionable summary fields:
 * open chargebacks count, payment failures (7d), churns (30d),
 * MRR lost (30d).
 *
 * Auth: middleware enforces admin host + cookie.
 */
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface BillingIncidentRow {
  id: string;
  stripe_customer_id: string;
  stripe_invoice_id: string | null;
  stripe_event_id: string;
  type: string;
  status: string;
  amount_usd: string | null; // Postgres numeric returns as string via supabase-js
  attempt_count: number | null;
  payload_summary: Record<string, unknown> | null;
  created_at: string;
  resolved_at: string | null;
}

interface SearchParams {
  type?: string;
  status?: string;
  customer?: string;
}

const TYPE_OPTIONS = [
  "all",
  "payment_failed",
  "subscription_canceled",
  "upcoming_renewal",
  "chargeback",
];

const STATUS_OPTIONS = ["all", "open", "resolved", "superseded"];

function typeBadge(t: string): { color: string; label: string } {
  switch (t) {
    case "payment_failed":
      return { color: "bg-amber-500/15 text-amber-400", label: "PAYMENT FAILED" };
    case "subscription_canceled":
      return { color: "bg-zinc-500/15 text-zinc-300", label: "CANCELED" };
    case "upcoming_renewal":
      return { color: "bg-blue-500/15 text-blue-400", label: "UPCOMING" };
    case "chargeback":
      return { color: "bg-red-500/15 text-red-400", label: "CHARGEBACK" };
    default:
      return { color: "bg-zinc-800 text-zinc-400", label: t.toUpperCase() };
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
    case "superseded":
      return { color: "bg-zinc-700 text-zinc-400", label: "SUPERSEDED" };
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

export default async function BillingIncidentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const search = await searchParams;
  const typeFilter = search?.type ?? "all";
  const statusFilter = search?.status ?? "all";
  const customerFilter = (search?.customer ?? "").trim();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    return (
      <ErrorBox message="Supabase environment variables are not configured." />
    );
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  // Latest 100 incidents matching filter
  let q = supabase
    .schema("practiq")
    .from("billing_incidents")
    .select(
      "id, stripe_customer_id, stripe_invoice_id, stripe_event_id, type, status, amount_usd, attempt_count, payload_summary, created_at, resolved_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (typeFilter && typeFilter !== "all") q = q.eq("type", typeFilter);
  if (statusFilter && statusFilter !== "all") q = q.eq("status", statusFilter);
  if (customerFilter) {
    // Search by customer id OR by masked email substring in
    // payload_summary. Supabase-js doesn't have a clean OR on JSON
    // text — we do a simple ilike on stripe_customer_id and let
    // operators paste email substrings into the same field; the
    // payload_summary side is best-effort via client-side filter
    // below.
    q = q.or(
      `stripe_customer_id.ilike.%${customerFilter}%,payload_summary->>email_masked.ilike.%${customerFilter}%`,
    );
  }
  const { data, error } = await q;
  if (error) {
    return <ErrorBox message={`billing_incidents: ${error.message}`} />;
  }
  const rows = (data ?? []) as BillingIncidentRow[];

  // Stat-strip totals (independent of UI filter — these are health
  // KPIs the operator scans first).
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const [openChargebacks, paymentFailures7d, churns30d] = await Promise.all([
    supabase
      .schema("practiq")
      .from("billing_incidents")
      .select("id", { count: "exact", head: true })
      .eq("type", "chargeback")
      .eq("status", "open"),
    supabase
      .schema("practiq")
      .from("billing_incidents")
      .select("id", { count: "exact", head: true })
      .eq("type", "payment_failed")
      .gte("created_at", sevenDaysAgo),
    supabase
      .schema("practiq")
      .from("billing_incidents")
      .select("amount_usd")
      .eq("type", "subscription_canceled")
      .gte("created_at", thirtyDaysAgo),
  ]);

  const churnRows = (churns30d.data ?? []) as Array<{
    amount_usd: string | null;
  }>;
  const churnCount = churnRows.length;
  const mrrLost30d = churnRows.reduce(
    (acc, r) => acc + (r.amount_usd ? Number(r.amount_usd) : 0),
    0,
  );

  // Group rows by status (open vs resolved+superseded) for the listing
  // sections below.
  const openRows = rows.filter((r) => r.status === "open");
  const closedRows = rows.filter((r) => r.status !== "open");

  return (
    <div className="max-w-6xl mx-auto py-12 px-6">
      <header className="mb-10">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-2">
          Production triage · Billing
        </p>
        <h1 className="text-3xl md:text-4xl font-black text-zinc-100 tracking-tight mb-3">
          Billing incidents
        </h1>
        <p className="text-zinc-400 text-sm max-w-2xl">
          Domain-meaningful billing events from Stripe — payment failures,
          churns, upcoming renewals, and chargebacks — each with operator
          context for triage. Rare but expensive (chargebacks, churn) get
          critical Slack pings; routine signals (upcoming renewals) are logged
          only.
        </p>
      </header>

      {/* Stat strip — KPI health */}
      <section className="mb-8">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">
          Health snapshot
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat
            label="Open chargebacks"
            value={openChargebacks.count ?? 0}
            tone={
              (openChargebacks.count ?? 0) > 0 ? "bad" : "good"
            }
            sublabel="Always critical"
          />
          <Stat
            label="Payment fails · 7d"
            value={paymentFailures7d.count ?? 0}
            tone={
              (paymentFailures7d.count ?? 0) > 5
                ? "bad"
                : (paymentFailures7d.count ?? 0) > 0
                  ? "warn"
                  : "good"
            }
            sublabel="Last 7 days"
          />
          <Stat
            label="Churns · 30d"
            value={churnCount}
            tone={
              churnCount > 5 ? "bad" : churnCount > 0 ? "warn" : "good"
            }
            sublabel="Last 30 days"
          />
          <Stat
            label="MRR lost · 30d"
            value={`$${mrrLost30d.toFixed(2)}`}
            tone={
              mrrLost30d > 500
                ? "bad"
                : mrrLost30d > 100
                  ? "warn"
                  : "neutral"
            }
            sublabel="From cancellations"
          />
        </div>
      </section>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-3 mb-8">
        <FilterGroup
          label="Type"
          options={TYPE_OPTIONS.map((t) => ({ value: t, label: t }))}
          current={typeFilter}
          paramKey="type"
          otherParams={{ status: statusFilter, customer: customerFilter }}
        />
        <FilterGroup
          label="Status"
          options={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
          current={statusFilter}
          paramKey="status"
          otherParams={{ type: typeFilter, customer: customerFilter }}
        />
        <form
          action="/admin/incidents/billing"
          method="GET"
          className="flex flex-col gap-2"
        >
          <input type="hidden" name="type" value={typeFilter} />
          <input type="hidden" name="status" value={statusFilter} />
          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            Customer / email
          </label>
          <input
            type="text"
            name="customer"
            defaultValue={customerFilter}
            placeholder="cus_… or em***"
            className="bg-zinc-900 border border-zinc-700 text-zinc-100 placeholder:text-zinc-500 rounded-lg px-3 py-1.5 text-xs w-56"
          />
        </form>
      </div>

      {/* Open incidents */}
      <section className="mb-12">
        <h2 className="text-lg font-bold text-zinc-100 mb-4">
          Open ({openRows.length})
        </h2>
        {openRows.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-[#0a0a0a] p-8 text-center text-sm text-zinc-500">
            No open billing incidents match this filter.
          </div>
        ) : (
          <div className="space-y-3">
            {openRows.map((r) => (
              <IncidentCard key={r.id} row={r} />
            ))}
          </div>
        )}
      </section>

      {/* Closed incidents (resolved + superseded) */}
      {closedRows.length > 0 && (
        <section className="mb-12">
          <h2 className="text-lg font-bold text-zinc-100 mb-4">
            Closed ({closedRows.length})
          </h2>
          <div className="space-y-3">
            {closedRows.map((r) => (
              <IncidentCard key={r.id} row={r} />
            ))}
          </div>
        </section>
      )}

      <footer className="mt-12 text-xs text-zinc-600 text-center">
        Page is dynamic · reload to refresh · source:{" "}
        <code className="text-zinc-400">practiq.billing_incidents</code>
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
          const href = `/admin/incidents/billing?${params.toString()}`;
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

function IncidentCard({ row }: { row: BillingIncidentRow }) {
  const tBadge = typeBadge(row.type);
  const sBadge = statusBadge(row.status);
  const summary = row.payload_summary ?? {};
  const maskedEmail = (summary as { email_masked?: string }).email_masked ?? null;
  const reason = (summary as { reason?: string; cancel_reason?: string })
    .reason ?? (summary as { cancel_reason?: string }).cancel_reason ?? null;
  const cancelType =
    (summary as { cancel_type?: string }).cancel_type ?? null;
  const nextRetry = (summary as { next_retry?: string }).next_retry ?? null;
  const dueBy = (summary as { due_by?: string }).due_by ?? null;

  return (
    <details className="rounded-xl border border-zinc-800 bg-[#0a0a0a] group open:border-zinc-700">
      <summary className="cursor-pointer p-4 list-none flex flex-col gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span
            className={
              "px-2 py-0.5 rounded text-[10px] font-bold tracking-wider " +
              tBadge.color
            }
          >
            {tBadge.label}
          </span>
          <span
            className={
              "px-2 py-0.5 rounded text-[10px] font-bold tracking-wider " +
              sBadge.color
            }
          >
            {sBadge.label}
          </span>
          {row.amount_usd && (
            <span className="text-sm font-bold text-zinc-100 font-mono">
              ${Number(row.amount_usd).toFixed(2)}
            </span>
          )}
          {maskedEmail && (
            <span className="text-xs font-mono text-zinc-400">
              {maskedEmail}
            </span>
          )}
          {row.attempt_count !== null && (
            <span className="text-[10px] text-zinc-500 font-mono">
              attempt #{row.attempt_count}
            </span>
          )}
          <span className="ml-auto text-[10px] text-zinc-500 font-mono">
            {relativeTime(row.created_at)}
          </span>
        </div>
        <div className="flex flex-wrap gap-3 text-[11px] text-zinc-500">
          <span className="font-mono break-all">{row.stripe_customer_id}</span>
          {reason && <span>reason: {reason}</span>}
          {cancelType && cancelType !== "unknown" && (
            <span>
              cancel:{" "}
              <span
                className={
                  cancelType === "payment_failure_cascade"
                    ? "text-red-400"
                    : "text-zinc-400"
                }
              >
                {cancelType}
              </span>
            </span>
          )}
          {nextRetry && <span>next retry: {nextRetry}</span>}
          {dueBy && <span className="text-red-400">due by: {dueBy}</span>}
        </div>
      </summary>
      <div className="border-t border-zinc-800 px-4 py-3 space-y-3 text-xs">
        <DetailRow
          label="Stripe event"
          value={row.stripe_event_id}
        />
        {row.stripe_invoice_id && (
          <DetailRow label="Invoice / charge" value={row.stripe_invoice_id} />
        )}
        <DetailRow
          label="Created"
          value={`${new Date(row.created_at).toLocaleString()} · ${relativeTime(row.created_at)}`}
        />
        {row.resolved_at && (
          <DetailRow
            label="Resolved"
            value={`${new Date(row.resolved_at).toLocaleString()} · ${relativeTime(row.resolved_at)}`}
          />
        )}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
            Payload summary
          </div>
          <pre className="bg-zinc-950 border border-zinc-800 rounded p-3 overflow-x-auto text-[11px] text-zinc-300">
            {JSON.stringify(row.payload_summary ?? {}, null, 2)}
          </pre>
        </div>
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
