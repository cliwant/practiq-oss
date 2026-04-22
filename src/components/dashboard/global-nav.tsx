"use client";

import { Home, Users as TeamIcon, Inbox } from "lucide-react";
import { getActiveFirmData } from "@/lib/firm-context";
import { FirmSwitcher } from "@/components/dashboard/firm-switcher";
import type { ViewState } from "@/app/build-dashboard/layout";

export function GlobalNav({
  activeFirmId,
  onSelectFirm,
  tourMode = false,
  currentView,
  onViewChange,
}: {
  activeFirmId: string;
  onSelectFirm: (firmId: string) => void;
  /**
   * When true, the Industry Tour firm switcher is revealed in the top of the
   * left rail. When false (the default single-firm experience), the user
   * sees only their one firm — no switcher — because real professional-
   * services users belong to exactly one firm. The switcher is a demo
   * affordance for showcasing all five verticals, not a real-user feature.
   */
  tourMode?: boolean;
  currentView: ViewState;
  onViewChange: (view: ViewState) => void;
}) {
  const firmData = getActiveFirmData();
  const managingPartner = firmData.team[0];

  return (
    <div className="w-14 border-r border-zinc-800/80 bg-[#050505] flex flex-col items-center py-4 z-30 shrink-0">
      {/* Firm Switcher — demo-only. Gated behind ?tour=1 URL param. */}
      {tourMode && <FirmSwitcher activeFirmId={activeFirmId} onSelectFirm={onSelectFirm} />}

      {/* Single-firm mode shows the active firm's logo as a static badge */}
      {!tourMode && (
        <div className="mb-4 flex flex-col items-center">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-bold text-white shadow-lg ring-2 ring-zinc-100/15 ring-offset-2 ring-offset-[#050505]"
            style={{ backgroundColor: firmData.firm.logoColor }}
            title={`${firmData.firm.name} — ${firmData.firm.tagline}`}
          >
            {firmData.firm.shortName}
          </div>
          <div className="mt-4 w-7 h-px bg-zinc-800" />
        </div>
      )}

      {/* Primary firm-wide destinations: Home, Approvals, Team */}
      <div className="flex flex-col gap-1.5 items-center">
        <NavButton
          icon={<Home className="w-4 h-4" />}
          label="Home"
          active={currentView === "home"}
          onClick={() => onViewChange("home")}
        />
        <NavButton
          icon={<Inbox className="w-4 h-4" />}
          label="Approvals"
          active={currentView === "approval_queue"}
          onClick={() => onViewChange("approval_queue")}
        />
        <NavButton
          icon={<TeamIcon className="w-4 h-4" />}
          label="Team"
          active={currentView === "team"}
          onClick={() => onViewChange("team")}
        />
      </div>

      {/* Bottom — active user identity (no dead Help/Settings buttons).
          The avatar shows who's signed in. Clicking does nothing for now
          but the tooltip tells the user their role. */}
      <div className="flex flex-col items-center mt-auto">
        <div
          className="w-9 h-9 rounded-md border border-zinc-700 flex items-center justify-center text-xs font-medium text-zinc-300 shadow-sm"
          style={{ backgroundColor: managingPartner.avatarColor }}
          title={`${managingPartner.name} — ${managingPartner.role}`}
        >
          <span className="text-white">{managingPartner.initials}</span>
        </div>
      </div>
    </div>
  );
}

function NavButton({
  icon, label, active = false, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all relative group ${
        active
          ? "bg-zinc-800 text-zinc-100"
          : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
      }`}
      title={label}
    >
      {icon}
      {/* Side tooltip on hover (hidden on active) */}
      {!active && (
        <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
          {label}
        </div>
      )}
    </button>
  );
}
