/**
 * One-shot: rename the dashboard-screenshot demo user from "Dogfood"
 * to a professional placeholder so the landing-page hero image reads
 * as "Good afternoon, Park CPA Group." instead of "Good afternoon,
 * Dogfood."
 *
 * The dogfood@practiq.dev account is the dummy login that
 * scripts/regen-dashboard-preview.mjs uses. Renaming the row's
 * `name` (which the greeting reads) is enough — no ID change, no
 * downstream coupling.
 *
 * Run:  npx dotenv -e ../../.env.local -- npx tsx scripts/rename-demo-user.ts
 */
import { prisma } from "@/lib/prisma";

const DEMO_EMAIL = process.env.DOGFOOD_EMAIL ?? "dogfood@practiq.dev";
const DEMO_NAME = "Park CPA Group";
const DEMO_FIRM = "Park CPA Group";

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: DEMO_EMAIL },
    select: { id: true, email: true, name: true, firmName: true },
  });
  if (!user) {
    console.error(`× No user found with email: ${DEMO_EMAIL}`);
    process.exit(1);
  }
  console.log("Before:", user);

  const updated = await prisma.user.update({
    where: { email: DEMO_EMAIL },
    data: {
      name: DEMO_NAME,
      firmName: DEMO_FIRM,
    },
    select: { id: true, email: true, name: true, firmName: true },
  });
  console.log("After: ", updated);
  console.log(
    "\nNext step: re-run the screenshot generator against production:\n" +
      `  BASE_URL=https://practiq.dev \\\n` +
      `  DOGFOOD_EMAIL=${DEMO_EMAIL} \\\n` +
      `  DOGFOOD_PASSWORD=… \\\n` +
      `  npx dotenv -e ../../.env.local -- node scripts/regen-dashboard-preview.mjs`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
