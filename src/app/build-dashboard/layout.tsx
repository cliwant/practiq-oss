"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { GlobalNav } from "@/components/dashboard/global-nav";
import { ContextNav } from "@/components/dashboard/context-nav";
import { ClientContextPanel } from "@/components/dashboard/client-context-panel";
import { QuickSwitcher } from "@/components/dashboard/quick-switcher";
import { DemoMode, type DemoStep } from "@/components/dashboard/demo-mode";
import { ClientAvatar } from "@/components/dashboard/client-avatar";
import {
  PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen,
  Search, Play, Sparkles,
} from "lucide-react";
import { type ClientWorkspace } from "@/data/mock-data";
// Importing the firm registry registers the firm resolver with firm-context.
// This is a side-effect import — keep it above any code that calls getActiveFirmData().
import { getFirmData } from "@/data/firms";
import { setActiveFirmId as setActiveFirmIdModule } from "@/lib/firm-context";
import {
  getSessionClients,
  getSessionClient,
  subscribeSessionClients,
  getSessionClientOnboardingBriefing,
} from "@/lib/session-clients";
import { NewClientModal } from "@/components/dashboard/new-client-modal";

export type ViewState =
  | "home"
  | "team"
  | "agent_thread"
  | "approval_queue"
  | "context"
  | "output"
  | "workstream_board_deck"
  | "workstream_financials";

// Views that require a specific client context (ContextNav client list is
// highlighted, ClientContextPanel on the right, client breadcrumb + tabs
// in the header). Home, Team, and Approvals are FIRM-scoped.
const CLIENT_SCOPED_VIEWS: ViewState[] = [
  "agent_thread", "context", "output",
  "workstream_board_deck", "workstream_financials",
];

// Firm-scoped views that still benefit from the persistent client sidebar
// (Home lets users browse clients while looking at firm priorities;
// Approvals lets users jump to any client's workspace from the queue).
// Team is intentionally excluded because it has its own channels/DMs sub-rail.
const SHOW_CLIENT_SIDEBAR_VIEWS: ViewState[] = [
  "home", "approval_queue", "agent_thread", "context",
  "output", "workstream_board_deck", "workstream_financials",
];

// ---- URL params ----
// `firm`   - active firm id
// `client` - active client id (scoped to active firm)
// `view`   - ViewState (client-scoped views)
// `tour`   - "1" enables Industry Tour mode (firm switcher + Cmd+1..5 hotkeys)
const DEFAULT_FIRM = "meridian-accounting";
const VALID_VIEWS: ViewState[] = [
  "home", "team", "agent_thread", "approval_queue", "context",
  "output", "workstream_board_deck", "workstream_financials",
];

