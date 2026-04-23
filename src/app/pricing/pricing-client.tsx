"use client";

import { useState, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";

type Props = {
  tierId: string;
  tierName: string;
  highlight: boolean;
  label: string;
  /**
   * Practiq plan key. When set and Stripe is configured, the CTA
   * drives a real checkout; otherwise it falls back to the waitlist
   * modal so pre-launch visitors can still express intent.
   */
  planKey?: "starter" | "team" | "pro";
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
  planKey,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [firmVertical, setFirmVertical] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * CTA click: try to launch a Stripe checkout flow. If Stripe isn't
   * configured yet (pre-launch) or the user isn't signed in, fall back
   * gracefully — waitlist modal for 503, login redirect for 401.
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

    if (!planKey) {
      setOpen(true);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey }),
      });

      if (res.status === 401) {
        // Unauthenticated — send them through signup with next=/pricing.
        router.push(`/signup?next=${encodeURIComponent("/pricing")}`);
        return;
      }

      if (res.status === 503) {
        // Stripe not configured in this environment. Fall back to
        // waitlist capture so we still collect the lead.
        setOpen(true);
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || `Checkout failed (${res.status})`);
        setOpen(true);
        return;
      }

      const { url } = (await res.json()) as { url: string };
      window.location.href = url;
    } catch {
      setError("Network error. Please try again.");
      setOpen(true);
    } finally {
      setLoading(false);
    }
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
          utm_campaign: tierId,
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
                    You&apos;re on the list.
                  </h3>
                  <p className="mb-6 text-sm text-zinc-400">
                    We&apos;ll email you when your {tierName} spot opens.
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
                    {tierName} — claim your spot
                  </h3>
                  <p className="mb-6 text-sm text-zinc-500">
                    No payment required now. We&apos;ll invite you off the
                    waitlist when Practiq goes live.
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
                        type="email"
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
