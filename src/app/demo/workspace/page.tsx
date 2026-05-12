import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertCircle,
  FileText,
  Mail,
  Workflow,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import {
  DemoWorkspaceShell,
  SampleFooterNote,
} from "@/components/demo-workspace/demo-workspace-shell";
import {
  SAMPLE_FIRM,
  SAMPLE_OVERNIGHT_FINDINGS,
  SAMPLE_ANOMALIES,
  SAMPLE_AI_WORKING_NOW,
  SAMPLE_APPROVAL_ITEMS,
  SAMPLE_WORKFLOW_PROGRESS,
  SAMPLE_CLIENTS,
  SHOWCASE_CLIENT_ID,
  formatCurrency,
} from "@/data/demo-workspace";
import { ClientAvatar } from "@/components/workspace/client-avatar";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "(Sample) Command Center — Practiq",
  description:
    "Explore a sample Practiq workspace populated with a fictional boutique CPA firm. None of these clients are real.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function DemoWorkspaceDashboardPage() {
  const draftsReady = SAMPLE_OVERNIGHT_FINDINGS.filter(
    (f) => f.category === "draft-ready",
  );
  const remindersQueued = SAMPLE_OVERNIGHT_FINDINGS.filter(
    (f) => f.category === "reminder-queued",
  );
  const recentClients = SAMPLE_CLIENTS.slice(0, 8);

  return (
    <DemoWorkspaceShell activeNav="home">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 lg:py-10">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
              {SAMPLE_FIRM.name}
            </p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-[-0.03em] text-zinc-100 md:text-4xl">
              AI&apos;s overnight findings
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              {SAMPLE_FIRM.size} · {SAMPLE_FIRM.industryFocus}
            </p>
          </div>
          <Link
            href={`/demo/workspace/clients/${SHOWCASE_CLIENT_ID}`}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3.5 py-2 text-xs font-medium text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Open showcase client
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </header>

        {/* Summary tiles */}
        <section
          aria-label="Overnight summary"
          className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4"
        >
          <SummaryTile
            tone="amber"
            label="Anomalies detected"
            value={SAMPLE_ANOMALIES.length}
            icon={<AlertCircle className="h-4 w-4" />}
          />
          <SummaryTile
            tone="blue"
            label="Drafts ready for review"
            value={draftsReady.length}
            icon={<FileText className="h-4 w-4" />}
          />
          <SummaryTile
            tone="violet"
            label="Reminders queued"
            value={remindersQueued.length}
            icon={<Mail className="h-4 w-4" />}
          />
          <SummaryTile
            tone="emerald"
            label="Workflow progress"
            value={`${SAMPLE_WORKFLOW_PROGRESS.percent}%`}
            sub={`${SAMPLE_WORKFLOW_PROGRESS.complete}/${SAMPLE_WORKFLOW_PROGRESS.total} ${SAMPLE_WORKFLOW_PROGRESS.label.toLowerCase()}`}
            icon={<Workflow className="h-4 w-4" />}
          />
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Findings list */}
          <section
            aria-label="AI overnight findings"
            className="lg:col-span-2"
          >
            <div className="rounded-2xl border border-zinc-800 bg-[#0a0a0a]">
              <header className="flex items-center justify-between border-b border-zinc-900 px-5 py-3">
                <h2 className="text-sm font-semibold text-zinc-100">
                  Findings worth your attention
                </h2>
                <Link
                  href="/demo/workspace/approval-queue"
                  className="text-[12px] font-medium text-zinc-400 hover:text-zinc-100"
                >
                  Open approval queue →
                </Link>
              </header>
              <ul className="divide-y divide-zinc-900">
                {SAMPLE_ANOMALIES.map((a) => (
                  <li key={a.headline} className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-amber-500/15 text-amber-300">
                        <AlertCircle className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold text-zinc-100">
                          {a.headline}
                        </div>
                        <p className="mt-1 text-[12.5px] leading-relaxed text-zinc-400">
                          {a.detail}
                        </p>
                        {a.clientId && (
                          <Link
                            href={`/demo/workspace/clients/${a.clientId}`}
                            className="mt-2 inline-flex items-center gap-1 text-[11.5px] font-medium text-zinc-300 hover:text-zinc-100"
                          >
                            View client
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
                {draftsReady.slice(0, 5).map((d) => (
                  <li key={d.headline} className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-500/15 text-blue-300">
                        <FileText className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold text-zinc-100">
                          {d.headline}
                        </div>
                        <p className="mt-1 text-[12.5px] leading-relaxed text-zinc-400">
                          {d.detail}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* AI working now */}
            <div className="mt-6 rounded-2xl border border-zinc-800 bg-[#0a0a0a]">
              <header className="flex items-center gap-2 border-b border-zinc-900 px-5 py-3">
                <span
                  aria-hidden="true"
                  className="h-2 w-2 animate-pulse rounded-full bg-blue-500"
                />
                <h2 className="text-sm font-semibold text-zinc-100">
                  AI working now
                </h2>
              </header>
              <ul className="divide-y divide-zinc-900">
                {SAMPLE_AI_WORKING_NOW.map((w) => (
                  <li key={w.label} className="px-5 py-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium text-zinc-100">
                          {w.label}
                        </div>
                        <div className="mt-1 text-[11.5px] text-zinc-500">
                          {w.detail}
                        </div>
                      </div>
                      <div className="w-24 shrink-0">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-900">
                          <div
                            className="h-full rounded-full bg-blue-500"
                            style={{ width: `${w.percent}%` }}
                            aria-label={`${w.percent}% complete`}
                          />
                        </div>
                        <div className="mt-1 text-right text-[10.5px] font-medium text-zinc-500">
                          {w.percent}%
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Right column — Recent clients */}
          <aside aria-label="Recent clients" className="lg:col-span-1">
            <div className="rounded-2xl border border-zinc-800 bg-[#0a0a0a]">
              <header className="flex items-center justify-between border-b border-zinc-900 px-5 py-3">
                <h2 className="text-sm font-semibold text-zinc-100">
                  Recent clients
                </h2>
                <Link
                  href="/demo/workspace/clients"
                  className="text-[12px] font-medium text-zinc-400 hover:text-zinc-100"
                >
                  All {SAMPLE_CLIENTS.length} →
                </Link>
              </header>
              <ul className="divide-y divide-zinc-900">
                {recentClients.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/demo/workspace/clients/${c.id}`}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-zinc-900/50"
                    >
                      <ClientAvatar name={c.name} color={c.color} size={28} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-medium text-zinc-100">
                          {c.name}
                        </div>
                        <div className="truncate text-[11px] text-zinc-500">
                          {c.industry} ·{" "}
                          <span className="font-mono">
                            {formatCurrency(c.monthlyRevenue)}/mo
                          </span>
                        </div>
                      </div>
                      <StatusDot status={c.closeStatus} />
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="border-t border-zinc-900 px-4 py-3">
                <p className="text-[11px] text-zinc-500">
                  All 50 sample clients are fictional and shown for illustration.
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-zinc-800 bg-[#0a0a0a] p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                Approval queue
              </p>
              <p className="mt-2 text-sm text-zinc-300">
                {SAMPLE_APPROVAL_ITEMS.length} items waiting for partner sign-off.
              </p>
              <Link
                href="/demo/workspace/approval-queue"
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-[12px] font-medium text-zinc-100 hover:border-zinc-700 hover:bg-zinc-900"
              >
                Open queue
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </aside>
        </div>

        <SampleFooterNote />
      </div>
    </DemoWorkspaceShell>
  );
}

function SummaryTile({
  tone,
  label,
  value,
  sub,
  icon,
}: {
  tone: "amber" | "blue" | "violet" | "emerald";
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
}) {
  const toneClasses = {
    amber: "bg-amber-500/10 text-amber-300 border-amber-500/20",
    blue: "bg-blue-500/10 text-blue-300 border-blue-500/20",
    violet: "bg-violet-500/10 text-violet-300 border-violet-500/20",
    emerald: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  }[tone];

  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#0a0a0a] p-5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-widest text-zinc-500">
          {label}
        </span>
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-md border ${toneClasses}`}
          aria-hidden="true"
        >
          {icon}
        </span>
      </div>
      <div className="mt-3 text-3xl font-extrabold tracking-[-0.02em] text-zinc-100">
        {value}
      </div>
      {sub && <div className="mt-1 text-[11px] text-zinc-500">{sub}</div>}
    </div>
  );
}

function StatusDot({
  status,
}: {
  status: "complete" | "in-progress" | "docs-pending";
}) {
  const map = {
    complete: { color: "bg-emerald-500", label: "Close complete" },
    "in-progress": { color: "bg-blue-500", label: "Close in progress" },
    "docs-pending": { color: "bg-amber-500", label: "Docs pending" },
  } as const;
  const v = map[status];
  return (
    <span
      className={`h-2 w-2 shrink-0 rounded-full ${v.color}`}
      title={v.label}
      aria-label={v.label}
    />
  );
}
