"use client";

import { useState, useEffect, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import {
  FileText,
  ArrowRight,
  CheckCircle2,
  Users,
  LineChart,
  Cpu,
  Fingerprint,
  Layers,
  Command,
  X,
  FileSpreadsheet,
  Presentation,
  Network,
  BrainCircuit,
  Calculator,
  Scale,
  TrendingUp,
  Palette,
  Briefcase,
} from "lucide-react";

/* ── Nav ── */
function Nav({ onOpenModal, onEnterApp }: { onOpenModal: () => void; onEnterApp: () => void }) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-4 py-6 pointer-events-none">
      <div className="max-w-7xl mx-auto flex items-center justify-between glass-panel px-6 md:px-8 py-4 pointer-events-auto shadow-2xl shadow-black/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center shadow-lg">
            <Command className="w-6 h-6 text-zinc-950" />
          </div>
          <span className="font-bold text-xl tracking-tighter text-zinc-100 hidden sm:inline">
            Fir<span className="text-zinc-500">mem</span>
          </span>
        </div>
        <div className="hidden md:flex items-center gap-10 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500">
          <a href="#features" className="hover:text-zinc-100 transition-colors">Platform</a>
          <a href="#impact" className="hover:text-zinc-100 transition-colors">Impact</a>
          <a href="#pricing" className="hover:text-zinc-100 transition-colors">Pricing</a>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={onEnterApp} className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-100 transition-colors hidden sm:block">
            Sign In
          </button>
          <button onClick={onOpenModal} className="btn-premium py-2 px-6 text-[10px] uppercase tracking-widest">
            Request Access
          </button>
        </div>
      </div>
    </nav>
  );
}

