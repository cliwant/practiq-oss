"use client";

import { useState } from "react";
import {
  FileText,
  BookOpen,
  CheckSquare,
  CircleDollarSign,
  ListChecks,
} from "lucide-react";
import { trackClient } from "@/lib/analytics/track-client";
import {
  formatCurrency,
  type ApprovalItem,
  type SampleClient,
} from "@/data/demo-workspace";
import { ApprovalDetailCard } from "@/components/demo-workspace/approval-card";

type TabKey = "overview" | "financials" | "documents" | "knowledge" | "approvals";

interface Props {
  client: SampleClient;
  approvals: ApprovalItem[];
}

export function DemoClientTabs({ client, approvals }: Props) {
  const [active, setActive] = useState<TabKey>("overview");

  const tabs: { id: TabKey; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview", icon: <ListChecks className="h-3.5 w-3.5" /> },
    { id: "financials", label: "Financials", icon: <CircleDollarSign className="h-3.5 w-3.5" /> },
    { id: "documents", label: "Documents", icon: <FileText className="h-3.5 w-3.5" /> },
    { id: "knowledge", label: "Knowledge base", icon: <BookOpen className="h-3.5 w-3.5" /> },
    { id: "approvals", label: `Approval queue (${approvals.length})`, icon: <CheckSquare className="h-3.5 w-3.5" /> },
  ];

  return (
    <div>
      <div
        role="tablist"
        aria-label={`${client.name} tabs`}
        className="mb-6 flex flex-wrap gap-1 border-b border-zinc-900"
      >
        {tabs.map((t) => {
          const selected = active === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={selected}
              type="button"
              onClick={() => {
                setActive(t.id);
                trackClient({
                  type: "demo_workspace_interaction",
                  properties: {
                    surface: "client_detail",
                    action: "tab_click",
                    target_id: `${client.id}:${t.id}`,
                  },
                });
              }}
              className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-[12.5px] font-medium transition-colors ${
                selected
                  ? "border-zinc-100 text-zinc-100"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          );
        })}
      </div>

      <div>
        {active === "overview" && <OverviewTab client={client} approvals={approvals} />}
        {active === "financials" && <FinancialsTab client={client} />}
        {active === "documents" && <DocumentsTab client={client} />}
        {active === "knowledge" && <KnowledgeTab client={client} />}
        {active === "approvals" && (
          <ApprovalsTab client={client} approvals={approvals} />
        )}
      </div>
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-[#0a0a0a]">
      <header className="border-b border-zinc-900 px-5 py-3">
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">
          {title}
        </h3>
      </header>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

function OverviewTab({
  client,
  approvals,
}: {
  client: SampleClient;
  approvals: ApprovalItem[];
}) {
  const sampleActivity = [
    {
      when: "3h ago",
      what: "AI matched 218 of 222 March bank transactions to QB ledger.",
    },
    {
      when: "Yesterday",
      what: "March P&L draft generated. Awaiting partner approval.",
    },
    {
      when: "2d ago",
      what: "Quarterly tax estimate worksheet refreshed with March numbers.",
    },
    {
      when: "5d ago",
      what: "Vendor 1099-NEC reconciliation completed for Q1.",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <Card title="Snapshot">
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-[11px] uppercase tracking-widest text-zinc-500">
              Industry
            </dt>
            <dd className="mt-1 text-zinc-200">{client.industry}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-widest text-zinc-500">
              Entity type
            </dt>
            <dd className="mt-1 text-zinc-200">{client.entityType}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-widest text-zinc-500">
              Monthly revenue
            </dt>
            <dd className="mt-1 font-mono text-zinc-200">
              {formatCurrency(client.monthlyRevenue)}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-widest text-zinc-500">
              Close status
            </dt>
            <dd className="mt-1 text-zinc-200 capitalize">
              {client.closeStatus.replace("-", " ")}
            </dd>
          </div>
        </dl>
      </Card>

      <Card title="Team">
        <ul className="space-y-2 text-sm">
          <li className="flex items-center justify-between">
            <span className="text-zinc-400">Partner</span>
            <span className="font-medium text-zinc-100">{client.partner}</span>
          </li>
          <li className="flex items-center justify-between">
            <span className="text-zinc-400">Staff accountant</span>
            <span className="font-medium text-zinc-100">{client.staff}</span>
          </li>
          <li className="flex items-center justify-between">
            <span className="text-zinc-400">Last activity</span>
            <span className="font-medium text-zinc-100">{client.lastActivity}</span>
          </li>
        </ul>
      </Card>

      <Card title="Recent AI activity">
        <ul className="space-y-3">
          {sampleActivity.map((a) => (
            <li key={a.what} className="flex gap-3 text-sm">
              <span className="mt-0.5 w-16 shrink-0 text-[11px] font-medium uppercase tracking-widest text-zinc-500">
                {a.when}
              </span>
              <span className="text-zinc-300">{a.what}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Pending approvals for this client">
        {approvals.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No items pending review for this sample client.
          </p>
        ) : (
          <ul className="space-y-3">
            {approvals.map((a) => (
              <li key={a.id} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                <div className="text-[13px] font-medium text-zinc-100">{a.title}</div>
                <p className="mt-1 text-[12px] text-zinc-400">{a.preview.summary}</p>
                <div className="mt-2 flex items-center gap-3 text-[10.5px] font-medium uppercase tracking-widest text-zinc-500">
                  <span>{a.type}</span>
                  <span>·</span>
                  <span>AI confidence {a.aiConfidence}%</span>
                  <span>·</span>
                  <span>Due {a.deadline.toLowerCase()}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function FinancialsTab({ client }: { client: SampleClient }) {
  const rev = client.monthlyRevenue;
  // Plausible boutique CPA pseudo P&L derived deterministically from
  // monthly revenue. Honest-fictional: numbers consistent with the
  // entity type and industry but obviously sample.
  const cogs = Math.round(rev * 0.32);
  const opex = Math.round(rev * 0.35);
  const net = rev - cogs - opex;

  const rows: { label: string; value: number; muted?: boolean }[] = [
    { label: "Revenue (March, draft)", value: rev },
    { label: "COGS", value: -cogs },
    { label: "Operating expenses", value: -opex },
    { label: "Net income (estimated)", value: net },
  ];

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
      <div className="md:col-span-2">
        <Card title="March P&L (draft, sample data)">
          <table className="w-full text-sm">
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={r.label}
                  className={
                    i === rows.length - 1
                      ? "border-t border-zinc-800 font-semibold text-zinc-100"
                      : "text-zinc-300"
                  }
                >
                  <td className="py-2 pr-4">{r.label}</td>
                  <td className="py-2 text-right font-mono">
                    {formatCurrency(r.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-[11.5px] text-zinc-500">
            Numbers above are illustrative only. In your real workspace, Practiq pulls these
            from your accounting system on every sync.
          </p>
        </Card>
      </div>
      <Card title="Key ratios">
        <ul className="space-y-3 text-sm">
          <li className="flex items-center justify-between">
            <span className="text-zinc-400">Gross margin</span>
            <span className="font-mono text-zinc-100">{Math.round(((rev - cogs) / rev) * 100)}%</span>
          </li>
          <li className="flex items-center justify-between">
            <span className="text-zinc-400">Operating margin</span>
            <span className="font-mono text-zinc-100">{Math.round((net / rev) * 100)}%</span>
          </li>
          <li className="flex items-center justify-between">
            <span className="text-zinc-400">YoY revenue change</span>
            <span className="font-mono text-zinc-100">+{6 + (rev % 7)}%</span>
          </li>
        </ul>
      </Card>
    </div>
  );
}

function DocumentsTab({ client }: { client: SampleClient }) {
  const docs = [
    { name: "March P&L draft.xlsx", when: "Generated 2h ago", kind: "AI draft" },
    { name: "March Balance Sheet.xlsx", when: "Generated 2h ago", kind: "AI draft" },
    { name: "Q1 estimated tax worksheet.xlsx", when: "Refreshed yesterday", kind: "AI draft" },
    { name: "2025 federal return (signed copy).pdf", when: "Uploaded by partner", kind: "Source doc" },
    { name: `${client.name} engagement letter.pdf`, when: "Uploaded by partner", kind: "Source doc" },
    { name: "March bank statements.pdf", when: "Imported via secure share", kind: "Source doc" },
  ];

  return (
    <Card title={`Documents for ${client.name}`}>
      <ul className="divide-y divide-zinc-900">
        {docs.map((d) => (
          <li key={d.name} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <div className="truncate text-[13px] font-medium text-zinc-100">{d.name}</div>
              <div className="text-[11px] text-zinc-500">{d.when}</div>
            </div>
            <span className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              {d.kind}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[11.5px] text-zinc-500">
        Document downloads are disabled in sample mode.
      </p>
    </Card>
  );
}

function KnowledgeTab({ client }: { client: SampleClient }) {
  const notes = [
    `${client.name} owner prefers concise data-forward summaries — no narrative paragraphs.`,
    `Quarterly check-in cadence agreed: month-end + 7 business days.`,
    `Use vendor name "Maple Wholesale" instead of legal entity "MW Foods LLC" in all reports.`,
    `Q1 close requires owner sign-off on any disbursement > $5,000.`,
  ];

  return (
    <Card title="Client knowledge base">
      <ul className="space-y-3 text-sm text-zinc-300">
        {notes.map((n, i) => (
          <li
            key={i}
            className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2.5"
          >
            {n}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[11.5px] text-zinc-500">
        Practiq learns notes like these from your team and applies them to every draft it
        prepares for this client.
      </p>
    </Card>
  );
}

function ApprovalsTab({
  client,
  approvals,
}: {
  client: SampleClient;
  approvals: ApprovalItem[];
}) {
  if (approvals.length === 0) {
    return (
      <Card title={`Approval queue for ${client.name}`}>
        <p className="text-sm text-zinc-500">
          Nothing pending for this client right now. New drafts will appear here automatically
          once you&apos;re using Practiq with your own clients.
        </p>
      </Card>
    );
  }
  return (
    <div className="space-y-4">
      {approvals.map((a) => (
        <ApprovalDetailCard key={a.id} item={a} />
      ))}
    </div>
  );
}

