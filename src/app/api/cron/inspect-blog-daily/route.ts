/**
 * Daily blog indexing check cron job.
 *
 * Runs at 10:45 UTC = 19:45 KST = 06:45 ET.
 * Triggers /api/seo/inspect-blog to check GSC indexing status for all
 * blog posts. Results stored in Supabase blog_index_status table.
 *
 * Auth: Vercel cron sets x-vercel-cron header.
 *
 * ─── 실패 모드 (2026-04-20 버그 수습) ─────────────────────────────
 * 내부 /api/seo/inspect-blog 는 batch 10, 1s delay, URL 100개면 60s 근접.
 * Vercel Hobby 플랜 60s serverless timeout 에 걸리면 Vercel 이 HTML 에러
 * 페이지를 반환하고, 이 cron 이 response.json() 호출 시 SyntaxError
 * ("Unexpected token 'A', 'An error o'...") 를 던져 500 상태로 종료되었음.
 * 실제로는 inspect-blog 가 일부 URL 은 upsert 를 완료한 상태. cron 까지
 * 같이 500 으로 찍혀 불필요하게 Slack noise 유발.
 *
 * 수습 (아래 코드):
 *   1. content-type 이 application/json 이 아니면 body 를 text 로 받아
 *      앞부분 snippet 만 error 필드에 담아 502 반환.
 *   2. JSON parse 자체 실패 시에도 마찬가지.
 *   3. downstream 이 !ok || data.ok=false 이면 data.error 그대로 surface.
 * 원천 수정 TODO: inspect-blog 를 pagination 방식으로 쪼개 각 cron run
 * 이 30개 URL 정도만 처리하게 바꾸면 timeout 완전 제거 가능.
 * ───────────────────────────────────────────────────────────────
 */
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
// Hobby 플랜은 60s 상한이므로 300 은 허용되지 않음. 명시적으로 Hobby 값.
export const maxDuration = 60;

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

    // Defensive: downstream may time out and return HTML error page.
    const contentType = response.headers.get("content-type") || "";
    const text = await response.text();

    if (!contentType.toLowerCase().includes("application/json")) {
      return NextResponse.json(
        {
          ok: false,
          error: "inspect-blog returned non-JSON (likely timeout)",
          downstream_status: response.status,
          downstream_content_type: contentType,
          body_preview: text.slice(0, 300),
        },
        { status: 502 },
      );
    }

    let data: { ok?: boolean; summary?: unknown; error?: string };
    try {
      data = JSON.parse(text) as typeof data;
    } catch (err) {
      return NextResponse.json(
        {
          ok: false,
          error: `inspect-blog returned malformed JSON: ${String(err)}`,
          body_preview: text.slice(0, 300),
        },
        { status: 502 },
      );
    }

    if (!response.ok || !data.ok) {
      return NextResponse.json(
        {
          ok: false,
          error:
            data.error ??
            `inspect-blog failed with status ${response.status}`,
          downstream_status: response.status,
          summary: data.summary,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      triggered: "inspect-blog",
      summary: data.summary,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 },
    );
  }
}
