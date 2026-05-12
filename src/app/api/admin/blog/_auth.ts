/**
 * Auth helper shared by all /api/admin/blog/* routes.
 *
 * Middleware already enforces the host gate (admin.grindworks.ai) +
 * cookie session verification for /admin/* page routes. API routes
 * under /api/admin/blog/ get the same host gate via middleware, but
 * we additionally verify the session here as defense-in-depth so a
 * misconfigured middleware can't accidentally expose write endpoints.
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { verifySession } from "@/lib/admin-auth";

const ADMIN_COOKIE = "practiq_admin_session";

export async function requireAdmin(
  request: NextRequest,
): Promise<{ email: string } | NextResponse> {
  const cookie = request.cookies.get(ADMIN_COOKIE)?.value;
  const session = await verifySession(cookie);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return { email: session.email };
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

export function estimateReadingTime(html: string): string {
  const text = html.replace(/<[^>]+>/g, " ");
  const words = text.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 220));
  return `${minutes} min read`;
}
