import { NextRequest, NextResponse } from "next/server";
import { detectBot } from "@/lib/bot-detection";

/**
 * Edge middleware.
 *
 * Two responsibilities:
 *
 *   1. Bot/crawler tracking — every public-page request hits this. If the
 *      request comes from a known bot (SEO, AEO, GEO, social), we fire off
 *      a non-blocking POST to /api/log/crawler so we can graph who is
 *      crawling what. Failures are silently swallowed; the user-facing
 *      response is never delayed.
 *
 *   2. Auth (currently disabled) — original logic preserved in a comment
 *      below for re-enabling once the mockup phase ends.
 */
export async function middleware(request: NextRequest) {
  const userAgent = request.headers.get("user-agent");
  const result = detectBot(userAgent);

  if (result.isBot) {
    // Fire-and-forget — do NOT await. We want zero latency impact on the
    // bot's response (Googlebot timeouts hurt SEO ranking).
    const payload = {
      botName: result.botName,
      category: result.category,
      userAgent: userAgent?.slice(0, 500) ?? "",
      path: request.nextUrl.pathname + request.nextUrl.search,
      referer: request.headers.get("referer")?.slice(0, 500) ?? null,
      // Cloudflare / Vercel proxy headers — best-effort country attribution.
      country:
        request.headers.get("x-vercel-ip-country") ||
        request.headers.get("cf-ipcountry") ||
        null,
      ipHash: hashIp(
        request.headers.get("x-forwarded-for") ||
          request.headers.get("x-real-ip") ||
          ""
      ),
      hitAt: new Date().toISOString(),
    };

    // Use absolute URL so this works in both dev and prod.
    const logUrl = new URL("/api/log/crawler", request.url);
    fetch(logUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Internal call marker — prevents the API route from itself appearing
        // as bot traffic if it ever loops through middleware.
        "x-internal-log": "1",
      },
      body: JSON.stringify(payload),
      // Edge runtime: the fetch is allowed to outlive the response.
      keepalive: true,
    }).catch(() => {
      // Swallow — we never want logging failures to affect the response.
    });
  }

  return NextResponse.next();

  /* Original auth check — re-enable when ready:
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const { pathname } = request.nextUrl;

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
  */
}

/**
 * 4-byte privacy-preserving IP hash. We don't want raw IPs in the database
 * (GDPR), but a hash is enough to count distinct visits per bot. SubtleCrypto
 * is available in the Edge runtime.
 */
function hashIp(ip: string): string | null {
  if (!ip) return null;
  // Take first IP if x-forwarded-for chain is present
  const first = ip.split(",")[0]?.trim() || "";
  if (!first) return null;
  // Simple deterministic hash (32-bit FNV-1a) — Edge runtime safe, no async.
  let h = 0x811c9dc5;
  for (let i = 0; i < first.length; i++) {
    h ^= first.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export const config = {
  // Match all request paths except for:
  //   - Internal Next.js routes (_next/static, _next/image)
  //   - Static assets (images, fonts, etc.)
  //   - The crawler log endpoint itself (avoids self-recursion)
  //   - Health checks
  //
  // We DO match sitemap.xml and robots.txt — those are gold for understanding
  // what bots are crawling.
  matcher: [
    "/((?!_next/static|_next/image|api/log/crawler|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf|otf|eot)$).*)",
  ],
};
