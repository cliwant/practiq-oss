"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion } from "motion/react";
import {
  ShieldAlert, Clock, Users as TeamIcon, Cpu, ArrowRight, Sparkles,
  FileSpreadsheet, FileText, Mail, AlertTriangle, CheckCircle2,
  Send, ChevronRight,
} from "lucide-react";
import { getActiveFirmData } from "@/lib/firm-context";
import { getActiveGlobalAgentBriefing } from "@/data/firms";
import type {
  BriefingMessage, AttentionSeverity, AttentionItem,
  ApprovalQueueItem, TeamMember, AITask,
} from "@/data/mock-data";
import type { ViewState } from "@/app/dashboard/layout";

/**
 * Home view — firm-wide command center.
 *
 * The new default landing when a user enters a firm. Shows:
 *  - Today's Priorities (critical attention items across all clients)
 *  - Pending Review (firm-wide approval queue summary)
 *  - AI Working Now (live ticker of what the agent is doing)
 *  - Team Pulse (per-member open workload)
 *  - Global Agent Chat (right side panel) — ask cross-client questions
 *
 * Every priority card deep-links to the underlying client workspace so the
 * user can drill in without losing context.
 */
export function HomeView({
  onEnterClient,
  onViewChange,
}: {
  /** Navigate into a specific client's Agent Thread (client-scoped view) */
  onEnterClient: (clientId: string) => void;
  /** Navigate to a different firm-scoped view (home / team / approvals) */
  onViewChange: (view: ViewState) => void;
}) {
  const firmData = getActiveFirmData();
  const managingPartner = firmData.team[0];
  const firstName = managingPartner?.name.split(" ")[0] ?? "there";
  const today = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  }, []);

  // Critical + high severity attention items are the "today's priorities" cut
  const priorityItems = useMemo(
    () =>
      firmData.attentionItems
        .filter((a) => a.severity === "critical" || a.severity === "high")
        .slice(0, 6),
    [firmData]
  );

  const pendingApprovals = useMemo(
    () => firmData.approvalQueue.filter((a) => a.status === "pending"),
    [firmData]
  );

  const runningAiTasks = useMemo(
    () => firmData.aiTasks.filter((t) => t.status === "running"),
    [firmData]
  );

  return (
    <div className="absolute inset-0 flex bg-[#050505]">
      {/* Left / main panel — priorities, approvals, team, AI */}
      <div className="flex-1 overflow-y-auto hide-scrollbar px-8 lg:px-12 py-10">
        <div className="max-w-3xl mx-auto space-y-10">
          {/* Greeting */}
          <header className="space-y-2">
            <div className="text-xs font-medium text-zinc-500 uppercase tracking-widest">
              {today} · {firmData.firm.name}
            </div>
            <h1 className="text-3xl lg:text-4xl font-black text-zinc-100 tracking-tight">
              Good morning, {firstName}.
            </h1>
            <p className="text-sm text-zinc-400">
              Here&apos;s your firm across all {firmData.firm.totalClientCount} {firmData.config.labels.clientWordPlural.toLowerCase()}.
              Practiq has been running overnight.
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              {priorityItems.length === 0
                ? "All caught up. Your clients are in good hands."
                : `${priorityItems.length} ${priorityItems.length === 1 ? "item needs" : "items need"} your attention today.`}
            </p>
          </header>

          {/* Today's Priorities */}
          <section>
            <SectionHeader
              icon={<ShieldAlert className="w-4 h-4 text-red-400" />}
              title="Today's priorities"
              count={priorityItems.length}
            />
            {priorityItems.length === 0 ? (
              <EmptyCard>No urgent items this morning.</EmptyCard>
            ) : (
              <div className="space-y-2.5">
                {priorityItems.map((item) => (
                  <PriorityCard
                    key={item.id}
                    item={item}
                    onClick={() => item.clientId && onEnterClient(item.clientId)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Pending review — compact summary */}
          <section>
            <SectionHeader
              icon={<Clock className="w-4 h-4 text-amber-400" />}
              title="Pending review"
              count={pendingApprovals.length}
              action={
                <button
                  onClick={() => onViewChange("approval_queue")}
                  className="text-xs text-zinc-500 hover:text-zinc-200 transition-colors flex items-center gap-1"
                >
                  Open queue <ArrowRight className="w-3 h-3" />
                </button>
              }
            />
            <div className="space-y-2">
              {pendingApprovals.slice(0, 4).map((item) => (
                <ApprovalRow
                  key={item.id}
                  item={item}
                  clientName={
                    firmData.clients.find((c) => c.id === item.clientId)?.name ?? item.clientId
                  }
                  onClick={() => onEnterClient(item.clientId)}
                />
              ))}
              {pendingApprovals.length > 4 && (
                <button
                  onClick={() => onViewChange("approval_queue")}
                  className="w-full text-left px-4 py-2.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  + {pendingApprovals.length - 4} more items in Approval Queue
                </button>
              )}
            </div>
          </section>

          {/* Team Pulse */}
          <section>
            <SectionHeader
              icon={<TeamIcon className="w-4 h-4 text-indigo-400" />}
              title="Team pulse"
              action={
                <button
                  onClick={() => onViewChange("team")}
                  className="text-xs text-zinc-500 hover:text-zinc-200 transition-colors flex items-center gap-1"
                >
                  Open team <ArrowRight className="w-3 h-3" />
                </button>
              }
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {firmData.team.slice(0, 6).map((member) => {
                const overview = firmData.weeklyOverview.teamWorkload.find(
                  (t) => t.memberId === member.id
                );
                return <TeamMemberRow key={member.id} member={member} workload={overview} />;
              })}
            </div>
          </section>

          {/* AI Working Now */}
          <section>
            <SectionHeader
              icon={<Cpu className="w-4 h-4 text-emerald-400" />}
              title="AI working now"
              count={runningAiTasks.length}
            />
            <div className="space-y-2">
              {runningAiTasks.map((task) => (
                <AITaskRow key={task.id} task={task} />
              ))}
              {runningAiTasks.length === 0 && (
                <EmptyCard>Agent idle. All queued work has completed.</EmptyCard>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Right panel — Global Agent Chat */}
      <GlobalAgentPanel firmName={firmData.firm.name} />
    </div>
  );
}

/* ── Subcomponents ── */

function SectionHeader({
  icon, title, count, action,
}: {
  icon: React.ReactNode;
  title: string;
  count?: number;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-sm font-bold text-zinc-100">{title}</h2>
        {typeof count === "number" && (
          <span className="text-[10px] font-bold text-zinc-500 tabular-nums">{count}</span>
        )}
      </div>
      {action}
    </div>
  );
}

function EmptyCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/30 px-4 py-3 text-xs text-zinc-500">
      {children}
    </div>
  );
}

function PriorityCard({
  item,
  onClick,
}: {
  item: AttentionItem;
  onClick: () => void;
}) {
  const firmData = getActiveFirmData();
  const client = item.clientId
    ? firmData.clients.find((c) => c.id === item.clientId)
    : null;

  const severityLabel: Record<AttentionSeverity, string> = {
    critical: "Critical",
    high: "High",
    medium: "Medium",
    low: "Low",
  };
  const severityColor: Record<AttentionSeverity, string> = {
    critical: "text-red-400",
    high: "text-amber-400",
    medium: "text-zinc-400",
    low: "text-zinc-500",
  };

  return (
    <button
      onClick={onClick}
      disabled={!item.clientId}
      className="w-full group flex items-start gap-3 rounded-lg border border-zinc-800/80 bg-[#0a0a0a] hover:border-zinc-600 hover:bg-zinc-900/60 px-4 py-3.5 text-left transition-colors disabled:cursor-default disabled:hover:border-zinc-800/80"
    >
      <div className="w-8 h-8 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
        <AlertTriangle className={`w-3.5 h-3.5 ${severityColor[item.severity]}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-zinc-100 truncate">{item.title}</span>
          <span className={`text-[9px] font-bold uppercase tracking-widest ${severityColor[item.severity]}`}>
            {severityLabel[item.severity]}
          </span>
        </div>
        <div className="text-xs text-zinc-500 leading-relaxed line-clamp-2">{item.description}</div>
        <div className="flex items-center gap-3 mt-2 text-[10px] text-zinc-600">
          {client && <span className="text-zinc-500">{client.name}</span>}
          {item.dueDate && (
            <>
              {client && <span>·</span>}
              <span className="text-amber-400/70">Due {item.dueDate}</span>
            </>
          )}
          {item.detectedAt && (
            <>
              <span>·</span>
              <span>{item.detectedAt}</span>
            </>
          )}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-zinc-400 transition-colors shrink-0 mt-2" />
    </button>
  );
}

function ApprovalRow({
  item,
  clientName,
  onClick,
}: {
  item: ApprovalQueueItem;
  clientName: string;
  onClick: () => void;
}) {
  const FormatIcon =
    item.format === "xlsx"
      ? FileSpreadsheet
      : item.format === "email"
        ? Mail
        : FileText;
  return (
    <button
      onClick={onClick}
      className="w-full group flex items-center gap-3 rounded-lg border border-zinc-800/60 bg-[#0a0a0a] hover:border-zinc-600 px-4 py-3 text-left transition-colors"
    >
      <FormatIcon className="w-4 h-4 text-zinc-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-sm text-zinc-200 truncate">{item.title}</div>
        <div className="text-[10px] text-zinc-600 truncate">
          {clientName} · waiting {item.waitingSince}
        </div>
      </div>
      <div className="text-[10px] font-bold text-zinc-500 tabular-nums shrink-0">
        {item.aiConfidence}%
      </div>
      <ChevronRight className="w-3.5 h-3.5 text-zinc-700 group-hover:text-zinc-400 transition-colors shrink-0" />
    </button>
  );
}

function TeamMemberRow({
  member,
  workload,
}: {
  member: TeamMember;
  workload?: { completed: number; total: number };
}) {
  const pct = workload ? Math.round((workload.completed / workload.total) * 100) : 0;
  return (
    <div className="flex items-center gap-3 rounded-lg border border-zinc-800/60 bg-[#0a0a0a] px-3.5 py-3">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
        style={{ backgroundColor: member.avatarColor }}
      >
        {member.initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-zinc-100 truncate">{member.name}</div>
        <div className="text-[10px] text-zinc-500 truncate">{member.role}</div>
      </div>
      {workload && (
        <div className="text-right shrink-0">
          <div className="text-xs font-bold text-zinc-200 tabular-nums">
            {workload.completed}/{workload.total}
          </div>
          <div className="text-[9px] text-zinc-600 uppercase tracking-widest">{pct}%</div>
        </div>
      )}
    </div>
  );
}

function AITaskRow({ task }: { task: AITask }) {
  const pct = Math.round((task.progress / task.total) * 100);
  return (
    <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/30 px-4 py-3">
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-sm text-zinc-200 truncate">{task.title}</div>
        <div className="text-[10px] text-zinc-500 tabular-nums shrink-0">
          {task.progress.toLocaleString()}/{task.total.toLocaleString()} {task.unit}
        </div>
      </div>
      <div className="h-0.5 rounded-full bg-zinc-800 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-emerald-500/70"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
      {task.estimatedRemaining && (
        <div className="text-[10px] text-zinc-600 mt-1.5">Est {task.estimatedRemaining} remaining</div>
      )}
    </div>
  );
}

/* ── Global Agent Panel (right side) ── */

function GlobalAgentPanel({ firmName }: { firmName: string }) {
  const [messages, setMessages] = useState<BriefingMessage[]>(() =>
    getActiveGlobalAgentBriefing("morning-briefing")
  );
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset briefing when the firm changes
  useEffect(() => {
    setMessages(getActiveGlobalAgentBriefing("morning-briefing"));
  }, [firmName]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSuggestion = useCallback((slug: string, label: string) => {
    const userMsg: BriefingMessage = {
      id: `user-${Date.now()}`,
      type: "user",
      senderId: "user",
      timestamp: "Just now",
      content: label,
    };
    setMessages((prev) => [...prev, userMsg]);
    setTimeout(() => {
      const reply = getActiveGlobalAgentBriefing(slug);
      setMessages((prev) => [...prev, ...reply]);
    }, 600);
  }, []);

  const handleSend = useCallback(() => {
    if (!input.trim()) return;
    const userMsg: BriefingMessage = {
      id: `user-${Date.now()}`,
      type: "user",
      senderId: "user",
      timestamp: "Just now",
      content: input.trim(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setTimeout(() => {
      const reply: BriefingMessage = {
        id: `ai-${Date.now()}`,
        type: "ai-response",
        senderId: "ai",
        timestamp: "Just now",
        content:
          "I looked across the firm for this. Based on current data, I don't have a scripted answer for that specific question in this mockup — but in production I'd pull from every client's knowledge base and recent activity to answer.",
      };
      setMessages((prev) => [...prev, reply]);
    }, 800);
  }, [input]);

  return (
    <aside className="w-[380px] xl:w-[420px] border-l border-zinc-800/80 bg-[#080808] flex flex-col shrink-0">
      {/* Header */}
      <div className="h-14 border-b border-zinc-800/80 px-5 flex items-center gap-2.5 shrink-0">
        <Sparkles className="w-4 h-4 text-zinc-400" />
        <span className="text-sm font-semibold text-zinc-100">Ask across your firm</span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto hide-scrollbar px-5 py-5 space-y-4">
        {messages.map((msg) => (
          <GlobalAgentMessage key={msg.id} msg={msg} />
        ))}
      </div>

      {/* Suggested questions */}
      <div className="px-5 pb-3 shrink-0">
        <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-2">Try asking</div>
        <div className="flex flex-col gap-1.5">
          <SuggestionChip
            label="How are all my clients doing?"
            onClick={() => handleSuggestion("client-status", "How are all my clients doing?")}
          />
          <SuggestionChip
            label="What's my team's workload this week?"
            onClick={() => handleSuggestion("team-workload", "What's my team's workload this week?")}
          />
        </div>
      </div>

      {/* Input */}
      <div className="px-5 py-4 border-t border-zinc-800/80 shrink-0 bg-[#050505]">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask anything across your firm..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-4 pr-11 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="absolute right-1.5 top-1.5 w-8 h-8 rounded-lg bg-zinc-200 hover:bg-white disabled:opacity-40 disabled:hover:bg-zinc-200 flex items-center justify-center text-zinc-950 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}

function SuggestionChip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-left px-3 py-2 rounded-lg border border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-800/60 hover:border-zinc-700 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
    >
      {label}
    </button>
  );
}

function GlobalAgentMessage({ msg }: { msg: BriefingMessage }) {
  // User messages render right-aligned in a bubble (iMessage-style)
  if (msg.senderId === "user" || msg.type === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] px-3.5 py-2 rounded-2xl rounded-tr-sm bg-zinc-200 text-zinc-900 text-sm leading-relaxed">
          {msg.content}
        </div>
      </div>
    );
  }

  // Briefing with highlights: card with bullet list
  if (msg.type === "briefing" && msg.metadata?.highlights) {
    return (
      <div className="flex gap-2.5">
        <div className="w-7 h-7 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <p
            className="text-sm text-zinc-200 leading-relaxed"
            dangerouslySetInnerHTML={{
              __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong class="text-zinc-100">$1</strong>'),
            }}
          />
          <ul className="space-y-2 pl-0">
            {msg.metadata.highlights.map((h, i) => (
              <li key={i} className="flex gap-2.5 text-xs text-zinc-400 leading-relaxed">
                <CheckCircle2 className="w-3 h-3 text-emerald-500/70 shrink-0 mt-0.5" />
                <span
                  dangerouslySetInnerHTML={{
                    __html: h.replace(/\*\*(.*?)\*\*/g, '<strong class="text-zinc-200">$1</strong>'),
                  }}
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  // Plain AI message — paragraph text (left-aligned, Sparkles icon)
  return (
    <div className="flex gap-2.5">
      <div className="w-7 h-7 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
        <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line"
          dangerouslySetInnerHTML={{
            __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong class="text-zinc-100">$1</strong>'),
          }}
        />
      </div>
    </div>
  );
}
