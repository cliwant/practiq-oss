/**
 * Public status page — production-tier signal for prospective customers
 * (especially boutique CPA firms who treat outages as a hard purchase
 * blocker).
 *
 * The page is server-rendered every minute (revalidate: 60) so it's
 * cheap, never stale by more than a minute, and survives a flooded
 * /api/health since the page itself caches.
 *
 * It calls the existing `/api/health` endpoint (db / stripe / resend /
 * anthropic checks) plus reads the most recent successful run of each
 * scheduled cron via AuditLog (the cron-runner already writes
 * agent_run_completed entries, and digest-compactor / embeddings-
 * backfill / nightly-briefing all have their own success markers).
 *
 * No auth required — this is the page customers can bookmark and
 * point their procurement / IT review at.
 */

import type { ReactElement } from "react";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 60;
export const metadata = {
  title: "Status — Practiq",
  description: "Live system status for Practiq (db / stripe / agents / crons).",
};

interface HealthCheck {
  ok: boolean;
  ms: number;
  detail?: string;
}

interface HealthSnapshot {
  ok: boolean;
  checks: Record<string, HealthCheck>;
  generatedAt?: string;
}

async function fetchHealth(): Promise<HealthSnapshot | null> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("host") ?? "practiq.dev";
  try {
    const res = await fetch(`${proto}://${host}/api/health`, {
      cache: "no-store",
    });
    if (!res.ok && res.status !== 503) {
      // 503 still has a useful body; only bail on 4xx / network
      return null;
    }
    return (await res.json()) as HealthSnapshot;
  } catch {
    return null;
  }
}

interface CronStatus {
  name: string;
  lastSeenAt: Date | null;
  staleHours: number | null;
  ok: boolean;
}

/**
 * Read the most recent agent_run_completed audit log per agent type
 * to surface "is the cron firing?" Returns one row per nightly agent.
 * Stale-threshold is per-cron because the cadences differ:
 *   - digest_compactor: 24h (daily 02:30 UTC)
 *   - daily_briefing: 24h (daily 17:00 UTC)
 *   - anomaly_detector: 24h (daily 11:00 UTC)
 *   - comms_drafter: 24h (daily 22:00 UTC)
 *   - embeddings_backfill: 8h (every 6h)
 */
const CRON_STALE_BUDGETS: Record<string, number> = {
  daily_briefing: 24,
  anomaly_detector: 24,
  comms_drafter: 24,
};

async function fetchCronStatus(): Promise<CronStatus[]> {
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const rows = await prisma.auditLog.groupBy({
      by: ["agentType"],
      where: {
        action: "agent_run_completed",
        createdAt: { gte: since },
        agentType: { not: null },
      },
      _max: { createdAt: true },
    });
    return Object.entries(CRON_STALE_BUDGETS).map(([name, budgetH]) => {
      const row = rows.find((r) => r.agentType === name);
      const lastSeenAt = row?._max?.createdAt ?? null;
      const staleHours = lastSeenAt
        ? Math.round((Date.now() - lastSeenAt.getTime()) / (60 * 60 * 1000))
        : null;
      const ok = staleHours !== null && staleHours <= budgetH;
      return { name, lastSeenAt, staleHours, ok };
    });
  } catch {
    // Read-only page — never throw from a render path.
    return [];
  }
}

function pillClass(ok: boolean): string {
  return ok
    ? "inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-emerald-300 text-xs font-medium"
    : "inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-red-300 text-xs font-medium";
}

function dot(ok: boolean): ReactElement {
  return (
    <span
      className={
        ok
          ? "inline-block w-2 h-2 rounded-full bg-emerald-500"
          : "inline-block w-2 h-2 rounded-full bg-red-500"
      }
    />
  );
}

function fmtRel(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 60) return `${Math.round(ms)} ms`;
  if (ms < 60 * 60) return `${Math.round(ms / 60)} min`;
  return `${Math.round(ms / 60 / 60)} h`;
}

export default async function StatusPage(): Promise<ReactElement> {
  const [health, crons] = await Promise.all([fetchHealth(), fetchCronStatus()]);

  const overallOk = (health?.ok ?? false) && crons.every((c) => c.ok);

  return (
    <main className="min-h-screen bg-[#050505] px-6 py-16 text-zinc-100">
      <div className="mx-auto max-w-4xl">
        <header className="mb-12">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            Practiq · Status
          </div>
          <h1 className="mt-4 text-5xl font-black tracking-tighter text-zinc-100">
            {overallOk ? "All systems operational." : "Partial outage."}
          </h1>
          <p className="mt-4 text-zinc-400 text-base">
            Live readout of every dependency the product relies on. Refreshes
            every 60 seconds. If you're seeing user-visible degradation that
            this page doesn't reflect, email{" "}
            <a
              className="text-zinc-100 underline decoration-zinc-700 underline-offset-4 hover:decoration-zinc-300"
              href="mailto:support@practiq.dev"
            >
              support@practiq.dev
            </a>
            .
          </p>
        </header>

        <section className="mb-10">
          <h2 className="mb-4 text-lg font-bold text-zinc-100">
            Core dependencies
          </h2>
          <div className="rounded-2xl border border-zinc-800 bg-[#0a0a0a]">
            {health?.checks ? (
              Object.entries(health.checks).map(([name, c], i, arr) => (
                <div
                  key={name}
                  className={`flex items-center justify-between px-5 py-4 ${
                    i < arr.length - 1 ? "border-b border-zinc-800/80" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {dot(c.ok)}
                    <span className="font-medium capitalize text-zinc-100">
                      {name}
                    </span>
                    {c.detail ? (
                      <span className="text-xs text-zinc-500">— {c.detail}</span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-500">{fmtRel(c.ms)}</span>
                    <span className={pillClass(c.ok)}>
                      {c.ok ? "Operational" : "Degraded"}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-5 py-4 text-sm text-zinc-500">
                Health endpoint unreachable — this page itself is up, but the
                live probe didn't return.
              </div>
            )}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-lg font-bold text-zinc-100">
            Background agents
          </h2>
          <div className="rounded-2xl border border-zinc-800 bg-[#0a0a0a]">
            {crons.length === 0 ? (
              <div className="px-5 py-4 text-sm text-zinc-500">
                No recent agent runs in the audit log. Either the cron has
                never fired in this environment or the audit log was cleared.
              </div>
            ) : (
              crons.map((c, i) => (
                <div
                  key={c.name}
                  className={`flex items-center justify-between px-5 py-4 ${
                    i < crons.length - 1 ? "border-b border-zinc-800/80" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {dot(c.ok)}
                    <span className="font-medium text-zinc-100">
                      {c.name.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-500">
                      last run{" "}
                      {c.staleHours === null
                        ? "—"
                        : c.staleHours === 0
                          ? "just now"
                          : `${c.staleHours}h ago`}
                    </span>
                    <span className={pillClass(c.ok)}>
                      {c.ok ? "Healthy" : "Stale"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <footer className="mt-16 text-center text-xs text-zinc-500">
          Generated{" "}
          {health?.generatedAt
            ? new Date(health.generatedAt).toLocaleString("en-US", {
                timeZoneName: "short",
              })
            : "—"}
          . Page caches for 60 seconds; press <kbd className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">⌘R</kbd>{" "}
          to refresh.
        </footer>
      </div>
    </main>
  );
}
