/**
 * /admin/crawler — read-only crawler analytics dashboard.
 *
 * Auth handled by middleware via HttpOnly cookie. If you arrived here, you
 * have the cookie. The page itself does NOT check tokens (single source of
 * truth: middleware).
 */
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

interface CategoryRow {
  bot_category: string;
  hits: number;
  unique_bots: number;
  unique_paths: number;
}

interface BotRow {
  bot_name: string;
  bot_category: string;
  hits: number;
  unique_paths: number;
  last_seen: string;
}

interface PathRow {
  path: string;
  hits: number;
  unique_bots: number;
}

interface RecentHit {
  bot_name: string;
  bot_category: string;
  path: string;
  country: string | null;
  hit_at: string;
}

interface DailyRow {
  day: string;
  hits: number;
}

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  seo: { label: "SEO", color: "text-emerald-400" },
  aeo: { label: "AEO (AI engines)", color: "text-blue-400" },
  geo: { label: "GEO (Generative)", color: "text-purple-400" },
  social: { label: "Social previews", color: "text-pink-400" },
  seo_tool: { label: "SEO tools", color: "text-amber-400" },
  other: { label: "Other crawlers", color: "text-zinc-400" },
};

export default async function CrawlerDashboard() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    return <ErrorBox message="Supabase environment variables are not configured." />;
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: rows, error } = await supabase
    .from("crawler_hits")
    .select("bot_name, bot_category, path, country, hit_at, ip_hash")
    .gte("hit_at", since)
    .order("hit_at", { ascending: false })
    .limit(50000);

  if (error) {
    const msg =
      error.message.includes("relation") || error.message.includes("does not exist")
        ? "The crawler_hits table doesn't exist yet. Apply the migration in the Supabase SQL editor (see ventures/.../supabase/migrations/20260414100000_crawler_hits.sql)."
        : `Supabase error: ${error.message}`;
    return <ErrorBox message={msg} />;
  }

  const allRows = rows ?? [];
  const totalHits = allRows.length;

  // Aggregate by category
  const catMap = new Map<string, { hits: number; bots: Set<string>; paths: Set<string> }>();
  for (const r of allRows) {
    const e = catMap.get(r.bot_category) ?? { hits: 0, bots: new Set<string>(), paths: new Set<string>() };
    e.hits += 1;
    e.bots.add(r.bot_name);
    e.paths.add(r.path);
    catMap.set(r.bot_category, e);
  }
  const byCategory: CategoryRow[] = Array.from(catMap.entries())
    .map(([bot_category, v]) => ({ bot_category, hits: v.hits, unique_bots: v.bots.size, unique_paths: v.paths.size }))
    .sort((a, b) => b.hits - a.hits);

  // Top bots
  const botMap = new Map<string, { category: string; hits: number; paths: Set<string>; last_seen: string }>();
  for (const r of allRows) {
    const e = botMap.get(r.bot_name) ?? { category: r.bot_category, hits: 0, paths: new Set<string>(), last_seen: r.hit_at };
    e.hits += 1;
    e.paths.add(r.path);
    if (r.hit_at > e.last_seen) e.last_seen = r.hit_at;
    botMap.set(r.bot_name, e);
  }
  const topBots: BotRow[] = Array.from(botMap.entries())
    .map(([bot_name, v]) => ({ bot_name, bot_category: v.category, hits: v.hits, unique_paths: v.paths.size, last_seen: v.last_seen }))
    .sort((a, b) => b.hits - a.hits)
    .slice(0, 25);

  // Top paths
  const pathMap = new Map<string, { hits: number; bots: Set<string> }>();
  for (const r of allRows) {
    const e = pathMap.get(r.path) ?? { hits: 0, bots: new Set<string>() };
    e.hits += 1;
    e.bots.add(r.bot_name);
    pathMap.set(r.path, e);
  }
  const topPaths: PathRow[] = Array.from(pathMap.entries())
    .map(([path, v]) => ({ path, hits: v.hits, unique_bots: v.bots.size }))
    .sort((a, b) => b.hits - a.hits)
    .slice(0, 25);

  // Daily trend
  const dayMap = new Map<string, number>();
  for (const r of allRows) {
    const day = r.hit_at.slice(0, 10);
    dayMap.set(day, (dayMap.get(day) ?? 0) + 1);
  }
  const dailyTrend: DailyRow[] = Array.from(dayMap.entries())
    .map(([day, hits]) => ({ day, hits }))
    .sort((a, b) => a.day.localeCompare(b.day));
  const maxDaily = dailyTrend.reduce((max, d) => Math.max(max, d.hits), 0) || 1;

  // Recent
  const recent: RecentHit[] = allRows.slice(0, 50).map((r) => ({
    bot_name: r.bot_name,
    bot_category: r.bot_category,
    path: r.path,
    country: r.country,
    hit_at: r.hit_at,
  }));

  return (
    <div className="max-w-6xl mx-auto py-12 px-6">
      <header className="mb-10">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-2">Crawler analytics</p>
        <h1 className="text-3xl md:text-4xl font-black text-zinc-100 tracking-tight mb-3">SEO · AEO · GEO traffic</h1>
        <p className="text-zinc-400">
          Last 30 days · {totalHits.toLocaleString()} bot hits ·{" "}
          {byCategory.reduce((s, c) => s + c.unique_bots, 0)} distinct bots ·{" "}
          {pathMap.size.toLocaleString()} pages crawled
        </p>
      </header>

      <Section title="By category">
        {byCategory.length === 0 ? (
          <EmptyBox message="No bot hits in the last 30 days yet. Wait a few hours after deploy — Googlebot, GPTBot, ClaudeBot etc. will start appearing." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {byCategory.map((c) => {
              const meta = CATEGORY_LABELS[c.bot_category] ?? { label: c.bot_category, color: "text-zinc-400" };
              return (
                <div key={c.bot_category} className="bento-card p-5">
                  <div className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${meta.color}`}>{meta.label}</div>
                  <div className="text-3xl font-black text-zinc-100 mb-1">{c.hits.toLocaleString()}</div>
                  <div className="text-xs text-zinc-500">
                    {c.unique_bots} bot{c.unique_bots !== 1 ? "s" : ""} · {c.unique_paths.toLocaleString()} pages
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {dailyTrend.length > 0 && (
        <Section title="Daily volume">
          <div className="bento-card p-6">
            <div className="flex items-end gap-1 h-32">
              {dailyTrend.map((d) => {
                const heightPct = Math.max(2, (d.hits / maxDaily) * 100);
                return (
                  <div
                    key={d.day}
                    className="flex-1 bg-zinc-700 hover:bg-zinc-500 transition-colors rounded-t"
                    style={{ height: `${heightPct}%` }}
                    title={`${d.day}: ${d.hits.toLocaleString()} hits`}
                  />
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-zinc-500 mt-2 font-mono">
              <span>{dailyTrend[0]?.day}</span>
              <span>peak: {maxDaily.toLocaleString()}/day</span>
              <span>{dailyTrend[dailyTrend.length - 1]?.day}</span>
            </div>
          </div>
        </Section>
      )}

      <Section title="Top bots (last 30 days)">
        <Table
          headers={["Bot", "Category", "Hits", "Pages", "Last seen"]}
          rows={topBots.map((b) => [
            <span key="b" className="font-mono text-zinc-200">{b.bot_name}</span>,
            <CategoryBadge key="c" category={b.bot_category} />,
            <span key="h" className="text-zinc-200">{b.hits.toLocaleString()}</span>,
            <span key="p" className="text-zinc-400">{b.unique_paths.toLocaleString()}</span>,
            <span key="l" className="text-xs text-zinc-500 font-mono">{formatRelative(b.last_seen)}</span>,
          ])}
        />
      </Section>

      <Section title="Most-crawled pages (last 30 days)">
        <Table
          headers={["Path", "Hits", "Distinct bots"]}
          rows={topPaths.map((p) => [
            <span key="p" className="font-mono text-xs text-zinc-300 break-all">{p.path}</span>,
            <span key="h" className="text-zinc-200">{p.hits.toLocaleString()}</span>,
            <span key="b" className="text-zinc-400">{p.unique_bots}</span>,
          ])}
        />
      </Section>

      <Section title="Recent hits (live stream)">
        <Table
          headers={["Time", "Bot", "Path", "Country"]}
          rows={recent.map((r) => [
            <span key="t" className="text-xs text-zinc-500 font-mono">{formatRelative(r.hit_at)}</span>,
            <span key="b" className="font-mono text-zinc-300">{r.bot_name}</span>,
            <span key="p" className="font-mono text-xs text-zinc-400 break-all">{r.path}</span>,
            <span key="c" className="text-xs text-zinc-500">{r.country ?? "—"}</span>,
          ])}
        />
      </Section>

      <footer className="mt-12 text-xs text-zinc-600 text-center">
        Page is dynamic and never cached. Reload to refresh.
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="text-lg font-bold text-zinc-100 mb-4">{title}</h2>
      {children}
    </section>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  if (rows.length === 0) {
    return <EmptyBox message="No data yet." />;
  }
  return (
    <div className="bento-card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-zinc-900/50 border-b border-zinc-800">
          <tr>
            {headers.map((h) => (
              <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-zinc-900 last:border-b-0 hover:bg-zinc-900/30">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 align-top">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const meta = CATEGORY_LABELS[category] ?? { label: category, color: "text-zinc-400" };
  return (
    <span className={`text-[10px] px-2 py-1 rounded-md bg-zinc-800 font-bold uppercase tracking-widest ${meta.color}`}>
      {meta.label}
    </span>
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
