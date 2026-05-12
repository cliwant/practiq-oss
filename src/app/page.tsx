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
import { HERO_COPY, CTA_COPY, getVariantFromCookie, type HeroVariant, type CtaVariant } from "@/lib/hero-variants";
import { FoundingMemberBadge } from "@/components/landing/founding-member-badge";
import {
  JsonLd,
  organizationJsonLd,
  softwareApplicationJsonLd,
  faqJsonLd,
} from "@/lib/seo/json-ld";

/* ── Workspace Init Overlay ── */
function WorkspaceInitOverlay({ visible }: { visible: boolean }) {
  const [step, setStep] = useState(0);
  const steps = [
    "Loading your firm context...",
    "Rehydrating 50 client workspaces...",
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
                <span className="text-2xl font-black text-zinc-950 tracking-tight">P</span>
              </div>
              <span className="absolute inset-0 rounded-2xl border border-zinc-100 animate-pulse-dot" />
            </div>
            <div className="text-sm text-zinc-300 font-medium mb-2">Practiq</div>
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
                <p className="text-zinc-300 mb-8 leading-relaxed">Join boutique firms shaping what Practiq becomes.<br />Tell us about yours.</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <input type="email" data-ph-no-capture required placeholder="name@firm.com" className="input-premium" value={email} onChange={(e) => setEmail(e.target.value)} />
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
                <p className="text-zinc-300 leading-relaxed">We&apos;ll reach out within 48 hours to learn about your firm and how Practiq can help.</p>
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
  { id: "meridian-accounting", label: "Accounting",  sublabel: "Meridian Accounting Group",   icon: Calculator, accent: "text-indigo-400" },
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
  // Read A/B variants from cookies (assigned by middleware).
  // 2026-04-23: cold-email campaigns paused. Default is now `control` which
  // carries the canonical positioning — client-centric AI for ALL
  // professional services firms, explicit contrast with chat-session AI.
  // Cookie still wins if middleware assigned a variant (A/B can be re-armed
  // without touching this file).
  const [heroVariant, setHeroVariant] = useState<HeroVariant>("control");
  const [ctaVariant, setCtaVariant] = useState<CtaVariant>("control");
  const [visitorId, setVisitorId] = useState<string | null>(null);

  useEffect(() => {
    setHeroVariant(getVariantFromCookie<HeroVariant>("ab_hero_copy_v1", "control"));
    setCtaVariant(getVariantFromCookie<CtaVariant>("ab_cta_copy_v1", "control"));
    // Read visitor id for exposure tracking
    const m = document.cookie.match(/practiq_visitor=([^;]+)/);
    setVisitorId(m?.[1] ?? null);
  }, []);

  // Log exposure events (fire-and-forget)
  useEffect(() => {
    if (!visitorId) return;
    fetch("/api/ab/expose", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId,
        exposures: [
          { testId: "hero_copy_v1", variant: heroVariant },
          { testId: "cta_copy_v1", variant: ctaVariant },
        ],
      }),
    }).catch(() => {});
  }, [visitorId, heroVariant, ctaVariant]);

  const hero = HERO_COPY[heroVariant];
  const cta = CTA_COPY[ctaVariant];

  return (
    <section className="relative min-h-[85vh] flex flex-col items-center justify-center pt-28 pb-10 px-6 overflow-hidden bg-mesh">
      <div className="max-w-5xl mx-auto text-center relative z-10">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
          {/* Founding member badge above headline for urgency + social proof */}
          <div className="flex justify-center mb-5">
            <FoundingMemberBadge />
          </div>

          <div className="text-zinc-400 text-sm mb-6">
            {hero.eyebrow}
          </div>
          <h1 className="text-5xl md:text-[4.5rem] font-black mb-6 leading-[0.95] tracking-[-0.05em] text-zinc-100">
            {hero.headline}
          </h1>
          <p className="text-lg md:text-xl text-zinc-300 mx-auto mb-10 leading-relaxed max-w-3xl">
            {hero.subhead}
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

          {/*
            Hero CTAs — the product is live, so the primary CTA must
            actually start an account. We fix the text to "Start free"
            (overriding A/B variants like "Become a Founding Member"
            that read like a paid waitlist), navigate directly to
            /signup, and keep the existing CTA-variant subtext as a
            promotional line so the founding-member urgency stays.
          */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => {
                // Log conversion event for the A/B test before
                // navigating away — we still want signal on which
                // CTA-variant text/sub-text drove the click.
                if (visitorId) {
                  fetch("/api/ab/convert", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      visitorId,
                      testId: "cta_copy_v1",
                      variant: ctaVariant,
                      eventName: "cta_clicked",
                    }),
                  }).catch(() => {});
                }
                window.location.href = "/signup";
              }}
              className="btn-premium flex items-center justify-center gap-3 text-sm py-4 px-10"
            >
              Start free <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onTourAllIndustries}
              className="btn-outline flex items-center justify-center gap-3 text-sm"
            >
              {hero.secondaryCta} <ArrowRight className="w-4 h-4" />
            </button>
            {/* Tertiary CTA — hands-on sample workspace. Doesn't replace
                the primary "Start free" or the existing secondary CTA;
                gives skeptical visitors a no-signup way to feel the
                product. */}
            <a
              href="/demo/workspace"
              className="text-sm font-medium text-zinc-400 underline decoration-zinc-700 underline-offset-4 transition-colors hover:text-zinc-100 hover:decoration-zinc-400"
            >
              Explore a sample workspace →
            </a>
            {/* Tertiary CTA — qualified lead path. The workflow audit
                is the most consistently-converting top-of-funnel asset
                we have for non-SNS traffic; surfacing it next to the
                sample workspace lets skeptical visitors self-diagnose
                before committing to a signup. */}
            <a
              href="/workflow-audit?landing_slug=homepage&lane=practiq"
              className="text-sm font-medium text-zinc-400 underline decoration-zinc-700 underline-offset-4 transition-colors hover:text-zinc-100 hover:decoration-zinc-400"
            >
              Run a workflow audit →
            </a>
          </div>

          {/* Promotional subtext — shows the founding-member offer
              when the variant carries one. Doesn't replace the CTA. */}
          {cta.sub && (
            <p className="text-xs text-amber-400/80 mt-3 font-medium">
              {cta.sub}
            </p>
          )}

          {/*
            Existing-account + alt-path links right under the CTAs.
            Sign-in here makes the primary "Start free" unambiguous —
            no one who already has an account fumbles for it.
          */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-sm text-zinc-500">
            <a
              href="/login"
              className="hover:text-zinc-200 transition-colors"
            >
              Already have an account? <span className="text-zinc-300 underline decoration-zinc-700 underline-offset-4 hover:decoration-zinc-400">Sign in</span>
            </a>
            <span className="text-zinc-700">·</span>
            <a
              href="/contact?topic=intro-call"
              className="underline underline-offset-4 decoration-zinc-700 hover:text-zinc-200 hover:decoration-zinc-400 transition-colors"
            >
              {hero.bookCallText} →
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ── Why Client-Centric — core architectural differentiation ── */
function WhyClientCentric() {
  const rows = [
    {
      chat: "Memory scoped to a conversation",
      practiq: "Memory scoped to the client",
    },
    {
      chat: "Context vanishes when you close the thread",
      practiq: "Context persists across every session with that client",
    },
    {
      chat: "Files and notes scattered across chats",
      practiq: "All client files, conversations, deliverables in one place",
    },
    {
      chat: "Every new session = re-brief the AI from scratch",
      practiq: "Open a client \u2192 the AI already knows where you left off",
    },
    {
      chat: "Agents forget what other agents did",
      practiq: "Every agent shares the same client-scoped memory",
    },
  ];

  return (
    <section id="why" className="py-16 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-block px-3 py-1 rounded-full border border-zinc-800 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-5">
            The architectural shift
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight text-zinc-100 text-balance">
            Client-first, not chat-first.
          </h2>
          <p className="text-base md:text-lg text-zinc-300 max-w-2xl mx-auto leading-relaxed">
            Every other AI agent organizes itself around conversations. That breaks the moment you manage more than one client. Practiq is built the other way.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-[#0a0a0a] overflow-hidden">
          {/* Header row */}
          <div className="grid grid-cols-1 md:grid-cols-2 border-b border-zinc-800">
            <div className="p-5 md:p-6 border-b md:border-b-0 md:border-r border-zinc-800">
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
                Chat-session AI agents
              </div>
              <div className="text-sm text-zinc-400">
                ChatGPT, Claude.ai, Copilot, most &quot;AI assistants&quot;
              </div>
            </div>
            <div className="p-5 md:p-6 bg-zinc-950/40">
              <div className="text-[10px] font-bold uppercase tracking-widest text-brand-primary mb-2">
                Practiq &mdash; client-centric
              </div>
              <div className="text-sm text-zinc-300">
                Built for firms managing 50&ndash;200 client relationships
              </div>
            </div>
          </div>

          {/* Comparison rows */}
          {rows.map((row, i) => (
            <div
              key={i}
              className="grid grid-cols-1 md:grid-cols-2 border-b border-zinc-800 last:border-b-0"
            >
              <div className="p-5 md:p-6 border-b md:border-b-0 md:border-r border-zinc-800 flex items-start gap-3">
                <X className="w-4 h-4 text-zinc-600 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-zinc-400 leading-relaxed">{row.chat}</span>
              </div>
              <div className="p-5 md:p-6 bg-zinc-950/40 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-brand-accent flex-shrink-0 mt-0.5" />
                <span className="text-sm text-zinc-100 leading-relaxed">{row.practiq}</span>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-zinc-500 mt-6 max-w-xl mx-auto leading-relaxed">
          This isn&apos;t a UI choice &mdash; it&apos;s a different data model. Every conversation, file, agent run, and audit event in Practiq has a client_id. That&apos;s what makes context-switching cost zero.
        </p>
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
            <h3 className="text-2xl md:text-3xl font-bold mb-3 text-zinc-100">One workspace per client — and the AI lives inside it</h3>
            <p className="text-base text-zinc-300 leading-relaxed max-w-lg">
              Every conversation, file, agent action, preference, and past deliverable is scoped to the client. Open a client and the AI is already up to speed — no briefing, no pasted history, no forgotten threads.
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
            Your firm manages 50 clients today. Practiq makes&nbsp;80&nbsp;possible&nbsp;— same&nbsp;team.
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
function CallToAction({ onOpenModal: _onOpenModal }: { onOpenModal: () => void }) {
  // _onOpenModal is the legacy waitlist trigger. The product is live;
  // the bottom-of-page CTA now sends visitors straight to /signup
  // (and offers /login + /demo as alternative paths) so we don't
  // double up on the email-capture waitlist anymore.
  return (
    <section id="cta" className="py-16 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight text-zinc-100">
          Ready to try Practiq?
        </h2>
        <p className="text-base text-zinc-300 mb-8 max-w-lg mx-auto">
          Free to start. Your whole team and every client workspace included
          from day one. No credit card.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href="/signup"
            className="btn-premium py-4 px-12 text-base inline-flex items-center justify-center gap-2"
          >
            Start free <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href="/demo"
            className="btn-outline py-4 px-10 text-base inline-flex items-center justify-center gap-2"
          >
            Live demo <ArrowRight className="w-4 h-4" />
          </a>
        </div>
        <p className="mt-4 text-sm text-zinc-500">
          Already have an account?{" "}
          <a
            href="/login"
            className="text-zinc-300 underline underline-offset-4 decoration-zinc-700 hover:decoration-zinc-400 transition-colors"
          >
            Sign in
          </a>
        </p>
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
                  practiq.dev/app
                </div>
              </div>
            </div>
            {/* Screenshot */}
            <Image
              src="/images/dashboard-preview.png"
              alt="Practiq dashboard showing the AI command center for Meridian Accounting Group with client list, priorities, and AI assistant"
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
    q: "How is Practiq different from ChatGPT, Claude, or Copilot?",
    a: "Those are chat-session AI agents — memory scoped to a conversation. The moment you switch topics, you have to re-paste context or the AI forgets. Practiq is a client-centric AI workspace: every conversation, file, agent action, and preference is tied to a specific client record. Switching clients takes one click and the AI is already loaded with that client's complete history. Same LLMs underneath — fundamentally different architecture around them.",
  },
  {
    q: "What is Practiq?",
    a: "Practiq is an AI workspace for boutique professional services firms — accounting, law, HR, marketing, consulting, advisory — that manage 50 to 200 client relationships. Instead of a general-purpose chat, every client gets their own workspace with shared team memory, autonomous AI agents that run overnight, and ready-to-send deliverables. Your firm can handle more clients without growing the team.",
  },
  {
    q: "Who is Practiq built for?",
    a: "Boutique professional services firms with 2 to 20 team members managing 50 to 200 client relationships. If your team juggles clients across tools like QuickBooks, Clio, HubSpot, BambooHR, or Figma, Practiq consolidates every client's history, files, and preferences into one AI-native workspace — regardless of vertical.",
  },
  {
    q: "How does Practiq reduce context switching to zero?",
    a: "Because memory is scoped to the client, not the chat. Each client has a persistent workspace with their financial data, communication preferences, past deliverables, team notes, and every agent run ever executed on their behalf. When you open a client, the AI is already briefed. What typically takes 10–15 minutes of file searching and re-pasting becomes a one-click, one-second switch.",
  },
  {
    q: "Which firm verticals does Practiq work for?",
    a: "Any boutique professional services firm whose work is organized around client relationships. We've designed for accounting/tax/bookkeeping, law, HR advisory, marketing/creative agencies, and consulting — and we onboard firms in other verticals (financial advisory, executive coaching, real estate, architecture) on request. If your team thinks in terms of 'my clients,' Practiq fits.",
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
  //
  // NOTE: routes to `/build-dashboard` (the canonical demo dashboard route).
  // The previous `/dashboard` URL did not exist and produced a 404 the
  // moment a visitor clicked an industry card from the homepage.
  const handleEnterFirm = (firmId: string) => {
    setIsEntering(true);
    setTimeout(() => {
      router.push(`/build-dashboard?firm=${firmId}&view=home`);
    }, 1800);
  };

  // Enter demo tour — firm switcher visible, Meridian Accounting Home as start
  const handleTourAllIndustries = () => {
    setIsEntering(true);
    setTimeout(() => {
      router.push("/build-dashboard?firm=meridian-accounting&view=home&tour=1");
    }, 1800);
  };

  // Legacy nav "Sign in" button — defaults to Meridian Accounting single-firm
  const handleNavEnterApp = () => handleEnterFirm("meridian-accounting");

  // Canonical Organization, SoftwareApplication, and FAQPage schemas live
  // here on the homepage — they're the entry-point entities every other
  // page references via @id. Helpers are shared across routes so the
  // entity graph stays consistent.
  const jsonLdOrg = organizationJsonLd();
  const jsonLdApp = softwareApplicationJsonLd({ tier: "founding" });
  const jsonLdFaq = faqJsonLd(FAQ_ITEMS);

  return (
    <div className="min-h-screen relative">
      <JsonLd data={jsonLdOrg} />
      <JsonLd data={jsonLdApp} />
      <JsonLd data={jsonLdFaq} />
      <div className="grainy-overlay" />
      <Nav onOpenModal={() => setIsModalOpen(true)} onEnterApp={handleNavEnterApp} />
      <main>
        <Hero
          onOpenModal={() => setIsModalOpen(true)}
          onEnterFirm={handleEnterFirm}
          onTourAllIndustries={handleTourAllIndustries}
        />
        <DashboardPreview onTourDemo={handleTourAllIndustries} />
        <WhyClientCentric />
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
