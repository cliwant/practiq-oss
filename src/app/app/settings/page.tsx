import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, KeyRound, User, Zap, ShieldCheck } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * /app/settings — minimal account + agent configuration surface.
 *
 * Intentionally sparse in the MVP: surface the things operators need to
 * self-serve (account identity, briefing schedule hint, API-key status)
 * and leave the more elaborate permission / team surface for when we
 * have real multi-user firms to support.
 */
export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/app/settings");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      _count: {
        select: { clients: true, contexts: true, approvalItems: true },
      },
    },
  });
  if (!user) redirect("/login");

  const apiKeyConfigured = !!process.env.ANTHROPIC_API_KEY;

  return (
    <div className="h-full overflow-y-auto bg-[#050505]">
      <div className="mx-auto max-w-3xl px-10 py-12">
        <Link
          href="/app"
          className="mb-6 inline-flex items-center gap-2 text-[12px] text-zinc-500 transition-colors hover:text-zinc-200"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to workspace
        </Link>

        <h1 className="text-[24px] font-extrabold tracking-tight text-zinc-100">
          Settings
        </h1>
        <p className="mt-1 text-[13px] text-zinc-500">
          {user.name ?? user.email}
        </p>

        <div className="mt-8 space-y-4">
          <Card
            icon={<User className="h-4 w-4" />}
            title="Account"
            meta={user.email}
          >
            <Row label="Display name" value={user.name ?? "—"} />
            <Row label="Email" value={user.email} />
            <Row
              label="Workspace created"
              value={formatDate(user.createdAt)}
            />
          </Card>

          <Card
            icon={<Zap className="h-4 w-4" />}
            title="Agent activity"
            meta="Overall utilization"
          >
            <Row label="Clients" value={user._count.clients.toString()} />
            <Row
              label="Knowledge entries"
              value={user._count.contexts.toString()}
            />
            <Row
              label="Approval items (lifetime)"
              value={user._count.approvalItems.toString()}
            />
            <Row
              label="Next scheduled run"
              value="Nightly · 02:00 local (Vercel cron when deployed)"
            />
          </Card>

          <Card
            icon={<KeyRound className="h-4 w-4" />}
            title="API access"
            meta="Anthropic SDK credentials"
          >
            <Row
              label="ANTHROPIC_API_KEY"
              value={
                apiKeyConfigured ? (
                  <span className="inline-flex items-center gap-1 text-emerald-300">
                    <ShieldCheck className="h-3 w-3" /> Configured
                  </span>
                ) : (
                  <span className="text-amber-300">
                    Missing — set in studio .env.local
                  </span>
                )
              }
            />
            <Row
              label="Model"
              value="claude-sonnet-4-5-20250929 (server-pinned)"
            />
          </Card>
        </div>
      </div>
    </div>
  );
}

function Card({
  icon,
  title,
  meta,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-zinc-900 bg-[#0a0a0a] p-5">
      <header className="mb-3 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 text-zinc-400">
          {icon}
        </span>
        <h2 className="text-[13px] font-bold text-zinc-100">{title}</h2>
        {meta && <span className="text-[11px] text-zinc-600">· {meta}</span>}
      </header>
      <dl className="space-y-2">{children}</dl>
    </section>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-zinc-900/60 pb-2 last:border-b-0 last:pb-0">
      <dt className="text-[11.5px] text-zinc-500">{label}</dt>
      <dd className="text-right text-[12.5px] text-zinc-200">{value}</dd>
    </div>
  );
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
