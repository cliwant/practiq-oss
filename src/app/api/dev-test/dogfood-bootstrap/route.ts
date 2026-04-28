/**
 * POST /api/dev-test/dogfood-bootstrap — RUN 12.
 *
 * One-shot bootstrap of the dogfood demo state on the live database.
 * Creates (or updates) the dogfood user + 3 sample clients +
 * per-client ClientContext rows that produce a screenshot-worthy
 * /app surface. Idempotent: re-running upserts the same rows.
 *
 * Why this exists as an endpoint and not just a script: ARM64
 * Windows + pg-pool's SASL mechanism flakily rejects the production
 * DATABASE_URL during script-side connections (`SASL: client
 * password must be a string`). Production-side execution sidesteps
 * the issue because Vercel runs Linux x64 with a clean pg-pool
 * config. So we POST this from the dev box and let production do
 * the actual writes.
 *
 * Auth: gated on `BOOTSTRAP_SECRET` env var (header `X-Bootstrap-
 * Secret`). Returns 401 when the secret is missing or wrong.
 *
 * The seed data lives inline (no `scripts/seed-dogfood.ts` import
 * because that script's `prisma` import via `@/lib/prisma` already
 * brings in the same code path). We embed a *minimal* shape — the
 * fuller seed-dogfood script can layer additional contexts on top
 * later.
 */
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface SampleContext {
  title: string;
  content: string;
  category: string;
  tags?: string[];
  isPinned?: boolean;
}

interface SampleClient {
  name: string;
  industry: string;
  userRole: string;
  relationshipMonths: number;
  preferences: Record<string, unknown>;
  contexts: SampleContext[];
}

const SAMPLE_CLIENTS: SampleClient[] = [
  {
    name: "Kim's Restaurant",
    industry: "Food & Beverage",
    userRole: "fractional CFO",
    relationshipMonths: 18,
    preferences: {
      reportTone: "casual",
      preferredFormats: ["docx", "xlsx"],
      brandColor: "#f97316",
      contactEmail: "kim@kimrestaurant.example",
      primaryContactRole: "owner",
      note:
        "Owner reads in 5 minutes; lead with the number. Loves YoY comparisons.",
    },
    contexts: [
      {
        title: "Owner communication style",
        category: "preference",
        isPinned: true,
        content:
          "Casual + direct. Owner skims first, asks questions later. Lead every report with the headline number, not the methodology.",
      },
      {
        title: "Seasonal food-cost pattern",
        category: "metric",
        isPinned: true,
        content:
          "Food cost ratio rises 10–14% during March/April every year (analysed 2 years of P&L). Tied to spring catering inventory build + premium-protein menu rotation. Treat as expected unless variance > 18%.",
      },
      {
        title: "March 2026 monthly close",
        category: "decision",
        content:
          "Closed 4/3/2026. Revenue $145K (+8% MoM). Food cost 31.2% — flagged but accepted (matches seasonal pattern). Net margin 32%. Owner approved on 4/4 via portal.",
      },
      {
        title: "April supplier negotiation",
        category: "note",
        content:
          "Owner asked Jennifer to follow up with the new ingredient supplier on bulk discount tiers — promised 8% savings on >$5K orders. Need to schedule call before May close.",
      },
    ],
  },
  {
    name: "TechStart Inc.",
    industry: "SaaS",
    userRole: "fractional CFO",
    relationshipMonths: 9,
    preferences: {
      reportTone: "growth-focused",
      preferredFormats: ["xlsx", "pptx"],
      brandColor: "#2563eb",
      contactEmail: "ceo@techstart.example",
      primaryContactRole: "CEO",
      note:
        "CEO is investor-facing — every report should produce a board-deck-ready slide.",
    },
    contexts: [
      {
        title: "Runway & burn",
        category: "metric",
        isPinned: true,
        content:
          "MRR $145K, burn rate $28.4K/month, runway 12.4 months. Targeting Series A close in Q3 2026 — keep at least 6mo cushion before bridge.",
      },
      {
        title: "Series A readiness",
        category: "strategic",
        isPinned: true,
        content:
          "Investor-deck shape requested by CEO weekly. Track ARR / GRR / NRR / CAC payback / churn. Cohort analyses by signup quarter.",
      },
      {
        title: "March 2026 financial dashboard",
        category: "document",
        content:
          "MRR $145K (+$8.2K MoM). Customer count 24 (+2). Burn $28.4K (-$600 MoM). Runway extended to 12.4mo. Sent 4/2.",
      },
    ],
  },
  {
    name: "Downtown Medical",
    industry: "Healthcare",
    userRole: "fractional CFO",
    relationshipMonths: 24,
    preferences: {
      reportTone: "formal",
      preferredFormats: ["docx", "pdf"],
      brandColor: "#10b981",
      contactEmail: "billing@downtownmed.example",
      primaryContactRole: "practice_administrator",
      note: "Insurance-first practice. A/R aging is the metric they wake up to.",
    },
    contexts: [
      {
        title: "Insurance payer mix",
        category: "metric",
        isPinned: true,
        content:
          "Blue Shield 38%, Aetna 24%, Medicare 21%, self-pay 11%, Medicaid 6%. Self-pay collection rate 70% (industry standard 75-85%) — flagged.",
      },
      {
        title: "Provider productivity (March 2026)",
        category: "metric",
        content:
          "Dr. Chen 168 visits @ $185 avg (94% collection). Dr. Williams 158 @ $192 (89%). Dr. Patel 125 @ $210 (96%). Patel highest margin; consider extended hours.",
      },
      {
        title: "Q2 2026 lease renewal",
        category: "decision",
        content:
          "Current lease $12K/mo, expires 12/31/27. Practice admin opened renewal talks early — landlord proposed 8% bump. Negotiating to 4% with 5yr lock.",
      },
    ],
  },
];

