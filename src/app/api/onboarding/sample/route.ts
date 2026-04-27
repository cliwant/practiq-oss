/**
 * /api/onboarding/sample
 *
 * GET   — return whether the authed user has a sample client and its id.
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
} from "@/lib/onboarding/seed-sample-client";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sampleId = await findSampleClientId(session.user.id);
  return NextResponse.json({ sampleClientId: sampleId });
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
