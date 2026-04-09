"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X, Sparkles, ArrowRight, Upload, FileText, FileSpreadsheet, FileType, Mail,
  CheckCircle2, Loader2,
} from "lucide-react";
import { getActiveFirmData } from "@/lib/firm-context";
import {
  addSessionClient,
  addSessionContext,
  addSessionOutput,
  type NewClientSeed,
} from "@/lib/session-clients";
import type { ClientDocument, KnowledgeItem } from "@/data/mock-data";

/**
 * NewClientModal — the file-drop-first onboarding flow.
 *
 * Philosophy: adding a client should be magical. The user drops a pile of
 * documents, the AI "reads" them, and the workspace appears — Context
 * populated, Output drafts staged, Agent Thread ready to go.
 *
 * Flow stages:
 *   1. "drop"    — empty drop zone, waiting for files
 *   2. "analyze" — fake loading while we pretend to parse
 *   3. "review"  — show extracted client name + context + output previews,
 *                  user can edit the name and confirm
 *
 * The modal skips every field of the old form (industry picker, contact
 * inputs, integration dropdown). All of that is "extracted" from filenames
 * in mockExtractFromFiles(). The user only sees the client name field.
 *
 * Session-only — everything resets on refresh.
 */
type Stage = "drop" | "analyze" | "review";

interface ExtractedPlan {
  clientName: string;
  industry: string;
  industryIcon: string;
  entityType: string;
  contactName: string;
  contactEmail: string;
  integrationLabel: string;
  contextItems: Array<Pick<KnowledgeItem, "category" | "title" | "detail">>;
  outputDrafts: Array<{ title: string; format: ClientDocument["format"]; source: "uploaded" | "ai" }>;
}

