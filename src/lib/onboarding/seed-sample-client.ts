/**
 * Sample-client seed library.
 *
 * On signup we drop a fully fleshed-out demo client into the new
 * workspace so the user immediately sees what Practiq actually looks
 * like with data — instead of staring at an empty checklist. Two
 * design constraints:
 *
 *  1. The data must be obviously sample data (banner + isSample flag
 *     in `client.preferences`) so the user trusts that nothing real
 *     leaked. Cleanup is a one-button affair via /api/onboarding/sample.
 *
 *  2. Every surface that's part of the AI-Native Agent loop must be
 *     populated: client profile, knowledge base entries (some pinned),
 *     a conversation, an `AgentTask` record (so the activity tab is
 *     non-empty), and approval items (so the morning Approval Queue
 *     has something to triage). Anything less and the new user can't
 *     see the shape of the product.
 *
 * Industry choice: Food & Beverage. It's vivid, the numbers are
 * interpretable without domain knowledge, and the workflows
 * (food cost variance, lease renewal, seasonal cash flow) translate
 * easily to the operator's mental model regardless of vertical
 * (accounting / law / consulting / hr / agency).
 */

import { prisma } from "@/lib/prisma";

const SAMPLE_BRAND_COLOR = "#8b5cf6"; // purple — distinct from any real client
const SAMPLE_NAME = "Acme Coffee Co";
const SAMPLE_INDUSTRY = "Food & Beverage";

interface SeedOptions {
  userId: string;
  /** Override "now" for deterministic tests. */
  now?: Date;
}

interface SeedResult {
  clientId: string;
  contextCount: number;
  approvalItemCount: number;
}

/**
 * Idempotent: if the user already has a sample client, returns its id
 * without creating a duplicate. Safe to call multiple times.
 */
