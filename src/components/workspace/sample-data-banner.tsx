"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, X, Loader2 } from "lucide-react";

interface SampleDataBannerProps {
  sampleClientId: string;
  realClientCount: number;
}

/**
 * Shows on /app while the user has a seeded "Acme Coffee Co" sample
 * client in their workspace. Two states:
 *
 *   - 0 real clients: "This is sample data. Explore freely, then add
 *     your real client." Primary CTA = "Open sample client" so the
 *     user actually plays with it.
 *
 *   - 1+ real clients: "Sample client still in your workspace.
 *     Ready to retire it?" Primary CTA = "Remove sample" because at
 *     this point the seed is just clutter.
 *
 * Removal is a single DELETE to /api/onboarding/sample. We hard-refresh
 * the route after success so the banner disappears and the client list
 * re-renders without the sample.
 */
export function SampleDataBanner({
  sampleClientId,
  realClientCount,
}: SampleDataBannerProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasReal = realClientCount > 0;

  async function handleRemove() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/onboarding/sample", { method: "DELETE" });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Remove failed (${res.status})`);
        }
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Remove failed");
      }
    });
  }

  return (
    <div className="mb-6 overflow-hidden rounded-xl border border-purple-500/30 bg-gradient-to-r from-purple-500/[0.08] via-purple-500/[0.04] to-transparent">
      <div className="flex items-start gap-3 px-4 py-3.5">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-500/15 text-purple-300">
          <Sparkles className="h-3.5 w-3.5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-purple-300">
              Sample data
            </span>
            <span className="text-[11px] text-zinc-600">
              · Acme Coffee Co
            </span>
          </div>
          <p className="mt-1 text-[13px] leading-relaxed text-zinc-300">
            {hasReal
              ? "You've got real clients now — ready to retire the sample? It'll cleanly remove the Acme workspace and everything attached."
              : "This is a fully populated demo client so you can see what Practiq looks like with data. Explore freely, then add your real client."}
          </p>

          {error && (
            <p className="mt-2 text-[11.5px] text-red-400">{error}</p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {!hasReal && (
              <Link
                href={`/app/clients/${sampleClientId}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-purple-500/15 px-3 py-1.5 text-[12px] font-semibold text-purple-100 transition-colors hover:bg-purple-500/25"
              >
                Open sample client →
              </Link>
            )}
            <Link
              href="/app/clients/new"
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                hasReal
                  ? "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                  : "border border-zinc-700 bg-transparent text-zinc-200 hover:border-zinc-500"
              }`}
            >
              {hasReal ? "Add another client" : "Add your real client"}
            </Link>
            {confirmOpen ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="text-[11.5px] text-zinc-400">
                  Remove sample data?
                </span>
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={pending}
                  className="inline-flex items-center gap-1 rounded-md bg-red-500/15 px-2.5 py-1 text-[11.5px] font-semibold text-red-300 transition-colors hover:bg-red-500/25 disabled:opacity-60"
                >
                  {pending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : null}
                  Yes, remove
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmOpen(false)}
                  disabled={pending}
                  className="rounded-md px-2.5 py-1 text-[11.5px] text-zinc-500 hover:text-zinc-300 disabled:opacity-60"
                >
                  Cancel
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11.5px] text-zinc-500 transition-colors hover:text-zinc-300"
                aria-label="Remove sample data"
              >
                <X className="h-3 w-3" />
                Remove sample
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
