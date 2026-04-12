"use client";

import {
  Presentation, FileSpreadsheet, Bold, Italic, Share2, Maximize2,
  LineChart, Command, ArrowRight,
} from "lucide-react";
import type { ViewState } from "@/app/dashboard/layout";
import { getActiveClient, getActiveMember } from "@/data/firms";

export function WorkstreamView({
  clientId,
  currentView,
}: {
  clientId: string;
  currentView: ViewState;
}) {
  const client = getActiveClient(clientId);
  const isBoardDeck = currentView === "workstream_board_deck";
  const activeClient = client?.name || "Client";
  const lead = client ? getActiveMember(client.assignedTo) : null;

  return (
    <div className="absolute inset-0 flex">
      {/* Left Pane: Document/Editor */}
      <div className="flex-1 flex flex-col bg-[#0a0a0a] border-r border-zinc-800/80">
        {/* Toolbar */}
        <div className="h-12 border-b border-zinc-800/80 flex items-center px-4 gap-2 shrink-0 bg-[#050505]">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
            {isBoardDeck ? <Presentation className="w-4 h-4" style={{ color: client?.color }} /> : <FileSpreadsheet className="w-4 h-4" style={{ color: client?.color }} />}
            {isBoardDeck ? `${activeClient.replace(/[^a-zA-Z0-9]/g, "_")}_Board_Deck.pptx` : `${activeClient.replace(/[^a-zA-Z0-9]/g, "_")}_Financials.xlsx`}
          </div>
          <div className="flex-1" />
          <button className="w-8 h-8 rounded hover:bg-zinc-800 flex items-center justify-center text-zinc-400"><Bold className="w-4 h-4" /></button>
          <button className="w-8 h-8 rounded hover:bg-zinc-800 flex items-center justify-center text-zinc-400"><Italic className="w-4 h-4" /></button>
          <div className="w-px h-4 bg-zinc-800 mx-1" />
          <button className="w-8 h-8 rounded hover:bg-zinc-800 flex items-center justify-center text-zinc-400"><Share2 className="w-4 h-4" /></button>
          <button className="w-8 h-8 rounded hover:bg-zinc-800 flex items-center justify-center text-zinc-400"><Maximize2 className="w-4 h-4" /></button>
        </div>

        {/* Editor Content */}
        <div className="flex-1 overflow-auto p-8 bg-[#050505]">
          {isBoardDeck ? (
            <div className="max-w-3xl mx-auto bg-[#0a0a0a] border border-zinc-800 p-16 rounded-sm shadow-xl min-h-[800px]">
              <h1 className="text-4xl font-black text-zinc-100 mb-8 tracking-tight">{activeClient} Q1 Board Update</h1>
              <p className="text-zinc-400 mb-6 leading-relaxed text-lg">
                Following the successful migration of our core infrastructure, we have observed a significant reduction in operational expenditure, specifically within our cloud hosting environments.
              </p>
              <div className="h-64 bg-zinc-900/50 rounded-xl border border-zinc-800 flex flex-col items-center justify-center mb-6">
                <LineChart className="w-12 h-12 text-zinc-600 mb-4" />
                <span className="text-sm text-zinc-500 font-medium">[Chart: Burn Rate Trajectory]</span>
              </div>
              <p className="text-zinc-400 leading-relaxed text-lg">
                This 13.7% reduction in cloud OpEx directly contributes to our improved EBITDA margins, positioning us favorably for the upcoming Series B discussions.
              </p>
            </div>
          ) : (
            <div className="w-full border border-zinc-800 rounded-sm overflow-hidden font-mono text-xs bg-[#0a0a0a]">
              <div className="grid grid-cols-5 bg-zinc-900/80 border-b border-zinc-800 text-zinc-500">
                <div className="p-3 border-r border-zinc-800 text-center w-12" />
                <div className="p-3 border-r border-zinc-800 text-center font-bold">Metric</div>
                <div className="p-3 border-r border-zinc-800 text-center font-bold">Q1 Actual</div>
                <div className="p-3 border-r border-zinc-800 text-center font-bold">Q2 Proj</div>
                <div className="p-3 text-center font-bold">Variance</div>
              </div>
              {[
                ["Revenue", "$1,240,500", "$1,450,000", "+16.8%"],
                ["COGS", "$320,000", "$340,000", "+6.2%"],
                ["Gross Margin", "74.2%", "76.5%", "+2.3%"],
                ["OpEx (Cloud)", "$145,000", "$125,000", "-13.7%"],
                ["OpEx (Payroll)", "$450,000", "$480,000", "+6.6%"],
                ["EBITDA", "$325,500", "$505,000", "+55.1%"],
              ].map((row, i) => (
                <div key={i} className="grid grid-cols-5 border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                  <div className="p-3 border-r border-zinc-800 text-center text-zinc-600 bg-zinc-900/30">{i + 1}</div>
                  <div className="p-3 border-r border-zinc-800 text-zinc-300">{row[0]}</div>
                  <div className="p-3 border-r border-zinc-800 text-right text-zinc-400">{row[1]}</div>
                  <div className="p-3 border-r border-zinc-800 text-right text-zinc-400">{row[2]}</div>
                  <div className={`p-3 text-right ${(row[3].startsWith("+") && i !== 3) || (row[3].startsWith("-") && i === 3) ? "text-emerald-400" : "text-amber-400"}`}>
                    {row[3]}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Pane: Workstream Thread */}
      <div className="w-96 flex flex-col bg-[#050505] shrink-0">
        <div className="h-12 border-b border-zinc-800/80 flex items-center px-4 gap-4 shrink-0 bg-[#0a0a0a]">
          <button className="text-sm font-medium text-zinc-200 border-b-2 border-brand-primary h-full px-2">Thread</button>
          <button className="text-sm font-medium text-zinc-500 hover:text-zinc-300 h-full px-2">Data Sources</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 hide-scrollbar">
          {/* AI Message */}
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center shrink-0 border border-zinc-700">
              <Command className="w-4 h-4 text-zinc-300" />
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-bold text-zinc-200">Practiq</span>
                <span className="text-[10px] text-zinc-600">1h ago</span>
              </div>
              <div className="text-sm text-zinc-300 leading-relaxed bg-zinc-900/50 p-3 rounded-xl rounded-tl-sm border border-zinc-800/50">
                I&apos;ve drafted the initial slides based on the Q1 Financials. The 13.7% reduction in Cloud OpEx is highlighted as requested.
                <br /><br />
                Would you like me to pull in the specific AWS invoice details from QuickBooks to support this slide?
              </div>
              <div className="flex gap-2 mt-2">
                <button className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 rounded-lg transition-colors">Yes, add details</button>
                <button className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 rounded-lg transition-colors">No, keep it high-level</button>
              </div>
            </div>
          </div>

          {/* Team Message — uses real assigned lead */}
          {lead && (
            <div className="flex gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white"
                style={{ backgroundColor: lead.avatarColor }}
              >
                {lead.initials}
              </div>
              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-bold text-zinc-200">{lead.name}</span>
                  <span className="text-xs text-zinc-600">10m ago</span>
                </div>
                <div className="text-sm text-zinc-300 leading-relaxed">
                  Looks good. Let&apos;s keep it high-level for the main deck, but put any detailed breakdowns in the appendix.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-zinc-800/80 bg-[#0a0a0a]">
          <div className="relative">
            <textarea
              placeholder="Reply or ask AI to modify document..."
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-3 pr-10 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 resize-none min-h-[80px]"
              rows={2}
            />
            <button className="absolute right-2 bottom-2 w-8 h-8 rounded-lg bg-zinc-200 hover:bg-white flex items-center justify-center text-zinc-950 transition-colors">
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
