"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Calendar, Cpu } from "lucide-react";
import { getActiveClient, getActiveMember } from "@/data/firms";
import { getActiveFirmData } from "@/lib/firm-context";

export function ClientContextPanel({
  isOpen,
  clientId,
  width = 320,
}: {
  isOpen: boolean;
  clientId: string;
  width?: number;
}) {
  const client = getActiveClient(clientId);
  if (!client) return null;

  const firmData = getActiveFirmData();
  const assigned = getActiveMember(client.assignedTo);
  const events = firmData.upcomingEvents.filter((e) => e.clientId === clientId || e.clientId === "");

  const syncColors: Record<string, string> = {
    synced: "bg-emerald-500", stale: "bg-zinc-500", error: "bg-zinc-500", none: "bg-zinc-700",
  };

  // Read generic fields first; fall back to accounting-specific for Park Accounting.
  const integrationStatus = client.integrationStatus ?? client.qbSync;
  const integrationLabel = client.integrationLabel ?? "QuickBooks";
  const integrationLastSync = client.integrationLastSync ?? client.qbLastSync;
  const workflowWord = firmData.config.labels.workflowWord;
  const workflowStatusLabel = client.workflowStatusLabel ?? client.monthlyCloseStatus;

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="border-l border-zinc-800/80 bg-[#0a0a0a] flex flex-col shrink-0 overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto hide-scrollbar p-5 space-y-7">

            {/* Live AI Activity (firm-wide) — top priority */}
            <LiveActivityTicker />

            {/* Status — most important per-client info */}
            <Section title="Status">
              <div className="space-y-3">
                <StatusRow label={integrationLabel} value={
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${syncColors[integrationStatus ?? "none"]}`} />
                    <span className="text-sm text-zinc-200">{integrationLastSync || "Not connected"}</span>
                  </div>
                } />
                <StatusRow label={workflowWord} value={
                  <span className="text-sm font-medium capitalize text-zinc-200">{workflowStatusLabel}</span>
                } />
                <StatusRow label="Lead" value={
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: assigned.avatarColor }}>{assigned.initials}</div>
                    <span className="text-sm text-zinc-200">{assigned.name.split(" ")[0]}</span>
                  </div>
                } />
              </div>
            </Section>

            {/* Key Metrics — only top 4, larger numbers */}
            <Section title="Key metrics">
              <div className="grid grid-cols-2 gap-2.5">
                {Object.entries(client.metrics).slice(0, 4).map(([key, val]) => (
                  <div key={key} className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-800/50">
                    <div className="text-xs text-zinc-500 truncate mb-1">{key}</div>
                    <div className="text-base font-bold text-zinc-100 num">{val}</div>
                  </div>
                ))}
              </div>
            </Section>

            {/* Contact */}
            <Section title="Contact">
              <div className="space-y-1">
                <div className="text-sm font-medium text-zinc-200">{client.contact.name}</div>
                <div className="text-xs text-zinc-500">{client.contact.email}</div>
                <div className="text-xs text-zinc-600 mt-1.5 capitalize">Tone: {client.preferences.tone}</div>
              </div>
            </Section>

            {/* Upcoming events */}
            {events.length > 0 && (
              <Section title="Upcoming">
                <div className="space-y-2.5">
                  {events.slice(0, 3).map((ev) => (
                    <div key={ev.id} className="flex items-start gap-2.5">
                      <Calendar className="w-3.5 h-3.5 text-zinc-500 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <div className="text-sm text-zinc-300 leading-snug">{ev.title}</div>
                        <div className="text-xs text-zinc-600 mt-0.5">{ev.dateShort}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium text-zinc-500 mb-3">{title}</div>
      {children}
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-zinc-500">{label}</span>
      {value}
    </div>
  );
}

/* ── Live Activity Ticker ── shows AI working in real-time across firm */
function LiveActivityTicker() {
  const firmData = getActiveFirmData();
  const [ticks, setTicks] = useState(firmData.liveActivityTicks);

  // Rebuild ticker state whenever the firm changes
  useEffect(() => {
    setTicks(firmData.liveActivityTicks);
  }, [firmData]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTicks((prev) =>
        prev.map((tick) => {
          if (tick.current >= tick.total) return tick;
          const delta = Math.floor(Math.random() * 3) + 1;
          return { ...tick, current: Math.min(tick.current + delta, tick.total) };
        })
      );
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Cpu className="w-3.5 h-3.5 text-zinc-500" />
        <span className="text-xs font-medium text-zinc-500">Background work</span>
      </div>
      <div className="space-y-2.5">
        {ticks.map((tick, i) => {
          const pct = Math.round((tick.current / tick.total) * 100);
          return (
            <div key={i} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-300 truncate pr-2">{tick.label}</span>
                <span className="text-xs num shrink-0 text-zinc-500">
                  {tick.current.toLocaleString()}/{tick.total.toLocaleString()}
                </span>
              </div>
              <div className="h-0.5 rounded-full bg-zinc-800 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-zinc-500"
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
