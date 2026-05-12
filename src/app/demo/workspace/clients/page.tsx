import type { Metadata } from "next";
import {
  DemoWorkspaceShell,
  SampleFooterNote,
} from "@/components/demo-workspace/demo-workspace-shell";
import { SAMPLE_CLIENTS } from "@/data/demo-workspace";
import { DemoClientsList } from "./clients-list";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "(Sample) Clients — Practiq",
  description:
    "Browse a sample 50-client roster inside Practiq. None of these clients are real.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function DemoWorkspaceClientsPage() {
  return (
    <DemoWorkspaceShell activeNav="clients">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 lg:py-10">
        <header className="mb-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            Sample clients
          </p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-[-0.03em] text-zinc-100 md:text-4xl">
            All {SAMPLE_CLIENTS.length} clients
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            A fictional book of business across boutique CPA verticals.
          </p>
        </header>

        <DemoClientsList clients={SAMPLE_CLIENTS} />

        <SampleFooterNote />
      </div>
    </DemoWorkspaceShell>
  );
}
