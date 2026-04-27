"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";

interface NavProps {
  /**
   * Optional waitlist-modal handler kept for legacy pre-launch pages.
   * The primary "Start free" CTA in this nav ALWAYS routes to /signup
   * regardless — the product is live and real signup is the right
   * destination. `onOpenModal` is unused by this component now.
   */
  onOpenModal?: () => void;
  onEnterApp?: () => void;
}

/**
 * Landing-page top nav.
 *
 * Two design constraints fixing earlier conversion problems:
 *
 *  1. **Trim the link list.** Previously had 9 marketing links plus 3
 *     CTAs in one horizontal row, which overflowed even on 1024-wide
 *     viewports — the "Sign in" and "Start free" buttons (the only ones
 *     a converting visitor cares about) were getting cut off the right
 *     edge. We now keep 4 marketing links (Pricing, Use cases, Blog,
 *     FAQ) and move the rest to the footer / hamburger menu.
 *
 *  2. **Primary CTA always goes to /signup.** The product is live;
 *     "Start free" must mean what it says, not open a waitlist modal.
 */
export function Nav({ onEnterApp }: NavProps) {
  const [open, setOpen] = useState(false);

  // Close mobile menu on Escape so users can't get stuck inside.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const goSignup = () => {
    window.location.href = "/signup";
  };
  const goLogin = () => {
    window.location.href = "/login";
  };
  const goDemo = () => {
    // Canonical demo entry point — /demo redirects to the cycle-0
    // showcase dashboard. URL stays stable for marketing & SEO even
    // when the underlying surface swaps.
    window.location.href = "/demo";
  };
  const handleEnterApp =
    onEnterApp ??
    (() => {
      window.location.href = "/app";
    });

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-4 py-6 pointer-events-none">
      <div className="max-w-7xl mx-auto flex items-center justify-between glass-panel px-5 md:px-7 py-3.5 pointer-events-auto shadow-2xl shadow-black/20">
        {/* ── Logo ─────────────────────────────────────────────── */}
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 bg-zinc-100 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-base font-black text-zinc-950 tracking-tight">
              P
            </span>
          </div>
          <span className="font-bold text-[17px] tracking-tighter text-zinc-100 hidden sm:inline">
            Pract<span className="text-zinc-500">iq</span>
          </span>
        </Link>

        {/* ── Desktop links (lg+ only — keeps the nav uncluttered
              on the medium-desktop range that was overflowing). ── */}
        <div className="hidden lg:flex items-center gap-7 text-[11.5px] font-bold uppercase tracking-[0.18em] text-zinc-400">
          <Link
            href="/pricing"
            className="hover:text-zinc-100 transition-colors"
          >
            Pricing
          </Link>
          <Link
            href="/use-cases"
            className="hover:text-zinc-100 transition-colors"
          >
            Use cases
          </Link>
          <Link href="/blog" className="hover:text-zinc-100 transition-colors">
            Blog
          </Link>
          <Link href="/faq" className="hover:text-zinc-100 transition-colors">
            FAQ
          </Link>
        </div>

        {/* ── Right CTAs ───────────────────────────────────────── */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={goDemo}
            className="hidden md:block text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400 hover:text-zinc-100 transition-colors px-2 py-2"
          >
            Demo
          </button>
          <button
            onClick={goLogin}
            className="hidden sm:block text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-300 hover:text-zinc-100 transition-colors px-2 py-2"
          >
            Sign in
          </button>
          <button
            onClick={goSignup}
            className="btn-premium py-2 px-5 text-[11px] uppercase tracking-[0.18em] whitespace-nowrap"
          >
            Start free
          </button>

          {/* Hamburger — shows below lg so the trimmed-down nav still
              has a path to the secondary marketing pages. */}
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            className="lg:hidden ml-1 flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/40 text-zinc-300 transition-colors hover:border-zinc-700 hover:text-zinc-100"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        {/* ── Mobile / mid-desktop drawer ─────────────────────── */}
        {open && (
          <div className="absolute left-4 right-4 top-[68px] rounded-2xl border border-zinc-800 bg-[#0a0a0a]/95 p-4 shadow-2xl shadow-black/60 backdrop-blur-xl lg:hidden">
            <div className="flex flex-col divide-y divide-zinc-900">
              {[
                { href: "/pricing", label: "Pricing" },
                { href: "/use-cases", label: "Use cases" },
                { href: "/blog", label: "Blog" },
                { href: "/faq", label: "FAQ" },
                { href: "/roi-calculator", label: "ROI calculator" },
                { href: "/readiness-quiz", label: "Readiness quiz" },
                { href: "/founding-member", label: "Founding member" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="py-3 text-[13px] font-semibold text-zinc-200 hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setOpen(false);
                  handleEnterApp();
                }}
                className="rounded-xl border border-zinc-800 px-3 py-2.5 text-[12px] font-bold uppercase tracking-widest text-zinc-300 hover:border-zinc-700 hover:text-zinc-100"
              >
                Open app
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  goLogin();
                }}
                className="rounded-xl border border-zinc-800 px-3 py-2.5 text-[12px] font-bold uppercase tracking-widest text-zinc-300 hover:border-zinc-700 hover:text-zinc-100"
              >
                Sign in
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
