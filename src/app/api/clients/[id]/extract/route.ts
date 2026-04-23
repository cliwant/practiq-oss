import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  extractContexts,
  persistExtraction,
} from "@/lib/agents/context-extractor";

export const runtime = "nodejs";
export const maxDuration = 60;

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/clients/[id]/extract
 *
 * Body: { sourceName: string, text: string, persist?: boolean }
 *
 * - Always runs the Claude extractor on the provided raw text.
 * - If `persist` is true (default false), writes the resulting entries
 *   as ClientContext rows.
 * - If false, returns the proposal so the UI can preview entries before
 *   the operator confirms.
 *
 * A "dry-run then persist" flow is how the operator keeps control — the
 * agent never silently mutates the knowledge base on file upload.
 */
export async function POST(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const client = await prisma.client.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });
  if (!client) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Provider auto-selects (SDK or CLI). No hard key requirement.

  let body: { sourceName?: string; text?: string; persist?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const sourceName = body.sourceName?.trim() || "pasted snippet";
  const text = body.text ?? "";
  if (!text.trim()) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  try {
    const result = await extractContexts({
      clientId: client.id,
      userId: session.user.id,
      sourceName,
      rawText: text,
    });

    if (!body.persist) {
      return NextResponse.json({
        preview: true,
        result,
      });
    }

    const { createdIds } = await persistExtraction({
      clientId: client.id,
      userId: session.user.id,
      sourceName,
      result,
    });

    return NextResponse.json({
      preview: false,
      createdIds,
      result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `extraction failed: ${message}` },
      { status: 500 },
    );
  }
}
