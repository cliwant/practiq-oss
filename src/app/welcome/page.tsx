import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { WelcomePoller } from "./welcome-poller";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Welcome to Practiq — your Founding Member seat is reserved",
  description:
    "Your Practiq Founding Member subscription is being confirmed. Set up your firm profile and add your first client to get started.",
  robots: { index: false, follow: false },
};

/**
 * /welcome — post-checkout landing page for the Founding Member flow.
 *
 * This is the page Stripe redirects to after a successful Founding
 * Member checkout (success_url in /api/stripe/checkout, when
 * isFoundingClaim is true). Three meaningful states:
 *
 *   1. No `?session_id=` and no signed-in user → bounce to /login with
 *      a soft message. Visitor hit /welcome cold.
 *   2. No `?session_id=` and signed-in user → show "no recent checkout"
 *      summary with onboarding checklist links. Useful as a re-entry
 *      bookmark.
 *   3. `?session_id=cs_*` present → render the optimistic "confirming
 *      subscription" UI and let the client poller (WelcomePoller)
 *      hit /api/users/me until subscription.status === "active". On
 *      success, the poller swaps in the welcome checklist. On 10s
 *      timeout, it shows the support fallback and fires a critical
 *      reportUserError beacon so the operator gets paged.
 *
 * Rendering: Server Component end-to-end (no client bailout). Only the
 * polling island is "use client". This is required so view-source has
 * the full page shell + onboarding links indexable / fallback-readable
 * even when client-side JS fails.
 */

interface WelcomePageProps {
  searchParams: Promise<{ session_id?: string }>;
}