function useViewportWidth() {
  const [width, setWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1440);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return width;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // ---- URL-derived state ----
  // Firm: validated against the registry (fallback to DEFAULT_FIRM).
  // Client: validated against the active firm's roster.
  // View: validated against the ViewState enum.
  // Tour: boolean; reveals the firm switcher and enables Cmd+1..5 hotkeys.
  const urlFirmId = searchParams.get("firm") ?? DEFAULT_FIRM;
  const urlClientId = searchParams.get("client");
  const urlView = searchParams.get("view") as ViewState | null;
  const tourMode = searchParams.get("tour") === "1";

  // Validate firm; fall back to default if bad param
  const activeFirmId = useMemo(() => {
    const candidate = getFirmData(urlFirmId);
    return candidate.firm.id; // getFirmData falls back to meridian-accounting internally
  }, [urlFirmId]);

  // Module sync must run synchronously BEFORE any child renders resolve
  // via getActiveFirmData(). Doing it in a layout effect would leave the
  // first render with the stale firm, so we write to the module here.
  if (typeof window !== "undefined") {
    setActiveFirmIdModule(activeFirmId);
  }

  const activeFirmData = useMemo(() => getFirmData(activeFirmId), [activeFirmId]);

  // Local-only UI state (sidebar open, panel prefs, modals) — these don't
  // need to live in the URL and shouldn't be restored after a share.
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [userContextPanelPref, setUserContextPanelPref] = useState(true);
  const [isQuickSwitcherOpen, setIsQuickSwitcherOpen] = useState(false);
  const [clientSwitchCount, setClientSwitchCount] = useState(0);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isNewClientOpen, setIsNewClientOpen] = useState(false);
  // Version counter bumped whenever a session client is added, so that
  // components reading from the session store re-render. React doesn't
  // see module-level state changes otherwise.
  const [sessionClientsVersion, setSessionClientsVersion] = useState(0);

  // Subscribe to the session-clients store
  useEffect(() => {
    return subscribeSessionClients(() => {
      setSessionClientsVersion((v) => v + 1);
    });
  }, []);

  // Validate client against the active firm + session clients; fall back
  // to the firm's hero when the URL client is invalid or missing.
  const activeClientId = useMemo(() => {
    if (!urlClientId) return activeFirmData.firm.heroClientId;
    const inFirm = activeFirmData.clients.some((c) => c.id === urlClientId);
    const inSession = getSessionClients(activeFirmData.firm.id).some((c) => c.id === urlClientId);
    if (inFirm || inSession) return urlClientId;
    return activeFirmData.firm.heroClientId;
    // sessionClientsVersion forces re-resolution after a new client is added
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlClientId, activeFirmData, sessionClientsVersion]);

  // Validate view; fall back to agent_thread
  const currentView: ViewState = useMemo(() => {
    if (urlView && VALID_VIEWS.includes(urlView)) return urlView;
    return "agent_thread";
  }, [urlView]);

  // Safety net: also mirror activeFirmId into the module from an effect, so
  // the module state stays correct even if the synchronous write above is
  // skipped during SSR.
  useEffect(() => {
    setActiveFirmIdModule(activeFirmId);
  }, [activeFirmId]);

  const viewportWidth = useViewportWidth();
  // Auto-hide rules
  const isNarrow = viewportWidth < 1280;
  const isWide = viewportWidth >= 1536;
  const isContextPanelOpen = !isNarrow && userContextPanelPref;
  // Adaptive panel widths
  const contextNavWidth = isNarrow ? 240 : isWide ? 300 : 280;
  const contextPanelWidth = isWide ? 340 : 300;

  // Resolve the active client object — checks firm store first, then
  // session clients, then falls back to the first firm client.
  const activeClient: ClientWorkspace = useMemo(() => {
    return (
      activeFirmData.clients.find((c) => c.id === activeClientId) ??
      getSessionClient(activeClientId) ??
      activeFirmData.clients[0]
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFirmData, activeClientId, sessionClientsVersion]);

  // ---- URL writer ----
  // Build a new URL preserving existing params, then replace() so back-button
  // history isn't polluted with every in-app navigation. `router.replace` is
  // a soft navigation — no reload.
  const updateUrl = useCallback(
    (patch: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  const handleClientChange = useCallback(
    (clientId: string) => {
      setClientSwitchCount((c) => c + 1); // trigger new briefing in AgentThreadView
      updateUrl({ client: clientId, view: "agent_thread" });
    },
    [updateUrl]
  );

  const handleFirmChange = useCallback(
    (firmId: string) => {
      // Update module state synchronously BEFORE the URL change so any
      // components that re-render from the URL patch see the new firm.
      setActiveFirmIdModule(firmId);
      const nextFirm = getFirmData(firmId);
      setClientSwitchCount((c) => c + 1);
      // Firm switches always land on Home (firm-wide command center), not
      // on an arbitrary client. Client is still set to the hero so that
      // clicking into the workspace afterwards lands on a live scene.
      updateUrl({
        firm: firmId,
        client: nextFirm.firm.heroClientId,
        view: "home",
      });
    },
    [updateUrl]
  );

  const handleViewChange = useCallback(
    (view: ViewState) => {
      updateUrl({ view });
    },
    [updateUrl]
  );

  // Called by NewClientModal after the client is created. Routes the user
  // into the new client's Agent Thread so the scripted onboarding plays.
  const handleNewClientCreated = useCallback(
    (newClientId: string) => {
      setClientSwitchCount((c) => c + 1);
      updateUrl({
        client: newClientId,
        view: "agent_thread",
      });
    },
    [updateUrl]
  );

  // Global hotkey: Cmd+K / Ctrl+K opens Quick Switcher
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsQuickSwitcherOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // A view is "client-scoped" when the user is actively inside one specific
  // client (agent thread, context, output, workstream). These views show
  // the client identity + tabs in the header and the right-side
  // ClientContextPanel. Home, Team, and Approvals are firm-scoped.
  const isClientScoped = CLIENT_SCOPED_VIEWS.includes(currentView);
  // The client sidebar (ContextNav) stays visible on Home and Approvals so
  // users can always browse / jump to any client, even while looking at
  // firm-wide data. Team view hides the sidebar because it has its own
  // Channels / DMs sub-rail.
  const showClientSidebar = SHOW_CLIENT_SIDEBAR_VIEWS.includes(currentView);

  // Demo script — 15-step tour across all five firms. Each firm gets its
  // hero scene plus a beat of "what AI is doing", then the tour ends back
  // at Meridian Accounting where it began. Only runs when tour mode is enabled.
  const demoSteps: DemoStep[] = useMemo(() => [
    // Meridian Accounting — accounting
    { id: "1", label: "Meridian Accounting · Russo's Kitchen — morning briefing", durationMs: 6000, action: () => handleFirmChange("meridian-accounting") },
    { id: "2", label: "Live alert — Pacific Foods supplier price change", durationMs: 5500, action: () => {} },
    { id: "3", label: "Anna's handoff → Jennifer approves March close", durationMs: 5000, action: () => {} },

    // Chen Morgan — law
    { id: "4", label: "Chen Morgan LLP · Hendrix v. Riverpoint — discovery", durationMs: 6000, action: () => handleFirmChange("chen-morgan") },
    { id: "5", label: "Sarah flags 3 borderline privilege calls", durationMs: 5500, action: () => {} },
    { id: "6", label: "AI drafts the privilege log cover memo", durationMs: 5000, action: () => {} },

    // North Arc — consulting
    { id: "7", label: "North Arc Advisors · Lumen Bio — Series B prep", durationMs: 6000, action: () => handleFirmChange("north-arc") },
    { id: "8", label: "Naomi's cohort reconciliation — 428 → 427", durationMs: 5500, action: () => {} },
    { id: "9", label: "AI drafts board memo for the correction", durationMs: 5000, action: () => {} },

    // Wildcard Studio — agency
    { id: "10", label: "Wildcard Studio · Fjallberg Spring 2026 concept", durationMs: 6000, action: () => handleFirmChange("wildcard-studio") },
    { id: "11", label: "Leo flags brand-guardrail mismatch on hero cut", durationMs: 5500, action: () => {} },
    { id: "12", label: "AI builds Heritage vs Modern rationale", durationMs: 5000, action: () => {} },

    // Lattice Partners — HR
    { id: "13", label: "Lattice Partners HR · Helix VP Eng comp review", durationMs: 6000, action: () => handleFirmChange("lattice-partners") },
    { id: "14", label: "Elena's parity analysis surfaces underpaid Director", durationMs: 5500, action: () => {} },

    // Loop back home
    { id: "15", label: "Back to Meridian Accounting", durationMs: 5000, action: () => handleFirmChange("meridian-accounting") },
  ], [handleFirmChange]);

  return (
    <div
      className="h-screen w-full bg-[#0a0a0a] flex overflow-hidden font-sans text-zinc-300 selection:bg-brand-primary/30"
      style={{
        // CSS custom prop drives client-accent across nested components.
        // Browsers do NOT animate CSS variables natively, so we update via
        // requestAnimationFrame in a useEffect for smooth transitions.
        // Components reference: var(--client-accent) and var(--client-accent-soft)
        ["--client-accent" as string]: activeClient.color,
        ["--client-accent-soft" as string]: activeClient.color + "1A",
        ["--client-accent-glow" as string]: activeClient.color + "33",
      }}
    >
      <GlobalNav
        activeFirmId={activeFirmId}
        onSelectFirm={handleFirmChange}
        tourMode={tourMode}
        currentView={currentView}
        onViewChange={handleViewChange}
      />
      {showClientSidebar && (
        <ContextNav
          isOpen={isSidebarOpen}
          activeFirmId={activeFirmId}
          activeClientId={isClientScoped ? activeClientId : null}
          onSelectClient={handleClientChange}
          onNewClient={() => setIsNewClientOpen(true)}
          sessionClientsVersion={sessionClientsVersion}
          width={contextNavWidth}
        />
      )}
      {/* Secondary nav (view switcher) is now in the header — see SubNav below */}
      <div className="flex-1 flex flex-col relative min-w-0 bg-[#050505]">
        <DashboardHeader
          activeClient={activeClient}
          currentView={currentView}
          isSidebarOpen={isSidebarOpen}
          isContextPanelOpen={isContextPanelOpen}
          tourMode={tourMode}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onToggleContextPanel={() => setUserContextPanelPref(!userContextPanelPref)}
          onOpenQuickSwitcher={() => setIsQuickSwitcherOpen(true)}
          onViewChange={handleViewChange}
          onStartDemo={() => setIsDemoMode(true)}
          isDemoActive={isDemoMode}
        />
        <div className="flex-1 overflow-hidden relative flex">
          <div className="flex-1 min-w-0">
            <DashboardContent
              activeClientId={activeClientId}
              currentView={currentView}
              onViewChange={handleViewChange}
              onEnterClient={handleClientChange}
              clientSwitchCount={clientSwitchCount}
            />
          </div>
          {currentView === "agent_thread" && isClientScoped && (
            <ClientContextPanel
              isOpen={isContextPanelOpen}
              clientId={activeClientId}
              width={contextPanelWidth}
            />
          )}
        </div>
      </div>
      <QuickSwitcher
        isOpen={isQuickSwitcherOpen}
        activeFirmId={activeFirmId}
        activeClientId={activeClientId}
        onClose={() => setIsQuickSwitcherOpen(false)}
        onSelect={handleClientChange}
        onSelectFirm={handleFirmChange}
      />
      <DemoMode
        isActive={isDemoMode}
        onToggle={() => setIsDemoMode(false)}
        steps={demoSteps}
      />
      <NewClientModal
        isOpen={isNewClientOpen}
        onClose={() => setIsNewClientOpen(false)}
        onCreated={handleNewClientCreated}
      />
      {children && <span className="hidden" />}
    </div>
  );
}

/* ── Header ── */
function DashboardHeader({
  activeClient, currentView, isSidebarOpen, isContextPanelOpen, tourMode,
  onToggleSidebar, onToggleContextPanel, onOpenQuickSwitcher, onViewChange,
  onStartDemo, isDemoActive,
}: {
  activeClient: ClientWorkspace;
  currentView: ViewState;
  isSidebarOpen: boolean;
  isContextPanelOpen: boolean;
  tourMode: boolean;
  onToggleSidebar: () => void;
  onToggleContextPanel: () => void;
  onOpenQuickSwitcher: () => void;
  onViewChange: (v: ViewState) => void;
  onStartDemo: () => void;
  isDemoActive: boolean;
}) {
  const firmData = getFirmData(activeClient.firmId ?? "meridian-accounting");
  const isClientScoped = CLIENT_SCOPED_VIEWS.includes(currentView);
  // Approvals is NOT in the client tab list — it's a firm-wide view.
  // Keeping it out of the client tabs prevents the confusing UX where
  // clicking "Approvals" from inside Russo's Kitchen shows items from
  // every client in the firm (they're firm-scoped by design).
  const tabs: { id: ViewState; label: string }[] = [
    { id: "agent_thread", label: "Agent Thread" },
    { id: "output", label: "Output" },
    { id: "context", label: "Context" },
  ];
  const firmViewTitle =
    currentView === "home"
      ? "Home"
      : currentView === "team"
        ? "Team"
        : currentView === "approval_queue"
          ? "Approvals"
          : null;

  return (
    <header className="h-14 border-b border-zinc-800/80 flex items-center justify-between px-4 lg:px-6 z-10 shrink-0 bg-[#0a0a0a] gap-3">
      <div className="flex items-center gap-3 lg:gap-4 min-w-0">
        {isClientScoped && (
          <>
            <button onClick={onToggleSidebar} className="text-zinc-500 hover:text-zinc-300 transition-colors shrink-0">
              {isSidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
            </button>
            <div className="h-4 w-px bg-zinc-800 shrink-0" />
          </>
        )}

        {/* Firm-scoped views: just show the firm name + view title */}
        {!isClientScoped && (
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
              style={{ backgroundColor: firmData.firm.logoColor }}
            >
              {firmData.firm.shortName}
            </div>
            <span className="text-sm font-semibold text-zinc-100 truncate">
              {firmData.firm.name}
            </span>
            <span className="text-zinc-700">·</span>
            <span className="text-sm text-zinc-400">{firmViewTitle}</span>
          </div>
        )}

        {/* Client identity + Tabs — only in client-scoped views */}
        {isClientScoped && (
          <>
            <div className="flex items-center gap-2.5 min-w-0 shrink">
              <ClientAvatar client={activeClient} size="md" />
              <span className="text-sm font-semibold text-zinc-100 mr-3 truncate hidden sm:inline">{activeClient.name}</span>
            </div>
            <nav className="flex items-center gap-0.5 shrink-0">
              {tabs.map((tab) => {
                const isActive = currentView === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => onViewChange(tab.id)}
                    className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                      isActive
                        ? "text-zinc-100 bg-zinc-800/80 font-medium"
                        : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/60"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 lg:gap-3 shrink-0">
        {/* Industry Tour mode badge — only visible when ?tour=1 */}
        {tourMode && (
          <div
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-700 text-[10px] font-bold uppercase tracking-widest text-zinc-300"
            title={`Showing ${firmData.firm.name} — switch firms in the left rail`}
          >
            <Sparkles className="w-3 h-3 text-zinc-400" />
            Industry Tour
          </div>
        )}
        {tourMode && !isDemoActive && (
          <button
            onClick={onStartDemo}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors text-sm"
            title="Play demo"
          >
            <Play className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Play Tour</span>
          </button>
        )}
        <button
          onClick={onOpenQuickSwitcher}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-all text-sm group"
          title="Search clients, firms, and actions"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Search</span>
          <kbd className="text-xs font-mono bg-zinc-800/80 group-hover:bg-zinc-700/80 px-1.5 py-0.5 rounded border border-zinc-700">⌘K</kbd>
        </button>
        {currentView === "agent_thread" && (
          <button onClick={onToggleContextPanel} className="text-zinc-500 hover:text-zinc-300 transition-colors" title="Toggle context panel">
            {isContextPanelOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
          </button>
        )}
      </div>
    </header>
  );
}

/* ── Dynamic Content Router ── */
import { HomeView } from "@/components/dashboard/views/home";
import { TeamView } from "@/components/dashboard/views/team";
import { AgentThreadView } from "@/components/dashboard/views/agent-thread";
import { ApprovalQueueView } from "@/components/dashboard/views/approval-queue";
import { ContextView } from "@/components/dashboard/views/context";
import { OutputView } from "@/components/dashboard/views/output";
import { WorkstreamView } from "@/components/dashboard/views/workstream";

function DashboardContent({
  activeClientId, currentView, onViewChange, onEnterClient, clientSwitchCount,
}: {
  activeClientId: string;
  currentView: ViewState;
  onViewChange: (v: ViewState) => void;
  onEnterClient: (clientId: string) => void;
  clientSwitchCount: number;
}) {
  switch (currentView) {
    case "home":
      return <HomeView onEnterClient={onEnterClient} onViewChange={onViewChange} />;
    case "team":
      return <TeamView />;
    case "agent_thread":
      return <AgentThreadView clientId={activeClientId} clientSwitchCount={clientSwitchCount} onViewChange={onViewChange} />;
    case "approval_queue":
      return <ApprovalQueueView />;
    case "context":
      return <ContextView clientId={activeClientId} />;
    case "output":
      return <OutputView clientId={activeClientId} />;
    case "workstream_board_deck":
    case "workstream_financials":
      return <WorkstreamView clientId={activeClientId} currentView={currentView} />;
    default:
      return <AgentThreadView clientId={activeClientId} clientSwitchCount={clientSwitchCount} onViewChange={onViewChange} />;
  }
}

/** Placeholder for not-yet-built firm-scoped views. Phase O.3/O.4 replaces
 *  these with real Home and Team implementations. */
function FirmViewPlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#050505]">
      <div className="text-center max-w-md px-8">
        <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-5">
          <Sparkles className="w-5 h-5 text-zinc-500" />
        </div>
        <h2 className="text-2xl font-bold text-zinc-100 mb-3">{title}</h2>
        <p className="text-sm text-zinc-500 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
