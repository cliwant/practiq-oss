/**
 * POST /api/seo/inspect-blog — batch URL Inspection for all blog posts.
 *
 * Calls Google Search Console URL Inspection API for every blog post URL,
 * stores results in Supabase `blog_index_status`, and returns a summary.
 *
 * Rate limit: 2,000 inspections/day per GSC property.
 * With ~100 blog posts, we can run this twice daily with room to spare.
 *
 * Auth: x-deploy-secret header or admin session cookie.
 *
 * Supabase table (create if not exists):
 *   create table if not exists blog_index_status (
 *     id uuid primary key default gen_random_uuid(),
 *     url text not null,
 *     slug text not null,
 *     indexing_state text not null,
 *     page_fetch_state text not null,
 *     verdict text not null,
 *     robots_txt_state text not null,
 *     coverage_state text not null,
 *     last_crawl_time timestamptz,
 *     checked_at timestamptz not null default now()
 *   );
 *   create index if not exists blog_index_status_slug_idx on blog_index_status (slug);
 *   create index if not exists blog_index_status_checked_idx on blog_index_status (checked_at desc);
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { inspectUrl, SITE_URL } from "@/lib/seo/google-sc";
import { verifySession } from "@/lib/admin-auth";
import { BLOG_POSTS } from "@/data/blog";
import { safeNotify } from "@/lib/notifications/slack";

export const runtime = "nodejs";
export const maxDuration = 120; // URL inspection can be slow in batch

export async function POST(request: NextRequest) {
  // Auth: deploy secret or admin session
  const expectedSecret = process.env.SEO_DEPLOY_SECRET?.trim();
  const passedSecret = request.headers.get("x-deploy-secret")?.trim();
  const isSecretAuth = expectedSecret && passedSecret === expectedSecret;
  const sessionCookie = request.cookies.get("admin_session")?.value;
  const isAdminAuth = sessionCookie ? await verifySession(sessionCookie) : null;

  if (!isSecretAuth && !isAdminAuth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "supabase env missing" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  const blogUrls = BLOG_POSTS.map((post) => ({
    url: `${SITE_URL}blog/${post.slug}`,
    slug: post.slug,
  }));

  const results: Array<{
    slug: string;
    indexingState: string;
    verdict: string;
    lastCrawlTime: string | null;
  }> = [];

  let indexed = 0;
  let notIndexed = 0;
  let errors = 0;

  // Process in batches of 10 with 1s delay between batches to stay safe
  for (let i = 0; i < blogUrls.length; i += 10) {
    const batch = blogUrls.slice(i, i + 10);

    const batchResults = await Promise.allSettled(
      batch.map(async ({ url, slug }) => {
        try {
          const result = await inspectUrl(url);

          // Upsert into Supabase
          await supabase.from("blog_index_status").upsert(
            {
              url,
              slug,
              indexing_state: result.indexingState,
              page_fetch_state: result.pageFetchState,
              verdict: result.verdict,
              robots_txt_state: result.robotsTxtState,
              coverage_state: result.coverageState,
              last_crawl_time: result.lastCrawlTime,
              checked_at: new Date().toISOString(),
            },
            { onConflict: "slug" }
          );

          if (result.indexingState === "INDEXING_ALLOWED" || result.verdict === "PASS") {
            indexed++;
          } else {
            notIndexed++;
          }

          return { slug, ...result };
        } catch (err) {
          errors++;
          return {
            slug,
            url,
            indexingState: "ERROR",
            pageFetchState: "ERROR",
            lastCrawlTime: null,
            verdict: "ERROR",
            robotsTxtState: "UNKNOWN",
            coverageState: "UNKNOWN",
            error: String(err),
          };
        }
      })
    );

    for (const r of batchResults) {
      if (r.status === "fulfilled") {
        results.push({
          slug: r.value.slug,
          indexingState: r.value.indexingState,
          verdict: r.value.verdict,
          lastCrawlTime: r.value.lastCrawlTime,
        });
      }
    }

    // Rate limit: pause 1s between batches
    if (i + 10 < blogUrls.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  const summary = {
    total: blogUrls.length,
    indexed,
    notIndexed,
    errors,
    checkedAt: new Date().toISOString(),
  };

  // Notify Slack with summary (use seo_submit_ok as closest match)
  safeNotify("seo_submit_ok", {
    summary: `Blog indexing check: ${indexed}/${blogUrls.length} indexed, ${notIndexed} not indexed, ${errors} errors`,
  });

  return NextResponse.json({
    ok: true,
    summary,
    results,
  });
}
