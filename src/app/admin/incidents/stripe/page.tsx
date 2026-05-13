/**
 * /admin/incidents/stripe — Stripe webhook reliability dashboard.
 *
 * Source: practiq.stripe_webhook_events, written by every webhook
 * delivery (src/app/api/stripe/webhook/route.ts + the
 * `withWebhookInstrumentation` helper). Rows are keyed by Stripe's
 * event_id (globally unique, idempotency-safe) and transition through:
 *   received → processed | failed | replay_rejected
 *
 * What the operator does here:
 *   1. Confirm webhook health at a glance (success rate, recent
 *      failures, p50/p95 latency).
 *   2. Triage individual failures — expand a row to see error_step,
 *      error_message, signature status, payload size, and a deep link
 *      to the Stripe dashboard.
 *   3. Validate idempotency — every replay_rejected row proves the
 *      handler refused to re-run side effects.
 *
 * PII posture: we deliberately do NOT store the raw Stripe payload —
 * those carry customer email, billing address, last4 card digits.
 * The operator can pull the full payload from the Stripe dashboard
 * via the event_id link when triaging.
 *
 * Auth: middleware enforces admin host + cookie. Same posture as
 * /admin/incidents (user-facing errors).
 */
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface StripeEventRow {
  event_id: string;
  event_type: string;
  livemode: boolean;
  status: string;
  error_message: string | null;
  error_step: string | null;
  payload_size: number | null;
  signature_verified: boolean;
  processing_duration_ms: number | null;
  created_at: string;
  updated_at: string;
}

interface SearchParams {
  status?: string;
  event_type?: string;
  livemode?: string;
  window?: string;
}

const WINDOW_OPTIONS: { value: string; label: string; ms: number }[] = [
  { value: "1h", label: "Last hour", ms: 60 * 60 * 1000 },
  { value: "24h", label: "Last 24h", ms: 24 * 60 * 60 * 1000 },
  { value: "7d", label: "Last 7 days", ms: 7 * 24 * 60 * 60 * 1000 },
  { value: "30d", label: "Last 30 days", ms: 30 * 24 * 60 * 60 * 1000 },
  { value: "all", label: "All time", ms: 0 },
];

const STATUS_OPTIONS = [
  "all",
  "received",
  "processed",
  "failed",
  "replay_rejected",
];

const EVENT_TYPE_OPTIONS = [
  "all",
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
];

const LIVEMODE_OPTIONS = [
  { value: "all", label: "All" },
  { value: "live", label: "Live" },
  { value: "test", label: "Test" },
];

