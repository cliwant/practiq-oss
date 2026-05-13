/**
 * /admin/incidents — user-facing error triage dashboard.
 *
 * Source: practiq.user_errors, written by reportUserError() from every
 * user-facing API route's catch block and from the client-side error
 * beacon (/api/report-user-error). Rows are deduped by fingerprint,
 * each row carries occurrence_count so a single bug shows as one row,
 * not a flood.
 *
 * Auth: middleware enforces admin host + cookie. Same posture as
 * /admin/signups and /admin/analytics — no additional check here.
 */
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface UserErrorRow {
  id: string;
  fingerprint: string;
  surface: string;
  endpoint: string | null;
  status: number | null;
  error_message: string;
  error_stack: string | null;
  user_context: Record<string, unknown> | null;
  request_body: Record<string, unknown> | null;
  step: string | null;
  severity: string | null;
  occurrence_count: number;
  last_slack_at: string | null;
  first_seen_at: string;
  last_seen_at: string;
}

interface SearchParams {
  surface?: string;
  severity?: string;
  window?: string; // "1h" | "24h" | "7d" | "30d" | "all"
}

const WINDOW_OPTIONS: { value: string; label: string; ms: number }[] = [
  { value: "1h", label: "Last hour", ms: 60 * 60 * 1000 },
  { value: "24h", label: "Last 24h", ms: 24 * 60 * 60 * 1000 },
  { value: "7d", label: "Last 7 days", ms: 7 * 24 * 60 * 60 * 1000 },
  { value: "30d", label: "Last 30 days", ms: 30 * 24 * 60 * 60 * 1000 },
  { value: "all", label: "All time", ms: 0 },
];

const SURFACE_OPTIONS = [
  "all",
  "workflow-audit",
  "policy-generator",
  "early-access",
  "stripe-checkout",
  "blog-cms",
  "client-js",
  "other",
];

const SEVERITY_OPTIONS = ["all", "critical", "warning", "info"];

