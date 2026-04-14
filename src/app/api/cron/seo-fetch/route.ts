/**
 * Vercel Cron entry point — daily 9 AM UTC.
 * Calls /api/seo/fetch-performance with the deploy-secret header internally.
 *
 * Vercel Cron sends an `x-vercel-cron` header and uses VERCEL_CRON_SECRET
 * (if configured) or the deployment's OIDC to authenticate. Hobby tier
 * relies on the header only. We additionally check our own deploy secret.
 */
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

async function runCron(request: NextRequest) {
  // Vercel sets this header for cron invocations
  const isVercelCron = request.headers.get("x-vercel-cron") !== null;

  const secret = process.env.SEO_DEPLOY_SECRET?.trim();
  if (!isVercelCron && !secret) {
    return NextResponse.json({ error: "cron-only endpoint" }, { status: 401 });
  }

  // Forward to the actual handler with our deploy secret
  const origin = new URL(request.url).origin;
  const res = await fetch(`${origin}/api/seo/fetch-performance`, {
    method: "POST",
    headers: secret ? { "x-deploy-secret": secret } : {},
  });
  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("content-type") || "application/json" },
  });
}

export const GET = runCron;
export const POST = runCron;
