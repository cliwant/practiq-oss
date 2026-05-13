/**
 * KeyTakeaways — RUN 22 (AEO/GEO Phase 2).
 *
 * Standalone summary block rendered above the post body. Per Averi
 * data, summary blocks at the top get quoted directly +30-40% more
 * often than synthesized prose. We pair this with `Article.abstract`
 * in the JSON-LD so both the rendered HTML and the structured data
 * carry the same standalone summary.
 *
 * Visual style: dark surface card with bullet list. Sits above the
 * fold so a glance-and-go reader gets the gist; stays narrow so it
 * doesn't overwhelm the body. Honors the dashboard's zinc dark
 * palette (per DESIGN.md).
 */
import { Sparkles } from "lucide-react";

interface KeyTakeawaysProps {
  takeaways: string[];
}

export function KeyTakeaways({ takeaways }: KeyTakeawaysProps) {
  if (!takeaways || takeaways.length === 0) return null;
  return (
    <aside
      // semantic <aside> + role=note so screen readers + AI crawlers
      // know this is a non-essential complementary summary.
      role="note"
      aria-label="Key takeaways"
      className="my-8 rounded-2xl border border-zinc-800 bg-[#0a0a0a] p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-emerald-400" aria-hidden />
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
          Key takeaways
        </span>
      </div>
      <ul className="space-y-2 text-[14px] leading-relaxed text-zinc-200">
        {takeaways.map((t, i) => (
          <li key={i} className="flex gap-3">
            <span className="font-mono text-zinc-400 select-none" aria-hidden="true">
              {String(i + 1).padStart(2, "0")}.
            </span>
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
