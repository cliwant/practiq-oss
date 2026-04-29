import { prisma } from "@/lib/prisma";
(async () => {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const rows = await prisma.agentTask.groupBy({
    by: ["agentType", "status"],
    where: { createdAt: { gte: since } },
    _count: { _all: true },
    _max: { createdAt: true },
  });
  console.log("agent_tasks last 24h grouped by (agentType, status):");
  for (const r of rows) {
    console.log(`  ${String(r.agentType).padEnd(20)} ${String(r.status).padEnd(12)} count=${r._count._all} latest=${r._max.createdAt?.toISOString()}`);
  }
  await prisma.$disconnect();
})();
