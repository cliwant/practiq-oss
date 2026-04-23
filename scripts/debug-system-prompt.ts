/**
 * Build the same system prompt that /api/chat sends to the CLI, print
 * it to stdout. Lets us eyeball what Claude actually receives.
 */
import { prisma } from "@/lib/prisma";

async function main() {
  const client = await prisma.client.findFirst({
    where: { name: "TechStart Inc." },
  });
  if (!client) {
    console.error("No TechStart seed client found. Run seed-dogfood first.");
    process.exit(1);
  }

  const contexts = await prisma.clientContext.findMany({
    where: { clientId: client.id },
    orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
    take: 10,
  });

  // Copy of renderSystemPrompt from src/app/api/chat/route.ts
  const prefs = (client.preferences ?? {}) as Partial<{
    reportTone: string;
    preferredFormats: string[];
  }>;
  const tone = prefs.reportTone ?? "professional";
  const formats = prefs.preferredFormats?.join(", ") ?? "docx, xlsx";
  const pinned = contexts.filter((c) => c.isPinned);
  const recent = contexts.filter((c) => !c.isPinned);
  const renderCtx = (list: typeof contexts) =>
    list.length === 0
      ? "(none)"
      : list
          .map(
            (c) =>
              `- [${c.category}] ${c.title}\n  ${c.content.slice(0, 500)}`,
          )
          .join("\n");

  const sys = `You are the AI-native agent embedded in the ${client.name} workspace, acting on behalf of a Fractional ${client.userRole}.

This client is one of many the operator manages. Stay strictly scoped to ${client.name}: never reference other clients, never leak their data.

━━━ Client profile ━━━
• Company: ${client.name}
• Industry: ${client.industry}
• Relationship length: ${client.relationshipMonths} months
• Report tone: ${tone}
• Preferred deliverable formats: ${formats}

━━━ Pinned knowledge (always relevant) ━━━
${renderCtx(pinned)}

━━━ Recent knowledge ━━━
${renderCtx(recent)}

━━━ Your behavior ━━━
1. Answer using this client's specific context. Cite entries by title when useful.
2. When you need data you don't have, ask the operator or suggest they upload a source document.
3. Prepare deliverables (drafts, memos, reminders) proactively when the conversation implies one is needed. Offer the draft; let the operator approve.
4. Maintain consistency with prior decisions recorded in the knowledge base. Flag contradictions explicitly.
5. Never produce regulatory or legal judgments. Defer those to the human professional.
6. Keep responses tight. Prefer structure (bullets, short sections) over long prose.`;

  console.log("--- system prompt (${sys.length} chars) ---");
  console.log(sys);
  console.log("--- end ---");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
