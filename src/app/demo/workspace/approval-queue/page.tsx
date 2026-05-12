import type { Metadata } from "next";
import {
  DemoWorkspaceShell,
  SampleFooterNote,
} from "@/components/demo-workspace/demo-workspace-shell";
import { ApprovalDetailCard } from "@/components/demo-workspace/approval-card";
import { SampleApprovalCounter } from "@/components/demo-workspace/sample-approval-counter";
import { SAMPLE_APPROVAL_ITEMS } from "@/data/demo-workspace";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "(Sample) Approval Queue — Practiq",
  description:
    "Browse a sample approval queue with 8 AI-prepared drafts ready for partner review. None of these clients are real.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function DemoApprovalQueuePage() {
  return (
    <DemoWorkspaceShell activeNav="approvals">
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-8 lg:py-10">
        <header className="mb-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            Sample approval queue
          </p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-[-0.03em] text-zinc-100 md:text-4xl">
            {SAMPLE_APPROVAL_ITEMS.length} drafts waiting for review
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            AI prepares the draft. The partner approves it, sends it back for revision, or
            rejects it. Approve / Reject buttons below are illustrative only.
          </p>
          <SampleApprovalCounter />
        </header>

        <div className="space-y-4">
          {SAMPLE_APPROVAL_ITEMS.map((item) => (
            <ApprovalDetailCard key={item.id} item={item} />
          ))}
        </div>

        <SampleFooterNote />
      </div>
    </DemoWorkspaceShell>
  );
}
