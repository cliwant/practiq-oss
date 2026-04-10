"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Hash, Users as TeamIcon, ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";
import { getActiveFirmData } from "@/lib/firm-context";
import {
  getActiveFirmChannels, getActiveFirmChannelBriefing,
  getActiveDMThreads, getActiveDMBriefing, getActiveMember,
} from "@/data/firms";
import type { BriefingMessage, TeamMember } from "@/data/mock-data";

/**
 * Team view — firm-wide channels + 1:1 direct messages.
 *
 * Layout:
 *  - Left sub-rail (240-260px): Channels section + Direct Messages section
 *  - Main area: renders the selected thread using the same BriefingMessage
 *    rendering pattern as the Agent Thread but with cleaner team-chat
 *    styling and no client context panel.
 *
 * Selection is local-only state — not in the URL — because it's transient
 * UI and the Team view URL stays stable as `?view=team`.
 */
type TeamSelection =
  | { kind: "channel"; channelId: string }
  | { kind: "dm"; threadId: string };

export function TeamView() {
  const firmData = getActiveFirmData();
  const channels = useMemo(() => getActiveFirmChannels(), [firmData]);
  const dmThreads = useMemo(() => getActiveDMThreads(), [firmData]);
  const me = firmData.team[0]; // active user = managing partner

  // Default selection: first firm channel (usually #general)
  const [selection, setSelection] = useState<TeamSelection>(() => ({
    kind: "channel",
    channelId: channels[0]?.id ?? "",
  }));

  // When firm changes (in tour mode), reset to the new firm's first channel
  useEffect(() => {
    setSelection({ kind: "channel", channelId: channels[0]?.id ?? "" });
  }, [firmData, channels]);

  return (
    <div className="absolute inset-0 flex bg-[#050505]">
      {/* Left sub-rail */}
      <aside className="w-[260px] border-r border-zinc-800/80 bg-[#0a0a0a] flex flex-col shrink-0">
        {/* Section: Channels */}
        <div className="pt-5 pb-1 px-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
            Channels
          </div>
        </div>
        <div className="px-2 space-y-0.5">
          {channels.map((channel) => {
            const isActive =
              selection.kind === "channel" && selection.channelId === channel.id;
            return (
              <button
                key={channel.id}
                onClick={() => setSelection({ kind: "channel", channelId: channel.id })}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-left ${
                  isActive
                    ? "bg-zinc-800/80 text-zinc-100"
                    : "text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200"
                }`}
              >
                <Hash className="w-3.5 h-3.5 shrink-0 text-zinc-500" />
                <span className="text-sm font-medium truncate">
                  {channel.name.replace(/^#/, "")}
                </span>
              </button>
            );
          })}
        </div>

        {/* Section: Direct Messages — shows EVERY team member, not just the
            ones with existing scripted DMs. Members with no DM yet get a
            lighter "Start conversation" hint row. */}
        <div className="pt-6 pb-1 px-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
            Direct messages
          </div>
        </div>
        <div className="px-2 space-y-0.5">
          {firmData.team
            .filter((m) => m.id !== me.id)
            .map((member) => {
              // Find an existing DM thread with this member (if any)
              const thread = dmThreads.find(
                (t) =>
                  t.participantIds.includes(me.id) &&
                  t.participantIds.includes(member.id)
              );
              const threadId = thread?.id ?? `synthetic-dm-${member.id}`;
              const isActive =
                selection.kind === "dm" && selection.threadId === threadId;
              const hasExistingMessages = !!thread;
              return (
                <button
                  key={member.id}
                  onClick={() => setSelection({ kind: "dm", threadId })}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md transition-colors text-left ${
                    isActive
                      ? "bg-zinc-800/80 text-zinc-100"
                      : "text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 ${
                      hasExistingMessages ? "" : "opacity-60"
                    }`}
                    style={{ backgroundColor: member.avatarColor }}
                  >
                    {member.initials}
                  </div>
                  <span
                    className={`text-sm truncate flex-1 ${
                      hasExistingMessages ? "font-medium" : "font-normal text-zinc-500"
                    }`}
                  >
                    {member.name}
                  </span>
                  {thread?.unreadCount && thread.unreadCount > 0 ? (
                    <span className="text-[9px] font-bold text-zinc-100 bg-zinc-700 rounded-full px-1.5 min-w-4 h-4 flex items-center justify-center">
                      {thread.unreadCount}
                    </span>
                  ) : null}
                </button>
              );
            })}
        </div>

        {/* Footer hint */}
        <div className="mt-auto px-4 pb-4 text-[10px] text-zinc-600">
          Team conversations not tied to any single {firmData.config.labels.clientWord.toLowerCase()}
        </div>
      </aside>

      {/* Main thread area */}
      <div className="flex-1 min-w-0 flex flex-col">
        <ThreadArea selection={selection} />
      </div>
    </div>
  );
}

