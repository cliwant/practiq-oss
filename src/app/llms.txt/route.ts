import { NextResponse } from "next/server";
import { buildLlmsTxt } from "@/lib/seo/llms-txt";

/**
 * GET /llms.txt — plain-text manifest for AI crawlers.
 *
 * Body is rebuilt from PLANS + BLOG_POSTS at request time so the
 * manifest never goes stale. We set a moderate s-maxage so Vercel's
 * edge caches a few hours of freshness without holding it across
 * a price change.
 *
 * Spec: https://llmstxt.org/ — companion to robots.txt for LLM tools.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const body = buildLlmsTxt();
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      // 6h browser, 24h CDN — short enough that a price change ships
      // within a day, long enough that a viral surge from an AI
      // crawler doesn't hammer the route.
      "Cache-Control":
        "public, max-age=21600, s-maxage=86400, stale-while-revalidate=43200",
    },
  });
}
