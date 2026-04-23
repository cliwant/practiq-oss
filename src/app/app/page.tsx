import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  Plus,
  ArrowUpRight,
  Sparkles,
  Clock,
  CheckSquare,
  AlertCircle,
  Zap,
} from "lucide-react";
import { ClientAvatar } from "@/components/workspace/client-avatar";
import { formatDistance } from "@/lib/format-time";
import { HomeAgentCTA } from "@/components/workspace/home-agent-cta";

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

  // Pending approval count — primary attention surface for the operator.
  const pendingCount = await prisma.approvalItem.count({
    where: { userId: session.user.id, status: "pending_review" },
  });

  // Top pending items for the morning digest. We show up to 4, highest
  // priority first, so the operator sees "what the agent surfaced"
  // before scrolling to the client list. This is the signature
  // "Command Center" moment — the AI's overnight work greets you.
  const topPending = await prisma.approvalItem.findMany({
    where: { userId: session.user.id, status: "pending_review" },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    take: 4,
    include: {
      client: { select: { id: true, name: true, industry: true, preferences: true } },
    },
  });

  const highCount = topPending.filter((i) => i.priority >= 70).length;
  const actionCount = topPending.filter((i) => i.type === "action").length;
  const briefingCount = topPending.filter((i) => i.type === "briefing").length;

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
          <>
            {topPending.length > 0 && (
              <section className="mb-10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-5 w-5 items-center justify-center rounded bg-blue-500/10 text-blue-400">
                      <Zap className="h-3 w-3" />
                    </div>
                    <h2 className="text-[12px] font-bold uppercase tracking-widest text-zinc-400">
                      What the agent surfaced
                    </h2>
                  </div>
                  <span className="text-[11px] text-zinc-600">
                    {pendingCount} pending ·{" "}
                    {highCount > 0
                      ? `${highCount} high-priority`
                      : `${actionCount} action${actionCount === 1 ? "" : "s"}, ${briefingCount} briefing${briefingCount === 1 ? "" : "s"}`}
                  </span>
                </div>

                <ul className="space-y-2">
                  {topPending.map((item) => {
                    const prefs = (item.client.preferences ?? {}) as {
                      brandColor?: string;
                    };
                    const color = prefs.brandColor ?? "#3b82f6";
                    const isHigh = item.priority >= 70;
                    return (
                      <li key={item.id}>
                        <Link
                          href={`/app/tasks?item=${item.id}`}
                          className="group flex items-center gap-3 rounded-xl border border-zinc-900 bg-[#0a0a0a] px-4 py-3.5 transition-all hover:border-zinc-700 hover:bg-[#0d0d0d]"
                        >
                          <ClientAvatar
                            name={item.client.name}
                            color={color}
                            size={32}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-[13.5px] font-semibold text-zinc-100">
                                {item.title}
                              </span>
                              {isHigh && (
                                <span className="shrink-0 inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                                  <AlertCircle className="h-2.5 w-2.5" />
                                  High
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 flex items-center gap-2 text-[11.5px] text-zinc-500">
                              <span className="truncate">{item.client.name}</span>
                              <span className="text-zinc-700">·</span>
                              <span className="capitalize">{item.type}</span>
                              {item.aiConfidence != null && (
                                <>
                                  <span className="text-zinc-700">·</span>
                                  <span className="tabular-nums">
                                    {(item.aiConfidence * 100).toFixed(0)}%
                                    confidence
                                  </span>
                                </>
                              )}
                              <span className="text-zinc-700">·</span>
                              <span>
                                {formatDistance(item.createdAt)}
                              </span>
                            </div>
                          </div>
                          <ArrowUpRight className="h-4 w-4 shrink-0 text-zinc-700 transition-colors group-hover:text-zinc-400" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>

                {pendingCount > topPending.length && (
                  <div className="pt-1 text-center">
                    <Link
                      href="/app/tasks"
                      className="text-[11.5px] text-zinc-500 underline decoration-zinc-800 underline-offset-4 hover:text-zinc-300 hover:decoration-zinc-500"
                    >
                      Review all {pendingCount} items in the Approval Queue →
                    </Link>
                  </div>
                )}
              </section>
            )}

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
          </>
        )}

        {clients.length > 0 && (
          <section className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto]">
            <aside className="rounded-xl border border-zinc-900 bg-[#0a0a0a] p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-[13px] font-semibold text-zinc-100">
                    Agent is ready to run
                  </h3>
                  <p className="mt-1 max-w-prose text-[12.5px] leading-relaxed text-zinc-500">
                    Scheduled briefings land overnight, but you can trigger one
                    right now across every client — useful while onboarding or
                    after a context burst. Output drops into the{" "}
                    <Link
                      href="/app/tasks"
                      className="text-zinc-300 underline decoration-zinc-700 underline-offset-2 hover:decoration-zinc-400"
                    >
                      Approval Queue
                    </Link>
                    .
                  </p>
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-zinc-600">
                    <Clock className="h-3 w-3" />
                    <span>Next scheduled run: tonight · 02:00 local</span>
                  </div>
                  <div className="mt-4">
                    <HomeAgentCTA />
                  </div>
                </div>
              </div>
            </aside>

            <Link
              href="/app/tasks"
              className="group relative flex w-full min-w-[220px] items-center gap-3 overflow-hidden rounded-xl border border-zinc-900 bg-gradient-to-br from-[#0d0d0d] to-[#070707] p-5 transition-all hover:border-zinc-700"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-300">
                <CheckSquare className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600">
                  Approval Queue
                </div>
                <div className="mt-1 text-[22px] font-extrabold tabular-nums leading-none text-zinc-100">
                  {pendingCount}
                </div>
                <div className="mt-1 text-[11px] text-zinc-500">
                  item{pendingCount === 1 ? "" : "s"} waiting
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-zinc-700 transition-colors group-hover:text-zinc-400" />
            </Link>
          </section>
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
