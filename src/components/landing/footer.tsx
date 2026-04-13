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
        <div className="flex items-center gap-6 text-xs text-zinc-500">
          <Link href="/blog" className="hover:text-zinc-300 transition-colors">Blog</Link>
          <span>&middot;</span>
          <span>&copy; 2026 Cliwant, Inc.</span>
        </div>
      </div>
    </footer>
  );
}
