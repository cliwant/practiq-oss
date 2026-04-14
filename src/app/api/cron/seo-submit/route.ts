/**
 * Vercel Cron entry point — daily 3:30 AM UTC.
 * Calls /api/seo/submit to re-ping all engines with the current sitemap.
 */
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

async function runCron(request: NextRequest) {
  const isVercelCron = request.headers.get("x-vercel-cron") !== null;
  const secret = process.env.SEO_DEPLOY_SECRET?.trim();
  if (!isVercelCron && !secret) {
    return NextResponse.json({ error: "cron-only endpoint" }, { status: 401 });
  }

  const origin = new URL(request.url).origin;
  const res = await fetch(`${origin}/api/seo/submit`, {
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
