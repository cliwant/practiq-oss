/**
 * POST /api/admin/login — bcrypt password verify + issue session cookie.
 *
 * Accepts form-encoded body (email, password, from). Form post (not JSON)
 * so the login page works without JS.
 *
 * On success: sets HttpOnly + Secure + SameSite=Strict cookie, redirects to `from`.
 * On failure: redirects back to /admin/login?error=invalid (with no leak of which
 *             of email/password was wrong — defeats user enumeration).
 *
 * Brute-force defense: a simple in-memory rate limiter (per-IP, 6 fails per
 * 60 seconds → 60-second cooldown). It's per-instance not per-cluster but for
 * a single-digit-user admin surface it's more than enough.
 *
 * Runtime: Node — bcrypt requires it.
 */
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { findAdminUserByEmail, signSession } from "@/lib/admin-auth";
import { safeNotify } from "@/lib/notifications/slack";

export const runtime = "nodejs";

// 32-bit FNV-1a IP hash — matches src/middleware.ts. Inlined on purpose:
// middleware runs on Edge, this runs on Node, and we don't want to share a
// helper that drags Edge-incompatible deps in.
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

const COOKIE_NAME = "practiq_admin_session";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days, matches signSession TTL

// Trivial in-memory rate limit. Keyed by IP. Resets on cold start, which is
// fine — we just want to slow down a brute force, not fully defeat one
// (that's bcrypt's job).
const failureBuckets = new Map<string, { count: number; resetAt: number }>();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_FAILS = 6;

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const b = failureBuckets.get(ip);
  if (!b || b.resetAt < now) {
    failureBuckets.set(ip, { count: 0, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  return b.count < RATE_MAX_FAILS;
}

function recordFailure(ip: string) {
  const now = Date.now();
  const b = failureBuckets.get(ip);
  if (!b || b.resetAt < now) {
    failureBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
  } else {
    b.count += 1;
  }
}

function clearFailures(ip: string) {
  failureBuckets.delete(ip);
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function safeRedirectTarget(from: string | undefined, requestUrl: string): URL {
  // Only allow same-origin paths starting with /admin/. Everything else falls
  // back to /admin/crawler — defense against open-redirect through ?from=.
  if (from && from.startsWith("/admin/") && !from.startsWith("/admin/login") && !from.startsWith("/admin/logout")) {
    return new URL(from, requestUrl);
  }
  return new URL("/admin/crawler", requestUrl);
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const ipHash = hashIp(ip);
  const userAgent = request.headers.get("user-agent") || "";

  if (!rateLimit(ip)) {
    // No Slack: rate-limit hits are noise (usually bots) and already
    // console-logged. Slack is reserved for invalid_credentials which
    // indicates a real failed login attempt.
    console.warn(
      `[admin-login] rate_limited ip=${ipHash} ua=${userAgent.slice(0, 80)}`,
    );
    return NextResponse.redirect(new URL("/admin/login?error=ratelimited", request.url), 303);
  }

  const form = await request.formData();
  const email = (form.get("email") || "").toString().trim();
  const password = (form.get("password") || "").toString();
  const from = form.get("from")?.toString();

  if (!email || !password) {
    // No Slack: empty form submit is a user error (or trivial probe), not
    // a credential-stuffing attempt worth interrupting for.
    console.warn(`[admin-login] missing_fields ip=${ipHash}`);
    return NextResponse.redirect(new URL("/admin/login?error=missing", request.url), 303);
  }

  const user = findAdminUserByEmail(email);

  // Always run bcrypt — even if no user found — to keep response time
  // constant and prevent user-enumeration via timing.
  const dummyHash = "$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvali";
  const ok = await bcrypt.compare(password, user?.passwordHash ?? dummyHash);

  if (!user || !ok) {
    recordFailure(ip);
    safeNotify("admin_login_fail", {
      attemptedEmail: email,
      ipHash,
      reason: "잘못된 자격증명",
      rateLimited: false,
    });
    return NextResponse.redirect(new URL("/admin/login?error=invalid", request.url), 303);
  }

  const session = await signSession(user.email);
  if (!session) {
    // ADMIN_TOKEN missing — server misconfigured. 503 (don't redirect to
    // /admin/login forever).
    return new NextResponse("Server not configured (ADMIN_TOKEN missing).", { status: 503 });
  }

  clearFailures(ip);

  safeNotify("admin_login_ok", {
    email: user.email,
    ipHash,
    userAgent,
  });

  const target = safeRedirectTarget(from, request.url);
  const res = NextResponse.redirect(target, 303);
  res.cookies.set(COOKIE_NAME, session, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/admin",
    maxAge: COOKIE_MAX_AGE,
  });
  return res;
}

// Block any other method explicitly so we don't leak handler info.
export async function GET() {
  return new NextResponse(null, { status: 405 });
}
