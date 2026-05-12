"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackClient } from "@/lib/analytics/track-client";

/**
 * Fires a $pageview tagged with landing_slug=demo-workspace so the
 * demo-workspace funnel is visible separately from the rest of the
 * site in /admin/analytics.
 *
 * Mounted once per demo-workspace route via the shell. We tag the
 * sub-page identifier from the pathname so each surface (dashboard,
 * client detail, approval queue) is queryable on its own.
 */
export function DemoWorkspaceTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    const sub = subPageId(pathname);
    trackClient({
      type: "$pageview",
      properties: {
        landing_slug: "demo-workspace",
        demo_workspace_surface: sub,
      },
    });
  }, [pathname]);

  return null;
}

function subPageId(pathname: string): string {
  if (pathname === "/demo/workspace") return "dashboard";
  if (pathname === "/demo/workspace/clients") return "clients_list";
  if (pathname.startsWith("/demo/workspace/clients/"))
    return "client_detail";
  if (pathname === "/demo/workspace/approval-queue")
    return "approval_queue";
  return "other";
}
