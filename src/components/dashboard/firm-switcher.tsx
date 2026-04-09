"use client";

import { useEffect } from "react";
import { motion } from "motion/react";
import { firms } from "@/data/firms";

/**
 * FirmSwitcher — vertical stack of firm tiles in the left rail.
 *
 * Slack-style switcher: one tile per registered firm. Active firm shows a
 * colored left accent bar + ring. Hover tooltip reveals firm name, tagline,
 * vertical, and the keyboard shortcut.
 *
 * Keyboard hotkeys: Ctrl+1..5 (or Cmd+1..5 on Mac) jump to the corresponding
 * firm. Numbers map to the firms array order.
 */
export function FirmSwitcher({
  activeFirmId,
  onSelectFirm,
}: {
  activeFirmId: string;
  onSelectFirm: (firmId: string) => void;
}) {
  // Ctrl+1..5 / Cmd+1..5 jump to firm by index
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const num = parseInt(e.key, 10);
      if (Number.isNaN(num) || num < 1 || num > firms.length) return;
      e.preventDefault();
      const target = firms[num - 1];
      if (target && target.id !== activeFirmId) {
        onSelectFirm(target.id);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeFirmId, onSelectFirm]);

  return (
    <div className="flex flex-col items-center mb-3">
      <div className="flex flex-col items-center gap-2.5">
        {firms.map((firm, idx) => {
          const isActive = firm.id === activeFirmId;
          const hotkey = idx + 1;
          return (
            <button
              key={firm.id}
              onClick={() => onSelectFirm(firm.id)}
              className="relative group"
              aria-label={`Switch to ${firm.name}`}
              aria-current={isActive ? "true" : undefined}
            >
              {/* Active accent bar */}
              {isActive && (
                <motion.div
                  layoutId="firm-switcher-active-bar"
                  className="absolute -left-2 top-1 bottom-1 w-1 rounded-r-full"
                  style={{ backgroundColor: firm.logoColor }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                />
              )}

              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-bold text-white shadow-lg transition-all ${
                  isActive
                    ? "ring-2 ring-zinc-100/20 ring-offset-2 ring-offset-[#050505]"
                    : "opacity-60 hover:opacity-100 hover:scale-[1.04]"
                }`}
                style={{ backgroundColor: firm.logoColor }}
              >
                {firm.shortName}
              </div>

              {/* Tooltip on hover — name, tagline, vertical, hotkey */}
              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 shadow-xl shadow-black/60 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-zinc-100">{firm.name}</span>
                  <span className="text-[10px] uppercase tracking-widest text-zinc-600">{firm.vertical}</span>
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">{firm.tagline}</div>
                <div className="text-[10px] text-zinc-600 mt-1.5 flex items-center gap-1">
                  <kbd className="kbd">⌘{hotkey}</kbd>
                  <span>jump</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      {/* Separator below firm tiles */}
      <div className="mt-4 w-7 h-px bg-zinc-800" />
    </div>
  );
}
