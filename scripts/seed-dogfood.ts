/**
 * Seed three diverse mock clients for dogfood testing.
 *
 * Creates (or upserts onto an existing user):
 *   - Kim's Restaurant — Food & Beverage, casual tone
 *   - TechStart Inc. — SaaS startup, growth-focused tone
 *   - Downtown Medical — Healthcare practice, formal tone
 *
 * Each client gets 3-5 ClientContext entries (pinned profile,
 * recent financials, preferences, a decision log).
 *
 * Usage:
 *   DOGFOOD_EMAIL=you@example.com \
 *   DOGFOOD_PASSWORD=hunter2 \
 *   npx dotenv -e ../../.env.local -- tsx scripts/seed-dogfood.ts
 *
 * If DOGFOOD_EMAIL already exists, we reuse that user. Otherwise we
 * create one with the given password. Idempotent for clients too:
 * reruns upsert by (userId, name).
 */
// Prisma 7 generated client lives under src/generated, so the script uses
// the same singleton the app uses to avoid spinning up a second connection.
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

interface SeedContext {
  title: string;
  content: string;
  category: "decision" | "document" | "note" | "meeting_summary" | "metric";
  tags?: string[];
  isPinned?: boolean;
}

interface SeedClient {
  name: string;
  industry: string;
  userRole: string;
  relationshipMonths: number;
  preferences: {
    reportTone: "formal" | "casual" | "technical";
    preferredFormats: ("docx" | "xlsx" | "pptx" | "pdf")[];
    brandColor?: string;
    contactEmail?: string;
  };
  contexts: SeedContext[];
}