function severityBadge(s: string | null): { color: string; label: string } {
  switch (s) {
    case "critical":
      return { color: "bg-red-500/15 text-red-400", label: "CRITICAL" };
    case "info":
      return { color: "bg-blue-500/15 text-blue-400", label: "INFO" };
    case "warning":
    default:
      return { color: "bg-amber-500/15 text-amber-400", label: "WARNING" };
  }
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s ago`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

export default async function IncidentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const search = await searchParams;
  const surfaceFilter = search?.surface ?? "all";
  const severityFilter = search?.severity ?? "all";
  const windowFilter = search?.window ?? "24h";

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    return (
      <ErrorBox message="Supabase environment variables are not configured." />
    );
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const windowOpt = WINDOW_OPTIONS.find((o) => o.value === windowFilter) ??
    WINDOW_OPTIONS[1];
  let q = supabase
    .schema("practiq")
    .from("user_errors")
    .select(
      "id, fingerprint, surface, endpoint, status, error_message, error_stack, user_context, request_body, step, severity, occurrence_count, last_slack_at, first_seen_at, last_seen_at",
    )
    .order("last_seen_at", { ascending: false })
    .limit(100);
  if (surfaceFilter && surfaceFilter !== "all") {
    q = q.eq("surface", surfaceFilter);
  }
  if (severityFilter && severityFilter !== "all") {
    q = q.eq("severity", severityFilter);
  }
  if (windowOpt.ms > 0) {
    q = q.gte(
      "last_seen_at",
      new Date(Date.now() - windowOpt.ms).toISOString(),
    );
  }

  const { data, error } = await q;
  if (error) {
    return <ErrorBox message={`user_errors: ${error.message}`} />;
  }
  const rows = (data ?? []) as UserErrorRow[];

  // Headline aggregates
  const total = rows.length;
  const criticalCount = rows.filter((r) => r.severity === "critical").length;
  const warningCount = rows.filter(
    (r) => !r.severity || r.severity === "warning",
  ).length;
  const occurrencesTotal = rows.reduce(
    (acc, r) => acc + (r.occurrence_count ?? 1),
    0,
  );

  // Surface breakdown
  const surfaceMap = new Map<string, number>();
  for (const r of rows)
    surfaceMap.set(r.surface, (surfaceMap.get(r.surface) ?? 0) + 1);
  const surfaceRows = Array.from(surfaceMap.entries()).sort(
    (a, b) => b[1] - a[1],
  );

  return (
    <div className="max-w-6xl mx-auto py-12 px-6">
      <header className="mb-10">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-2">
          Production triage
        </p>
        <h1 className="text-3xl md:text-4xl font-black text-zinc-100 tracking-tight mb-3">
          Incidents
        </h1>
        <p className="text-zinc-400 text-sm max-w-2xl">
          User-facing errors deduped by fingerprint. Critical (5xx) fire Slack
          immediately, warnings fold into a 60-min dedupe window, 429
          rate-limits are silent informational rows. Open a row to inspect raw
          context.
        </p>
      </header>

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
          otherParams={{ surface: surfaceFilter, severity: severityFilter }}
        />
        <FilterGroup
          label="Surface"
          options={SURFACE_OPTIONS.map((s) => ({ value: s, label: s }))}
          current={surfaceFilter}
          paramKey="surface"
          otherParams={{ window: windowFilter, severity: severityFilter }}
        />
        <FilterGroup
          label="Severity"
          options={SEVERITY_OPTIONS.map((s) => ({ value: s, label: s }))}
          current={severityFilter}
          paramKey="severity"
          otherParams={{ window: windowFilter, surface: surfaceFilter }}
        />
      </div>

      {/* Headline cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-12">
        <Stat label="Unique errors" value={total} />
        <Stat label="Critical" value={criticalCount} />
        <Stat label="Warning" value={warningCount} />
        <Stat label="Total occurrences" value={occurrencesTotal} />
      </div>

      {/* Surface breakdown */}
      {surfaceRows.length > 0 && (
        <section className="mb-12">
          <h2 className="text-lg font-bold text-zinc-100 mb-4">
            By surface
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {surfaceRows.map(([s, n]) => (
              <div
                key={s}
                className="rounded-xl border border-zinc-800 bg-[#0a0a0a] p-4"
              >
                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
                  {s}
                </div>
                <div className="text-2xl font-black text-zinc-100">{n}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Incident list */}
      <section className="mb-12">
        <h2 className="text-lg font-bold text-zinc-100 mb-4">
          Incidents ({rows.length})
        </h2>
        {rows.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-[#0a0a0a] p-8 text-center text-sm text-zinc-500">
            No incidents match this filter. The pipeline is healthy in this
            window.
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <IncidentCard key={r.id} row={r} />
            ))}
          </div>
        )}
      </section>

      <footer className="mt-12 text-xs text-zinc-600 text-center">
        Page is dynamic · reload to refresh · source:{" "}
        <code className="text-zinc-400">practiq.user_errors</code>
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
          const href = `/admin/incidents?${params.toString()}`;
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

function IncidentCard({ row }: { row: UserErrorRow }) {
  const sev = severityBadge(row.severity);
  return (
    <details className="rounded-xl border border-zinc-800 bg-[#0a0a0a] group open:border-zinc-700">
      <summary className="cursor-pointer p-4 list-none flex flex-col gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span
            className={
              "px-2 py-0.5 rounded text-[10px] font-bold tracking-wider " +
              sev.color
            }
          >
            {sev.label}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            {row.surface}
          </span>
          {row.status !== null && (
            <span className="text-[10px] font-mono text-zinc-500">
              {row.status}
            </span>
          )}
          <span className="ml-auto text-[10px] text-zinc-500 font-mono">
            ×{row.occurrence_count} · last {relativeTime(row.last_seen_at)}
          </span>
        </div>
        <div className="text-sm text-zinc-100 font-medium leading-snug break-words">
          {row.error_message}
        </div>
        <div className="flex flex-wrap gap-3 text-[11px] text-zinc-500">
          {row.endpoint && (
            <span className="font-mono break-all">{row.endpoint}</span>
          )}
          {row.step && <span>step: {row.step}</span>}
          <span className="font-mono">
            fingerprint:{" "}
            <span className="text-zinc-400">{row.fingerprint.slice(0, 10)}</span>
          </span>
        </div>
      </summary>
      <div className="border-t border-zinc-800 px-4 py-3 space-y-3 text-xs">
        <DetailRow
          label="First seen"
          value={`${new Date(row.first_seen_at).toLocaleString()} · ${relativeTime(row.first_seen_at)}`}
        />
        <DetailRow
          label="Last Slack alert"
          value={
            row.last_slack_at
              ? `${new Date(row.last_slack_at).toLocaleString()} · ${relativeTime(row.last_slack_at)}`
              : "(never — dedupe quiet)"
          }
        />
        {row.error_stack && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
              Stack (head)
            </div>
            <pre className="bg-zinc-950 border border-zinc-800 rounded p-3 overflow-x-auto text-[11px] text-zinc-300 whitespace-pre-wrap">
              {row.error_stack}
            </pre>
          </div>
        )}
        {row.user_context &&
          Object.keys(row.user_context).length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
                User context
              </div>
              <pre className="bg-zinc-950 border border-zinc-800 rounded p-3 overflow-x-auto text-[11px] text-zinc-300">
                {JSON.stringify(row.user_context, null, 2)}
              </pre>
            </div>
          )}
        {row.request_body && Object.keys(row.request_body).length > 0 && (
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
              Request body (sanitized)
            </div>
            <pre className="bg-zinc-950 border border-zinc-800 rounded p-3 overflow-x-auto text-[11px] text-zinc-300">
              {JSON.stringify(row.request_body, null, 2)}
            </pre>
          </div>
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
      <span className="text-zinc-300 font-mono">{value}</span>
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
