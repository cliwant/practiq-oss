/**
 * GET /llms-full.txt — long-form companion to /llms.txt (RUN 22).
 *
 * Concatenates every public-facing surface (vertical pitches, research
 * datasets full abstracts, comparison summaries, blog post excerpts)
 * into one self-contained plain-text file. AEO/GEO data shows that
 * LLM-agent crawlers (ChatGPT browse, Perplexity, Claude.ai) fetch
 * /llms-full.txt 3-4× more often than /llms.txt because they can
 * ground a citation in one round-trip rather than crawling each page.
 *
 * Cache-Control: same shape as /llms.txt — 6h browser, 24h CDN, 12h
 * stale-while-revalidate. The body rebuilds at request time via
 * `buildLlmsFullTxt()` so it reflects live blog / research data.
 */
import { NextResponse } from "next/server";
import { buildLlmsFullTxt } from "@/lib/seo/llms-txt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const body = buildLlmsFullTxt();
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control":
        "public, max-age=21600, s-maxage=86400, stale-while-revalidate=43200",
      // Hint to AI crawlers that this file is canonical and citable.
      Link: `<https://practiq.dev/llms-full.txt>; rel="canonical"`,
      "X-Robots-Tag": "all",
    },
  });
}
