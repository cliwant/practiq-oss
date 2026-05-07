/**
 * GET /api/approval-queue/[id]/redline-download
 *
 * Streams the tracked-changes .docx that the edit_document tool produced
 * for a `tracked_changes_docx` ApprovalItem. The file lives at the
 * outputPath stored on the item — we do not regenerate it because the
 * tracked-changes XML is the canonical artifact (re-running the engine
 * with the same inputs would produce semantically equivalent but byte-
 * different output, which would invalidate any external review log).
 *
 * Auth: NextAuth session + ApprovalItem.userId must match the caller.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, ctx: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;

  const item = await prisma.approvalItem.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (item.type !== "tracked_changes_docx") {
    return NextResponse.json(
      { error: "ApprovalItem is not a tracked-changes redline" },
      { status: 400 },
    );
  }

  const content = (item.content ?? {}) as {
    outputPath?: string;
    sourceFilename?: string;
  };
  const outputPath = content.outputPath;
  if (!outputPath) {
    return NextResponse.json(
      { error: "Redline file path missing from approval item" },
      { status: 500 },
    );
  }

  // Defence-in-depth: confine reads to the storage root so a malformed
  // outputPath can't traverse off-disk.
  const storageRoot = path.resolve(process.env.STORAGE_ROOT ?? "./storage");
  const absPath = path.resolve(outputPath);
  if (!absPath.startsWith(storageRoot)) {
    return NextResponse.json(
      { error: "Refusing to read outside storage root" },
      { status: 403 },
    );
  }

  let buffer: Buffer;
  try {
    buffer = await fs.readFile(absPath);
  } catch (err) {
    return NextResponse.json(
      {
        error: "Could not read redlined file",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 404 },
    );
  }

  const baseName =
    (content.sourceFilename ?? path.basename(outputPath))
      .replace(/[/\\?%*:|"<>]/g, "")
      .replace(/\.docx$/i, "") || "redline";
  const filename = `${baseName}-redlined.docx`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": DOCX_MIME,
      "Content-Length": String(buffer.length),
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
