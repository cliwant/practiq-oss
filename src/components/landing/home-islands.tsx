"use client";

/**
 * Client-only islands for the homepage.
 *
 * The homepage (`src/app/page.tsx`) is a Server Component so its
 * static markup (hero copy, sections, CTAs) renders into the initial
 * HTML — visible to curl, Google's SSR fetch, and AI crawlers
 * (GPTBot, PerplexityBot, ClaudeBot). Anything that genuinely needs
 * the browser lives here as a small island:
 *
 *   - <HomeAbExposureBeacon> — fires `/api/ab/expose` on mount with
 *     the visitor's assigned hero_copy / cta_copy variants. Renders
 *     nothing.
 *   - <HomeStartFreeButton> — primary hero CTA that records the
 *     `cta_clicked` A/B conversion event before navigating to
 *     `/signup`. Preserves the existing analytics shape.
 *   - <HomeIndustryCards> — the 5 industry cards in the hero. Each
 *     enters a single-firm dashboard via `router.push` with a
 *     short delay for the WorkspaceInitOverlay animation.
 *   - <HomeWorkspaceInitOverlay> — the loading overlay shown while
 *     the industry-card transition fires.
 *   - <HomeNavWithModal> — the top navigation plus the
 *     EarlyAccessModal. Kept here so the modal-open state lives in
 *     a single Client island that owns both the trigger and the
 *     modal itself.
 *
 * This split (2026-05-13) replaces the old "everything is one big
 * Client Component" homepage that was hitting
 * BAILOUT_TO_CLIENT_SIDE_RENDERING on production prerender — leaving
 * curl with a 24 KB shell instead of the ~70 KB SSR'd body.
 */

import { useState, useEffect, useCallback, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Fingerprint,
  X,
  Calculator,
  Scale,
  TrendingUp,
  Palette,
  Briefcase,
} from "lucide-react";
import { Nav } from "@/components/landing/nav";
import type { CtaVariant } from "@/lib/hero-variants";

/* ── A/B exposure beacon ────────────────────────────────────────── */

interface HomeAbExposureBeaconProps {
  heroVariant: string;
  ctaVariant: string;
}

