/**
 * POST /api/admin/leads/[email]/note — replace a lead's notes field.
 *
 * Auth: middleware enforces host + cookie. We also verify here as
 * defense-in-depth (same pattern as /api/admin/blog/_auth.ts).
 *
 * Body: { "notes": string }   — empty string clears the field.
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifySession } from "@/lib/admin-auth";
import { setLeadNote } from "@/lib/admin/leads";

const ADMIN_COOKIE = "practiq_admin_session";

export async function POST(
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

  const notes =
    body && typeof body === "object" && "notes" in body
      ? (body as { notes: unknown }).notes
      : null;
  if (typeof notes !== "string") {
    return NextResponse.json(
      { error: "notes must be a string" },
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

  const { error } = await setLeadNote(supabase, email, notes, session.email);
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
