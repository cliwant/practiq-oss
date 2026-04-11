"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search, ChevronDown, ChevronRight, Star,
  AlertTriangle, Clock, CheckCircle2,
} from "lucide-react";
import {
  type GroupBy, type IntegrationStatus,
} from "@/data/mock-data";
import {
  getActiveClients,
  getActiveClient,
  getActiveClientGroups,
} from "@/data/firms";
import { ClientAvatar } from "@/components/dashboard/client-avatar";
import { getActiveFirmData } from "@/lib/firm-context";
import { getSessionClients } from "@/lib/session-clients";
import { Plus } from "lucide-react";

const syncDot: Record<IntegrationStatus, string> = {
  synced: "bg-emerald-500",
  stale: "bg-amber-500",
  error: "bg-red-500",
  none: "bg-zinc-600",
};

const groupIcons: Record<string, React.ReactNode> = {
  critical: <AlertTriangle className="w-3 h-3 text-zinc-500" />,
  review: <Clock className="w-3 h-3 text-zinc-500" />,
  progress: <Clock className="w-3 h-3 text-zinc-500" />,
  ok: <CheckCircle2 className="w-3 h-3 text-zinc-500" />,
};

export function ContextNav({
  isOpen,
  activeFirmId,
  activeClientId,
  onSelectClient,
  onNewClient,
  sessionClientsVersion,
  width = 280,
}: {
  isOpen: boolean;
  /** Used as a dependency key so the list rebuilds when firms switch. */
  activeFirmId: string;
  /** The currently active client id, or null when the user is on a firm-
   *  scoped view (Home, Approvals) where no single client is highlighted. */
  activeClientId: string | null;
  onSelectClient: (id: string) => void;
  /** Opens the new-client modal */
  onNewClient?: () => void;
  /** Bumped by layout whenever the session-client store changes so this
   *  component re-renders the combined list. */
  sessionClientsVersion?: number;
  width?: number;
}) {
  const [query, setQuery] = useState("");
  const [groupBy, setGroupBy] = useState<GroupBy>("priority");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());

  const firmData = getActiveFirmData();
  // Merge firm's static clients with session-added clients
  const sessionClients = useMemo(
    () => getSessionClients(activeFirmId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeFirmId, sessionClientsVersion]
  );
  const clients = useMemo(
    () => [...sessionClients, ...getActiveClients()],
    [sessionClients, activeFirmId]
  );

  // Reset pinned state whenever the firm changes so the pinned set belongs
  // to the active firm's clients only.
  useEffect(() => {
    const heroClient = firmData.firm.heroClientId;
    setPinnedIds(new Set([heroClient].filter(Boolean)));
    setQuery("");
    // Collapse all groups by default except "Pinned"
    const allGroupIds = getActiveClientGroups(groupBy).map((g) => g.id);
    setCollapsedGroups(new Set(allGroupIds.filter((id) => id !== "pinned")));
  }, [activeFirmId, firmData.firm.heroClientId, groupBy]);

  const filtered = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.toLowerCase();
    return clients.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      c.industry.toLowerCase().includes(q) ||
      c.shortName.toLowerCase().includes(q)
    );
  }, [query, clients]);

  const groups = useMemo(() => getActiveClientGroups(groupBy), [groupBy, activeFirmId]);

  const toggleGroup = (id: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const togglePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const pinnedClients = clients.filter((c) => pinnedIds.has(c.id));

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="border-r border-zinc-800/80 bg-[#0a0a0a] flex flex-col z-20 shrink-0 overflow-hidden"
        >
          {/* Search */}
          <div className="px-3 pt-4 pb-3 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${firmData.config.labels.clientWordPlural.toLowerCase()}...`}
                className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
              />
            </div>
          </div>

          {/* Group-by toggle */}
          {!filtered && (
            <div className="px-3 pb-3 shrink-0">
              <div className="flex items-center gap-1 text-xs">
                {(["priority", "team", "industry"] as GroupBy[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setGroupBy(mode)}
                    className={`px-2 py-0.5 rounded transition-colors capitalize ${
                      groupBy === mode
                        ? "bg-zinc-800 text-zinc-200"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Client list */}
          <div className="flex-1 overflow-y-auto hide-scrollbar pb-4">
            {/* Search results */}
            {filtered && (
              <div className="px-2 space-y-0.5">
                {filtered.length === 0 && (
                  <div className="px-3 py-6 text-center text-sm text-zinc-500">No clients match</div>
                )}
                {filtered.map((c) => (
                  <ClientRow
                    key={c.id}
                    clientId={c.id}
                    isActive={c.id === activeClientId}
                    isPinned={pinnedIds.has(c.id)}
                    onSelect={() => onSelectClient(c.id)}
                    onTogglePin={(e) => togglePin(c.id, e)}
                  />
                ))}
              </div>
            )}

            {/* Pinned section */}
            {!filtered && pinnedClients.length > 0 && (
              <div className="mb-3">
                <div className="px-4 mb-1.5 flex items-center gap-1.5 text-xs text-zinc-500">
                  <Star className="w-3 h-3 fill-zinc-500" />
                  <span>Pinned</span>
                </div>
                <div className="px-2 space-y-0.5">
                  {pinnedClients.map((c) => (
                    <ClientRow
                      key={c.id}
                      clientId={c.id}
                      isActive={c.id === activeClientId}
                      isPinned={true}
                      onSelect={() => onSelectClient(c.id)}
                      onTogglePin={(e) => togglePin(c.id, e)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Session clients (newly created this session) — always top */}
            {!filtered && sessionClients.length > 0 && (
              <div className="mb-3">
                <div className="px-4 mb-1.5 flex items-center gap-1.5 text-xs text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>New this session</span>
                  <span className="text-zinc-700">{sessionClients.length}</span>
                </div>
                <div className="px-2 space-y-0.5">
                  {sessionClients.map((c) => (
                    <SessionClientRow
                      key={c.id}
                      client={c}
                      isActive={c.id === activeClientId}
                      onSelect={() => onSelectClient(c.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Grouped list */}
            {!filtered && groups.map((group) => {
              const isCollapsed = collapsedGroups.has(group.id);
              const groupClients = group.clientIds
                .map((id) => getActiveClient(id))
                .filter((c): c is NonNullable<typeof c> => !!c && !pinnedIds.has(c.id));
              if (groupClients.length === 0) return null;

              return (
                <div key={group.id} className="mb-3">
                  <button
                    onClick={() => toggleGroup(group.id)}
                    className="w-full px-4 mb-1.5 flex items-center justify-between text-xs text-zinc-500 hover:text-zinc-300 transition-colors group"
                  >
                    <div className="flex items-center gap-1.5">
                      {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      {groupBy === "priority" && groupIcons[group.id]}
                      <span className="capitalize">{group.label}</span>
                      <span className="text-zinc-700">{groupClients.length}</span>
                    </div>
                  </button>
                  {!isCollapsed && (
                    <div className="px-2 space-y-0.5">
                      {groupClients.map((c) => (
                        <ClientRow
                          key={c.id}
                          clientId={c.id}
                          isActive={c.id === activeClientId}
                          isPinned={false}
                          onSelect={() => onSelectClient(c.id)}
                          onTogglePin={(e) => togglePin(c.id, e)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer — New client button + count */}
          <div className="border-t border-zinc-800/60 shrink-0">
            {onNewClient && (
              <button
                onClick={onNewClient}
                className="w-full flex items-center gap-2 px-4 py-3 text-xs text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60 transition-colors"
                title={`New ${firmData.config.labels.clientWord.toLowerCase()}`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="font-medium">
                  New {firmData.config.labels.clientWord.toLowerCase()}
                </span>
              </button>
            )}
            <div className="px-4 py-2.5 text-xs text-zinc-600 border-t border-zinc-800/60">
              <span>
                {clients.length} of {firmData.firm.totalClientCount}{" "}
                {firmData.config.labels.clientWordPlural.toLowerCase()}
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── ClientRow — single client list item ── */
function ClientRow({
  clientId, isActive, isPinned, onSelect, onTogglePin,
}: {
  clientId: string;
  isActive: boolean;
  isPinned: boolean;
  onSelect: () => void;
  onTogglePin: (e: React.MouseEvent) => void;
}) {
  const firmData = getActiveFirmData();
  const client = getActiveClient(clientId);
  if (!client) return null;

  const alertCount = firmData.attentionItems.filter((a) => a.clientId === clientId).length;
  const pendingCount = firmData.approvalQueue.filter((a) => a.clientId === clientId && a.status === "pending").length;

  return (
    <button
      onClick={onSelect}
      className={`w-full group flex items-center gap-2.5 px-2 py-2 rounded-md transition-colors relative ${
        isActive
          ? "text-zinc-100 bg-zinc-800/80"
          : "text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200"
      }`}
    >
      {isActive && (
        <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-zinc-500" />
      )}

      <ClientAvatar client={client} size="sm" />

      {/* Name + sync */}
      <div className="flex-1 min-w-0 flex items-center gap-1.5">
        <span className="text-sm font-medium truncate">{client.name}</span>
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${syncDot[client.integrationStatus ?? client.qbSync]}`} />
      </div>

      {/* Right side: badges or pin */}
      <div className="flex items-center gap-2 shrink-0">
        {(alertCount > 0 || pendingCount > 0) && (
          <span className="text-xs text-zinc-500">
            {alertCount + pendingCount}
          </span>
        )}
        {/*
          Pin toggle — rendered as a span with role="button" so it can live
          inside the parent ClientRow <button> without triggering the
          "button-in-button" hydration error. stopPropagation prevents the
          pin toggle from also firing the row's onSelect.
        */}
        <span
          role="button"
          tabIndex={0}
          onClick={onTogglePin}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onTogglePin(e as unknown as React.MouseEvent);
            }
          }}
          className={`w-5 h-5 flex items-center justify-center rounded transition-opacity cursor-pointer ${
            isPinned ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
          aria-label={isPinned ? "Unpin client" : "Pin client"}
        >
          <Star
            className={`w-3 h-3 ${isPinned ? "fill-zinc-400 text-zinc-400" : "text-zinc-600"}`}
          />
        </span>
      </div>
    </button>
  );
}

/* ── SessionClientRow — session-added clients rendered with a subtle
   "new" emerald accent so the user can tell them apart from seeded data. */
function SessionClientRow({
  client,
  isActive,
  onSelect,
}: {
  client: import("@/data/mock-data").ClientWorkspace;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full group flex items-center gap-2.5 px-2 py-2 rounded-md transition-colors relative ${
        isActive
          ? "text-zinc-100 bg-zinc-800/80"
          : "text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200"
      }`}
    >
      {isActive && (
        <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-emerald-500" />
      )}
      <ClientAvatar client={client} size="sm" />
      <div className="flex-1 min-w-0 flex items-center gap-1.5">
        <span className="text-sm font-medium truncate">{client.name}</span>
        <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-emerald-500 animate-pulse" />
      </div>
    </button>
  );
}
