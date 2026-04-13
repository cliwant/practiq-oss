"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Compass,
  Layers,
  Plug,
  HelpCircle,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { DOCS_SECTIONS } from "@/data/docs";

const sectionIcons: Record<string, typeof BookOpen> = {
  "getting-started": Compass,
  features: Layers,
  integrations: Plug,
  faq: HelpCircle,
};

export function DocsSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (sectionSlug: string, pageSlug: string) => {
    return pathname === `/docs/${sectionSlug}/${pageSlug}`;
  };

  const isSectionActive = (sectionSlug: string) => {
    return pathname?.startsWith(`/docs/${sectionSlug}`) ?? false;
  };

  return (
    <>
      {/* Mobile toggle — fixed under the top nav */}
      <div className="md:hidden sticky top-24 z-30 px-4 mb-4">
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-zinc-900/80 backdrop-blur border border-border-subtle text-sm text-zinc-200 hover:border-zinc-700 transition-colors"
          aria-expanded={mobileOpen}
          aria-controls="docs-sidebar-panel"
        >
          <span className="flex items-center gap-2 font-semibold">
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            <span>{mobileOpen ? "Close" : "Browse docs"}</span>
          </span>
          <ChevronRight
            className={`w-4 h-4 text-zinc-500 transition-transform ${
              mobileOpen ? "rotate-90" : ""
            }`}
          />
        </button>
      </div>

      {/* Sidebar — always visible on md+; collapsible on mobile */}
      <aside
        id="docs-sidebar-panel"
        className={`${
          mobileOpen ? "block" : "hidden"
        } md:block md:sticky md:top-32 md:self-start md:max-h-[calc(100vh-9rem)] md:overflow-y-auto scrollbar-thin w-full md:w-[260px] shrink-0 px-4 md:px-0 md:pr-4 pb-6`}
        aria-label="Documentation navigation"
      >
        <nav className="space-y-7">
          {DOCS_SECTIONS.map((section) => {
            const Icon = sectionIcons[section.slug] ?? BookOpen;
            const sectionActive = isSectionActive(section.slug);
            return (
              <div key={section.slug}>
                <div className="flex items-center gap-2 px-3 mb-2">
                  <Icon
                    className={`w-3.5 h-3.5 ${
                      sectionActive ? "text-zinc-300" : "text-zinc-600"
                    }`}
                  />
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                    {section.title}
                  </span>
                </div>
                <ul className="space-y-0.5">
                  {section.pages.map((page) => {
                    const active = isActive(section.slug, page.slug);
                    return (
                      <li key={page.slug}>
                        <Link
                          href={`/docs/${section.slug}/${page.slug}`}
                          onClick={() => setMobileOpen(false)}
                          className={`block px-3 py-2 rounded-lg text-sm leading-snug transition-colors ${
                            active
                              ? "bg-zinc-800 text-zinc-100"
                              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
                          }`}
                          aria-current={active ? "page" : undefined}
                        >
                          {page.title}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
