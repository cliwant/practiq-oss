"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  ArrowRight,
  CheckSquare,
  Plus,
  Settings,
  LogOut,
  Home,
  BookOpen,
  MessageSquare,
  FileText,
  Loader2,
  Sparkles,
  UserPlus,
  CreditCard,
} from "lucide-react";
import { ClientAvatar } from "./client-avatar";
import type { WorkspaceClient } from "./workspace-shell";
import { filterActions } from "./command-palette-filter";

interface Action {
  id: string;
  label: string;
  subtitle?: string;
  kind: "client" | "action" | "context" | "conversation" | "approval";
  color?: string;
  icon?: React.ReactNode;
  run: () => void;
  keywords?: string[];
}

interface SearchResults {
  clients: Array<{
    id: string;
    name: string;
    industry: string;
    brandColor: string;
  }>;
  contexts: Array<{
    id: string;
    title: string;
    snippet: string;
    category: string;
    clientId: string;
    clientName: string;
    clientBrandColor: string;
  }>;
  conversations: Array<{
    id: string;
    title: string;
    clientId: string;
    clientName: string;
    clientBrandColor: string;
  }>;
  approvals: Array<{
    id: string;
    title: string;
    type: string;
    status: string;
    clientId: string;
    clientName: string;
    clientBrandColor: string;
  }>;
}

/**
 * Raycast-style command palette. Two sections:
 *   1. Clients — fuzzy match on name + industry
 *   2. Actions — navigate, sign out, new client
 *
 * Arrow keys move selection, Enter runs it, Esc closes. The backdrop click
 * also closes. If the user starts typing while it's closed we surface via
 * the shell's ⌘K handler, not here.
 */
