"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
  FileText, FileSpreadsheet, Mail, FileType,
  Sparkles, User, CheckCircle2, Clock, Archive, Upload, X,
} from "lucide-react";
import { type ClientDocument } from "@/data/mock-data";
import { getActiveClient } from "@/data/firms";
import { getActiveFirmData } from "@/lib/firm-context";
import {
  addSessionOutput,
  getSessionOutputForClient,
  subscribeSessionStore,
} from "@/lib/session-clients";

/**
 * OutputView — everything the firm has produced (or uploaded) for this
 * client. Output is client-facing: things the team delivers, things the AI
 * drafts for review, documents the client themselves have shared.
 *
 * The list is a merge of static firm data and the session Output store
 * (items added at runtime via the Upload button or from the new-client
 * file-drop flow).
 */
export function OutputView({ clientId }: { clientId: string }) {
  const client = getActiveClient(clientId);
  const firmData = getActiveFirmData();

  // Re-render on any session store mutation (upload, new client, etc.)
  // so newly added items appear without a refresh.
  const [, setStoreVersion] = useState(0);
  useEffect(
    () => subscribeSessionStore(() => setStoreVersion((v) => v + 1)),
    []
  );

  const docs: ClientDocument[] = useMemo(
    () => [
      ...getSessionOutputForClient(clientId),
      ...firmData.clientDocuments.filter((d) => d.clientId === clientId),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clientId, firmData]
  );

  const [isUploadOpen, setIsUploadOpen] = useState(false);

  if (!client) return null;

  const grouped = {
    pending: docs.filter((d) => d.status === "pending-review" || d.status === "draft" || d.status === "ready-to-send"),
    approved: docs.filter((d) => d.status === "approved"),
    archived: docs.filter((d) => d.status === "archived"),
  };

  return (
    <div className="absolute inset-0 overflow-y-auto p-8 lg:p-10 hide-scrollbar bg-[#050505]">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-zinc-100 mb-1">Output</h2>
            <p className="text-sm text-zinc-500">
              Everything the firm has produced or uploaded for{" "}
              <span className="text-zinc-300">{client.name}</span> · {docs.length} item{docs.length === 1 ? "" : "s"}
            </p>
          </div>
          <button
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-2 text-sm bg-zinc-200 text-zinc-950 hover:bg-white font-medium px-3.5 py-2 rounded-lg transition-colors shrink-0"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload
          </button>
        </div>

        {/* Helper text — only when there's something to show */}
        {docs.length > 0 && (
          <div className="text-[11px] text-zinc-600 leading-relaxed">
            AI drafts are queued here as <span className="text-zinc-500">pending review</span>.
            Uploaded files land directly as approved. Everything persists until the session resets.
          </div>
        )}

        {docs.length === 0 ? (
          <div className="py-16 text-center">
            <FileType className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-sm text-zinc-500">No output yet for this client.</p>
            <p className="text-xs text-zinc-600 mt-1">
              Upload existing deliverables, or let Firmem draft from Agent Thread.
            </p>
            <button
              onClick={() => setIsUploadOpen(true)}
              className="mt-4 inline-flex items-center gap-2 text-xs bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-zinc-100 px-3 py-1.5 rounded-md transition-colors"
            >
              <Upload className="w-3 h-3" />
              Upload first file
            </button>
          </div>
        ) : (
          <>
            {grouped.pending.length > 0 && (
              <DocSection title="In progress" icon={<Clock className="w-3.5 h-3.5 text-amber-400" />} docs={grouped.pending} />
            )}
            {grouped.approved.length > 0 && (
              <DocSection title="Approved" icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />} docs={grouped.approved} />
            )}
            {grouped.archived.length > 0 && (
              <DocSection title="Archived" icon={<Archive className="w-3.5 h-3.5 text-zinc-500" />} docs={grouped.archived} faded />
            )}
          </>
        )}
      </div>

      <UploadDialog
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        clientId={clientId}
        clientName={client.name}
      />
    </div>
  );
}

function DocSection({
  title, icon, docs, faded = false,
}: {
  title: string;
  icon: React.ReactNode;
  docs: ClientDocument[];
  faded?: boolean;
}) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="text-sm font-medium text-zinc-400">{title}</h3>
        <span className="text-xs text-zinc-600">{docs.length}</span>
      </div>
      <div className={`space-y-2 ${faded ? "opacity-60" : ""}`}>
        {docs.map((doc) => (
          <DocCard key={doc.id} doc={doc} />
        ))}
      </div>
    </section>
  );
}

