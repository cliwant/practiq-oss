"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
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
  Workflow as WorkflowIcon,
  Menu,
  X,
} from "lucide-react";
import { ClientAvatar } from "./client-avatar";
import { CommandPalette } from "./command-palette";
import { ToastProvider } from "./toast";

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
 * 3-column workspace chrome (desktop ≥1024px), collapsing to a single column
 * + slide-in drawer on tablet / mobile (<1024px).
 *
 * DESKTOP (≥lg):
 *   LEFT RAIL (56px):  icon-only global nav. Stays visible always.
 *   CLIENT LIST (260px, collapsible): searchable client roster.
 *     Collapse with ⌘\ or the chevron; state persists in localStorage.
 *   MAIN: whatever the route renders.
 *
 * MOBILE / TABLET (<lg):
 *   TOP BAR (56px):    hamburger + current view name + ⌘K search.
 *   MAIN:              full-width, normal page padding.
 *   DRAWER (overlay):  hamburger opens a left-slide drawer (max-w-[85%], up
 *     to 320px wide) containing BOTH the rail and client list. ESC, backdrop
 *     tap, or selecting a nav item closes it. Focus is trapped while open
 *     and returned to the hamburger on close.
 *
 * Pressing ⌘K opens a command palette that can jump to any client or
 * action. Pressing ⌘J cycles through the three most recently-touched
 * clients (Superhuman-style quick switcher).
 */
