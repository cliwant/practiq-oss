"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

type Status = "pending" | "ok" | "already" | "error";

export default function VerifyEmailPage() {
  const params = useParams<{ token: string }>();
  const [status, setStatus] = useState<Status>("pending");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: params.token }),
    })
      .then(async (r) => {
        if (cancelled) return;
        const data = await r.json().catch(() => ({}));
        if (r.ok) {
          setStatus(data.alreadyVerified ? "already" : "ok");
        } else {
          setStatus("error");
          setError(data.error ?? "Something went wrong.");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus("error");
          setError("Network error. Please try again.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [params.token]);

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

        <div className="rounded-2xl border border-zinc-900 bg-[#0a0a0a] p-8 text-center shadow-2xl shadow-black/40">
          {status === "pending" && (
            <>
              <Loader2 className="mx-auto mb-4 h-6 w-6 animate-spin text-zinc-400" />
              <h1 className="text-[20px] font-extrabold tracking-tight text-zinc-100">
                Verifying…
              </h1>
              <p className="mt-2 text-[13px] text-zinc-500">
                One moment — confirming your email address.
              </p>
            </>
          )}

          {status === "ok" && (
            <>
              <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <h1 className="text-[20px] font-extrabold tracking-tight text-zinc-100">
                Email verified
              </h1>
              <p className="mt-2 text-[13px] text-zinc-400">
                Nice. You&apos;re all set.
              </p>
              <Link
                href="/app"
                className="mt-6 inline-block rounded-xl bg-zinc-100 px-5 py-2 text-[13px] font-semibold text-zinc-950 transition-all hover:bg-white active:scale-[0.985]"
              >
                Open workspace
              </Link>
            </>
          )}

          {status === "already" && (
            <>
              <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-zinc-800 text-zinc-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <h1 className="text-[20px] font-extrabold tracking-tight text-zinc-100">
                Already verified
              </h1>
              <p className="mt-2 text-[13px] text-zinc-400">
                Your email is already confirmed on this account.
              </p>
              <Link
                href="/app"
                className="mt-6 inline-block rounded-xl border border-zinc-700 px-5 py-2 text-[13px] font-semibold text-zinc-100 transition-all hover:border-zinc-500 hover:bg-zinc-900"
              >
                Open workspace
              </Link>
            </>
          )}

          {status === "error" && (
            <>
              <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-red-500/10 text-red-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h1 className="text-[20px] font-extrabold tracking-tight text-zinc-100">
                Couldn&apos;t verify
              </h1>
              <p className="mt-2 text-[13px] text-zinc-400">{error}</p>
              <Link
                href="/app/settings"
                className="mt-6 inline-block rounded-xl border border-zinc-700 px-5 py-2 text-[13px] font-semibold text-zinc-100 transition-all hover:border-zinc-500 hover:bg-zinc-900"
              >
                Resend from Settings
              </Link>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
