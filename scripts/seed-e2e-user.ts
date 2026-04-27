/**
 * Idempotent fixture for the authenticated E2E suite.
 *
 * Creates (or updates) the deterministic users/clients/contexts/approvals
 * the Playwright tests in tests/e2e/auth-chat-flow.spec.ts,
 * plan-gates.spec.ts, and pattern-learner.spec.ts assume exist.
 *
 * Three users are seeded so the plan-gate tests can hit real plan rows
 * instead of mocking the gate:
 *
 *   E2E_TEST_EMAIL          (free trial — used by auth-chat-flow + pattern-
 *                            learner; the most-exercised fixture)
 *   E2E_FREE_EMAIL          (free trial — used for free-plan ceiling tests)
 *   E2E_SOLO_EMAIL          (Solo paid plan — 30-client ceiling test)
 *
 * The "test" user gets:
 *   - one client "Park CPA Group — E2E Test" (industry "accounting")
 *   - three ClientContext rows (1 pinned, 2 recent)
 *   - one pending_review ApprovalItem of type "briefing"
 *
 * All env vars have sensible fallbacks so the script runs without
 * needing the operator to remember the exact names; Playwright reads
 * the same fallbacks so the contract holds end-to-end.
 *
 * Usage:
 *   npx dotenv -e ../../.env.local -- tsx scripts/seed-e2e-user.ts
 *
 * Re-running the script is safe — every step is upsert-shaped.
 */
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

interface SeedUserPlan {
  email: string;
  password: string;
  /** Stable UUID so the test user id is identical across CI runs. */
  userId?: string;
  /** "free" = no Subscription row. "solo"/"practice"/"firm" = Subscription seeded. */
  plan: "free" | "solo" | "practice" | "firm";
  displayName: string;
  firmName: string;
}

const FALLBACK_TEST_EMAIL = "e2e@practiq.dev";
const FALLBACK_TEST_PASSWORD = "Practiq-E2E-2026!";
const FALLBACK_TEST_USER_ID = "e2e00000-0000-4000-8000-000000000001";

const FALLBACK_FREE_EMAIL = "e2e-free@practiq.dev";
const FALLBACK_FREE_PASSWORD = "Practiq-E2E-Free-2026!";
const FALLBACK_FREE_USER_ID = "e2e00000-0000-4000-8000-000000000002";

const FALLBACK_SOLO_EMAIL = "e2e-solo@practiq.dev";
const FALLBACK_SOLO_PASSWORD = "Practiq-E2E-Solo-2026!";
const FALLBACK_SOLO_USER_ID = "e2e00000-0000-4000-8000-000000000003";

const PLANS_TO_SEED: SeedUserPlan[] = [
  {
    email: process.env.E2E_TEST_EMAIL ?? FALLBACK_TEST_EMAIL,
    password: process.env.E2E_TEST_PASSWORD ?? FALLBACK_TEST_PASSWORD,
    userId: process.env.E2E_TEST_USER_ID ?? FALLBACK_TEST_USER_ID,
    plan: "free",
    displayName: "Park CPA Group",
    firmName: "Park CPA Group",
  },
  {
    email: process.env.E2E_FREE_EMAIL ?? FALLBACK_FREE_EMAIL,
    password: process.env.E2E_FREE_PASSWORD ?? FALLBACK_FREE_PASSWORD,
    userId: process.env.E2E_FREE_USER_ID ?? FALLBACK_FREE_USER_ID,
    plan: "free",
    displayName: "Free Tier Tester",
    firmName: "Free Tier Test Firm",
  },
  {
    email: process.env.E2E_SOLO_EMAIL ?? FALLBACK_SOLO_EMAIL,
    password: process.env.E2E_SOLO_PASSWORD ?? FALLBACK_SOLO_PASSWORD,
    userId: process.env.E2E_SOLO_USER_ID ?? FALLBACK_SOLO_USER_ID,
    plan: "solo",
    displayName: "Solo Plan Tester",
    firmName: "Solo Test Firm",
  },
];

async function upsertUser(spec: SeedUserPlan) {
  const passwordHash = await bcrypt.hash(spec.password, 10);

  // Use upsert keyed on email (which is @unique). When the row exists we
  // refresh the password hash so a rotated env var reseeds cleanly; when
  // it does not exist we honor the optional fixed userId so the test
  // suite can hard-code id values where it needs to.
  const existing = await prisma.user.findUnique({
    where: { email: spec.email },
  });

  if (existing) {
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        passwordHash,
        name: spec.displayName,
        firmName: spec.firmName,
        // Backfill emailVerified so the credentials provider doesn't gate
        // the login on email confirmation when verification is optional.
        emailVerified: existing.emailVerified ?? new Date(),
      },
    });
    return updated;
  }

  const created = await prisma.user.create({
    data: {
      ...(spec.userId ? { id: spec.userId } : {}),
      email: spec.email,
      passwordHash,
      name: spec.displayName,
      firmName: spec.firmName,
      emailVerified: new Date(),
    },
  });
  return created;
}

/**
 * Seed (or refresh) the Subscription row for paid-plan users. Free-plan
 * users have NO Subscription row — their plan-gate path falls through to
 * the trial-window check. We never attach a real Stripe customer/sub id;
 * the Practiq plan gates only need `status` and `plan` to resolve, and
 * `stripeSubscriptionId` is a synthetic uuid prefixed with "test_" so a
 * webhook firing against this row is impossible.
 */