export async function seedSampleClient(opts: SeedOptions): Promise<SeedResult> {
  const { userId } = opts;
  const now = opts.now ?? new Date();

  // Idempotency check — we tag every sample artifact with `isSample: true`
  // in the JSON `preferences` blob (or `content`/`details` for non-Client
  // models). A second call should return the existing client.
  const existing = await prisma.client.findFirst({
    where: {
      userId,
      preferences: { path: ["isSample"], equals: true },
    },
    select: { id: true },
  });
  if (existing) {
    const [contextCount, approvalItemCount] = await Promise.all([
      prisma.clientContext.count({ where: { clientId: existing.id } }),
      prisma.approvalItem.count({ where: { clientId: existing.id } }),
    ]);
    return { clientId: existing.id, contextCount, approvalItemCount };
  }

  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
  const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
  const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  // One transaction so a failure mid-seed leaves no orphaned rows.
  return prisma.$transaction(async (tx) => {
    const client = await tx.client.create({
      data: {
        userId,
        name: SAMPLE_NAME,
        industry: SAMPLE_INDUSTRY,
        userRole: "advisor",
        relationshipMonths: 14,
        preferences: {
          isSample: true,
          brandColor: SAMPLE_BRAND_COLOR,
          reportTone: "casual",
          contactEmail: "sarah@acmecoffee.example",
          contactName: "Sarah Chen",
          ownerNotes:
            "Sample client. Seeded automatically when you signed up so the workspace isn't empty. Remove via /app/settings → Account → 'Remove sample data'.",
        },
        createdAt: twoMonthsAgo,
        updatedAt: yesterday,
      },
      select: { id: true },
    });

    // ── Knowledge base seeds (8 entries) ──────────────────────────────
    //
    // Two pinned, six recent. Pinned go into the system prompt every
    // chat turn; recent are searched on demand. Categories cover the
    // five canonical kinds (decision/document/note/meeting_summary/metric)
    // so the Knowledge tab demonstrates the filtering UX.
    const contexts = [
      {
        title: "Owner communication style",
        content:
          "Sarah Chen prefers casual, data-driven emails. Numbers and ROI first; narrative second. She skims on mobile mid-morning, so lead with the headline metric and one specific recommendation.",
        category: "preference",
        tags: ["communication", "owner"],
        isPinned: true,
        createdAt: twoMonthsAgo,
      },
      {
        title: "Seasonal food-cost pattern",
        content:
          "Food cost runs +10-14% in March/April vs. baseline (24-month rolling analysis). Driven by spring catering inventory buildup. Expect normalization by mid-May. Don't flag unless variance exceeds 16%.",
        category: "metric",
        tags: ["food-cost", "seasonality"],
        isPinned: true,
        createdAt: fifteenDaysAgo,
      },
      {
        title: "2025 lease — Mission Street location",
        content:
          "Lease at 2418 Mission St runs through 2027-12-31. Base rent $4,200/mo, 3% annual escalator. Right of first refusal on adjacent suite (Sarah is interested for second location).",
        category: "document",
        tags: ["lease", "real-estate"],
        isPinned: false,
        createdAt: twoMonthsAgo,
      },
      {
        title: "Q1 2026 revenue",
        content:
          "Q1 2026 total revenue $432,000 (+12% YoY). January $138K, February $142K, March $152K. Wholesale-channel revenue grew 28%; retail flat.",
        category: "metric",
        tags: ["revenue", "quarterly"],
        isPinned: false,
        createdAt: fiveDaysAgo,
      },
      {
        title: "New appetizer menu launch — March 15",
        content:
          "Rolled out 4 new small-plate items on 3/15/26. Margin lower than core menu (24% vs. 31%) by design — driving alcohol attach rate. Monitor through end of Q2 before deciding to expand.",
        category: "note",
        tags: ["menu", "strategy"],
        isPinned: false,
        createdAt: fifteenDaysAgo,
      },
      {
        title: "Quarterly review — March 22",
        content:
          "Discussed equipment financing for second location. Sarah leaning toward operating lease ($1,800/mo, 5yr) over outright purchase ($82K, Section 179 eligible). Decision deferred to Q2 cash-flow review.",
        category: "meeting_summary",
        tags: ["quarterly-review", "financing"],
        isPinned: false,
        createdAt: fiveDaysAgo,
      },
      {
        title: "Onboarded as monthly bookkeeping client",
        content:
          "Engagement scope: monthly bookkeeping, quarterly tax estimates, year-end 1120-S preparation. Started 2025-02-01 via referral from Mission Coffee owner.",
        category: "decision",
        tags: ["engagement", "scope"],
        isPinned: false,
        createdAt: twoMonthsAgo,
      },
      {
        title: "Second location plan — target Q3 2026",
        content:
          "Sarah scouting Hayes Valley (~1,200 sqft). Targeting Q3 2026 open. Needs $180K capex (build-out, equipment, opening inventory). Financing TBD — see quarterly review notes.",
        category: "note",
        tags: ["expansion", "planning"],
        isPinned: false,
        createdAt: yesterday,
      },
    ];

    let contextCount = 0;
    for (const ctx of contexts) {
      await tx.clientContext.create({
        data: {
          clientId: client.id,
          title: ctx.title,
          content: ctx.content,
          category: ctx.category,
          tags: ctx.tags,
          isPinned: ctx.isPinned,
          createdBy: userId,
          createdAt: ctx.createdAt,
          updatedAt: ctx.createdAt,
        },
      });
      contextCount++;
    }

    // ── Conversation + messages (demonstrates client-aware chat) ──────
    //
    // Two-message exchange the user can scroll through to see how the
    // chat treats client knowledge. The assistant reply explicitly
    // references the seasonal pattern and new-menu contexts so the user
    // sees that the system prompt is doing its job.
    const conv = await tx.conversation.create({
      data: {
        clientId: client.id,
        userId,
        title: "Food cost spike — March",
        summary:
          "User asked about March food cost variance. Agent referenced seasonal pattern + new menu launch.",
        createdAt: fiveDaysAgo,
        updatedAt: fiveDaysAgo,
      },
      select: { id: true },
    });

    await tx.conversationMessage.createMany({
      data: [
        {
          conversationId: conv.id,
          role: "user",
          content: "Why did food cost jump in March? Should I be worried?",
          attachments: [],
          createdAt: new Date(fiveDaysAgo.getTime() + 0),
        },
        {
          conversationId: conv.id,
          role: "assistant",
          content: `Three factors stack up — and the spike is well within your client's normal pattern:

**1. Seasonal — expected (largest contributor)**
Food cost runs +10–14% in March/April every year (24-month rolling analysis). Spring catering inventory buildup. Should normalize by mid-May.

**2. New menu launch — by design**
The 4 new appetizers that rolled out 3/15 carry a 24% margin vs. 31% on the core menu. That's intentional — you priced them low to drive alcohol attach rate. Watch beverage revenue: if attach is up, the margin trade was correct.

**3. Wholesale channel growth**
Wholesale revenue is up 28% Q1 vs. flat retail. Wholesale food cost runs higher (volume discount, but no markup buffer), so a wholesale-heavy mix pulls the blended number up.

**Recommendation:** No action needed. Monitor April; if April normalizes <16% variance, this is the seasonal pattern your client expects. I've added "monitor April food cost vs. seasonal pattern" to next month's briefing automatically.`,
          attachments: [],
          createdAt: new Date(fiveDaysAgo.getTime() + 6500),
        },
      ],
    });

    // ── Agent task record (so /app/clients/[id] Activity tab is non-empty) ─
    const briefingTask = await tx.agentTask.create({
      data: {
        clientId: client.id,
        userId,
        agentType: "daily_briefing",
        status: "completed",
        input: { trigger: "scheduled" },
        output: {
          summary: [
            "Q1 closed +12% YoY at $432K — wholesale (+28%) carried the quarter; retail was flat.",
            "March food cost variance is +12% vs. baseline. Within your seasonal pattern (+10-14% expected). No action.",
            "Sarah deferred the equipment-financing decision to next quarterly review. Operating lease vs. Section 179 purchase still open.",
          ],
          actions: [
            {
              title: "Confirm $8,500 supplier invoice SUP-2847",
              reason:
                "Coffee bean wholesaler invoice posted 3/27 is 4× the typical Tuesday spend ($2,100 avg). Looks like a quarterly bulk reorder but no PO yet. One-call confirmation.",
              priority: "medium",
              dueHint: "this week",
              confidence: 0.86,
            },
          ],
          watch: [
            {
              topic: "April food-cost variance",
              note: "Should drop back into baseline range. If still >12% by 4/30 we re-investigate suppliers.",
            },
          ],
          confidence: 0.87,
        },
        summary: "1 action surfaced. Confidence 87%.",
        confidence: 0.87,
        startedAt: new Date(yesterday.getTime() - 4500),
        completedAt: yesterday,
        createdAt: new Date(yesterday.getTime() - 4500),
      },
      select: { id: true },
    });

    // ── Approval items (briefing + 1 action) ──────────────────────────
    //
    // Both link back to the agent task above so the audit trail is
    // intact. The briefing is low-priority (always present); the
    // action is medium so it floats above the briefing in the home
    // "What the agent surfaced" digest.
    await tx.approvalItem.createMany({
      data: [
        {
          clientId: client.id,
          userId,
          agentTaskId: briefingTask.id,
          type: "briefing",
          title: `Morning briefing — ${SAMPLE_NAME}`,
          status: "pending_review",
          priority: 17, // low * confidence
          aiConfidence: 0.87,
          content: {
            summary: [
              "Q1 closed +12% YoY at $432K — wholesale (+28%) carried the quarter; retail was flat.",
              "March food cost variance is +12% vs. baseline. Within your seasonal pattern (+10-14% expected). No action.",
              "Sarah deferred the equipment-financing decision to next quarterly review.",
            ],
            watch: [
              {
                topic: "April food-cost variance",
                note: "Should drop back into baseline range. If still >12% by 4/30 we re-investigate suppliers.",
              },
            ],
            isSample: true,
          },
          aiNotes:
            "Q1 closed +12% YoY at $432K — wholesale (+28%) carried the quarter; retail was flat.\n• March food cost variance is +12% vs. baseline. Within your seasonal pattern (+10-14% expected). No action.\n• Sarah deferred the equipment-financing decision to next quarterly review.",
          createdAt: yesterday,
          updatedAt: yesterday,
        },
        {
          clientId: client.id,
          userId,
          agentTaskId: briefingTask.id,
          type: "action",
          title: "Confirm $8,500 supplier invoice SUP-2847",
          status: "pending_review",
          priority: 43, // medium * 0.86 confidence
          aiConfidence: 0.86,
          content: {
            action: "Confirm $8,500 supplier invoice SUP-2847",
            reason:
              "Coffee bean wholesaler invoice posted 3/27 is 4× the typical Tuesday spend ($2,100 avg). Looks like a quarterly bulk reorder but no PO yet. One-call confirmation.",
            dueHint: "this week",
            isSample: true,
          },
          aiNotes:
            "Coffee bean wholesaler invoice posted 3/27 is 4× the typical Tuesday spend ($2,100 avg). Looks like a quarterly bulk reorder but no PO yet. One-call confirmation.",
          createdAt: yesterday,
          updatedAt: yesterday,
        },
      ],
    });

    // ── Audit log ─────────────────────────────────────────────────────
    await tx.auditLog.create({
      data: {
        clientId: client.id,
        userId,
        agentType: "daily_briefing",
        action: "agent_run_completed",
        details: {
          taskId: briefingTask.id,
          actionsSurfaced: 1,
          confidence: 0.87,
          isSample: true,
        },
        createdAt: yesterday,
      },
    });

    return {
      clientId: client.id,
      contextCount,
      approvalItemCount: 2,
    };
  });
}

