import { NextRequest, NextResponse } from "next/server";
import { detectBot } from "@/lib/bot-detection";
import { verifySession } from "@/lib/admin-auth";

const ADMIN_COOKIE = "practiq_admin_session";
const VISITOR_COOKIE = "practiq_visitor";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/**
 * A/B test definitions. Variants assigned deterministically via visitor hash
 * so the same visitor always sees the same variant across navigations.
 * The assigned variant is exposed via cookie `ab_{testId}` for server/client
 * components to read.
 *
 * To add a test: append a TEST entry here. The middleware will auto-assign
 * variants on the next request.
 */
const AB_TESTS: Array<{ testId: string; variants: string[] }> = [
  {
    // 2026-04-20: narrowed from 4 variants to 1. Per design-engineer CPA
    // persona audit, `capacity` ("Handle 150 clients without hiring")
    // scored 8/10 for CPA partners while `control` scored 6/10 and
    // `pain_first` landed accusatory. With Practiq CPA v1 and Law v1
    // both going out to small-firm partners, the capacity-ceiling pain
    // is the strongest shared signal. Keep the A/B infrastructure so
    // we can rotate new variants in later, but every visitor tonight
    // lands on the capacity hero.
    testId: "hero_copy_v1",
    variants: ["capacity"],
  },
  {
    testId: "cta_copy_v1",
    variants: ["control", "founding_member", "get_early", "claim_spot"],
  },
];

// 32-bit FNV-1a hash for stable variant assignment
function hashToUnit(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return Math.abs(h >>> 0) / 0xffffffff;
}

function assignVariant(visitorId: string, testId: string, variants: string[]): string {
  const idx = Math.floor(hashToUnit(`${visitorId}:${testId}`) * variants.length);
  return variants[Math.min(idx, variants.length - 1)];
}

function generateVisitorId(): string {
  return `v_${crypto.randomUUID()}`;
}

// Hosts that may serve admin pages. Public marketing domain (practiq.dev)
// must NEVER serve /admin/* — even with a valid cookie — so admin's
// existence isn't leaked through the customer-facing site.
const ADMIN_HOSTS = new Set<string>([
  "admin.grindworks.ai",
  // Local dev convenience
  "localhost:3000",
  "localhost",
  "127.0.0.1:3000",
]);

