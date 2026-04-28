/**
 * /api/onboarding/sample
 *
 * GET    — return whether the authed user has a sample client and its id.
 * POST   — re-seed the Acme Coffee Co sample for the authed user (idempotent).
 *          Useful for: (1) operators who deleted the seed and want it back,
 *          (2) design-partner demo prep where the workspace needs to look
 *          populated, (3) the persona-journey E2E that provisions users
 *          via SQL and bypasses the signup-time auto-seed.
 * DELETE — cascade-remove the sample client (idempotent, safe to call twice).
 *
 * The signup flow seeds an Acme Coffee Co sample so the workspace isn't
 * empty on first login. Once the user has created their own real
 * clients they can remove the seed via this endpoint (surfaced from the
 * dashboard banner). The seed also won't be created for users who join
 * via a team invite.
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  findSampleClientId,
  removeSampleClient,
  seedSampleClient,
} from "@/lib/onboarding/seed-sample-client";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sampleId = await findSampleClientId(session.user.id);
  return NextResponse.json({ sampleClientId: sampleId });
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    // Idempotent: if a sample already exists, the seed library returns
    // its existing id rather than creating a duplicate. This means
    // the persona-journey E2E and any "give me my demo back" UX can
    // safely call this without checking findSampleClientId() first.
    const result = await seedSampleClient({ userId: session.user.id });
    return NextResponse.json(
      {
        sampleClientId: result.clientId,
        contextCount: result.contextCount,
        approvalItemCount: result.approvalItemCount,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("[onboarding/sample] seed failed:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const removed = await removeSampleClient(session.user.id);
    return NextResponse.json({ removed }, { status: removed ? 200 : 404 });
  } catch (err) {
    console.error("[onboarding/sample] remove failed:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
