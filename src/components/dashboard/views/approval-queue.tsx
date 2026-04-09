"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileText, FileSpreadsheet, Mail, CheckCircle2, X,
  MessageSquare,
  Sparkles, AlertTriangle,
} from "lucide-react";
import {
  type ApprovalQueueItem, type ApprovalStatus,
} from "@/data/mock-data";
import { getActiveClient } from "@/data/firms";
import { getActiveFirmData } from "@/lib/firm-context";

export function ApprovalQueueView() {
  const firmData = getActiveFirmData();
  const [items, setItems] = useState(firmData.approvalQueue);
  const [selectedIdx, setSelectedIdx] = useState(0);

  // When the firm switches, reset the local queue
  useEffect(() => {
    setItems(firmData.approvalQueue);
    setSelectedIdx(0);
  }, [firmData]);

  const pendingItems = items.filter(q => q.status === "pending");
  const selected = pendingItems[selectedIdx];

  const handleApprove = useCallback(() => {
    if (!selected) return;
    setItems(prev => prev.map(i => i.id === selected.id ? { ...i, status: "approved" as ApprovalStatus } : i));
    if (selectedIdx >= pendingItems.length - 2) setSelectedIdx(Math.max(0, selectedIdx - 1));
  }, [selected, selectedIdx, pendingItems.length]);

  const handleReject = useCallback(() => {
    if (!selected) return;
    setItems(prev => prev.map(i => i.id === selected.id ? { ...i, status: "changes-requested" as ApprovalStatus } : i));
    if (selectedIdx >= pendingItems.length - 2) setSelectedIdx(Math.max(0, selectedIdx - 1));
  }, [selected, selectedIdx, pendingItems.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "j" || e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, pendingItems.length - 1)); }
      if (e.key === "k" || e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
      if (e.key === "y") handleApprove();
      if (e.key === "n") handleReject();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleApprove, handleReject, pendingItems.length]);

  if (pendingItems.length === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <h3 className="text-xl font-bold text-zinc-100 mb-2">All caught up!</h3>
          <p className="text-sm text-zinc-500">No items pending review. AI will add new items as they&apos;re ready.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex">
      {/* Left: Queue List */}
      <div className="w-[380px] border-r border-zinc-800/80 flex flex-col shrink-0 bg-[#0a0a0a]">
        <div className="h-12 border-b border-zinc-800/80 flex items-center justify-between px-4 shrink-0">
          <span className="text-sm font-bold text-zinc-200">{pendingItems.length} pending</span>
          <div className="flex items-center gap-1 text-[10px] text-zinc-600">
            <span className="kbd">J</span><span className="kbd">K</span> navigate
            <span className="kbd ml-1">Y</span> approve
            <span className="kbd">N</span> reject
          </div>
        </div>
        <div className="flex-1 overflow-y-auto hide-scrollbar">
          {pendingItems.map((item, idx) => {
            const client = getActiveClient(item.clientId);
            const isSelected = idx === selectedIdx;
            const FormatIcon = item.format === "xlsx" ? FileSpreadsheet : item.format === "email" ? Mail : FileText;
            return (
              <div
                key={item.id}
                onClick={() => setSelectedIdx(idx)}
                className={`px-4 py-3 border-b border-zinc-800/50 cursor-pointer transition-colors ${isSelected ? "bg-zinc-800/50 border-l-2 border-l-brand-primary" : "hover:bg-zinc-900/50 border-l-2 border-l-transparent"}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <FormatIcon className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-sm font-medium text-zinc-200 truncate">{item.title}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {client && <span className="text-[10px] text-zinc-500">{client.name}</span>}
                    <span className="text-[10px] text-zinc-600">· {item.waitingSince} ago</span>
                  </div>
                  <ConfidenceBadge value={item.aiConfidence} />
                </div>
                {item.highlights.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {item.highlights.slice(0, 2).map((h, i) => (
                      <span key={i} className="text-[10px] text-zinc-500 bg-zinc-800/80 px-1.5 py-0.5 rounded truncate max-w-[180px]">{h}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Preview & Actions */}
      {selected && (
        <div className="flex-1 flex flex-col bg-[#050505]">
          {/* Actions Bar */}
          <div className="h-14 border-b border-zinc-800/80 flex items-center justify-between px-6 shrink-0 bg-[#0a0a0a]">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-zinc-200">{selected.title}</span>
              <span className="text-[10px] text-zinc-500">v{selected.version}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleApprove} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors">
                <CheckCircle2 className="w-3.5 h-3.5" /> Approve <span className="kbd text-[9px] ml-1 bg-emerald-700 border-emerald-800 text-emerald-200">Y</span>
              </button>
              <button onClick={handleReject} className="flex items-center gap-1.5 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-lg transition-colors">
                <X className="w-3.5 h-3.5" /> Changes <span className="kbd text-[9px] ml-1">N</span>
              </button>
              <button className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs rounded-lg transition-colors">
                <MessageSquare className="w-3.5 h-3.5" /> Comment
              </button>
            </div>
          </div>

          {/* Preview Content */}
          <div className="flex-1 overflow-y-auto p-6 hide-scrollbar">
            <PreviewContent item={selected} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Preview Content (format-specific) ── */
function PreviewContent({ item }: { item: ApprovalQueueItem }) {
  const client = getActiveClient(item.clientId);
  const firmData = getActiveFirmData();
  const managingPartner = firmData.team[0];

  if (item.format === "xlsx") {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* AI Analysis */}
        <div className="p-4 rounded-lg border border-brand-primary/20 bg-brand-primary/5">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-brand-primary" />
            <span className="text-xs font-bold text-brand-primary">AI Analysis</span>
          </div>
          {item.highlights.map((h, i) => (
            <div key={i} className="flex items-start gap-2 mt-1">
              <AlertTriangle className="w-3 h-3 text-amber-400 mt-0.5 shrink-0" />
              <span className="text-sm text-zinc-300">{h}</span>
            </div>
          ))}
        </div>

        {/* Mock Spreadsheet */}
        <div className="border border-zinc-800 rounded-lg overflow-hidden font-mono text-xs bg-[#0a0a0a]">
          <div className="grid grid-cols-5 bg-zinc-900/80 border-b border-zinc-800 text-zinc-500">
            <div className="p-2.5 border-r border-zinc-800 w-8" />
            <div className="p-2.5 border-r border-zinc-800 font-bold">Account</div>
            <div className="p-2.5 border-r border-zinc-800 font-bold text-right">This Month</div>
            <div className="p-2.5 border-r border-zinc-800 font-bold text-right">Last Month</div>
            <div className="p-2.5 font-bold text-right">Change</div>
          </div>
          {[
            ["Revenue", client?.metrics["Monthly Revenue"] || "$28,400", "$25,300", "+12.2%", false],
            ["Cost of Goods", client?.metrics["COGS"] ? `${client.metrics["COGS"]}` : "$8,832", "$7,590", "+16.4%", true],
            ["Gross Profit", "$19,568", "$17,710", "+10.5%", false],
            ["Operating Expenses", "$12,200", "$11,800", "+3.4%", false],
            ["Net Income", client?.metrics["Net Income"] || "$4,156", "$3,410", "+21.9%", false],
          ].map((row, i) => (
            <div key={i} className={`grid grid-cols-5 border-b border-zinc-800/50 ${row[4] ? "bg-amber-500/5" : "hover:bg-zinc-800/30"} transition-colors`}>
              <div className="p-2.5 border-r border-zinc-800 text-zinc-600 bg-zinc-900/30 text-center">{i + 1}</div>
              <div className={`p-2.5 border-r border-zinc-800 ${row[4] ? "text-amber-300 font-medium" : "text-zinc-300"}`}>{row[0]}</div>
              <div className="p-2.5 border-r border-zinc-800 text-right text-zinc-400 num">{row[1]}</div>
              <div className="p-2.5 border-r border-zinc-800 text-right text-zinc-500 num">{row[2]}</div>
              <div className={`p-2.5 text-right num ${String(row[3]).includes("+") ? "text-emerald-400" : "text-red-400"}`}>{row[3]}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (item.format === "email") {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="p-6 rounded-lg border border-zinc-800 bg-[#0a0a0a] space-y-4">
          <div className="space-y-2 pb-4 border-b border-zinc-800">
            <div className="flex items-center gap-2 text-xs text-zinc-500"><span className="font-bold w-10">To:</span> <span className="text-zinc-300">{client?.contact.email}</span></div>
            <div className="flex items-center gap-2 text-xs text-zinc-500"><span className="font-bold w-10">From:</span> <span className="text-zinc-300">{managingPartner?.name.toLowerCase().replace(/\s+/g, "")}@{firmData.firm.id}.com</span></div>
            <div className="flex items-center gap-2 text-xs text-zinc-500"><span className="font-bold w-10">Subject:</span> <span className="text-zinc-200 font-medium">{item.title}</span></div>
          </div>
          <div className="text-sm text-zinc-300 leading-relaxed space-y-3">
            <p>Dear {client?.contact.name.split(" ")[0]},</p>
            <p>Your update on <span className="text-zinc-200">{client?.name}</span> is ready for review. Key highlights below:</p>
            {item.highlights.map((h, i) => (
              <div key={i} className="flex items-start gap-2 pl-4">
                <span className="text-zinc-500">-</span>
                <span>{h}</span>
              </div>
            ))}
            <p>Please don&apos;t hesitate to reach out if you have any questions.</p>
            <p className="text-zinc-400">Best regards,<br />{managingPartner?.name}<br />{firmData.firm.name}</p>
          </div>
          <div className="pt-4 border-t border-zinc-800">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-brand-primary" />
              <span className="text-[10px] text-zinc-500">Tone: <strong className="text-zinc-400">{client?.preferences.tone}</strong> (per client preference)</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default: docx preview
  return (
    <div className="max-w-3xl mx-auto">
      <div className="p-4 rounded-lg border border-brand-primary/20 bg-brand-primary/5 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-brand-primary" />
          <span className="text-xs font-bold text-brand-primary">AI Analysis</span>
        </div>
        {item.highlights.map((h, i) => (
          <div key={i} className="text-sm text-zinc-300 mt-1">- {h}</div>
        ))}
      </div>
      <div className="p-10 rounded-lg border border-zinc-800 bg-[#0a0a0a] min-h-[500px]">
        <h1 className="text-2xl font-black text-zinc-100 mb-2">{item.title}</h1>
        <p className="text-xs text-zinc-500 mb-6">Prepared for {client?.name} · {item.createdAt} · Version {item.version}</p>
        <div className="text-sm text-zinc-400 leading-relaxed space-y-4">
          <p>This document has been automatically generated based on the latest data synced from {client?.integrationLabel ?? "connected integrations"} and historical patterns for {client?.name}.</p>
          <p>Key areas flagged for your review are highlighted in the analysis panel above.</p>
          <div className="h-40 bg-zinc-900/50 rounded-lg border border-zinc-800 flex items-center justify-center">
            <span className="text-xs text-zinc-600">[Document content preview]</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfidenceBadge({ value }: { value: number }) {
  const color = value >= 90 ? "text-emerald-400 bg-emerald-500/10" : value >= 80 ? "text-blue-400 bg-blue-500/10" : "text-amber-400 bg-amber-500/10";
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded num ${color}`}>{value}%</span>;
}