const CLIENTS: SeedClient[] = [
  {
    name: "Kim's Restaurant",
    industry: "Food & Beverage",
    userRole: "CPA",
    relationshipMonths: 18,
    preferences: {
      reportTone: "casual",
      preferredFormats: ["xlsx", "docx"],
      brandColor: "#f97316",
      contactEmail: "kim@kimrestaurant.com",
    },
    contexts: [
      {
        title: "Client profile",
        content:
          "Kim's Restaurant — Korean BBQ concept, 8 employees, single location in Midtown. Owner Kim Lee is hands-on, prefers direct casual communication and numbers over narrative. Peak season May-Sep (patio) and Dec (holiday catering).",
        category: "note",
        tags: ["profile", "pinned"],
        isPinned: true,
      },
      {
        title: "Owner communication style",
        content:
          "Casual and direct. Short email preferred. Always lead with the number, then the implication. Do not use finance jargon without defining it.",
        category: "decision",
        tags: ["preference", "pinned"],
        isPinned: true,
      },
      {
        title: "March 2026 snapshot",
        content:
          "Revenue $28.4K (+12% MoM). COGS 31.2% of sales (industry avg 28-30% — slight watch). Labor 32.4%. Net margin 14.6%. Cash on hand $42K. A/R $8.5K (one $2.2K invoice 30+ days). A/P $6.2K (one supplier 45 days past due — address this week).",
        category: "metric",
        tags: ["financial", "march-2026"],
      },
      {
        title: "Supplier issue log",
        content:
          "2026-03-15: new protein supplier (Midwest Meats) invoiced at 15% above prior vendor. Kim agreed temporarily due to quality. Revisit in May after summer menu test.",
        category: "decision",
        tags: ["suppliers", "cost-watch"],
      },
      {
        title: "Seasonal food-cost pattern",
        content:
          "Historical 24-month data: food cost climbs 10-14% every March-April due to bulk pre-season ordering. Returns to baseline by June. Flag only if variance persists >8 weeks.",
        category: "metric",
        tags: ["seasonality"],
      },
    ],
  },
  {
    name: "TechStart Inc.",
    industry: "SaaS",
    userRole: "CPA",
    relationshipMonths: 9,
    preferences: {
      reportTone: "technical",
      preferredFormats: ["xlsx", "pptx"],
      brandColor: "#2563eb",
      contactEmail: "founders@techstart.io",
    },
    contexts: [
      {
        title: "Client profile",
        content:
          "TechStart Inc. — Series Seed B2B SaaS, 12 employees, Delaware C-Corp. Two founders, CEO is investor-facing (growth narrative), CTO is numbers-driven. Monthly investor update due last business day of each month.",
        category: "note",
        tags: ["profile", "pinned"],
        isPinned: true,
      },
      {
        title: "Investor reporting template",
        content:
          "Monthly update must include: MRR / ARR, net new logos, logo churn %, gross margin, burn, runway (months), CAC payback. Leave a sentence of commentary per metric — investors skim. Company uses Stripe + Mercury; deferred revenue is recognized straight-line over contract term.",
        category: "decision",
        tags: ["format", "pinned"],
        isPinned: true,
      },
      {
        title: "March 2026 snapshot",
        content:
          "MRR $145K (+$8.2K MoM, 6% growth). 24 paying customers. ARR $1.74M. Gross margin 72%. Burn $28.4K/month (down $600 from Feb). Cash on hand $352K. Runway 12.4 months. Churn 2.1% (one downgrade from Enterprise to Pro).",
        category: "metric",
        tags: ["financial", "march-2026"],
      },
      {
        title: "Stripe reconciliation note",
        content:
          "2026-03-01 $4,200 Stripe payout appears in QB on 3/1 but bank hasn't cleared — pending status on bank feed. Normal Stripe 2-day delay plus weekend. Not an anomaly. If still outstanding after 5 business days, escalate.",
        category: "decision",
        tags: ["reconciliation"],
      },
      {
        title: "Series A timing discussion",
        content:
          "Founders targeting Series A pitch in Q3 2026. Wants financial model with 3x and 5x burn scenarios. I should prepare the model ahead of time once Q2 actuals are in (early July).",
        category: "meeting_summary",
        tags: ["fundraise", "roadmap"],
      },
    ],
  },
  {
    name: "Downtown Medical",
    industry: "Healthcare",
    userRole: "CPA",
    relationshipMonths: 24,
    preferences: {
      reportTone: "formal",
      preferredFormats: ["docx", "pdf"],
      brandColor: "#10b981",
      contactEmail: "admin@downtownmed.com",
    },
    contexts: [
      {
        title: "Client profile",
        content:
          "Downtown Medical — private practice, PLLC with 3 physicians (Chen, Williams, Patel) and 5 support staff. Average 450 patient visits/month. Dr. Chen is Managing Partner and primary accounting contact; reviews reports personally and expects formal language. Multiple insurance payers — Blue Shield is largest (~35% of collections).",
        category: "note",
        tags: ["profile", "pinned"],
        isPinned: true,
      },
      {
        title: "Reporting preferences",
        content:
          "Formal tone. Full sentences, no emojis. Include a one-paragraph executive summary. Dr. Chen specifically wants per-provider revenue breakdown every month and insurance claim aging by payer. PDF preferred for final distribution; .docx for editable drafts.",
        category: "decision",
        tags: ["preference", "pinned"],
        isPinned: true,
      },
      {
        title: "March 2026 snapshot",
        content:
          "Total collections $92.4K (+8% MoM). Net income $28.6K (30.9% margin). 451 visits (avg revenue/visit $205). A/R days outstanding 32 (improved from 35). Insurance payment share 68%, patient payment share 32%. Self-pay collection rate 70% — below 85% target.",
        category: "metric",
        tags: ["financial", "march-2026"],
      },
      {
        title: "Provider productivity",
        content:
          "Dr. Chen: 168 visits, avg charge $185, collection rate 94%. Dr. Williams: 158 visits, avg charge $192, collection rate 89%. Dr. Patel: 125 visits, avg charge $210, collection rate 96% — highest. Dr. Chen considering expanding Dr. Patel's hours.",
        category: "metric",
        tags: ["per-provider"],
      },
      {
        title: "Lease renewal pending",
        content:
          "2026-03-02 meeting: current lease $8,500/month expires 2026-12-31. Landlord proposing $9,400 (11% increase). Dr. Chen wants to negotiate down to $9,000 citing 3-year tenancy and on-time payment history. Target sign by Sep 2026 to avoid rushed decision.",
        category: "meeting_summary",
        tags: ["lease", "decision-pending"],
      },
    ],
  },
];