/**
 * Edge middleware.
 *
 *   1. Admin route protection — host gate (admin.grindworks.ai only) +
 *      cookie session verify. Login form (/admin/login) and POST
 *      (/api/admin/login) are accessible without a cookie; everything else
 *      under /admin/* requires a valid HMAC-signed session.
 *
 *   2. Bot/crawler tracking — fire-and-forget hit log to /api/log/crawler.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = (request.headers.get("host") || "").toLowerCase();

  // ──────────────────────────────────────────────────────────────────────
  // 0. Host-based routing.
  //
  //    admin.grindworks.ai  → ONLY /admin/* and /api/admin/* allowed.
  //                           All other paths 404 so the marketing site
  //                           (home, blog, docs, llms.txt, sitemap, …)
  //                           is NOT served on the private admin host.
  //                           Prevents duplicate-content SEO penalties
  //                           and keeps the admin host minimal-surface.
  //
  //    practiq.dev / firmem.com  → marketing surface. /admin/* → 404
  //                                 (handled below inside handleAdmin).
  // ──────────────────────────────────────────────────────────────────────
  if (ADMIN_HOSTS.has(host)) {
    // Admin host: allow /admin and /api/admin only; 404 everything else.
    if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
      return await handleAdmin(request);
    }
    // Admin-host specific: the Search Console dashboard's client-side
    // "Submit now" / "Fetch performance" buttons call /api/seo/*; allow
    // those through to the route handlers (which do their own cookie
    // auth via verifySession).
    if (pathname.startsWith("/api/seo/") || pathname.startsWith("/api/cron/")) {
      return NextResponse.next();
    }
    // Internal Next.js asset paths need to still resolve (the admin UI
    // itself depends on them).
    if (
      pathname.startsWith("/_next/") ||
      pathname === "/favicon.ico" ||
      pathname === "/robots.txt"
    ) {
      // robots.txt on admin host returns a hard "disallow: /" below.
      if (pathname === "/robots.txt") {
        return new NextResponse("User-agent: *\nDisallow: /\n", {
          status: 200,
          headers: { "Content-Type": "text/plain" },
        });
      }
      return NextResponse.next();
    }
    // Any marketing path on the admin host is a 404. Indistinguishable
    // from any other unknown route — no hint that a marketing site
    // exists on another host.
    return new NextResponse(null, { status: 404 });
  }

  // ──────────────────────────────────────────────────────────────────────
  // 1. Admin route protection on OTHER hosts (practiq.dev, firmem.com, …)
  //    → any /admin/* hit returns 404 so admin's existence isn't leaked
  //      through the public marketing domain.
  // ──────────────────────────────────────────────────────────────────────
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    return new NextResponse(null, { status: 404 });
  }

  // /api/seo/* and /api/cron/* endpoints authenticate themselves
  // (x-deploy-secret header for CI/cron, admin cookie for dashboard).
  // We must NOT 404 them on the public host — Vercel Cron hits them
  // at whatever host the project is deployed to, which is currently
  // the public one.
  if (pathname.startsWith("/api/seo/") || pathname.startsWith("/api/cron/")) {
    return NextResponse.next();
  }

  // ──────────────────────────────────────────────────────────────────────
  // 2. A/B test visitor assignment (marketing pages only, not bots, not API)
  // ──────────────────────────────────────────────────────────────────────
  const userAgentHeader = request.headers.get("user-agent");
  const botCheck = detectBot(userAgentHeader);

  // We'll reuse botCheck for step 3 below
  let existingVisitor = request.cookies.get(VISITOR_COOKIE)?.value;
  let response: NextResponse | null = null;

  const isMarketingPage =
    !botCheck.isBot &&
    !pathname.startsWith("/api/") &&
    !pathname.startsWith("/_next/") &&
    !pathname.startsWith("/admin") &&
    pathname !== "/robots.txt" &&
    pathname !== "/sitemap.xml" &&
    pathname !== "/llms.txt";

  if (isMarketingPage) {
    if (!existingVisitor) {
      existingVisitor = generateVisitorId();
      response = NextResponse.next();
      response.cookies.set(VISITOR_COOKIE, existingVisitor, {
        maxAge: COOKIE_MAX_AGE,
        httpOnly: false,
        sameSite: "lax",
        secure: true,
        path: "/",
      });
    }

    // Assign AB variants into cookies (only set missing ones)
    for (const test of AB_TESTS) {
      const cookieName = `ab_${test.testId}`;
      const existing = request.cookies.get(cookieName)?.value;
      if (!existing && existingVisitor) {
        const variant = assignVariant(existingVisitor, test.testId, test.variants);
        if (!response) response = NextResponse.next();
        response.cookies.set(cookieName, variant, {
          maxAge: COOKIE_MAX_AGE,
          httpOnly: false,
          sameSite: "lax",
          secure: true,
          path: "/",
        });
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────────
  // 3. Bot tracking
  // ──────────────────────────────────────────────────────────────────────
  const userAgent = userAgentHeader;
  const result = botCheck;

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

  return response ?? NextResponse.next();
}

// ────────────────────────────────────────────────────────────────────────
// Admin handler
// ────────────────────────────────────────────────────────────────────────

async function handleAdmin(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // 1) Host gate — admin only on private host. Other hosts → 404 indistinguishable
  //    from any other unknown route.
  const host = (request.headers.get("host") || "").toLowerCase();
  if (!ADMIN_HOSTS.has(host)) {
    return notFound();
  }

  // 2) Bots get a clean 404 even on the right host. Defense in depth on
  //    top of robots.txt.
  const ua = request.headers.get("user-agent");
  if (detectBot(ua).isBot) {
    return notFound();
  }

  // 3) Public surfaces (anyone on the right host can reach them):
  //    - /admin/login        (the form)
  //    - /api/admin/login    (POST that issues the cookie)
  if (pathname === "/admin/login" || pathname === "/api/admin/login") {
    return NextResponse.next();
  }

  // 4) Logout — clear cookie + redirect to login. No auth needed.
  if (pathname === "/admin/logout") {
    const dest = request.nextUrl.clone();
    dest.pathname = "/admin/login";
    dest.search = "";
    const res = NextResponse.redirect(dest);
    res.cookies.delete({ name: ADMIN_COOKIE, path: "/admin" });
    return res;
  }

  // 5) Everything else under /admin/* and /api/admin/* requires a valid session.
  const cookie = request.cookies.get(ADMIN_COOKIE)?.value;
  const session = await verifySession(cookie);

  if (!session) {
    // For pages, redirect to login with `from` so we can return after auth.
    // For API routes, return 401 JSON (no redirect — clients shouldn't follow).
    if (pathname.startsWith("/api/admin")) {
      return new NextResponse(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/admin/login";
    loginUrl.search = `?expired=1&from=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

function notFound(): NextResponse {
  return new NextResponse(null, { status: 404 });
}

// 32-bit FNV-1a IP hash (Edge-safe, GDPR-friendly).
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
    "/((?!_next/static|_next/image|api/log/crawler|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf|otf|eot)$).*)",
  ],
};