/**
 * Detect whether the user has any sample client. Used by the dashboard
 * banner. Cheap — single indexed query.
 */
export async function findSampleClientId(userId: string): Promise<string | null> {
  const c = await prisma.client.findFirst({
    where: {
      userId,
      preferences: { path: ["isSample"], equals: true },
    },
    select: { id: true },
  });
  return c?.id ?? null;
}

/**
 * Cascade-delete the user's sample client (and everything attached:
 * contexts, conversations, messages, agent tasks, approval items,
 * audit log entries scoped to the client). Idempotent: returns false
 * if there's no sample to remove. Returns true if it deleted.
 *
 * NB: AuditLog rows are NOT cascade-deleted by Prisma (Audit is meant
 * to be retained even after the related rows go away). We delete the
 * sample-tagged audit entries explicitly to keep the user's compliance
 * log clean of seeded data.
 */
export async function removeSampleClient(userId: string): Promise<boolean> {
  const id = await findSampleClientId(userId);
  if (!id) return false;

  // Delete in the right order to avoid FK violations on the audit_logs
  // rows (which don't cascade-delete with Client).
  await prisma.$transaction([
    prisma.auditLog.deleteMany({
      where: {
        userId,
        clientId: id,
        details: { path: ["isSample"], equals: true },
      },
    }),
    prisma.client.delete({ where: { id } }),
  ]);
  return true;
}
