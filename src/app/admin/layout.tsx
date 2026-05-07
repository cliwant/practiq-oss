import type { Metadata } from "next";
import Link from "next/link";
import { LogOut, BarChart3, Bot, Search, LineChart, Activity, Route, Filter, Users } from "lucide-react";

export const metadata: Metadata = {
  title: "Practiq Admin",
  robots: { index: false, follow: false, nocache: true, noarchive: true, nosnippet: true, noimageindex: true },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg-base">
      {/* Admin top bar — minimal, non-public navigation */}
      <header className="border-b border-zinc-800 bg-[#0a0a0a]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              href="/admin/crawler"
              className="flex items-center gap-3 group"
            >
              <div className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center">
                <span className="text-sm font-black text-zinc-950 tracking-tight">P</span>
              </div>
              <span className="text-sm font-bold text-zinc-200 group-hover:text-zinc-100">
                Practiq Admin
              </span>
            </Link>

            <nav className="hidden sm:flex items-center gap-1 ml-4">
              <NavLink href="/admin/crawler" icon={<Bot className="w-3.5 h-3.5" />}>
                Crawlers
              </NavLink>
              <NavLink href="/admin/signups" icon={<BarChart3 className="w-3.5 h-3.5" />}>
                Signups
              </NavLink>
              <NavLink href="/admin/search-console" icon={<Search className="w-3.5 h-3.5" />}>
                Search Console
              </NavLink>
              <NavLink href="/admin/analytics" icon={<LineChart className="w-3.5 h-3.5" />}>
                Analytics
              </NavLink>
              <NavLink href="/admin/agent-metrics" icon={<Activity className="w-3.5 h-3.5" />}>
                Agents
              </NavLink>
              <NavLink href="/admin/journeys" icon={<Route className="w-3.5 h-3.5" />}>
                Journeys
              </NavLink>
              <NavLink href="/admin/funnels" icon={<Filter className="w-3.5 h-3.5" />}>
                Funnels
              </NavLink>
              <NavLink href="/admin/cohorts" icon={<Users className="w-3.5 h-3.5" />}>
                Cohorts
              </NavLink>
            </nav>
          </div>

          <Link
            href="/admin/logout"
            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </Link>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}

function NavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors"
    >
      {icon}
      {children}
    </Link>
  );
}
