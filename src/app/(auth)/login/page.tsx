"use client";

import { signIn } from "next-auth/react";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { useFormTracking } from "@/lib/analytics/form-tracking";
import { Loader2, Eye, EyeOff } from "lucide-react";

/**
 * /login — sign-in page for returning operators.
 *
 * Dark Practiq design system. OAuth buttons first (Google, LinkedIn,
 * Microsoft — rendered conditionally via /api/auth/available-providers),
 * then email/password fallback below a divider. `?next=/app/path`
 * query param preserved through sign-in for deep-link bookmarks.
 */
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/app";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const formRef = useFormTracking("login");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (!result) {
      setError("Something went wrong. Please try again.");
      return;
    }
    if (result.error) {
      setError("Invalid email or password.");
      return;
    }
    router.push(next);
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
        {/* Brand header */}
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

        <div className="rounded-2xl border border-zinc-900 bg-[#0a0a0a] p-8 shadow-2xl shadow-black/40">
          <div className="mb-7 text-center">
            <h1 className="text-[22px] font-extrabold tracking-tight text-zinc-100">
              Welcome back
            </h1>
            <p className="mt-2 text-[13px] text-zinc-400">
              Sign in to your client workspace.
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
            <div>
              <label
                htmlFor="login-email"
                className="mb-1.5 block text-[11.5px] font-semibold text-zinc-400"
              >
                Email
              </label>
              <input
                id="login-email"
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
              <div className="mb-1.5 flex items-center justify-between">
                <label
                  htmlFor="login-password"
                  className="text-[11.5px] font-semibold text-zinc-400"
                >
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-[11px] text-zinc-400 underline decoration-zinc-700 underline-offset-2 hover:text-zinc-100 hover:decoration-zinc-500"
                >
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  name="password"
                  data-field-name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 pr-10 text-[13.5px] text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700/40"
                  placeholder="••••••••"
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
                  <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-[12.5px] text-zinc-400">
          New to Practiq?{" "}
          <Link
            href={`/signup${next !== "/app" ? `?next=${encodeURIComponent(next)}` : ""}`}
            className="text-zinc-200 underline decoration-zinc-700 underline-offset-4 hover:decoration-zinc-400"
          >
            Create an account
          </Link>
        </p>
        <p className="mt-4 text-center text-[11px] text-zinc-400">
          By signing in you agree to our{" "}
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
