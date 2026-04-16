import Link from "next/link";

export function Footer() {
  return (
    <footer className="py-10 px-6 border-t border-border-subtle">
      <div className="max-w-7xl mx-auto flex flex-col items-center gap-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center">
            <span className="text-lg font-black text-zinc-950 tracking-tight">P</span>
          </div>
          <span className="font-bold text-xl tracking-tighter text-zinc-100">
            Pract<span className="text-zinc-500">iq</span>
          </span>
        </Link>
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-zinc-500">
          <Link href="/about" className="hover:text-zinc-300 transition-colors">About</Link>
          <span>&middot;</span>
          <Link href="/blog" className="hover:text-zinc-300 transition-colors">Blog</Link>
          <span>&middot;</span>
          <Link href="/docs" className="hover:text-zinc-300 transition-colors">Docs</Link>
          <span>&middot;</span>
          <Link href="/contact" className="hover:text-zinc-300 transition-colors">Contact</Link>
          <span>&middot;</span>
          <Link href="/privacy" className="hover:text-zinc-300 transition-colors">Privacy</Link>
          <span>&middot;</span>
          <Link href="/terms" className="hover:text-zinc-300 transition-colors">Terms</Link>
        </div>
        <div className="text-xs text-zinc-500">
          Built by <strong className="text-zinc-400">Grindworks</strong> &middot; Dover, DE
        </div>
        <div className="text-[10px] text-zinc-600">
          &copy; 2026 Cliwant, Inc. &middot; 1111b South Governors Ave STE 93589, Dover, DE 19904 &middot; We respond within 4 hours US business time
        </div>
      </div>
    </footer>
  );
}
