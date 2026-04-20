/**
 * /admin/search-console — unified SEO dashboard.
 * Pulls from search_performance / search_queries / search_pages / seo_submissions.
 * Auth handled in middleware (cookie session).
 */
import { createClient } from "@supabase/supabase-js";
import { SeoActions } from "@/components/admin/seo-actions";

export const dynamic = "force-dynamic";

interface PerfRow { engine: string; day: string; clicks: number; impressions: number; ctr: number; avg_position: number | null; }
interface QueryRow { engine: string; day: string; query: string; clicks: number; impressions: number; ctr: number; avg_position: number | null; }
interface PageRow { engine: string; day: string; page_url: string; clicks: number; impressions: number; ctr: number; avg_position: number | null; }
interface SubmissionRow { engine: string; url: string | null; sitemap_url: string | null; status_code: number; ok: boolean; submitted_at: string; }

export default async function SearchConsoleDashboard() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return <ErrorBox message="Supabase env missing." />;

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [{ data: perf }, { data: queries }, { data: pages }, { data: subs }] = await Promise.all([
    supabase.from("search_performance").select("*").gte("day", since).order("day", { ascending: true }),
    supabase.from("search_queries").select("*").gte("day", since).order("clicks", { ascending: false }).limit(200),
    supabase.from("search_pages").select("*").gte("day", since).order("clicks", { ascending: false }).limit(100),
    supabase.from("seo_submissions").select("*").order("submitted_at", { ascending: false }).limit(100),
  ]);

  const perfRows = (perf ?? []) as PerfRow[];
  const queryRows = (queries ?? []) as QueryRow[];
  const pageRows = (pages ?? []) as PageRow[];
  const subRows = (subs ?? []) as SubmissionRow[];

  // Totals for current period
  const totals: Record<string, { clicks: number; impressions: number; avgCtr: number }> = {};
  for (const engine of ["google", "bing"] as const) {
    const rows = perfRows.filter((r) => r.engine === engine);
    const clicks = rows.reduce((s, r) => s + (r.clicks || 0), 0);
    const imps = rows.reduce((s, r) => s + (r.impressions || 0), 0);
    totals[engine] = {
      clicks,
      impressions: imps,
      avgCtr: imps > 0 ? clicks / imps : 0,
    };
  }

  // Last submission per engine
  const lastSubByEngine = new Map<string, SubmissionRow>();
  for (const s of subRows) {
    if (!lastSubByEngine.has(s.engine)) lastSubByEngine.set(s.engine, s);
  }

  const topQueries = queryRows.slice(0, 25);
  const topPages = pageRows.slice(0, 25);

  return (
    <div className="max-w-6xl mx-auto py-12 px-6">
      <header className="mb-10 flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-2">Search engines</p>
          <h1 className="text-3xl md:text-4xl font-black text-zinc-100 tracking-tight mb-3">Search Console</h1>
          <p className="text-zinc-400">Google · Bing · IndexNow submission log and rolling 30-day performance.</p>
        </div>
        <SeoActions />
      </header>

      {/* Engine totals */}
      <Section title="30-day totals">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <EngineCard engine="google" label="Google" accent="text-emerald-400" totals={totals.google} lastSub={lastSubByEngine.get("google_indexing") ?? lastSubByEngine.get("google_sitemap")} />
          <EngineCard engine="bing"   label="Bing"   accent="text-blue-400"    totals={totals.bing}   lastSub={lastSubByEngine.get("bing_submit_url")} />
        </div>
      </Section>

      {/* Daily trend */}
      {perfRows.length > 0 ? (
        <Section title="Daily clicks (Google + Bing)">
          <DailyChart rows={perfRows} />
        </Section>
      ) : (
        <Section title="Daily clicks">
          <EmptyBox message="No search performance data yet. Data starts appearing ~3 days after Google first indexes pages, via the nightly fetch cron." />
        </Section>
      )}

      {/* Top queries */}
      <Section title="Top queries (30 days)">
        {topQueries.length === 0 ? (
          <EmptyBox message="No queries yet. Google needs to index pages first (can take 1-7 days after Indexing API submission)." />
        ) : (
          <Table
            headers={["Engine", "Query", "Clicks", "Impr.", "CTR", "Pos"]}
            rows={topQueries.map((q) => [
              <EngineBadge key="e" engine={q.engine} />,
              <span key="q" className="text-zinc-200 text-sm">{q.query}</span>,
              <span key="c" className="text-zinc-200">{q.clicks.toLocaleString()}</span>,
              <span key="i" className="text-zinc-400">{q.impressions.toLocaleString()}</span>,
              <span key="ctr" className="text-zinc-400 font-mono text-xs">{(q.ctr * 100).toFixed(1)}%</span>,
              <span key="p" className="text-zinc-400 font-mono text-xs">{q.avg_position?.toFixed(1) ?? "—"}</span>,
            ])}
          />
        )}
      </Section>

      {/* Top pages */}
      <Section title="Top pages (30 days)">
        {topPages.length === 0 ? (
          <EmptyBox message="No page data yet." />
        ) : (
          <Table
            headers={["Engine", "Page", "Clicks", "Impr.", "CTR", "Pos"]}
            rows={topPages.map((p) => [
              <EngineBadge key="e" engine={p.engine} />,
              <span key="u" className="font-mono text-xs text-zinc-300 break-all">{p.page_url.replace("https://practiq.dev", "")}</span>,
              <span key="c" className="text-zinc-200">{p.clicks.toLocaleString()}</span>,
              <span key="i" className="text-zinc-400">{p.impressions.toLocaleString()}</span>,
              <span key="ctr" className="text-zinc-400 font-mono text-xs">{(p.ctr * 100).toFixed(1)}%</span>,
              <span key="p" className="text-zinc-400 font-mono text-xs">{p.avg_position?.toFixed(1) ?? "—"}</span>,
            ])}
          />
        )}
      </Section>

      {/* Recent submissions */}
      <Section title="Recent submissions">
        {subRows.length === 0 ? (
          <EmptyBox message="No submissions logged yet. Hit the 'Submit now' button above (or wait for next deploy)." />
        ) : (
          <Table
            headers={["Time", "Engine", "URL / Sitemap", "Status"]}
            rows={subRows.slice(0, 50).map((s) => [
              <span key="t" className="text-xs text-zinc-500 font-mono">{formatRelative(s.submitted_at)}</span>,
              <span key="e" className="font-mono text-xs text-zinc-300">{s.engine}</span>,
              <span key="u" className="font-mono text-xs text-zinc-400 break-all">{s.url ?? s.sitemap_url ?? "—"}</span>,
              <StatusBadge key="s" ok={s.ok} code={s.status_code} />,
            ])}
          />
        )}
      </Section>

      <footer className="mt-12 text-xs text-zinc-600 text-center">
        Nightly fetch auto-runs via Vercel Cron. Sources: Google Search Console API, Bing Webmaster API, IndexNow.
      </footer>
    </div>
  );
}

