/**
 * /admin/funnels — predefined acquisition funnel (Tier 5).
 *
 * Pipeline: $pageview → /pricing pageview → signup_form_submitted →
 *           signup_completed → checkout_initiated → checkout_completed
 *
 * Filters: date range (default 30d), first_touch.utm_source, landing_page.
 * Each step shows total count + conversion % from previous step.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Funnels — Practiq Admin",
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
  searchParams: Promise<{ days?: string; source?: string; landing?: string }>;
}

const STEPS = [
  { label: "Landing pageview", filter: { type: "$pageview" } },
  { label: "/pricing visit", filter: { type: "$pageview", urlContains: "/pricing" } },
  { label: "Signup form submitted", filter: { type: "signup_form_submitted" } },
  { label: "Signup completed", filter: { type: "signup_completed" } },
  { label: "Checkout initiated", filter: { type: "checkout_initiated" } },
  { label: "Checkout completed", filter: { type: "checkout_completed" } },
];

export default async function FunnelsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const days = Math.max(1, Math.min(365, parseInt(sp.days ?? "30", 10) || 30));
  const source = sp.source?.trim() || "";
  const landing = sp.landing?.trim() || "";
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const counts: number[] = [];
  for (const s of STEPS) {
    const where: Record<string, unknown> = {
      type: s.filter.type,
      createdAt: { gte: since },
    };
    if ("urlContains" in s.filter && s.filter.urlContains) {
      where.url = { contains: s.filter.urlContains };
    }
    if (source) where.firstTouchUtmSource = source;
    if (landing) where.firstTouchLandingPage = landing;
    // Distinct visitors per step (not raw event count) for funnel logic.
    const rows = await prisma.analyticsEvent.findMany({
      where,
      select: { distinctId: true, userId: true },
    });
    const uniques = new Set(rows.map((r) => r.userId ?? r.distinctId ?? ""));
    uniques.delete("");
    counts.push(uniques.size);
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-zinc-100 tracking-[-0.03em]">
          Acquisition funnel
        </h1>
        <p className="text-sm text-zinc-400 mt-2">
          Distinct visitors at each step over the past {days} day
          {days === 1 ? "" : "s"}.
        </p>
      </div>

      <form
        action="/admin/funnels"
        method="get"
        className="flex flex-wrap gap-3 mb-8 items-end"
      >
        <Field name="days" defaultValue={String(days)} label="Days" />
        <Field name="source" defaultValue={source} label="First-touch utm_source" />
        <Field name="landing" defaultValue={landing} label="Landing page" />
        <button
          type="submit"
          className="px-6 py-3 bg-zinc-100 text-zinc-950 rounded-xl text-sm font-bold hover:bg-zinc-200"
        >
          Apply
        </button>
      </form>

      <div className="space-y-3">
        {STEPS.map((s, i) => {
          const count = counts[i];
          const prev = i === 0 ? counts[0] : counts[i - 1];
          const overallPct =
            counts[0] > 0 ? Math.round((count / counts[0]) * 1000) / 10 : 0;
          const stepPct =
            prev > 0 ? Math.round((count / prev) * 1000) / 10 : 0;
          const dropoff = prev - count;
          const widthPct =
            counts[0] > 0 ? Math.max(2, (count / counts[0]) * 100) : 0;
          return (
            <div
              key={s.label}
              className="rounded-xl border border-zinc-800 bg-[#0a0a0a] p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-bold text-zinc-100">
                  {i + 1}. {s.label}
                </div>
                <div className="text-sm font-mono text-zinc-300">
                  {count.toLocaleString()}
                </div>
              </div>
              <div className="h-2 rounded-full bg-zinc-900 overflow-hidden">
                <div
                  className="h-full bg-emerald-500"
                  style={{ width: `${widthPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-2 text-[11px] text-zinc-500">
                <span>
                  {overallPct}% of step 1 · {stepPct}% from previous
                </span>
                {i > 0 && dropoff > 0 && (
                  <span className="text-amber-400">
                    drop-off {dropoff.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-12 text-xs text-zinc-500">
        <Link href="/admin/journeys" className="hover:text-zinc-300">
          ← Journeys
        </Link>{" "}
        ·{" "}
        <Link href="/admin/cohorts" className="hover:text-zinc-300">
          Cohorts →
        </Link>
      </div>
    </div>
  );
}

function Field({
  name,
  defaultValue,
  label,
}: {
  name: string;
  defaultValue: string;
  label: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-widest text-zinc-500">
        {label}
      </span>
      <input
        type="text"
        name={name}
        defaultValue={defaultValue}
        className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-500 outline-none"
      />
    </label>
  );
}
