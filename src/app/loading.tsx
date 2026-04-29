/**
 * Root loading boundary. Shown briefly between client navigation and
 * server-component render for any route that doesn't supply its own
 * loading.tsx. Stays visually consistent with the dark Practiq chrome
 * so the visitor doesn't see a flash of white.
 */
export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="flex min-h-screen items-center justify-center bg-[#050505]"
    >
      <div className="flex items-center gap-3 text-zinc-500">
        <div className="h-9 w-9 rounded-2xl bg-zinc-100 text-zinc-950 flex items-center justify-center text-base font-black tracking-tight shadow-[0_0_0_1px_rgba(255,255,255,0.08)] animate-pulse">
          P
        </div>
        <span className="text-[12px] font-bold uppercase tracking-[0.18em]">
          Loading…
        </span>
      </div>
    </div>
  );
}
