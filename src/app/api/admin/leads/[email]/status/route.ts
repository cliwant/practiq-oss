/**
 * PATCH /api/admin/leads/[email]/status — update a lead's status.
 *
 * Auth: middleware enforces host + cookie. We also defense-in-depth
 * verify the cookie here (same pattern as /api/admin/blog/_auth.ts).
 *
 * Body: { "status": LeadStatus }
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifySession } from "@/lib/admin-auth";
import {
  LEAD_STATUSES,
  type LeadStatus,
  setLeadStatus,
} from "@/lib/admin/leads";

const ADMIN_COOKIE = "practiq_admin_session";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ email: string }> },
) {
  const cookie = request.cookies.get(ADMIN_COOKIE)?.value;
  const session = await verifySession(cookie);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { email: emailParam } = await context.params;
  const email = decodeURIComponent(emailParam);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const status =
    body && typeof body === "object" && "status" in body
      ? (body as { status: unknown }).status
      : null;
  if (typeof status !== "string" || !LEAD_STATUSES.includes(status as LeadStatus)) {
    return NextResponse.json(
      { error: `status must be one of ${LEAD_STATUSES.join(", ")}` },
      { status: 400 },
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    return NextResponse.json(
      { error: "supabase not configured" },
      { status: 500 },
    );
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { error } = await setLeadStatus(
    supabase,
    email,
    status as LeadStatus,
    session.email,
  );
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status });
}
