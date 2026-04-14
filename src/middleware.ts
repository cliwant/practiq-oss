import { NextRequest, NextResponse } from "next/server";
import { detectBot } from "@/lib/bot-detection";

const ADMIN_COOKIE = "practiq_admin_session";
const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/**
 * Edge middleware.
 *
 * Three responsibilities:
 *
 *   1. Admin route protection — /admin/* is blocked at the edge before
 *      Next.js even tries to render. Token is supplied once via a "magic
 *      link" URL (/admin/auth/<token>) which sets an HttpOnly cookie and
 *      redirects to the clean /admin/* URL. The token never appears in
 *      the URL after that — it lives only in the cookie. Mismatched URLs
 *      return 404, indistinguishable from "no such route", so the
 *      existence of /admin/* is not leaked.
 *
 *   2. Bot/crawler tracking — every public-page request hits this. If the
 *      request comes from a known bot (SEO, AEO, GEO, social), we fire off
 *      a non-blocking POST to /api/log/crawler so we can graph who is
 *      crawling what. Failures are silently swallowed.
 *
 *   3. Auth (currently disabled) — original logic preserved in a comment
 *      below for re-enabling once the mockup phase ends.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ──────────────────────────────────────────────────────────────────────
  // 1. Admin route protection (must run before bot tracking — admin pages
  //    should never appear in crawler logs)
  // ──────────────────────────────────────────────────────────────────────
  if (pathname.startsWith("/admin")) {
    return handleAdmin(request);
  }

  // ──────────────────────────────────────────────────────────────────────
  // 2. Bot tracking
  // ──────────────────────────────────────────────────────────────────────
  const userAgent = request.headers.get("user-agent");
  const result = detectBot(userAgent);

  if (result.isBot) {
    const payload = {
      botName: result.botName,
      category: result.category,
      userAgent: userAgent?.slice(0, 500) ?? "",
      path: pathname + request.nextUrl.search,
      referer: request.headers.get("referer")?.slice(0, 500) ?? null,
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

    const logUrl = new URL("/api/log/crawler", request.url);
    fetch(logUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-log": "1",
      },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  }

  return NextResponse.next();
}

// ────────────────────────────────────────────────────────────────────────
// Admin handler
// ────────────────────────────────────────────────────────────────────────

// Hosts allowed to serve admin pages. Public marketing domain (practiq.dev)
// must NEVER serve /admin/* — even with a valid cookie — so that admin's
// existence isn't leaked through the customer-facing site at all.
const ADMIN_HOSTS = new Set<string>([
  "admin.grindworks.ai",
  // Local dev convenience
  "localhost:3000",
  "localhost",
  "127.0.0.1:3000",
]);

function handleAdmin(request: NextRequest): NextResponse {
  // 1) Host gate — admin lives ONLY on a private host. practiq.dev/admin
  //    must 404 like any other unknown path.
  const host = (request.headers.get("host") || "").toLowerCase();
  if (!ADMIN_HOSTS.has(host)) {
    return notFound();
  }

  // 2) Token gate — trim is defensive against trailing newlines added by
  //    `echo "TOKEN" | vercel env add` style commands.
  const expected = process.env.ADMIN_TOKEN?.trim();
  if (!expected) {
    return notFound();
  }

  const { pathname } = request.nextUrl;

  // Bot/crawler trying to hit /admin → blanket 404. Defense in depth on top
  // of robots.txt disallow.
  const ua = request.headers.get("user-agent");
  if (detectBot(ua).isBot) {
    return notFound();
  }

  // Magic-link entry: /admin/auth/<token>
  // If the token matches, set an HttpOnly cookie and redirect to the clean
  // admin landing page so the token is removed from the address bar (and
  // from any subsequent referer headers, screen shares, server logs, etc.).
  const authMatch = pathname.match(/^\/admin\/auth\/([^/]+)\/?$/);
  if (authMatch) {
    if (timingSafeEqual(authMatch[1], expected)) {
      const dest = request.nextUrl.clone();
      dest.pathname = "/admin/crawler";
      dest.search = "";
      const res = NextResponse.redirect(dest);
      res.cookies.set(ADMIN_COOKIE, expected, {
        httpOnly: true,
        sameSite: "strict",
        secure: true,
        path: "/admin",
        maxAge: ADMIN_COOKIE_MAX_AGE,
      });
      return res;
    }
    return notFound();
  }

  // Logout: /admin/logout
  if (pathname === "/admin/logout") {
    const dest = request.nextUrl.clone();
    dest.pathname = "/";
    dest.search = "";
    const res = NextResponse.redirect(dest);
    res.cookies.delete({ name: ADMIN_COOKIE, path: "/admin" });
    return res;
  }

  // All other /admin/* paths require the cookie.
  const cookieToken = request.cookies.get(ADMIN_COOKIE)?.value;
  if (!cookieToken || !timingSafeEqual(cookieToken, expected)) {
    return notFound();
  }

  // Authenticated — let the page render.
  return NextResponse.next();
}

// Returns a synthetic 404 response. Body matches Next.js's default not-found
// page closely enough that probing /admin/* is indistinguishable from
// probing any nonexistent route.
function notFound(): NextResponse {
  return new NextResponse(null, { status: 404 });
}

// Constant-time string compare to prevent timing attacks on token guessing.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// 32-bit FNV-1a hash for IP privacy. Edge-runtime safe.
function hashIp(ip: string): string | null {
  if (!ip) return null;
  const first = ip.split(",")[0]?.trim() || "";
  if (!first) return null;
  let h = 0x811c9dc5;
  for (let i = 0; i < first.length; i++) {
    h ^= first.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export const config = {
  matcher: [
    // Match all paths except internal Next.js routes, static assets, and the
    // crawler log endpoint (avoids self-recursion).
    "/((?!_next/static|_next/image|api/log/crawler|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf|otf|eot)$).*)",
  ],
};
