import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Plus, ArrowUpRight, Sparkles, Clock } from "lucide-react";
import { ClientAvatar } from "@/components/workspace/client-avatar";
import { formatDistance } from "@/lib/format-time";

export const dynamic = "force-dynamic";

/**
 * /app — operator home.
 *
 * Pure cross-client overview. Lists every client with their most recent
 * activity and open context count. Empty state pushes the operator to
 * either create a client or run the seed script.
 */
export default async function AppHomePage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const clients = await prisma.client.findMany({
    where: { userId: session.user.id },
    orderBy: [{ updatedAt: "desc" }],
    include: {
      _count: { select: { contexts: true, conversations: true } },
    },
  });

  const contexts = await prisma.clientContext.findMany({
    where: { client: { userId: session.user.id } },
    orderBy: { updatedAt: "desc" },
    take: 1,
  });
  const lastContextUpdate = contexts[0]?.updatedAt ?? null;

  const firstName =
    (session.user.name ?? session.user.email ?? "there").split(/[@\s]/)[0];

  return (
    <div className="h-full overflow-y-auto bg-[#050505]">
      <div className="mx-auto max-w-5xl px-10 py-16">
        <header className="mb-10 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-600">
              Workspace
            </p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-zinc-100">
              {greeting()}, {capitalize(firstName)}.
            </h1>
            <p className="mt-2 text-[13px] text-zinc-500">
              {clients.length === 0
                ? "No clients yet. Create your first client to start the agent."
                : `${clients.length} client${
                    clients.length === 1 ? "" : "s"
                  } · last updated ${
                    lastContextUpdate
                      ? formatDistance(lastContextUpdate)
                      : "—"
                  }`}
            </p>
          </div>

          <Link
            href="/app/clients/new"
            className="group flex items-center gap-2 rounded-xl bg-zinc-100 px-4 py-2.5 text-[13px] font-semibold text-zinc-950 shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_8px_24px_-8px_rgba(255,255,255,0.2)] transition-all hover:shadow-[0_0_0_1px_rgba(255,255,255,0.2),0_12px_32px_-8px_rgba(255,255,255,0.3)] active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            New client
          </Link>
        </header>

        {clients.length === 0 ? (
          <EmptyState />
        ) : (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[12px] font-bold uppercase tracking-widest text-zinc-500">
                Your clients
              </h2>
              <span className="text-[11px] text-zinc-600">
                sorted by recent activity
              </span>
            </div>

            <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {clients.map((c) => {
                const prefs = (c.preferences ?? {}) as { brandColor?: string };
                const color = prefs.brandColor ?? "#3b82f6";
                return (
                  <li key={c.id}>
                    <Link
                      href={`/app/clients/${c.id}`}
                      className="group flex items-center gap-4 rounded-xl border border-zinc-900 bg-[#0a0a0a] px-4 py-4 transition-all hover:border-zinc-700 hover:bg-[#0d0d0d]"
                    >
                      <ClientAvatar name={c.name} color={color} size={40} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-[14px] font-semibold text-zinc-100">
                            {c.name}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-[11.5px] text-zinc-500">
                          <span>{c.industry}</span>
                          <span className="text-zinc-700">·</span>
                          <span>{c._count.contexts} contexts</span>
                          <span className="text-zinc-700">·</span>
                          <span>
                            updated {formatDistance(c.updatedAt)}
                          </span>
                        </div>
                      </div>
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-zinc-700 transition-colors group-hover:text-zinc-400" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {clients.length > 0 && (
          <aside className="mt-12 rounded-xl border border-zinc-900 bg-[#0a0a0a] p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-[13px] font-semibold text-zinc-100">
                  Agent is running in the background
                </h3>
                <p className="mt-1 max-w-prose text-[12.5px] leading-relaxed text-zinc-500">
                  Every night at 02:00 local time, Practiq scans each client's
                  latest context for anomalies, deadline approaches, and draft
                  opportunities. Anything it prepares lands in the{" "}
                  <Link
                    href="/app/tasks"
                    className="text-zinc-300 underline decoration-zinc-700 underline-offset-2 hover:decoration-zinc-400"
                  >
                    Approval Queue
                  </Link>{" "}
                  for you to review in under 2 minutes each.
                </p>
                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-zinc-600">
                  <Clock className="h-3 w-3" />
                  <span>Next run: tonight · 02:00</span>
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-800 bg-[#070707] p-12 text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-zinc-500">
        <Sparkles className="h-4 w-4" />
      </div>
      <h2 className="mt-4 text-[17px] font-bold text-zinc-100">
        Add your first client
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-zinc-500">
        The agent becomes useful the moment you give it a client to look after.
        Profile, industry, preferences — a minute of setup buys you the rest.
      </p>
      <Link
        href="/app/clients/new"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-zinc-100 px-4 py-2.5 text-[13px] font-semibold text-zinc-950 transition-all hover:shadow-[0_0_0_1px_rgba(255,255,255,0.2)]"
      >
        <Plus className="h-4 w-4" />
        Create a client
      </Link>
    </div>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Still up";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1);
}