export async function POST(request: NextRequest) {
  const expected = (process.env.BOOTSTRAP_SECRET ?? "").trim();
  if (!expected) {
    return NextResponse.json(
      { error: "BOOTSTRAP_SECRET not configured on the server" },
      { status: 503 },
    );
  }
  const provided = request.headers.get("x-bootstrap-secret") ?? "";
  if (provided.length === 0 || provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = (process.env.DOGFOOD_EMAIL ?? "dogfood@practiq.dev").trim();
  const password =
    (process.env.DOGFOOD_PASSWORD ?? "").trim() || "Dogfood-Practiq-2026";

  // Upsert user.
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name: "Park CPA Group (dogfood)",
      passwordHash,
      emailVerified: new Date(),
    },
    update: {
      passwordHash,
      emailVerified: new Date(),
    },
    select: { id: true, email: true },
  });

  // Upsert clients + contexts.
  const summaries: Array<{
    name: string;
    clientId: string;
    contextCount: number;
  }> = [];
  for (const sc of SAMPLE_CLIENTS) {
    // Find by (userId, name) — we don't have a unique index there so
    // findFirst + create/update.
    const existing = await prisma.client.findFirst({
      where: { userId: user.id, name: sc.name },
      select: { id: true },
    });
    let clientId: string;
    if (existing) {
      const updated = await prisma.client.update({
        where: { id: existing.id },
        data: {
          industry: sc.industry,
          userRole: sc.userRole,
          relationshipMonths: sc.relationshipMonths,
          preferences: sc.preferences as object,
        },
        select: { id: true },
      });
      clientId = updated.id;
    } else {
      const created = await prisma.client.create({
        data: {
          userId: user.id,
          name: sc.name,
          industry: sc.industry,
          userRole: sc.userRole,
          relationshipMonths: sc.relationshipMonths,
          preferences: sc.preferences as object,
        },
        select: { id: true },
      });
      clientId = created.id;
    }

    // Upsert contexts: delete-and-rewrite so the seed is idempotent and
    // re-running picks up content edits made in this file.
    await prisma.clientContext.deleteMany({
      where: {
        clientId,
        category: { in: ["preference", "metric", "decision", "note", "document", "strategic"] },
        title: { in: sc.contexts.map((c) => c.title) },
      },
    });
    for (const c of sc.contexts) {
      await prisma.clientContext.create({
        data: {
          clientId,
          createdBy: user.id,
          title: c.title,
          content: c.content,
          category: c.category,
          tags: c.tags ?? [],
          isPinned: c.isPinned ?? false,
        },
      });
    }
    summaries.push({
      name: sc.name,
      clientId,
      contextCount: sc.contexts.length,
    });
  }

  // Seed at least one ApprovalItem so the queue isn't empty in the
  // captured screenshot. Only seed if there are no pending items
  // already — the operator may have hand-curated a richer queue.
  const pendingCount = await prisma.approvalItem.count({
    where: { userId: user.id, status: "pending_review" },
  });
  if (pendingCount === 0 && summaries.length > 0) {
    const firstClient = summaries[0];
    await prisma.approvalItem.create({
      data: {
        clientId: firstClient.clientId,
        userId: user.id,
        type: "briefing",
        title: `Morning briefing — ${firstClient.name}`,
        status: "pending_review",
        priority: 65,
        aiConfidence: 0.91,
        content: {
          summary: [
            "March monthly close drafted and ready for review.",
            "Food cost variance flagged but matches seasonal pattern.",
            "Owner asked about supplier negotiation follow-up — no scheduled task yet.",
          ],
          watch: [
            { topic: "Supplier follow-up", note: "No call on the calendar." },
          ],
        },
        aiNotes:
          "Drafted by daily-briefing agent; the operator can approve or open the client workspace for deeper review.",
      },
    });
  }

  return NextResponse.json({
    ok: true,
    user: { id: user.id, email: user.email },
    clientsSeeded: summaries.length,
    perClient: summaries,
    pendingApprovalSeeded: pendingCount === 0,
  });
}
