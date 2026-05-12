"use client";

/**
 * Client-side actions for the draft preview banner. Kept tiny so the
 * rest of /admin/blog/preview/[id] stays server-rendered.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function PublishButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (!window.confirm("Publish this post now? Public URL goes live immediately.")) return;
    setError(null);
    fetch(`/api/admin/blog/${id}/publish`, { method: "POST" })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? `Publish failed (${res.status})`);
          return;
        }
        // Refresh the server component so the banner flips to
        // "Published preview".
        startTransition(() => router.refresh());
      })
      .catch((e) => setError(String(e)));
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-red-300">{error}</span>}
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-200 border border-emerald-500/40 font-bold hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
      >
        {pending ? "Publishing…" : "Publish now"}
      </button>
    </div>
  );
}
