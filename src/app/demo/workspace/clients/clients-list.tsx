"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { ClientAvatar } from "@/components/workspace/client-avatar";
import { trackClient } from "@/lib/analytics/track-client";
import { formatCurrency, type SampleClient } from "@/data/demo-workspace";

const SECTOR_LABEL: Record<SampleClient["sector"], string> = {
  restaurants: "Restaurants",
  service: "Service",
  "real-estate": "Real estate",
  professional: "Professional",
  other: "Other",
};

export function DemoClientsList({ clients }: { clients: SampleClient[] }) {
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState<SampleClient["sector"] | "all">("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients.filter((c) => {
      if (sector !== "all" && c.sector !== sector) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.industry.toLowerCase().includes(q) ||
        c.entityType.toLowerCase().includes(q)
      );
    });
  }, [clients, query, sector]);

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex flex-1 items-center">
          <Search
            className="pointer-events-none absolute left-3 h-4 w-4 text-zinc-500"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="Search 50 sample clients..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search sample clients"
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 py-2.5 pl-10 pr-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
          />
        </label>
        <div className="flex flex-wrap items-center gap-1.5">
          <SectorPill
            label="All"
            active={sector === "all"}
            onClick={() => setSector("all")}
          />
          {(Object.keys(SECTOR_LABEL) as SampleClient["sector"][]).map((s) => (
            <SectorPill
              key={s}
              label={SECTOR_LABEL[s]}
              active={sector === s}
              onClick={() => setSector(s)}
            />
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-[#0a0a0a]">
        <div className="grid grid-cols-12 border-b border-zinc-900 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
          <div className="col-span-5">Client</div>
          <div className="col-span-3 hidden sm:block">Industry</div>
          <div className="col-span-2">Entity</div>
          <div className="col-span-2 hidden sm:block text-right">Monthly rev.</div>
        </div>
        <ul className="divide-y divide-zinc-900">
          {filtered.map((c) => (
            <li key={c.id}>
              <Link
                href={`/demo/workspace/clients/${c.id}`}
                onClick={() => {
                  trackClient({
                    type: "demo_workspace_interaction",
                    properties: {
                      surface: "clients_list",
                      action: "client_click",
                      target_id: c.id,
                    },
                  });
                }}
                className="grid grid-cols-12 items-center gap-2 px-4 py-3 transition-colors hover:bg-zinc-900/60"
              >
                <div className="col-span-5 flex items-center gap-3 min-w-0">
                  <ClientAvatar name={c.name} color={c.color} size={28} />
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium text-zinc-100">
                      {c.name}
                      {c.anomaly && (
                        <span
                          className="ml-2 inline-block rounded-md bg-amber-500/15 px-1.5 py-0.5 align-middle text-[10px] font-bold uppercase tracking-widest text-amber-300"
                          title={c.anomaly.headline}
                        >
                          Flag
                        </span>
                      )}
                    </div>
                    <div className="truncate text-[11px] text-zinc-500 sm:hidden">
                      {c.industry} · {formatCurrency(c.monthlyRevenue)}/mo
                    </div>
                  </div>
                </div>
                <div className="col-span-3 hidden truncate text-[12px] text-zinc-400 sm:block">
                  {c.industry}
                </div>
                <div className="col-span-2 text-[11.5px] text-zinc-400">
                  {c.entityType}
                </div>
                <div className="col-span-2 hidden text-right font-mono text-[12px] text-zinc-300 sm:block">
                  {formatCurrency(c.monthlyRevenue)}
                </div>
              </Link>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-4 py-12 text-center text-sm text-zinc-500">
              No matching sample clients.
            </li>
          )}
        </ul>
      </div>
      <p className="mt-3 text-[11px] text-zinc-500">
        Showing {filtered.length} of {clients.length} fictional clients.
      </p>
    </>
  );
}

function SectorPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-md border px-2.5 py-1 text-[11.5px] font-medium transition-colors ${
        active
          ? "border-zinc-600 bg-zinc-800 text-zinc-100"
          : "border-zinc-800 bg-zinc-900/30 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
      }`}
    >
      {label}
    </button>
  );
}
