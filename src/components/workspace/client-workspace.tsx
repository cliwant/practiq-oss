"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Pin,
  MessageSquare,
  BookOpen,
  LayoutGrid,
  Sparkles,
  Activity,
} from "lucide-react";
import { ClientAvatar } from "./client-avatar";
import { ClientOverview } from "./client-overview";
import { ClientContextsTab } from "./client-contexts-tab";
import { ClientChatTab } from "./client-chat-tab";
import { ClientActivityTab } from "./client-activity-tab";
import type {
  ActivityEvent,
  ClientDossier,
  ClientPriorityItem,
  ContextItem,
  ConversationDossier,
} from "./types";

type Tab = "overview" | "contexts" | "chat" | "activity";

/**
 * Tabbed client workspace. The tabs swap content inside the same scroll
 * region so the hero never reflows. Motion only animates opacity — sliding
 * caused janky layout when Chat grew during a streaming response.
 */
export function ClientWorkspace({
  client,
  contexts: initialContexts,
  priorities = [],
  activity = [],
  initialConversation,
}: {
  client: ClientDossier;
  contexts: ContextItem[];
  /** Top pending approval items, surfaced on the Overview tab. */
  priorities?: ClientPriorityItem[];
  /** Interleaved agent runs + operator decisions, newest-first. */
  activity?: ActivityEvent[];
  initialConversation: ConversationDossier | null;
}) {
  // Default to Overview ("Command Center over Chat" — UX-DEEP-DESIGN §2).
  // The Overview shows AI priorities + activity timeline + pinned context;
  // chat is a deep-dive surface, not a hub. Users with active conversations
  // can click into Chat from the tab bar.
  const [tab, setTab] = useState<Tab>("overview");
  const [contexts, setContexts] = useState(initialContexts);

  const pinnedCount = useMemo(
    () => contexts.filter((c) => c.isPinned).length,
    [contexts],
  );

  return (
    <div className="flex h-full flex-col">
      {/* ─── Hero (client header) ─────────────────────────────────── */}
      {/*
        Wave 15 mobile fix: px-10 = 40px each side, which left only
        310px for the avatar + name + industry badge on a 390px
        viewport. The client name truncated ("Acme Cof…") next to a
        full-width badge. We drop mobile padding to px-5 and let the
        name + badge wrap onto two lines so the full name stays
        readable. Desktop ≥sm keeps px-10 pt-8.
      */}
      <header className="border-b border-zinc-900 bg-gradient-to-b from-[#0b0b0b] to-[#050505] px-5 pt-5 pb-0 sm:px-10 sm:pt-8">
        <div className="mx-auto flex max-w-5xl items-center gap-4 sm:gap-5">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[16px] font-extrabold text-white shadow-lg sm:h-14 sm:w-14 sm:text-[18px]"
            style={{
              background: `linear-gradient(135deg, ${client.brandColor}, ${darken(client.brandColor, 0.3)})`,
              boxShadow: `0 8px 24px -8px ${client.brandColor}66`,
            }}
          >
            <ClientAvatar name={client.name} color="transparent" size={0} />
            <span>{initials(client.name)}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="min-w-0 break-words text-[20px] font-extrabold tracking-tight text-zinc-100 sm:truncate sm:text-[22px]">
                {client.name}
              </h1>
              <span
                className="shrink-0 rounded-md px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider"
                style={{
                  color: client.brandColor,
                  background: `${client.brandColor}20`,
                  border: `1px solid ${client.brandColor}33`,
                }}
              >
                {client.industry}
              </span>
            </div>
            <p className="mt-1 text-[12px] text-zinc-400">
              Fractional {client.userRole} · {client.relationshipMonths} month
              {client.relationshipMonths === 1 ? "" : "s"} ·{" "}
              <span className="inline-flex items-center gap-1">
                <Pin className="h-3 w-3 text-zinc-500" aria-hidden />
                {pinnedCount} pinned · {contexts.length} total contexts
              </span>
            </p>
          </div>
        </div>

        {/* ─── Tabs ─────────────────────────────────────────────────── */}
        {/*
          Wave 15 mobile fix: the tabs row used to be a single flex row
          with the "AI primed with client context" hint anchored ml-auto
          on the right. At 390px the hint pushed the Activity tab off
          the viewport — the user could see Overview / Knowledge / Chat
          but had no visible way to reach Activity. We now hide the
          decorative hint below md, leaving all four tabs in the row.
        */}
        <nav className="mx-auto mt-6 flex max-w-5xl items-center gap-1 overflow-x-auto border-b border-transparent">
          <TabButton
            active={tab === "overview"}
            onClick={() => setTab("overview")}
            icon={<LayoutGrid className="h-3.5 w-3.5" />}
            label="Overview"
          />
          <TabButton
            active={tab === "contexts"}
            onClick={() => setTab("contexts")}
            icon={<BookOpen className="h-3.5 w-3.5" />}
            label="Knowledge"
            count={contexts.length}
          />
          <TabButton
            active={tab === "chat"}
            onClick={() => setTab("chat")}
            icon={<MessageSquare className="h-3.5 w-3.5" />}
            label="Chat"
          />
          <TabButton
            active={tab === "activity"}
            onClick={() => setTab("activity")}
            icon={<Activity className="h-3.5 w-3.5" />}
            label="Activity"
          />
          <div className="ml-auto hidden items-center gap-1 pr-1 text-[11px] text-zinc-500 md:flex">
            <Sparkles className="h-3 w-3" />
            <span>AI primed with client context</span>
          </div>
        </nav>
      </header>

      {/* ─── Tab content ──────────────────────────────────────────── */}
      <div className="min-h-0 flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="h-full"
          >
            {tab === "overview" && (
              <ClientOverview
                client={client}
                contexts={contexts}
                priorities={priorities}
                activity={activity}
                onJumpToChat={() => setTab("chat")}
                onJumpToContexts={() => setTab("contexts")}
                onJumpToActivity={() => setTab("activity")}
              />
            )}
            {tab === "contexts" && (
              <ClientContextsTab
                clientId={client.id}
                contexts={contexts}
                onChange={setContexts}
              />
            )}
            {tab === "chat" && (
              <ClientChatTab
                client={client}
                initialConversation={initialConversation}
              />
            )}
            {tab === "activity" && (
              <ClientActivityTab clientId={client.id} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2 px-3 py-3 text-[13px] font-medium transition-colors ${
        active ? "text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
      }`}
    >
      {icon}
      {label}
      {typeof count === "number" && (
        <span
          className={`ml-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
            active ? "bg-zinc-800 text-zinc-200" : "bg-zinc-900 text-zinc-600"
          }`}
        >
          {count}
        </span>
      )}
      {active && (
        <motion.span
          layoutId="tab-underline"
          className="absolute inset-x-0 -bottom-px h-[2px] bg-zinc-200"
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        />
      )}
    </button>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("") || "?";
}

function darken(color: string, amount: number): string {
  const m = color.match(/^#([0-9a-f]{6})$/i);
  if (m) {
    const n = parseInt(m[1], 16);
    const r = Math.max(0, ((n >> 16) & 0xff) - Math.round(255 * amount));
    const g = Math.max(0, ((n >> 8) & 0xff) - Math.round(255 * amount));
    const b = Math.max(0, (n & 0xff) - Math.round(255 * amount));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
  }
  return color;
}
