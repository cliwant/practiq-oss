"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  User as UserIcon,
  CreditCard,
  Zap,
  CheckCircle2,
  ExternalLink,
  Loader2,
  AlertTriangle,
  Users,
  Copy,
  Trash2,
  Send,
  Sparkles,
  Lock,
} from "lucide-react";
import {
  MODEL_CATALOG,
  DEFAULT_MODEL_ID,
  modelsForPlan,
  type ModelOption,
  type ModelPlanGate,
} from "@/lib/llm/models";

type Tab = "profile" | "billing" | "agent" | "team";

interface UserData {
  id: string;
  email: string;
  name: string | null;
  firmName: string | null;
  firmVertical: string | null;
  timezone: string;
  briefingEnabled: boolean;
  briefingHour: number;
  stripeCustomerId: string | null;
  preferredModel: string | null;
  createdAt: string;
}

interface Stats {
  clients: number;
  contexts: number;
  approvalItems: number;
  mtdChatCalls: number;
  mtdAgentRuns: number;
  mtdInputTokens: number;
  mtdOutputTokens: number;
}

interface SubscriptionData {
  plan: string;
  planName: string;
  status: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  seatCount: number;
}

interface Props {
  initialTab: Tab;
  checkoutSuccess: boolean;
  stripeConfigured: boolean;
  user: UserData;
  stats: Stats;
  subscription: SubscriptionData | null;
}

const VERTICALS = [
  { value: "accounting", label: "Accounting / Tax / Bookkeeping" },
  { value: "law", label: "Law" },
  { value: "consulting", label: "Consulting" },
  { value: "hr", label: "HR Advisory" },
  { value: "agency", label: "Marketing / Creative Agency" },
  { value: "advisory", label: "Financial Advisory" },
  { value: "other", label: "Other" },
];

// Common IANA timezones for the dropdown — not exhaustive, but covers
// the 10 timezones where ~95% of boutique professional-services firms
// actually operate. Advanced users can type directly when we upgrade
// to a combobox in Phase 2.
const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Toronto",
  "Europe/London",
  "Europe/Amsterdam",
  "Asia/Seoul",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Australia/Sydney",
  "UTC",
];

