/**
 * Cron-compatible nightly briefing runner.
 *
 * Auth options (any one is sufficient):
 *   - `x-vercel-cron` header (automatic for entries in vercel.json)
 *   - `x-deploy-secret` matches SEO_DEPLOY_SECRET (manual trigger)
 *   - `authorization: Bearer <CRON_SECRET>` (Vercel's newer cron scheme)
 *
 * RUN 24 audit fix #2: handler delegated to the shared
 * `runAgentCronHandler` so completion / failure Slack alerts fire
 * uniformly across all three nightly agents (daily_briefing,
 * anomaly_detector, comms_drafter). Previously this route silently
 * 200-OK'd even when every user hit their spend ceiling.
 *
 * Wiring lives in vercel.json — this route is at "0 17 * * *" UTC
 * (per-user local-time targeting is a Phase 2 upgrade using
 * User.briefingHour and User.timezone).
 */
import { NextRequest } from "next/server";
import { runAgentCronHandler } from "@/lib/agents/cron-runner";
import { DAILY_BRIEFING_AGENT } from "@/lib/agents/daily-briefing";

export const runtime = "nodejs";
// Vercel Hobby caps non-fluid functions at 60s; Pro at 300s. Raise to
// 300 so a small firm with 5–10 clients finishes in a single run. On
// Hobby the function will still cap at 60 and we rely on the bail
// guard in runAgentCronHandler to resume across days.
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  return runAgentCronHandler(request, {
    agent: DAILY_BRIEFING_AGENT,
    cronName: "nightly-briefing",
    maxDurationSec: 300,
    respectBriefingEnabled: true,
  });
}
export async function POST(request: NextRequest) {
  return runAgentCronHandler(request, {
    agent: DAILY_BRIEFING_AGENT,
    cronName: "nightly-briefing",
    maxDurationSec: 300,
    respectBriefingEnabled: true,
  });
}
