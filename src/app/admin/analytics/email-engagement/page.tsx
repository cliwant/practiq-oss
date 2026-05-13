/**
 * /admin/analytics/email-engagement — per-tag transactional email
 * engagement funnel.
 *
 * After the 2026-05-13 SES → Resend migration, every transactional send
 * lands as `transactional_email_sent` / …_delivered / …_opened /
 * …_clicked / …_bounced / …_complained in practiq.analytics_events with
 * a `tag` property identifying the send (early-access-confirm,
 * workflow-audit-report, workflow-audit-followup, nurture-day-{0..30},
 * ai-policy-completion). This page rolls those rows up per tag so the
 * operator can spot a quiet sender or a bouncing campaign without
 * writing SQL.
 *
 * Engagement signals come from the Resend webhook AND the polling
 * fallback (src/lib/email/tracking.ts) — both normalise into the same
 * event-row shape, so this page works correctly even before
 * RESEND_WEBHOOK_SECRET is wired up.
 *
 * Renders entirely server-side via prisma.$queryRaw against
 * practiq.analytics_events. Two tables: last 7 days and last 30 days.
 *
 * Auth: middleware enforces admin host + cookie, same as the sibling
 * /admin/analytics/tools-funnel.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Email engagement — Practiq Admin",
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

interface EngagementRow {
  tag: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  complained: number;
}

// One pass through analytics_events filtered to transactional_email_*
// types in the window, grouped by tag. Returns a flat row per tag with
// one column per event type. `properties->>'tag'` extracts the string
// tag value out of the JSON props blob.
async function loadEngagement(sinceDays: number): Promise<EngagementRow[]> {
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
  // Parameterised raw SQL so the date placeholder is properly escaped.
  // `practiq.analytics_events` is the canonical table — Prisma's
  // `analyticsEvent` model maps onto it via @@schema("practiq").
  const rows = await prisma.$queryRaw<
    Array<{
      tag: string | null;
      type: string;
      n: bigint;
    }>
  >`
    SELECT
      properties->>'tag' AS tag,
      type,
      COUNT(*) AS n
    FROM practiq.analytics_events
    WHERE type LIKE 'transactional_email_%'
      AND created_at >= ${since}
    GROUP BY properties->>'tag', type
  `;

  const byTag = new Map<string, EngagementRow>();
  const ensure = (rawTag: string | null): EngagementRow => {
    const tag = rawTag && rawTag.length > 0 ? rawTag : "(untagged)";
    let row = byTag.get(tag);
    if (!row) {
      row = {
        tag,
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        bounced: 0,
        complained: 0,
      };
      byTag.set(tag, row);
    }
    return row;
  };
  for (const r of rows) {
    const row = ensure(r.tag);
    const n = Number(r.n);
    switch (r.type) {
      case "transactional_email_sent":
        row.sent = n;
        break;
      case "transactional_email_delivered":
        row.delivered = n;
        break;
      case "transactional_email_opened":
        row.opened = n;
        break;
      case "transactional_email_clicked":
        row.clicked = n;
        break;
      case "transactional_email_bounced":
        row.bounced = n;
        break;
      case "transactional_email_complained":
        row.complained = n;
        break;
      default:
        break;
    }
  }
  return Array.from(byTag.values()).sort((a, b) => b.sent - a.sent);
}

function pct(numerator: number, denominator: number): string {
  if (denominator <= 0) return "—";
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

export default async function EmailEngagementPage() {
  const [rows7, rows30] = await Promise.all([
    loadEngagement(7),
    loadEngagement(30),
  ]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 text-zinc-100">
      <header className="mb-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-2">
          Transactional email
        </p>
        <h1 className="text-3xl md:text-4xl font-black text-zinc-100 tracking-tight mb-3">
          Email engagement
        </h1>
        <p className="text-zinc-400 text-sm max-w-2xl">
          Per-tag rollup of every transactional send through the studio's
          Resend pipeline. Sent → Delivered → Opened → Clicked, plus
          Bounced and Complained. Data reflects the canonical Resend
          webhook stream and the 60-second polling fallback. Reload to
          refresh.
        </p>
        <div className="mt-4 text-[11px] text-zinc-500">
          <Link
            href="/admin"
            className="underline-offset-2 hover:text-zinc-300 hover:underline"
          >
            ← Back to admin
          </Link>
        </div>
      </header>

      <Section title="Last 7 days">
        <EngagementTable rows={rows7} />
      </Section>

      <Section title="Last 30 days">
        <EngagementTable rows={rows30} />
      </Section>

      <footer className="mt-12 text-xs text-zinc-600 text-center">
        Source: <code className="text-zinc-400">practiq.analytics_events</code>{" "}
        — types <code className="text-zinc-400">transactional_email_*</code>,
        grouped by <code className="text-zinc-400">properties.tag</code>.
      </footer>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <h2 className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-4">
        {title}
      </h2>
      {children}
    </section>
  );
}

function EngagementTable({ rows }: { rows: EngagementRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-[#0a0a0a] p-8 text-center text-sm text-zinc-500">
        No transactional sends in this window yet.
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-zinc-800 bg-[#0a0a0a] overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-zinc-900/40 text-[10px] uppercase tracking-widest text-zinc-400">
          <tr>
            <th className="text-left px-4 py-3 font-bold">Tag</th>
            <th className="text-right px-4 py-3 font-bold">Sent</th>
            <th className="text-right px-4 py-3 font-bold">Delivered</th>
            <th className="text-right px-4 py-3 font-bold">Deliver %</th>
            <th className="text-right px-4 py-3 font-bold">Opened</th>
            <th className="text-right px-4 py-3 font-bold">Open %</th>
            <th className="text-right px-4 py-3 font-bold">Clicked</th>
            <th className="text-right px-4 py-3 font-bold">Click %</th>
            <th className="text-right px-4 py-3 font-bold">Bounced</th>
            <th className="text-right px-4 py-3 font-bold">Complained</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.tag} className="border-t border-zinc-800/60">
              <td className="px-4 py-3 font-mono text-xs text-zinc-200">
                {r.tag}
              </td>
              <td className="px-4 py-3 text-right font-mono text-zinc-100">
                {r.sent.toLocaleString()}
              </td>
              <td className="px-4 py-3 text-right font-mono text-zinc-100">
                {r.delivered.toLocaleString()}
              </td>
              <td className="px-4 py-3 text-right font-mono text-zinc-400">
                {pct(r.delivered, r.sent)}
              </td>
              <td className="px-4 py-3 text-right font-mono text-emerald-400">
                {r.opened.toLocaleString()}
              </td>
              <td className="px-4 py-3 text-right font-mono text-zinc-400">
                {pct(r.opened, r.delivered || r.sent)}
              </td>
              <td className="px-4 py-3 text-right font-mono text-emerald-400">
                {r.clicked.toLocaleString()}
              </td>
              <td className="px-4 py-3 text-right font-mono text-zinc-400">
                {pct(r.clicked, r.delivered || r.sent)}
              </td>
              <td
                className={`px-4 py-3 text-right font-mono ${r.bounced > 0 ? "text-red-400" : "text-zinc-500"}`}
              >
                {r.bounced.toLocaleString()}
              </td>
              <td
                className={`px-4 py-3 text-right font-mono ${r.complained > 0 ? "text-red-400" : "text-zinc-500"}`}
              >
                {r.complained.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
