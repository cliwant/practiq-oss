"use client";

import Link from "next/link";

interface NavProps {
  onOpenModal?: () => void;
  onEnterApp?: () => void;
}

export function Nav({ onOpenModal, onEnterApp }: NavProps) {
  const handleRequestAccess = onOpenModal ?? (() => {
    window.location.href = "/#cta";
  });

  const handleEnterApp = onEnterApp ?? (() => {
    window.location.href = "/dashboard?firm=meridian-accounting&view=home&tour=1";
  });

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-4 py-6 pointer-events-none">
      <div className="max-w-7xl mx-auto flex items-center justify-between glass-panel px-6 md:px-8 py-4 pointer-events-auto shadow-2xl shadow-black/20">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-lg font-black text-zinc-950 tracking-tight">P</span>
          </div>
          <span className="font-bold text-xl tracking-tighter text-zinc-100 hidden sm:inline">
            Pract<span className="text-zinc-500">iq</span>
          </span>
        </Link>
        <div className="hidden md:flex items-center gap-8 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400">
          <Link href="/#features" className="hover:text-zinc-100 transition-colors">Platform</Link>
          <Link href="/pricing" className="hover:text-zinc-100 transition-colors">Pricing</Link>
          <Link href="/roi-calculator" className="hover:text-zinc-100 transition-colors">Calculator</Link>
          <Link href="/readiness-quiz" className="hover:text-zinc-100 transition-colors">Quiz</Link>
          <Link href="/resources" className="hover:text-zinc-100 transition-colors">Resources</Link>
          <Link href="/blog" className="hover:text-zinc-100 transition-colors">Blog</Link>
          <Link href="/faq" className="hover:text-zinc-100 transition-colors">FAQ</Link>
          <Link href="/founding-member" className="hover:text-zinc-100 transition-colors">Founding</Link>
          <Link href="/#cta" className="hover:text-zinc-100 transition-colors">Get Access</Link>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={handleEnterApp} className="text-[10px] font-bold uppercase tracking-widest text-zinc-300 hover:text-zinc-100 transition-colors hidden sm:block">
            Live Demo
          </button>
          <button onClick={handleRequestAccess} className="btn-premium py-2 px-6 text-[10px] uppercase tracking-widest">
            Request Access
          </button>
        </div>
      </div>
    </nav>
  );
}
