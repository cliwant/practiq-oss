/**
 * Vercel Cron entry point — daily 3:30 AM UTC.
 * Calls /api/seo/submit to re-ping all engines with the current sitemap.
 */
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

async function runCron(request: NextRequest) {
  // RUN 24 audit fix #3: previous logic was `if (!isVercelCron && !secret)`
  // — rejects only when BOTH the cron header is missing AND the env var
  // is unset. So as soon as SEO_DEPLOY_SECRET was configured, every
  // unauthenticated POST passed. Correct check: reject when NOT a Vercel
  // cron AND the request didn't supply a header matching the secret.
  const isVercelCron = request.headers.get("x-vercel-cron") !== null;
  const secret = process.env.SEO_DEPLOY_SECRET?.trim();
  const provided = request.headers.get("x-deploy-secret")?.trim();
  const cronSecret = process.env.CRON_SECRET?.trim();
  const bearer = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "")
    .trim();
  const isSecretAuth =
    (!!secret && provided === secret) ||
    (!!cronSecret && (provided === cronSecret || bearer === cronSecret));
  if (!isVercelCron && !isSecretAuth) {
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
