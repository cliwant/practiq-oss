/**
 * CSP violation report sink.
 *
 * Browsers POST a JSON document here whenever a Content-Security-Policy
 * directive is violated. We log to stdout (queryable via Vercel logs)
 * and that's IT — no Slack notification, no DB write, no anything that
 * could amplify report volume into operator noise.
 *
 * History note: the first version of this route fired a Slack ping on
 * novel (directive, blocked-uri, path) tuples with an in-memory dedup.
 * That immediately spammed the operator's #us-market-validation channel
 * because (a) the dedup is per-Vercel-instance and serverless cold
 * starts reset it, (b) the Report-Only header makes browsers send many
 * reports per page, (c) the formatError adapter we routed through
 * dropped the payload so every alert read as an empty "csp_violation"
 * with no detail. We pulled the Slack hook on 2026-04-29 ~04:55 KST
 * and now log-only. To investigate, run:
 *
 *   npx vercel logs https://practiq.dev --since 1h --query "csp-report" --expand
 *
 * Or build a /admin/csp-report dashboard once we have enough volume
 * to justify it.
 *
 * The endpoint stays anonymous + rate-limited (per-IP, 60/min) so a
 * malicious actor can't flood it. Any payload we can't decode is
 * dropped silently with a 400.
 */

import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, identityFromRequest } from "@/lib/rate-limit";

export const runtime = "nodejs";

interface CSPReport {
  "csp-report"?: {
    "document-uri"?: string;
    referrer?: string;
    "violated-directive"?: string;
    "effective-directive"?: string;
    "blocked-uri"?: string;
    "source-file"?: string;
    "status-code"?: number;
    "line-number"?: number;
    "column-number"?: number;
    "script-sample"?: string;
    "original-policy"?: string;
  };
}

export async function POST(request: NextRequest) {
  const rl = await checkRateLimit({
    namespace: "csp-report",
    identity: identityFromRequest(request),
    limit: 60,
    windowMs: 60 * 1000,
  });
  if (!rl.allowed) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  let body: CSPReport | null = null;
  try {
    body = (await request.json()) as CSPReport;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const report = body?.["csp-report"];
  if (!report) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // Log-only. queryable via `vercel logs --query "csp-report"`.
  console.log("[csp-report]", JSON.stringify(report));
  return NextResponse.json({ ok: true });
}
