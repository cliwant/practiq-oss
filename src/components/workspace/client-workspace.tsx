"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Pin,
  MessageSquare,
  BookOpen,
  LayoutGrid,
  Sparkles,
} from "lucide-react";
import { ClientAvatar } from "./client-avatar";
import { ClientOverview } from "./client-overview";
import { ClientContextsTab } from "./client-contexts-tab";
import { ClientChatTab } from "./client-chat-tab";
import type { ClientDossier, ContextItem, ConversationDossier } from "./types";

type Tab = "overview" | "contexts" | "chat";

/**
 * Tabbed client workspace. The tabs swap content inside the same scroll
 * region so the hero never reflows. Motion only animates opacity — sliding
 * caused janky layout when Chat grew during a streaming response.
 */
export function ClientWorkspace({
  client,
  contexts: initialContexts,
  initialConversation,
}: {
  client: ClientDossier;
  contexts: ContextItem[];
  initialConversation: ConversationDossier | null;
}) {
  const [tab, setTab] = useState<Tab>(
    initialConversation && initialConversation.messages.length > 0
      ? "chat"
      : "overview",
  );
  const [contexts, setContexts] = useState(initialContexts);

  const pinnedCount = useMemo(
    () => contexts.filter((c) => c.isPinned).length,
    [contexts],
  );

  return (
    <div className="flex h-full flex-col">
      {/* ─── Hero (client header) ─────────────────────────────────── */}
      <header className="border-b border-zinc-900 bg-gradient-to-b from-[#0b0b0b] to-[#050505] px-10 pt-8 pb-0">
        <div className="mx-auto flex max-w-5xl items-center gap-5">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl text-[18px] font-extrabold text-white shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${client.brandColor}, ${darken(client.brandColor, 0.3)})`,
              boxShadow: `0 8px 24px -8px ${client.brandColor}66`,
            }}
          >
            <ClientAvatar name={client.name} color="transparent" size={0} />
            <span>{initials(client.name)}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-[22px] font-extrabold tracking-tight text-zinc-100">
                {client.name}
              </h1>
              <span
                className="rounded-md px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider"
                style={{
                  color: client.brandColor,
                  background: `${client.brandColor}20`,
                  border: `1px solid ${client.brandColor}33`,
                }}
              >
                {client.industry}
              </span>
            </div>
            <p className="mt-1 text-[12px] text-zinc-500">
              Fractional {client.userRole} · {client.relationshipMonths} month
              {client.relationshipMonths === 1 ? "" : "s"} ·{" "}
              <span className="inline-flex items-center gap-1">
                <Pin className="h-3 w-3 text-zinc-600" />
                {pinnedCount} pinned · {contexts.length} total contexts
              </span>
            </p>
          </div>
        </div>

        {/* ─── Tabs ─────────────────────────────────────────────────── */}
        <nav className="mx-auto mt-6 flex max-w-5xl items-center gap-1 border-b border-transparent">
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
          <div className="ml-auto flex items-center gap-1 pr-1 text-[11px] text-zinc-600">
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
                onJumpToChat={() => setTab("chat")}
                onJumpToContexts={() => setTab("contexts")}
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
