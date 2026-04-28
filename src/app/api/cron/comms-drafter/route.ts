/**
 * Cron-compatible comms-drafter runner — RUN 24 audit fix #6.
 *
 * The comms-drafter agent (RUN 4) drafts client-facing nudge emails
 * that the operator approves in the queue. Until RUN 24 it had no
 * cron schedule, so the pre-prepared drafts the spec promised never
 * appeared in the morning.
 *
 * Schedule: 22:00 UTC = late afternoon / evening for the operator's
 * local end-of-day. Drafts arrive while the operator's wrapping up,
 * are reviewed in the morning Approval Queue.
 */
import { NextRequest } from "next/server";
import { runAgentCronHandler } from "@/lib/agents/cron-runner";
import { COMMS_DRAFTER_AGENT } from "@/lib/agents/comms-drafter";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  return runAgentCronHandler(request, {
    agent: COMMS_DRAFTER_AGENT,
    cronName: "comms-drafter",
    maxDurationSec: 300,
  });
}
export async function POST(request: NextRequest) {
  return runAgentCronHandler(request, {
    agent: COMMS_DRAFTER_AGENT,
    cronName: "comms-drafter",
    maxDurationSec: 300,
  });
}
