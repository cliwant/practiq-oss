/**
 * CSP violation report sink.
 *
 * Browsers POST a JSON document here whenever a Content-Security-Policy
 * directive is violated. We log it (so the operator can see it via
 * Vercel logs) and ping Slack only on novel violations to avoid
 * channel spam if a single issue keeps firing.
 *
 * The CSP currently runs in Report-Only mode (set in next.config.ts);
 * this endpoint exists so we can collect a week of clean reports
 * before flipping to enforce. Once enforce is on, the same endpoint
 * keeps catching real violations that managed to slip past.
 *
 * The endpoint is intentionally cheap, anonymous, and rate-limited
 * (per-IP, 60/min) — CSP reports are unauthenticated by design and
 * a bad actor could otherwise flood it. Any violation we can't
 * decode is dropped silently.
 */

import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, identityFromRequest } from "@/lib/rate-limit";
import { safeNotify } from "@/lib/notifications/slack";

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

// Coarse de-duplication: remember the last 50 violation signatures we
// pinged Slack about, so a runaway page doesn't spam the channel.
// In-memory + per-instance, which means a deploy resets the cache
// (tolerable trade-off — CSP signal is a daily-grain investigation,
// not minute-grain).
const recentlyNotified = new Set<string>();

export async function POST(request: NextRequest) {
  const rl = await checkRateLimit({
    namespace: "csp-report",
    identity: identityFromRequest(request),
    limit: 60,
    windowMs: 60 * 1000,
  });
  if (!rl.allowed) {
    // Drop without ceremony — CSP report endpoints don't get retries
    // from browsers, so a 429 is fine.
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

  // Log the full payload so it's queryable via `vercel logs --query "csp-report"`.
  console.log("[csp-report]", JSON.stringify(report));

  // Slack ping for novel violations only. The signature is the
  // (directive, blocked-uri, document-uri-path) triple — the path
  // dimension lets us notice if a violation that's expected on /pricing
  // suddenly starts firing on /app/settings, while still de-duping the
  // many repeat fires from the same page.
  const directive = report["effective-directive"] ?? report["violated-directive"] ?? "unknown";
  const blocked = report["blocked-uri"] ?? "unknown";
  let documentPath = "unknown";
  try {
    const u = new URL(report["document-uri"] ?? "");
    documentPath = u.pathname;
  } catch {
    // ignore — leave documentPath as "unknown"
  }
  const signature = `${directive}::${blocked}::${documentPath}`;

  if (!recentlyNotified.has(signature)) {
    recentlyNotified.add(signature);
    if (recentlyNotified.size > 50) {
      // Trim to last 50 by clearing the oldest entries (Set preserves
      // insertion order, but Set has no shift — convert + slice).
      const trimmed = Array.from(recentlyNotified).slice(-50);
      recentlyNotified.clear();
      for (const s of trimmed) recentlyNotified.add(s);
    }
    safeNotify("csp_violation", {
      directive,
      blockedUri: blocked,
      documentPath,
      sourceFile: report["source-file"] ?? null,
      lineNumber: report["line-number"] ?? null,
    });
  }

  return NextResponse.json({ ok: true });
}
