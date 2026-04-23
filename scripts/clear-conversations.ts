/**
 * Wipe all Conversation + ConversationMessage rows for the dogfood user.
 * Only affects test seed data. Idempotent.
 */
import { prisma } from "@/lib/prisma";

async function main() {
  const email = process.env.DOGFOOD_EMAIL ?? "dogfood@practiq.dev";
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`user ${email} not found`);
    process.exit(1);
  }
  // Messages cascade via the Conversation onDelete: Cascade relation.
  const del = await prisma.conversation.deleteMany({
    where: { userId: user.id },
  });
  console.log(`[clear] deleted ${del.count} conversations (+ cascaded messages)`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
