/**
 * /admin/signups — waitlist + newsletter signup analytics.
 *
 * Auth handled by middleware via session cookie.
 */
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

interface WaitlistRow {
  email: string;
  firm_name: string | null;
  firm_vertical: string | null;
  firm_size: string | null;
  client_count: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  ip_country: string | null;
  created_at: string;
  confirmed_at: string | null;
}

interface NewsletterRow {
  email: string;
  source: string | null;
  post_slug: string | null;
  subscribed_at: string;
}

const VERTICAL_LABELS: Record<string, string> = {
  accounting: "Accounting",
  law: "Law",
  consulting: "Consulting",
  hr: "HR",
  marketing: "Marketing",
  agency: "Agency",
  other: "Other",
};

export default async function SignupsDashboard() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    return <ErrorBox message="Supabase environment variables are not configured." />;
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const [
    { data: waitlist, error: wErr },
    { data: newsletter, error: nErr },
  ] = await Promise.all([
    supabase
      .from("waitlist")
      .select("email, firm_name, firm_vertical, firm_size, client_count, utm_source, utm_campaign, ip_country, created_at, confirmed_at")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("newsletter_subscribers")
      .select("email, source, post_slug, subscribed_at")
      .order("subscribed_at", { ascending: false })
      .limit(500),
  ]);

  if (wErr) return <ErrorBox message={`waitlist: ${wErr.message}`} />;
  if (nErr) return <ErrorBox message={`newsletter_subscribers: ${nErr.message}`} />;

  const waitRows = (waitlist ?? []) as WaitlistRow[];
  const newsRows = (newsletter ?? []) as NewsletterRow[];

  // ── Aggregations ─────────────────────────────────────────────────────
  const totalWaitlist = waitRows.length;
  const totalNewsletter = newsRows.length;

  // Vertical breakdown (waitlist)
  const verticalMap = new Map<string, number>();
  for (const r of waitRows) {
    const v = r.firm_vertical || "unknown";
    verticalMap.set(v, (verticalMap.get(v) ?? 0) + 1);
  }
  const byVertical = Array.from(verticalMap.entries()).sort((a, b) => b[1] - a[1]);

  // UTM source breakdown
  const sourceMap = new Map<string, number>();
  for (const r of waitRows) {
    const s = r.utm_source || "direct/organic";
    sourceMap.set(s, (sourceMap.get(s) ?? 0) + 1);
  }
  const bySource = Array.from(sourceMap.entries()).sort((a, b) => b[1] - a[1]);

  // UTM campaign breakdown (top converters)
  const campaignMap = new Map<string, number>();
  for (const r of waitRows) {
    if (!r.utm_campaign) continue;
    campaignMap.set(r.utm_campaign, (campaignMap.get(r.utm_campaign) ?? 0) + 1);
  }
  const byCampaign = Array.from(campaignMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 20);

  // Newsletter source breakdown
  const nsMap = new Map<string, number>();
  for (const r of newsRows) {
    const s = r.source || "unknown";
    nsMap.set(s, (nsMap.get(s) ?? 0) + 1);
  }
  const newsSources = Array.from(nsMap.entries()).sort((a, b) => b[1] - a[1]);

  // Daily trend (waitlist, last 30 days)
  const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const dayMap = new Map<string, number>();
  for (const r of waitRows) {
    const t = new Date(r.created_at).getTime();
    if (t < since) continue;
    const day = r.created_at.slice(0, 10);
    dayMap.set(day, (dayMap.get(day) ?? 0) + 1);
  }
  const dailyTrend = Array.from(dayMap.entries())
    .map(([day, hits]) => ({ day, hits }))
    .sort((a, b) => a.day.localeCompare(b.day));
  const maxDaily = dailyTrend.reduce((m, d) => Math.max(m, d.hits), 0) || 1;

  // Signal progress toward 50-signup target
  const progressPct = Math.min(100, Math.round((totalWaitlist / 50) * 100));

  return (
    <div className="max-w-6xl mx-auto py-12 px-6">
      <header className="mb-10">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-2">Waitlist & newsletter</p>
        <h1 className="text-3xl md:text-4xl font-black text-zinc-100 tracking-tight mb-3">Signups</h1>
        <p className="text-zinc-400">
          {totalWaitlist.toLocaleString()} early-access signup{totalWaitlist !== 1 ? "s" : ""} · {totalNewsletter.toLocaleString()} newsletter subscriber{totalNewsletter !== 1 ? "s" : ""}
        </p>
      </header>

      {/* Signal target progress */}
      <Section title="Cycle 1 signal progress (target: 50 waitlist signups)">
        <div className="bento-card p-6">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-3xl font-black text-zinc-100">
              {totalWaitlist} / 50
            </span>
            <span className="text-sm text-zinc-500">{progressPct}%</span>
          </div>
          <div className="h-2 bg-zinc-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-zinc-100 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="mt-3 text-xs text-zinc-500">
            {totalWaitlist < 20
              ? "🔴 kill zone (0-19)"
              : totalWaitlist < 50
              ? "🟡 iterate zone (20-49)"
              : "🟢 scale zone (50+)"}
          </div>
        </div>
      </Section>

      {/* Daily trend */}
      {dailyTrend.length > 0 && (
        <Section title="Daily signups (last 30 days)">
          <div className="bento-card p-6">
            <div className="flex items-end gap-1 h-32">
              {dailyTrend.map((d) => {
                const h = Math.max(2, (d.hits / maxDaily) * 100);
                return (
                  <div
                    key={d.day}
                    className="flex-1 bg-zinc-700 hover:bg-zinc-500 transition-colors rounded-t"
                    style={{ height: `${h}%` }}
                    title={`${d.day}: ${d.hits} signup(s)`}
                  />
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-zinc-500 mt-2 font-mono">
              <span>{dailyTrend[0]?.day}</span>
              <span>peak: {maxDaily}/day</span>
              <span>{dailyTrend[dailyTrend.length - 1]?.day}</span>
            </div>
          </div>
        </Section>
      )}

      {/* By vertical */}
      {byVertical.length > 0 && (
        <Section title="By firm vertical">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {byVertical.map(([v, n]) => (
              <div key={v} className="bento-card p-4">
                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
                  {VERTICAL_LABELS[v] ?? v}
                </div>
                <div className="text-2xl font-black text-zinc-100">{n}</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* By UTM source */}
      <Section title="Acquisition source">
        <Table
          headers={["Source", "Signups"]}
          rows={bySource.map(([s, n]) => [
            <span key="s" className="font-mono text-zinc-200">{s}</span>,
            <span key="n" className="text-zinc-200">{n}</span>,
          ])}
        />
      </Section>

      {/* Top campaigns (posts that converted) */}
      {byCampaign.length > 0 && (
        <Section title="Top converting campaigns / posts (utm_campaign)">
          <Table
            headers={["Campaign / slug", "Conversions"]}
            rows={byCampaign.map(([c, n]) => [
              <span key="c" className="font-mono text-xs text-zinc-300 break-all">{c}</span>,
              <span key="n" className="text-zinc-200">{n}</span>,
            ])}
          />
        </Section>
      )}

      {/* Recent waitlist (50) */}
      <Section title={`Recent waitlist (${Math.min(50, waitRows.length)})`}>
        <Table
          headers={["Email", "Vertical", "Firm size", "Clients", "Source", "Country", "Date"]}
          rows={waitRows.slice(0, 50).map((r) => [
            <span key="e" className="font-mono text-xs text-zinc-300 break-all">{r.email}</span>,
            <span key="v" className="text-zinc-400 text-xs">{r.firm_vertical ?? "—"}</span>,
            <span key="f" className="text-zinc-400 text-xs">{r.firm_size ?? "—"}</span>,
            <span key="c" className="text-zinc-400 text-xs">{r.client_count ?? "—"}</span>,
            <span key="s" className="text-zinc-400 text-xs">{r.utm_source ?? "direct"}</span>,
            <span key="ct" className="text-zinc-500 text-xs">{r.ip_country ?? "—"}</span>,
            <span key="d" className="text-zinc-500 font-mono text-xs">{formatRelative(r.created_at)}</span>,
          ])}
        />
      </Section>

      {/* Newsletter subscribers */}
      <Section title={`Newsletter subscribers (${totalNewsletter})`}>
        {totalNewsletter === 0 ? (
          <EmptyBox message="No newsletter subscribers yet. The signup form sits at the bottom of every /blog/[slug] post." />
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {newsSources.map(([s, n]) => (
                <div key={s} className="bento-card p-4">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
                    from {s}
                  </div>
                  <div className="text-2xl font-black text-zinc-100">{n}</div>
                </div>
              ))}
            </div>
            <Table
              headers={["Email", "From source", "From post", "Subscribed"]}
              rows={newsRows.slice(0, 50).map((r) => [
                <span key="e" className="font-mono text-xs text-zinc-300 break-all">{r.email}</span>,
                <span key="s" className="text-zinc-400 text-xs">{r.source ?? "—"}</span>,
                <span key="p" className="font-mono text-xs text-zinc-500 break-all">{r.post_slug ?? "—"}</span>,
                <span key="d" className="text-zinc-500 font-mono text-xs">{formatRelative(r.subscribed_at)}</span>,
              ])}
            />
          </>
        )}
      </Section>

      <footer className="mt-12 text-xs text-zinc-600 text-center">
        Page is dynamic · reload to refresh · sources: Supabase <code className="text-zinc-400">waitlist</code> + <code className="text-zinc-400">newsletter_subscribers</code>
      </footer>
    </div>
  );
}

// ── UI helpers (mirror /admin/crawler patterns) ──

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="text-lg font-bold text-zinc-100 mb-4">{title}</h2>
      {children}
    </section>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  if (rows.length === 0) return <EmptyBox message="No data yet." />;
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
              {row.map((c, j) => (
                <td key={j} className="px-4 py-3 align-top">{c}</td>
              ))}
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
