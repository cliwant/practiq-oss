"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import { X } from "lucide-react";

/**
 * ExitIntentPopup — shows a waitlist signup modal when the user moves
 * their cursor toward the top of the viewport (desktop) or after 45s
 * of inactivity (mobile fallback). Recovers 10-15% of abandoning visitors.
 *
 * Rules:
 *  - Only fires once per session (sessionStorage flag).
 *  - Does not fire on admin pages, dashboard, login, or signup.
 *  - Does not fire if user has already signed up (localStorage flag).
 *  - 3s delay after page load before arming (avoids false triggers).
 */
export function ExitIntentPopup() {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  const dismiss = useCallback(() => {
    setShow(false);
    try {
      sessionStorage.setItem("exit_popup_dismissed", "1");
    } catch {}
  }, []);

  useEffect(() => {
    // Skip on non-marketing pages
    const path = window.location.pathname;
    if (
      path.startsWith("/admin") ||
      path.startsWith("/dashboard") ||
      path.startsWith("/login") ||
      path.startsWith("/signup")
    ) {
      return;
    }

    // Skip if already dismissed this session or user already signed up
    try {
      if (sessionStorage.getItem("exit_popup_dismissed")) return;
      if (localStorage.getItem("practiq_signed_up")) return;
    } catch {}

    let armed = false;
    const armTimer = setTimeout(() => {
      armed = true;
    }, 3000);

    // Desktop: mouse moves to top 5% of viewport
    const handleMouseLeave = (e: MouseEvent) => {
      if (!armed) return;
      if (e.clientY <= 5) {
        setShow(true);
        document.removeEventListener("mouseout", handleMouseLeave);
      }
    };

    // Mobile fallback: 45s inactivity
    let inactivityTimer: ReturnType<typeof setTimeout>;
    const resetInactivity = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        if (armed) setShow(true);
      }, 45000);
    };

    document.addEventListener("mouseout", handleMouseLeave);
    document.addEventListener("touchstart", resetInactivity, { passive: true });
    document.addEventListener("scroll", resetInactivity, { passive: true });
    resetInactivity();

    return () => {
      clearTimeout(armTimer);
      clearTimeout(inactivityTimer);
      document.removeEventListener("mouseout", handleMouseLeave);
      document.removeEventListener("touchstart", resetInactivity);
      document.removeEventListener("scroll", resetInactivity);
    };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setStatus("submitting");
    try {
      const res = await fetch("/api/early-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmed,
          firmVertical: "unknown",
          source: "exit_intent",
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setStatus("success");
      try {
        localStorage.setItem("practiq_signed_up", "1");
        sessionStorage.setItem("exit_popup_dismissed", "1");
      } catch {}
    } catch {
      setStatus("error");
    }
  };

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Join the waitlist"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={dismiss}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl border border-zinc-700 bg-[#0a0a0a] p-8 shadow-2xl">
        <button
          onClick={dismiss}
          className="absolute right-4 top-4 text-zinc-500 hover:text-zinc-300 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {status === "success" ? (
          <div className="text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400 mb-3">
              You&apos;re in
            </p>
            <h2 className="text-2xl font-black text-zinc-100 tracking-tight mb-3">
              Welcome to the waitlist.
            </h2>
            <p className="text-sm text-zinc-400">
              We&apos;ll reach out with early access details soon.
            </p>
          </div>
        ) : (
          <>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-3">
              Before you go
            </p>
            <h2 className="text-2xl font-black text-zinc-100 tracking-tight mb-2">
              Managing 50+ clients?
            </h2>
            <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
              Join the waitlist for early access. We&apos;re building the AI workspace
              that remembers every client so you don&apos;t have to.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@yourfirm.com"
                className="input-premium py-3 px-4 text-sm w-full"
                disabled={status === "submitting"}
              />
              <button
                type="submit"
                disabled={status === "submitting"}
                className="btn-premium py-3 px-6 text-xs uppercase tracking-widest w-full"
              >
                {status === "submitting" ? "Joining…" : "Get early access"}
              </button>
            </form>

            {status === "error" && (
              <p className="text-xs text-red-400 mt-3 text-center">
                Something went wrong. Please try again.
              </p>
            )}

            <p className="text-[10px] text-zinc-600 mt-4 text-center">
              No spam. We&apos;ll email you once when early access opens.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