function ThreadArea({ selection }: { selection: TeamSelection }) {
  const firmData = getActiveFirmData();
  const me = firmData.team[0];
  const scrollRef = useRef<HTMLDivElement>(null);

  // Resolve selection → header + messages
  const { header, messages } = useMemo(() => {
    if (selection.kind === "channel") {
      const channel = firmData.firmChannels?.find((c) => c.id === selection.channelId);
      return {
        header: channel
          ? {
              icon: <Hash className="w-4 h-4 text-zinc-500" />,
              // Strip the leading "#" from the display title since the Hash
              // icon already visualises it — otherwise we'd render "# #general".
              title: channel.name.replace(/^#/, ""),
              subtitle: channel.description ?? `${channel.participantIds.length} members`,
              participantIds: channel.participantIds,
            }
          : null,
        messages: getActiveFirmChannelBriefing(selection.channelId),
      };
    } else {
      const thread = firmData.dmThreads?.find((t) => t.id === selection.threadId);
      if (!thread) return { header: null, messages: [] };
      const peerId = thread.participantIds.find((id) => id !== me.id) ?? thread.participantIds[1];
      const peer = getActiveMember(peerId);
      return {
        header: {
          icon: (
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
              style={{ backgroundColor: peer?.avatarColor ?? "#3f3f46" }}
            >
              {peer?.initials ?? "?"}
            </div>
          ),
          title: peer?.name ?? peerId,
          subtitle: peer?.role ?? "Direct message",
          participantIds: [me.id, peerId],
        },
        messages: getActiveDMBriefing(selection.threadId),
      };
    }
  }, [selection, firmData, me.id]);

  // Auto-scroll to bottom on message change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!header) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-zinc-500">
        Select a channel or DM to view the conversation.
      </div>
    );
  }

  return (
    <>
      {/* Thread header */}
      <header className="h-14 border-b border-zinc-800/80 px-6 flex items-center justify-between shrink-0 bg-[#0a0a0a]">
        <div className="flex items-center gap-3">
          {header.icon}
          <div>
            <div className="text-sm font-semibold text-zinc-100">{header.title}</div>
            <div className="text-[11px] text-zinc-500">{header.subtitle}</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {header.participantIds.slice(0, 5).map((id) => {
            const m = getActiveMember(id);
            return (
              <div
                key={id}
                className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white border-2 border-[#0a0a0a] -ml-1.5"
                style={{ backgroundColor: m?.avatarColor ?? "#3f3f46" }}
                title={m?.name}
              >
                {m?.initials ?? "?"}
              </div>
            );
          })}
          {header.participantIds.length > 5 && (
            <span className="text-xs text-zinc-500 ml-2">
              +{header.participantIds.length - 5}
            </span>
          )}
        </div>
      </header>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto hide-scrollbar px-8 py-8 space-y-5"
      >
        {messages.length === 0 ? (
          <div className="max-w-md mx-auto mt-24 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto">
              <Sparkles className="w-5 h-5 text-zinc-500" />
            </div>
            <div className="text-sm font-medium text-zinc-300">
              No messages yet.
            </div>
            <div className="text-xs text-zinc-500">
              Start the conversation — your message will be private between the two of you.
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="max-w-3xl mx-auto">
              <TeamMessage msg={msg} me={me} />
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-zinc-800/80 bg-[#0a0a0a] shrink-0">
        <div className="max-w-3xl mx-auto">
          <div className="relative">
            <input
              type="text"
              placeholder={
                selection.kind === "channel"
                  ? `Message ${header.title}`
                  : `Message ${header.title}`
              }
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700"
            />
          </div>
        </div>
      </div>
    </>
  );
}

/** Team chat message — user (right-aligned bubble), AI (Sparkles, left),
 *  or team member (left with avatar + name). */
function TeamMessage({ msg, me }: { msg: BriefingMessage; me: TeamMember }) {
  const sender = msg.senderId;
  const isUser = sender === "user" || sender === me.id || msg.type === "user";
  const isAI = sender === "ai" || msg.type === "ai-response";

  // User — right-aligned bubble
  if (isUser) {
    return (
      <div className="flex justify-end gap-3">
        <div className="flex flex-col items-end max-w-[75%]">
          <div className="flex items-center gap-2 mb-1 px-1">
            <span className="text-[11px] text-zinc-500">{msg.timestamp}</span>
            <span className="text-xs font-medium text-zinc-300">{me.name}</span>
          </div>
          <div className="px-4 py-2.5 rounded-2xl rounded-tr-sm bg-zinc-200 text-zinc-900 text-sm leading-relaxed">
            {msg.content}
          </div>
        </div>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-5"
          style={{ backgroundColor: me.avatarColor }}
        >
          {me.initials}
        </div>
      </div>
    );
  }

  // AI — left with Sparkles
  if (isAI) {
    return (
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-xs font-medium text-zinc-300">Firmem</span>
            <span className="text-[11px] text-zinc-500">{msg.timestamp}</span>
          </div>
          <div
            className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line"
            dangerouslySetInnerHTML={{
              __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong class="text-zinc-100">$1</strong>'),
            }}
          />
        </div>
      </div>
    );
  }

  // Team member — left with avatar
  const member = sender ? getActiveMember(sender) : null;
  const memberName = member?.name ?? sender ?? "Unknown";
  const memberColor = member?.avatarColor ?? "#3f3f46";
  const memberInitials = member?.initials ?? "?";

  return (
    <div className="flex gap-3">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5"
        style={{ backgroundColor: memberColor }}
      >
        {memberInitials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-xs font-medium text-zinc-200">{memberName}</span>
          <span className="text-[11px] text-zinc-500">{msg.timestamp}</span>
        </div>
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
