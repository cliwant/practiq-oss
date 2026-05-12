import Link from "next/link";

// /admin — index of admin tools. Auth is handled in middleware.
//
// Historically this redirected straight to /admin/crawler. With the
// blog CMS landing 2026-05-12 the operator needs a navigable home, so
// we surface the most common tools here and let them pick.
const TOOLS: Array<{ href: string; title: string; description: string }> = [
  {
    href: "/admin/blog",
    title: "Blog",
    description:
      "Author, edit, and publish posts via the rich-text editor without a redeploy. Code-managed legacy posts continue to live in src/data/blog/posts/.",
  },
  {
    href: "/admin/signups",
    title: "Signups",
    description: "Waitlist + newsletter subscribers with UTM and trend breakdowns.",
  },
  {
    href: "/admin/crawler",
    title: "Crawler",
    description: "AI crawler activity, top pages, and indexation health.",
  },
  {
    href: "/admin/analytics",
    title: "Analytics",
    description: "Self-hosted product analytics, funnels, and cohorts.",
  },
  {
    href: "/admin/analytics/tools-funnel",
    title: "Tools funnel",
    description:
      "Workflow audit · AI policy generator · demo workspace — per-topic conversion, by vertical, SNS attribution, recent LLM submissions.",
  },
  {
    href: "/admin/funnels",
    title: "Funnels",
    description: "Conversion paths from landing to checkout.",
  },
  {
    href: "/admin/journeys",
    title: "Journeys",
    description: "Per-visitor session replay across the marketing site.",
  },
  {
    href: "/admin/search-console",
    title: "Search Console",
    description: "GSC impressions, clicks, and rankings.",
  },
  {
    href: "/admin/cohorts",
    title: "Cohorts",
    description: "Retention and behaviour cohort analysis.",
  },
  {
    href: "/admin/agent-metrics",
    title: "Agent metrics",
    description: "AI agent execution health and cost.",
  },
  {
    href: "/admin/spend-calibration",
    title: "Spend calibration",
    description: "Per-plan token allowances vs realized usage.",
  },
];

export default function AdminIndex() {
  return (
    <div className="max-w-6xl mx-auto py-12 px-6">
      <header className="mb-10">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-2">
          Operator console
        </p>
        <h1 className="text-3xl md:text-4xl font-black text-zinc-100 tracking-tight mb-3">
          Admin
        </h1>
        <p className="text-zinc-400 max-w-xl text-sm">
          Pick a tool below. Authentication is enforced at the edge — only
          listed admin emails can see this page.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TOOLS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="bento-card p-6 hover:border-zinc-600 transition-colors group"
          >
            <div className="text-lg font-bold text-zinc-100 mb-2 group-hover:text-white transition-colors">
              {t.title}
            </div>
            <div className="text-xs text-zinc-500 leading-relaxed">
              {t.description}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