export function CommandPalette({
  open,
  onClose,
  clients,
  onSignOut,
}: {
  open: boolean;
  onClose: () => void;
  clients: WorkspaceClient[];
  onSignOut: () => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [searchResults, setSearchResults] = useState<SearchResults | null>(
    null,
  );
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      setSearchResults(null);
      // Focus on next frame — motion's opening animation and autofocus
      // compete otherwise.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Debounced global search — fires only when the user has typed ≥2 chars
  // and stabilized for 180ms. The initial list of client-only matches
  // shows immediately without waiting, so the palette never feels slow.
  const trimmed = query.trim();
  const runSearch = useCallback(
    async (q: string) => {
      setSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
          method: "GET",
        });
        if (!res.ok) return;
        const data = (await res.json()) as SearchResults;
        // If user has since typed more, this response is stale — drop it.
        if (q === trimmed) setSearchResults(data);
      } catch {
        // Swallow — the cached client list still lets the palette work.
      } finally {
        if (q === trimmed) setSearching(false);
      }
    },
    [trimmed],
  );

  useEffect(() => {
    if (!open) return;
    if (trimmed.length < 2) {
      setSearchResults(null);
      setSearching(false);
      return;
    }
    const t = window.setTimeout(() => runSearch(trimmed), 180);
    return () => window.clearTimeout(t);
  }, [trimmed, open, runSearch]);

  const actions: Action[] = useMemo(() => {
    const go = (href: string) => {
      router.push(href);
      onClose();
    };
    const staticActions: Action[] = [
      {
        id: "home",
        label: "Go home",
        subtitle: "All clients overview",
        kind: "action",
        icon: <Home className="h-3.5 w-3.5" />,
        run: () => go("/app"),
        keywords: ["dashboard", "overview"],
      },
      {
        id: "tasks",
        label: "Open approval queue",
        subtitle: "Review AI-generated drafts",
        kind: "action",
        icon: <CheckSquare className="h-3.5 w-3.5" />,
        run: () => go("/app/tasks"),
        keywords: ["approvals", "review"],
      },
      {
        id: "new-client",
        label: "Create new client",
        subtitle: "Add a client to your workspace",
        kind: "action",
        icon: <Plus className="h-3.5 w-3.5" />,
        run: () => go("/app/clients/new"),
        keywords: ["add", "onboarding"],
      },
      {
        id: "run-briefings",
        label: "Run briefings now",
        subtitle: "Fan out across every client",
        kind: "action",
        icon: <Sparkles className="h-3.5 w-3.5" />,
        run: async () => {
          onClose();
          try {
            await fetch("/api/agents/run", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ agent: "daily_briefing", scope: "all" }),
            });
          } catch {
            /* best effort — the Home CTA covers the retry path */
          }
          router.push("/app/tasks");
        },
        keywords: ["brief", "agent", "run", "generate"],
      },
      {
        id: "invite-teammate",
        label: "Invite a teammate",
        subtitle: "Share your firm's workspace",
        kind: "action",
        icon: <UserPlus className="h-3.5 w-3.5" />,
        run: () => go("/app/settings?tab=team"),
        keywords: ["team", "member", "collaborator"],
      },
      {
        id: "billing",
        label: "View billing",
        subtitle: "Plan, usage, payment methods",
        kind: "action",
        icon: <CreditCard className="h-3.5 w-3.5" />,
        run: () => go("/app/settings?tab=billing"),
        keywords: ["plan", "subscription", "pay", "invoice", "stripe"],
      },
      {
        id: "settings",
        label: "Open settings",
        kind: "action",
        icon: <Settings className="h-3.5 w-3.5" />,
        run: () => go("/app/settings"),
      },
      {
        id: "signout",
        label: "Sign out",
        kind: "action",
        icon: <LogOut className="h-3.5 w-3.5" />,
        run: () => {
          onSignOut();
          onClose();
        },
        keywords: ["logout", "exit"],
      },
    ];

    const clientActions: Action[] = clients.map((c) => ({
      id: `client:${c.id}`,
      label: c.name,
      subtitle: c.industry,
      kind: "client",
      color: c.color,
      run: () => go(`/app/clients/${c.id}`),
    }));

    const ctxActions: Action[] = (searchResults?.contexts ?? []).map((c) => ({
      id: `ctx:${c.id}`,
      label: c.title,
      subtitle: `${c.clientName} · ${c.snippet}`,
      kind: "context",
      color: c.clientBrandColor,
      icon: <BookOpen className="h-3.5 w-3.5" />,
      // Context has no dedicated URL yet — route to the client's knowledge
      // tab; the operator lands on the list with the right client selected.
      run: () => go(`/app/clients/${c.clientId}#ctx-${c.id}`),
    }));

    const convActions: Action[] = (searchResults?.conversations ?? []).map(
      (c) => ({
        id: `conv:${c.id}`,
        label: c.title,
        subtitle: `Conversation in ${c.clientName}`,
        kind: "conversation",
        color: c.clientBrandColor,
        icon: <MessageSquare className="h-3.5 w-3.5" />,
        run: () => go(`/app/clients/${c.clientId}?conv=${c.id}`),
      }),
    );

    const approvalActions: Action[] = (searchResults?.approvals ?? []).map(
      (a) => ({
        id: `ap:${a.id}`,
        label: a.title,
        subtitle: `${a.clientName} · ${a.type} · ${a.status.replace("_", " ")}`,
        kind: "approval",
        color: a.clientBrandColor,
        icon: <FileText className="h-3.5 w-3.5" />,
        run: () => go(`/app/tasks`),
      }),
    );

    return [
      ...clientActions,
      ...ctxActions,
      ...convActions,
      ...approvalActions,
      ...staticActions,
    ];
  }, [clients, router, onClose, searchResults]);

  // Use the pure, unit-tested filter — label-prefix > label-substring >
  // subtitle > keywords, preserving input order on ties.
  const filtered = useMemo(
    () => filterActions(actions, query),
    [actions, query],
  );

  useEffect(() => {
    if (selected >= filtered.length) setSelected(Math.max(0, filtered.length - 1));
  }, [filtered, selected]);

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.min(filtered.length - 1, s + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(0, s - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      filtered[selected]?.run();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-[12vh] backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-xl overflow-hidden rounded-2xl border border-zinc-800 bg-[#0d0d0d] shadow-2xl shadow-black/80"
            initial={{ y: -8, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -8, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-zinc-900 px-4 py-3">
              {searching ? (
                <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
              ) : (
                <Search className="h-4 w-4 text-zinc-500" />
              )}
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKey}
                placeholder="Jump, search knowledge, find an action..."
                className="flex-1 bg-transparent text-[14px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
              />
              <kbd className="rounded border border-zinc-800 bg-zinc-900/60 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-500">
                esc
              </kbd>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <div className="px-4 py-8 text-center text-[13px] text-zinc-600">
                  No matches
                </div>
              ) : (
                <ul>
                  {filtered.map((a, i) => (
                    <li key={a.id}>
                      <button
                        onClick={() => a.run()}
                        onMouseEnter={() => setSelected(i)}
                        className={`group flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors ${
                          selected === i
                            ? "bg-zinc-800/70"
                            : "hover:bg-zinc-900/60"
                        }`}
                      >
                        {a.kind === "client" ? (
                          <ClientAvatar
                            name={a.label}
                            color={a.color ?? "#555"}
                            size={24}
                          />
                        ) : (
                          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-900 text-zinc-400">
                            {a.icon}
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] text-zinc-100">
                            {a.label}
                          </div>
                          {a.subtitle && (
                            <div className="truncate text-[11px] text-zinc-600">
                              {a.subtitle}
                            </div>
                          )}
                        </div>
                        <ArrowRight
                          className={`h-3.5 w-3.5 transition-opacity ${
                            selected === i
                              ? "text-zinc-500 opacity-100"
                              : "opacity-0"
                          }`}
                        />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-zinc-900 px-4 py-2 text-[10.5px] text-zinc-600">
              <div className="flex items-center gap-3">
                <span>
                  <kbd className="mr-1 rounded border border-zinc-800 bg-zinc-900/60 px-1 py-0.5">
                    ↑↓
                  </kbd>
                  navigate
                </span>
                <span>
                  <kbd className="mr-1 rounded border border-zinc-800 bg-zinc-900/60 px-1 py-0.5">
                    ↵
                  </kbd>
                  select
                </span>
              </div>
              <span>{filtered.length} results</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
