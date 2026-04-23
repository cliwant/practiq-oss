import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";

/**
 * The real product workspace. Session-guarded; anything under /app requires
 * an authenticated user. The shell provides the left icon rail, the client
 * list, and a Cmd+K command palette. Children render into the main pane.
 *
 * We load the full client list server-side on every nav (edge-cached
 * separately per userId) — it's small (usually <50 entries) and using a
 * server component keeps the list consistent with the DB without any client
 * cache churn.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?next=/app");
  }

  const clients = await prisma.client.findMany({
    where: { userId: session.user.id },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      industry: true,
      preferences: true,
      updatedAt: true,
    },
  });

  // Normalize the brand color out of the JSON preferences blob so the UI
  // doesn't have to re-parse per render. Default is an accent matching the
  // client's industry hue, picked deterministically so the same client
  // always gets the same color even without explicit branding.
  const normalized = clients.map((c) => {
    const prefs = (c.preferences ?? {}) as { brandColor?: string };
    const color = prefs.brandColor ?? industryColor(c.industry);
    return {
      id: c.id,
      name: c.name,
      industry: c.industry,
      color,
      updatedAt: c.updatedAt.toISOString(),
    };
  });

  // Pending approval count — drives the notification badge on the icon
  // rail so the operator sees it regardless of which tab they're on.
  const pendingCount = await prisma.approvalItem.count({
    where: { userId: session.user.id, status: "pending_review" },
  });

  return (
    <WorkspaceShell
      user={{ name: session.user.name ?? session.user.email ?? "Operator", email: session.user.email ?? "" }}
      clients={normalized}
      pendingCount={pendingCount}
    >
      {children}
    </WorkspaceShell>
  );
}

function industryColor(industry: string): string {
  const table: Record<string, string> = {
    "Food & Beverage": "#f97316", // orange
    SaaS: "#2563eb", // blue
    Healthcare: "#10b981", // emerald
    "Real Estate": "#a855f7", // purple
    Retail: "#f43f5e", // rose
    Manufacturing: "#eab308", // amber
    Services: "#06b6d4", // cyan
    Legal: "#7c3aed", // violet
    Consulting: "#0ea5e9", // sky
  };
  if (table[industry]) return table[industry];

  // Stable hash fallback — same name → same hue.
  let hash = 0;
  for (let i = 0; i < industry.length; i++) {
    hash = (hash * 31 + industry.charCodeAt(i)) | 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 70% 55%)`;
}
