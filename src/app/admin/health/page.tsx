/**
 * /admin/health — operational health dashboard.
 *
 * Source: practiq.health_checks, written every 5 minutes by
 * /api/cron/health-check. Each row carries the full HealthResponse
 * (5-check JSON + overall status + http_status + duration + commit
 * sha). The cron handler fires `system_health_failure` Slack alerts on
 * each ok → down transition for any of the 5 dependencies.
 *
 * What the operator does here:
 *   1. At a glance, confirm all 5 dependencies are green (top cards).
 *   2. Spot-check 24-hour uptime per dependency (sparklines / %).
 *   3. Drill into a specific recent failure (expandable row in the
 *      history table — sees the full checks_json + http_status +
 *      commit + relative time).
 *
 * Auth: middleware enforces admin host + cookie. Same posture as
 * /admin/incidents/stripe.
 */
import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";

export const metadata: Metadata = {
  title: "Health — Practiq Admin",
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

const CHECK_NAMES = ["db", "resend", "openrouter", "storage", "stripe"] as const;
type CheckName = (typeof CHECK_NAMES)[number];

interface CheckResultJson {
  status: "ok" | "down";
  duration_ms: number;
  detail?: string;
}

interface HealthRow {
  event_id: string;
  status: "ok" | "degraded" | "down";
  checks_json: Record<CheckName, CheckResultJson>;
  http_status: number;
  duration_ms: number | null;
  commit_sha: string | null;
  created_at: string;
}

const CHECK_LABEL: Record<CheckName, string> = {
  db: "Database",
  resend: "Resend",
  openrouter: "OpenRouter",
  storage: "Storage",
  stripe: "Stripe",
};

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s ago`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

function overallBadge(s: HealthRow["status"]): { color: string; label: string } {
  switch (s) {
    case "ok":
      return { color: "bg-emerald-500/15 text-emerald-400", label: "OK" };
    case "degraded":
      return { color: "bg-amber-500/15 text-amber-400", label: "DEGRADED" };
    case "down":
      return { color: "bg-red-500/15 text-red-400", label: "DOWN" };
  }
}

export default async function HealthDashboardPage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    return <ErrorBox message="Supabase environment variables are not configured." />;
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  // 1. Latest row — for top-of-page state cards.
  const latestQ = await supabase
    .schema("practiq")
    .from("health_checks")
    .select(
      "event_id, status, checks_json, http_status, duration_ms, commit_sha, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestQ.error) {
    return <ErrorBox message={`health_checks (latest): ${latestQ.error.message}`} />;
  }
  const latest = latestQ.data as HealthRow | null;

  // 2. Last-24h window — for per-check uptime % and a tiny sparkline.
  const since24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const dayQ = await supabase
    .schema("practiq")
    .from("health_checks")
    .select("status, checks_json, created_at")
    .gte("created_at", since24h)
    .order("created_at", { ascending: true })
    .limit(2000);
  if (dayQ.error) {
    return <ErrorBox message={`health_checks (24h): ${dayQ.error.message}`} />;
  }
  const dayRows = (dayQ.data ?? []) as Array<{
    status: HealthRow["status"];
    checks_json: HealthRow["checks_json"];
    created_at: string;
  }>;

  // 3. Last 100 rows for the history table.
  const histQ = await supabase
    .schema("practiq")
    .from("health_checks")
    .select(
      "event_id, status, checks_json, http_status, duration_ms, commit_sha, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (histQ.error) {
    return <ErrorBox message={`health_checks (history): ${histQ.error.message}`} />;
  }
  const history = (histQ.data ?? []) as HealthRow[];

  // Per-check 24h uptime
  const upPctByCheck: Record<CheckName, number> = {
    db: 0,
    resend: 0,
    openrouter: 0,
    storage: 0,
    stripe: 0,
  };
  const sparkByCheck: Record<CheckName, ("ok" | "down")[]> = {
    db: [],
    resend: [],
    openrouter: [],
    storage: [],
    stripe: [],
  };
  for (const name of CHECK_NAMES) {
    let okCount = 0;
    let total = 0;
    for (const row of dayRows) {
      const r = row.checks_json?.[name];
      if (!r) continue;
      total++;
      const isOk = r.status === "ok";
      if (isOk) okCount++;
      sparkByCheck[name].push(isOk ? "ok" : "down");
    }
    upPctByCheck[name] = total > 0 ? Math.round((okCount / total) * 1000) / 10 : 0;
  }

  return (
    <div className="max-w-6xl mx-auto py-12 px-6">
      <header className="mb-10">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-2">
          Operational health · Tier-3
        </p>
        <h1 className="text-3xl md:text-4xl font-black text-zinc-100 tracking-tight mb-3">
          System health
        </h1>
        <p className="text-zinc-400 text-sm max-w-2xl">
          Every 5 minutes a Vercel cron probes db, Resend, OpenRouter, Supabase
          Storage, and Stripe — all in parallel, each with a 3s timeout. The
          result is recorded here and any check that flips ok → down fires a
          critical Slack alert. Dedupe is via comparison with the prior row,
          so persistent down states don't spam the channel.
        </p>
      </header>

      {/* Current state cards */}
      <section className="mb-10">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            Current state
          </h2>
          {latest && (
            <span className="text-[10px] font-mono text-zinc-500">
              checked {relativeTime(latest.created_at)} · http {latest.http_status} ·{" "}
              {latest.duration_ms ?? "?"}ms · commit{" "}
              <code className="text-zinc-400">
                {(latest.commit_sha ?? "unknown").slice(0, 7)}
              </code>
            </span>
          )}
        </div>
        {!latest ? (
          <div className="rounded-xl border border-zinc-800 bg-[#0a0a0a] p-8 text-center text-sm text-zinc-500">
            No health-check rows yet. The cron at <code>*/5 * * * *</code> will
            populate this within 5 minutes of the next deploy.
          </div>
        ) : (
          <>
            <div className="mb-4">
              <span
                className={
                  "px-3 py-1 rounded text-[10px] font-bold tracking-wider " +
                  overallBadge(latest.status).color
                }
              >
                Overall · {overallBadge(latest.status).label}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {CHECK_NAMES.map((name) => (
                <CheckCard
                  key={name}
                  label={CHECK_LABEL[name]}
                  result={latest.checks_json[name]}
                />
              ))}
            </div>
          </>
        )}
      </section>

      {/* 24h uptime per check */}
      <section className="mb-10">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">
          Last 24h · uptime per check
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {CHECK_NAMES.map((name) => (
            <UptimeCard
              key={name}
              label={CHECK_LABEL[name]}
              pct={upPctByCheck[name]}
              spark={sparkByCheck[name]}
            />
          ))}
        </div>
      </section>

      {/* History table */}
      <section className="mb-12">
        <h2 className="text-lg font-bold text-zinc-100 mb-4">
          History · last {history.length}
        </h2>
        {history.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-[#0a0a0a] p-8 text-center text-sm text-zinc-500">
            No rows yet.
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((row) => (
              <HistoryRow key={row.event_id} row={row} />
            ))}
          </div>
        )}
      </section>

      <footer className="mt-12 text-xs text-zinc-600 text-center">
        Page is dynamic · reload to refresh · source:{" "}
        <code className="text-zinc-400">practiq.health_checks</code>
      </footer>
    </div>
  );
}

function CheckCard({
  label,
  result,
}: {
  label: string;
  result: CheckResultJson | undefined;
}) {
  if (!result) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-[#0a0a0a] p-4">
        <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
          {label}
        </div>
        <div className="text-xs text-zinc-600">(no data)</div>
      </div>
    );
  }
  const ok = result.status === "ok";
  return (
    <div
      className={
        "rounded-xl border bg-[#0a0a0a] p-4 " +
        (ok ? "border-zinc-800" : "border-red-500/30")
      }
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
          {label}
        </div>
        <span
          className={
            "w-2 h-2 rounded-full " + (ok ? "bg-emerald-500" : "bg-red-500")
          }
        />
      </div>
      <div className="flex items-baseline gap-2">
        <div
          className={
            "text-2xl font-black " + (ok ? "text-emerald-400" : "text-red-400")
          }
        >
          {ok ? "OK" : "DOWN"}
        </div>
        <div className="text-xs font-mono text-zinc-500">
          {result.duration_ms}ms
        </div>
      </div>
      {result.detail && !ok && (
        <div className="mt-2 text-[11px] text-red-300 font-mono break-words leading-snug">
          {result.detail.slice(0, 140)}
        </div>
      )}
    </div>
  );
}

function UptimeCard({
  label,
  pct,
  spark,
}: {
  label: string;
  pct: number;
  spark: ("ok" | "down")[];
}) {
  // Tone the percentage based on classic SaaS SLO bands.
  const tone =
    pct >= 99.9
      ? "text-emerald-400"
      : pct >= 99
        ? "text-emerald-500"
        : pct >= 95
          ? "text-amber-400"
          : "text-red-400";
  // Compress the sparkline to at most 96 cells so a slow week of data
  // doesn't blow out the card width on narrow viewports.
  const MAX_CELLS = 96;
  const cells: ("ok" | "down")[] = [];
  if (spark.length <= MAX_CELLS) {
    cells.push(...spark);
  } else {
    const bucket = Math.ceil(spark.length / MAX_CELLS);
    for (let i = 0; i < spark.length; i += bucket) {
      const slice = spark.slice(i, i + bucket);
      cells.push(slice.some((s) => s === "down") ? "down" : "ok");
    }
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-[#0a0a0a] p-4">
      <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
        {label}
      </div>
      <div className={"text-2xl font-black mb-2 " + tone}>
        {spark.length === 0 ? "—" : `${pct}%`}
      </div>
      <div className="flex items-center gap-[2px] h-4">
        {cells.length === 0 ? (
          <span className="text-[10px] text-zinc-600">no data</span>
        ) : (
          cells.map((c, i) => (
            <span
              key={i}
              className={
                "flex-1 h-full rounded-sm " +
                (c === "ok" ? "bg-emerald-500/60" : "bg-red-500/70")
              }
            />
          ))
        )}
      </div>
      <div className="mt-2 text-[10px] font-mono text-zinc-600">
        {spark.length} samples
      </div>
    </div>
  );
}

function HistoryRow({ row }: { row: HealthRow }) {
  const badge = overallBadge(row.status);
  const downChecks = CHECK_NAMES.filter(
    (n) => row.checks_json?.[n]?.status === "down",
  );
  return (
    <details className="rounded-xl border border-zinc-800 bg-[#0a0a0a] group open:border-zinc-700">
      <summary className="cursor-pointer p-3 list-none flex flex-col gap-1.5">
        <div className="flex items-center gap-3 flex-wrap">
          <span
            className={
              "px-2 py-0.5 rounded text-[10px] font-bold tracking-wider " +
              badge.color
            }
          >
            {badge.label}
          </span>
          <span className="text-xs font-mono text-zinc-300">
            http {row.http_status}
          </span>
          <span className="text-xs font-mono text-zinc-500">
            {row.duration_ms ?? "?"}ms
          </span>
          {downChecks.length > 0 && (
            <span className="text-[11px] font-mono text-red-300">
              down: {downChecks.join(", ")}
            </span>
          )}
          <span className="ml-auto text-[10px] text-zinc-500 font-mono">
            {new Date(row.created_at).toLocaleString()} ·{" "}
            {relativeTime(row.created_at)}
          </span>
        </div>
      </summary>
      <div className="border-t border-zinc-800 px-4 py-3 text-xs">
        <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
          Full checks JSON
        </div>
        <pre className="bg-zinc-950 border border-zinc-800 rounded p-3 overflow-x-auto text-[11px] text-zinc-300 whitespace-pre-wrap">
          {JSON.stringify(row.checks_json, null, 2)}
        </pre>
        <div className="mt-3 text-[10px] font-mono text-zinc-500">
          commit:{" "}
          <code className="text-zinc-400">
            {(row.commit_sha ?? "unknown").slice(0, 7)}
          </code>{" "}
          · event_id:{" "}
          <code className="text-zinc-400 break-all">{row.event_id}</code>
        </div>
      </div>
    </details>
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