/* ── Workspace Init Overlay ── */
function WorkspaceInitOverlay({ visible }: { visible: boolean }) {
  const [step, setStep] = useState(0);
  const steps = [
    "Loading your firm context...",
    "Reconnecting to QuickBooks...",
    "Reviewing 47 client updates from the last 8 hours...",
    "Drafting morning briefing...",
  ];
  useEffect(() => {
    if (!visible) { setStep(0); return; }
    const timers = steps.map((_, i) => setTimeout(() => setStep(i + 1), 350 * (i + 1)));
    return () => timers.forEach(clearTimeout);
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[300] flex items-center justify-center bg-bg-base"
        >
          <div className="text-center">
            <div className="relative w-16 h-16 mx-auto mb-8">
              <div className="absolute inset-0 rounded-2xl bg-zinc-100 flex items-center justify-center shadow-2xl">
                <Command className="w-8 h-8 text-zinc-950" />
              </div>
              <span className="absolute inset-0 rounded-2xl border border-zinc-100 animate-pulse-dot" />
            </div>
            <div className="text-sm text-zinc-400 font-medium mb-2">Firmem</div>
            <div className="space-y-1.5 max-w-sm mx-auto">
              {steps.slice(0, step).map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-zinc-500 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span>{s}</span>
                </motion.div>
              ))}
              {step < steps.length && (
                <div className="text-xs text-zinc-600 flex items-center justify-center gap-2 pt-1">
                  <div className="w-3 h-3 rounded-full border border-zinc-700 border-t-zinc-400 animate-spin" />
                  <span>{steps[step]}</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Early Access Modal ── */
const VERTICALS = [
  { value: "accounting", label: "Accounting / Tax" },
  { value: "law", label: "Law" },
  { value: "hr", label: "HR Advisory" },
  { value: "marketing", label: "Marketing / Agency" },
  { value: "consulting", label: "Consulting" },
  { value: "other", label: "Other" },
];

const WAITLIST_API = "/api/early-access";

function EarlyAccessModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [vertical, setVertical] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !vertical || !consent) return;

    setStatus("submitting");
    setErrorMsg("");

    try {
      const res = await fetch(WAITLIST_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          firm_vertical: vertical,
          landing_variant: "mockup-demo",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  const handleClose = () => {
    if (status === "success") {
      setStatus("idle");
      setEmail("");
      setVertical("");
      setConsent(false);
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={handleClose} className="absolute inset-0 bg-zinc-950/80 backdrop-blur-md" />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-md glass-panel p-10 bg-bg-surface border-zinc-800 shadow-2xl">
            <button onClick={handleClose} className="absolute top-6 right-6 text-zinc-500 hover:text-white"><X className="w-6 h-6" /></button>
            {status !== "success" ? (
              <>
                <div className="w-16 h-16 bg-zinc-100 rounded-2xl flex items-center justify-center mb-8">
                  <Fingerprint className="w-8 h-8 text-zinc-950" />
                </div>
                <h2 className="text-3xl font-extrabold mb-4 text-zinc-100">Get early access</h2>
                <p className="text-zinc-400 mb-8 leading-relaxed">Join 50 boutique firms shaping what Firmem becomes. Tell us about yours.</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <input type="email" required placeholder="name@firm.com" className="input-premium" value={email} onChange={(e) => setEmail(e.target.value)} />
                  <select required value={vertical} onChange={(e) => setVertical(e.target.value)} className="input-premium w-full appearance-none" style={{ color: vertical ? undefined : "#71717a" }}>
                    <option value="" disabled>Your industry</option>
                    {VERTICALS.map((v) => (
                      <option key={v.value} value={v.value}>{v.label}</option>
                    ))}
                  </select>
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input type="checkbox" required checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500/20" />
                    <span className="text-xs text-zinc-500 leading-relaxed group-hover:text-zinc-400 transition-colors">
                      I agree to receive product updates via email. You can unsubscribe at any time. We never share your information with third parties.
                    </span>
                  </label>
                  <button type="submit" disabled={status === "submitting" || !consent} className="btn-premium w-full disabled:opacity-50">
                    {status === "submitting" ? "Requesting..." : "Request Invitation"}
                  </button>
                  {status === "error" && (
                    <p className="text-red-400 text-xs text-center">{errorMsg}</p>
                  )}
                </form>
                <p className="mt-6 text-center text-xs text-zinc-600">We respond within 48 hours. No credit card, no commitment.</p>
              </>
            ) : (
              <div className="text-center py-10">
                <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                </div>
                <h2 className="text-3xl font-extrabold mb-4 text-zinc-100">You&apos;re in!</h2>
                <p className="text-zinc-400 leading-relaxed">We&apos;ll reach out within 48 hours to learn about your firm and how Firmem can help.</p>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ── Hero ── */
interface IndustryCard {
  id: string;              // firm id in the registry
  label: string;           // display label
  sublabel: string;        // tagline
  icon: React.ComponentType<{ className?: string }>;
  accent: string;          // tailwind color class (border-*, text-*)
}

const INDUSTRY_CARDS: IndustryCard[] = [
  { id: "park-accounting", label: "Accounting",  sublabel: "Park Accounting Group",   icon: Calculator, accent: "text-indigo-400" },
  { id: "chen-morgan",     label: "Law",         sublabel: "Chen Morgan LLP",         icon: Scale,      accent: "text-teal-400" },
  { id: "north-arc",       label: "Consulting",  sublabel: "North Arc Advisors",      icon: TrendingUp, accent: "text-violet-400" },
  { id: "wildcard-studio", label: "Agency",      sublabel: "Wildcard Studio",         icon: Palette,    accent: "text-rose-400" },
  { id: "lattice-partners",label: "HR Advisory", sublabel: "Lattice Partners HR",     icon: Briefcase,  accent: "text-purple-400" },
];

function Hero({
  onOpenModal,
  onEnterFirm,
  onTourAllIndustries,
}: {
  onOpenModal: () => void;
  onEnterFirm: (firmId: string) => void;
  onTourAllIndustries: () => void;
}) {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center pt-32 pb-20 px-6 overflow-hidden bg-mesh">
      <div className="max-w-5xl mx-auto text-center relative z-10">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 text-[11px] font-bold tracking-[0.2em] uppercase mb-10">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Early Access — For Boutique Professional Services Firms
          </div>
          <h1 className="text-6xl md:text-8xl font-black mb-8 leading-[0.95] tracking-[-0.05em] text-zinc-100">
            Manage 50 clients.<br />With the memory of <span className="text-zinc-500">one.</span>
          </h1>
          <p className="text-xl md:text-2xl text-zinc-500 max-w-3xl mx-auto mb-14 leading-relaxed text-balance">
            A workspace that remembers every client relationship your team manages — so the expertise in your head doesn&apos;t get lost in the tab-switching.
          </p>

          {/* 5 industry cards — each enters the dashboard as a single-firm user */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 max-w-4xl mx-auto mb-10">
            {INDUSTRY_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.id}
                  onClick={() => onEnterFirm(card.id)}
                  className="group relative bento-card p-5 md:p-6 flex flex-col items-start text-left border-zinc-800/60 hover:border-zinc-600 transition-all"
                >
                  <Icon className={`w-6 h-6 mb-4 ${card.accent}`} />
                  <div className="text-base md:text-lg font-bold text-zinc-100 mb-1">{card.label}</div>
                  <div className="text-[11px] text-zinc-500 leading-tight">{card.sublabel}</div>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-300 absolute top-5 right-5 transition-colors" />
                </button>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={onOpenModal} className="btn-premium flex items-center justify-center gap-3 text-sm py-4 px-10">
              Request Early Access <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onTourAllIndustries}
              className="btn-outline flex items-center justify-center gap-3 text-sm"
            >
              Explore the demo <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ── Bento Features ── */
function BentoFeatures() {
  return (
    <section id="features" className="py-40 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-8 bento-card p-12 flex flex-col justify-between min-h-[500px] group">
            <div className="max-w-md">
              <div className="w-16 h-16 bg-zinc-900 rounded-3xl flex items-center justify-center mb-10 group-hover:bg-zinc-100 transition-colors duration-500">
                <BrainCircuit className="w-8 h-8 text-zinc-500 group-hover:text-zinc-950 transition-colors" />
              </div>
              <h3 className="text-4xl font-black mb-6">One workspace per client</h3>
              <p className="text-xl text-zinc-500 leading-relaxed">
                Every client gets a dedicated space. Their financials, history, preferences, and past deliverables — all in one place your whole team can see.
              </p>
            </div>
            <div className="mt-12 flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
              {[
                { title: "Brand Voice", val: "Optimized" },
                { title: "Financials", val: "Synced 2m ago" },
                { title: "Team Context", val: "Shared" },
                { title: "Past Reports", val: "128 Indexed" },
              ].map((item, i) => (
                <div key={i} className="w-40 h-24 bg-zinc-900/50 rounded-2xl border border-zinc-800/50 flex-shrink-0 p-5 flex flex-col justify-between">
                  <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{item.title}</div>
                  <div className="text-sm font-medium text-zinc-300">{item.val}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-4 bento-card p-10 flex flex-col justify-center bg-zinc-100 text-zinc-950">
            <Users className="w-12 h-12 mb-8 text-zinc-400" />
            <h3 className="text-3xl font-black mb-4 text-zinc-950">Your team&apos;s shared memory</h3>
            <p className="text-lg font-medium text-zinc-600">
              When the lead partner steps out, the junior still has full context. No more &ldquo;what did we tell this client last month?&rdquo;
            </p>
          </div>

          <div className="md:col-span-4 bento-card p-10 flex flex-col justify-center border-zinc-800/50">
            <Network className="w-12 h-12 mb-8 text-zinc-400" />
            <h3 className="text-3xl font-black mb-4 text-zinc-100">Built for your stack</h3>
            <p className="text-lg text-zinc-500">
              QuickBooks for accounting. Clio + NetDocuments for law. HubSpot + Notion for consulting. Figma for agencies. BambooHR + Gusto for HR. Always in sync.
            </p>
          </div>

          <div className="md:col-span-8 bento-card p-12 flex flex-col md:flex-row gap-12 items-center">
            <div className="flex-1">
              <div className="w-16 h-16 bg-zinc-900 rounded-3xl flex items-center justify-center mb-10">
                <Layers className="w-8 h-8 text-zinc-500" />
              </div>
              <h3 className="text-4xl font-black mb-6">Production-Ready Deliverables</h3>
              <p className="text-xl text-zinc-500 leading-relaxed">
                Financial statements. Privilege logs. Board memos. Campaign briefs. Comp band recommendations. Generated in your firm&apos;s voice, ready to ship.
              </p>
            </div>
            <div className="w-full md:w-64 space-y-4">
              {[
                { icon: FileText, label: ".docx Reports" },
                { icon: FileSpreadsheet, label: ".xlsx Models" },
                { icon: Presentation, label: ".pptx Decks" },
              ].map((item, i) => (
                <div key={i} className={`p-4 glass-panel border-zinc-800/50 flex items-center gap-4 ${i === 1 ? "translate-x-4" : ""}`}>
                  <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center">
                    <item.icon className="w-4 h-4 text-zinc-400" />
                  </div>
                  <div className="h-2 w-24 bg-zinc-800 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Impact ── */
function Impact() {
  const stats = [
    { label: "Onboarding Time", value: "-90%", desc: "For new team members to a client", icon: Users },
    { label: "Firm Capacity", value: "+40%", desc: "More clients per partner", icon: LineChart },
    { label: "Output Velocity", value: "5x", desc: "Reports, memos, and briefs — drafted before you ask", icon: Cpu },
    { label: "Context Errors", value: "-70%", desc: "Fewer cross-client mixups", icon: Fingerprint },
  ];

  return (
    <section id="impact" className="py-40 px-6 bg-zinc-950/30">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-24">
          <h2 className="text-4xl md:text-6xl font-black mb-8 tracking-tighter">The ROI of <span className="text-zinc-500">Shared Context.</span></h2>
          <p className="text-xl text-zinc-500 max-w-2xl mx-auto">
            Your firm manages 50 clients today. Firmem makes 80 possible — with the same team.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <div key={i} className="bento-card p-10 flex flex-col items-center text-center group">
              <div className="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center mb-6 group-hover:bg-zinc-100 transition-colors duration-500">
                <stat.icon className="w-6 h-6 text-zinc-600 group-hover:text-zinc-950 transition-colors" />
              </div>
              <div className="text-4xl font-black text-zinc-100 mb-2">{stat.value}</div>
              <div className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4">{stat.label}</div>
              <p className="text-xs text-zinc-600 leading-relaxed">{stat.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Pricing ── */
function Pricing({ onOpenModal }: { onOpenModal: () => void }) {
  return (
    <section id="pricing" className="py-40 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-5xl md:text-7xl font-black mb-10 tracking-tighter">Built for firms your size.</h2>
        <p className="text-xl text-zinc-500 mb-16 max-w-2xl mx-auto">
          Includes your whole team. Every client, every conversation, every deliverable — one workspace.
        </p>
        <div className="glass-panel p-16 border-zinc-800 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-zinc-500 to-zinc-800" />
          <div className="text-zinc-500 font-bold uppercase tracking-[0.3em] text-[10px] mb-6">Early Access Pricing</div>
          <div className="flex items-center justify-center gap-4 mb-12">
            <span className="text-5xl md:text-7xl font-black text-zinc-100">$99</span>
            <span className="text-zinc-600 font-bold text-xl">/seat/month</span>
          </div>
          <div className="text-zinc-400 mb-12">We&apos;ll work with you on pricing that makes sense for your firm.</div>
          <button onClick={onOpenModal} className="btn-premium w-full py-6 text-xl">Request Early Access</button>
        </div>
      </div>
    </section>
  );
}

/* ── Footer ── */
function Footer() {
  return (
    <footer className="py-20 px-6 border-t border-border-subtle">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center">
            <Command className="w-6 h-6 text-zinc-950" />
          </div>
          <span className="font-bold text-xl tracking-tighter text-zinc-100">Fir<span className="text-zinc-500">mem</span></span>
        </div>
        <div className="text-zinc-700 text-xs font-mono">&copy; 2026 FRACTIONAL OS</div>
      </div>
    </footer>
  );
}

/* ── Main Landing Page ── */
export default function LandingPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEntering, setIsEntering] = useState(false);
  const router = useRouter();

  // Enter a specific firm as a single-firm user (no tour chrome).
  // Landing lands on Home view — the firm-wide command center — not on
  // an arbitrary client's workspace.
  const handleEnterFirm = (firmId: string) => {
    setIsEntering(true);
    setTimeout(() => {
      router.push(`/dashboard?firm=${firmId}&view=home`);
    }, 1800);
  };

  // Enter demo tour — firm switcher visible, Park Accounting Home as start
  const handleTourAllIndustries = () => {
    setIsEntering(true);
    setTimeout(() => {
      router.push("/dashboard?firm=park-accounting&view=home&tour=1");
    }, 1800);
  };

  // Legacy nav "Sign in" button — defaults to Park Accounting single-firm
  const handleNavEnterApp = () => handleEnterFirm("park-accounting");

  return (
    <div className="min-h-screen relative">
      <div className="grainy-overlay" />
      <Nav onOpenModal={() => setIsModalOpen(true)} onEnterApp={handleNavEnterApp} />
      <main>
        <Hero
          onOpenModal={() => setIsModalOpen(true)}
          onEnterFirm={handleEnterFirm}
          onTourAllIndustries={handleTourAllIndustries}
        />
        <BentoFeatures />
        <Impact />
        <Pricing onOpenModal={() => setIsModalOpen(true)} />
      </main>
      <Footer />
      <EarlyAccessModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <WorkspaceInitOverlay visible={isEntering} />
    </div>
  );
}
