/**
 * Daily blog indexing check cron job.
 *
 * Runs at 10:45 UTC = 19:45 KST = 06:45 ET.
 * Triggers /api/seo/inspect-blog to check GSC indexing status for all
 * blog posts. Results stored in Supabase blog_index_status table.
 *
 * Auth: Vercel cron sets x-vercel-cron header.
 */
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const isVercelCron = request.headers.get("x-vercel-cron") !== null;
  const expectedSecret = process.env.SEO_DEPLOY_SECRET?.trim();
  const passedSecret = request.headers.get("x-deploy-secret")?.trim();
  const isSecretAuth = expectedSecret && passedSecret === expectedSecret;

  if (!isVercelCron && !isSecretAuth) {
    return NextResponse.json({ error: "cron-only endpoint" }, { status: 401 });
  }

  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "https://practiq.dev";

    const response = await fetch(`${baseUrl}/api/seo/inspect-blog`, {
      method: "POST",
      headers: {
        "x-deploy-secret": expectedSecret ?? "",
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    return NextResponse.json({
      ok: true,
      triggered: "inspect-blog",
      summary: data.summary,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
