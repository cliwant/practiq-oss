"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";

type ProviderId =
  | "google"
  | "linkedin"
  | "microsoft-entra-id"
  | "credentials";

interface Provider {
  id: ProviderId;
  label: string;
}

/**
 * Polyfill provider-aware OAuth button stack. Reads
 * /api/auth/available-providers on mount, renders a button per OAuth
 * provider that's actually configured, and gracefully shows nothing
 * if only credentials is available (the parent page renders the email
 * + password form in that case).
 *
 * Buttons use OAuth-brand logos inlined as SVG so there's no third-party
 * image dependency and no dark-mode contrast issues.
 */
export function OAuthButtons({
  callbackUrl = "/app",
  className = "",
}: {
  callbackUrl?: string;
  className?: string;
}) {
  const [providers, setProviders] = useState<Provider[] | null>(null);
  const [pending, setPending] = useState<ProviderId | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/available-providers")
      .then((r) => (r.ok ? r.json() : { providers: [] }))
      .then((d) => {
        if (!cancelled) setProviders(d.providers ?? []);
      })
      .catch(() => {
        if (!cancelled) setProviders([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (providers === null) {
    // Skeleton — avoid layout jump.
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="h-11 rounded-xl bg-zinc-900/80 animate-pulse" />
        <div className="h-11 rounded-xl bg-zinc-900/80 animate-pulse" />
      </div>
    );
  }

  const oauth = providers.filter((p) => p.id !== "credentials");
  if (oauth.length === 0) return null;

  const handleClick = async (id: ProviderId) => {
    if (id === "credentials") return;
    setPending(id);
    try {
      await signIn(id, { callbackUrl });
    } catch {
      setPending(null);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {oauth.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => handleClick(p.id)}
          disabled={pending !== null}
          className="group flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-[13.5px] font-semibold text-zinc-100 transition-all hover:border-zinc-700 hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending === p.id ? (
            <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
          ) : (
            <ProviderIcon id={p.id} />
          )}
          <span>
            {pending === p.id ? "Redirecting…" : `Continue with ${p.label}`}
          </span>
        </button>
      ))}
    </div>
  );
}

function ProviderIcon({ id }: { id: ProviderId }) {
  if (id === "google") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
        <path
          fill="#EA4335"
          d="M12 10.2v3.9h5.5c-.24 1.3-.97 2.4-2.05 3.14l3.3 2.57c1.93-1.78 3.04-4.4 3.04-7.52 0-.73-.07-1.44-.2-2.1H12z"
        />
        <path
          fill="#34A853"
          d="M5.52 14.22l-.74.57-2.63 2.05C3.83 20.04 7.64 22.5 12 22.5c2.97 0 5.46-.98 7.28-2.67l-3.3-2.57c-.9.6-2.06.96-3.98.96-3.07 0-5.68-2.07-6.61-4.85l-.67.02-.2-.17z"
        />
        <path
          fill="#FBBC05"
          d="M2.15 6.66C1.42 8.1 1 9.74 1 11.5s.42 3.4 1.15 4.84c0 0 3.37-2.61 3.37-2.62-.22-.66-.34-1.37-.34-2.22s.12-1.56.34-2.22L2.15 6.66z"
        />
        <path
          fill="#4285F4"
          d="M12 5.5c1.66 0 3.14.57 4.31 1.7l3.23-3.23C17.44 2.15 14.98 1.5 12 1.5 7.64 1.5 3.83 3.96 2.15 6.66l3.37 2.62c.93-2.78 3.54-3.78 6.48-3.78z"
        />
      </svg>
    );
  }
  if (id === "linkedin") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
        <path
          fill="#0A66C2"
          d="M20.447 20.452h-3.554v-5.569c0-1.328-.024-3.037-1.85-3.037-1.852 0-2.135 1.446-2.135 2.939v5.667H9.354V9h3.414v1.561h.048c.476-.9 1.637-1.85 3.37-1.85 3.605 0 4.27 2.372 4.27 5.455v6.286zM5.337 7.433a2.063 2.063 0 01-2.064-2.064 2.064 2.064 0 112.064 2.064zM7.119 20.452H3.553V9h3.566v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
        />
      </svg>
    );
  }
  if (id === "microsoft-entra-id") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
        <path fill="#F25022" d="M1 1h10v10H1z" />
        <path fill="#7FBA00" d="M13 1h10v10H13z" />
        <path fill="#00A4EF" d="M1 13h10v10H1z" />
        <path fill="#FFB900" d="M13 13h10v10H13z" />
      </svg>
    );
  }
  return null;
}