export default async function WelcomePage({ searchParams }: WelcomePageProps) {
  const params = await searchParams;
  const sessionId =
    typeof params.session_id === "string" ? params.session_id : null;

  const session = await auth();

  // State 1: not signed in, no checkout in flight → soft bounce.
  if (!session?.user?.id) {
    if (sessionId) {
      // Edge case: Stripe redirected us with a session id but the user's
      // cookie isn't valid (different browser, third-party cookie block,
      // or session expired between Stripe and us). Send them to login
      // with a `next` that preserves the session id so we can resume.
      redirect(`/login?next=${encodeURIComponent(`/welcome?session_id=${sessionId}`)}`);
    }
    redirect("/login?next=/welcome");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      firmName: true,
      firmVertical: true,
      subscription: {
        select: { plan: true, status: true },
      },
    },
  });

  if (!user) {
    redirect("/login");
  }

  const firmDisplayName =
    user.firmName?.trim() ||
    user.name?.trim() ||
    user.email.split("@")[0] ||
    "your firm";

  const hasActiveSubscription =
    user.subscription &&
    (user.subscription.status === "active" ||
      user.subscription.status === "trialing");

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100">
      <header className="border-b border-zinc-900 px-6 py-5">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-950">
              <span className="text-sm font-black tracking-tight">P</span>
            </div>
            <span className="text-[14px] font-bold tracking-tight text-zinc-200">
              Pract<span className="text-zinc-500">iq</span>
            </span>
          </Link>
          <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">
            Founding Member
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
        <section className="text-center">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">
            $10/client/month · locked in for life
          </p>
          <h1 className="mb-4 text-3xl font-extrabold tracking-[-0.03em] text-zinc-100 sm:text-4xl">
            {hasActiveSubscription ? (
              <>
                Welcome to Practiq,{" "}
                <span className="text-zinc-400">{firmDisplayName}</span>.
              </>
            ) : sessionId ? (
              <>
                Welcome to Practiq,{" "}
                <span className="text-zinc-400">{firmDisplayName}</span>.
              </>
            ) : (
              <>
                We don&apos;t see a recent checkout for{" "}
                <span className="text-zinc-400">{firmDisplayName}</span>.
              </>
            )}
          </h1>
          <p className="mx-auto max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base">
            {sessionId
              ? "Your Founding Member seat ($10/client/month locked-in) is reserved. We're confirming the subscription with Stripe now."
              : "If you just checked out, refresh in a few seconds. Otherwise, hop to your workspace or head back to pricing."}
          </p>
        </section>

        {/* Polling island. Renders the live "confirming…" → "confirmed"
            state swap. When sessionId is null OR subscription is already
            active server-side, the island gets a head-start and skips
            straight to the active state. */}
        <WelcomePoller
          sessionId={sessionId}
          initiallyActive={Boolean(hasActiveSubscription)}
        />

        {/* Static SSR checklist — always renders, even if JS is broken.
            The client island will hide/swap copy as subscription state
            resolves, but the underlying links are always crawlable +
            usable in the no-JS fallback. */}
        <ol className="mt-12 space-y-4">
          <li className="flex items-start gap-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5">
            <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[11px] font-bold text-emerald-300">
              1
            </span>
            <div>
              <p className="mb-1 text-[14px] font-semibold text-zinc-100">
                Subscription active
              </p>
              <p className="text-[12.5px] leading-relaxed text-zinc-400">
                Founding Member rate ($10/client/month) is locked to your firm
                for the life of the subscription. Your receipt is in your
                Stripe email.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-4 rounded-xl border border-zinc-800 bg-[#0a0a0a] p-5 transition-colors hover:border-zinc-700">
            <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-zinc-800 text-[11px] font-bold text-zinc-300">
              2
            </span>
            <div className="flex-1">
              <p className="mb-1 text-[14px] font-semibold text-zinc-100">
                Set up your firm profile
              </p>
              <p className="mb-3 text-[12.5px] leading-relaxed text-zinc-400">
                Firm name, vertical, default tone, and your team. Three minutes.
              </p>
              <Link
                href="/app/settings/firm"
                className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-emerald-300 underline decoration-emerald-500/40 underline-offset-4 transition-colors hover:text-emerald-200 hover:decoration-emerald-300"
              >
                Open firm settings →
              </Link>
            </div>
          </li>
          <li className="flex items-start gap-4 rounded-xl border border-zinc-800 bg-[#0a0a0a] p-5 transition-colors hover:border-zinc-700">
            <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-zinc-800 text-[11px] font-bold text-zinc-300">
              3
            </span>
            <div className="flex-1">
              <p className="mb-1 text-[14px] font-semibold text-zinc-100">
                Add your first client
              </p>
              <p className="mb-3 text-[12.5px] leading-relaxed text-zinc-400">
                Drop in a name, vertical, and any notes you already keep
                somewhere else. The agent primes itself from there.
              </p>
              <Link
                href="/app/clients/new"
                className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-emerald-300 underline decoration-emerald-500/40 underline-offset-4 transition-colors hover:text-emerald-200 hover:decoration-emerald-300"
              >
                Add a client →
              </Link>
            </div>
          </li>
          <li className="flex items-start gap-4 rounded-xl border border-zinc-800 bg-[#0a0a0a] p-5 transition-colors hover:border-zinc-700">
            <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-zinc-800 text-[11px] font-bold text-zinc-300">
              4
            </span>
            <div className="flex-1">
              <p className="mb-1 text-[14px] font-semibold text-zinc-100">
                Try the workflow audit
              </p>
              <p className="mb-3 text-[12.5px] leading-relaxed text-zinc-400">
                Open the workspace and let the agent walk through your typical
                week. The fastest way to see the difference.
              </p>
              <Link
                href="/app"
                className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-emerald-300 underline decoration-emerald-500/40 underline-offset-4 transition-colors hover:text-emerald-200 hover:decoration-emerald-300"
              >
                Open your workspace →
              </Link>
            </div>
          </li>
        </ol>

        <p className="mt-12 text-center text-[12px] text-zinc-500">
          Questions? Email{" "}
          <a
            href="mailto:hello@practiq.dev"
            className="text-zinc-300 underline decoration-zinc-700 underline-offset-4 hover:text-zinc-100"
          >
            hello@practiq.dev
          </a>{" "}
          — you have a direct line to the founders as a Founding Member.
        </p>
      </main>
    </div>
  );
}
