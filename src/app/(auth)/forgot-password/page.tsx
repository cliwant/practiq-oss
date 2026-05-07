"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Loader2, CheckCircle2 } from "lucide-react";

/**
 * /forgot-password — request a password reset email.
 *
 * Submits to /api/auth/forgot-password which always returns ok (no
 * account enumeration). UI always shows the "check your inbox" state
 * on success regardless of whether the email exists in our DB.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `Request failed (${res.status})`);
        return;
      }
      setDone(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050505] px-6 py-12">
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
            Pract<span className="text-zinc-500">iq</span>
          </span>
        </Link>

        <div className="rounded-2xl border border-zinc-900 bg-[#0a0a0a] p-8 shadow-2xl shadow-black/40">
          {done ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <h1 className="text-[20px] font-extrabold tracking-tight text-zinc-100">
                Check your inbox
              </h1>
              <p className="mt-2 text-[13px] text-zinc-400">
                If an account exists for <span className="text-zinc-200">{email}</span>,
                we just sent a reset link. It expires in 1 hour.
              </p>
              <p className="mt-6 text-[12px] text-zinc-500">
                Didn&apos;t get it?{" "}
                <button
                  type="button"
                  onClick={() => setDone(false)}
                  className="text-zinc-300 underline decoration-zinc-700 hover:decoration-zinc-400"
                >
                  Try again
                </button>
              </p>
            </div>
          ) : (
            <>
              <div className="mb-7 text-center">
                <h1 className="text-[22px] font-extrabold tracking-tight text-zinc-100">
                  Reset your password
                </h1>
                <p className="mt-2 text-[13px] text-zinc-500">
                  Enter your email and we&apos;ll send a reset link.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3.5">
                {error && (
                  <div className="rounded-lg border border-red-950 bg-red-500/10 px-3 py-2 text-[12.5px] text-red-300">
                    {error}
                  </div>
                )}
                <div>
                  <label className="mb-1.5 block text-[11.5px] font-semibold text-zinc-400">
                    Email
                  </label>
                  <input
                    type="email" data-ph-no-capture
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-[13.5px] text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700/40"
                    placeholder="you@firm.com"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !email}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-100 py-2.5 text-[13.5px] font-semibold text-zinc-950 shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_8px_32px_-8px_rgba(255,255,255,0.2)] transition-all hover:shadow-[0_0_0_1px_rgba(255,255,255,0.15),0_12px_40px_-8px_rgba(255,255,255,0.3)] active:scale-[0.985] disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Sending…
                    </>
                  ) : (
                    "Send reset link"
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-[12.5px] text-zinc-500">
          Remembered it?{" "}
          <Link
            href="/login"
            className="text-zinc-200 underline decoration-zinc-700 underline-offset-4 hover:decoration-zinc-400"
          >
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
