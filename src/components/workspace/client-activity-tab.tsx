"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  Sparkles,
  CheckCircle2,
  FileText,
  Activity,
} from "lucide-react";
import { formatDateTime, formatDistance } from "@/lib/format-time";

interface TimelineEvent {
  id: string;
  kind:
    | "agent_run"
    | "approval_created"
    | "approval_reviewed"
    | "context_extracted"
    | "context_change"
    | "other";
  title: string;
  subtitle?: string;
  at: string;
  details?: unknown;
}

/**
 * Activity tab — per-client audit trail.
 *
 * Chronological merged feed of agent runs, approval-item lifecycle events,
 * and context changes. This is the surface that turns "AI did something
 * overnight" from a black box into a defendable record. CPAs ask for this
 * by name ("can I see the audit trail?") and it's a concrete answer to
 * their regulatory and client-trust concerns.
 */
export function ClientActivityTab({ clientId }: { clientId: string }) {
  const [events, setEvents] = useState<TimelineEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/clients/${clientId}/activity?limit=100`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { events: TimelineEvent[] };
        if (!cancelled) setEvents(data.events);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  if (events === null && error === null) {
    return (
      <div className="flex h-full items-center justify-center text-[12px] text-zinc-600">
        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
        Loading activity…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10 text-[13px] text-red-400">
        Couldn't load activity: {error}
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 py-20 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-zinc-500">
          <Activity className="h-4 w-4" />
        </div>
        <h3 className="mt-4 text-[15px] font-bold text-zinc-100">
          No activity yet
        </h3>
        <p className="mt-1 max-w-sm text-[12.5px] text-zinc-500">
          Once the agent runs or you add context, every action appears here —
          a permanent, timestamped record.
        </p>
      </div>
    );
  }

  // Group events by day for visual rhythm.
  const groups = groupByDay(events);

  return (
    <div className="h-full overflow-y-auto bg-[#050505]">
      <div className="mx-auto max-w-3xl px-10 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-[13px] font-bold uppercase tracking-widest text-zinc-500">
              Activity timeline
            </h2>
            <p className="mt-1 text-[12px] text-zinc-600">
              Every AI judgment, every human decision, time-stamped and
              searchable.
            </p>
          </div>
          <span className="text-[11px] text-zinc-600">
            {events.length} event{events.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.label}>
              <header className="mb-2 flex items-center gap-3">
                <h3 className="text-[10.5px] font-bold uppercase tracking-widest text-zinc-500">
                  {group.label}
                </h3>
                <div className="h-px flex-1 bg-zinc-900" />
                <span className="text-[10.5px] text-zinc-700">
                  {group.items.length} event{group.items.length === 1 ? "" : "s"}
                </span>
              </header>
              <ol className="relative ml-2 border-l border-zinc-900">
                {group.items.map((event) => (
                  <EventRow key={event.id} event={event} />
                ))}
              </ol>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

function EventRow({ event }: { event: TimelineEvent }) {
  const { icon, accent } = iconFor(event.kind);
  return (
    <li className="relative pb-5 pl-6 last:pb-0">
      <span
        className="absolute -left-[7px] top-1.5 flex h-3 w-3 items-center justify-center rounded-full border border-zinc-800 bg-[#050505]"
        style={{ boxShadow: `inset 0 0 0 2px ${accent}` }}
      />
      <div className="flex items-start gap-2">
        <span className="mt-0.5" style={{ color: accent }}>
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-[12.5px] font-medium text-zinc-100">
              {event.title}
            </span>
            <span
              className="text-[10.5px] text-zinc-600"
              title={formatDateTime(event.at)}
            >
              {formatDistance(event.at)}
            </span>
          </div>
          {event.subtitle && (
            <p className="mt-0.5 text-[11.5px] leading-relaxed text-zinc-500">
              {event.subtitle}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

function iconFor(kind: TimelineEvent["kind"]): {
  icon: React.ReactNode;
  accent: string;
} {
  switch (kind) {
    case "agent_run":
      return {
        icon: <Sparkles className="h-3.5 w-3.5" />,
        accent: "#3b82f6",
      };
    case "approval_created":
      return {
        icon: <FileText className="h-3.5 w-3.5" />,
        accent: "#a855f7",
      };
    case "approval_reviewed":
      return {
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
        accent: "#10b981",
      };
    case "context_extracted":
      return {
        icon: <Sparkles className="h-3.5 w-3.5" />,
        accent: "#06b6d4",
      };
    case "context_change":
      return {
        icon: <FileText className="h-3.5 w-3.5" />,
        accent: "#71717a",
      };
    default:
      return {
        icon: <Activity className="h-3.5 w-3.5" />,
        accent: "#71717a",
      };
  }
}

function groupByDay(
  events: TimelineEvent[],
): Array<{ label: string; items: TimelineEvent[] }> {
  const groups = new Map<string, TimelineEvent[]>();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  for (const e of events) {
    const d = new Date(e.at);
    d.setHours(0, 0, 0, 0);
    let label: string;
    if (d.getTime() === today.getTime()) label = "Today";
    else if (d.getTime() === yesterday.getTime()) label = "Yesterday";
    else
      label = d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year:
          d.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
      });
    const bucket = groups.get(label) ?? [];
    bucket.push(e);
    groups.set(label, bucket);
  }
  return [...groups.entries()].map(([label, items]) => ({ label, items }));
}
