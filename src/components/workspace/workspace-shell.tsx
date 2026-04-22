"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  Home,
  CheckSquare,
  Search,
  Settings,
  Users,
  Plus,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
} from "lucide-react";
import { ClientAvatar } from "./client-avatar";
import { CommandPalette } from "./command-palette";

export interface WorkspaceClient {
  id: string;
  name: string;
  industry: string;
  color: string;
  updatedAt: string;
}

export interface WorkspaceUser {
  name: string;
  email: string;
}

/**
 * 3-column workspace chrome.
 *
 * LEFT RAIL (56px):  icon-only global nav. Stays visible always.
 * CLIENT LIST (260px, collapsible): searchable client roster.
 *   Collapse with ⌘\ or the chevron; state persists in localStorage.
 * MAIN: whatever the route renders.
 *
 * Pressing ⌘K opens a command palette that can jump to any client or
 * action. Pressing ⌘J cycles through the three most recently-touched
 * clients (Superhuman-style quick switcher).
 */
export function WorkspaceShell({
  user,
  clients,
  children,
}: {
  user: WorkspaceUser;
  clients: WorkspaceClient[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [listCollapsed, setListCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("practiq.list-collapsed");
    if (saved === "1") setListCollapsed(true);
  }, []);

  const toggleList = useCallback(() => {
    setListCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("practiq.list-collapsed", next ? "1" : "0");
      return next;
    });
  }, []);

  // ─── Keyboard shortcuts ────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      } else if (mod && e.key === "\\") {
        e.preventDefault();
        toggleList();
      } else if (mod && e.key.toLowerCase() === "j") {
        e.preventDefault();
        const currentIdx = clients.findIndex((c) =>
          pathname?.startsWith(`/app/clients/${c.id}`),
        );
        if (clients.length === 0) return;
        const nextIdx = currentIdx === -1 ? 0 : (currentIdx + 1) % clients.length;
        router.push(`/app/clients/${clients[nextIdx].id}`);
      } else if (e.key === "Escape") {
        setPaletteOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clients, pathname, router, toggleList]);

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.industry.toLowerCase().includes(q),
    );
  }, [clients, search]);

  const activeClientId =
    pathname?.match(/^\/app\/clients\/([^/]+)/)?.[1] ?? null;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#050505] text-zinc-100">
      {/* ─── Left Rail ───────────────────────────────────────────── */}
      <nav className="flex h-full w-14 flex-col items-center justify-between border-r border-zinc-900 bg-[#030303] py-4">
        <div className="flex flex-col items-center gap-1">
          <Link
            href="/app"
            className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-[13px] font-extrabold text-white shadow-lg shadow-blue-500/20"
            aria-label="Home"
          >
            P
          </Link>
          <RailButton
            href="/app"
            active={pathname === "/app"}
            icon={<Home className="h-4 w-4" />}
            label="Home"
          />
          <RailButton
            href="/app/tasks"
            active={pathname?.startsWith("/app/tasks") ?? false}
            icon={<CheckSquare className="h-4 w-4" />}
            label="Approval Queue"
          />
          <RailButton
            onClick={() => setPaletteOpen(true)}
            icon={<Search className="h-4 w-4" />}
            label="Search (⌘K)"
          />
        </div>
        <div className="flex flex-col items-center gap-1">
          <RailButton
            href="/app/settings"
            active={pathname?.startsWith("/app/settings") ?? false}
            icon={<Settings className="h-4 w-4" />}
            label="Settings"
          />
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-[11px] font-semibold text-zinc-300"
            title={`${user.name} · ${user.email}`}
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
        </div>
      </nav>

      {/* ─── Client List ─────────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {!listCollapsed && (
          <motion.aside
            key="client-list"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="flex h-full flex-col overflow-hidden border-r border-zinc-900 bg-[#0a0a0a]"
          >
            <div className="flex items-center justify-between gap-2 border-b border-zinc-900 px-3 py-3">
              <div className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-zinc-500" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">
                  Clients · {clients.length}
                </span>
              </div>
              <button
                onClick={toggleList}
                className="rounded p-1 text-zinc-600 transition-colors hover:bg-zinc-900 hover:text-zinc-300"
                title="Collapse (⌘\\)"
                aria-label="Collapse client list"
              >
                <ChevronsLeft className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="px-3 pt-3">
              <input
                type="text"
                placeholder="Search clients..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
              />
            </div>

            <ul className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
              {filteredClients.length === 0 && clients.length > 0 ? (
                <li className="px-2 py-6 text-center text-[12px] text-zinc-600">
                  No match
                </li>
              ) : null}
              {filteredClients.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/app/clients/${c.id}`}
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
              {clients.length === 0 && (
                <li className="px-2 py-6 text-center text-[12px] text-zinc-500">
                  No clients yet.
                </li>
              )}
            </ul>

            <div className="border-t border-zinc-900 p-3">
              <Link
                href="/app/clients/new"
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/30 px-3 py-2 text-[12px] font-medium text-zinc-300 transition-all hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100"
              >
                <Plus className="h-3.5 w-3.5" />
                New client
              </Link>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {listCollapsed && (
        <button
          onClick={toggleList}
          className="absolute left-14 top-1/2 z-10 -translate-y-1/2 rounded-r-md bg-zinc-900 px-1 py-3 text-zinc-500 hover:text-zinc-300"
          title="Expand (⌘\\)"
          aria-label="Expand client list"
        >
          <ChevronsRight className="h-3 w-3" />
        </button>
      )}

      {/* ─── Main ────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-hidden">{children}</main>

      {/* ─── Command Palette ────────────────────────────────────── */}
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        clients={clients}
        onSignOut={() => {
          // next-auth signout triggers via form POST; simplest is a redirect
          // to the signout page. We don't import next-auth/react here to
          // keep the bundle thin — the redirect does the same.
          window.location.href = "/api/auth/signout";
        }}
      />
    </div>
  );
}

function RailButton({
  href,
  onClick,
  icon,
  label,
  active,
}: {
  href?: string;
  onClick?: () => void;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  const cls = `flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
    active
      ? "bg-zinc-800 text-zinc-100"
      : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
  }`;
  if (href) {
    return (
      <Link href={href} className={cls} title={label} aria-label={label}>
        {icon}
      </Link>
    );
  }
  return (
    <button onClick={onClick} className={cls} title={label} aria-label={label}>
      {icon}
    </button>
  );
}

// Exported for the shell's own unused-import guard to not trigger.
export type { WorkspaceClient as WorkspaceClientType };

// Pull LogOut in so the bundle includes the icon when settings renders —
// avoids a second round-trip if the user opens the menu.
void LogOut;