// ───── UI ─────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="text-lg font-bold text-zinc-100 mb-4">{title}</h2>
      {children}
    </section>
  );
}

function EngineCard({ engine, label, accent, totals, lastSub }: {
  engine: string;
  label: string;
  accent: string;
  totals?: { clicks: number; impressions: number; avgCtr: number };
  lastSub?: SubmissionRow;
}) {
  return (
    <div className="bento-card p-6">
      <div className={`text-[10px] font-bold uppercase tracking-widest ${accent} mb-4`}>{label}</div>
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Clicks</div>
          <div className="text-2xl font-black text-zinc-100">{(totals?.clicks ?? 0).toLocaleString()}</div>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Impressions</div>
          <div className="text-2xl font-black text-zinc-100">{(totals?.impressions ?? 0).toLocaleString()}</div>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">CTR</div>
          <div className="text-2xl font-black text-zinc-100">{((totals?.avgCtr ?? 0) * 100).toFixed(1)}%</div>
        </div>
      </div>
      <div className="text-xs text-zinc-500 pt-4 border-t border-zinc-800">
        Last submission: <span className="text-zinc-400 font-mono">{lastSub ? formatRelative(lastSub.submitted_at) : "never"}</span>
        {lastSub && <span className="ml-2 text-zinc-600">({lastSub.engine}, {lastSub.ok ? "ok" : "fail"})</span>}
      </div>
      {engine === "bing" && (
        <div className="text-xs text-zinc-600 mt-2">
          Bing covers DuckDuckGo + ChatGPT web search.
        </div>
      )}
    </div>
  );
}

function DailyChart({ rows }: { rows: PerfRow[] }) {
  const byDay = new Map<string, { google: number; bing: number }>();
  for (const r of rows) {
    const e = byDay.get(r.day) ?? { google: 0, bing: 0 };
    if (r.engine === "google") e.google += r.clicks;
    if (r.engine === "bing") e.bing += r.clicks;
    byDay.set(r.day, e);
  }
  const days = Array.from(byDay.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const max = Math.max(1, ...days.map(([, v]) => v.google + v.bing));

  return (
    <div className="bento-card p-6">
      <div className="flex items-end gap-1 h-32">
        {days.map(([day, v]) => {
          const total = v.google + v.bing;
          const h = Math.max(2, (total / max) * 100);
          return (
            <div
              key={day}
              className="flex-1 bg-zinc-700 hover:bg-zinc-500 transition-colors rounded-t"
              style={{ height: `${h}%` }}
              title={`${day}: Google ${v.google} · Bing ${v.bing}`}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-zinc-500 mt-2 font-mono">
        <span>{days[0]?.[0]}</span>
        <span>peak: {max}</span>
        <span>{days[days.length - 1]?.[0]}</span>
      </div>
    </div>
  );
}

function EngineBadge({ engine }: { engine: string }) {
  const colors: Record<string, string> = { google: "text-emerald-400", bing: "text-blue-400" };
  return (
    <span className={`text-[10px] px-2 py-1 rounded-md bg-zinc-800 font-bold uppercase tracking-widest ${colors[engine] ?? "text-zinc-400"}`}>
      {engine}
    </span>
  );
}

function StatusBadge({ ok, code }: { ok: boolean; code: number }) {
  return (
    <span
      className={`text-[10px] px-2 py-1 rounded-md font-mono font-bold ${
        ok ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
      }`}
    >
      {code}
    </span>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  if (rows.length === 0) return <EmptyBox message="No data." />;
  return (
    <div className="bento-card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-zinc-900/50 border-b border-zinc-800">
          <tr>
            {headers.map((h) => (
              <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-zinc-900 last:border-b-0 hover:bg-zinc-900/30">
              {row.map((c, j) => (<td key={j} className="px-4 py-3 align-top">{c}</td>))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyBox({ message }: { message: string }) {
  return <div className="bento-card p-8 text-center text-sm text-zinc-500">{message}</div>;
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="max-w-3xl mx-auto py-32 px-6">
      <div className="bento-card p-8">
        <div className="text-[10px] font-bold uppercase tracking-widest text-red-400 mb-2">Error</div>
        <p className="text-zinc-200">{message}</p>
      </div>
    </div>
  );
}

function formatRelative(iso: string): string {
  const d = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - d);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}