async function main() {
  const email = process.env.DOGFOOD_EMAIL;
  const password = process.env.DOGFOOD_PASSWORD;
  if (!email) throw new Error("DOGFOOD_EMAIL env var is required");
  if (!password) throw new Error("DOGFOOD_PASSWORD env var is required");

  // The greeting in /app reads the user's `name` field, which leaks into
  // the public landing-page screenshot at public/images/dashboard-preview.png.
  // Override DEMO_DISPLAY_NAME / DEMO_FIRM_NAME if you want a different
  // greeting; the defaults are picked to look like a real boutique CPA
  // firm partner so the marketing screenshot reads naturally.
  const displayName = process.env.DEMO_DISPLAY_NAME ?? "Park CPA Group";
  const firmName = process.env.DEMO_FIRM_NAME ?? "Park CPA Group";

  console.log(`[seed] target user: ${email}`);

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const passwordHash = await bcrypt.hash(password, 10);
    user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: displayName,
        firmName,
      },
    });
    console.log(`[seed] created new user (${user.id})`);
  } else {
    // Existing user — make sure name + firmName are set to the
    // professional placeholders so the screenshot regenerator picks
    // them up. Won't overwrite if the user already has non-default
    // values (e.g. operator manually set them).
    const needsUpdate =
      !user.name || user.name === email.split("@")[0] || user.name === "Dogfood";
    if (needsUpdate) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: displayName,
          firmName: user.firmName ?? firmName,
        },
      });
      console.log(`[seed] renamed user → ${displayName} / ${firmName}`);
    } else {
      console.log(`[seed] reusing existing user (${user.id})`);
    }
  }

  for (const spec of CLIENTS) {
    // Upsert by (userId, name). Prisma doesn't have a composite unique on
    // Client so we find-then-update or create manually.
    let client = await prisma.client.findFirst({
      where: { userId: user.id, name: spec.name },
    });

    if (!client) {
      client = await prisma.client.create({
        data: {
          userId: user.id,
          name: spec.name,
          industry: spec.industry,
          userRole: spec.userRole,
          relationshipMonths: spec.relationshipMonths,
          preferences: spec.preferences,
        },
      });
      console.log(`[seed] created client: ${client.name} (${client.id})`);
    } else {
      client = await prisma.client.update({
        where: { id: client.id },
        data: {
          industry: spec.industry,
          userRole: spec.userRole,
          relationshipMonths: spec.relationshipMonths,
          preferences: spec.preferences,
        },
      });
      console.log(`[seed] updated client: ${client.name} (${client.id})`);
    }

    // Wipe and recreate contexts so seed reruns give a consistent fixture.
    // createdBy is a FK to User — use the operator's own id so contexts
    // look like they were authored by the user doing the dogfood.
    await prisma.clientContext.deleteMany({ where: { clientId: client.id } });
    for (const ctx of spec.contexts) {
      await prisma.clientContext.create({
        data: {
          clientId: client.id,
          title: ctx.title,
          content: ctx.content,
          category: ctx.category,
          tags: ctx.tags ?? [],
          isPinned: ctx.isPinned ?? false,
          createdBy: user.id,
        },
      });
    }
    console.log(
      `[seed]   seeded ${spec.contexts.length} contexts for ${client.name}`,
    );
  }

  const totals = await prisma.client.count({ where: { userId: user.id } });
  const ctxTotals = await prisma.clientContext.count({
    where: { client: { userId: user.id } },
  });
  console.log(
    `\n[seed] done. ${totals} clients / ${ctxTotals} contexts for ${email}`,
  );
}

main()
  .catch((err) => {
    console.error("[seed] failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    // Prisma singleton is fine to leave attached when the script exits —
    // Node will tear the pool down. Keeps behavior identical to runtime.
  });
