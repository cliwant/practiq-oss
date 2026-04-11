"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  Sparkles, AlertTriangle, FileText,
  FileSpreadsheet, Mail, CheckCircle2, ArrowRight,
  Plus, AtSign, Loader2,
  Users, Lock, Hash, Plus as PlusIcon,
} from "lucide-react";
import {
  type BriefingMessage, type Channel,
} from "@/data/mock-data";
import {
  getActiveClient,
  getActiveMember,
  getActiveClientBriefing,
  getActiveClientChannels,
  getActiveLiveAlerts,
} from "@/data/firms";
import { getActiveFirmData } from "@/lib/firm-context";
import {
  getSessionClient,
  getSessionClientOnboardingBriefing,
} from "@/lib/session-clients";
import type { ViewState } from "@/app/dashboard/layout";

type MessageState = "approved" | "rejected" | "dismissed" | "active";

export function AgentThreadView({
  clientId,
  clientSwitchCount,
  onViewChange,
}: {
  clientId: string;
  clientSwitchCount: number;
  onViewChange: (v: ViewState) => void;
}) {
  // Check session-added clients first, then fall back to the firm's
  // static clients. Session clients get a scripted onboarding briefing
  // instead of the default stitched one.
  const sessionClient = getSessionClient(clientId);
  const client = sessionClient ?? getActiveClient(clientId);
  const channels = useMemo(() => getActiveClientChannels(clientId), [clientId]);
  const [activeChannelId, setActiveChannelId] = useState<string>(channels[0]?.id || "");
  const [messages, setMessages] = useState<BriefingMessage[]>([]);
  const [visibleCount, setVisibleCount] = useState(0);
  const [messageStates, setMessageStates] = useState<Record<string, MessageState>>({});
  const [userInput, setUserInput] = useState("");
  const [showMentionPopup, setShowMentionPopup] = useState(false);
  const [openDocId, setOpenDocId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const openDoc = openDocId ? messages.find((m) => m.id === openDocId) : null;

  // When client switches, reset to default channel
  useEffect(() => {
    setActiveChannelId(channels[0]?.id || "");
  }, [clientId, channels]);

  // Generate briefing when client OR channel changes. Session clients use
  // the generated onboarding briefing; firm clients use the stitched one.
  useEffect(() => {
    const briefing = sessionClient
      ? getSessionClientOnboardingBriefing(sessionClient, getActiveFirmData().firm.name)
      : getActiveClientBriefing(clientId, activeChannelId);
    setMessages(briefing);
    setVisibleCount(0);
    setMessageStates({});

    // Stagger initial briefing messages
    let count = 0;
    const interval = setInterval(() => {
      count++;
      setVisibleCount(count);
      if (count >= briefing.length) clearInterval(interval);
    }, 400);

    // Live alerts only on team channel
    const isTeamChannel = activeChannelId.includes("team");
    const liveAlerts = isTeamChannel ? getActiveLiveAlerts(clientId) : [];
    const timers: NodeJS.Timeout[] = [];
    liveAlerts.forEach((alert) => {
      const timer = setTimeout(() => {
        setMessages((prev) => [...prev, alert.message]);
        setVisibleCount((prev) => prev + 1);
      }, alert.delayMs);
      timers.push(timer);
    });

    return () => {
      clearInterval(interval);
      timers.forEach(clearTimeout);
    };
  }, [clientId, activeChannelId, clientSwitchCount]);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [visibleCount]);

  const handleAction = (msgId: string, action: "approve" | "reject" | "dismiss") => {
    const newState: MessageState = action === "approve" ? "approved" : action === "reject" ? "rejected" : "dismissed";
    setMessageStates((prev) => ({ ...prev, [msgId]: newState }));
  };

  const handleSend = () => {
    if (!userInput.trim()) return;
    const userMsg: BriefingMessage = {
      id: `user-${Date.now()}`,
      type: "user",
      content: userInput,
      timestamp: "Just now",
    };
    setMessages((prev) => [...prev, userMsg]);
    setVisibleCount((prev) => prev + 1);
    setUserInput("");

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: BriefingMessage = {
        id: `ai-${Date.now()}`,
        type: "ai-response",
        content: `I'll look into that for **${client?.name}**. Based on the current context — ${client?.workflowStatusLabel ?? client?.monthlyCloseStatus ?? "in progress"}, ${client?.integrationStatus === "synced" ? `${client?.integrationLabel ?? "integrations"} in sync` : "integrations need attention"} — let me analyze this and get back to you with specifics.`,
        timestamp: "Just now",
      };
      setMessages((prev) => [...prev, aiResponse]);
      setVisibleCount((prev) => prev + 1);
    }, 1200);
  };

  const visibleMessages = messages.slice(0, visibleCount);

  return (
    <div className="absolute inset-0 flex flex-col bg-[#050505]">
      {/* Document preview modal */}
      {openDoc && (
        <DocumentPreviewModal
          msg={openDoc}
          onClose={() => setOpenDocId(null)}
          onApprove={() => {
            handleAction(openDoc.id, "approve");
            setOpenDocId(null);
          }}
          onReject={() => {
            handleAction(openDoc.id, "reject");
            setOpenDocId(null);
          }}
        />
      )}

      {/* Channel switcher bar */}
      <ChannelBar
        channels={channels}
        activeChannelId={activeChannelId}
        onSelect={setActiveChannelId}
      />

      {/* Thread Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-8 space-y-5 hide-scrollbar relative">

        {/* Messages */}
        {visibleMessages.map((msg) => {
          const state = messageStates[msg.id] || "active";
          return (
            <div key={msg.id} className="max-w-3xl 2xl:max-w-4xl mx-auto animate-fade-in">
              {msg.type === "briefing" && <BriefingCard msg={msg} client={client} />}
              {msg.type === "team-handoff" && <TeamHandoffCard msg={msg} />}
              {msg.type === "anomaly-alert" && <AnomalyCard msg={msg} state={state} onAction={(a) => handleAction(msg.id, a)} />}
              {msg.type === "approval-request" && <ApprovalCard msg={msg} state={state} onAction={(a) => handleAction(msg.id, a)} onViewApprovals={() => onViewChange("approval_queue")} />}
              {msg.type === "team-update" && <TeamUpdateCard msg={msg} />}
              {msg.type === "user" && <UserMessage msg={msg} />}
              {msg.type === "ai-response" && <AIResponseMessage msg={msg} />}
              {msg.type === "document-generated" && <DocumentInThreadCard msg={msg} state={state} onAction={(a) => handleAction(msg.id, a)} onOpen={() => setOpenDocId(msg.id)} />}
              {msg.type === "document-shared" && <DocumentInThreadCard msg={msg} state={state} onAction={(a) => handleAction(msg.id, a)} onOpen={() => setOpenDocId(msg.id)} />}
            </div>
          );
        })}

        {/* Typing indicator */}
        {visibleCount < messages.length && (
          <div className="max-w-3xl 2xl:max-w-4xl mx-auto">
            <div className="flex items-center gap-3 px-1 py-3">
              <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">Firmem is thinking</span>
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-pulse" style={{ animationDelay: "0ms" }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-pulse" style={{ animationDelay: "150ms" }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-pulse" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="px-6 py-4 bg-[#0a0a0a] border-t border-zinc-800/80 relative">
        <div className="max-w-3xl 2xl:max-w-4xl mx-auto relative">
          {/* Mention popup */}
          {showMentionPopup && (
            <div className="absolute bottom-full left-0 mb-2 w-72 rounded-xl border border-zinc-700 bg-[#0f0f10] shadow-2xl shadow-black/60 overflow-hidden z-50">
              <div className="px-3 py-2 border-b border-zinc-800 text-xs text-zinc-500">Mention a teammate</div>
              <div className="py-1">
                {getActiveFirmData().team.slice(0, 5).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setUserInput((prev) => prev + `@${m.name.split(" ")[0]} `);
                      setShowMentionPopup(false);
                      inputRef.current?.focus();
                    }}
                    className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-zinc-800/60 transition-colors text-left"
                  >
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ backgroundColor: m.avatarColor }}>
                      {m.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-zinc-200 truncate">{m.name}</div>
                      <div className="text-xs text-zinc-500 truncate">{m.role}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="relative">
            <div className="absolute left-3 top-3 flex gap-1">
              <button
                onClick={() => setShowMentionPopup(!showMentionPopup)}
                className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                title="Mention teammate"
              >
                <AtSign className="w-4 h-4" />
              </button>
              <button className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors" title="Attach">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <textarea
              ref={inputRef}
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder={`Ask about ${client?.name || "this client"}, or @mention a teammate...`}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-20 pr-12 py-3 text-base text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700 resize-none min-h-[52px]"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  setShowMentionPopup(false);
                  handleSend();
                }
                if (e.key === "Escape") setShowMentionPopup(false);
              }}
            />
            <button onClick={handleSend} className="absolute right-2 bottom-2 w-9 h-9 rounded-lg bg-zinc-200 hover:bg-white flex items-center justify-center text-zinc-950 transition-colors">
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Channel Bar ── lists channels for a client */
function ChannelBar({
  channels,
  activeChannelId,
  onSelect,
}: {
  channels: Channel[];
  activeChannelId: string;
  onSelect: (id: string) => void;
}) {
  const active = channels.find((c) => c.id === activeChannelId);
  const participants = active?.participantIds.map((id) => getActiveMember(id)).filter(Boolean) || [];

  const channelIcon = (type: Channel["type"]) => {
    switch (type) {
      case "team": return <Users className="w-3.5 h-3.5" />;
      case "private": return <Lock className="w-3.5 h-3.5" />;
      case "topic": return <Hash className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="border-b border-zinc-800/80 bg-[#0a0a0a]">
      {/* Channel tabs */}
      <div className="px-6 pt-3 flex items-center gap-1 overflow-x-auto hide-scrollbar">
        {channels.map((ch) => {
          const isActive = ch.id === activeChannelId;
          return (
            <button
              key={ch.id}
              onClick={() => onSelect(ch.id)}
              className={`flex items-center gap-2 px-3 py-2 text-sm rounded-t-md transition-colors shrink-0 ${
                isActive
                  ? "text-zinc-100 bg-[#050505] border-x border-t border-zinc-800/80 -mb-px"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {channelIcon(ch.type)}
              <span>{ch.name}</span>
              {ch.unreadCount && ch.unreadCount > 0 && !isActive && (
                <span className="text-xs text-zinc-500">{ch.unreadCount}</span>
              )}
            </button>
          );
        })}
        <button className="flex items-center gap-1 px-2 py-2 text-sm text-zinc-600 hover:text-zinc-400 transition-colors shrink-0">
          <PlusIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Channel description + participants */}
      {active && (
        <div className="px-6 py-2.5 flex items-center justify-between">
          <div className="text-xs text-zinc-500 truncate">
            {active.description || `${active.type === "team" ? "Team conversation" : active.type === "private" ? "Just you and Firmem" : "Focused thread"}`}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex -space-x-1.5">
              {participants.map((m) => (
                <div
                  key={m.id}
                  className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[9px] font-medium text-zinc-300"
                  title={m.name}
                >
                  {m.initials}
                </div>
              ))}
              <div
                className="w-5 h-5 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center"
                title="Firmem"
              >
                <Sparkles className="w-2.5 h-2.5 text-zinc-400" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Message Components ── */

function BriefingCard({ msg }: { msg: BriefingMessage; client: ReturnType<typeof getActiveClient> }) {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
        <Sparkles className="w-4 h-4 text-zinc-400" />
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-zinc-300">Firmem</span>
          {msg.metadata?.lastVisit && <span className="text-xs text-zinc-600">last visit {msg.metadata.lastVisit}</span>}
        </div>
        <div className="p-5 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
          <p className="text-base text-zinc-200 mb-4 leading-relaxed" dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong class="text-zinc-100">$1</strong>') }} />
          {msg.metadata?.highlights && (
            <ul className="space-y-1.5 pl-1">
              {msg.metadata.highlights.map((h, i) => (
                <li key={i} className="text-sm text-zinc-400 leading-relaxed flex gap-3">
                  <span className="text-zinc-700 mt-2 inline-block w-1 h-1 rounded-full bg-zinc-700 shrink-0" />
                  <span dangerouslySetInnerHTML={{ __html: h.replace(/\*\*(.*?)\*\*/g, '<strong class="text-zinc-200 font-medium">$1</strong>') }} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function AnomalyCard({
  msg, state, onAction,
}: {
  msg: BriefingMessage;
  state: MessageState;
  onAction: (a: "approve" | "reject" | "dismiss") => void;
  isFresh?: boolean;
}) {
  // Resolved state — collapsed/dimmed
  if (state === "dismissed") {
    return (
      <div className="flex gap-3 opacity-40">
        <div className="w-8 h-8 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
          <CheckCircle2 className="w-4 h-4 text-zinc-600" />
        </div>
        <div className="flex-1 py-1.5">
          <span className="text-sm text-zinc-500">Dismissed</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
        <AlertTriangle className="w-4 h-4 text-zinc-400" />
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-zinc-300">Firmem</span>
          <span className="text-xs text-zinc-600">flagged · {msg.timestamp}</span>
        </div>
        <div className="p-5 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
          <div className="text-base text-zinc-200 leading-relaxed whitespace-pre-line" dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong class="text-zinc-100">$1</strong>') }} />
          {msg.metadata?.actionButtons && (
            <div className="flex gap-2 mt-4">
              {msg.metadata.actionButtons.map((btn, i) => (
                <button
                  key={i}
                  onClick={() => onAction(i === 0 ? "approve" : "dismiss")}
                  className={`text-sm px-4 py-2 rounded-md font-medium transition-colors ${
                    i === 0
                      ? "bg-zinc-100 text-zinc-950 hover:bg-white"
                      : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ApprovalCard({
  msg, state, onAction, onViewApprovals,
}: {
  msg: BriefingMessage;
  state: MessageState;
  onAction: (a: "approve" | "reject") => void;
  onViewApprovals: () => void;
}) {
  const FormatIcon = msg.metadata?.documentFormat === "xlsx" ? FileSpreadsheet : msg.metadata?.documentFormat === "email" ? Mail : FileText;

  // Approved state — collapsed
  if (state === "approved") {
    return (
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
          <CheckCircle2 className="w-4 h-4 text-zinc-500" />
        </div>
        <div className="flex-1 py-1">
          <div className="text-sm text-zinc-400">
            Approved · sent to client
          </div>
        </div>
      </div>
    );
  }

  if (state === "rejected") {
    return (
      <div className="flex gap-3 opacity-50">
        <div className="w-8 h-8 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
          <FormatIcon className="w-4 h-4 text-zinc-500" />
        </div>
        <div className="flex-1 py-1">
          <div className="text-sm text-zinc-500">Returned to AI for revision</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
        <Sparkles className="w-4 h-4 text-zinc-400" />
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-zinc-300">Firmem</span>
          <span className="text-xs text-zinc-600">prepared a draft · {msg.timestamp}</span>
        </div>
        <div className="p-5 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
          <p className="text-base text-zinc-200 mb-4 leading-relaxed" dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong class="text-zinc-100">$1</strong>') }} />
          {msg.metadata?.highlights && (
            <div className="space-y-1.5 mb-4 pl-3 border-l-2 border-zinc-800">
              {msg.metadata.highlights.map((h, i) => (
                <div key={i} className="text-sm text-zinc-400">
                  {h}
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onAction("approve")}
              className="text-sm bg-zinc-100 text-zinc-950 hover:bg-white font-medium px-4 py-2 rounded-md transition-colors"
            >
              Approve
            </button>
            <button
              onClick={() => onAction("reject")}
              className="text-sm text-zinc-300 hover:bg-zinc-800 px-4 py-2 rounded-md transition-colors"
            >
              Request changes
            </button>
            <button onClick={onViewApprovals} className="text-sm text-zinc-400 hover:text-zinc-200 px-4 py-2 transition-colors">
              Open
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TeamUpdateCard({ msg }: { msg: BriefingMessage }) {
  const member = msg.metadata?.teamMemberId ? getActiveMember(msg.metadata.teamMemberId) : null;
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 mt-0.5 text-xs font-medium text-zinc-300">
        {member?.initials || "?"}
      </div>
      <div className="flex-1 py-1">
        <p className="text-sm text-zinc-400 leading-relaxed">
          <span className="text-zinc-300 font-medium">{member?.name || "Team"}</span>{" "}
          <span dangerouslySetInnerHTML={{ __html: msg.content.replace(/^\*\*.*?\*\*\s*/, "").replace(/\*\*(.*?)\*\*/g, '<span class="text-zinc-300">$1</span>') }} />
          <span className="text-zinc-600 ml-2">{msg.timestamp}</span>
        </p>
      </div>
    </div>
  );
}

function TeamHandoffCard({ msg }: { msg: BriefingMessage }) {
  const member = msg.metadata?.teamMemberId ? getActiveMember(msg.metadata.teamMemberId) : null;
  if (!member) return null;
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 mt-0.5 text-xs font-medium text-zinc-300">
        {member.initials}
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-zinc-200">{member.name}</span>
          <span className="text-xs text-zinc-600">{member.role.split(",")[0]} · {msg.timestamp}</span>
        </div>
        <div className="p-5 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
          {msg.metadata?.handoffSubject && (
            <div className="text-xs text-zinc-500 mb-3">Re: {msg.metadata.handoffSubject}</div>
          )}
          <p className="text-base text-zinc-200 leading-relaxed">{msg.content}</p>
          <div className="mt-4 flex items-center gap-2">
            <button className="text-sm bg-zinc-100 text-zinc-950 hover:bg-white font-medium px-4 py-2 rounded-md transition-colors">
              Reply
            </button>
            <button className="text-sm text-zinc-400 hover:text-zinc-200 px-4 py-2 transition-colors">
              Mark resolved
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function UserMessage({ msg }: { msg: BriefingMessage }) {
  // The "user" in the thread is the active firm's managing partner.
  // Render right-aligned in a light bubble (iMessage style) so the
  // user/team/AI distinction is unambiguous at a glance.
  const me = getActiveFirmData().team[0];
  return (
    <div className="flex justify-end gap-3">
      <div className="flex flex-col items-end max-w-[78%]">
        <div className="flex items-center gap-2 mb-1.5 px-1">
          <span className="text-xs text-zinc-600">{msg.timestamp}</span>
          <span className="text-sm font-medium text-zinc-300">{me?.name ?? "Jennifer Hayes"}</span>
        </div>
        <div className="px-4 py-2.5 rounded-2xl rounded-tr-md bg-zinc-200 text-zinc-900 text-base leading-relaxed">
          {msg.content}
        </div>
      </div>
      <div
        className="w-8 h-8 rounded-md border border-zinc-700 flex items-center justify-center shrink-0 mt-6 text-xs font-medium text-white"
        style={{ backgroundColor: me?.avatarColor ?? "#3f3f46" }}
      >
        {me?.initials ?? "JP"}
      </div>
    </div>
  );
}

function AIResponseMessage({ msg }: { msg: BriefingMessage }) {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
        <Sparkles className="w-4 h-4 text-zinc-400" />
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-zinc-300">Firmem</span>
          <span className="text-xs text-zinc-600">{msg.timestamp}</span>
        </div>
        <div className="text-base text-zinc-200 leading-relaxed" dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong class="text-zinc-100 font-medium">$1</strong>') }} />
      </div>
    </div>
  );
}

/* ── Document In-Thread Card ── inline document reference within a message thread */
function DocumentInThreadCard({
  msg,
  state,
  onAction,
  onOpen,
}: {
  msg: BriefingMessage;
  state: MessageState;
  onAction: (a: "approve" | "reject") => void;
  onOpen: () => void;
}) {
  const FormatIcon = msg.metadata?.documentFormat === "xlsx"
    ? FileSpreadsheet
    : msg.metadata?.documentFormat === "email"
    ? Mail
    : FileText;
  const sharedByMember = msg.metadata?.sharedBy && msg.metadata.sharedBy !== "ai" ? getActiveMember(msg.metadata.sharedBy) : null;
  const isAI = msg.metadata?.sharedBy === "ai" || msg.type === "document-generated";

  const isApproved = state === "approved";

  return (
    <div className="flex gap-3">
      {isAI ? (
        <div className="w-8 h-8 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles className="w-4 h-4 text-zinc-400" />
        </div>
      ) : sharedByMember ? (
        <div className="w-8 h-8 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 mt-0.5 text-xs font-medium text-zinc-300">
          {sharedByMember.initials}
        </div>
      ) : null}
      <div className="flex-1 space-y-2">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-zinc-300">
            {isAI ? "Firmem" : sharedByMember?.name}
          </span>
          <span className="text-xs text-zinc-600">
            {msg.type === "document-generated" ? "drafted a document" : "shared a document"} · {msg.timestamp}
          </span>
        </div>

        {/* Inline message text */}
        <p className="text-base text-zinc-200 leading-relaxed">
          {msg.content.replace(/\*\*(.*?)\*\*/g, "$1")}
        </p>

        {/* Document card */}
        <button
          onClick={onOpen}
          className="w-full text-left p-4 rounded-lg bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-colors group"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
              <FormatIcon className="w-5 h-5 text-zinc-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-zinc-100 truncate">
                  {msg.metadata?.documentTitle}
                </span>
                {isApproved && (
                  <span className="text-xs text-zinc-500">Approved</span>
                )}
              </div>
              {msg.metadata?.documentSubtitle && (
                <div className="text-xs text-zinc-500 mt-0.5">{msg.metadata.documentSubtitle}</div>
              )}
              {msg.metadata?.documentHighlights && msg.metadata.documentHighlights.length > 0 && (
                <ul className="mt-3 space-y-1 pl-3 border-l-2 border-zinc-800">
                  {msg.metadata.documentHighlights.map((h, i) => (
                    <li key={i} className="text-xs text-zinc-400">{h}</li>
                  ))}
                </ul>
              )}
            </div>
            <span className="text-xs text-zinc-500 group-hover:text-zinc-300 transition-colors shrink-0">Open</span>
          </div>
        </button>

        {!isApproved && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onAction("approve")}
              className="text-sm bg-zinc-100 text-zinc-950 hover:bg-white font-medium px-4 py-2 rounded-md transition-colors"
            >
              Approve
            </button>
            <button
              onClick={() => onAction("reject")}
              className="text-sm text-zinc-300 hover:bg-zinc-800 px-4 py-2 rounded-md transition-colors"
            >
              Request changes
            </button>
            <button className="text-sm text-zinc-400 hover:text-zinc-200 px-4 py-2 transition-colors">
              Share
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Document Preview Modal ── full preview when user clicks Open */
function DocumentPreviewModal({
  msg,
  onClose,
  onApprove,
  onReject,
}: {
  msg: BriefingMessage;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const format = msg.metadata?.documentFormat || "docx";
  const FormatIcon = format === "xlsx" ? FileSpreadsheet : format === "email" ? Mail : FileText;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/70 backdrop-blur-md" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl max-h-[85vh] rounded-lg border border-zinc-800 bg-[#0a0a0a] flex flex-col overflow-hidden shadow-2xl shadow-black/60"
      >
        {/* Modal header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FormatIcon className="w-5 h-5 text-zinc-400" />
            <div>
              <div className="text-sm font-medium text-zinc-100">{msg.metadata?.documentTitle}</div>
              <div className="text-xs text-zinc-500">{msg.metadata?.documentSubtitle}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 px-3 py-1 text-sm">
            Close
          </button>
        </div>

        {/* Modal body — render based on format and active firm vertical */}
        <div className="flex-1 overflow-y-auto p-8 hide-scrollbar bg-[#050505]">
          {format === "xlsx" && <SpreadsheetPreview />}
          {format === "email" && <EmailPreview />}
          {format === "docx" && <DocPreview />}
          {format === "pdf" && <DocPreview />}
        </div>

        {/* Modal footer */}
        <div className="px-6 py-4 border-t border-zinc-800 flex items-center justify-between">
          <div className="text-xs text-zinc-500">Drafted by Firmem · pending your review</div>
          <div className="flex items-center gap-2">
            <button
              onClick={onReject}
              className="text-sm text-zinc-300 hover:bg-zinc-800 px-4 py-2 rounded-md transition-colors"
            >
              Request changes
            </button>
            <button
              onClick={onApprove}
              className="text-sm bg-zinc-100 text-zinc-950 hover:bg-white font-medium px-4 py-2 rounded-md transition-colors"
            >
              Approve & send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Vertical-aware preview variants ──
 * Each preview reads the active firm's vertical and renders an appropriate
 * mockup. Phase N.4 ships all five: accounting / law / consulting / agency / hr.
 * Accounting is the fallback. */

function SpreadsheetPreview() {
  const vertical = getActiveFirmData().firm.vertical;
  if (vertical === "law") return <LawPrivilegeLogPreview />;
  if (vertical === "consulting") return <ConsultingCohortModelPreview />;
  if (vertical === "agency") return <AgencyCampaignRationalePreview />;
  if (vertical === "hr") return <HRCompBandPreview />;
  return <AccountingPLPreview />;
}

function AccountingPLPreview() {
  const rows = [
    ["", "Account", "March 2026", "February 2026", "Change"],
    ["Revenue", "Food Sales", "$142,000", "$126,800", "+12.0%"],
    ["", "Beverage Sales", "$18,500", "$17,200", "+7.6%"],
    ["", "Total Revenue", "$160,500", "$144,000", "+11.5%"],
    ["COGS", "Meat & Seafood", "$3,100", "$2,950", "+5.1%"],
    ["", "Produce", "$2,800", "$2,750", "+1.8%"],
    ["", "Beverages", "$2,932", "$2,800", "+4.7%"],
    ["", "Total Food Cost", "$8,832", "$8,500", "+3.9%"],
    ["", "Food cost %", "31.2%", "29.5%", "+1.7pp"],
    ["", "Energy", "$2,100", "$1,910", "+10.0%"],
    ["", "Net Income", "$4,156", "$3,890", "+6.8%"],
  ];
  return (
    <div className="max-w-3xl mx-auto">
      <div className="border border-zinc-800 rounded-md overflow-hidden font-mono text-xs">
        {rows.map((row, i) => {
          const isHeader = i === 0;
          const isFlagged = row[1] === "Food cost %" || row[1] === "Energy";
          return (
            <div
              key={i}
              className={`grid grid-cols-[auto_1.5fr_1fr_1fr_1fr] ${isHeader ? "bg-zinc-900 text-zinc-500 font-semibold" : isFlagged ? "bg-zinc-900/40 text-zinc-200" : "text-zinc-400"} ${i > 0 ? "border-t border-zinc-800" : ""}`}
            >
              <div className="p-2.5 w-20 text-xs uppercase tracking-wider text-zinc-500">{row[0]}</div>
              <div className="p-2.5 border-l border-zinc-800">{row[1]}</div>
              <div className="p-2.5 border-l border-zinc-800 text-right">{row[2]}</div>
              <div className="p-2.5 border-l border-zinc-800 text-right">{row[3]}</div>
              <div className="p-2.5 border-l border-zinc-800 text-right">{row[4]}</div>
            </div>
          );
        })}
      </div>
      <div className="mt-6 p-4 rounded-md border border-zinc-800 bg-zinc-900/40">
        <div className="text-xs font-medium text-zinc-500 mb-2">Firmem notes</div>
        <ul className="space-y-1.5 text-sm text-zinc-300">
          <li>• Food cost crossed 31% — first time in 6 months. Driver: Pacific Foods supplier change in Q4.</li>
          <li>• Energy +10% MoM — likely seasonal. Worth confirming there&apos;s no equipment issue.</li>
        </ul>
      </div>
    </div>
  );
}

function LawPrivilegeLogPreview() {
  const rows = [
    ["#", "Date", "Doc Type", "Author / Recipient", "Privilege Claim", "Basis"],
    ["845", "2024-11-02", "Email", "M. Hendrix → Counsel", "Attorney-Client", "Seeking legal advice"],
    ["846", "2024-11-04", "Memo", "Counsel (internal)", "Work-Product", "Deposition prep"],
    ["847", "2024-11-06", "Email chain", "Hendrix + Consultant", "— FLAGGED —", "Outside consultant on chain"],
    ["848", "2024-11-09", "Email", "Counsel → Hendrix", "Attorney-Client", "Providing legal advice"],
    ["1203", "2024-12-15", "Email chain", "Hendrix + Consultant", "— FLAGGED —", "Outside consultant on chain"],
    ["1204", "2024-12-17", "Draft memo", "Counsel (internal)", "Work-Product", "Litigation strategy"],
    ["2018", "2025-02-22", "Unsent draft", "Morgan (counsel)", "— FLAGGED —", "Work-product candidate"],
  ];
  return (
    <div className="max-w-4xl mx-auto">
      <div className="border border-zinc-800 rounded-md overflow-hidden font-mono text-xs">
        {rows.map((row, i) => {
          const isHeader = i === 0;
          const isFlagged = row[4] === "— FLAGGED —";
          return (
            <div
              key={i}
              className={`grid grid-cols-[50px_90px_90px_1.5fr_1.2fr_1.5fr] ${isHeader ? "bg-zinc-900 text-zinc-500 font-semibold" : isFlagged ? "bg-amber-950/30 text-zinc-100" : "text-zinc-400"} ${i > 0 ? "border-t border-zinc-800" : ""}`}
            >
              {row.map((cell, j) => (
                <div key={j} className={`p-2.5 ${j > 0 ? "border-l border-zinc-800" : ""}`}>{cell}</div>
              ))}
            </div>
          );
        })}
      </div>
      <div className="mt-6 p-4 rounded-md border border-zinc-800 bg-zinc-900/40">
        <div className="text-xs font-medium text-zinc-500 mb-2">Firmem notes</div>
        <ul className="space-y-1.5 text-sm text-zinc-300">
          <li>• Entries 847 &amp; 1203 — outside consultants on the chain. Privilege doesn&apos;t attach under Upjohn.</li>
          <li>• Entry 2018 — Morgan&apos;s unsent draft. Likely work-product (Hickman v. Taylor); Helen&apos;s call.</li>
          <li>• 2,405 remaining entries classified; 3 flagged for senior review.</li>
        </ul>
      </div>
    </div>
  );
}

function ConsultingCohortModelPreview() {
  const rows = [
    ["", "Source", "Q1 Count", "Notes"],
    ["Clinical", "EDC (clinical team feed)", "428", "Includes re-enrollment of C-0174"],
    ["Lab", "LIMS (lab team feed)", "431", "Includes 3 consented-but-not-dosed"],
    ["", "— Reconciliation —", "", ""],
    ["Exclude", "Consented, not dosed (3)", "-3", "Per protocol, enrollment requires dosing"],
    ["Exclude", "C-0174 duplicate entry", "-1", "Patient re-enrolled under amended protocol"],
    ["", "Reconciled Q1", "427", "Single source of truth"],
  ];
  return (
    <div className="max-w-3xl mx-auto">
      <div className="border border-zinc-800 rounded-md overflow-hidden font-mono text-xs">
        {rows.map((row, i) => {
          const isHeader = i === 0;
          const isTotal = row[1] === "Reconciled Q1";
          const isAdjust = row[0] === "Exclude";
          return (
            <div
              key={i}
              className={`grid grid-cols-[100px_1.5fr_100px_1.5fr] ${isHeader ? "bg-zinc-900 text-zinc-500 font-semibold" : isTotal ? "bg-emerald-950/30 text-zinc-100 font-bold" : isAdjust ? "bg-zinc-900/40 text-zinc-300" : "text-zinc-400"} ${i > 0 ? "border-t border-zinc-800" : ""}`}
            >
              <div className="p-2.5 text-xs uppercase tracking-wider">{row[0]}</div>
              <div className="p-2.5 border-l border-zinc-800">{row[1]}</div>
              <div className="p-2.5 border-l border-zinc-800 text-right">{row[2]}</div>
              <div className="p-2.5 border-l border-zinc-800">{row[3]}</div>
            </div>
          );
        })}
      </div>
      <div className="mt-6 p-4 rounded-md border border-zinc-800 bg-zinc-900/40">
        <div className="text-xs font-medium text-zinc-500 mb-2">Firmem notes</div>
        <ul className="space-y-1.5 text-sm text-zinc-300">
          <li>• Root cause — two coordinators processed the same re-enrollment on different days.</li>
          <li>• Process fix — single-source consent log with coordinator sign-off (discussed with clinical lead).</li>
          <li>• Board deck v7 update — pull the 428 → 427 correction into slide 6.</li>
        </ul>
      </div>
    </div>
  );
}

function EmailPreview() {
  const firmData = getActiveFirmData();
  const vertical = firmData.firm.vertical;
  if (vertical === "law") return <LawEmailPreview />;
  if (vertical === "consulting") return <ConsultingEmailPreview />;
  if (vertical === "agency") return <AgencyEmailPreview />;
  if (vertical === "hr") return <HREmailPreview />;
  return <AccountingEmailPreview />;
}

function AccountingEmailPreview() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="space-y-4 mb-6 text-sm">
        <div className="flex gap-3">
          <span className="text-zinc-500 w-16 shrink-0">To</span>
          <span className="text-zinc-200">Marco Russo &lt;marco@russoskitchen.com&gt;</span>
        </div>
        <div className="flex gap-3">
          <span className="text-zinc-500 w-16 shrink-0">From</span>
          <span className="text-zinc-200">Jennifer Hayes &lt;jennifer@meridianaccounting.com&gt;</span>
        </div>
        <div className="flex gap-3">
          <span className="text-zinc-500 w-16 shrink-0">Subject</span>
          <span className="text-zinc-200 font-medium">March close — solid month, one thing to flag</span>
        </div>
      </div>
      <div className="border-t border-zinc-800 pt-6 space-y-4 text-base text-zinc-200 leading-relaxed">
        <p>Hi Kim,</p>
        <p>March was a strong month — revenue up 12% over February, net income at $4,156. The full close package is attached.</p>
        <p>One thing I want to flag: food cost ticked up to 31.2% (we usually run 29-30%). The bump comes from the new Pacific Foods supplier — meat and seafood prices are running about 5% higher than what we paid Heritage. Worth a conversation when you have time.</p>
        <p>Otherwise everything looks healthy. Let me know when&apos;s good to chat.</p>
        <p className="pt-2">— Jennifer</p>
      </div>
    </div>
  );
}

function LawEmailPreview() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="space-y-4 mb-6 text-sm">
        <div className="flex gap-3">
          <span className="text-zinc-500 w-16 shrink-0">To</span>
          <span className="text-zinc-200">Katherine Hartwell &lt;khartwell@hartwellbeam.com&gt;</span>
        </div>
        <div className="flex gap-3">
          <span className="text-zinc-500 w-16 shrink-0">From</span>
          <span className="text-zinc-200">Helen Chen &lt;hchen@chenmorgan.com&gt;</span>
        </div>
        <div className="flex gap-3">
          <span className="text-zinc-500 w-16 shrink-0">Re</span>
          <span className="text-zinc-200 font-medium">Hendrix v. Riverpoint — Privilege Log Production</span>
        </div>
      </div>
      <div className="border-t border-zinc-800 pt-6 space-y-4 text-base text-zinc-200 leading-relaxed">
        <p>Counsel,</p>
        <p>Enclosed please find Plaintiff&apos;s privilege log in <em>Hendrix v. Riverpoint Realty Holdings, LLC</em>, prepared in accordance with Fed. R. Civ. P. 26(b)(5)(A) and this Court&apos;s scheduling order dated January 9, 2026.</p>
        <p>Entry 2018 reflects an attorney draft prepared in anticipation of the Rule 30(b)(6) deposition noticed for May 9, 2026. We assert the work-product doctrine as to that entry. <em>See Hickman v. Taylor</em>, 329 U.S. 495 (1947).</p>
        <p>We remain available to meet and confer on any challenged entries at your convenience.</p>
        <p className="pt-2">Regards,<br />Helen Chen<br />Chen Morgan LLP</p>
      </div>
    </div>
  );
}

function ConsultingEmailPreview() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="space-y-4 mb-6 text-sm">
        <div className="flex gap-3">
          <span className="text-zinc-500 w-16 shrink-0">To</span>
          <span className="text-zinc-200">Lumen Bio Board &lt;board@lumen.bio&gt;</span>
        </div>
        <div className="flex gap-3">
          <span className="text-zinc-500 w-16 shrink-0">From</span>
          <span className="text-zinc-200">Priya Raman &lt;priya@northarc.com&gt;</span>
        </div>
        <div className="flex gap-3">
          <span className="text-zinc-500 w-16 shrink-0">Subject</span>
          <span className="text-zinc-200 font-medium">Q1 enrollment correction — 428 → 427</span>
        </div>
      </div>
      <div className="border-t border-zinc-800 pt-6 space-y-4 text-base text-zinc-200 leading-relaxed">
        <p>Board,</p>
        <p>Ahead of Friday&apos;s meeting I want to flag a minor correction to Q1 patient enrollment. The figure is 427, not the 428 in the current deck draft.</p>
        <p>Root cause — a single patient was re-enrolled after a protocol amendment and captured twice in the raw consent log. Naomi Patel caught it during final reconciliation yesterday; the corrected number is fully audited against the master consent log and the dosing schedule.</p>
        <p>Process fix — Naomi and the clinical lead have already agreed to a single-source consent log with coordinator sign-off going forward. The risk of a repeat is effectively closed.</p>
        <p>Happy to walk through the reconciliation live at the board meeting if helpful.</p>
        <p className="pt-2">— Priya</p>
      </div>
    </div>
  );
}

function DocPreview() {
  const vertical = getActiveFirmData().firm.vertical;
  if (vertical === "law") return <LawMemoPreview />;
  if (vertical === "consulting") return <ConsultingMemoPreview />;
  if (vertical === "agency") return <AgencyBriefPreview />;
  if (vertical === "hr") return <HRMemoPreview />;
  return <GenericDocPreview />;
}

function GenericDocPreview() {
  return (
    <div className="max-w-2xl mx-auto bg-[#0a0a0a] border border-zinc-800 rounded p-12">
      <h1 className="text-2xl font-semibold text-zinc-100 mb-6">Document preview</h1>
      <p className="text-sm text-zinc-400 leading-relaxed">
        Document content preview. In production this would render the full layout with proper typography and tables.
      </p>
    </div>
  );
}

function LawMemoPreview() {
  return (
    <div className="max-w-2xl mx-auto bg-[#0a0a0a] border border-zinc-800 rounded p-12 space-y-5 font-serif">
      <div className="text-center space-y-1">
        <div className="text-[10px] font-bold tracking-[0.3em] text-zinc-500 uppercase">Chen Morgan LLP</div>
        <div className="text-[10px] text-zinc-600 uppercase tracking-widest">Attorneys at Law</div>
      </div>
      <div className="border-t border-zinc-800 pt-5 space-y-2">
        <div className="text-xs text-zinc-500">MEMORANDUM</div>
        <div className="text-sm text-zinc-300 space-y-1">
          <p><span className="text-zinc-500 inline-block w-12">To:</span>Katherine Hartwell, Esq. — Hartwell &amp; Beam LLP</p>
          <p><span className="text-zinc-500 inline-block w-12">From:</span>Helen Chen — Chen Morgan LLP</p>
          <p><span className="text-zinc-500 inline-block w-12">Date:</span>April 7, 2026</p>
          <p><span className="text-zinc-500 inline-block w-12">Re:</span>Hendrix v. Riverpoint Realty — Privilege Log Production</p>
        </div>
      </div>
      <div className="border-t border-zinc-800 pt-5 space-y-4 text-sm text-zinc-300 leading-relaxed">
        <p>Pursuant to Fed. R. Civ. P. 26(b)(5)(A) and this Court&apos;s scheduling order dated January 9, 2026, enclosed is Plaintiff&apos;s privilege log of 2,412 entries withheld from the initial production set in the above-captioned matter.</p>
        <p>Counsel draws the Court&apos;s attention to entry 2018, an attorney draft memorandum prepared in anticipation of the Rule 30(b)(6) deposition noticed for May 9, 2026. Plaintiff asserts the work-product doctrine as to this entry. <em>See Hickman v. Taylor</em>, 329 U.S. 495, 511 (1947) (holding that materials prepared in anticipation of litigation are protected from discovery absent a showing of substantial need).</p>
        <p>Plaintiff is available to meet and confer regarding any challenged entries at counsel&apos;s convenience.</p>
      </div>
    </div>
  );
}

function ConsultingMemoPreview() {
  return (
    <div className="max-w-2xl mx-auto bg-[#0a0a0a] border border-zinc-800 rounded p-12 space-y-5">
      <div className="space-y-2">
        <div className="text-[10px] font-bold tracking-[0.3em] text-zinc-500 uppercase">North Arc Advisors</div>
        <h1 className="text-xl font-semibold text-zinc-100">Board Memo — Q1 Enrollment Correction</h1>
        <div className="text-xs text-zinc-500">Lumen Bio · April 7, 2026</div>
      </div>
      <div className="border-t border-zinc-800 pt-5 space-y-4 text-sm text-zinc-300 leading-relaxed">
        <p>
          <span className="text-zinc-100 font-semibold">Correction. </span>
          Q1 patient enrollment is <span className="text-zinc-100 font-semibold">427</span>, not the 428 figure in the current board deck draft. The corrected number is fully audited against the master consent log and the dosing schedule.
        </p>
        <p>
          <span className="text-zinc-100 font-semibold">Root cause. </span>
          Patient C-0174 was consented on February 3, dropped on February 28 after a protocol amendment, and re-enrolled under the amended protocol on March 11 — same patient, two entries in the raw log because two coordinators processed the flow on different days.
        </p>
        <p>
          <span className="text-zinc-100 font-semibold">Process fix. </span>
          Naomi Patel and the clinical lead have agreed to a single-source consent log with coordinator sign-off going forward. Risk of recurrence is closed. Happy to walk through the full reconciliation at Friday&apos;s meeting if helpful.
        </p>
      </div>
    </div>
  );
}

/* ── Agency (Wildcard Studio) variants ── */

function AgencyCampaignRationalePreview() {
  const rows = [
    ["", "Dimension", "Heritage cut", "Modern cut", "Hybrid (recommended)"],
    ["Brand", "Guardrail alignment", "100%", "62%", "84%"],
    ["", "Risk of brand drift", "Low", "Medium-High", "Low"],
    ["Audience", "Existing customer resonance", "High", "Medium", "High"],
    ["", "Gen Z engagement (projected)", "baseline", "+14%", "+11%"],
    ["", "TikTok reach (projected)", "baseline", "+22%", "+18%"],
    ["Production", "Asset turnaround", "3 weeks", "2 weeks", "3 weeks"],
    ["", "Creative cost delta", "baseline", "-8%", "+4%"],
    ["Verdict", "Strategic fit", "Safe", "Bold", "— Recommended —"],
  ];
  return (
    <div className="max-w-4xl mx-auto">
      <div className="border border-zinc-800 rounded-md overflow-hidden font-mono text-xs">
        {rows.map((row, i) => {
          const isHeader = i === 0;
          const isVerdict = row[0] === "Verdict";
          const isRecommended = row[4] === "— Recommended —";
          return (
            <div
              key={i}
              className={`grid grid-cols-[90px_1.4fr_1fr_1fr_1.2fr] ${isHeader ? "bg-zinc-900 text-zinc-500 font-semibold" : isRecommended ? "bg-rose-950/30 text-zinc-100 font-bold" : isVerdict ? "bg-zinc-900/40 text-zinc-200" : "text-zinc-400"} ${i > 0 ? "border-t border-zinc-800" : ""}`}
            >
              <div className="p-2.5 text-xs uppercase tracking-wider">{row[0]}</div>
              <div className="p-2.5 border-l border-zinc-800">{row[1]}</div>
              <div className="p-2.5 border-l border-zinc-800 text-right">{row[2]}</div>
              <div className="p-2.5 border-l border-zinc-800 text-right">{row[3]}</div>
              <div className="p-2.5 border-l border-zinc-800 text-right">{row[4]}</div>
            </div>
          );
        })}
      </div>
      <div className="mt-6 p-4 rounded-md border border-zinc-800 bg-zinc-900/40">
        <div className="text-xs font-medium text-zinc-500 mb-2">Firmem notes</div>
        <ul className="space-y-1.5 text-sm text-zinc-300">
          <li>• Jun&apos;s modern cut delivers the projected Gen Z lift Elena mentioned in Q4 — but anchoring with heritage keeps Fjallberg&apos;s long-term brand arc intact.</li>
          <li>• TikTok trend shift (last 48h) nudges the recommendation toward a hybrid that leads modern on paid and heritage in the lookbook.</li>
          <li>• Frame to Elena as &ldquo;Fjallberg&apos;s next chapter,&rdquo; not a pivot.</li>
        </ul>
      </div>
    </div>
  );
}

function AgencyEmailPreview() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="space-y-4 mb-6 text-sm">
        <div className="flex gap-3">
          <span className="text-zinc-500 w-16 shrink-0">To</span>
          <span className="text-zinc-200">Elena Rhodes &lt;elena.rhodes@fjallberg.com&gt;</span>
        </div>
        <div className="flex gap-3">
          <span className="text-zinc-500 w-16 shrink-0">From</span>
          <span className="text-zinc-200">Maya Okonkwo &lt;maya@wildcardstudio.co&gt;</span>
        </div>
        <div className="flex gap-3">
          <span className="text-zinc-500 w-16 shrink-0">Subject</span>
          <span className="text-zinc-200 font-medium">Spring 2026 — where we&apos;re landing</span>
        </div>
      </div>
      <div className="border-t border-zinc-800 pt-6 space-y-4 text-base text-zinc-200 leading-relaxed">
        <p>Elena,</p>
        <p>Quick preview of where we&apos;re landing on Spring 2026 before Friday.</p>
        <p>The team ran a proper look at how Gen Z is engaging with outdoor creative over the last 18 months, and the signal is clear — audiences are rewarding work that feels more contemporary. Jun&apos;s new hero cut leans into that, and we&apos;re projecting a 14% lift on engagement against the heritage direction.</p>
        <p>That said, Fjallberg&apos;s heritage craft story is what makes the brand Fjallberg. So rather than pick one, we&apos;re recommending a hybrid — lead with the modern hero on paid and social, anchor the lookbook in heritage. It reads as Fjallberg&apos;s next chapter, not a pivot.</p>
        <p>I&apos;ll have both creative variants ready to walk through Friday. Let me know if you&apos;d like a quick look before then.</p>
        <p className="pt-2">— Maya<br />Wildcard Studio</p>
      </div>
    </div>
  );
}

function AgencyBriefPreview() {
  return (
    <div className="max-w-2xl mx-auto bg-[#0a0a0a] border border-zinc-800 rounded p-12 space-y-5">
      <div className="space-y-2">
        <div className="text-[10px] font-bold tracking-[0.3em] text-zinc-500 uppercase">Wildcard Studio</div>
        <h1 className="text-xl font-semibold text-zinc-100">Campaign Brief — Fjallberg Spring 2026</h1>
        <div className="text-xs text-zinc-500">Client: Fjallberg Outdoor · CMO: Elena Rhodes · April 7, 2026</div>
      </div>
      <div className="border-t border-zinc-800 pt-5 space-y-4 text-sm text-zinc-300 leading-relaxed">
        <p>
          <span className="text-zinc-100 font-semibold">The idea. </span>
          Fjallberg&apos;s next chapter is a conversation between craft heritage and contemporary energy. The hero story shows what the brand stands for today, without walking away from the eighteen years that earned its place on the mountain.
        </p>
        <p>
          <span className="text-zinc-100 font-semibold">The work. </span>
          Lead with a modern hero cut on paid social, YouTube, and DOOH. Anchor the lookbook and retail with heritage-forward imagery. Two creative variants in production; final selects shared Friday for CMO review.
        </p>
        <p>
          <span className="text-zinc-100 font-semibold">The signal. </span>
          Gen Z engagement on comparable outdoor brands is up 22% on TikTok in the last 48 hours. The audience is rewarding work that feels alive. This brief leans into that without abandoning Fjallberg&apos;s center of gravity.
        </p>
      </div>
    </div>
  );
}

/* ── HR (Lattice Partners) variants ── */

function HRCompBandPreview() {
  const rows = [
    ["", "Role", "Current", "Scenario A (P75)", "Scenario B (P75 + fix)"],
    ["Helix", "VP Engineering", "—", "$510K TC", "$510K TC"],
    ["", "Director, Platform", "$298K TC", "$298K TC (unchanged)", "$332K TC (P50 fix)"],
    ["", "VP → Director gap", "—", "72% ⚠ wide", "54% ✓ normal"],
    ["Peers", "Radford P50 (14 cos)", "—", "—", "53%-65%"],
    ["", "Radford P75 (14 cos)", "—", "—", "58%-71%"],
    ["Verdict", "Board defensibility", "—", "Hard to defend", "— Recommended —"],
  ];
  return (
    <div className="max-w-4xl mx-auto">
      <div className="border border-zinc-800 rounded-md overflow-hidden font-mono text-xs">
        {rows.map((row, i) => {
          const isHeader = i === 0;
          const isRecommended = row[4] === "— Recommended —";
          const isFlagged = String(row[3]).includes("⚠") || String(row[4]).includes("⚠");
          return (
            <div
              key={i}
              className={`grid grid-cols-[90px_1.4fr_1fr_1.2fr_1.2fr] ${isHeader ? "bg-zinc-900 text-zinc-500 font-semibold" : isRecommended ? "bg-purple-950/30 text-zinc-100 font-bold" : isFlagged ? "bg-amber-950/20 text-zinc-200" : "text-zinc-400"} ${i > 0 ? "border-t border-zinc-800" : ""}`}
            >
              <div className="p-2.5 text-xs uppercase tracking-wider">{row[0]}</div>
              <div className="p-2.5 border-l border-zinc-800">{row[1]}</div>
              <div className="p-2.5 border-l border-zinc-800 text-right">{row[2]}</div>
              <div className="p-2.5 border-l border-zinc-800 text-right">{row[3]}</div>
              <div className="p-2.5 border-l border-zinc-800 text-right">{row[4]}</div>
            </div>
          );
        })}
      </div>
      <div className="mt-6 p-4 rounded-md border border-zinc-800 bg-zinc-900/40">
        <div className="text-xs font-medium text-zinc-500 mb-2">Firmem notes</div>
        <ul className="space-y-1.5 text-sm text-zinc-300">
          <li>• The issue isn&apos;t the VP Eng number — it&apos;s that the current Director is 8% below P50 across the 14-company robotics peer group.</li>
          <li>• Scenario B is corrective, not generous: it brings the Director to market P50 while keeping VP Eng at the board&apos;s committed P75 bar.</li>
          <li>• Frame Scenario B to Kiran as &ldquo;we heard your parity concern and the fix is bigger than one role.&rdquo;</li>
        </ul>
      </div>
    </div>
  );
}

function HREmailPreview() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="space-y-4 mb-6 text-sm">
        <div className="flex gap-3">
          <span className="text-zinc-500 w-16 shrink-0">To</span>
          <span className="text-zinc-200">Kiran Shah &lt;kiran@helixrobotics.com&gt;</span>
        </div>
        <div className="flex gap-3">
          <span className="text-zinc-500 w-16 shrink-0">From</span>
          <span className="text-zinc-200">Dana Vu &lt;dana@latticepartners.com&gt;</span>
        </div>
        <div className="flex gap-3">
          <span className="text-zinc-500 w-16 shrink-0">Subject</span>
          <span className="text-zinc-200 font-medium">VP Engineering comp — and a parity fix we should bring together</span>
        </div>
      </div>
      <div className="border-t border-zinc-800 pt-6 space-y-4 text-base text-zinc-200 leading-relaxed">
        <p>Kiran,</p>
        <p>I want to acknowledge the parity concern you raised first — you&apos;re right that a 72% gap between the VP Eng and the Director of Platform is too wide to sit with internally, even if it clears external benchmarks.</p>
        <p>Elena ran the parity analysis against 14 similar-stage robotics companies. The gap sizes there live in the 55-65% range. The reason Helix&apos;s gap looks unusual isn&apos;t the VP Eng number — it&apos;s that the Director of Platform is currently 8% below P50 for his role. He&apos;s underpaid, not overshadowed.</p>
        <p>Our recommendation for Friday&apos;s board is Scenario B: VP Engineering at $510K TC (the P75 the board already committed to), paired with a corrective adjustment bringing the Director to market P50. That closes the parity gap to 54% — right in the middle of the peer band — and it&apos;s a story that defends cleanly inside the company and at the board.</p>
        <p>I&apos;ll walk you through the memo Friday morning before the meeting if that&apos;s helpful.</p>
        <p className="pt-2">— Dana<br />Lattice Partners HR</p>
      </div>
    </div>
  );
}

function HRMemoPreview() {
  return (
    <div className="max-w-2xl mx-auto bg-[#0a0a0a] border border-zinc-800 rounded p-12 space-y-5">
      <div className="space-y-2">
        <div className="text-[10px] font-bold tracking-[0.3em] text-zinc-500 uppercase">Lattice Partners HR</div>
        <h1 className="text-xl font-semibold text-zinc-100">Comp Band Memo — VP Engineering</h1>
        <div className="text-xs text-zinc-500">Client: Helix Robotics · April 7, 2026</div>
      </div>
      <div className="border-t border-zinc-800 pt-5 space-y-4 text-sm text-zinc-300 leading-relaxed">
        <p>
          <span className="text-zinc-100 font-semibold">Recommendation. </span>
          VP Engineering compensation band of <span className="text-zinc-100 font-semibold">$340K base / $510K TC</span>, anchored at Radford P75 per the Series B board commitment. Paired with a corrective adjustment bringing the Director of Platform to market P50.
        </p>
        <p>
          <span className="text-zinc-100 font-semibold">Parity analysis. </span>
          Against 14 similar-stage robotics companies in the Radford cut, VP Eng to Director TC gaps sit in the 55-65% range. Helix&apos;s current Director band is 8% below P50 for his role — the widest gap in the cohort is an artifact of that underpayment, not of the VP Eng recommendation.
        </p>
        <p>
          <span className="text-zinc-100 font-semibold">Board framing. </span>
          Scenario B closes the internal parity gap to 54% (well within the peer band) while honoring the board&apos;s existing P75 bar for leadership roles. Recommended as corrective, defensible, and complete.
        </p>
      </div>
    </div>
  );
}
