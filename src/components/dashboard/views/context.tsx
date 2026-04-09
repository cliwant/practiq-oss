"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Database, FileText, BookMarked, Sparkles, User, Lightbulb, Shield, Plus, X,
} from "lucide-react";
import { type KnowledgeItem } from "@/data/mock-data";
import { getActiveClient, getActiveClientKnowledge } from "@/data/firms";
import { getActiveFirmData } from "@/lib/firm-context";
import {
  addSessionContext,
  getSessionContextForClient,
  subscribeSessionStore,
} from "@/lib/session-clients";

/**
 * ContextView — everything the firm (and the AI) has learned about this
 * client. Context is the inside of the agent's head: preferences, patterns,
 * history, contacts, compliance quirks. It's never sent anywhere; it's
 * what makes every future Output better.
 *
 * The list is a merge of static firm data and the session Context store
 * (items added manually via the "Add note" button or extracted by AI when
 * the client was first created from uploaded files).
 */
export function ContextView({ clientId }: { clientId: string }) {
  const client = getActiveClient(clientId);
  const firmData = getActiveFirmData();

  // Re-render on session store mutations
  const [, setStoreVersion] = useState(0);
  useEffect(
    () => subscribeSessionStore(() => setStoreVersion((v) => v + 1)),
    []
  );

  const knowledge: KnowledgeItem[] = useMemo(
    () => [
      ...getSessionContextForClient(clientId),
      ...getActiveClientKnowledge(clientId),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clientId, firmData]
  );

  const [isAddOpen, setIsAddOpen] = useState(false);

  if (!client) return null;

  return (
    <div className="absolute inset-0 overflow-y-auto p-8 lg:p-10 hide-scrollbar bg-[#050505]">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold text-zinc-100 mb-1">Context</h2>
            <p className="text-sm text-zinc-500">
              What FractionalOS knows about{" "}
              <span className="text-zinc-300">{client.name}</span> · {knowledge.length} item{knowledge.length === 1 ? "" : "s"}
            </p>
          </div>
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-2 text-sm bg-zinc-200 text-zinc-950 hover:bg-white font-medium px-3.5 py-2 rounded-lg transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Add note
          </button>
        </div>

        {/* Helper text */}
        <div className="text-[11px] text-zinc-600 leading-relaxed">
          Context grows automatically from every Agent Thread conversation, uploaded document, and integration sync.
          You can also add notes manually — they feed directly into the AI&apos;s system prompt.
        </div>

        {/* Connected sources strip */}
        <div className="grid grid-cols-2 gap-3">
          {firmData.config.integrations.slice(0, 4).map((integration) => (
            <SourceCard
              key={integration.name}
              name={integration.name}
              subtitle={integration.subtitle}
              synced={integration.synced}
            />
          ))}
        </div>

        {/* Knowledge items */}
        {knowledge.length === 0 ? (
          <div className="py-16 text-center">
            <BookMarked className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-sm text-zinc-500">No context captured yet for this client.</p>
            <p className="text-xs text-zinc-600 mt-1">FractionalOS will start learning as you work.</p>
            <button
              onClick={() => setIsAddOpen(true)}
              className="mt-4 inline-flex items-center gap-2 text-xs bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-zinc-100 px-3 py-1.5 rounded-md transition-colors"
            >
              <Plus className="w-3 h-3" />
              Add first note
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {knowledge.map((item) => (
              <KnowledgeCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>

      <AddNoteDialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        clientId={clientId}
        clientName={client.name}
      />
    </div>
  );
}

function SourceCard({ name, subtitle, synced }: { name: string; subtitle: string; synced: boolean }) {
  return (
    <div className="p-4 rounded-xl border border-zinc-800 bg-[#0a0a0a] flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center">
        <Database className="w-5 h-5 text-zinc-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-zinc-200">{name}</div>
        <div className="text-xs text-zinc-500 flex items-center gap-1.5 mt-0.5">
          <div className={`w-1.5 h-1.5 rounded-full ${synced ? "bg-emerald-500" : "bg-amber-500"}`} />
          {subtitle}
        </div>
      </div>
    </div>
  );
}

function KnowledgeCard({ item }: { item: KnowledgeItem }) {
  const categoryConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
    preference: { icon: <User className="w-3.5 h-3.5" />, label: "Preference", color: "text-violet-400" },
    pattern: { icon: <Lightbulb className="w-3.5 h-3.5" />, label: "Pattern", color: "text-amber-400" },
    history: { icon: <FileText className="w-3.5 h-3.5" />, label: "History", color: "text-blue-400" },
    contact: { icon: <User className="w-3.5 h-3.5" />, label: "Contact", color: "text-cyan-400" },
    compliance: { icon: <Shield className="w-3.5 h-3.5" />, label: "Compliance", color: "text-red-400" },
  };
  const sourceConfig: Record<string, string> = {
    "ai-learned": "Learned by AI",
    "team-noted": "Noted by team",
    "client-shared": "Shared by client",
  };
  const cat = categoryConfig[item.category];

  return (
    <div className="p-5 rounded-xl border border-zinc-800 bg-[#0a0a0a] hover:border-zinc-700 transition-colors">
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 ${cat.color}`}>{cat.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-sm font-bold text-zinc-100">{item.title}</span>
            <span className={`text-xs ${cat.color}`}>{cat.label}</span>
          </div>
          <p className="text-sm text-zinc-400 leading-relaxed">{item.detail}</p>
          <div className="flex items-center gap-2 mt-3 text-xs text-zinc-600">
            {item.source === "ai-learned" && <Sparkles className="w-3 h-3 text-brand-primary" />}
            <span>{sourceConfig[item.source]}</span>
            <span>·</span>
            <span>Updated {item.lastUpdated}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * AddNoteDialog — inline form for capturing a team-noted Context item.
 * Collects category / title / detail, saves to the session store, and
 * the Context list re-renders via the subscribe hook.
 */
function AddNoteDialog({
  isOpen, onClose, clientId, clientName,
}: {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
}) {
  const [category, setCategory] = useState<KnowledgeItem["category"]>("preference");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setCategory("preference");
    setTitle("");
    setDetail("");
  }, [isOpen]);

  if (!isOpen) return null;

  const canSave = title.trim().length > 0 && detail.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    addSessionContext({
      clientId,
      category,
      title: title.trim(),
      detail: detail.trim(),
      source: "team-noted",
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border border-zinc-700/80 bg-[#0a0a0a] shadow-2xl shadow-black/60 overflow-hidden"
      >
        <div className="px-6 py-5 border-b border-zinc-800/80 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-zinc-100">Add context note</div>
            <div className="text-xs text-zinc-500 mt-0.5">Adding to {clientName}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {/* Category */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Category</div>
            <div className="grid grid-cols-5 gap-2">
              {(["preference", "pattern", "history", "contact", "compliance"] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`text-xs capitalize px-2 py-2 rounded-lg border transition-colors ${
                    category === cat
                      ? "border-zinc-500 bg-zinc-800/80 text-zinc-100 font-medium"
                      : "border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          {/* Title */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 block">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Owner prefers weekly summary email"
              autoFocus
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
            />
          </div>
          {/* Detail */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 block">Detail</label>
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="What should the AI know? Any nuance that changes how we work with this client?"
              rows={4}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 resize-none"
            />
          </div>
          <div className="text-[11px] text-zinc-600 leading-relaxed">
            This note will be fed into the AI&apos;s system prompt for every conversation about {clientName}.
          </div>
        </div>
        <div className="px-6 py-4 border-t border-zinc-800/80 flex items-center justify-end gap-2 bg-[#080808]">
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-zinc-400 hover:text-zinc-200 px-4 py-2 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="text-sm bg-zinc-200 text-zinc-950 hover:bg-white font-medium px-4 py-2 rounded-md transition-colors disabled:opacity-40 disabled:hover:bg-zinc-200"
          >
            Save note
          </button>
        </div>
      </div>
    </div>
  );
}
