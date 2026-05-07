import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BUILTIN_WORKFLOWS } from "@/lib/workflows/builtin";
import { WorkflowsScreen } from "@/components/workspace/workflows-screen";

export const dynamic = "force-dynamic";

/**
 * /app/workflows — vertical workflow gallery.
 *
 * Cards for each workflow in BUILTIN_WORKFLOWS. Clicking "Start" picks a
 * client (radio list of the operator's clients), POSTs to
 * /api/workflows/{slug}/run, and redirects into the per-client chat with
 * the seeded conversation.
 */
export default async function WorkflowsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?next=/app/workflows");
  }

  const clients = await prisma.client.findMany({
    where: { userId: session.user.id },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      industry: true,
    },
  });

  return (
    <WorkflowsScreen
      workflows={BUILTIN_WORKFLOWS}
      clients={clients}
    />
  );
}
