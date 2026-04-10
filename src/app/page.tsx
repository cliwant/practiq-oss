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

import Image from "next/image";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";

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
            <div className="text-sm text-zinc-300 font-medium mb-2">Firmem</div>
            <div className="space-y-1.5 max-w-sm mx-auto">
              {steps.slice(0, step).map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-zinc-400 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span>{s}</span>
                </motion.div>
              ))}
              {step < steps.length && (
                <div className="text-xs text-zinc-500 flex items-center justify-center gap-2 pt-1">
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
      // Capture UTM params from current page URL
      const params = new URLSearchParams(window.location.search);
      const res = await fetch(WAITLIST_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          firm_vertical: vertical,
          landing_variant: "mockup-demo",
          utm_source: params.get("utm_source"),
          utm_medium: params.get("utm_medium"),
          utm_campaign: params.get("utm_campaign"),
          page_url: window.location.href,
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
                <p className="text-zinc-300 mb-8 leading-relaxed">Join boutique firms shaping what Firmem becomes.<br />Tell us about yours.</p>
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
                    <span className="text-xs text-zinc-400 leading-relaxed group-hover:text-zinc-300 transition-colors">
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
                <p className="mt-6 text-center text-xs text-zinc-500">We respond within 48 hours. No credit card, no commitment.</p>
              </>
            ) : (
              <div className="text-center py-10">
                <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                </div>
                <h2 className="text-3xl font-extrabold mb-4 text-zinc-100">You&apos;re in!</h2>
                <p className="text-zinc-300 leading-relaxed">We&apos;ll reach out within 48 hours to learn about your firm and how Firmem can help.</p>
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
    <section className="relative min-h-[85vh] flex flex-col items-center justify-center pt-28 pb-10 px-6 overflow-hidden bg-mesh">
      <div className="max-w-5xl mx-auto text-center relative z-10">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
          <div className="text-zinc-400 text-sm mb-6">
            For accounting, law, HR, marketing, and consulting firms
          </div>
          <h1 className="text-6xl md:text-[5.5rem] font-black mb-6 leading-[0.95] tracking-[-0.05em] text-zinc-100">
            Manage 50 clients<br />with the memory of&nbsp;<span className="text-zinc-400">one.</span>
          </h1>
          <p className="text-lg md:text-xl text-zinc-300 mx-auto mb-10 leading-relaxed">
            A workspace that remembers every client relationship your team manages.
          </p>

          {/* 5 industry cards — each enters the dashboard as a single-firm user */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 max-w-4xl mx-auto mb-8">
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
                  <div className="text-[11px] text-zinc-400 leading-tight">{card.sublabel}</div>
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
    <section id="features" className="py-14 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-8 bento-card p-8 md:p-10 flex flex-col justify-center">
            <BrainCircuit className="w-7 h-7 text-zinc-400 mb-5" />
            <h3 className="text-2xl md:text-3xl font-bold mb-3 text-zinc-100">One workspace per client</h3>
            <p className="text-base text-zinc-300 leading-relaxed max-w-md">
              Financials, history, preferences, and past deliverables — all in one place your whole team can see.
            </p>
          </div>

          <div className="md:col-span-4 bento-card p-8 flex flex-col justify-center">
            <Users className="w-7 h-7 mb-5 text-zinc-400" />
            <h3 className="text-xl md:text-2xl font-bold mb-2 text-zinc-100">Shared team memory</h3>
            <p className="text-sm text-zinc-300 leading-relaxed">
              When the partner steps out, juniors still have full&nbsp;context.
            </p>
          </div>

          <div className="md:col-span-4 bento-card p-8 flex flex-col justify-center">
            <Network className="w-7 h-7 mb-5 text-zinc-400" />
            <h3 className="text-xl md:text-2xl font-bold mb-2 text-zinc-100">Works with your tools</h3>
            <p className="text-sm text-zinc-300 leading-relaxed">
              QuickBooks, Clio, HubSpot, Figma, BambooHR — always&nbsp;in&nbsp;sync.
            </p>
          </div>

          <div className="md:col-span-8 bento-card p-8 md:p-10 flex flex-col justify-center">
            <Layers className="w-7 h-7 text-zinc-400 mb-5" />
            <h3 className="text-2xl md:text-3xl font-bold mb-3 text-zinc-100">Ready-to-send deliverables</h3>
            <p className="text-base text-zinc-300 leading-relaxed max-w-lg">
              Financial statements, board memos, campaign briefs — generated in your firm&apos;s&nbsp;voice.
            </p>
            <div className="mt-5 flex gap-3">
              {[".docx", ".xlsx", ".pptx"].map((ext) => (
                <div key={ext} className="px-3 py-1.5 rounded-lg bg-zinc-800/60 text-zinc-400 text-sm">{ext}</div>
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
    <section id="impact" className="py-14 px-6 bg-zinc-950/30">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight text-zinc-100">Impact</h2>
          <p className="text-base text-zinc-300 max-w-lg mx-auto">
            Your firm manages 50 clients today. Firmem makes&nbsp;80&nbsp;possible&nbsp;— same&nbsp;team.
          </p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <div key={i} className="bento-card p-6 flex flex-col items-center text-center">
              <stat.icon className="w-5 h-5 text-zinc-400 mb-3" />
              <div className="text-3xl font-bold text-zinc-100 mb-1">{stat.value}</div>
              <div className="text-xs font-medium text-zinc-300 uppercase tracking-wide mb-2">{stat.label}</div>
              <p className="text-xs text-zinc-400 leading-relaxed">{stat.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── CTA ── */
function CallToAction({ onOpenModal }: { onOpenModal: () => void }) {
  return (
    <section id="cta" className="py-16 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight text-zinc-100">Ready to try Firmem?</h2>
        <p className="text-base text-zinc-300 mb-8 max-w-lg mx-auto">
          Early access includes your whole team and every client workspace. No commitment.
        </p>
        <button onClick={onOpenModal} className="btn-premium py-4 px-12 text-base">
          Request Early Access <ArrowRight className="w-4 h-4 inline ml-2" />
        </button>
      </div>
    </section>
  );
}

/* ── Dashboard Preview ── */
function DashboardPreview({ onTourDemo }: { onTourDemo: () => void }) {
  return (
    <section id="preview" className="py-14 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight text-zinc-100">See it in action</h2>
          <p className="text-base text-zinc-300 max-w-lg mx-auto">
            One dashboard for every client your firm manages.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Browser frame */}
          <div className="rounded-2xl bg-[#1a1a1a] border border-zinc-800 overflow-hidden shadow-2xl shadow-black/40">
            {/* Chrome bar */}
            <div className="flex items-center gap-2 px-5 py-3 border-b border-zinc-800/80">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-zinc-700" />
                <div className="w-3 h-3 rounded-full bg-zinc-700" />
                <div className="w-3 h-3 rounded-full bg-zinc-700" />
              </div>
              <div className="flex-1 ml-4">
                <div className="bg-zinc-900 rounded-lg px-4 py-1.5 text-xs text-zinc-500 max-w-xs">
                  firmem.com/dashboard
                </div>
              </div>
            </div>
            {/* Screenshot */}
            <Image
              src="/images/dashboard-preview.png"
              alt="Firmem dashboard showing the AI command center for Park Accounting Group with client list, priorities, and AI assistant"
              width={1440}
              height={900}
              className="w-full h-auto"
              priority={false}
            />
          </div>
        </motion.div>

        <div className="flex items-center justify-center gap-3 mt-6">
          <button onClick={onTourDemo} className="btn-outline py-3 px-8 text-sm flex items-center gap-2">
            Try the live demo <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
}

/* ── FAQ (AEO) ── */
const FAQ_ITEMS = [
  {
    q: "What is Firmem?",
    a: "Firmem is an AI workspace designed for boutique professional services firms — accounting, law, HR, marketing, and consulting — that manage 50 to 200 client relationships. It provides shared team memory, instant context switching, and AI-generated deliverables so your firm can handle more clients without growing the team.",
  },
  {
    q: "Who is Firmem built for?",
    a: "Small professional services firms with 2 to 20 team members. If your team juggles dozens of client relationships across tools like QuickBooks, Clio, HubSpot, or BambooHR, Firmem consolidates every client's history, financials, and preferences into one searchable workspace.",
  },
  {
    q: "How does Firmem reduce context switching?",
    a: "Every client gets a dedicated workspace that stores their complete history — financial data, communication preferences, past deliverables, and team notes. When you switch between clients, the AI instantly loads the full context. What typically takes 15 minutes of file searching becomes a one-click, one-second switch.",
  },
];

function FAQ() {
  return (
    <section id="faq" className="py-14 px-6">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold mb-8 tracking-tight text-zinc-100 text-center">
          Frequently asked questions
        </h2>
        <div className="space-y-4">
          {FAQ_ITEMS.map((item, i) => (
            <details key={i} className="group bento-card">
              <summary className="flex items-center justify-between cursor-pointer p-6 text-zinc-100 font-medium text-base list-none">
                {item.q}
                <span className="text-zinc-500 group-open:rotate-45 transition-transform text-xl ml-4">+</span>
              </summary>
              <div className="px-6 pb-6 pt-0 text-sm text-zinc-300 leading-relaxed">
                {item.a}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* Footer is imported from @/components/landing/footer */

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

  const jsonLdOrg = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Firmem",
    url: "https://firmem.com",
    description: "AI workspace for boutique professional services firms",
  };

  const jsonLdApp = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Firmem",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: "Manage 50-200 client relationships with shared team memory, instant context switching, and ready-to-send deliverables.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD", availability: "https://schema.org/PreOrder" },
  };

  const jsonLdFaq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <div className="min-h-screen relative">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrg) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdApp) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }} />
      <div className="grainy-overlay" />
      <Nav onOpenModal={() => setIsModalOpen(true)} onEnterApp={handleNavEnterApp} />
      <main>
        <Hero
          onOpenModal={() => setIsModalOpen(true)}
          onEnterFirm={handleEnterFirm}
          onTourAllIndustries={handleTourAllIndustries}
        />
        <DashboardPreview onTourDemo={handleTourAllIndustries} />
        <BentoFeatures />
        <Impact />
        <CallToAction onOpenModal={() => setIsModalOpen(true)} />
        <FAQ />
      </main>
      <Footer />
      <EarlyAccessModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <WorkspaceInitOverlay visible={isEntering} />
    </div>
  );
}
