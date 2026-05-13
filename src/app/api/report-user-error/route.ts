/**
 * POST /api/report-user-error
 *
 * Client-side error beacon endpoint. ErrorTracker on critical client
 * pages (workflow-audit, ai-policy-generator, signup, /) POSTs here
 * when it catches a genuinely-broken uncaught exception so the operator
 * gets a Slack alert (subject to dedupe) without us having to scrape
 * the analytics_events table.
 *
 * Anti-abuse:
 *   - Rate-limited per IP (low limit — real client errors are rare).
 *   - Payload size capped.
 *   - We do NOT trust client-supplied surface=server values for
 *     server-only surfaces (force `client-js` here regardless).
 *
 * Auth: none — public endpoint, same posture as /api/early-access. The
 * fingerprint+dedupe pipeline in reportUserError keeps a noisy bot from
 * flooding Slack.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  reportUserError,
  type UserErrorSurface,
} from "@/lib/notifications/user-error";
import { checkRateLimit, identityFromRequest } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 10;

const MAX_BODY_BYTES = 8 * 1024; // 8KB

interface BeaconBody {
  pageSurface?: UserErrorSurface; // hint only — we map to client-js if untrusted
  message?: string;
  stack?: string;
  url?: string;
  type?: "error" | "unhandled_rejection";
  source?: string;
  lineno?: number;
  colno?: number;
  distinctId?: string;
}

export async function POST(request: NextRequest) {
  const rl = await checkRateLimit({
    namespace: "report-user-error",
    identity: identityFromRequest(request),
    limit: 20,
    windowMs: 10 * 60 * 1000,
  });
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, reason: "rate_limited" });
  }

  let raw = "";
  try {
    raw = await request.text();
  } catch {
    return NextResponse.json({ ok: false, reason: "no_body" });
  }
  if (raw.length === 0 || raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, reason: "size" });
  }

  let body: BeaconBody;
  try {
    body = JSON.parse(raw) as BeaconBody;
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_json" });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) {
    return NextResponse.json({ ok: false, reason: "no_message" });
  }

  // Map page surface hint → fingerprint surface. Always store as
  // `client-js` (helper can't distinguish per-page client errors
  // beyond what the endpoint string carries).
  const surface: UserErrorSurface = "client-js";
  const pageSurfaceHint = (
    typeof body.pageSurface === "string" ? body.pageSurface : "other"
  ).slice(0, 40);

  await reportUserError({
    surface,
    endpoint: `CLIENT ${pageSurfaceHint} :: ${body.url ?? "(unknown url)"}`,
    status: undefined,
    errorMessage: message.slice(0, 600),
    errorStack:
      typeof body.stack === "string" ? body.stack.slice(0, 2000) : undefined,
    userContext: {
      distinctId: typeof body.distinctId === "string" ? body.distinctId : null,
      ip_country: request.headers.get("x-vercel-ip-country") ?? null,
      user_agent: request.headers.get("user-agent") ?? null,
    },
    requestBody: {
      type: body.type ?? "error",
      source: body.source ?? null,
      lineno: body.lineno ?? null,
      colno: body.colno ?? null,
    },
    stepIfApplicable: pageSurfaceHint,
  });

  return NextResponse.json({ ok: true });
}