export function HomeAbExposureBeacon({
  heroVariant,
  ctaVariant,
}: HomeAbExposureBeaconProps) {
  useEffect(() => {
    if (typeof document === "undefined") return;
    const m = document.cookie.match(/practiq_visitor=([^;]+)/);
    const visitorId = m?.[1];
    if (!visitorId) return;
    void fetch("/api/ab/expose", {
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
  }, [heroVariant, ctaVariant]);
  return null;
}

/* ── Primary "Start free" CTA ───────────────────────────────────── */

interface HomeStartFreeButtonProps {
  ctaVariant: string;
  label?: string;
}

export function HomeStartFreeButton({
  ctaVariant,
  label = "Start free",
}: HomeStartFreeButtonProps) {
  const handleClick = useCallback(() => {
    if (typeof document !== "undefined") {
      const m = document.cookie.match(/practiq_visitor=([^;]+)/);
      const visitorId = m?.[1];
      if (visitorId) {
        void fetch("/api/ab/convert", {
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
    }
    window.location.href = "/signup";
  }, [ctaVariant]);

  return (
    <button
      onClick={handleClick}
      className="btn-premium flex items-center justify-center gap-3 text-sm py-4 px-10"
    >
      {label} <ArrowRight className="w-4 h-4" />
    </button>
  );
}

/* ── Industry cards + workspace init overlay ────────────────────── */

interface IndustryCard {
  id: string;
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}

const INDUSTRY_CARDS: IndustryCard[] = [
  {
    id: "meridian-accounting",
    label: "Accounting",
    sublabel: "Meridian Accounting Group",
    icon: Calculator,
    accent: "text-indigo-400",
  },
  {
    id: "chen-morgan",
    label: "Law",
    sublabel: "Chen Morgan LLP",
    icon: Scale,
    accent: "text-teal-400",
  },
  {
    id: "north-arc",
    label: "Consulting",
    sublabel: "North Arc Advisors",
    icon: TrendingUp,
    accent: "text-violet-400",
  },
  {
    id: "wildcard-studio",
    label: "Agency",
    sublabel: "Wildcard Studio",
    icon: Palette,
    accent: "text-rose-400",
  },
  {
    id: "lattice-partners",
    label: "HR Advisory",
    sublabel: "Lattice Partners HR",
    icon: Briefcase,
    accent: "text-purple-400",
  },
];

function WorkspaceInitOverlay({ visible }: { visible: boolean }) {
  const [step, setStep] = useState(0);
  const steps = [
    "Loading your firm context...",
    "Rehydrating 50 client workspaces...",
    "Reviewing 47 client updates from the last 8 hours...",
    "Drafting morning briefing...",
  ];
  useEffect(() => {
    if (!visible) {
      setStep(0);
      return;
    }
    const timers = steps.map((_, i) =>
      setTimeout(() => setStep(i + 1), 350 * (i + 1)),
    );
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
                <span className="text-2xl font-black text-zinc-950 tracking-tight">
                  P
                </span>
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

export function HomeIndustryCards() {
  const router = useRouter();
  const [isEntering, setIsEntering] = useState(false);

  const enterFirm = useCallback(
    (firmId: string) => {
      setIsEntering(true);
      setTimeout(() => {
        router.push(`/build-dashboard?firm=${firmId}&view=home`);
      }, 1800);
    },
    [router],
  );

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 max-w-4xl mx-auto mb-8">
        {INDUSTRY_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.id}
              onClick={() => enterFirm(card.id)}
              className="group relative bento-card p-5 md:p-6 flex flex-col items-start text-left border-zinc-800/60 hover:border-zinc-600 transition-all"
            >
              <Icon className={`w-6 h-6 mb-4 ${card.accent}`} />
              <div className="text-base md:text-lg font-bold text-zinc-100 mb-1">
                {card.label}
              </div>
              <div className="text-[11px] text-zinc-400 leading-tight">
                {card.sublabel}
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-300 absolute top-5 right-5 transition-colors" />
            </button>
          );
        })}
      </div>
      <WorkspaceInitOverlay visible={isEntering} />
    </>
  );
}

/* ── Secondary "tour all industries" CTA ────────────────────────── */

interface HomeTourAllButtonProps {
  label: string;
}

export function HomeTourAllButton({ label }: HomeTourAllButtonProps) {
  const router = useRouter();
  const [isEntering, setIsEntering] = useState(false);

  const handleClick = useCallback(() => {
    setIsEntering(true);
    setTimeout(() => {
      router.push("/build-dashboard?firm=meridian-accounting&view=home&tour=1");
    }, 1800);
  }, [router]);

  return (
    <>
      <button
        onClick={handleClick}
        className="btn-outline flex items-center justify-center gap-3 text-sm"
      >
        {label} <ArrowRight className="w-4 h-4" />
      </button>
      <WorkspaceInitOverlay visible={isEntering} />
    </>
  );
}

/* ── Nav with EarlyAccessModal (legacy waitlist trigger) ──────── */

const VERTICALS = [
  { value: "accounting", label: "Accounting / Tax" },
  { value: "law", label: "Law" },
  { value: "hr", label: "HR Advisory" },
  { value: "marketing", label: "Marketing / Agency" },
  { value: "consulting", label: "Consulting" },
  { value: "other", label: "Other" },
];

const WAITLIST_API = "/api/early-access";

function EarlyAccessModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [vertical, setVertical] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !vertical || !consent) return;

    setStatus("submitting");
    setErrorMsg("");

    try {
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-zinc-950/80 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md glass-panel p-10 bg-bg-surface border-zinc-800 shadow-2xl"
          >
            <button
              onClick={handleClose}
              className="absolute top-6 right-6 text-zinc-500 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
            {status !== "success" ? (
              <>
                <div className="w-16 h-16 bg-zinc-100 rounded-2xl flex items-center justify-center mb-8">
                  <Fingerprint className="w-8 h-8 text-zinc-950" />
                </div>
                <h2 className="text-3xl font-extrabold mb-4 text-zinc-100">
                  Get early access
                </h2>
                <p className="text-zinc-300 mb-8 leading-relaxed">
                  Join boutique firms shaping what Practiq becomes.
                  <br />
                  Tell us about yours.
                </p>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <input
                    type="email"
                    data-ph-no-capture
                    required
                    placeholder="name@firm.com"
                    className="input-premium"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <select
                    required
                    value={vertical}
                    onChange={(e) => setVertical(e.target.value)}
                    className="input-premium w-full appearance-none"
                    style={{ color: vertical ? undefined : "#71717a" }}
                  >
                    <option value="" disabled>
                      Your industry
                    </option>
                    {VERTICALS.map((v) => (
                      <option key={v.value} value={v.value}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      required
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-emerald-500/20"
                    />
                    <span className="text-xs text-zinc-400 leading-relaxed group-hover:text-zinc-300 transition-colors">
                      I agree to receive product updates via email. You can
                      unsubscribe at any time. We never share your information
                      with third parties.
                    </span>
                  </label>
                  <button
                    type="submit"
                    disabled={status === "submitting" || !consent}
                    className="btn-premium w-full disabled:opacity-50"
                  >
                    {status === "submitting"
                      ? "Requesting..."
                      : "Request Invitation"}
                  </button>
                  {status === "error" && (
                    <p className="text-red-400 text-xs text-center">
                      {errorMsg}
                    </p>
                  )}
                </form>
                <p className="mt-6 text-center text-xs text-zinc-500">
                  We respond within 48 hours. No credit card, no commitment.
                </p>
              </>
            ) : (
              <div className="text-center py-10">
                <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                </div>
                <h2 className="text-3xl font-extrabold mb-4 text-zinc-100">
                  You&apos;re in!
                </h2>
                <p className="text-zinc-300 leading-relaxed">
                  We&apos;ll reach out within 48 hours to learn about your firm
                  and how Practiq can help.
                </p>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function HomeNavWithModal() {
  // Nav has its own internal state. The legacy waitlist modal is
  // unused by the new "Start free → /signup" nav path but kept
  // mountable here in case a future surface re-introduces it.
  const [isModalOpen, setIsModalOpen] = useState(false);
  return (
    <>
      <Nav onOpenModal={() => setIsModalOpen(true)} />
      <EarlyAccessModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}

/* Type-only re-export so the server page can stay typed without
   importing client modules. */
export type { CtaVariant };