async function ensureSubscription(userId: string, plan: SeedUserPlan["plan"]) {
  if (plan === "free") {
    // Make sure no leftover paid sub from a prior run still resolves.
    await prisma.subscription.deleteMany({ where: { userId } });
    return;
  }

  const now = new Date();
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const fakeStripeId = `test_sub_${userId.slice(0, 8)}`;
  const fakePriceId = `test_price_${plan}`;

  const existing = await prisma.subscription.findFirst({
    where: { userId },
  });
  if (existing) {
    await prisma.subscription.update({
      where: { id: existing.id },
      data: {
        plan,
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        seatCount: 1,
      },
    });
    return;
  }
  await prisma.subscription.create({
    data: {
      userId,
      stripeSubscriptionId: fakeStripeId,
      stripePriceId: fakePriceId,
      plan,
      status: "active",
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      seatCount: 1,
    },
  });
}

/**
 * Seed the canonical "Park CPA Group — E2E Test" client + 3 contexts on
 * the test user. Idempotent: re-running drops and rebuilds the contexts
 * so the test suite always sees the exact 3-row fixture it expects.
 */
async function ensureFixtureClient(userId: string) {
  const name = "Park CPA Group — E2E Test";
  let client = await prisma.client.findFirst({
    where: { userId, name },
  });
  if (!client) {
    client = await prisma.client.create({
      data: {
        userId,
        name,
        industry: "accounting",
        userRole: "CPA",
        relationshipMonths: 12,
        preferences: {
          reportTone: "casual",
          preferredFormats: ["xlsx", "docx"],
          contactEmail: "fixture@example.com",
        },
      },
    });
  } else {
    client = await prisma.client.update({
      where: { id: client.id },
      data: {
        industry: "accounting",
        userRole: "CPA",
        relationshipMonths: 12,
      },
    });
  }

  await prisma.clientContext.deleteMany({ where: { clientId: client.id } });

  await prisma.clientContext.create({
    data: {
      clientId: client.id,
      title: "Client profile",
      content:
        "E2E fixture client. Single-location boutique accounting firm. Owner prefers concise reports with explicit numbers.",
      category: "note",
      tags: ["profile", "pinned"],
      isPinned: true,
      createdBy: userId,
    },
  });
  await prisma.clientContext.create({
    data: {
      clientId: client.id,
      title: "Recent meeting summary",
      content:
        "March review: revenue tracking +6% YoY, A/R trending down. No outstanding compliance items. Next quarterly tax planning session scheduled in May.",
      category: "meeting_summary",
      tags: ["recent"],
      isPinned: false,
      createdBy: userId,
    },
  });
  await prisma.clientContext.create({
    data: {
      clientId: client.id,
      title: "Latest financial snapshot",
      content:
        "Revenue $42K MoM. COGS 27%. Labor 31%. Net margin 18%. Cash on hand $58K. A/R $11K (none past due).",
      category: "metric",
      tags: ["recent", "march-2026"],
      isPinned: false,
      createdBy: userId,
    },
  });

  return client;
}

/**
 * Wipe + reseed the canonical pending briefing approval item used by the
 * authenticated approval-queue E2E test. Re-running the seed always
 * leaves exactly ONE pending_review row of this title behind.
 */
async function ensureFixtureApproval(userId: string, clientId: string) {
  await prisma.approvalItem.deleteMany({
    where: {
      userId,
      clientId,
      title: { startsWith: "E2E briefing fixture" },
    },
  });
  return prisma.approvalItem.create({
    data: {
      userId,
      clientId,
      type: "briefing",
      title: "E2E briefing fixture — March review",
      status: "pending_review",
      priority: 50,
      aiConfidence: 0.92,
      content: {
        summary:
          "Revenue +6% YoY · COGS holding · no outstanding compliance items.",
        bulletPoints: [
          "Revenue +6% YoY — margin healthy.",
          "A/R aging clean.",
          "Schedule Q2 tax planning before May 15.",
        ],
      },
      aiNotes:
        "Synthetic briefing seeded for E2E coverage. Operator should approve to validate the queue PATCH path.",
    },
  });
}

async function main() {
  console.log(`[e2e-seed] users to provision: ${PLANS_TO_SEED.length}`);

  for (const spec of PLANS_TO_SEED) {
    const user = await upsertUser(spec);
    await ensureSubscription(user.id, spec.plan);
    console.log(
      `[e2e-seed]   ${spec.email} (${user.id}) plan=${spec.plan} ✓`,
    );

    // Only the primary test user gets the rich fixture (client + contexts +
    // approval). The free + solo accounts are intentionally bare so the
    // plan-gate tests can verify ceiling-from-zero behavior.
    if (spec.email === (process.env.E2E_TEST_EMAIL ?? FALLBACK_TEST_EMAIL)) {
      const client = await ensureFixtureClient(user.id);
      const approval = await ensureFixtureApproval(user.id, client.id);
      console.log(
        `[e2e-seed]     fixture client=${client.id} approval=${approval.id}`,
      );
    }
  }

  console.log(`[e2e-seed] done.`);
}

main()
  .catch((err) => {
    console.error("[e2e-seed] failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    // Singleton prisma — let the process exit drain the pool naturally.
  });