function statusBadge(s: string): { color: string; label: string } {
  switch (s) {
    case "processed":
      return {
        color: "bg-emerald-500/15 text-emerald-400",
        label: "PROCESSED",
      };
    case "failed":
      return { color: "bg-red-500/15 text-red-400", label: "FAILED" };
    case "replay_rejected":
      return { color: "bg-amber-500/15 text-amber-400", label: "REPLAY" };
    case "received":
    default:
      return { color: "bg-blue-500/15 text-blue-400", label: "IN-FLIGHT" };
  }
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s ago`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(
    sorted.length - 1,
    Math.floor((p / 100) * sorted.length),
  );
  return sorted[idx];
}

export default async function StripeIncidentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const search = await searchParams;
  const statusFilter = search?.status ?? "all";
  const eventTypeFilter = search?.event_type ?? "all";
  const livemodeFilter = search?.livemode ?? "all";
  const windowFilter = search?.window ?? "24h";

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    return (
      <ErrorBox message="Supabase environment variables are not configured." />
    );
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const windowOpt =
    WINDOW_OPTIONS.find((o) => o.value === windowFilter) ?? WINDOW_OPTIONS[1];

  let q = supabase
    .schema("practiq")
    .from("stripe_webhook_events")
    .select(
      "event_id, event_type, livemode, status, error_message, error_step, payload_size, signature_verified, processing_duration_ms, created_at, updated_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (statusFilter && statusFilter !== "all") {
    q = q.eq("status", statusFilter);
  }
  if (eventTypeFilter && eventTypeFilter !== "all") {
    q = q.eq("event_type", eventTypeFilter);
  }
  if (livemodeFilter === "live") q = q.eq("livemode", true);
  if (livemodeFilter === "test") q = q.eq("livemode", false);
  if (windowOpt.ms > 0) {
    q = q.gte("created_at", new Date(Date.now() - windowOpt.ms).toISOString());
  }

  const { data, error } = await q;
  if (error) {
    return <ErrorBox message={`stripe_webhook_events: ${error.message}`} />;
  }
  const rows = (data ?? []) as StripeEventRow[];

  // 7d-wide health metrics, regardless of the filter applied above —
  // these are the operator's at-a-glance reliability indicators.
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: healthData } = await supabase
    .schema("practiq")
    .from("stripe_webhook_events")
    .select("status, processing_duration_ms")
    .gte("created_at", sevenDaysAgo)
    .limit(10000);
  const health = (healthData ?? []) as Array<{
    status: string;
    processing_duration_ms: number | null;
  }>;
  const healthTotal = health.length;
  const healthProcessed = health.filter((r) => r.status === "processed").length;
  const healthFailed = health.filter((r) => r.status === "failed").length;
  const healthReplay = health.filter((r) => r.status === "replay_rejected").length;
  const successRatePct =
    healthTotal > 0 ? Math.round((healthProcessed / healthTotal) * 1000) / 10 : 0;
  const durations = health
    .map((r) => r.processing_duration_ms)
    .filter((v): v is number => typeof v === "number");
  const p50 = percentile(durations, 50);
  const p95 = percentile(durations, 95);

  // Per-event-type breakdown within current filter
  const typeMap = new Map<string, number>();
  for (const r of rows)
    typeMap.set(r.event_type, (typeMap.get(r.event_type) ?? 0) + 1);
  const typeRows = Array.from(typeMap.entries()).sort((a, b) => b[1] - a[1]);

  return (
    <div className="max-w-6xl mx-auto py-12 px-6">
      <header className="mb-10">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-2">
          Production triage · Stripe
        </p>
        <h1 className="text-3xl md:text-4xl font-black text-zinc-100 tracking-tight mb-3">
          Stripe webhook events
        </h1>
        <p className="text-zinc-400 text-sm max-w-2xl">
          Every inbound Stripe webhook delivery is recorded with its event_id,
          signature status, processing duration, and final disposition.
          Signature failures and handler exceptions fire critical Slack
          alerts. Replays are detected via event_id idempotency — they never
          re-run side effects.
        </p>
      </header>

      {/* 7d health cards — at the top because the operator scans first */}
      <section className="mb-8">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">
          Last 7 days · reliability
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Stat label="Deliveries" value={healthTotal} />
          <Stat
            label="Success rate"
            value={`${successRatePct}%`}
            tone={
              healthTotal === 0
                ? "neutral"
                : successRatePct >= 99
                  ? "good"
                  : successRatePct >= 95
                    ? "warn"
                    : "bad"
            }
          />
          <Stat label="Failed" value={healthFailed} tone={healthFailed > 0 ? "bad" : "neutral"} />
          <Stat label="p50 (ms)" value={p50} />
          <Stat label="p95 (ms)" value={p95} tone={p95 > 10000 ? "warn" : "neutral"} />
        </div>
        {healthReplay > 0 && (
          <p className="text-xs text-zinc-500 mt-3">
            {healthReplay} replay attempts detected and rejected (idempotency
            working as intended — these are not failures).
          </p>
        )}
      </section>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-3 mb-8">
        <FilterGroup
          label="Window"
          options={WINDOW_OPTIONS.map((o) => ({
            value: o.value,
            label: o.label,
          }))}
          current={windowFilter}
          paramKey="window"
          otherParams={{
            status: statusFilter,
            event_type: eventTypeFilter,
            livemode: livemodeFilter,
          }}
        />
        <FilterGroup
          label="Status"
          options={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
          current={statusFilter}
          paramKey="status"
          otherParams={{
            window: windowFilter,
            event_type: eventTypeFilter,
            livemode: livemodeFilter,
          }}
        />
        <FilterGroup
          label="Event type"
          options={EVENT_TYPE_OPTIONS.map((s) => ({ value: s, label: s }))}
          current={eventTypeFilter}
          paramKey="event_type"
          otherParams={{
            window: windowFilter,
            status: statusFilter,
            livemode: livemodeFilter,
          }}
        />
        <FilterGroup
          label="Mode"
          options={LIVEMODE_OPTIONS}
          current={livemodeFilter}
          paramKey="livemode"
          otherParams={{
            window: windowFilter,
            status: statusFilter,
            event_type: eventTypeFilter,
          }}
        />
      </div>

      {/* Per-event-type breakdown */}
      {typeRows.length > 0 && (
        <section className="mb-12">
          <h2 className="text-lg font-bold text-zinc-100 mb-4">
            By event type · current filter
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {typeRows.map(([t, n]) => (
              <div
                key={t}
                className="rounded-xl border border-zinc-800 bg-[#0a0a0a] p-4"
              >
                <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1 break-all">
                  {t}
                </div>
                <div className="text-2xl font-black text-zinc-100">{n}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Event list */}
      <section className="mb-12">
        <h2 className="text-lg font-bold text-zinc-100 mb-4">
          Deliveries ({rows.length})
        </h2>
        {rows.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-[#0a0a0a] p-8 text-center text-sm text-zinc-500">
            No webhook events match this filter. Webhook is quiet in this
            window.
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <EventCard key={r.event_id} row={r} />
            ))}
          </div>
        )}
      </section>

      <footer className="mt-12 text-xs text-zinc-600 text-center">
        Page is dynamic · reload to refresh · source:{" "}
        <code className="text-zinc-400">practiq.stripe_webhook_events</code>
      </footer>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number | string;
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
          const href = `/admin/incidents/stripe?${params.toString()}`;
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

function EventCard({ row }: { row: StripeEventRow }) {
  const badge = statusBadge(row.status);
  const stripeLink = `https://dashboard.stripe.com/${
    row.livemode ? "" : "test/"
  }events/${row.event_id}`;
  return (
    <details className="rounded-xl border border-zinc-800 bg-[#0a0a0a] group open:border-zinc-700">
      <summary className="cursor-pointer p-4 list-none flex flex-col gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span
            className={
              "px-2 py-0.5 rounded text-[10px] font-bold tracking-wider " +
              badge.color
            }
          >
            {badge.label}
          </span>
          <span
            className={
              "px-2 py-0.5 rounded text-[10px] font-bold tracking-wider " +
              (row.livemode
                ? "bg-zinc-100/10 text-zinc-200"
                : "bg-zinc-800 text-zinc-500")
            }
          >
            {row.livemode ? "LIVE" : "TEST"}
          </span>
          <span className="text-xs font-mono text-zinc-300 break-all">
            {row.event_type}
          </span>
          <span className="ml-auto text-[10px] text-zinc-500 font-mono">
            {row.processing_duration_ms !== null
              ? `${row.processing_duration_ms}ms · `
              : ""}
            {relativeTime(row.created_at)}
          </span>
        </div>
        <div className="flex flex-wrap gap-3 text-[11px] text-zinc-500">
          <span className="font-mono break-all">{row.event_id}</span>
          {row.error_step && (
            <span className="text-red-400">step: {row.error_step}</span>
          )}
          {!row.signature_verified && (
            <span className="text-amber-400">signature: UNVERIFIED</span>
          )}
        </div>
        {row.error_message && (
          <div className="text-sm text-red-300 font-medium leading-snug break-words">
            {row.error_message.split("\n")[0].slice(0, 240)}
          </div>
        )}
      </summary>
      <div className="border-t border-zinc-800 px-4 py-3 space-y-3 text-xs">
        <DetailRow
          label="Received"
          value={`${new Date(row.created_at).toLocaleString()} · ${relativeTime(row.created_at)}`}
        />
        <DetailRow
          label="Last updated"
          value={`${new Date(row.updated_at).toLocaleString()} · ${relativeTime(row.updated_at)}`}
        />
        <DetailRow
          label="Payload size"
          value={
            row.payload_size !== null ? `${row.payload_size} bytes` : "(unknown)"
          }
        />
        <DetailRow
          label="Signature"
          value={row.signature_verified ? "verified" : "UNVERIFIED"}
        />
        <DetailRow
          label="Processing"
          value={
            row.processing_duration_ms !== null
              ? `${row.processing_duration_ms}ms`
              : "(no duration recorded)"
          }
        />
        {row.error_message && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
              Error message / stack
            </div>
            <pre className="bg-zinc-950 border border-zinc-800 rounded p-3 overflow-x-auto text-[11px] text-zinc-300 whitespace-pre-wrap">
              {row.error_message}
            </pre>
          </div>
        )}
        <div className="pt-2">
          <a
            href={stripeLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-zinc-900 text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            Open in Stripe dashboard ↗
          </a>
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