function DocCard({ doc }: { doc: ClientDocument }) {
  const FormatIcon = doc.format === "xlsx" ? FileSpreadsheet : doc.format === "email" ? Mail : doc.format === "pdf" ? FileType : FileText;
  const formatColor: Record<string, string> = {
    xlsx: "text-emerald-400",
    docx: "text-blue-400",
    email: "text-violet-400",
    pdf: "text-red-400",
  };
  const statusBadge: Record<string, { label: string; cls: string }> = {
    "pending-review": { label: "Awaiting review", cls: "text-amber-400 bg-amber-500/10" },
    "draft": { label: "Draft", cls: "text-zinc-400 bg-zinc-800" },
    "ready-to-send": { label: "Ready to send", cls: "text-emerald-400 bg-emerald-500/10" },
    "approved": { label: "Approved", cls: "text-emerald-400 bg-emerald-500/10" },
    "archived": { label: "Archived", cls: "text-zinc-500 bg-zinc-900" },
  };
  const status = statusBadge[doc.status];
  const member = doc.source === "team" && doc.sourceName ? doc.sourceName : null;

  return (
    <div className="p-4 rounded-xl border border-zinc-800 bg-[#0a0a0a] hover:border-zinc-700 transition-colors flex items-center gap-4 cursor-pointer">
      <FormatIcon className={`w-5 h-5 ${formatColor[doc.format]} shrink-0`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-100 truncate">{doc.title}</span>
          {doc.version > 1 && <span className="text-xs text-zinc-600">v{doc.version}</span>}
        </div>
        <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
          {doc.source === "ai" ? (
            <span className="flex items-center gap-1"><Sparkles className="w-3 h-3 text-brand-primary" /> AI generated</span>
          ) : doc.source === "team" ? (
            <span className="flex items-center gap-1"><User className="w-3 h-3" /> {member}</span>
          ) : (
            <span>Uploaded</span>
          )}
          <span>·</span>
          <span>{doc.date}</span>
        </div>
      </div>
      <span className={`text-xs font-medium px-2 py-1 rounded ${status.cls}`}>{status.label}</span>
    </div>
  );
}

/**
 * UploadDialog — a minimal drop zone + file picker. In the mockup we don't
 * actually read the files; we just take their names and register them as
 * session Output entries with status="approved". The goal is to prove the
 * affordance exists, not to build a real ingestion pipeline.
 */
function UploadDialog({
  isOpen, onClose, clientId, clientName,
}: {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  if (!isOpen) return null;

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    Array.from(fileList).forEach((file) => {
      const format = guessFormat(file.name);
      addSessionOutput({
        clientId,
        title: stripExtension(file.name),
        format,
        source: "uploaded",
        status: "approved",
      });
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
        className="w-full max-w-md rounded-2xl border border-zinc-700/80 bg-[#0a0a0a] shadow-2xl shadow-black/60 overflow-hidden"
      >
        <div className="px-6 py-5 border-b border-zinc-800/80 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-zinc-100">Upload to Output</div>
            <div className="text-xs text-zinc-500 mt-0.5">Adding files to {clientName}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              handleFiles(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`rounded-xl border-2 border-dashed ${
              dragActive
                ? "border-zinc-500 bg-zinc-900/60"
                : "border-zinc-800 bg-[#080808]"
            } px-6 py-12 text-center cursor-pointer hover:border-zinc-700 transition-colors`}
          >
            <Upload className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
            <div className="text-sm text-zinc-300 font-medium mb-1">
              Drop files or click to browse
            </div>
            <div className="text-xs text-zinc-600">
              .xlsx, .docx, .pdf, .eml — any size
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <div className="mt-4 text-[11px] text-zinc-600 leading-relaxed">
            Uploaded files skip review and land as <span className="text-zinc-400">approved</span>.
            This is for historical deliverables and reference material — not AI drafts.
          </div>
        </div>
      </div>
    </div>
  );
}

function guessFormat(fileName: string): ClientDocument["format"] {
  const ext = fileName.toLowerCase().split(".").pop() ?? "";
  if (ext === "xlsx" || ext === "xls" || ext === "csv") return "xlsx";
  if (ext === "pdf") return "pdf";
  if (ext === "eml" || ext === "msg") return "email";
  return "docx";
}

function stripExtension(fileName: string): string {
  const idx = fileName.lastIndexOf(".");
  return idx > 0 ? fileName.slice(0, idx) : fileName;
}
