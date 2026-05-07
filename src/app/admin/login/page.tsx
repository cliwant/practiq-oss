/**
 * /admin/login — email + password sign-in form.
 *
 * Server Component. The form posts directly to /api/admin/login, which
 * verifies bcrypt and issues an HttpOnly session cookie on success.
 *
 * No "Sign up" link, no "Reset password" link. Account creation is done
 * exclusively via the ADMIN_USERS env var (see .env.example).
 */
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sign in — Practiq Admin",
  robots: { index: false, follow: false, nocache: true, noarchive: true, nosnippet: true, noimageindex: true },
};

interface PageProps {
  searchParams: Promise<{ error?: string; expired?: string; from?: string }>;
}

export default async function AdminLoginPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const errorMsg =
    sp.error === "invalid"
      ? "Invalid email or password."
      : sp.error === "missing"
      ? "Please enter both email and password."
      : sp.error === "ratelimited"
      ? "Too many attempts. Try again in a minute."
      : sp.expired === "1"
      ? "Your session expired. Please sign in again."
      : null;

  const from = sp.from ?? "/admin/crawler";

  return (
    <main className="min-h-screen bg-bg-base flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 justify-center mb-10 group">
          <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-lg font-black text-zinc-950 tracking-tight">P</span>
          </div>
          <span className="font-bold text-xl tracking-tighter text-zinc-100">
            Pract<span className="text-zinc-500">iq</span>
            <span className="text-zinc-500 text-sm font-medium ml-2">Admin</span>
          </span>
        </Link>

        <div className="bento-card p-8">
          <header className="mb-6">
            <h1 className="text-xl font-bold text-zinc-100 mb-1">Sign in</h1>
            <p className="text-sm text-zinc-400">
              Use your admin credentials. Accounts are created by the team out of band — no self-signup.
            </p>
          </header>

          {errorMsg && (
            <div
              role="alert"
              className="mb-4 px-4 py-3 rounded-lg border border-red-500/30 bg-red-500/10 text-sm text-red-300"
            >
              {errorMsg}
            </div>
          )}

          <form action="/api/admin/login" method="POST" className="space-y-4" autoComplete="on">
            <input type="hidden" name="from" value={from} />

            <div>
              <label
                htmlFor="email"
                className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email" data-ph-no-capture
                autoComplete="username"
                required
                spellCheck={false}
                autoCapitalize="off"
                className="input-premium w-full py-3 px-4 text-sm"
                placeholder="you@grindworks.ai"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="input-premium w-full py-3 px-4 text-sm"
              />
            </div>

            <button
              type="submit"
              className="btn-premium w-full py-3 text-xs uppercase tracking-widest"
            >
              Sign in
            </button>
          </form>

          <p className="mt-6 text-[11px] text-zinc-600 text-center leading-relaxed">
            New accounts can only be added by editing the <code className="text-zinc-500">ADMIN_USERS</code> environment variable
            and redeploying. There is no public sign-up.
          </p>
        </div>
      </div>
    </main>
  );
}