export function NewClientModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (clientId: string) => void;
}) {
  const firmData = getActiveFirmData();
  const vertical = firmData.firm.vertical;

  const [stage, setStage] = useState<Stage>("drop");
  const [droppedFiles, setDroppedFiles] = useState<File[]>([]);
  const [plan, setPlan] = useState<ExtractedPlan | null>(null);
  const [editedName, setEditedName] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset whenever the modal opens
  useEffect(() => {
    if (!isOpen) return;
    setStage("drop");
    setDroppedFiles([]);
    setPlan(null);
    setEditedName("");
    setDragActive(false);
  }, [isOpen]);

  // ESC closes
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    setDroppedFiles(files);
    setStage("analyze");
    // Simulated AI analysis — 1.8s so it feels substantive but not slow
    window.setTimeout(() => {
      const extracted = mockExtractFromFiles(files, vertical);
      setPlan(extracted);
      setEditedName(extracted.clientName);
      setStage("review");
    }, 1800);
  };

  const handleCreate = () => {
    if (!plan) return;
    const finalName = editedName.trim() || plan.clientName;

    const seed: NewClientSeed = {
      firmId: firmData.firm.id,
      name: finalName,
      industry: plan.industry,
      industryIcon: plan.industryIcon,
      entityType: plan.entityType,
      assignedTo: firmData.team[0]?.id ?? "",
      contactName: plan.contactName,
      contactEmail: plan.contactEmail,
      integrationLabel: plan.integrationLabel,
      monthlyFee: "TBD",
      workflowStatusLabel: "Onboarding",
      uploadedFileNames: droppedFiles.map((f) => f.name),
    };
    const newClient = addSessionClient(seed);

    // Populate session Context from extracted items
    plan.contextItems.forEach((item) => {
      addSessionContext({
        clientId: newClient.id,
        category: item.category,
        title: item.title,
        detail: item.detail,
        source: "ai-learned",
      });
    });

    // Populate session Output from extracted drafts
    plan.outputDrafts.forEach((draft) => {
      addSessionOutput({
        clientId: newClient.id,
        title: draft.title,
        format: draft.format,
        source: draft.source,
        status: draft.source === "ai" ? "draft" : "approved",
      });
    });

    onClose();
    // Delay routing briefly so the close animation can play
    window.setTimeout(() => onCreated(newClient.id), 150);
  };

  const handleSkipToManual = () => {
    // Let the user proceed without files — use blank extraction
    const blank = mockExtractFromFiles([], vertical);
    setPlan(blank);
    setEditedName("");
    setStage("review");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-md"
          />

          <div className="fixed inset-0 z-[201] flex items-start justify-center pt-[8vh] px-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -20 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-2xl pointer-events-auto"
            >
              <div className="rounded-2xl border border-zinc-700/80 bg-[#0a0a0a] shadow-2xl shadow-black/60 overflow-hidden">
                {/* Header */}
                <div className="px-6 py-5 border-b border-zinc-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-zinc-400" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-zinc-100">
                        {stage === "drop" && "New client"}
                        {stage === "analyze" && "Reading your files..."}
                        {stage === "review" && "Ready to create"}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {stage === "drop" && "Drop the documents you already have. FractionalOS will do the rest."}
                        {stage === "analyze" && "Extracting context, drafting deliverables, building the workspace."}
                        {stage === "review" && "Review what I found, then click create to start the Agent Thread."}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-zinc-500 hover:text-zinc-200 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Body — stage-specific */}
                <div className="px-6 py-5 max-h-[65vh] overflow-y-auto hide-scrollbar">
                  {stage === "drop" && (
                    <DropStage
                      dragActive={dragActive}
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
                      onFileInput={(e) => handleFiles(e.currentTarget.files)}
                      fileInputRef={fileInputRef}
                      onSkip={handleSkipToManual}
                    />
                  )}
                  {stage === "analyze" && <AnalyzeStage files={droppedFiles} />}
                  {stage === "review" && plan && (
                    <ReviewStage
                      plan={plan}
                      editedName={editedName}
                      onEditName={setEditedName}
                      droppedFiles={droppedFiles}
                    />
                  )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-zinc-800/80 flex items-center justify-between bg-[#080808]">
                  <div className="text-[11px] text-zinc-600">
                    Session-only — resets on refresh
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="text-sm text-zinc-400 hover:text-zinc-200 px-4 py-2 transition-colors"
                    >
                      Cancel
                    </button>
                    {stage === "review" && (
                      <button
                        type="button"
                        onClick={handleCreate}
                        disabled={!editedName.trim()}
                        className="flex items-center gap-2 text-sm bg-zinc-200 text-zinc-950 hover:bg-white font-medium px-4 py-2 rounded-md transition-colors disabled:opacity-40 disabled:hover:bg-zinc-200"
                      >
                        Create & open Agent Thread
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ── Drop stage ── */
function DropStage({
  dragActive, onDragOver, onDragLeave, onDrop, onClick, onFileInput, fileInputRef, onSkip,
}: {
  dragActive: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onClick: () => void;
  onFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onSkip: () => void;
}) {
  return (
    <div className="space-y-4">
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={onClick}
        className={`rounded-xl border-2 border-dashed ${
          dragActive
            ? "border-zinc-500 bg-zinc-900/60"
            : "border-zinc-800 bg-[#080808]"
        } px-6 py-16 text-center cursor-pointer hover:border-zinc-700 transition-colors`}
      >
        <Upload className="w-10 h-10 text-zinc-600 mx-auto mb-4" />
        <div className="text-base text-zinc-200 font-medium mb-1">
          Drop files to begin
        </div>
        <div className="text-sm text-zinc-500 max-w-sm mx-auto leading-relaxed">
          Tax returns, prior-year statements, engagement letters, bank exports,
          contracts — whatever you have. The AI will figure out the rest.
        </div>
        <div className="mt-4 flex items-center justify-center gap-3 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
          <FormatChip icon={<FileSpreadsheet className="w-3 h-3" />} label="xlsx" />
          <FormatChip icon={<FileText className="w-3 h-3" />} label="docx" />
          <FormatChip icon={<FileType className="w-3 h-3" />} label="pdf" />
          <FormatChip icon={<Mail className="w-3 h-3" />} label="eml" />
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={onFileInput}
      />
      <div className="text-center">
        <button
          type="button"
          onClick={onSkip}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors underline underline-offset-4 decoration-zinc-700"
        >
          Don&apos;t have files yet? Start from scratch
        </button>
      </div>
    </div>
  );
}

function FormatChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1 text-zinc-500">
      {icon}
      <span>{label}</span>
    </div>
  );
}

/* ── Analyze stage ── */
function AnalyzeStage({ files }: { files: File[] }) {
  return (
    <div className="py-12 space-y-5">
      <div className="flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-zinc-500 animate-spin" />
      </div>
      <div className="text-center space-y-1">
        <div className="text-sm text-zinc-200 font-medium">
          Reading {files.length} file{files.length === 1 ? "" : "s"}...
        </div>
        <div className="text-xs text-zinc-500">
          Extracting company name, contacts, patterns, and key history
        </div>
      </div>
      <div className="max-w-sm mx-auto space-y-1.5">
        {files.slice(0, 5).map((f) => (
          <div key={f.name} className="flex items-center gap-2 text-xs text-zinc-500">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="truncate">{f.name}</span>
          </div>
        ))}
        {files.length > 5 && (
          <div className="text-xs text-zinc-600 pl-5">+{files.length - 5} more</div>
        )}
      </div>
    </div>
  );
}

/* ── Review stage ── */
function ReviewStage({
  plan, editedName, onEditName, droppedFiles,
}: {
  plan: ExtractedPlan;
  editedName: string;
  onEditName: (v: string) => void;
  droppedFiles: File[];
}) {
  return (
    <div className="space-y-5">
      {/* Name — editable */}
      <div>
        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 block">
          Client name {droppedFiles.length > 0 && <span className="text-zinc-600 normal-case tracking-normal">· extracted from {droppedFiles.length} file{droppedFiles.length === 1 ? "" : "s"}</span>}
        </label>
        <input
          type="text"
          value={editedName}
          onChange={(e) => onEditName(e.target.value)}
          placeholder="Client name"
          autoFocus
          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
        />
        <div className="mt-2 text-[11px] text-zinc-600">
          Industry: <span className="text-zinc-400">{plan.industry} {plan.industryIcon}</span>
          {" · "}
          Entity: <span className="text-zinc-400">{plan.entityType}</span>
        </div>
      </div>

      {/* Context preview */}
      {plan.contextItems.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-brand-primary" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              Context extracted
            </span>
            <span className="text-[11px] text-zinc-600">{plan.contextItems.length} items</span>
          </div>
          <div className="space-y-1.5">
            {plan.contextItems.map((item, i) => (
              <div key={i} className="px-3 py-2 rounded-lg bg-zinc-900/60 border border-zinc-800">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs text-zinc-200 font-medium">{item.title}</span>
                  <span className="text-[10px] text-zinc-500 capitalize">· {item.category}</span>
                </div>
                <div className="text-[11px] text-zinc-500 leading-relaxed">{item.detail}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Output preview */}
      {plan.outputDrafts.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              Output staged
            </span>
            <span className="text-[11px] text-zinc-600">{plan.outputDrafts.length} items</span>
          </div>
          <div className="space-y-1.5">
            {plan.outputDrafts.map((draft, i) => {
              const Icon = draft.format === "xlsx" ? FileSpreadsheet : draft.format === "pdf" ? FileType : draft.format === "email" ? Mail : FileText;
              return (
                <div key={i} className="px-3 py-2 rounded-lg bg-zinc-900/60 border border-zinc-800 flex items-center gap-3">
                  <Icon className="w-4 h-4 text-zinc-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-zinc-200 truncate">{draft.title}</div>
                    <div className="text-[10px] text-zinc-600">
                      {draft.source === "ai" ? "AI draft — pending review" : "Uploaded — approved"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {plan.contextItems.length === 0 && plan.outputDrafts.length === 0 && (
        <div className="py-4 text-center text-xs text-zinc-500">
          Starting with a blank workspace. You can add context and upload files after creation.
        </div>
      )}
    </div>
  );
}

// ============================================================================
// mockExtractFromFiles — the "AI analysis" the modal pretends to run
// ============================================================================
// In a real product this would parse each file, call an LLM, and return
// structured metadata. In the mockup, we inspect filenames for hints and
// use vertical-specific templates. The result is believable enough for a
// demo without actually reading file contents.
// ============================================================================
function mockExtractFromFiles(files: File[], vertical: string): ExtractedPlan {
  const fileNames = files.map((f) => f.name);
  const guessedName = guessClientName(fileNames) ?? DEFAULT_NAMES[vertical] ?? "New Client";
  const verticalDefaults = VERTICAL_DEFAULTS[vertical] ?? VERTICAL_DEFAULTS.accounting;

  // Build Output drafts: one entry per uploaded file + one AI-generated
  // summary draft if we have any files at all.
  const outputDrafts: ExtractedPlan["outputDrafts"] = files.map((f) => ({
    title: stripExtension(f.name),
    format: guessFormat(f.name),
    source: "uploaded" as const,
  }));
  if (files.length > 0) {
    outputDrafts.push({
      title: `${guessedName} — Onboarding summary`,
      format: "docx",
      source: "ai",
    });
  }

  // Context items — vertical-specific AI-extracted preferences/patterns.
  // If no files, return empty context (user chose "start from scratch").
  const contextItems: ExtractedPlan["contextItems"] =
    files.length === 0 ? [] : verticalDefaults.contextItems.map((item) => ({ ...item }));

  return {
    clientName: guessedName,
    industry: verticalDefaults.industry,
    industryIcon: verticalDefaults.industryIcon,
    entityType: verticalDefaults.entityType,
    contactName: verticalDefaults.contactName,
    contactEmail: verticalDefaults.contactEmail(guessedName),
    integrationLabel: verticalDefaults.integrationLabel,
    contextItems,
    outputDrafts,
  };
}

/**
 * Try to guess a client name from file names. We look for the longest
 * common prefix among non-trivial tokens, falling back to the cleaned-up
 * first filename if there's no clear pattern.
 */
function guessClientName(fileNames: string[]): string | null {
  if (fileNames.length === 0) return null;
  // Clean one filename — strip extension, split on common separators,
  // capitalize words, and take the first 2-3 meaningful tokens.
  const cleaned = stripExtension(fileNames[0])
    .replace(/[_\-.]/g, " ")
    .replace(/\b(20\d{2}|q[1-4]|annual|report|tax|return|financial|statement|contract|invoice|bank|statements?|prior|year|ly|bs|is|pl|memo|draft|final|v\d+)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return null;
  return cleaned
    .split(" ")
    .slice(0, 3)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function stripExtension(fileName: string): string {
  const idx = fileName.lastIndexOf(".");
  return idx > 0 ? fileName.slice(0, idx) : fileName;
}

function guessFormat(fileName: string): ClientDocument["format"] {
  const ext = fileName.toLowerCase().split(".").pop() ?? "";
  if (ext === "xlsx" || ext === "xls" || ext === "csv") return "xlsx";
  if (ext === "pdf") return "pdf";
  if (ext === "eml" || ext === "msg") return "email";
  return "docx";
}

// Vertical-specific extraction templates
interface VerticalDefault {
  industry: string;
  industryIcon: string;
  entityType: string;
  contactName: string;
  contactEmail: (clientName: string) => string;
  integrationLabel: string;
  contextItems: Array<Pick<KnowledgeItem, "category" | "title" | "detail">>;
}

const VERTICAL_DEFAULTS: Record<string, VerticalDefault> = {
  accounting: {
    industry: "Food & Beverage",
    industryIcon: "🍽",
    entityType: "S-Corp",
    contactName: "Owner / Primary contact",
    contactEmail: (name) => `${toSlug(name)}@example.com`,
    integrationLabel: "QuickBooks",
    contextItems: [
      {
        category: "history",
        title: "Prior-year return reviewed",
        detail: "Parsed last year's 1120-S. Gross receipts, deductions, and depreciation schedule captured. No unusual deductions flagged.",
      },
      {
        category: "pattern",
        title: "Monthly revenue range",
        detail: "Last 12 months show $140K–$165K monthly revenue. Seasonal spike in Nov/Dec. Feed this into variance alerts.",
      },
      {
        category: "compliance",
        title: "S-Corp election on file",
        detail: "Form 2553 accepted. Annual reasonable-compensation review required each January before payroll year-end.",
      },
    ],
  },
  law: {
    industry: "Commercial Litigation",
    industryIcon: "⚖",
    entityType: "Plaintiff",
    contactName: "Lead counsel contact",
    contactEmail: (name) => `${toSlug(name)}@example.com`,
    integrationLabel: "Clio",
    contextItems: [
      {
        category: "history",
        title: "Engagement letter parsed",
        detail: "Hourly at $650/hr. Conflict check cleared. Retainer of $15K. Scope limited to discovery through summary judgment.",
      },
      {
        category: "compliance",
        title: "Privilege log in progress",
        detail: "Initial document production shows ~2,400 items. Privilege review rolling — AI flagging borderline calls for attorney review.",
      },
      {
        category: "preference",
        title: "Client prefers bullet-point updates",
        detail: "Lead counsel requested concise status emails, bullet format, no prose. Weekly on Fridays.",
      },
    ],
  },
  consulting: {
    industry: "SaaS",
    industryIcon: "💻",
    entityType: "C-Corp",
    contactName: "CEO / Sponsor",
    contactEmail: (name) => `${toSlug(name)}@example.com`,
    integrationLabel: "Looker",
    contextItems: [
      {
        category: "history",
        title: "Series A pitch deck reviewed",
        detail: "Raised $12M Q2 2025. Lead investor: Sequoia. Board cadence: monthly. ARR target for Series B: $24M by Q4.",
      },
      {
        category: "pattern",
        title: "Cohort retention benchmark",
        detail: "Month-12 logo retention at 87%. NDR 118%. Use as the reference line for all board-deck projections.",
      },
      {
        category: "preference",
        title: "Sponsor wants narrative, not tables",
        detail: "CEO asks for one-page executive summary with charts, full tables in appendix. Never lead with raw data.",
      },
    ],
  },
  agency: {
    industry: "DTC / Lifestyle",
    industryIcon: "🛍",
    entityType: "Retainer",
    contactName: "Brand director",
    contactEmail: (name) => `${toSlug(name)}@example.com`,
    integrationLabel: "Figma",
    contextItems: [
      {
        category: "history",
        title: "Brand guidelines parsed",
        detail: "Voice: warm, confident, understated. Palette locked. Heritage imagery approved, trend-chasing rejected.",
      },
      {
        category: "preference",
        title: "Hero creative needs two options",
        detail: "Brand director always wants a Heritage cut and a Modern cut side by side. Never present a single hero.",
      },
      {
        category: "pattern",
        title: "Seasonal campaign cadence",
        detail: "Four campaigns per year, kicking off 10 weeks before each launch. Creative review gates at week 6, 4, 2.",
      },
    ],
  },
  hr: {
    industry: "Growth-stage SaaS",
    industryIcon: "🌱",
    entityType: "C-Corp",
    contactName: "Head of People",
    contactEmail: (name) => `${toSlug(name)}@example.com`,
    integrationLabel: "Workday",
    contextItems: [
      {
        category: "history",
        title: "Current comp bands imported",
        detail: "IC1–IC6 ladder loaded. Levels match Radford + 10%. Director+ comp negotiated individually, not banded.",
      },
      {
        category: "compliance",
        title: "Pay transparency requirements",
        detail: "Company operates in CA, CO, NY, WA — all with posted-range requirements. Any offer letter must include band.",
      },
      {
        category: "preference",
        title: "Sponsor wants parity analysis first",
        detail: "Head of People always asks 'where are we vs market?' before discussing individual adjustments. Lead with parity.",
      },
    ],
  },
};

const DEFAULT_NAMES: Record<string, string> = {
  accounting: "New Client Co.",
  law: "New Client",
  consulting: "New Client",
  agency: "New Client",
  hr: "New Client",
};

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);
}
