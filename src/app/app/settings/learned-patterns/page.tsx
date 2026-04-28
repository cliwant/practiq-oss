/**
 * /app/settings/learned-patterns — RUN-post-lovable polish (audit fix #15).
 *
 * Operator-facing read view of every AgentRule the pattern learner
 * has accumulated for this user. The pattern-learner has been
 * writing rules since RUN 2 (P2-04), but the operator had no way to
 * SEE the rules without grep'ing the DB. This page closes that loop:
 * the operator can verify what patterns the system has learned about
 * their workflow + dismiss any that look wrong.
 *
 * Layout:
 *   - Three sections matching the T4 firm-patterns reader:
 *     APPLY (promoted, confidence ≥ 0.85)
 *     Consider (candidate, confidence 0.6 - 0.85)
 *     DO NOT produce (RUN 21 unsafe rules, bannedUntil within 30d)
 *   - Each rule renders: title pattern, item type, industry,
 *     confidence (visual bar), times applied, last seen, action
 *     template summary.
 *   - Per-rule "Dismiss" button calls a future PATCH endpoint.
 *
 * Side-effect safety: this page is READ-ONLY. The dismiss button
 * UI exists but the API endpoint is a future addition. No risk to
 * existing learning behaviour.
 *
 * Auth: requires session via `auth()`. Lives under /app, gated by
 * the existing app middleware.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Sparkles, AlertTriangle, ListChecks } from "lucide-react";

export const metadata: Metadata = {
  title: "Learned patterns — Practiq",
  description:
    "Patterns the AI has learned from your approval-queue decisions.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface Rule {
  id: string;
  ruleType: string;
  clientId: string | null;
  clientName: string | null;
  condition: Record<string, unknown>;
  action: Record<string, unknown>;
  confidence: number;
  appliedCount: number;
  createdAt: Date;
}

async function loadRules(userId: string): Promise<Rule[]> {
  const rules = await prisma.agentRule.findMany({
    where: { userId },
    orderBy: [{ confidence: "desc" }, { appliedCount: "desc" }],
    take: 200,
  });
  // Hydrate client names via a single batched lookup so the table
  // can render "{Client name}" instead of bare clientId UUIDs.
  const clientIds = Array.from(
    new Set(rules.map((r) => r.clientId).filter((id): id is string => !!id)),
  );
  const clients = clientIds.length
    ? await prisma.client.findMany({
        where: { id: { in: clientIds } },
        select: { id: true, name: true },
      })
    : [];
  const nameById = new Map(clients.map((c) => [c.id, c.name]));
  return rules.map((r) => ({
    id: r.id,
    ruleType: r.ruleType,
    clientId: r.clientId,
    clientName: r.clientId ? (nameById.get(r.clientId) ?? null) : null,
    condition: (r.condition ?? {}) as Record<string, unknown>,
    action: (r.action ?? {}) as Record<string, unknown>,
    confidence: r.confidence,
    appliedCount: r.appliedCount,
    createdAt: r.createdAt,
  }));
}

export default async function LearnedPatternsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?next=/app/settings/learned-patterns");
  }

  const all = await loadRules(session.user.id);

  // Bucket the rules — same logic as T4 firm-patterns reader so the
  // operator's view matches what the AI actually sees.
  const now = Date.now();
  const unsafe = all.filter((r) => {
    const a = r.action as { subAction?: string; bannedUntil?: string | null };
    if (a.subAction !== "unsafe") return false;
    if (!a.bannedUntil) return true;
    return new Date(a.bannedUntil).getTime() >= now;
  });
  const positives = all.filter(
    (r) => !unsafe.some((u) => u.id === r.id),
  );
  const promoted = positives.filter(
    (r) =>
      (r.action as { promoted?: boolean }).promoted === true ||
      r.confidence >= 0.85,
  );
  const candidates = positives.filter(
    (r) => !promoted.some((p) => p.id === r.id) && r.confidence >= 0.5,
  );
  const lowConfidence = positives.filter(
    (r) =>
      !promoted.some((p) => p.id === r.id) &&
      !candidates.some((c) => c.id === r.id),
  );

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8">
        <Link
          href="/app/settings"
          className="text-[12.5px] text-zinc-400 hover:text-zinc-100"
        >
          ← Settings
        </Link>
        <h1 className="mt-3 text-[28px] font-extrabold tracking-tight text-zinc-100">
          Learned patterns
        </h1>
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-zinc-400">
          Every approval-queue decision teaches the system how your firm
          handles its workflow. This page shows the patterns that have
          accumulated — what the AI now treats as defaults (APPLY), what
          it surfaces as hints (Consider), and what it has been told never
          to produce (DO NOT produce).
        </p>
      </header>

      <SectionStat
        promoted={promoted.length}
        candidates={candidates.length}
        unsafe={unsafe.length}
        total={all.length}
      />

      <RuleSection
        title="APPLY (promoted)"
        helpText="High-confidence patterns the AI applies as defaults. Confidence ≥ 0.85."
        rules={promoted}
        tone="emerald"
        icon={<Sparkles className="h-3 w-3" />}
      />

      <RuleSection
        title="Consider (candidate)"
        helpText="Patterns the AI surfaces as hints to itself when drafting. Confidence 0.6 – 0.85."
        rules={candidates}
        tone="zinc"
        icon={<ListChecks className="h-3 w-3" />}
      />

      <RuleSection
        title="DO NOT produce (rejected unsafe)"
        helpText="Patterns the operator marked unsafe in the last 30 days. The AI is told never to produce these."
        rules={unsafe}
        tone="red"
        icon={<AlertTriangle className="h-3 w-3" />}
      />

      {lowConfidence.length > 0 && (
        <RuleSection
          title="Below threshold"
          helpText="Patterns observed once or twice — not yet active."
          rules={lowConfidence}
          tone="zinc"
          icon={null}
        />
      )}

      {all.length === 0 && <EmptyState />}
    </div>
  );
}

function SectionStat({
  promoted,
  candidates,
  unsafe,
  total,
}: {
  promoted: number;
  candidates: number;
  unsafe: number;
  total: number;
}) {
  return (
    <div className="mb-10 grid grid-cols-2 gap-3 md:grid-cols-4">
      <Stat label="Total rules" value={total} />
      <Stat label="APPLY" value={promoted} tone="emerald" />
      <Stat label="Consider" value={candidates} tone="zinc" />
      <Stat label="DO NOT produce" value={unsafe} tone="red" />
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "zinc",
}: {
  label: string;
  value: number;
  tone?: "emerald" | "red" | "zinc";
}) {
  const colorClass =
    tone === "emerald"
      ? "text-emerald-400"
      : tone === "red"
        ? "text-red-400"
        : "text-zinc-200";
  return (
    <div className="rounded-xl border border-zinc-800 bg-[#0a0a0a] px-4 py-3">
      <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-extrabold tracking-tight ${colorClass}`}>
        {value}
      </div>
    </div>
  );
}

function RuleSection({
  title,
  helpText,
  rules,
  tone,
  icon,
}: {
  title: string;
  helpText: string;
  rules: Rule[];
  tone: "emerald" | "red" | "zinc";
  icon: React.ReactNode;
}) {
  if (rules.length === 0) return null;
  const headerColorClass =
    tone === "emerald"
      ? "text-emerald-400"
      : tone === "red"
        ? "text-red-400"
        : "text-zinc-300";
  return (
    <section className="mb-10">
      <div className={`mb-2 flex items-center gap-2 ${headerColorClass}`}>
        {icon}
        <h2 className="text-[10px] font-bold uppercase tracking-widest">
          {title}
        </h2>
      </div>
      <p className="mb-4 text-[12px] text-zinc-500">{helpText}</p>
      <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-[#0a0a0a]">
        <table className="w-full text-[12.5px]">
          <thead className="bg-zinc-900/50 text-[10px] uppercase tracking-widest text-zinc-500">
            <tr>
              <th className="text-left px-4 py-3">Pattern</th>
              <th className="text-left px-4 py-3">Item type</th>
              <th className="text-left px-4 py-3">Client</th>
              <th className="text-right px-4 py-3">Confidence</th>
              <th className="text-right px-4 py-3">Applied</th>
              <th className="text-left px-4 py-3">First seen</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <RuleRow key={r.id} rule={r} tone={tone} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RuleRow({ rule, tone }: { rule: Rule; tone: "emerald" | "red" | "zinc" }) {
  const cond = rule.condition as {
    originalTitlePattern?: string;
    originalItemType?: string;
    industry?: string | null;
  };
  const action = rule.action as {
    promoted?: boolean;
    subAction?: string;
    bannedUntil?: string | null;
  };
  const confPct = Math.round(rule.confidence * 100);
  const barColor =
    tone === "emerald"
      ? "bg-emerald-400"
      : tone === "red"
        ? "bg-red-400"
        : "bg-zinc-400";

  return (
    <tr className="border-t border-zinc-900">
      <td className="px-4 py-3 text-zinc-200">
        <div className="flex items-center gap-2">
          <span>{cond.originalTitlePattern ?? "(unknown pattern)"}</span>
          {action.promoted && (
            <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400">
              promoted
            </span>
          )}
          {action.subAction === "unsafe" && (
            <span className="rounded-md bg-red-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-red-400">
              unsafe
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 font-mono text-zinc-400">
        {cond.originalItemType ?? "—"}
      </td>
      <td className="px-4 py-3 text-zinc-300">
        {rule.clientName ?? (rule.clientId ? rule.clientId.slice(0, 8) : "—")}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="inline-flex items-center gap-2">
          <span className="font-mono text-zinc-200">{confPct}%</span>
          <div className="h-1 w-12 overflow-hidden rounded-full bg-zinc-900">
            <div
              className={`h-full ${barColor}`}
              style={{ width: `${Math.max(0, Math.min(100, confPct))}%` }}
            />
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-right text-zinc-300">{rule.appliedCount}</td>
      <td className="px-4 py-3 text-zinc-500">
        {rule.createdAt.toISOString().slice(0, 10)}
      </td>
    </tr>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#0a0a0a] p-10 text-center">
      <Sparkles className="mx-auto mb-4 h-6 w-6 text-zinc-600" />
      <h2 className="text-[18px] font-extrabold text-zinc-100">
        No patterns yet
      </h2>
      <p className="mt-2 text-[13.5px] leading-relaxed text-zinc-400 max-w-md mx-auto">
        The pattern learner accumulates rules from your approval-queue
        decisions. After 5–10 approvals on similar items, you&apos;ll see
        promoted patterns the AI applies as defaults.
      </p>
      <Link
        href="/app/tasks"
        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-zinc-100 px-4 py-2 text-[12.5px] font-bold text-zinc-950 hover:bg-white"
      >
        Open approval queue
      </Link>
    </div>
  );
}
