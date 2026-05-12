/**
 * Read-only chrome for the /demo/workspace experience.
 *
 * Visually mirrors the real WorkspaceShell (left rail + client list +
 * main content) so visitors see what the actual product looks like.
 * The shell is intentionally NOT auth-gated and renders no mutable
 * controls — every interactive element either navigates within the
 * sample workspace or surfaces a "sign up to enable" toast.
 *
 * A persistent amber banner stays pinned to the top of every page
 * inside the shell so the visitor never forgets this is a fictional
 * firm. The fabrication-incident postmortem (2026-05-07) made heavy,
 * unambiguous sample-marking a hard product requirement, not a
 * polish item.
 */

import Link from "next/link";
import { Home, CheckSquare, Users, ArrowUpRight, Sparkles } from "lucide-react";
import { ClientAvatar } from "@/components/workspace/client-avatar";
import { SAMPLE_CLIENTS, SAMPLE_APPROVAL_ITEMS } from "@/data/demo-workspace";
import { DemoWorkspaceTracker } from "./demo-workspace-tracker";

interface DemoShellProps {
  children: React.ReactNode;
  activeClientId?: string | null;
  /** Which left-rail icon should appear active. */
  activeNav?: "home" | "clients" | "approvals";
}

export function DemoWorkspaceShell({
  children,
  activeClientId,
  activeNav = "home",
}: DemoShellProps) {
  const pendingCount = SAMPLE_APPROVAL_ITEMS.length;

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100">
      <DemoWorkspaceTracker />

      {/* Sample banner — must be visible on every demo workspace page. */}
      <SampleBanner />

      <div className="flex h-[calc(100vh-44px)] w-screen overflow-hidden">
        {/* Left rail (icon-only) */}
        <nav
          aria-label="Demo workspace navigation"
          className="flex h-full w-14 flex-col items-center justify-between border-r border-zinc-900 bg-[#030303] py-4"
        >
          <div className="flex flex-col items-center gap-1">
            <Link
              href="/demo/workspace"
              className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-[13px] font-extrabold text-white shadow-lg shadow-blue-500/20"
              aria-label="Sample dashboard"
            >
              P
            </Link>
            <RailLink
              href="/demo/workspace"
              icon={<Home className="h-4 w-4" />}
              label="Sample dashboard"
              active={activeNav === "home"}
            />
            <RailLink
              href="/demo/workspace/approval-queue"
              icon={<CheckSquare className="h-4 w-4" />}
              label={`Sample approval queue (${pendingCount})`}
              active={activeNav === "approvals"}
              badge={pendingCount}
            />
            <RailLink
              href="/demo/workspace/clients"
              icon={<Users className="h-4 w-4" />}
              label="Sample clients"
              active={activeNav === "clients"}
            />
          </div>
          <Link
            href="/"
            aria-label="Back to Practiq site"
            title="Back to Practiq site"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
          >
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </nav>

        {/* Client list */}
        <aside
          aria-label="Sample client list"
          className="hidden h-full w-[260px] flex-col overflow-hidden border-r border-zinc-900 bg-[#0a0a0a] md:flex"
        >
          <div className="flex items-center gap-1.5 border-b border-zinc-900 px-3 py-3">
            <Users className="h-3.5 w-3.5 text-zinc-500" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">
              Sample clients · {SAMPLE_CLIENTS.length}
            </span>
          </div>
          <ul className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
            {SAMPLE_CLIENTS.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/demo/workspace/clients/${c.id}`}
                  className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors ${
                    activeClientId === c.id
                      ? "bg-zinc-800/80 text-zinc-50"
                      : "text-zinc-400 hover:bg-zinc-900/80 hover:text-zinc-200"
                  }`}
                >
                  <ClientAvatar name={c.name} color={c.color} size={22} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium leading-tight">
                      {c.name}
                    </div>
                    <div className="truncate text-[10.5px] leading-tight text-zinc-600">
                      {c.industry}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <div className="border-t border-zinc-900 p-3">
            <Link
              href="/signup"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/30 px-3 py-2 text-[12px] font-medium text-zinc-300 transition-all hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Try with your firm
            </Link>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

function RailLink({
  href,
  icon,
  label,
  active,
  badge,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      className={`relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
        active
          ? "bg-zinc-800 text-zinc-100"
          : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
      }`}
    >
      {icon}
      {badge !== undefined && badge > 0 && (
        <span
          aria-hidden="true"
          className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-amber-950"
        >
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}

function SampleBanner() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-[12px] text-amber-200"
    >
      <span className="inline-block rounded-md border border-amber-400/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-100">
        Sample
      </span>
      <span className="text-center text-amber-100/90">
        Fictional firm. None of these clients are real.
      </span>
      <span className="flex items-center gap-3 text-[11.5px]">
        <Link
          href="/workflow-audit?landing_slug=demo-workspace&lane=practiq"
          className="whitespace-nowrap font-medium text-zinc-200 underline decoration-zinc-600 underline-offset-4 hover:text-zinc-50 hover:decoration-zinc-300"
        >
          Run a workflow audit on yours →
        </Link>
        <span aria-hidden="true" className="text-amber-400/40">·</span>
        <Link
          href="/signup?utm_source=demo-workspace&utm_medium=sample-banner"
          className="whitespace-nowrap font-medium text-zinc-200 underline decoration-zinc-600 underline-offset-4 hover:text-zinc-50 hover:decoration-zinc-300"
        >
          Start free trial →
        </Link>
      </span>
    </div>
  );
}

export function SampleFooterNote() {
  return (
    <p className="mt-12 text-center text-xs text-zinc-500">
      Read-only sample. To enable real client workflows,{" "}
      <Link
        href="/workflow-audit"
        className="text-zinc-300 underline decoration-zinc-700 underline-offset-4 hover:decoration-zinc-400"
      >
        request a workflow audit
      </Link>{" "}
      or{" "}
      <Link
        href="/signup"
        className="text-zinc-300 underline decoration-zinc-700 underline-offset-4 hover:decoration-zinc-400"
      >
        start a free trial
      </Link>
      .
    </p>
  );
}
