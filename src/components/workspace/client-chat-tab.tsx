"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Send, Sparkles, StopCircle, User, X, FileText, ExternalLink } from "lucide-react";
import { formatDateTime } from "@/lib/format-time";
import { Markdown } from "./markdown";
import type {
  ChatMessageItem,
  ClientDossier,
  ConversationDossier,
  MessageCitation,
} from "./types";

/**
 * Chat tab — per-client streaming conversation with the agent.
 *
 * The API (`/api/chat`) returns SSE events of three shapes:
 *   { type: "conversation", conversationId }     — emitted first
 *   { type: "text", text }                       — each token chunk
 *   { type: "done" }                             — stream completed
 *   { type: "error", error }                     — stream aborted
 *
 * The assistant message is built up client-side from the text events and
 * saved server-side at `done`. We don't poll for it — the server persisted
 * it already. We just keep the local echo as the rendered value.
 *
 * Input is a plain textarea. ⌘/Ctrl+Enter or Enter (without shift) sends.
 */
export function ClientChatTab({
  client,
  initialConversation,
}: {
  client: ClientDossier;
  initialConversation: ConversationDossier | null;
}) {
  const [messages, setMessages] = useState<ChatMessageItem[]>(
    initialConversation?.messages ?? [],
  );
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversation?.id ?? null,
  );
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCitation, setActiveCitation] =
    useState<MessageCitation | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Scroll to bottom whenever messages change or streaming ticks.
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    // Focus the input on mount — most visits to Chat are followed by typing.
    inputRef.current?.focus();
  }, []);

  // Autosize the textarea up to ~8 rows so long prompts don't crowd out the
  // transcript.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    const max = 8 * 22; // ~22px per line at 14px font
    el.style.height = `${Math.min(el.scrollHeight, max)}px`;
  }, [input]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: ChatMessageItem = {
      id: `local-${Date.now()}`,
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };
    // Seed the assistant bubble so the UI shows typing immediately.
    const assistantMsg: ChatMessageItem = {
      id: `local-${Date.now() + 1}`,
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setStreaming(true);
    setError(null);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: client.id,
          message: text,
          conversationId,
        }),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) {
        const err = await res.text().catch(() => "");
        throw new Error(err || `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      let latestConversationId: string | null = conversationId;
      let receivedTextDelta = false;

      // Race each reader.read() against a stall timer. Turbopack dev on
      // Windows sometimes flushes the first SSE chunk but then buffers
      // the remaining chunks until the response is fully done, which
      // never reaches the client. If no bytes arrive for 45s after the
      // last chunk, we abort the stream and fall back to refetching
      // the persisted conversation from the DB.
      const STALL_MS = 45_000;
      while (true) {
        const stallTimer = new Promise<"stall">((resolve) => {
          setTimeout(() => resolve("stall"), STALL_MS);
        });
        const readResult = await Promise.race([
          reader.read(),
          stallTimer,
        ]);
        if (readResult === "stall") {
          try { await reader.cancel("stall"); } catch {}
          break;
        }
        const { value, done } = readResult as ReadableStreamReadResult<Uint8Array>;
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE frames are separated by blank lines.
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const frame of parts) {
          const line = frame.replace(/^data:\s?/, "").trim();
          if (!line) continue;
          try {
            const ev = JSON.parse(line);
            if (ev.type === "conversation" && ev.conversationId) {
              latestConversationId = ev.conversationId;
              setConversationId(ev.conversationId);
            } else if (ev.type === "text" && typeof ev.text === "string") {
              receivedTextDelta = true;
              setMessages((prev) => {
                const copy = prev.slice();
                const last = copy[copy.length - 1];
                if (last && last.role === "assistant") {
                  copy[copy.length - 1] = {
                    ...last,
                    content: last.content + ev.text,
                  };
                }
                return copy;
              });
            } else if (
              ev.type === "citations" &&
              Array.isArray(ev.citations)
            ) {
              // Attach the parsed citations to the last assistant
              // message — the same one we've been streaming text into.
              const cites = ev.citations as MessageCitation[];
              setMessages((prev) => {
                const copy = prev.slice();
                const last = copy[copy.length - 1];
                if (last && last.role === "assistant") {
                  copy[copy.length - 1] = { ...last, citations: cites };
                }
                return copy;
              });
            } else if (ev.type === "error") {
              throw new Error(ev.error ?? "stream error");
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue; // partial frame
            throw e;
          }
        }
      }

      // Turbopack-dev graceful fallback: in some Windows dev setups
      // the SSE reader stalls after the first chunk even though the
      // server finishes streaming and persists the full message to
      // DB. If that happened, fetch the conversation and fill in the
      // assistant reply so the operator still sees an answer.
      if (!receivedTextDelta && latestConversationId) {
        try {
          const r = await fetch(`/api/conversations/${latestConversationId}`);
          if (r.ok) {
            const data = (await r.json()) as {
              messages?: Array<{ role: string; content: string }>;
            };
            const latestAssistant = [...(data.messages ?? [])]
              .reverse()
              .find((m) => m.role === "assistant");
            if (latestAssistant?.content) {
              setMessages((prev) => {
                const copy = prev.slice();
                const last = copy[copy.length - 1];
                if (last && last.role === "assistant" && !last.content) {
                  copy[copy.length - 1] = {
                    ...last,
                    content: latestAssistant.content,
                  };
                }
                return copy;
              });
            }
          }
        } catch {
          // best-effort; UI will just keep showing Thinking… until
          // the next send or page reload
        }
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        // user clicked stop
      } else {
        setError(e instanceof Error ? e.message : String(e));
        setMessages((prev) => prev.slice(0, -2)); // drop the optimistic pair
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [input, streaming, conversationId, client.id]);

  const stop = () => {
    abortRef.current?.abort();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="relative flex h-full flex-col bg-[#050505]">
      {/* Persistent AI advisory disclaimer. Sticky on the chat tab so
          the licensed professional sees it on every turn. The legal
          posture (codified in the system prompt) is "AI drafts, the
          CPA signs" — this banner makes it visible to the user so
          they can't credibly claim they relied on the assistant for
          a binding decision. Same wording on every client / topic. */}
      <div className="border-b border-amber-500/20 bg-amber-500/5 px-6 py-2">
        <div className="mx-auto flex max-w-3xl items-center gap-2.5 text-[11px] text-amber-200/90">
          <svg
            className="h-3.5 w-3.5 flex-shrink-0"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M8 1.5L14.5 13H1.5L8 1.5Z"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            <path
              d="M8 6V9.5"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            <circle cx="8" cy="11.25" r="0.75" fill="currentColor" />
          </svg>
          <span>
            <span className="font-semibold text-amber-200">
              AI assistant — not a licensed CPA.
            </span>{" "}
            Verify tax classifications, regulatory citations, and binding
            client decisions against authoritative sources before signing
            off. Every chat is logged for your firm's audit trail.
          </span>
        </div>
      </div>

      {/* ─── Transcript ───────────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
      >
        <div className="mx-auto max-w-3xl px-10 py-8">
          {messages.length === 0 ? (
            <Empty client={client} />
          ) : (
            <ul className="space-y-6">
              {messages.map((m, i) => (
                <MessageBubble
                  key={m.id}
                  message={m}
                  client={client}
                  isLast={i === messages.length - 1}
                  streaming={streaming && i === messages.length - 1}
                  onOpenCitation={setActiveCitation}
                />
              ))}
            </ul>
          )}

          {error && (
            <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-[12.5px] text-red-300">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* ─── Citation side panel ────────────────────────────── */}
      <CitationPanel
        citation={activeCitation}
        onClose={() => setActiveCitation(null)}
      />

      {/* ─── Composer ─────────────────────────────────────────── */}
      <div className="border-t border-zinc-900 bg-[#080808] p-4">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-end gap-2 rounded-xl border border-zinc-800 bg-[#0a0a0a] p-3 focus-within:border-zinc-600">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={`Ask about ${client.name}. Enter to send, Shift+Enter for newline.`}
              rows={1}
              className="flex-1 resize-none bg-transparent text-[13.5px] leading-relaxed text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
              disabled={streaming}
            />
            {streaming ? (
              <button
                onClick={stop}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-zinc-300 transition-colors hover:bg-zinc-700"
                title="Stop"
              >
                <StopCircle className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={send}
                disabled={!input.trim()}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-950 transition-all hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                title="Send"
                aria-label="Send"
              >
                <Send className="h-4 w-4" />
              </button>
            )}
          </div>
          <p className="mt-2 text-center text-[10.5px] text-zinc-600">
            Agent sees this client's pinned context and recent knowledge. No
            cross-client data.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Message rendering ──────────────────────────────────────────────────

function MessageBubble({
  message,
  client,
  isLast,
  streaming,
  onOpenCitation,
}: {
  message: ChatMessageItem;
  client: ClientDossier;
  isLast: boolean;
  streaming: boolean;
  onOpenCitation: (c: MessageCitation) => void;
}) {
  const isUser = message.role === "user";
  return (
    <motion.li
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className="flex gap-3"
    >
      {isUser ? (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-zinc-400">
          <User className="h-3.5 w-3.5" />
        </div>
      ) : (
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white"
          style={{
            background: `linear-gradient(135deg, ${client.brandColor}, ${darken(
              client.brandColor,
              0.3,
            )})`,
          }}
        >
          <Sparkles className="h-3.5 w-3.5" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-baseline gap-2">
          <span className="text-[11.5px] font-semibold text-zinc-400">
            {isUser ? "You" : `${client.name} agent`}
          </span>
          <span className="text-[10.5px] text-zinc-600">
            {formatDateTime(message.createdAt)}
          </span>
        </div>
        <div
          className={`ph-no-capture rounded-xl break-words ${
            isUser
              ? "bg-transparent px-0 py-0"
              : "border border-zinc-900 bg-[#0a0a0a] px-4 py-3"
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-zinc-200">
              {message.content}
            </p>
          ) : message.content ? (
            <Markdown>{message.content}</Markdown>
          ) : (
            <span className="text-[13px] text-zinc-500">Thinking…</span>
          )}
          {streaming && isLast && !isUser && message.content && (
            <span className="ml-0.5 inline-block h-3 w-[2px] animate-pulse bg-zinc-400 align-middle" />
          )}
        </div>
        {!isUser && message.citations && message.citations.length > 0 && (
          <CitationStrip
            citations={message.citations}
            onOpen={onOpenCitation}
          />
        )}
      </div>
    </motion.li>
  );
}

