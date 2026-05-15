"use client";

import { useState, FormEvent, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
// useRouter import deliberately removed in Stage 1 of the per-client
// pricing rewrite (2026-05-14). Stripe checkout is disabled pending
// Stage 3 backend reconfiguration, so we no longer redirect to /signup
// on 401. Reintroduce when checkout returns.
import { trackEvent } from "@/lib/analytics/posthog-client";

type Props = {
  tierId: string;
  tierName: string;
  highlight: boolean;
  label: string;
  /**
   * @deprecated Per-seat plan key. Stage 1 of the per-client pricing
   *   rewrite (2026-05-14) disabled Stripe checkout pending Stage 3
   *   backend reconfiguration, so this prop is currently ignored — the
   *   CTA always opens the access-request modal. Kept on the type to
   *   keep callers compiling until Stage 3 swaps the type for the new
   *   PricingTier["key"] shape.
   */
  planKey?: "solo" | "practice" | "firm";
  /**
   * If true, the access-request modal is themed for the founding-member
   * flow ($10/client lock-in) and the lead capture event records the
   * founding intent for prioritised 1:1 onboarding.
   */
  founding?: boolean;
};

// Read practiq_visitor cookie (set by middleware on first visit)
function getVisitorId(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|; )practiq_visitor=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export function PricingClient({
  tierId,
  tierName,
  highlight,
  label,
  // planKey is intentionally not destructured here. Stripe checkout is
  // disabled pending Stage 3 backend rewrite per the per-client pricing
  // model decision 2026-05-14. The legacy per-seat plan keys (solo/
  // practice/firm) no longer map to anything real. Keep the prop on the
  // type signature for backwards compatibility with the page-side caller,
  // but ignore the value until Stage 3 swaps in the new tier schema.
  founding,
}: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [firmVertical, setFirmVertical] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stripe Checkout abandon detection. The /api/stripe/checkout route
  // sets `cancel_url: ${origin}/pricing?checkout=canceled`, so a user
  // who clicks "back" on the hosted Stripe page lands here with that
  // query param. We fire `stripe_checkout_abandoned` once per landing
  // (sessionStorage guards against re-fire across the 3 PricingClient
  // instances on /pricing — one per tier card — and across remounts).
  // Closes the funnel measurement loop:
  //   checkout_initiated → (checkout_completed | stripe_checkout_abandoned).
  useEffect(() => {
    if (typeof window === "undefined") return;
    // Read query params from window.location instead of useSearchParams()
    // — pulling in the next/navigation hook would de-opt /pricing from
    // the `revalidate = 300` static render path (it forces the route
    // into dynamic rendering on every request). The cancel landing is
    // a client-side concern only; window.location is sufficient.
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") !== "canceled") return;
    const stripeSessionId = params.get("session_id"); // may be null
    const fireKey = `practiq:abandon-fired:${stripeSessionId ?? "no-session"}`;
    try {
      if (sessionStorage.getItem(fireKey)) return;
      sessionStorage.setItem(fireKey, "1");
    } catch {
      // sessionStorage unavailable (private mode quota etc.) — fall
      // through and fire anyway. A duplicate event is better than a
      // missed funnel signal.
    }
    trackEvent("stripe_checkout_abandoned", {
      stripeSessionId,
    });
  }, []);

  /**
   * CTA click — Stage 1 of the per-client pricing rewrite (2026-05-14):
   * Stripe checkout is disabled pending Stage 3 backend reconfiguration.
   * Every CTA opens the access-request modal so we still capture leads
   * (and prioritise founding-member intents) while products + prices are
   * recreated in Stripe under the new $15/client model.
   *
   * router import + the /api/stripe/checkout fetch path are retained
   * commented-out below in this file's history so Stage 3 can lift the
   * pattern back without re-deriving it.
   */
  const handleClick = async () => {
    // Fire intent event first (captures even if user bails)
    const visitorId = getVisitorId();
    if (visitorId) {
      fetch("/api/ab/expose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitorId,
          exposures: [{ testId: "pricing_tier_clicked", variant: tierId }],
        }),
      }).catch(() => {});
    }

    // PostHog conversion event — top of funnel for the per-client model.
    // `planKey` is null until Stage 3 reintroduces real Stripe plans;
    // tierId now carries "founding" | "standard" instead.
    trackEvent("pricing_cta_clicked", {
      tier: tierId,
      tierName,
      planKey: null,
      founding: founding === true,
    });
    // Treat the pricing CTA click as a form_submitted event so the
    // funnel SQL that joins form_field_focused → form_submitted can
    // surface drop-off on the pricing surface too. field_name carries
    // the tier name (the "field" the user picked).
    trackEvent("form_submitted", {
      form_id: "pricing-access-request",
      field_name: tierId,
    });

    // Always open the access-request modal during Stage 1. Stripe
    // checkout returns when Stage 3 ships.
    setOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/early-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          firm_vertical: firmVertical || "other",
          utm_source: "pricing",
          utm_medium: "cta",
          // Tag founding intent into utm_campaign so the founding-member
          // 1:1 onboarding queue can filter leads without parsing tier.
          // Stage 1 of the per-client pricing rewrite (2026-05-14).
          utm_campaign: founding ? "founding_request" : `access_${tierId}`,
          landing_variant: `pricing_${tierId}`,
          page_url:
            typeof window !== "undefined" ? window.location.href : null,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Failed to save. Please try again.");
      }

      const visitorId = getVisitorId();
      if (visitorId) {
        await fetch("/api/ab/convert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            visitorId,
            testId: "pricing_tier_clicked",
            variant: tierId,
            eventName: "pricing_waitlist_signup",
            metadata: { tier: tierId, firm_vertical: firmVertical || null },
          }),
        }).catch(() => {});
      }

      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={`w-full rounded-xl px-6 py-3 text-sm font-semibold transition-all disabled:opacity-60 ${
          highlight
            ? "bg-emerald-500 text-emerald-950 hover:bg-emerald-400 active:scale-[0.98]"
            : "border border-zinc-700 bg-transparent text-zinc-100 hover:border-zinc-500 hover:bg-zinc-900 active:scale-[0.98]"
        }`}
      >
        {loading ? "Loading…" : label}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            onClick={() => {
              if (!loading) setOpen(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-md rounded-2xl border border-zinc-800 bg-[#0a0a0a] p-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {done ? (
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20">
                    <span className="text-2xl text-emerald-400">✓</span>
                  </div>
                  <h3 className="mb-2 text-xl font-bold text-zinc-100">
                    {founding ? "Founding spot reserved." : "You're on the list."}
                  </h3>
                  <p className="mb-6 text-sm text-zinc-400">
                    {founding
                      ? "We'll email you within 1 business day to onboard you 1:1 and lock in your $10/client/month rate for life."
                      : `We'll email you when your ${tierName} access opens.`}
                  </p>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="text-sm text-zinc-500 underline hover:text-zinc-300"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <>
                  <h3 className="mb-1 text-xl font-bold text-zinc-100">
                    {founding
                      ? "Request founding member access"
                      : `${tierName} — request access`}
                  </h3>
                  <p className="mb-6 text-sm text-zinc-500">
                    {founding
                      ? "Limited to the first 50 firms. $10/client/month locked for life. We onboard founding members 1:1 via email — no payment now."
                      : "Stripe checkout is opening soon. Drop your email and we'll invite you when self-serve onboarding goes live."}
                  </p>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label
                        htmlFor="email"
                        className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500"
                      >
                        Work email
                      </label>
                      <input
                        id="email"
                        type="email" data-ph-no-capture
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@firm.com"
                        className="w-full rounded-lg border border-zinc-800 bg-black px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="firm_vertical"
                        className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500"
                      >
                        What type of firm?{" "}
                        <span className="text-zinc-600">(optional)</span>
                      </label>
                      <select
                        id="firm_vertical"
                        value={firmVertical}
                        onChange={(e) => setFirmVertical(e.target.value)}
                        className="w-full rounded-lg border border-zinc-800 bg-black px-4 py-3 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none"
                      >
                        <option value="">Select vertical</option>
                        <option value="accounting">
                          Accounting / tax / bookkeeping
                        </option>
                        <option value="law">Law firm</option>
                        <option value="hr">HR advisory</option>
                        <option value="consulting">Consulting</option>
                        <option value="marketing">Agency / marketing</option>
                        <option value="other">
                          Other professional services
                        </option>
                      </select>
                    </div>

                    {error && (
                      <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                        {error}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={loading || !email}
                      className="w-full rounded-lg bg-zinc-100 px-6 py-3 text-sm font-semibold text-zinc-950 transition-all hover:bg-white active:scale-[0.98] disabled:opacity-50"
                    >
                      {loading ? "Securing your spot…" : label}
                    </button>

                    <p className="text-center text-[11px] leading-relaxed text-zinc-600">
                      No credit card. No auto-charge. Cancel any time before
                      you even start.
                    </p>
                  </form>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
