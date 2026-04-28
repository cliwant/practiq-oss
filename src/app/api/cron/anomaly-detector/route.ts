/**
 * Cron-compatible anomaly-detector runner — RUN 24 audit fix #6.
 *
 * The agent module (`src/lib/agents/anomaly-detector.ts`) was shipped
 * in RUN 4 and registered in `/api/agents/run` AGENT_REGISTRY in
 * RUN 24, but had no cron entry — so every claim that "anomaly
 * detection runs continuously" was silently false in production.
 *
 * Schedule: 11:00 UTC = pre-dawn / morning across NA + EU. Different
 * from nightly-briefing (17:00 UTC) so the two don't compete for
 * Anthropic rate-limit headroom + serverless lambda capacity.
 *
 * Auth: same path as nightly-briefing.
 */
import { NextRequest } from "next/server";
import { runAgentCronHandler } from "@/lib/agents/cron-runner";
import { ANOMALY_DETECTOR_AGENT } from "@/lib/agents/anomaly-detector";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  return runAgentCronHandler(request, {
    agent: ANOMALY_DETECTOR_AGENT,
    cronName: "anomaly-detector",
    maxDurationSec: 300,
  });
}
export async function POST(request: NextRequest) {
  return runAgentCronHandler(request, {
    agent: ANOMALY_DETECTOR_AGENT,
    cronName: "anomaly-detector",
    maxDurationSec: 300,
  });
}