function CitationStrip({
  citations,
  onOpen,
}: {
  citations: MessageCitation[];
  onOpen: (c: MessageCitation) => void;
}) {
  // Sort by ref so the chips read 1, 2, 3 left to right regardless of
  // whatever order the model emitted them in the sentinel block.
  const sorted = [...citations].sort((a, b) => a.ref - b.ref);
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <span className="text-[10.5px] font-bold uppercase tracking-widest text-zinc-600">
        Sources
      </span>
      {sorted.map((c) => (
        <button
          key={`${c.ref}-${c.doc_id}-${c.page}`}
          onClick={() => onOpen(c)}
          className="inline-flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-900/60 px-1.5 py-0.5 text-[11px] font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800 hover:text-zinc-100"
          title={c.quote}
          aria-label={`Open citation ${c.ref} — page ${c.page}`}
        >
          <sup className="font-bold text-blue-300">[{c.ref}]</sup>
          <span className="text-zinc-500">p.{c.page}</span>
        </button>
      ))}
    </div>
  );
}

function CitationPanel({
  citation,
  onClose,
}: {
  citation: MessageCitation | null;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {citation && (
        <motion.aside
          key="citation-panel"
          initial={{ x: 380, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 380, opacity: 0 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="absolute right-0 top-0 z-30 flex h-full w-[380px] flex-col border-l border-zinc-900 bg-[#0a0a0a] shadow-2xl"
          aria-label="Citation details"
          role="complementary"
        >
          <header className="flex items-center justify-between border-b border-zinc-900 px-5 py-4">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-300">
                <FileText className="h-3.5 w-3.5" />
              </span>
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-widest text-zinc-600">
                  Citation
                </p>
                <p className="text-[14px] font-bold text-zinc-100">
                  Reference [{citation.ref}]
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close citation panel"
              className="rounded p-1 text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-zinc-200"
            >
              <X className="h-4 w-4" />
            </button>
          </header>
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 text-[13px] leading-relaxed">
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-widest text-zinc-600">
                Page
              </p>
              <p className="mt-1 font-mono text-zinc-200">{citation.page}</p>
            </div>
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-widest text-zinc-600">
                Quote
              </p>
              <blockquote className="mt-1 border-l-2 border-blue-500/50 bg-zinc-900/40 px-3 py-2 italic text-zinc-200">
                {citation.quote}
              </blockquote>
            </div>
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-widest text-zinc-600">
                Document
              </p>
              <p className="mt-1 break-all font-mono text-[11.5px] text-zinc-500">
                {citation.doc_id}
              </p>
            </div>
            <Link
              href={`/app/documents/${citation.doc_id}?page=${citation.page}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-[12.5px] font-medium text-zinc-100 transition-colors hover:border-zinc-600"
            >
              Open document at page {citation.page}
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function Empty({ client }: { client: ClientDossier }) {
  const suggestions = [
    `What's the most recent activity for ${client.name}?`,
    `Summarize ${client.name}'s financial position in 3 bullet points.`,
    `Draft a short ${client.reportTone} email to ${client.name}.`,
    `What should I follow up on with ${client.name} this week?`,
  ];
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-24 text-center">
      <div
        className="flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-lg"
        style={{
          background: `linear-gradient(135deg, ${client.brandColor}, ${darken(client.brandColor, 0.3)})`,
        }}
      >
        <Sparkles className="h-4 w-4" />
      </div>
      <h3 className="mt-4 text-[17px] font-bold text-zinc-100">
        Ready to work on {client.name}
      </h3>
      <p className="mt-2 max-w-md text-[13px] leading-relaxed text-zinc-500">
        The agent has this client's pinned context loaded. Ask a question, ask
        for a draft, or start a review.
      </p>
      <div className="mt-6 flex w-full max-w-md flex-wrap justify-center gap-2">
        {suggestions.map((s) => (
          <SuggestionPill key={s} text={s} />
        ))}
      </div>
    </div>
  );
}

function SuggestionPill({ text }: { text: string }) {
  return (
    <button
      onClick={(e) => {
        // Find the nearest textarea and stuff the suggestion in.
        const ta = (e.currentTarget.closest("section")?.parentElement ?? document)
          .querySelector("textarea");
        if (ta) {
          (ta as HTMLTextAreaElement).value = text;
          ta.dispatchEvent(new Event("input", { bubbles: true }));
          (ta as HTMLTextAreaElement).focus();
        }
      }}
      className="rounded-full border border-zinc-800 bg-[#0a0a0a] px-3 py-1.5 text-[11.5px] text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200"
    >
      {text}
    </button>
  );
}

function darken(color: string, amount: number): string {
  const m = color.match(/^#([0-9a-f]{6})$/i);
  if (m) {
    const n = parseInt(m[1], 16);
    const r = Math.max(0, ((n >> 16) & 0xff) - Math.round(255 * amount));
    const g = Math.max(0, ((n >> 8) & 0xff) - Math.round(255 * amount));
    const b = Math.max(0, (n & 0xff) - Math.round(255 * amount));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
  }
  return color;
}
