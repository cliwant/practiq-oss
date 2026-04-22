import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runAgentForUser } from "@/lib/agents/runner";
import { DAILY_BRIEFING_AGENT } from "@/lib/agents/daily-briefing";

export const runtime = "nodejs";
// Vercel Hobby caps non-fluid functions at 60s. Fan-out across many
// clients may exceed that; set max and let the caller re-fire tomorrow
// if anyone is missed. For self-hosted production we'd switch to a
// queued worker.
export const maxDuration = 60;

/**
 * Cron-compatible nightly briefing runner.
 *
 * Auth: either `x-vercel-cron` header (set by Vercel Crons) OR a shared
 * secret in `x-deploy-secret`. No user session — this iterates every
 * User in the system and runs the briefing per-user. Safe because the
 * agent always scopes to that user's clients only.
 *
 * Intended wiring in vercel.json (add after prod deploy):
 *   {"path": "/api/cron/nightly-briefing", "schedule": "0 17 * * *"}
 *   (17:00 UTC = 02:00 KST — configurable per-operator later).
 *
 * In local dev you can trigger this by hand:
 *   curl -X POST http://localhost:3000/api/cron/nightly-briefing \
 *        -H "x-deploy-secret: $SEO_DEPLOY_SECRET"
 */
export async function GET(request: NextRequest) {
  return handle(request);
}
export async function POST(request: NextRequest) {
  return handle(request);
}

async function handle(request: NextRequest) {
  const isVercelCron = request.headers.get("x-vercel-cron") !== null;
  const expected = process.env.SEO_DEPLOY_SECRET?.trim();
  const provided = request.headers.get("x-deploy-secret")?.trim();
  const isSecretAuth = expected && provided && provided === expected;

  if (!isVercelCron && !isSecretAuth) {
    return NextResponse.json(
      { error: "cron-only endpoint" },
      { status: 401 },
    );
  }

  const users = await prisma.user.findMany({
    select: { id: true, email: true },
  });

  type UserResult = {
    email: string;
    runs: number;
    completed: number;
    failed: number;
    approvals: number;
    durationMs: number;
  };
  const perUser: UserResult[] = [];

  const start = Date.now();
  for (const u of users) {
    const results = await runAgentForUser(DAILY_BRIEFING_AGENT, u.id);
    perUser.push({
      email: u.email,
      runs: results.length,
      completed: results.filter((r) => r.status === "completed").length,
      failed: results.filter((r) => r.status === "failed").length,
      approvals: results.reduce((sum, r) => sum + r.approvalItemIds.length, 0),
      durationMs: results.reduce((sum, r) => sum + r.durationMs, 0),
    });
    // Bail if we're nearing the 55s mark — the loop can resume tomorrow.
    if (Date.now() - start > 55_000) break;
  }

  return NextResponse.json({
    ok: true,
    runAt: new Date().toISOString(),
    users: perUser,
    totalRuns: perUser.reduce((s, u) => s + u.runs, 0),
    totalApprovals: perUser.reduce((s, u) => s + u.approvals, 0),
    elapsedMs: Date.now() - start,
  });
}