export function WorkspaceShell({
  user,
  clients,
  pendingCount = 0,
  children,
}: {
  user: WorkspaceUser;
  clients: WorkspaceClient[];
  pendingCount?: number;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [listCollapsed, setListCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Mobile drawer state. Defaults closed; we never want the drawer open on
  // first paint (would create a layout-shift flash on desktop until JS
  // settled). Independent of the desktop list-collapsed bit.
  const [drawerOpen, setDrawerOpen] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement | null>(null);
  const drawerRef = useRef<HTMLDivElement | null>(null);

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

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    // Return focus to the hamburger after the close animation finishes
    // so the user's keyboard position is preserved.
    requestAnimationFrame(() => hamburgerRef.current?.focus());
  }, []);

  // Auto-close the drawer whenever the route changes. The Link components
  // inside the drawer fire navigation but don't unmount us, so without
  // this the drawer would stay visible over the new page.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

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
        if (drawerOpen) closeDrawer();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clients, pathname, router, toggleList, drawerOpen, closeDrawer]);

  // ─── Body scroll lock + focus trap while drawer is open ─────────────────
  useEffect(() => {
    if (!drawerOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Move focus into the drawer on open. We pick the first focusable
    // element so screen readers + keyboard users land somewhere useful.
    const t = window.setTimeout(() => {
      const first = drawerRef.current?.querySelector<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      first?.focus();
    }, 50);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !drawerRef.current) return;
      const focusables = drawerRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(t);
    };
  }, [drawerOpen]);

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

  // Title shown in the mobile top bar so the user knows where they are
  // even with the rail collapsed off-screen.
  const mobileTitle = useMemo(() => {
    if (pathname?.startsWith("/app/tasks")) return "Approval Queue";
    if (pathname?.startsWith("/app/workflows")) return "Workflows";
    if (pathname?.startsWith("/app/settings")) return "Settings";
    if (pathname?.startsWith("/app/clients/new")) return "New client";
    if (activeClientId) {
      const c = clients.find((x) => x.id === activeClientId);
      return c?.name ?? "Client";
    }
    return "Home";
  }, [pathname, activeClientId, clients]);

  // The rail + client list, factored out so we can render the same content
  // in two different shells (the fixed desktop columns and the mobile
  // drawer overlay). When `inDrawer` is true the rail is rendered inline
  // before the client list with a horizontal layout cue + a close button.
  const renderRail = (inDrawer: boolean) => (
    <nav
      className={`flex flex-col items-center justify-between border-r border-zinc-900 bg-[#030303] py-4 ${
        inDrawer ? "w-14 h-full" : "h-full w-14"
      }`}
      aria-label={inDrawer ? undefined : "Global navigation"}
    >
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
          label={`Approval Queue${pendingCount > 0 ? ` (${pendingCount})` : ""}`}
          badge={pendingCount}
        />
        <RailButton
          href="/app/workflows"
          active={pathname?.startsWith("/app/workflows") ?? false}
          icon={<WorkflowIcon className="h-4 w-4" />}
          label="Workflows"
        />
        <RailButton
          onClick={() => {
            setPaletteOpen(true);
            if (inDrawer) closeDrawer();
          }}
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
  );

  const renderClientList = (inDrawer: boolean) => (
    <div
      className={`flex h-full flex-col overflow-hidden border-r border-zinc-900 bg-[#0a0a0a] ${
        inDrawer ? "flex-1" : "w-[260px]"
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-zinc-900 px-3 py-3">
        <div className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-zinc-500" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">
            Clients · {clients.length}
          </span>
        </div>
        {inDrawer ? (
          <button
            onClick={closeDrawer}
            className="rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-100"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={toggleList}
            className="rounded p-1 text-zinc-600 transition-colors hover:bg-zinc-900 hover:text-zinc-300"
            title="Collapse (⌘\\)"
            aria-label="Collapse client list"
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
          </button>
        )}
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
    </div>
  );

  return (
    <ToastProvider>
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#050505] text-zinc-100 lg:flex-row">
      {/* ─── Mobile Top Bar (visible <lg) ───────────────────────── */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-900 bg-[#030303] px-3 lg:hidden">
        <div className="flex items-center gap-2">
          <button
            ref={hamburgerRef}
            onClick={openDrawer}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-300 transition-colors hover:bg-zinc-900 hover:text-zinc-100"
            aria-label="Open navigation"
            aria-expanded={drawerOpen}
            aria-controls="mobile-nav-drawer"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link
            href="/app"
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-[11px] font-extrabold text-white shadow-lg shadow-blue-500/20"
            aria-label="Home"
          >
            P
          </Link>
          <span className="truncate text-[13px] font-semibold text-zinc-200">
            {mobileTitle}
          </span>
        </div>
        <button
          onClick={() => setPaletteOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-100"
          aria-label="Search (Cmd+K)"
        >
          <Search className="h-4.5 w-4.5" />
        </button>
      </header>

      {/* ─── Desktop Left Rail (visible ≥lg) ────────────────────── */}
      <div className="hidden lg:block">{renderRail(false)}</div>

      {/* ─── Desktop Client List (visible ≥lg, collapsible) ─────── */}
      <AnimatePresence initial={false}>
        {!listCollapsed && (
          <motion.aside
            key="client-list"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="hidden h-full overflow-hidden lg:flex"
          >
            {renderClientList(false)}
          </motion.aside>
        )}
      </AnimatePresence>

      {listCollapsed && (
        <button
          onClick={toggleList}
          className="absolute left-14 top-1/2 z-10 hidden -translate-y-1/2 rounded-r-md bg-zinc-900 px-1 py-3 text-zinc-500 hover:text-zinc-300 lg:block"
          title="Expand (⌘\\)"
          aria-label="Expand client list"
        >
          <ChevronsRight className="h-3 w-3" />
        </button>
      )}

      {/* ─── Main ────────────────────────────────────────────────── */}
      <main className="min-h-0 flex-1 overflow-hidden">{children}</main>

      {/* ─── Mobile Drawer (overlay, only renders <lg when open) ─ */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              key="drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={closeDrawer}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
              aria-hidden="true"
            />
            <motion.div
              key="drawer-panel"
              ref={drawerRef}
              id="mobile-nav-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Main navigation"
              initial={{ x: -340, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -340, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-y-0 left-0 z-50 flex h-full w-[85%] max-w-[320px] bg-[#050505] shadow-2xl lg:hidden"
            >
              {renderRail(true)}
              {renderClientList(true)}
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
    </ToastProvider>
  );
}

function RailButton({
  href,
  onClick,
  icon,
  label,
  active,
  badge,
}: {
  href?: string;
  onClick?: () => void;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: number;
}) {
  const cls = `relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
    active
      ? "bg-zinc-800 text-zinc-100"
      : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
  }`;
  const content = (
    <>
      {icon}
      {badge !== undefined && badge > 0 && (
        <span
          className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-amber-950"
          title={`${badge} pending`}
        >
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </>
  );
  if (href) {
    return (
      <Link href={href} className={cls} title={label} aria-label={label}>
        {content}
      </Link>
    );
  }
  return (
    <button onClick={onClick} className={cls} title={label} aria-label={label}>
      {content}
    </button>
  );
}

// Exported for the shell's own unused-import guard to not trigger.
export type { WorkspaceClient as WorkspaceClientType };

// Pull LogOut in so the bundle includes the icon when settings renders —
// avoids a second round-trip if the user opens the menu.
void LogOut;
