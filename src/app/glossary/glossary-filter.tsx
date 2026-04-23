"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  VERTICAL_LABELS,
  type GlossaryVertical,
} from "@/data/glossary/terms";

interface FilterableTerm {
  slug: string;
  term: string;
  shortDefinition: string;
  vertical: GlossaryVertical;
}

interface Props {
  terms: FilterableTerm[];
}

const FILTERS: Array<{ key: "all" | GlossaryVertical; label: string }> = [
  { key: "all", label: "All" },
  { key: "accounting", label: VERTICAL_LABELS.accounting },
  { key: "law", label: VERTICAL_LABELS.law },
  { key: "hr", label: VERTICAL_LABELS.hr },
  { key: "consulting", label: VERTICAL_LABELS.consulting },
  { key: "agency", label: VERTICAL_LABELS.agency },
  { key: "cross", label: VERTICAL_LABELS.cross },
];

export function GlossaryFilter({ terms }: Props) {
  const [active, setActive] = useState<"all" | GlossaryVertical>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return terms.filter((t) => {
      if (active !== "all" && t.vertical !== active) return false;
      if (!q) return true;
      return (
        t.term.toLowerCase().includes(q) ||
        t.shortDefinition.toLowerCase().includes(q)
      );
    });
  }, [terms, active, query]);

  const isFiltering = active !== "all" || query.trim().length > 0;

  return (
    <div className="bento-card p-6">
      {/* Search box */}
      <div className="relative mb-5">
        <Search className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search terms or definitions…"
          className="input-premium w-full pl-11 pr-4 py-3 text-sm"
          aria-label="Search glossary terms"
        />
      </div>

      {/* Vertical filter buttons */}
      <div className="flex flex-wrap gap-2 mb-5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setActive(f.key)}
            className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-colors ${
              active === f.key
                ? "bg-zinc-100 text-zinc-950"
                : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Filtered results — shown only when actively filtering */}
      {isFiltering ? (
        <>
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-4">
            {filtered.length} {filtered.length === 1 ? "term" : "terms"}
          </p>
          {filtered.length === 0 ? (
            <p className="text-sm text-zinc-500 py-6 text-center">
              No terms match your filter. Try a different keyword or category.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filtered.map((t) => (
                <Link
                  key={t.slug}
                  href={`/glossary/${t.slug}`}
                  className="rounded-lg border border-zinc-800 bg-[#0a0a0a] p-4 hover:border-zinc-600 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="text-sm font-bold text-zinc-100">{t.term}</p>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 shrink-0">
                      {VERTICAL_LABELS[t.vertical]}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
                    {t.shortDefinition}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </>
      ) : (
        <p className="text-xs text-zinc-500">
          Browse all {terms.length} terms below by vertical, or type to filter.
        </p>
      )}
    </div>
  );
}
