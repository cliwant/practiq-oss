import { NextResponse } from "next/server";
import { getAvailableAuthProviders } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * GET /api/auth/available-providers
 *
 * Public endpoint. Returns the list of auth providers that have env
 * credentials configured, so the login/signup UI only renders buttons
 * that will actually work. No sensitive data in the response — only
 * { id, label } pairs that are safe to expose.
 */
export async function GET() {
  const providers = getAvailableAuthProviders();
  return NextResponse.json(
    { providers },
    {
      headers: {
        // Cache briefly on the edge — auth config only changes on deploy.
        "Cache-Control": "public, max-age=60, s-maxage=300",
      },
    },
  );
}