export function SettingsShell({
  initialTab,
  checkoutSuccess,
  stripeConfigured,
  user,
  stats,
  subscription,
}: Props) {
  const [tab, setTab] = useState<Tab>(initialTab);

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

        <header>
          <h1 className="text-[24px] font-extrabold tracking-tight text-zinc-100">
            Settings
          </h1>
          <p className="mt-1 text-[13px] text-zinc-500">
            {user.name ?? user.email}
          </p>
        </header>

        {checkoutSuccess && (
          <div className="mt-6 flex items-start gap-2 rounded-xl border border-emerald-900/50 bg-emerald-500/5 px-4 py-3 text-[12.5px] text-emerald-200">
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
            <div>
              <div className="font-semibold text-emerald-100">
                Subscription activated.
              </div>
              <div className="mt-0.5 text-emerald-300/80">
                Thanks — welcome aboard. Your next renewal details are below.
              </div>
            </div>
          </div>
        )}

        {/* Tab nav */}
        <nav className="mt-8 flex gap-1 border-b border-zinc-900">
          <TabButton
            id="profile"
            label="Profile"
            icon={<UserIcon className="h-3.5 w-3.5" />}
            active={tab === "profile"}
            onClick={() => setTab("profile")}
          />
          <TabButton
            id="billing"
            label="Billing"
            icon={<CreditCard className="h-3.5 w-3.5" />}
            active={tab === "billing"}
            onClick={() => setTab("billing")}
          />
          <TabButton
            id="agent"
            label="Agent"
            icon={<Zap className="h-3.5 w-3.5" />}
            active={tab === "agent"}
            onClick={() => setTab("agent")}
          />
          <TabButton
            id="team"
            label="Team"
            icon={<Users className="h-3.5 w-3.5" />}
            active={tab === "team"}
            onClick={() => setTab("team")}
          />
        </nav>

        <div className="mt-6">
          {tab === "profile" && <ProfileTab user={user} />}
          {tab === "billing" && (
            <BillingTab
              user={user}
              subscription={subscription}
              stats={stats}
              stripeConfigured={stripeConfigured}
            />
          )}
          {tab === "agent" && (
            <AgentTab user={user} stats={stats} subscription={subscription} />
          )}
          {tab === "team" && <TeamTab />}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  label,
  icon,
  active,
  onClick,
}: {
  id: Tab;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-[12.5px] font-semibold transition-all ${
        active
          ? "border-zinc-100 text-zinc-100"
          : "border-transparent text-zinc-500 hover:text-zinc-200"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ── Profile tab ─────────────────────────────────────────────

function ProfileTab({ user }: { user: UserData }) {
  const router = useRouter();
  const [name, setName] = useState(user.name ?? "");
  const [firmName, setFirmName] = useState(user.firmName ?? "");
  const [firmVertical, setFirmVertical] = useState(user.firmVertical ?? "");
  const [timezone, setTimezone] = useState(user.timezone);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = useMemo(
    () =>
      name !== (user.name ?? "") ||
      firmName !== (user.firmName ?? "") ||
      firmVertical !== (user.firmVertical ?? "") ||
      timezone !== user.timezone,
    [name, firmName, firmVertical, timezone, user],
  );

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          firmName,
          firmVertical,
          timezone,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `Save failed (${res.status})`);
        return;
      }
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-5">
      <Field label="Email" helper="Change this via support for now.">
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3.5 py-2.5 text-[13.5px] text-zinc-300">
          {user.email}
        </div>
      </Field>

      <Field label="Display name">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="block w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-[13.5px] text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700/40"
          placeholder="Jennifer Park"
        />
      </Field>

      <Field
        label="Firm name"
        helper="Shown in invoices, team invites, and invoice PDFs."
      >
        <input
          type="text"
          value={firmName}
          onChange={(e) => setFirmName(e.target.value)}
          className="block w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-[13.5px] text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700/40"
          placeholder="Park Accounting Group"
        />
      </Field>

      <Field label="Firm vertical">
        <select
          value={firmVertical}
          onChange={(e) => setFirmVertical(e.target.value)}
          className="block w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-[13.5px] text-zinc-100 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700/40"
          style={{ color: firmVertical ? undefined : "#71717a" }}
        >
          <option value="">— Select —</option>
          {VERTICALS.map((v) => (
            <option key={v.value} value={v.value}>
              {v.label}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="Timezone"
        helper="Determines when your nightly briefing runs."
      >
        <select
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="block w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-[13.5px] text-zinc-100 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700/40"
        >
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </Field>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-950 bg-red-500/5 px-3.5 py-2.5 text-[12.5px] text-red-300">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex items-center justify-end gap-3 border-t border-zinc-900 pt-5">
        {saved && (
          <span className="inline-flex items-center gap-1 text-[12px] text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" /> Saved
          </span>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || saving}
          className="inline-flex items-center gap-2 rounded-xl bg-zinc-100 px-5 py-2 text-[13px] font-semibold text-zinc-950 shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_8px_24px_-8px_rgba(255,255,255,0.2)] transition-all hover:shadow-[0_0_0_1px_rgba(255,255,255,0.15),0_12px_32px_-8px_rgba(255,255,255,0.3)] active:scale-[0.985] disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
            </>
          ) : (
            "Save changes"
          )}
        </button>
      </div>
    </section>
  );
}

// ── Billing tab ─────────────────────────────────────────────

function BillingTab({
  user,
  subscription,
  stats,
  stripeConfigured,
}: {
  user: UserData;
  subscription: SubscriptionData | null;
  stats: Stats;
  stripeConfigured: boolean;
}) {
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openPortal = async () => {
    setOpening(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `Portal failed (${res.status})`);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Network error opening billing portal.");
    } finally {
      setOpening(false);
    }
  };

  return (
    <section className="space-y-5">
      {/* Current plan */}
      <div className="rounded-2xl border border-zinc-900 bg-[#0a0a0a] p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              Current plan
            </div>
            <div className="mt-1.5 text-[18px] font-extrabold text-zinc-100">
              {subscription ? subscription.planName : "No active subscription"}
            </div>
            {subscription && (
              <div className="mt-1.5 flex items-center gap-2 text-[12px] text-zinc-500">
                <StatusPill status={subscription.status} />
                <span>
                  {subscription.cancelAtPeriodEnd ? "Cancels" : "Renews"}{" "}
                  {new Date(
                    subscription.currentPeriodEnd,
                  ).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
                <span>·</span>
                <span>
                  {subscription.seatCount} seat
                  {subscription.seatCount === 1 ? "" : "s"}
                </span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {!subscription && (
              <Link
                href="/pricing"
                className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-100 px-4 py-2 text-[12.5px] font-semibold text-zinc-950 hover:bg-white active:scale-[0.985]"
              >
                Pick a plan
              </Link>
            )}
            {user.stripeCustomerId && (
              <button
                type="button"
                onClick={openPortal}
                disabled={opening}
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-transparent px-4 py-2 text-[12.5px] font-semibold text-zinc-100 transition-all hover:border-zinc-500 hover:bg-zinc-900 active:scale-[0.985] disabled:opacity-50"
              >
                {opening ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    Manage in Stripe
                    <ExternalLink className="h-3 w-3" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {!stripeConfigured && (
          <div className="mt-4 rounded-lg border border-amber-900/40 bg-amber-500/5 px-3 py-2 text-[11.5px] text-amber-300">
            Billing isn&apos;t configured yet on this deployment. Contact your
            operator to set up Stripe.
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-950 bg-red-500/5 px-3 py-2 text-[12px] text-red-300">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Usage this month */}
      <div className="rounded-2xl border border-zinc-900 bg-[#0a0a0a] p-5">
        <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
          This month
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Chat calls" value={stats.mtdChatCalls} />
          <Stat label="Agent runs" value={stats.mtdAgentRuns} />
          <Stat
            label="Input tokens"
            value={stats.mtdInputTokens.toLocaleString()}
          />
          <Stat
            label="Output tokens"
            value={stats.mtdOutputTokens.toLocaleString()}
          />
        </div>
      </div>

      {/* Lifetime snapshot */}
      <div className="rounded-2xl border border-zinc-900 bg-[#0a0a0a] p-5">
        <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
          Workspace
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <Stat label="Clients" value={stats.clients} />
          <Stat label="Knowledge" value={stats.contexts} />
          <Stat label="Approvals" value={stats.approvalItems} />
        </div>
      </div>
    </section>
  );
}

function StatusPill({ status }: { status: string }) {
  const color =
    status === "active" || status === "trialing"
      ? "text-emerald-400 bg-emerald-500/10 border-emerald-900/50"
      : status === "past_due"
        ? "text-amber-400 bg-amber-500/10 border-amber-900/50"
        : "text-zinc-400 bg-zinc-800/50 border-zinc-800";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${color}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-zinc-900 bg-zinc-950/30 px-3 py-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
        {label}
      </div>
      <div className="mt-1 text-[18px] font-extrabold tabular-nums text-zinc-100">
        {value}
      </div>
    </div>
  );
}

// ── Agent tab ───────────────────────────────────────────────

function AgentTab({
  user,
  stats,
  subscription,
}: {
  user: UserData;
  stats: Stats;
  subscription: SubscriptionData | null;
}) {
  const router = useRouter();
  const [briefingEnabled, setBriefingEnabled] = useState(user.briefingEnabled);
  const [briefingHour, setBriefingHour] = useState(user.briefingHour);
  const [preferredModel, setPreferredModel] = useState<string>(
    user.preferredModel ?? DEFAULT_MODEL_ID,
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resolve the user's plan gate for the model picker. Trialing /
  // unsubscribed users are "free"; active paid subs use their tier.
  const planGate: ModelPlanGate =
    subscription &&
    (subscription.status === "active" || subscription.status === "trialing")
      ? ((subscription.plan as ModelPlanGate) ?? "free")
      : "free";

  const dirty = useMemo(
    () =>
      briefingEnabled !== user.briefingEnabled ||
      briefingHour !== user.briefingHour ||
      preferredModel !== (user.preferredModel ?? DEFAULT_MODEL_ID),
    [briefingEnabled, briefingHour, preferredModel, user],
  );

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          briefingEnabled,
          briefingHour,
          preferredModel,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `Save failed (${res.status})`);
        return;
      }
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const hourDisplay = `${briefingHour.toString().padStart(2, "0")}:00`;

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-zinc-900 bg-[#0a0a0a] p-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[14px] font-bold text-zinc-100">
              Nightly briefing
            </h2>
            <p className="mt-1 max-w-prose text-[12.5px] leading-relaxed text-zinc-500">
              Every night, Practiq scans every client workspace you own and
              prepares a morning digest of what needs your attention. You can
              pause it here; existing approvals stay visible either way.
            </p>
          </div>
          <Toggle
            checked={briefingEnabled}
            onChange={setBriefingEnabled}
            label="Enable nightly briefing"
          />
        </div>

        <div className="border-t border-zinc-900 pt-4">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-[12px] font-semibold text-zinc-300">
              Local run time
            </label>
            <span className="font-mono text-[13px] text-zinc-100">
              {hourDisplay}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={23}
            step={1}
            value={briefingHour}
            onChange={(e) => setBriefingHour(Number(e.target.value))}
            disabled={!briefingEnabled}
            className="w-full accent-zinc-100 disabled:opacity-50"
          />
          <div className="mt-1 flex justify-between text-[10px] text-zinc-600">
            <span>midnight</span>
            <span>6am</span>
            <span>noon</span>
            <span>6pm</span>
            <span>11pm</span>
          </div>
          <p className="mt-2 text-[11.5px] text-zinc-500">
            Briefings land about 30 minutes before this hour so they&apos;re
            ready when you open the app. Uses your profile timezone ({user.timezone}).
          </p>
        </div>
      </div>

      {/* Model picker — choose which underlying LLM Practiq routes to
          for this user's chats and agent runs. Free trial gets the
          fast tier only; paid plans unlock balanced + max tiers. The
          server-side PATCH validates plan gating again so a clever
          client can't bypass the lock. */}
      <div className="rounded-2xl border border-zinc-900 bg-[#0a0a0a] p-5">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-zinc-300">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div>
            <h2 className="text-[14px] font-bold text-zinc-100">
              Default model
            </h2>
            <p className="mt-1 max-w-prose text-[12.5px] leading-relaxed text-zinc-500">
              Pick the model that powers your chats, briefings, and agent
              runs. Faster models cost less and respond instantly; the
              max-tier handles complex multi-client synthesis. You can
              still switch per-conversation later.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {MODEL_CATALOG.map((option) => {
            const allowed = option.availableOnPlans.includes(planGate);
            const isSelected = preferredModel === option.id;
            return (
              <button
                key={option.id}
                type="button"
                disabled={!allowed}
                onClick={() => allowed && setPreferredModel(option.id)}
                className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                  isSelected
                    ? "border-emerald-500/50 bg-emerald-500/5"
                    : allowed
                      ? "border-zinc-800 bg-zinc-950/30 hover:border-zinc-700 hover:bg-zinc-900/50"
                      : "cursor-not-allowed border-zinc-900 bg-zinc-950/30 opacity-60"
                }`}
                aria-pressed={isSelected}
                aria-disabled={!allowed}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[13px] font-bold ${
                        isSelected ? "text-emerald-300" : "text-zinc-100"
                      }`}
                    >
                      {option.label}
                    </span>
                    <span className="rounded-md border border-zinc-800 bg-zinc-900/70 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                      {option.tier}
                    </span>
                    <span className="text-[11px] font-mono text-zinc-500">
                      {option.costClass}
                    </span>
                    {!allowed && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-amber-900/50 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-400">
                        <Lock className="h-2.5 w-2.5" /> Practice+
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-400" />
                  )}
                </div>
                <p className="mt-1 text-[11.5px] leading-relaxed text-zinc-500">
                  {option.tagline}
                </p>
              </button>
            );
          })}
        </div>

        {planGate === "free" && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-zinc-800 bg-zinc-950/40 px-3.5 py-2.5 text-[12px] text-zinc-400">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-400" />
            <span>
              Want Opus 4.1 for cross-client synthesis?{" "}
              <Link
                href="/pricing"
                className="font-semibold text-emerald-300 underline hover:text-emerald-200"
              >
                Upgrade to Practice
              </Link>{" "}
              — Founding Member tier locks $49/mo for life.
            </span>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-zinc-900 bg-[#0a0a0a] p-5">
        <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
          Activity — this month
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="Chats" value={stats.mtdChatCalls} />
          <Stat label="Agent runs" value={stats.mtdAgentRuns} />
          <Stat
            label="Tokens"
            value={(
              stats.mtdInputTokens + stats.mtdOutputTokens
            ).toLocaleString()}
          />
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-950 bg-red-500/5 px-3.5 py-2.5 text-[12.5px] text-red-300">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex items-center justify-end gap-3 border-t border-zinc-900 pt-5">
        {saved && (
          <span className="inline-flex items-center gap-1 text-[12px] text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" /> Saved
          </span>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || saving}
          className="inline-flex items-center gap-2 rounded-xl bg-zinc-100 px-5 py-2 text-[13px] font-semibold text-zinc-950 shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_8px_24px_-8px_rgba(255,255,255,0.2)] transition-all hover:shadow-[0_0_0_1px_rgba(255,255,255,0.15),0_12px_32px_-8px_rgba(255,255,255,0.3)] active:scale-[0.985] disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
            </>
          ) : (
            "Save changes"
          )}
        </button>
      </div>
    </section>
  );
}

// ── Shared UI bits ──────────────────────────────────────────

function Field({
  label,
  helper,
  children,
}: {
  label: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11.5px] font-semibold text-zinc-400">
        {label}
      </label>
      {children}
      {helper && (
        <p className="mt-1.5 text-[11px] text-zinc-600">{helper}</p>
      )}
    </div>
  );
}

// ── Team tab ────────────────────────────────────────────────

interface PendingInvite {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  expiresAt: string;
  token: string;
}

function TeamTab() {
  const [invites, setInvites] = useState<PendingInvite[] | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "viewer">("member");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUrl, setLastUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const refresh = async () => {
    try {
      const r = await fetch("/api/team/invites");
      if (r.ok) {
        const data = await r.json();
        setInvites(data.invites ?? []);
      } else {
        setInvites([]);
      }
    } catch {
      setInvites([]);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleInvite = async () => {
    if (!email.trim()) return;
    setSending(true);
    setError(null);
    setLastUrl(null);
    try {
      const res = await fetch("/api/team/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `Invite failed (${res.status})`);
        return;
      }
      setLastUrl(data.inviteUrl);
      setEmail("");
      refresh();
    } catch {
      setError("Network error.");
    } finally {
      setSending(false);
    }
  };

  const handleRevoke = async (id: string) => {
    await fetch(`/api/team/invites/${id}`, { method: "DELETE" });
    refresh();
  };

  const handleCopy = async () => {
    if (!lastUrl) return;
    try {
      await navigator.clipboard.writeText(lastUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <section className="space-y-5">
      {/* Invite form */}
      <div className="rounded-2xl border border-zinc-900 bg-[#0a0a0a] p-5">
        <h2 className="text-[14px] font-bold text-zinc-100">
          Invite a teammate
        </h2>
        <p className="mt-1 text-[12.5px] text-zinc-500">
          We&apos;ll generate a signup link scoped to your firm. Paste it in
          an email or Slack — automated invites via email ship next.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1.5 block text-[11.5px] font-semibold text-zinc-400">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@firm.com"
              className="block w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-[13.5px] text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700/40"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[11.5px] font-semibold text-zinc-400">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "member" | "viewer")}
              className="block w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-[13.5px] text-zinc-100 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700/40 sm:w-36"
            >
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          <button
            type="button"
            onClick={handleInvite}
            disabled={sending || !email.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-100 px-5 py-2.5 text-[13px] font-semibold text-zinc-950 shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_8px_24px_-8px_rgba(255,255,255,0.2)] transition-all hover:shadow-[0_0_0_1px_rgba(255,255,255,0.15),0_12px_32px_-8px_rgba(255,255,255,0.3)] active:scale-[0.985] disabled:opacity-50"
          >
            {sending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Invite
          </button>
        </div>

        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-950 bg-red-500/5 px-3 py-2 text-[12px] text-red-300">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {lastUrl && (
          <div className="mt-4 rounded-xl border border-emerald-900/50 bg-emerald-500/5 p-3">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              Invite created
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-lg bg-zinc-950 px-3 py-2 font-mono text-[11.5px] text-zinc-300">
                {lastUrl}
              </code>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-[11.5px] font-semibold text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="h-3 w-3 text-emerald-400" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" /> Copy
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Pending list */}
      <div className="rounded-2xl border border-zinc-900 bg-[#0a0a0a] p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[14px] font-bold text-zinc-100">
            Pending invites
          </h2>
          <span className="text-[11px] text-zinc-600">
            {invites === null ? "…" : `${invites.length} pending`}
          </span>
        </div>

        {invites === null ? (
          <div className="space-y-2">
            <div className="h-10 animate-pulse rounded-lg bg-zinc-900/60" />
            <div className="h-10 animate-pulse rounded-lg bg-zinc-900/60" />
          </div>
        ) : invites.length === 0 ? (
          <p className="text-[12.5px] text-zinc-500">
            No open invites. Invite someone above to get started.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-900">
            {invites.map((inv) => (
              <li
                key={inv.id}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-[13px] font-medium text-zinc-100">
                    <span className="truncate">{inv.email}</span>
                    <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-zinc-300">
                      {inv.role}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-zinc-500">
                    Expires{" "}
                    {new Date(inv.expiresAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRevoke(inv.id)}
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-[11.5px] font-semibold text-zinc-400 hover:border-red-900/50 hover:text-red-400"
                >
                  <Trash2 className="h-3 w-3" />
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
        checked ? "bg-emerald-500" : "bg-zinc-800"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
