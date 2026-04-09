"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, Command, CornerDownLeft, Building2 } from "lucide-react";
import { type IntegrationStatus } from "@/data/mock-data";
import { firms, getActiveClients } from "@/data/firms";
import { getActiveFirmData } from "@/lib/firm-context";
import { ClientAvatar } from "@/components/dashboard/client-avatar";

interface QuickSwitcherProps {
  isOpen: boolean;
  /** Re-triggers the client list when the active firm changes. */
  activeFirmId: string;
  activeClientId: string;
  onClose: () => void;
  onSelect: (clientId: string) => void;
  onSelectFirm: (firmId: string) => void;
}

const syncDot: Record<IntegrationStatus, string> = {
  synced: "bg-emerald-500",
  stale: "bg-amber-500",
  error: "bg-red-500",
  none: "bg-zinc-600",
};

export function QuickSwitcher({ isOpen, activeFirmId, onClose, onSelect, onSelectFirm }: QuickSwitcherProps) {
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const firmData = getActiveFirmData();
  const clients = getActiveClients();

  // Results = firms (always visible, all five) + clients from the active firm
  // that match the query. The flat list is [firms..., clients...] so keyboard
  // nav crosses both. With no query, the Firms section shows every firm; the
  // Clients section shows the active firm's full roster.
  const q = query.toLowerCase();
  const firmMatches = query.trim()
    ? firms.filter((f) =>
        f.name.toLowerCase().includes(q) ||
        f.vertical.toLowerCase().includes(q) ||
        f.shortName.toLowerCase().includes(q)
      )
    : firms;
  const filtered = clients.filter((c) =>
    c.name.toLowerCase().includes(q) ||
    c.industry.toLowerCase().includes(q) ||
    c.shortName.toLowerCase().includes(q)
  );
  const totalResults = firmMatches.length + filtered.length;

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Reset selection when query changes, or when the active firm swaps
  useEffect(() => {
    setSelectedIdx(0);
  }, [query, activeFirmId]);

  // Keyboard handlers — selection index flows across [firms..., clients...]
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      if (e.key === "ArrowDown" || (e.key === "j" && e.ctrlKey)) {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, totalResults - 1));
      }
      if (e.key === "ArrowUp" || (e.key === "k" && e.ctrlKey)) {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (selectedIdx < firmMatches.length && firmMatches[selectedIdx]) {
          onSelectFirm(firmMatches[selectedIdx].id);
          onClose();
        } else {
          const clientIdx = selectedIdx - firmMatches.length;
          if (filtered[clientIdx]) {
            onSelect(filtered[clientIdx].id);
            onClose();
          }
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, firmMatches, filtered, selectedIdx, totalResults, onSelect, onSelectFirm, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-md"
          />

          {/* Palette */}
          <div className="fixed inset-0 z-[201] flex items-start justify-center pt-[15vh] px-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -20 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-2xl pointer-events-auto"
            >
              <div className="rounded-2xl border border-zinc-700/80 bg-[#0a0a0a]/95 backdrop-blur-xl shadow-2xl shadow-black/60 overflow-hidden">

                {/* Search Input */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-800/80">
                  <Search className="w-4 h-4 text-zinc-500 shrink-0" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={`Jump to a firm or ${firmData.config.labels.clientWordPlural.toLowerCase().slice(0, -1)}...`}
                    className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
                  />
                  <kbd className="text-xs font-mono text-zinc-500 bg-zinc-800/80 px-2 py-1 rounded border border-zinc-700">ESC</kbd>
                </div>

                {/* Results */}
                <div className="max-h-[400px] overflow-y-auto hide-scrollbar py-2">
                  {totalResults === 0 && (
                    <div className="px-5 py-8 text-center text-sm text-zinc-500">
                      No {firmData.config.labels.clientWordPlural.toLowerCase()} or firms match &ldquo;{query}&rdquo;
                    </div>
                  )}

                  {/* Firm matches — always visible. With no query, shows all
                       registered firms. With a query, filters by name/vertical. */}
                  {firmMatches.length > 0 && (
                    <>
                      <div className="px-5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-600 flex items-center justify-between">
                        <span>Firms</span>
                        <span className="text-zinc-700 normal-case tracking-normal">⌘1-5</span>
                      </div>
                      {firmMatches.map((firm, idx) => {
                        const isSelected = idx === selectedIdx;
                        return (
                          <button
                            key={firm.id}
                            onMouseEnter={() => setSelectedIdx(idx)}
                            onClick={() => { onSelectFirm(firm.id); onClose(); }}
                            className={`w-full px-4 py-3 flex items-center gap-3 transition-all relative ${
                              isSelected ? "bg-zinc-800/60" : "hover:bg-zinc-900/40"
                            }`}
                          >
                            {isSelected && (
                              <motion.div
                                layoutId="quick-switcher-highlight"
                                className="absolute left-0 top-0 bottom-0 w-0.5"
                                style={{ backgroundColor: firm.logoColor }}
                                transition={{ duration: 0.15 }}
                              />
                            )}
                            <div
                              className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                              style={{ backgroundColor: firm.logoColor }}
                            >
                              {firm.shortName}
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-zinc-100 truncate">{firm.name}</span>
                                <span className="text-[10px] uppercase tracking-widest text-zinc-600">{firm.vertical}</span>
                              </div>
                              <div className="text-xs text-zinc-500 mt-0.5">{firm.tagline}</div>
                            </div>
                            <Building2 className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                            {isSelected && <CornerDownLeft className="w-3.5 h-3.5 text-zinc-500 shrink-0" />}
                          </button>
                        );
                      })}
                    </>
                  )}

                  {/* Client matches */}
                  {filtered.length > 0 && (
                    <>
                      <div className="px-5 py-1.5 mt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                        {firmData.firm.name} · {firmData.config.labels.clientWordPlural}
                      </div>
                      {filtered.map((client, i) => {
                        const idx = firmMatches.length + i;
                        const isSelected = idx === selectedIdx;
                        const alertCount = firmData.attentionItems.filter((a) => a.clientId === client.id).length;
                        const approvalCount = firmData.approvalQueue.filter((a) => a.clientId === client.id && a.status === "pending").length;
                        return (
                          <button
                            key={client.id}
                            onMouseEnter={() => setSelectedIdx(idx)}
                            onClick={() => { onSelect(client.id); onClose(); }}
                            className={`w-full px-4 py-3 flex items-center gap-3 transition-all relative ${
                              isSelected ? "bg-zinc-800/60" : "hover:bg-zinc-900/40"
                            }`}
                          >
                            {isSelected && (
                              <motion.div
                                layoutId="quick-switcher-highlight"
                                className="absolute left-0 top-0 bottom-0 w-0.5"
                                style={{ backgroundColor: client.color }}
                                transition={{ duration: 0.15 }}
                              />
                            )}

                            <ClientAvatar client={client} size="lg" />

                            <div className="flex-1 min-w-0 text-left">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-zinc-100 truncate">{client.name}</span>
                                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${syncDot[client.integrationStatus ?? client.qbSync]}`} />
                              </div>
                              <div className="text-xs text-zinc-500 mt-0.5">
                                {client.industry} · {client.entityType}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {alertCount > 0 && (
                                <span className="text-xs text-zinc-400">{alertCount} alert{alertCount > 1 ? "s" : ""}</span>
                              )}
                              {approvalCount > 0 && (
                                <span className="text-xs text-zinc-400">{approvalCount} pending</span>
                              )}
                            </div>

                            {isSelected && (
                              <CornerDownLeft className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </>
                  )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2.5 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <kbd className="font-mono bg-zinc-800/80 px-1.5 py-0.5 rounded border border-zinc-700">↑</kbd>
                      <kbd className="font-mono bg-zinc-800/80 px-1.5 py-0.5 rounded border border-zinc-700">↓</kbd>
                      navigate
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="font-mono bg-zinc-800/80 px-1.5 py-0.5 rounded border border-zinc-700">⏎</kbd>
                      switch
                    </span>
                  </div>
                  <span className="flex items-center gap-1">
                    <Command className="w-3 h-3" />
                    <span>K to open</span>
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
