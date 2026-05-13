"use client";

import { signIn } from "next-auth/react";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { trackClient } from "@/lib/analytics/track-client";
import { useFormTracking } from "@/lib/analytics/form-tracking";
import { Loader2, Eye, EyeOff } from "lucide-react";

/**
 * /signup — create-account page.
 *
 * Same dark design as /login. Includes a vertical dropdown (Accounting,
 * Law, Consulting, HR Advisory, Agency, Other) that seeds the new
 * user's preferences so onboarding defaults to their firm's world.
 */

const VERTICALS = [
  { value: "accounting", label: "Accounting / Tax / Bookkeeping" },
  { value: "law", label: "Law" },
  { value: "consulting", label: "Consulting" },
  { value: "hr", label: "HR Advisory" },
  { value: "agency", label: "Marketing / Creative Agency" },
  { value: "advisory", label: "Financial Advisory" },
  { value: "other", label: "Other professional services" },
];

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupInner />
    </Suspense>
  );
}

function SignupInner() {
  const router = useRouter();
  const params = useSearchParams();
  // `?plan=founding_member` (or `?plan=practice&founding=1`) is the
  // deep-link signup flow from cold email / /founding-member CTA /
  // anywhere we want to take the visitor straight from "give us your
  // email" to "you're a Practice Founding Member ($49/mo locked in)"
  // with one fewer click than the standard /pricing → signup → /pricing
  // → checkout dance. After successful account creation we auto-POST to
  // /api/stripe/checkout with { plan: "practice", founding: true } and
  // hard-redirect to the returned Stripe Checkout URL. On 503 (Stripe
  // misconfigured in this env) we fall back to the waitlist capture —
  // the user already gave us name + email + vertical so we have what
  // we need to follow up manually.
  const planParam = (params.get("plan") || "").toLowerCase();
  const foundingParam = params.get("founding");
  const isFoundingFlow =
    planParam === "founding_member" ||
    (planParam === "practice" && foundingParam === "1");
  const next = params.get("next") || (isFoundingFlow ? "/welcome" : "/app");
  const inviteToken = params.get("invite");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [vertical, setVertical] = useState("");
  const [verticalError, setVerticalError] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const formRef = useFormTracking("signup");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setVerticalError("");

    // Pre-flight: surface a visible inline error on the vertical select
    // before we even try the network. The select carries `required` for
    // a11y semantics, but the native browser tooltip ("Please select an
    // item in the list.") is invisible on our dark theme and easy to
    // miss (dogfood report 2026-05-13 P0-4 — operator's script and a
    // live cold prospect both got stuck here with no inline feedback).
    if (!vertical) {
      setVerticalError("Pick the vertical that best matches your firm so we can tailor onboarding.");
      trackClient({
        type: "signup_blocked",
        properties: { reason: "vertical_required", status: 0 },
      });
      // Focus the field so keyboard + screen-reader users land on it.
      document.getElementById("signup-vertical")?.focus();
      return;
    }

    setLoading(true);
    trackClient({ type: "signup_form_submitted", properties: { vertical } });

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          firmVertical: vertical,
          inviteToken,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // Only fire signup_blocked for true blocking errors (validation,
        // rate-limit, beta gate, server error). The duplicate-email path
        // now returns 200 with a magic-link flow, so this branch never
        // runs for that path — closes the user-enumeration leak.
        trackClient({
          type: "signup_blocked",
          properties: {
            reason: (data as { error?: string }).error ?? "unknown",
            status: res.status,
          },
        });
        setError(data.error || `Signup failed (${res.status})`);
        setLoading(false);
        return;
      }

      // Successful response. Two shapes possible:
      //   201 { user, invite }       — brand-new signup, auto sign in
      //   200 { message, flow }      — existing-account magic-link flow
      // We can't distinguish at the network layer (by design — this is
      // the user-enumeration defense). Branch on the payload only.
      const data = (await res.json().catch(() => ({}))) as {
        user?: unknown;
        flow?: string;
        message?: string;
      };
      if (data.flow === "magic_link") {
        setInfo(
          data.message ||
            "Check your inbox to continue. Didn't get the email? Try again or use Sign in.",
        );
        setLoading(false);
        return;
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        setError("Account created — please sign in to continue.");
        setLoading(false);
        router.push("/login");
        return;
      }

      // Founding-member auto-checkout. The session cookie is fresh from
      // signIn(), so the very next request includes auth. We POST to
      // /api/stripe/checkout with { plan: "practice", founding: true }
      // and hard-redirect to the returned Stripe Checkout URL — saving
      // the visitor a second "click pricing → checkout" step. The
      // checkout route preserves all founding-slot atomic-claim
      // semantics (FoundingClaim ledger + cron reconciliation), so
      // abandoned sessions auto-release without leaking cohort seats.
      if (isFoundingFlow) {
        trackClient({
          type: "founding_signup_completed",
          properties: { vertical },
        });
        try {
          const checkoutRes = await fetch("/api/stripe/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ plan: "practice", founding: true }),
          });
          if (checkoutRes.status === 503) {
            // Stripe not configured in this env — surface waitlist-style
            // success message so the lead isn't lost. The vertical is
            // already attached to the User row (firmVertical) from
            // /api/auth/signup, so growth has the segmentation field.
            setInfo(
              "You're in. Billing isn't live yet in this environment — we'll email you the founding-member checkout link as soon as it opens.",
            );
            setLoading(false);
            return;
          }
          if (!checkoutRes.ok) {
            const body = (await checkoutRes
              .json()
              .catch(() => ({}))) as { error?: string };
            setError(
              body.error ||
                `Couldn't start checkout (${checkoutRes.status}). Your account is created — try /pricing to continue.`,
            );
            setLoading(false);
            // Even though checkout failed, the account exists. Land them
            // on /welcome so they at least see "subscription pending"
            // and have the support contact info.
            router.push("/welcome");
            return;
          }
          const { url } = (await checkoutRes.json()) as { url?: string };
          if (!url) {
            setError(
              "Stripe didn't return a checkout URL. Please try /pricing.",
            );
            setLoading(false);
            router.push("/welcome");
            return;
          }
          // Hard redirect to the Stripe-hosted checkout page. Stripe's
          // success_url lands on /welcome?session_id=cs_*.
          window.location.href = url;
          return;
        } catch {
          setError(
            "Network error reaching checkout. Your account is created — try /pricing to continue.",
          );
          setLoading(false);
          router.push("/welcome");
          return;
        }
      }

      setLoading(false);
      router.push(next);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main
      id="main"
      className="flex min-h-screen items-center justify-center bg-[#050505] px-6 py-12"
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm"
      >
        <Link
          href="/"
          className="mb-10 flex items-center justify-center gap-2.5 text-zinc-400 transition-colors hover:text-zinc-200"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-950">
            <span className="text-base font-black tracking-tight">P</span>
          </div>
          <span className="text-[15px] font-bold tracking-tight text-zinc-200">
            Pract<span className="text-zinc-400">iq</span>
          </span>
        </Link>

        <div
          className={`rounded-2xl border bg-[#0a0a0a] p-8 shadow-2xl shadow-black/40 ${
            isFoundingFlow ? "border-emerald-500/30" : "border-zinc-900"
          }`}
        >
          {isFoundingFlow && (
            <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-4 text-center">
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">
                Founding Member · 50% off for life
              </p>
              {/* "on the Practice tier" not "on Practice" — the tier is
                  named Practice (see PLANS.practice in src/lib/stripe/plans.ts)
                  but a cold prospect reads "$49/mo on Practice" as a typo
                  of the product name Practiq. Explicit "tier" wording
                  removes the typo-look. Dogfood report 2026-05-13. */}
              <p className="text-[13.5px] font-semibold text-zinc-100">
                <span className="text-zinc-400 line-through">$149/mo</span>
                <span className="mx-1.5 text-zinc-400" aria-hidden="true">→</span>
                $49/mo on the Practice tier
              </p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-zinc-400">
                One of the first 50 firms. You go straight to Stripe checkout
                after this — locked in for life.
              </p>
            </div>
          )}
          <div className="mb-7 text-center">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
              Built for boutique professional services firms (2–20 person, 50–200 clients)
            </p>
            <h1 className="text-[22px] font-extrabold tracking-tight text-zinc-100">
              {isFoundingFlow
                ? "Claim your founding-member seat"
                : "Start your firm's workspace"}
            </h1>
            <p className="mt-2 text-[13px] text-zinc-400">
              {isFoundingFlow
                ? "Create the account, then we'll send you to Stripe to lock in $49/mo for life."
                : "Every client gets a workspace. The agent primes itself with their context."}
            </p>
          </div>

          <OAuthButtons callbackUrl={next} />

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-zinc-900" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              or
            </span>
            <div className="h-px flex-1 bg-zinc-900" />
          </div>

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-3.5">
            {error && (
              <div
                role="alert"
                aria-live="assertive"
                className="rounded-lg border border-red-950 bg-red-500/10 px-3 py-2 text-[12.5px] text-red-300"
              >
                {error}
              </div>
            )}
            {info && (
              <div
                role="status"
                aria-live="polite"
                className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2.5 text-[12.5px] text-zinc-200"
              >
                <p className="font-semibold">{info}</p>
                <p className="mt-1 text-zinc-400">
                  Didn&apos;t get the email?{" "}
                  <Link
                    href="/login"
                    className="text-zinc-200 underline decoration-zinc-700 underline-offset-4 hover:decoration-zinc-400"
                  >
                    Sign in
                  </Link>{" "}
                  or try again.
                </p>
              </div>
            )}
            <div>
              <label
                htmlFor="signup-name"
                className="mb-1.5 block text-[11.5px] font-semibold text-zinc-400"
              >
                Full name
              </label>
              <input
                id="signup-name"
                name="name"
                data-field-name="name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="block w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-[13.5px] text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700/40"
                placeholder="Jennifer Park"
              />
            </div>
            <div>
              <label
                htmlFor="signup-email"
                className="mb-1.5 block text-[11.5px] font-semibold text-zinc-400"
              >
                Work email
              </label>
              <input
                id="signup-email"
                name="email"
                data-field-name="email"
                type="email" data-ph-no-capture
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-[13.5px] text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700/40"
                placeholder="you@firm.com"
              />
            </div>
            <div>
              <label
                htmlFor="signup-vertical"
                className="mb-1.5 block text-[11.5px] font-semibold text-zinc-400"
              >
                Your firm&apos;s vertical
                <span className="ml-1 text-red-400" aria-hidden="true">*</span>
                <span className="sr-only"> (required)</span>
              </label>
              <select
                id="signup-vertical"
                name="firmVertical"
                data-field-name="firmVertical"
                required
                aria-required="true"
                aria-invalid={verticalError ? "true" : undefined}
                aria-describedby={verticalError ? "signup-vertical-error" : undefined}
                value={vertical}
                onChange={(e) => {
                  setVertical(e.target.value);
                  if (verticalError) setVerticalError("");
                }}
                className={`block w-full appearance-none rounded-xl border bg-zinc-950 px-3.5 py-2.5 text-[13.5px] text-zinc-100 focus:outline-none focus:ring-1 ${
                  verticalError
                    ? "border-red-500/60 focus:border-red-500/80 focus:ring-red-700/40"
                    : "border-zinc-800 focus:border-zinc-600 focus:ring-zinc-700/40"
                }`}
                style={{ color: vertical ? undefined : "#a1a1aa" }}
              >
                <option value="" disabled>
                  Pick one
                </option>
                {VERTICALS.map((v) => (
                  <option key={v.value} value={v.value}>
                    {v.label}
                  </option>
                ))}
              </select>
              {verticalError && (
                <p
                  id="signup-vertical-error"
                  role="alert"
                  className="mt-1.5 text-[11.5px] font-medium text-red-400"
                >
                  {verticalError}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="signup-password"
                className="mb-1.5 block text-[11.5px] font-semibold text-zinc-400"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="signup-password"
                  name="password"
                  data-field-name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  className="block w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 pr-10 text-[13.5px] text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700/40"
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-zinc-200"
                >
                  {showPassword ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-100 py-2.5 text-[13.5px] font-semibold text-zinc-950 shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_8px_32px_-8px_rgba(255,255,255,0.2)] transition-all hover:shadow-[0_0_0_1px_rgba(255,255,255,0.15),0_12px_40px_-8px_rgba(255,255,255,0.3)] active:scale-[0.985] disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isFoundingFlow ? "Setting up checkout…" : "Creating…"}
                </>
              ) : isFoundingFlow ? (
                "Continue to Stripe ($49/mo)"
              ) : (
                "Create account"
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-[12.5px] text-zinc-400">
          Already have an account?{" "}
          <Link
            href={`/login${next !== "/app" ? `?next=${encodeURIComponent(next)}` : ""}`}
            className="text-zinc-200 underline decoration-zinc-700 underline-offset-4 hover:decoration-zinc-400"
          >
            Sign in
          </Link>
        </p>
        <p className="mt-4 text-center text-[11px] text-zinc-400">
          By signing up you agree to our{" "}
          <Link
            href="/terms"
            className="underline decoration-zinc-800 underline-offset-2 hover:text-zinc-400"
          >
            Terms
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            className="underline decoration-zinc-800 underline-offset-2 hover:text-zinc-400"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </motion.div>
    </main>
  );
}
