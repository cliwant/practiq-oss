/**
 * Authenticated app loading state — shown while server components
 * inside /app/* fetch their data. Keeps the firm shell visible so
 * the page doesn't flash to a blank background.
 */
export default function AppLoading() {
  return (
    <div
      role="status"
      aria-label="Loading workspace"
      className="flex min-h-[40vh] items-center justify-center"
    >
      <div className="flex items-center gap-2.5 text-zinc-500">
        <div className="h-3 w-3 rounded-full bg-zinc-600 animate-pulse" />
        <span className="text-[12px] font-bold uppercase tracking-[0.18em]">
          Loading workspace
        </span>
      </div>
    </div>
  );
}
