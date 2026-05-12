import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  DemoWorkspaceShell,
  SampleFooterNote,
} from "@/components/demo-workspace/demo-workspace-shell";
import {
  SAMPLE_CLIENTS,
  getSampleClient,
  getApprovalsForClient,
  formatCurrency,
} from "@/data/demo-workspace";
import { ClientAvatar } from "@/components/workspace/client-avatar";
import { DemoClientTabs } from "./client-tabs";

export const dynamic = "force-static";

export function generateStaticParams() {
  return SAMPLE_CLIENTS.map((c) => ({ clientId: c.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ clientId: string }>;
}): Promise<Metadata> {
  const { clientId } = await params;
  const client = getSampleClient(clientId);
  if (!client) return { title: "(Sample) Client not found — Practiq" };
  return {
    title: `(Sample) ${client.name} — Practiq`,
    description: `Read-only sample client workspace for ${client.name}, a fictional ${client.industry.toLowerCase()} business. None of these numbers are real.`,
    robots: {
      index: false,
      follow: false,
      nocache: true,
    },
  };
}

export default async function DemoClientDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const client = getSampleClient(clientId);
  if (!client) notFound();

  const approvals = getApprovalsForClient(client.id);

  return (
    <DemoWorkspaceShell activeClientId={client.id} activeNav="clients">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 lg:py-8">
        <Link
          href="/demo/workspace/clients"
          className="mb-6 inline-flex items-center gap-1.5 text-[12px] font-medium text-zinc-400 hover:text-zinc-100"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to all sample clients
        </Link>

        <header className="mb-6 flex flex-wrap items-start gap-4">
          <ClientAvatar name={client.name} color={client.color} size={56} />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
              Sample client
            </p>
            <h1 className="mt-1 truncate text-2xl font-extrabold tracking-[-0.02em] text-zinc-100 md:text-3xl">
              {client.name}
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              {client.industry} · {client.entityType} ·{" "}
              <span className="font-mono">
                {formatCurrency(client.monthlyRevenue)}/mo
              </span>
            </p>
          </div>
          {client.anomaly && (
            <div className="w-full max-w-md rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-[12px] text-amber-100">
              <div className="text-[10px] font-bold uppercase tracking-widest text-amber-300">
                AI flag · {client.anomaly.severity}
              </div>
              <div className="mt-1 font-semibold">{client.anomaly.headline}</div>
              <p className="mt-1 text-amber-100/80">{client.anomaly.detail}</p>
            </div>
          )}
        </header>

        <DemoClientTabs client={client} approvals={approvals} />

        <SampleFooterNote />
      </div>
    </DemoWorkspaceShell>
  );
}
