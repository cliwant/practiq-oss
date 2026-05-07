/**
 * /admin/journeys — per-visitor user journey timeline (Tier 5).
 *
 * Searches `practiq.analytics_events` by distinct_id or user email and
 * renders a chronological timeline of every event that visitor produced.
 * Each pageview becomes a card showing entry → time-on-page → exit.
 *
 * Auth: middleware enforces admin host + cookie; no further check needed.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Journeys — Practiq Admin",
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

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

interface EventRow {
  id: string;
  type: string;
  url: string | null;
  referrer: string | null;
  properties: unknown;
  utmSource: string | null;
  utmCampaign: string | null;
  firstTouchUtmSource: string | null;
  firstTouchUtmCampaign: string | null;
  geoCountry: string | null;
  geoCity: string | null;
  deviceType: string | null;
  createdAt: Date;
  distinctId: string | null;
  userId: string | null;
}

export default async function JourneysPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();

  let events: EventRow[] = [];
  let visitorLabel = "";
  if (q) {
    let userId: string | null = null;
    if (q.includes("@")) {
      const u = await prisma.user.findUnique({
        where: { email: q.toLowerCase() },
        select: { id: true, email: true },
      });
      if (u) {
        userId = u.id;
        visitorLabel = `${u.email} (user ${u.id.slice(0, 8)})`;
      }
    } else {
      visitorLabel = `distinct_id ${q}`;
    }
    events = (await prisma.analyticsEvent.findMany({
      where: userId ? { OR: [{ userId }, { distinctId: q }] } : { distinctId: q },
      orderBy: { createdAt: "asc" },
      take: 1000,
    })) as unknown as EventRow[];
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-zinc-100 tracking-[-0.03em]">
          User Journeys
        </h1>
        <p className="text-sm text-zinc-400 mt-2">
          Search by visitor distinct_id or email to see every event in
          chronological order.
        </p>
      </div>

      <form className="flex gap-3 mb-8" action="/admin/journeys" method="get">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="distinct_id or email@example.com"
          className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-500 outline-none"
        />
        <button
          type="submit"
          className="px-6 py-3 bg-zinc-100 text-zinc-950 rounded-xl text-sm font-bold hover:bg-zinc-200"
        >
          Search
        </button>
      </form>

      {q && events.length === 0 && (
        <div className="text-sm text-zinc-500 italic">
          No events found for that visitor.
        </div>
      )}

      {events.length > 0 && (
        <>
          <div className="mb-4 text-xs uppercase tracking-widest text-zinc-500">
            {events.length} events for {visitorLabel}
          </div>
          <ol className="space-y-3">
            {events.map((e, i) => {
              const next = events[i + 1];
              const dwellMs = next
                ? +next.createdAt - +e.createdAt
                : null;
              const isPageview = e.type === "$pageview";
              return (
                <li
                  key={e.id}
                  className={`rounded-xl border ${
                    isPageview
                      ? "border-zinc-700 bg-zinc-900/50"
                      : "border-zinc-800 bg-[#0a0a0a]"
                  } p-4`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded ${
                            isPageview
                              ? "bg-blue-500/20 text-blue-300"
                              : "bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          {e.type}
                        </span>
                        <span className="text-xs text-zinc-500 font-mono">
                          {e.createdAt.toISOString()}
                        </span>
                        {dwellMs !== null && isPageview && (
                          <span className="text-xs text-emerald-400">
                            dwell {Math.round(dwellMs / 1000)}s
                          </span>
                        )}
                      </div>
                      {e.url && (
                        <div className="text-xs text-zinc-300 mt-1 truncate">
                          {e.url}
                        </div>
                      )}
                      <div className="text-[11px] text-zinc-500 mt-1 flex flex-wrap gap-3">
                        {e.geoCountry && (
                          <span>
                            {e.geoCountry}
                            {e.geoCity ? ` / ${e.geoCity}` : ""}
                          </span>
                        )}
                        {e.deviceType && <span>{e.deviceType}</span>}
                        {e.utmSource && (
                          <span>
                            utm {e.utmSource}/{e.utmCampaign ?? ""}
                          </span>
                        )}
                        {e.firstTouchUtmSource && (
                          <span>
                            ft {e.firstTouchUtmSource}/
                            {e.firstTouchUtmCampaign ?? ""}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <PropsBlock value={e.properties} />
                </li>
              );
            })}
          </ol>
        </>
      )}

      <div className="mt-12 text-xs text-zinc-500">
        <Link href="/admin/funnels" className="hover:text-zinc-300">
          Funnels →
        </Link>{" "}
        ·{" "}
        <Link href="/admin/cohorts" className="hover:text-zinc-300">
          Cohorts →
        </Link>
      </div>
    </div>
  );
}

function PropsBlock({ value }: { value: unknown }) {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  if (Object.keys(obj).length === 0) return null;
  const json: string = JSON.stringify(value, null, 2);
  return (
    <details className="mt-2">
      <summary className="text-[10px] uppercase tracking-widest text-zinc-500 cursor-pointer">
        Properties
      </summary>
      <pre className="mt-2 text-[11px] font-mono text-zinc-400 bg-black/40 rounded p-3 overflow-x-auto">
        {json}
      </pre>
    </details>
  );
}
