/**
 * /api/cron/freshness-refresh — RUN-post-lovable polish.
 *
 * Per AEO/GEO research (top-12 #6): "30-day freshness refresh — pick
 * 6-12 top-traffic posts/month, Claude proposes one new datapoint,
 * opens PR for human review. Lift: ~2.5× citation rate on refreshed
 * pages (Perplexity data, AuthorityTech)."
 *
 * Implementation choice: rather than opening a GitHub PR
 * automatically (requires gh credentials + adds complexity to the
 * Vercel runtime), this cron writes proposals to `AuditLog` with
 * action="content_freshness_proposal". A future admin page (or the
 * operator running `git diff`) can list pending proposals and copy
 * the suggested update into the post manually. Net effect is the
 * same — Claude finds a stale claim, suggests a fresh datapoint,
 * the operator validates + ships. The PR generation step can be
 * added later without changing this cron's contract.
 *
 * Schedule: Tuesday 09:00 UTC (weekly). 6 posts/run × ~$0.02 each =
 * ~$0.12/week — well below the per-firm token budget.
 *
 * Side-effect safety:
 *   - Read-only on `BLOG_POSTS` (the source of truth ships in code).
 *   - Writes only AuditLog rows (no schema mutations).
 *   - Skips posts that already have a proposal in the last 14 days
 *     so the cron doesn't loop on the same article every Tuesday.
 *   - Skips posts whose `dateModified` is < 30 days old (already
 *     fresh; no refresh needed).
 *   - Failures swallow per post — one bad post doesn't kill the cron.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { BLOG_POSTS } from "@/data/blog";
import { getClaudeProvider } from "@/lib/claude/provider";
import { computeUsdCost } from "@/lib/spend-ceiling";
import { notifySlack } from "@/lib/notifications/slack";
import { log } from "@/lib/observability/logger";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_POSTS_PER_RUN = 6;
const FRESHNESS_THRESHOLD_DAYS = 30;
const PROPOSAL_COOLDOWN_DAYS = 14;

const PROPOSAL_SCHEMA = {
  type: "object" as const,
  properties: {
    needsRefresh: {
      type: "boolean" as const,
      description:
        "True when the post contains a stale claim that should be refreshed for citation reliability. False when the post is evergreen / not worth refreshing.",
    },
    targetClaim: {
      type: "string" as const,
      description:
        "The exact phrase from the post that should be updated. Quote verbatim.",
    },
    proposedUpdate: {
      type: "string" as const,
      description:
        "A 1-3 sentence proposed replacement that adds a fresh datapoint or correction.",
    },
    rationale: {
      type: "string" as const,
      description:
        "Why this update improves citation reliability (typically 1 sentence).",
    },
    confidence: {
      type: "number" as const,
      minimum: 0,
      maximum: 1,
      description:
        "Self-rated confidence that the proposed update is accurate + actionable.",
    },
  },
  required: ["needsRefresh", "confidence"],
};

interface PostProposal {
  needsRefresh: boolean;
  targetClaim?: string;
  proposedUpdate?: string;
  rationale?: string;
  confidence: number;
}

interface PerPostStat {
  slug: string;
  status: "proposed" | "skipped_recent_proposal" | "skipped_already_fresh" | "skipped_no_change_needed" | "errored";
  proposedUpdate?: string;
  confidence?: number;
  usdCost: number;
  error?: string;
}

async function handle(request: NextRequest): Promise<NextResponse> {
  const isVercelCron = request.headers.get("x-vercel-cron") !== null;
  const legacy = process.env.SEO_DEPLOY_SECRET?.trim();
  const modern = process.env.CRON_SECRET?.trim();
  const provided = request.headers.get("x-deploy-secret")?.trim();
  const bearer = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "")
    .trim();
  const isSecretAuth =
    (!!legacy && provided === legacy) ||
    (!!modern && provided === modern) ||
    (!!modern && bearer === modern);
  if (!isVercelCron && !isSecretAuth) {
    return NextResponse.json({ error: "cron-only endpoint" }, { status: 401 });
  }

  // Pick candidates: posts whose dateModified is older than the
  // freshness threshold. Sort by date asc so the oldest post gets
  // refreshed first.
  const now = Date.now();
  const cooldownCutoff = new Date(
    now - PROPOSAL_COOLDOWN_DAYS * 24 * 60 * 60_000,
  );
  const freshnessCutoff = new Date(
    now - FRESHNESS_THRESHOLD_DAYS * 24 * 60 * 60_000,
  );

  const candidates = BLOG_POSTS.filter((p) => {
    const dm = new Date(p.dateModified ?? p.date);
    return dm.getTime() < freshnessCutoff.getTime();
  })
    .slice()
    .sort(
      (a, b) =>
        new Date(a.dateModified ?? a.date).getTime() -
        new Date(b.dateModified ?? b.date).getTime(),
    )
    .slice(0, MAX_POSTS_PER_RUN);

  // Deduplicate against AuditLog `content_freshness_proposal` rows
  // from the last 14 days. The AuditLog details.slug field is the
  // dedup key. We pull all recent proposals once and filter in
  // memory.
  const recentProposals = await prisma.auditLog.findMany({
    where: {
      action: "content_freshness_proposal",
      createdAt: { gte: cooldownCutoff },
    },
    select: { details: true },
  });
  const recentSlugs = new Set(
    recentProposals
      .map((r) => (r.details as { slug?: string }).slug)
      .filter(Boolean),
  );

  const start = Date.now();
  const bailAt = start + (300 - 5) * 1000;
  const perPost: PerPostStat[] = [];
  let totalUsd = 0;
  let proposedCount = 0;

  for (const post of candidates) {
    if (Date.now() >= bailAt) break;
    if (recentSlugs.has(post.slug)) {
      perPost.push({
        slug: post.slug,
        status: "skipped_recent_proposal",
        usdCost: 0,
      });
      continue;
    }

    try {
      const systemPrompt = `You are a content-freshness reviewer for Practiq's blog. Your job: spot ONE stale claim that should be updated to maintain citation reliability for AI engines (ChatGPT / Perplexity / Claude.ai) that quote our posts.

Hard rules:
1. Only flag genuinely stale claims (dated statistics, expired pricing references, references to versions / years that have since moved). Don't flag stylistic choices.
2. Quote the EXACT phrase to update, verbatim from the post text.
3. Propose a replacement that's factual + dated (e.g. "as of Q2 2026"). If you can't propose a factual replacement without speculation, set needsRefresh=false.
4. Confidence < 0.6 → set needsRefresh=false. Operator's review queue must NOT fill with low-signal noise.

Most posts on most weeks have nothing to refresh. Empty (needsRefresh=false) is the correct answer most of the time.`;

      const userPrompt = `<post>
<slug>${post.slug}</slug>
<title>${post.title}</title>
<date_published>${post.date}</date_published>
<date_modified>${post.dateModified ?? post.date}</date_modified>
<content_excerpt>
${post.content.replace(/<[^>]+>/g, " ").slice(0, 4000)}
</content_excerpt>
</post>

Return a freshness proposal via the submit_freshness_proposal tool.`;

      const provider = getClaudeProvider();
      const completion = await provider.complete({
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
        maxTokens: 600,
        outputSchema: {
          name: "submit_freshness_proposal",
          description: "Submit a freshness-refresh proposal for one blog post.",
          schema: PROPOSAL_SCHEMA,
        },
      });
      const inputTokens = completion.inputTokens ?? 0;
      const outputTokens = completion.outputTokens ?? 0;
      const usdCost = computeUsdCost(null, inputTokens, outputTokens);
      totalUsd += usdCost;

      let parsed: PostProposal;
      try {
        parsed = JSON.parse(completion.text) as PostProposal;
      } catch {
        perPost.push({
          slug: post.slug,
          status: "errored",
          usdCost,
          error: "parse failed",
        });
        continue;
      }

      if (
        !parsed.needsRefresh ||
        parsed.confidence < 0.6 ||
        !parsed.targetClaim ||
        !parsed.proposedUpdate
      ) {
        perPost.push({
          slug: post.slug,
          status: "skipped_no_change_needed",
          confidence: parsed.confidence,
          usdCost,
        });
        continue;
      }

      // Persist proposal as AuditLog so the operator can review
      // pending proposals via /admin or query the table directly.
      // No automated PR — operator manually applies if they agree.
      await prisma.auditLog.create({
        data: {
          action: "content_freshness_proposal",
          details: {
            slug: post.slug,
            title: post.title,
            datePublished: post.date,
            dateModified: post.dateModified ?? post.date,
            targetClaim: parsed.targetClaim.slice(0, 600),
            proposedUpdate: parsed.proposedUpdate.slice(0, 1200),
            rationale: parsed.rationale?.slice(0, 600) ?? null,
            confidence: parsed.confidence,
            usdCost,
          },
        },
      });
      proposedCount++;
      perPost.push({
        slug: post.slug,
        status: "proposed",
        proposedUpdate: parsed.proposedUpdate,
        confidence: parsed.confidence,
        usdCost,
      });
      log.info("freshness-refresh proposal", {
        cron: "freshness-refresh",
        slug: post.slug,
        confidence: parsed.confidence,
        usdCost,
      });
    } catch (e) {
      perPost.push({
        slug: post.slug,
        status: "errored",
        usdCost: 0,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const elapsedMs = Date.now() - start;
  const erroredCount = perPost.filter((p) => p.status === "errored").length;
  const isWorrying = erroredCount > 0;
  await notifySlack(
    isWorrying ? "agent_cron_warning" : "agent_cron_summary",
    {
      cron: "freshness-refresh",
      eligibleUsers: 0,
      processedUsers: 0,
      totalRuns: candidates.length,
      succeeded: proposedCount,
      failed: erroredCount,
      retried: 0,
      approvals: proposedCount,
      usdCost: Math.round(totalUsd * 10_000) / 10_000,
      inputTokens: 0,
      outputTokens: 0,
      skippedDuplicate: perPost.filter(
        (p) => p.status === "skipped_recent_proposal",
      ).length,
      skippedSpendCeiling: 0,
      skippedBudget: 0,
      elapsedSec: Math.round(elapsedMs / 1000),
      failureRatePct:
        candidates.length > 0
          ? Math.round((erroredCount / candidates.length) * 1000) / 10
          : 0,
    },
  );

  return NextResponse.json({
    ok: true,
    cron: "freshness-refresh",
    runAt: new Date().toISOString(),
    candidates: candidates.length,
    proposedCount,
    erroredCount,
    totalUsd: Math.round(totalUsd * 10_000) / 10_000,
    perPost,
    elapsedMs,
  });
}

export async function GET(request: NextRequest) {
  return handle(request);
}
export async function POST(request: NextRequest) {
  return handle(request);
}
