"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Pin,
  MessageSquare,
  BookOpen,
  Palette,
  Mail,
  FileText,
  ArrowRight,
  Sparkles,
  FilePlus,
} from "lucide-react";
import { formatDistance } from "@/lib/format-time";
import { ArtifactDialog } from "./artifact-dialog";
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  type ClientDossier,
  type ContextCategory,
  type ContextItem,
} from "./types";

/**
 * Overview tab — the scannable summary of what the agent knows about
 * this client. Three columns on desktop:
 *   1. Pinned knowledge (the system prompt's permanent context)
 *   2. Recent activity (new contexts, last conversation)
 *   3. Preferences (tone, formats, contact)
 *
 * Every card is a jump point into Contexts or Chat. Designed to be
 * absorbed in under 10 seconds — operators see 50+ clients/day.
 */
export function ClientOverview({
  client,
  contexts,
  onJumpToChat,
  onJumpToContexts,
}: {
  client: ClientDossier;
  contexts: ContextItem[];
  onJumpToChat: () => void;
  onJumpToContexts: () => void;
}) {
  const pinned = contexts.filter((c) => c.isPinned);
  const recent = contexts
    .filter((c) => !c.isPinned)
    .slice(0, 5);
  const [artifactOpen, setArtifactOpen] = useState(false);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-10 py-8">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* ─── Column 1: Pinned knowledge ──────────────────────── */}
          <section className="lg:col-span-2 space-y-4">
            <Card
              title="Pinned context"
              subtitle="Always in the agent's working memory"
              icon={<Pin className="h-3.5 w-3.5" />}
              accent={client.brandColor}
              action={
                <button
                  onClick={onJumpToContexts}
                  className="flex items-center gap-1 text-[11px] font-semibold text-zinc-400 transition-colors hover:text-zinc-100"
                >
                  Manage
                  <ArrowRight className="h-3 w-3" />
                </button>
              }
            >
              {pinned.length === 0 ? (
                <EmptyHint
                  message="No pinned context yet."
                  cta="Pin your most-referenced facts so the agent always sees them."
                />
              ) : (
                <ul className="space-y-2">
                  {pinned.map((ctx) => (
                    <ContextRow key={ctx.id} ctx={ctx} />
                  ))}
                </ul>
              )}
            </Card>

            <Card
              title="Recently updated"
              subtitle="Latest additions to the knowledge base"
              icon={<BookOpen className="h-3.5 w-3.5" />}
              action={
                contexts.length > pinned.length + recent.length && (
                  <button
                    onClick={onJumpToContexts}
                    className="flex items-center gap-1 text-[11px] font-semibold text-zinc-400 transition-colors hover:text-zinc-100"
                  >
                    See all {contexts.length}
                    <ArrowRight className="h-3 w-3" />
                  </button>
                )
              }
            >
              {recent.length === 0 ? (
                <EmptyHint
                  message="No context yet."
                  cta="Add financial summaries, decisions, and communication history to give the agent what it needs."
                />
              ) : (
                <ul className="space-y-2">
                  {recent.map((ctx) => (
                    <ContextRow key={ctx.id} ctx={ctx} />
                  ))}
                </ul>
              )}
            </Card>
          </section>

          {/* ─── Column 2: Preferences + CTA ──────────────────────── */}
          <aside className="space-y-4">
            <Card
              title="Working with this client"
              icon={<Palette className="h-3.5 w-3.5" />}
            >
              <dl className="space-y-3 text-[12.5px]">
                <Row
                  label="Tone"
                  value={capitalize(client.reportTone)}
                />
                <Row
                  label="Formats"
                  value={
                    <div className="flex flex-wrap gap-1 justify-end">
                      {client.preferredFormats.map((f) => (
                        <span
                          key={f}
                          className="rounded-md bg-zinc-900 px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-zinc-400"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  }
                  icon={<FileText className="h-3 w-3 text-zinc-600" />}
                />
                {client.contactEmail && (
                  <Row
                    label="Contact"
                    value={client.contactEmail}
                    icon={<Mail className="h-3 w-3 text-zinc-600" />}
                  />
                )}
                <Row
                  label="Last update"
                  value={formatDistance(client.updatedAt)}
                />
              </dl>
            </Card>

            <button
              onClick={onJumpToChat}
              className="group relative flex w-full items-center gap-3 overflow-hidden rounded-xl border border-zinc-900 bg-gradient-to-br from-[#0d0d0d] to-[#080808] p-4 text-left transition-all hover:border-zinc-800"
            >
              <div
                className="absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-30"
                style={{ background: client.brandColor }}
              />
              <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-zinc-300">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div className="relative min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-zinc-100">
                  Start a conversation
                </div>
                <div className="mt-0.5 text-[11.5px] text-zinc-500">
                  Agent has full {client.name} context loaded
                </div>
              </div>
              <Sparkles className="relative h-4 w-4 shrink-0 text-zinc-700 transition-colors group-hover:text-zinc-300" />
            </button>

            <button
              onClick={() => setArtifactOpen(true)}
              className="group flex w-full items-center gap-3 rounded-xl border border-zinc-900 bg-[#0a0a0a] p-4 text-left transition-all hover:border-zinc-800"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <FilePlus className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-zinc-100">
                  Draft a deliverable
                </div>
                <div className="mt-0.5 text-[11.5px] text-zinc-500">
                  .docx or .xlsx, grounded in this client's knowledge
                </div>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-zinc-700 transition-colors group-hover:text-zinc-300" />
            </button>
          </aside>
        </div>

        <ArtifactDialog
          open={artifactOpen}
          onClose={() => setArtifactOpen(false)}
          clientId={client.id}
        />

        {/* ─── Tip / next action row ───────────────────────────── */}
        {contexts.length < 3 && (
          <aside className="mt-6 flex items-center gap-3 rounded-xl border border-amber-500/10 bg-amber-500/5 px-4 py-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 text-[12.5px] text-amber-200/90">
              <strong className="font-semibold">
                Give the agent more to work with.
              </strong>{" "}
              Every context entry sharpens its next draft. Aim for 5–10 pinned
              items per client before the agent feels worth its keep.
            </div>
            <Link
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onJumpToContexts();
              }}
              className="shrink-0 rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[11px] font-semibold text-amber-200 transition-colors hover:bg-amber-500/20"
            >
              Add context
            </Link>
          </aside>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────

function Card({
  title,
  subtitle,
  icon,
  accent,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  accent?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      className="relative overflow-hidden rounded-xl border border-zinc-900 bg-[#0a0a0a] p-5"
      style={accent ? { borderTopColor: accent, borderTopWidth: "1px" } : undefined}
    >
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-zinc-500">{icon}</span>
          <h3 className="text-[11.5px] font-bold uppercase tracking-widest text-zinc-400">
            {title}
          </h3>
          {subtitle && (
            <span className="text-[11px] text-zinc-600">· {subtitle}</span>
          )}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function ContextRow({ ctx }: { ctx: ContextItem }) {
  const cat = (ctx.category as ContextCategory) in CATEGORY_COLORS
    ? (ctx.category as ContextCategory)
    : ("note" as ContextCategory);
  const color = CATEGORY_COLORS[cat];
  const label = CATEGORY_LABELS[cat];
  return (
    <li className="group relative flex gap-3 rounded-lg border border-zinc-900/60 bg-[#070707] p-3 transition-colors hover:bg-[#0a0a0a]">
      <span
        className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: color, boxShadow: `0 0 8px ${color}66` }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[13px] font-semibold text-zinc-200">
            {ctx.title}
          </span>
          <span
            className="rounded-md px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider"
            style={{ color, background: `${color}15` }}
          >
            {label}
          </span>
          {ctx.isPinned && (
            <Pin className="h-2.5 w-2.5 text-zinc-600" />
          )}
        </div>
        <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-zinc-500">
          {ctx.content}
        </p>
      </div>
      <span className="shrink-0 text-[10.5px] text-zinc-700">
        {formatDistance(ctx.updatedAt)}
      </span>
    </li>
  );
}

function Row({
  label,
  value,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="flex items-center gap-1.5 text-[11.5px] font-medium text-zinc-500">
        {icon}
        {label}
      </dt>
      <dd className="text-right text-[12.5px] text-zinc-200">{value}</dd>
    </div>
  );
}

function EmptyHint({ message, cta }: { message: string; cta: string }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-800 bg-[#070707] px-4 py-5 text-center">
      <p className="text-[12.5px] font-semibold text-zinc-300">{message}</p>
      <p className="mx-auto mt-1 max-w-xs text-[11.5px] text-zinc-500">{cta}</p>
    </div>
  );
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1);
}
